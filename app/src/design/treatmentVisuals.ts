// A fogtérkép kategória-szín-architektúrája -- EZ AZ EGYETLEN hely, ahol egy
// árlista-kategória (`Kategoria`) színt kap. A jelmagyarázat, a webes
// fogtérkép (design/toothChartSvg.ts) és a nyomtatvány (pdf/ToothChartPdf.tsx)
// mind innen olvas -- ne duplikáld a színeket máshol.
//
// Korábban volt egy köztes "vödör"-réteg: a
// 12 valódi árlista-kategória kódban be volt huzalozva 8 fix
// `KezelesVizual` érték egyikébe (`KATEGORIA_VIZUAL`), és csak a vödör kapott
// színt/feliratot/prioritást -- egy új kategória örökre szürke maradt volna.
// Ez a réteg megszűnt: a `Kategoria` (domain/types.ts) most már saját `szin`
// mezőt hordoz, a kategória-karbantartó panel (pages/priceListAdmin/KategoriaPanel.tsx)
// pedig ezt szerkeszthetővé teszi. A domain objektumok (Sor, Tetel) továbbra
// is SZÁNDÉKOSAN nem kapnak külön színmezőt -- CLAUDE.md "Domain szókincs":
// a séma kulcsai a lemezre írt igazság, a bemutatási érték a kategórián él.

import type { Kategoria, LokalizaltSzoveg } from '../domain/types';

/**
 * Egy kategória tényleges vizuális megjelenése -- mindig érvényes `szin`-nel
 * (lásd `kategoriaVizual` a visszaesésért) és a `sorrend`-del, ami a
 * fogankénti ütközés-feloldás alapja (domain/toothVisual.ts
 * `resolveToothVisual`): egy fogon több kezelés esetén a legkisebb
 * `sorrend`-ű kategória színe nyer.
 */
export interface KategoriaVizual {
  /** Üres string az `ISMERETLEN_KATEGORIA` tartaléknál. */
  id: string;
  nev: LokalizaltSzoveg;
  szin: string;
  sorrend: number;
}

/** Egy választható szín a kategória-karbantartó paletta-választójában. */
export interface PalettaSzin {
  hex: string;
  /** Magyar szín-név, a színválasztó (RadioCards) beszédes felirata/aria-labelje. */
  nev: string;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Kurált, egymástól jól megkülönböztethető színkészlet -- nincs szabad hex
 * vagy natív `<input type="color">`, hogy a doki ne választhasson két
 * kategóriának ugyanolyan vagy fehérhez közeli árnyalatot anélkül, hogy ezt
 * a felület jelezné. A mai 8
 * "vödör"-szín (SEBESZET, IMPLANTATUM, FOGSOR, KORONA, GYOKERKEZELES,
 * PARODONTOLOGIA, TOMES, EGYEB) mind szerepel, hogy a meglévő seed-adat
 * egy-az-egyben migrálható legyen.
 */
export const KATEGORIA_PALETTA: readonly PalettaSzin[] = [
  { hex: '#ff6b6b', nev: 'Korall' },
  { hex: '#f06595', nev: 'Rózsaszín' },
  { hex: '#cc5de8', nev: 'Orgona' },
  { hex: '#9775fa', nev: 'Levendula' },
  { hex: '#5c7cfa', nev: 'Indigó' },
  { hex: '#4dabf7', nev: 'Égszínkék' },
  { hex: '#22b8cf', nev: 'Cián' },
  { hex: '#20c997', nev: 'Türkiz' },
  { hex: '#51cf66', nev: 'Zöld' },
  { hex: '#94d82d', nev: 'Limezöld' },
  { hex: '#fcc419', nev: 'Borostyán' },
  { hex: '#ff922b', nev: 'Sárgabarack' },
  { hex: '#e8590c', nev: 'Narancs' },
  { hex: '#a5673f', nev: 'Barna' },
  { hex: '#868e96', nev: 'Palaszürke' },
  { hex: '#adb5bd', nev: 'Szürke' },
];

/**
 * Új kategória alapszíne ÉS a hiányzó/érvénytelen `Kategoria.szin`
 * runtime-visszaesése -- ugyanaz a semleges szürke, mint a régi `EGYEB`
 * vödör színe volt.
 */
export const ALAP_KATEGORIA_SZIN = '#adb5bd';

/**
 * Eltévedt hivatkozás tartalék-színe (7. döntés): ha egy sor `tetelId`-je
 * nincs a mai árlistában, vagy egy tétel `kategoriaId`-ja nem létező
 * kategóriára mutat. Fix, NEM szerkeszthető, nem jelenik meg a
 * kategória-karbantartó felületen (nem valódi kategória). A `sorrend:
 * Number.POSITIVE_INFINITY` biztosítja, hogy a fogankénti ütközés-feloldásban
 * (domain/toothVisual.ts `resolveToothVisual`) SOHA ne nyerjen egy valódi
 * kategóriájú kezeléssel szemben ugyanazon a fogon.
 */
export const ISMERETLEN_KATEGORIA: KategoriaVizual = {
  id: '',
  nev: { hu: 'Ismeretlen kategória', de: null },
  szin: ALAP_KATEGORIA_SZIN,
  sorrend: Number.POSITIVE_INFINITY,
};

/**
 * Egy valódi `Kategoria` vizuális megjelenése. Ez az EGYETLEN hely, ahol egy
 * hiányzó vagy érvénytelen `szin` `ALAP_KATEGORIA_SZIN`-re esik vissza --
 * additív mező (domain/types.ts `Kategoria.szin`), egy régebbi,
 * localStorage-ban élő árlistán hiányozhat, ez nem hiba.
 */
export function kategoriaVizual(kat: Kategoria): KategoriaVizual {
  const szin = kat.szin && HEX_COLOR_RE.test(kat.szin) ? kat.szin : ALAP_KATEGORIA_SZIN;
  return { id: kat.id, nev: kat.nev, szin, sorrend: kat.sorrend };
}

/**
 * Árlista `kategoriaId` -> vizuális kategória, a JELENLEGI `priceList.kategoriak`
 * alapján. Ismeretlen/hiányzó `kategoriaId`-nál a 7. döntés szerinti fix
 * tartalék, sosem dob hibát.
 */
export function vizualKategoriaFor(
  kategoriaId: string | null | undefined,
  kategoriak: readonly Kategoria[],
): KategoriaVizual {
  if (!kategoriaId) return ISMERETLEN_KATEGORIA;
  const kat = kategoriak.find((k) => k.id === kategoriaId);
  return kat ? kategoriaVizual(kat) : ISMERETLEN_KATEGORIA;
}
