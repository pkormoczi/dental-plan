// Tételkereső -- a tervszerkesztő UX-kritikus pontja (CLAUDE.md "A UX
// kritikus pontja"): gépel -> nyíl -> Enter -> a kereső kiürül és
// visszakapja a fókuszt -> gépel tovább, egérhasználat nélkül. Ez a ciklus
// "nem törhet el" (app/src/CLAUDE.md § Amit soha).
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
// Csak keresés, nincs kategória böngésző. Ékezetfüggetlen.
//
// `onPickEgyedi` (backlog-3, opcionális): ha a gépelt szövegre nincs
// árlistai találat, a találati lista alján megjelenik egy pszeudo-opció
// ("Egyedi tétel felvétele: ...„...”"), ami a gépel -> nyíl -> Enter
// ciklusban ugyanúgy elérhető, mint egy valódi találat -- a hívó ilyenkor a
// gépelt szöveget veszi fel `nevSnapshot`-ként, `tetelId: ''`-vel. Ha a
// hívó nem ad `onPickEgyedi`-t, a komponens a régi viselkedést tartja
// (nincs egyedi opció, üres találat esetén csak a "Nincs találat" jegyzet).

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Box, Popover, TextField } from '@radix-ui/themes';
import HuChip from '../../components/HuChip';
import { t } from '../../design/tokens';
import { formatPrice } from '../../domain/money';
import { resolveNev } from '../../domain/nev';
import { egyezoKategoriaIdk, nevEgyezik, norm } from '../../domain/search';
import type { Kategoria, Nyelv, Penznem, Tetel } from '../../domain/types';

const LATHATO_TALALAT = 12;

export interface ItemPickerProps {
  available: Tetel[];
  kategoriak: Kategoria[];
  currency: Penznem;
  nyelv: Nyelv;
  onPick: (item: Tetel) => void;
  /**
   * Ha adott, a találati lista alján megjelenik egy "Egyedi tétel
   * felvétele: ..." opció, ami a gépelt szöveget adja át -- lásd a fájl
   * fejléckommentjét. Hiányában a komponens a régi viselkedést tartja.
   */
  onPickEgyedi?: (nev: string) => void;
  /**
   * `'inline'` (alap): a találati lista egy `position:absolute` dobozban,
   * közvetlen a mező alatt -- a fázis alatti eredeti eset, változatlan.
   * `'portal'`: a lista Radix `Popover.Content`-en, portálba rendereli --
   * táblázatcellás (soron belüli) használathoz kell, hogy a `Table.Root`
   * `ScrollArea`-ja ne vágja le. A billentyűzet-kezelés mindkét esetben
   * ugyanaz, kizárólag a mezőn ül -- a lista csak megjelenítés.
   */
  floating?: 'inline' | 'portal';
  autoFocus?: boolean;
  /**
   * `true` (alap): választás után a mező kiürül és visszakapja a fókuszt --
   * a fázis alatti eredeti ciklus. `false`: a soron belüli példány esetén a
   * választás UTÁN maga a komponens is eltűnik (a sor kitöltött sorrá
   * válik), ezért nincs mit kiüríteni/visszafókuszálni.
   */
  clearOnPick?: boolean;
  /** A mező DOM `id`-ja -- a `fokuszCel`-effekt (PlanEditorPage.tsx) ez alapján találja meg a soron belüli VAGY a fázis alatti keresőt. */
  id?: string;
}

