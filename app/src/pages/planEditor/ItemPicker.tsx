// Tételkereső -- a tervszerkesztő UX-kritikus pontja (CLAUDE.md "A UX
// kritikus pontja"): gépel -> nyíl -> Enter -> a kereső kiürül és
// visszakapja a fókuszt -> gépel tovább, egérhasználat nélkül. Ez a ciklus
// "nem törhet el" (docs/07-felulet-rendszer.md ":105-106").
//
// Két helyről használt (innen a saját fájl -- korábban a PlanEditorPage.tsx
// belsejében élt):
//  - a fázis alatt, a "+ tétel" felvitelhez -- ez a mockup-tervezéstől fogva
//    létező eset, VÁLTOZATLAN viselkedéssel.
//  - egy tétel nélküli (a fogtérképről kattintással létrehozott) sor
//    "Beavatkozás" cellájában, ahol egy már meglévő sort tölt ki, nem újat
//    fűz -- ezért a találati lista Radix Popover-portálon rendereli
//    (`floating="portal"`), mert a Radix `Table.Root` saját `ScrollArea`-ja
//    levágná az abszolút pozicionált listát egy táblázatcellában.
//
// Csak keresés, nincs kategória böngésző (D19). Ékezetfüggetlen.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Box, Popover, TextField } from '@radix-ui/themes';
import HuChip from '../../components/HuChip';
import { t } from '../../design/tokens';
import { formatPrice } from '../../domain/money';
import { resolveNev } from '../../domain/nev';
import { norm } from '../../domain/search';
import type { Nyelv, Penznem, Tetel } from '../../domain/types';

export interface ItemPickerProps {
  available: Tetel[];
  catName: (id: string) => string;
  currency: Penznem;
  nyelv: Nyelv;
  onPick: (item: Tetel) => void;
  /**
   * `'inline'` (alap): a találati lista egy `position:absolute` dobozban,
   * közvetlen a mező alatt -- a fázis alatti eredeti eset, változatlan.
   * `'portal'`: a lista Radix `Popover.Content`-en, portálba rendereli --
   * táblázatcellás (soron belüli) használathoz kell, hogy a `Table.Root`
   * `ScrollArea`-ja ne vágja le. A billentyűzet-kezelés mindkét esetben
   * ugyanaz, kizárólag a mezőn ül -- a lista csak megjelenítés.
   */
  floating?: 'inline' | 'portal';
  /** A soron belüli példány rögtön fókuszt kap létrejöttekor. */
  autoFocus?: boolean;
  /**
   * `true` (alap): választás után a mező kiürül és visszakapja a fókuszt --
   * a fázis alatti eredeti ciklus. `false`: a soron belüli példány esetén a
   * választás UTÁN maga a komponens is eltűnik (a sor kitöltött sorrá
   * válik), ezért nincs mit kiüríteni/visszafókuszálni.
   */
  clearOnPick?: boolean;
  /** A mező DOM `id`-ja -- a fogtérkép-kattintás fókuszkezelője (PlanEditorPage.tsx) ez alapján találja meg a soron belüli keresőt. */
  id?: string;
}

