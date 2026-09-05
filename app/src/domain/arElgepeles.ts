// Elgépelés-védelem az Árlista admin ár-mezőin -- két, egymást kiegészítő
// detektor: a sor
// kinyitásakori értékhez viszonyított relatív ugrás, illetve az árlista
// többi aktív tételéhez viszonyított kirívó nagyságrend. Mindkettő
// szándékosan puha (nem betöltési/mentési hiba), a `savosHatarForditott()`/
// `leirasTulHosszu()` mintájában.

import type { Ar, ArByPenznem, Penznem, Tetel } from './types';

export const RELATIV_SZORZO = 5;
export const ABSZOLUT_SZORZO = 3;

export type ArSlot = 'HUF_FIX' | 'HUF_MIN' | 'HUF_MAX' | 'EUR_FIX' | 'EUR_MIN' | 'EUR_MAX';
export type ArBaseline = Partial<Record<ArSlot, number>>;

function arCsucsertek(ar: Ar | null | undefined): number | null {
  if (!ar) return null;
  return ar.tipus === 'SAVOS' ? Math.max(ar.min, ar.max) : ar.ertek;
}

/**
 * A hat ár-slot pillanatnyi értéke -- az `ItemEditor` mountkor ezt rögzíti
 * baseline-ként. Egy hiányzó ár (nincs EUR ár, vagy FIX típusnál a
 * min/max slot) egyszerűen kimarad a térképből, nem `0`-val szerepel --
 * a `relativGyanus` a hiányzó baseline-t is némán kezeli.
 */
export function arSlotok(ar: ArByPenznem): ArBaseline {
  const huf = ar.HUF ?? null;
  const eur = ar.EUR ?? null;
  const slots: ArBaseline = {};
  if (huf?.tipus === 'FIX') slots.HUF_FIX = huf.ertek;
  if (huf?.tipus === 'SAVOS') {
    slots.HUF_MIN = huf.min;
    slots.HUF_MAX = huf.max;
  }
  if (eur?.tipus === 'FIX') slots.EUR_FIX = eur.ertek;
  if (eur?.tipus === 'SAVOS') {
    slots.EUR_MIN = eur.min;
    slots.EUR_MAX = eur.max;
  }
  return slots;
}

/**
 * Néma, ha nincs baseline vagy a baseline `<= 0` -- egy vadonatúj (0 Ft-tal
 * induló) tétel első árazása mindig "végtelen szoros" változás lenne, ott
 * kizárólag az abszolút detektor véd. Szorzással hasonlít, nem osztással,
 * hogy a határeset (pontosan 5x/1/5x) ne lebegőpontos kerekítésen múljon.
 */
export function relativGyanus(ertek: number, baseline: number | undefined): boolean {
  if (baseline == null || baseline <= 0) return false;
  return ertek >= baseline * RELATIV_SZORZO || ertek * RELATIV_SZORZO <= baseline;
}

/**
 * A szerkesztett tételen KÍVÜLI aktív tételek legdrágábbika az adott
 * pénznemben -- `null`, ha nincs ilyen (ekkor az abszolút detektor néma).
 * Csak az AKTÍV tételek számítanak, hogy egy korábbi, észrevétlen
 * elgépelés (ami inaktív tételen maradt) ne emelhesse meg a küszöböt.
 */
export function legdragabbMasikAktiv(tetelek: Tetel[], kizartId: string, penznem: Penznem): number | null {
  let max: number | null = null;
  for (const x of tetelek) {
    if (!x.aktiv || x.id === kizartId) continue;
    const csucs = arCsucsertek(x.ar[penznem]);
    if (csucs == null || csucs <= 0) continue;
    if (max == null || csucs > max) max = csucs;
  }
  return max;
}

export function abszolutGyanus(ertek: number, referencia: number | null): boolean {
  return referencia != null && ertek >= referencia * ABSZOLUT_SZORZO;
}

/** A két detektor egyben, relatív precedenciával -- az hordozza a "régi érték" javítási akciót. */
export function arGyanu(
  ertek: number,
  baseline: number | undefined,
  referencia: number | null,
): 'relativ' | 'abszolut' | null {
  if (relativGyanus(ertek, baseline)) return 'relativ';
  if (abszolutGyanus(ertek, referencia)) return 'abszolut';
  return null;
}
