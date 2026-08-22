// A "Fázisok és kezelési sorok" slot tartalma a Terv részletei nézeten --
// lásd docs/03-funkcionalis-spec.md § 11. Ez a komponens a
// lokális UI-állapot (nyitott/csukott fázisok, a soronkénti leírás-
// nyitottság, a fázis-ugró scrollspy aktuális célja) gazdája, SZÁNDÉKOSAN a
// fázisok feltételes renderje FÖLÖTT -- ha a leírás-nyitottság egy `SorReszlet`
// saját state-je lenne, egy fázis összecsukása (ami a teljes táblatörzset
// unmountolja) elveszítené. Innen lefelé propon jut el mindkét komponenshez.
// A verzióváltás resetjét nem ez a komponens intézi -- a TervReszleteiPage
// `key={`${planDir}/${versionDir}`}` wrappere unmountolja/remountolja az
// egész alfát.

import { useEffect, useRef, useState } from 'react';
import { Box, Text } from '@radix-ui/themes';
import Section from '../../components/Section';
import { csokkentettMozgas } from '../../design/motion';
import type { Plan } from '../../domain/types';
import FazisReszlet from './FazisReszlet';
import FazisUgroNav from './FazisUgroNav';

const UGRO_NAV_KUSZOB = 4;

export default function FazisokBlokk({ plan }: { plan: Plan }) {
  const fazisok = plan.fazisok;
  const mutatottNav = fazisok.length >= UGRO_NAV_KUSZOB;

  const [csukva, setCsukva] = useState<Set<number>>(() => new Set());
  const [aktivFazis, setAktivFazis] = useState(0);
  // Kulcs: `${fazisIndex}-${sorIndex}`.
  const [leirasNyitva, setLeirasNyitva] = useState<Record<string, boolean>>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const fazisRefs = useRef<Array<HTMLDivElement | null>>([]);

  // A fázis-ugró sáv magassága CSS változóként -- az `.fazis-tabla` sticky
  // szabálya (index.css) ebből + a lap-fejléc `--tr-fejlec-magassag`
  // változójából számolja a táblafejléc offsetjét (docs/07-felulet-
  // rendszer.md kétsoros sticky elvárása), hogy egyik komponensnek se
  // kelljen ismernie a másik magasságát.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!mutatottNav || !navRef.current) {
      root.style.setProperty('--fazis-nav-magassag', '0px');
      return;
    }
    const nav = navRef.current;
    const frissit = () => {
      root.style.setProperty('--fazis-nav-magassag', `${nav.getBoundingClientRect().height}px`);
    };
    frissit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(frissit);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [mutatottNav]);

  // Scrollspy: passzív scroll-listener + rAF-throttle, a projektben már
  // élő `useListStateMemory.ts` scroll-mintáján -- nincs IntersectionObserver
  // sem itt, sem a test-setup.ts-ben, és jsdom nulla-méretei miatt úgysem
  // lenne tesztelhető. A küszöb a fázis-ugró sáv ALJA, ha van; ha nincs
  // (< 4 fázis), a scrollspy nem fut, mert a nav nincs kirenderelve.
  useEffect(() => {
    if (!mutatottNav) return;
    let frame: number | null = null;
    function frissitAktivFazis() {
      frame = null;
      const kuszob = navRef.current?.getBoundingClientRect().bottom ?? 0;
      let legkozelebbi = 0;
      for (let i = 0; i < fazisRefs.current.length; i++) {
        const el = fazisRefs.current[i];
        if (el && el.getBoundingClientRect().top <= kuszob + 1) legkozelebbi = i;
      }
      setAktivFazis(legkozelebbi);
    }
    function onScroll() {
      if (frame != null) return;
      frame = requestAnimationFrame(frissitAktivFazis);
    }
    frissitAktivFazis();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, [mutatottNav, fazisok.length]);

  function toggle(i: number) {
    setCsukva((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleLeiras(fazisIndex: number, sorIndex: number) {
    const key = `${fazisIndex}-${sorIndex}`;
    setLeirasNyitva((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function ugras(i: number) {
    setCsukva((prev) => {
      if (!prev.has(i)) return prev;
      const next = new Set(prev);
      next.delete(i);
      return next;
    });
    setAktivFazis(i);
    // rAF: a fázis épp most nyílhat ki ebben a renderben -- a scrollIntoView-
    // nak a kinyílt (immár teljes magasságú) DOM-ra kell futnia, a
    // components/PatientPlanChains.tsx "Ugrás a legfrissebb verzióra" scroll+
    // fókusz mintáján.
    requestAnimationFrame(() => {
      const el = fazisRefs.current[i];
      el?.scrollIntoView({ block: 'start', behavior: csokkentettMozgas() ? 'auto' : 'smooth' });
      requestAnimationFrame(() => {
        document.getElementById(`fazis-reszlet-toggle-${i}`)?.focus();
      });
    });
  }

  return (
    <Box ref={rootRef}>
      <Section title="Kezelési fázisok">
        {fazisok.length === 0 ? (
          <Text as="p" size="2" color="gray">
            Ez a verzió nem tartalmaz kezelési fázist.
          </Text>
        ) : (
          <>
            {mutatottNav && (
              <Box
                ref={navRef}
                mb="3"
                py="2"
                style={{
                  position: 'sticky',
                  top: 'var(--tr-fejlec-magassag, 0px)',
                  zIndex: 1,
                  // `--color-panel`, mert a Section-Card belsejében ülünk --
                  // t.page a lap hátterét adná, ami itt átütne a Card-on.
                  background: 'var(--color-panel)',
                }}
              >
                <FazisUgroNav fazisok={fazisok} aktivFazis={aktivFazis} onUgras={ugras} />
              </Box>
            )}
            {fazisok.map((f, i) => (
              <div
                key={i}
                ref={(el) => {
                  fazisRefs.current[i] = el;
                }}
              >
                <FazisReszlet
                  fazis={f}
                  fazisIndex={i}
                  nyitva={!csukva.has(i)}
                  onToggle={() => toggle(i)}
                  currency={plan.penznem}
                  nyelv={plan.nyelv}
                  leirasNyitvaSorok={leirasNyitva}
                  onToggleLeiras={(li) => toggleLeiras(i, li)}
                />
              </div>
            ))}
          </>
        )}
      </Section>
    </Box>
  );
}