export default function ItemPicker({
  available,
  catName,
  currency,
  nyelv,
  onPick,
  floating = 'inline',
  autoFocus = false,
  clearOnPick = true,
  id,
}: ItemPickerProps) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  // A kereső mindkét nyelven keres, mindig -- a doki magyar, magyarul gépel
  // akkor is, ha német ajánlatot állít össze. Csak a megjelenített és
  // snapshotolt név nyelvfüggő (lásd domain/nev.ts).
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const nq = norm(q);
    return available
      .filter((x) => norm(x.nev.hu).includes(nq) || norm(x.nev.de).includes(nq))
      .slice(0, 12);
  }, [q, available]);

  useEffect(() => setHi(0), [q]);

  function commit(item: Tetel) {
    onPick(item);
    if (clearOnPick) {
      setQ('');
      requestAnimationFrame(() => ref.current?.focus());
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Escape-nek akkor is ki kell ürítenie a keresőt, ha épp nincs találat
    // (pl. a "Nincs találat" doboz látszik) -- docs/07-felulet-rendszer.md
    // "Escape zár dialógust és keresőt".
    if (e.key === 'Escape') {
      setQ('');
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(results[hi]);
    }
  }

  let lastCat: string | null = null;

  const input = (
    <TextField.Root
      id={id}
      ref={ref}
      value={q}
      onChange={(e) => setQ(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Tétel keresése…  (ékezet nélkül is: eszt, koron, gyoker)"
      autoFocus={autoFocus}
    />
  );

  const list = (
    <>
      {results.length > 0 && (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.controlBorder}`,
            borderRadius: t.radiusLg,
            padding: 4,
            maxHeight: 280,
            overflowY: 'auto',
            boxShadow: t.shadowLg,
          }}
        >
          {results.map((r, i) => {
            const category = catName(r.kategoriaId);
            const header = category !== lastCat ? ((lastCat = category), category) : null;
            const rn = resolveNev(r.nev, nyelv);
            return (
              <div key={r.id}>
                {header && (
                  <div style={{ fontSize: 11, color: t.uiTextFaint, padding: '6px 10px 2px' }}>
                    {header}
                  </div>
                )}
                <div
                  onMouseEnter={() => setHi(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(r);
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '7px 10px',
                    fontSize: 13,
                    cursor: 'pointer',
                    borderRadius: t.radius,
                    background: i === hi ? t.accentWash : 'transparent',
                    boxShadow: i === hi ? `inset 3px 0 0 ${t.accent}` : 'none',
                  }}
                >
                  <span>
                    {rn.szoveg}
                    {rn.fallback && <HuChip />}
                  </span>
                  <span
                    style={{
                      color: t.uiTextFaint,
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatPrice(r.ar[currency], currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {results.length === 0 && q.trim() && (
        <div
          style={{
            background: available.length === 0 ? t.warnBg : t.surface,
            border: `1px solid ${available.length === 0 ? t.warn : t.controlBorder}`,
            borderRadius: t.radiusLg,
            padding: '10px 12px',
            fontSize: 12.5,
            color: available.length === 0 ? t.warn : t.uiTextFaint,
          }}
        >
          {available.length === 0
            ? `Nincs találat. Ebben a pénznemben (${currency}) egyetlen aktív tétel sincs beárazva — az Árlistán tölthetők ki.`
            : 'Nincs találat.'}
        </div>
      )}
    </>
  );

  if (floating === 'portal') {
    // Popover.Content portálba rendereli a listát -- a Radix Table saját
    // ScrollArea-ja máskülönben levágná (position:absolute egy táblázat-
    // cellában nem lát ki a görgetőn túlra). `Popover.Trigger`-t használunk
    // pozíció-forrásnak, NEM `Popover.Anchor`-t -- az `@radix-ui/themes@3.3.0`
    // `Popover.Anchor`-ja eldobja a gyerekeit (a themes-csomagolóban a
    // `children` kiszedve a rest-propokból, de sosem kerül vissza a
    // `createElement`-hívásba -- ellenőrizve a node_modules forrásában,
    // üres <div>-et renderel). A Trigger `asChild`-del klónozza a mezőt,
    // csak ARIA-attribútumokat (aria-haspopup/expanded/controls,
    // data-state) és egy `onClick`-et told rá, ami `context.onOpenToggle`-t
    // hívná -- de mivel a nyitva tartás a keresőszövegtől függ (`open`
    // controllált, `onOpenChange` NINCS átadva), ez a belső toggle
    // hatástalan no-op, a mező gépelése/fókusza érintetlen marad. A
    // Popover saját fókuszkezelését (ami a Content megnyílásakor/
    // záráskor odébb vinné) explicit letiltjuk, hogy a gépel -> nyíl ->
    // Enter ciklus ne törjön el.
    return (
      <Popover.Root open={q.trim() !== ''}>
        <Popover.Trigger>
          <Box style={{ position: 'relative', width: '100%' }}>{input}</Box>
        </Popover.Trigger>
        <Popover.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          style={{ padding: 0, width: 'var(--radix-popover-trigger-width)' }}
        >
          {list}
        </Popover.Content>
      </Popover.Root>
    );
  }

  return (
    <Box style={{ position: 'relative', marginTop: 8 }}>
      {input}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 40, zIndex: 30 }}>{list}</div>
    </Box>
  );
}
