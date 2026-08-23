// Egy kezelési sor listaár <-> ajánlati ár eltérésének osztályozása. Ez az
// EGYETLEN hely, ahol eldől, hogy egy soron kedvezmény vagy felár van, és
// hány százalék -- a szerkesztő (`PlanEditorPage.tsx` `LineRow`) és a
// lezárt terv read-only sora (`pages/tervReszletei/SorReszlet.tsx`) is ezt
// hívja. A modul a TÍPUST, a nyers százalékot és a kész feliratot adja; a
// SZÍN a hívóé -- a szerkesztőben zöld/amber (ott a doki még változtathat
// az áron), a lezárt dokumentumban semleges (ott ténymegállapítás).

import type { Sor } from './types';

export type SorElteresTipus = 'kedvezmeny' | 'felar';

export interface SorElteres {
  tipus: SorElteresTipus;
  /**
   * Az eltérés mértéke százalékban, ELŐJEL NÉLKÜL és KEREKÍTÉS NÉLKÜL -- az
   * irányt a `tipus` hordozza, a megjelenítendő alakot a `cimke`. `null`, ha
   * nincs értelmezhető arány: 0 listaárból nem képezhető.
   */
  szazalek: number | null;
  /** A jelvény kész felirata: `−12%` / `+8%` / `−0,3%` / `−100%` / `Felár` / `Kedvezmény`. */
  cimke: string;
}

// U+2212 MINUS SIGN, nem ASCII kötőjel -- a mínuszjel tipográfiailag ez, és
// a szerkesztő jelvénye eddig is ezt használta.
const MINUSZ = '−';

/**
 * A százalék felirata. Alapból EGÉSZ szám, de a kerekítés nem állíthat
 * olyat, ami nem igaz: egy valódi, nemnulla eltérés nem jelenhet meg
 * `0%`-ként, és egy nem teljesen elengedett sor nem jelenhet meg
 * `−100%`-ként (az az "ingyenes" felirat). Ilyenkor 1 tizedesre vált; ha
 * még az is a hazug értékre kerekedne, a szó-alakra esik vissza (a hívó adja
 * a `Kedvezmény`/`Felár` szót -- ez a függvény csak a számjegyes alakért
 * felel).
 */
function szazalekCimke(szazalek: number, tiltott: readonly number[]): string | null {
  const egesz = Math.round(szazalek);
  if (!tiltott.includes(egesz)) return `${egesz}%`;
  const tizedes = Math.round(szazalek * 10) / 10;
  if (tiltott.includes(tizedes)) return null;
  return `${tizedes.toFixed(1).replace('.', ',')}%`;
}

/**
 * A sor eltérése a listaártól, vagy `null`, ha nincs megjeleníthető eltérés.
 *
 * `nincsReferenciaAr`: a hívó MÁR tudja, hogy ezen a soron nincs
 * értelmezhető árlistai referenciaár (egyedi sor, vagy a tétel a terv
 * pénznemében nincs beárazva -- `penznemValtas.ts` `nincsListaar()`).
 * Ilyenkor a 0 listaár HIÁNY, nem "ingyenes lista", tehát nem szabad belőle
 * felárat képezni. Szándékosan a hívó dönti el, nem ez a modul kérdezi le
 * az árlistából: egy MENTETT terven a mai árlista nem dönthet arról, mi
 * látszik a soron -- a soron lévő listaár a pillanatkép, az az igazság.
 */
export function sorElteres(sor: Sor, nincsReferenciaAr = false): SorElteres | null {
  if (nincsReferenciaAr) return null;

  const lista = sor.listaEgysegar;
  const ajanlat = sor.tenylegesEgysegar;
  // Véges, nemnegatív számok nélkül a hányados `Infinity`/`NaN` lenne -- a
  // séma ezt ma nem engedi, de egy sérült fájlból sem kerülhet ki
  // "−Infinity%" jelvény egy dokumentumra.
  if (!Number.isFinite(lista) || !Number.isFinite(ajanlat)) return null;
  if (lista < 0 || ajanlat < 0) return null;
  if (lista === ajanlat) return null;

  // Listaár 0, ajánlati ár pozitív: az eltérés VALÓS, de 0-ból nincs
  // értelmes arány -- százalék nélküli felirat.
  if (lista === 0) return { tipus: 'felar', szazalek: null, cimke: 'Felár' };

  if (ajanlat < lista) {
    // 0 ajánlati ár pozitív listaár mellett = 100% kedvezmény; ez LEGITIM
    // állapot (pl. jóváhagyott ingyenes kontroll), a képlet magától adja.
    const szazalek = (1 - ajanlat / lista) * 100;
    const cimke = szazalekCimke(szazalek, ajanlat > 0 ? [0, 100] : [0]);
    return { tipus: 'kedvezmeny', szazalek, cimke: cimke == null ? 'Kedvezmény' : `${MINUSZ}${cimke}` };
  }

  // A felár-ágon a 100 NEM tiltott: a listaár kétszerese pontosan +100%.
  const szazalek = (ajanlat / lista - 1) * 100;
  const cimke = szazalekCimke(szazalek, [0]);
  return { tipus: 'felar', szazalek, cimke: cimke == null ? 'Felár' : `+${cimke}` };
}