export default function ItemPicker({
  available,
  kategoriak,
  currency,
  nyelv,
  onPick,
  onPickEgyedi,
  floating = 'inline',
  autoFocus = false,
  clearOnPick = true,
  id,
}: ItemPickerProps) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  const catById = useMemo(() => new Map(kategoriak.map((k) => [k.id, k])), [kategoriak]);
  function catName(kategoriaId: string): string {
    const kat = catById.get(kategoriaId);
    return kat ? resolveNev(kat.nev, nyelv).szoveg : 'Egyéb';
  }

  // A kereső mindkét nyelven keres, mindig -- a doki magyar, magyarul gépel
  // akkor is, ha német ajánlatot állít össze. Csak a megjelenített és
  // snapshotolt név nyelvfüggő (lásd domain/nev.ts).
  //
  // Két szint: a névtalálatok (a mai szabály), utána a CSAK a kategórianéven
  // át egyező tételek (`Kategória: …` fejléc alatt, kategória `sorrend`
  // szerint) -- egy tétel sosem szerepel mindkét szinten. A közös
  // LATHATO_TALALAT limit az 1. szintet tölti először, hogy egy
  // kategória-egyezés sosem szorítson ki egy névtalálatot. A levágott
  // találatok száma is kell: eddig a csonkítás NÉMA volt, a doki nem
  // tudta, hogy pontosítania kellene (backlog-7). A limit maga változatlan.
  const { results, katResults, tobbiTalalat } = useMemo(() => {
    if (!q.trim()) return { results: [] as Tetel[], katResults: [] as Tetel[], tobbiTalalat: 0 };
    const nq = norm(q);
    const nevTalalat = available.filter((x) => nevEgyezik(x.nev, nq));
    const nevTalaltIdk = new Set(nevTalalat.map((x) => x.id));

    const katIdk = egyezoKategoriaIdk(kategoriak, nq);
    const katonkent = new Map<string, Tetel[]>();
    for (const x of available) {
      if (nevTalaltIdk.has(x.id) || !katIdk.has(x.kategoriaId)) continue;
      const arr = katonkent.get(x.kategoriaId);
      if (arr) arr.push(x);
      else katonkent.set(x.kategoriaId, [x]);
    }
    const katTalalat = kategoriak
      .slice()
      .sort((a, b) => a.sorrend - b.sorrend)
      .flatMap((k) => katonkent.get(k.id) ?? []);

    const results = nevTalalat.slice(0, LATHATO_TALALAT);
    const katResults = katTalalat.slice(0, Math.max(0, LATHATO_TALALAT - results.length));
    const osszesTalalat = nevTalalat.length + katTalalat.length;
    return {
      results,
      katResults,
      tobbiTalalat: Math.max(0, osszesTalalat - results.length - katResults.length),
    };
  }, [q, available, kategoriak]);

  useEffect(() => setHi(0), [q]);

  // Egy közös, a két szintet összefűző tömb adja az index-teret a
  // billentyűzet-ciklushoz -- az Enter célpontja így a `hi` index alapján
  // egyértelmű, a szintek határa nem számít neki.
  const valaszthato = useMemo(() => [...results, ...katResults], [results, katResults]);

  // Az egyedi opció csak akkor létezik, ha a hívó kéri ÉS van gépelt szöveg
  // -- mindig a lista VÉGÉN, ezért az index-tartomány [0, valaszthato.length]
  // (a valaszthato.length-edik = az egyedi opció).
  const egyediElerheto = Boolean(onPickEgyedi) && q.trim() !== '';
  const opcioSzam = valaszthato.length + (egyediElerheto ? 1 : 0);

  // 62. tétel: `available` már nem szűr `currency`-re (egy
  // beárazatlan tétel is kereshető/felvehető) -- az üres-találat jegyzet
  // ezért itt, nem az `available.length`-ből dönti el, hogy a doki egy
  // olyan pénznemben keres, amiben SEMMI sincs beárazva.
  const nincsBearazottTetel = available.every((x) => !x.ar[currency]);

  function finishPick() {
    if (clearOnPick) {
      setQ('');
      requestAnimationFrame(() => ref.current?.focus());
    }
  }

  function pickTetel(item: Tetel) {
    onPick(item);
    finishPick();
  }

  function pickEgyedi() {
    const nev = q.trim();
    if (!nev) return;
    onPickEgyedi?.(nev);
    finishPick();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Escape-nek akkor is ki kell ürítenie a keresőt, ha épp nincs találat
    // (pl. a "Nincs találat" doboz látszik) -- Escape zár dialógust és keresőt
    // (app/src/CLAUDE.md, akadálymentesség).
    if (e.key === 'Escape') {
      setQ('');
      return;
    }
    if (!opcioSzam) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => (h + 1) % opcioSzam);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => (h - 1 + opcioSzam) % opcioSzam);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hi < valaszthato.length) pickTetel(valaszthato[hi]);
      else if (egyediElerheto) pickEgyedi();
    }
  }

  let lastCat: string | null = null;
  let lastKatCat: string | null = null;

  // A két szint sora vizuálisan azonos -- csak a fejléc tér el (csupasz
  // kategórianév / `Kategória: …`) --, ezért közös renderelő, a globális
  // (a `valaszthato` tömbre vonatkozó) indexet kapja a `hi`-höz.
  function renderRow(r: Tetel, idx: number) {
    const rn = resolveNev(r.nev, nyelv);
    return (
      <div
        onMouseEnter={() => setHi(idx)}
        onMouseDown={(e) => {
          e.preventDefault();
          pickTetel(r);
        }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          padding: '7px 10px',
          fontSize: 13,
          cursor: 'pointer',
          borderRadius: t.radius,
          background: idx === hi ? t.accentWash : 'transparent',
          boxShadow: idx === hi ? `inset 3px 0 0 ${t.accent}` : 'none',
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
          {formatPrice(r.ar[currency], currency, nyelv) ?? '—'}
        </span>
      </div>
    );
  }

  const input = (
    <TextField.Root
      id={id}
      ref={ref}
      value={q}
      onChange={(e) => setQ(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Tétel keresése…  (ékezet nélkül is: eszt, koron, gyoker)"
      aria-label="Tétel keresése"
      autoFocus={autoFocus}
    />
  );

  // Egy közös konténerben: a találatok (ha vannak), különben a "Nincs
  // találat" jegyzet, a végén pedig -- ha a hívó kéri -- az egyedi opció.
  // Így egy nulla-találatos keresés sosem zsákutca: a jegyzet a pszeudo-sor
  // FÖLÖTT áll, informatív szövegként (backlog-3 3-4. döntés).
  const list = q.trim() === '' ? null : (
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
      {results.length > 0 &&
        results.map((r, i) => {
          const category = catName(r.kategoriaId);
          const header = category !== lastCat ? ((lastCat = category), category) : null;
          return (
            <div key={r.id}>
              {header && (
                <div style={{ fontSize: 11, color: t.uiTextFaint, padding: '6px 10px 2px' }}>
                  {header}
                </div>
              )}
              {renderRow(r, i)}
            </div>
          );
        })}
      {katResults.length > 0 &&
        katResults.map((r, i2) => {
          const idx = results.length + i2;
          const category = catName(r.kategoriaId);
          const header = category !== lastKatCat ? ((lastKatCat = category), category) : null;
          return (
            <div key={r.id}>
              {header && (
                <div style={{ fontSize: 11, color: t.uiTextFaint, padding: '6px 10px 2px' }}>
                  Kategória: {header}
                </div>
              )}
              {renderRow(r, idx)}
            </div>
          );
        })}
      {valaszthato.length === 0 && (
        <div
          style={{
            padding: '10px 12px',
            fontSize: 12.5,
            color: nincsBearazottTetel ? t.warn : t.uiTextFaint,
          }}
        >
          {nincsBearazottTetel
            ? `Nincs találat. Ebben a pénznemben (${currency}) egyetlen aktív tétel sincs beárazva — az Árlistán tölthetők ki.`
            : 'Nincs találat.'}
        </div>
      )}
      {tobbiTalalat > 0 && (
        // Statikus, NEM választható sor -- nincs `hi` indexe, nem számít
        // bele az `opcioSzam`-ba, tehát a gépel -> nyíl -> Enter ciklus
        // változatlan (ugyanúgy tájékoztató, mint a "Nincs találat.").
        <div
          style={{
            padding: '8px 10px',
            fontSize: 12.5,
            color: t.uiTextFaint,
            borderTop: `1px solid ${t.controlBorder}`,
          }}
        >
          +{tobbiTalalat} további találat — pontosíts a kereséssel
        </div>
      )}
      {egyediElerheto && (
        <div
          onMouseEnter={() => setHi(valaszthato.length)}
          onMouseDown={(e) => {
            e.preventDefault();
            pickEgyedi();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '7px 10px',
            fontSize: 13,
            cursor: 'pointer',
            borderRadius: t.radius,
            color: t.uiTextMuted,
            background: hi === valaszthato.length ? t.accentWash : 'transparent',
            boxShadow: hi === valaszthato.length ? `inset 3px 0 0 ${t.accent}` : 'none',
          }}
        >
          Egyedi tétel felvétele: „{q.trim()}”
        </div>
      )}
    </div>
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
