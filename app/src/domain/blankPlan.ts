// Egy üres terv kiinduló állapota -- új terv indításakor ebből dolgozik a
// szerkesztő. `tervId`/`verzio` üresen marad, a storage.savePlan() tölti ki
// első mentéskor (lásd storage/DemoStorage.ts).

import { addDaysIso, todayIso } from './date';
import { alapertelmezettOrvosNeve } from './orvosok';
import type { Nyelv, Penznem, Plan, PriceList, Settings } from './types';

/**
 * Egy generált fázisnév adott pozícióra (1-alapú), pl. `generaltFazisNev(2)`
 * -> `"2. kezelés"`. Az EGYETLEN hely, ahol ez a minta él -- a „+ Fázis
 * hozzáadása" gomb ÉS a fázis-sorrendezés (backlog-58, `movePhase()`) is
 * ezt hívja, hogy a két hívóhely string-literálja ne driftelhessen szét.
 */
export function generaltFazisNev(pos: number): string {
  return `${pos}. kezelés`;
}

/** Igaz, ha `nev` PONTOSAN a `pos` pozícióhoz tartozó generált fázisnév -- lásd `generaltFazisNev()`. */
export function fazisNevGeneralt(nev: string, pos: number): boolean {
  return nev === generaltFazisNev(pos);
}

/**
 * Az egyetlen kezdő fázis neve egy friss tervben. Exportálva, mert a
 * `piszkozat.ts` `piszkozatTartalmas()`-a ehhez hasonlítja a piszkozat
 * fázislistáját (átnevezett/extra fázis = tartalmas piszkozat) -- két
 * helyen ugyanaz a string-literál driftelne.
 */
export const ELSO_FAZIS_NEV = generaltFazisNev(1);

/**
 * D52 öröklési forrása -- egy meglévő páciens legutóbb VÉGLEGESÍTETT
 * tervének nyelve/pénzneme, amit egy új lánc induláskor átvesz. Szűken
 * `nyelv`/`penznem`-re szorítva (nem egy teljes `Plan`), hogy a bővítés ne
 * nyisson csendes utat más mező átvételére -- az `orvos` ezen a paraméteren
 * SOSEM örökölhető, mert saját önálló globális default-forrása van (D63,
 * `domain/orvosok.ts` `alapertelmezettOrvosNeve()`).
 */
export interface OroklottNyelvPenznem {
  nyelv: Nyelv;
  penznem: Penznem;
}

export function createBlankPlan(
  settings: Settings,
  priceList: PriceList,
  oroklott?: OroklottNyelvPenznem | null,
): Plan {
  const today = todayIso();
  // D21: a nyelv és a pénznem független -- a német páciens Magyarországon
  // forintban is fizethet. Öröklés híján `settings.alapertelmezettNyelv`
  // dönt (a német nyelv mindig választható, nincs hozzá engedélyező
  // kapcsoló).
  //
  // A pénznem alapértéke öröklés híján MINDIG HUF, nem a nyelvtől függ: a
  // rendelő elsődleges pénzneme forint, az EUR árak pedig ma még
  // lektorálatlan, árfolyamból becsült kiindulóértékek -- a HUF
  // alapértelmezés a biztonságosabb kiindulás. A doki egy kattintással
  // vált a Terv adatai lapon, ha mégis EUR kell.
  const nyelv: Nyelv = oroklott?.nyelv ?? settings.alapertelmezettNyelv;

  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv,
    penznem: oroklott?.penznem ?? 'HUF',
    keltezes: today,
    ervenyesIg: addDaysIso(today, settings.ervenyessegNap),
    arlistaVerzio: priceList.arlistaVerzio,
    orvos: alapertelmezettOrvosNeve(settings),
    paciens: {
      nev: '',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [{ sorszam: 1, megnevezes: ELSO_FAZIS_NEV, megjegyzes: '', sorok: [] }],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    // A doki kapcsolója a szerkesztőben -- alapból nincs előleg-sor.
    elolegOsszeg: null,
    // A doki kapcsolója a szerkesztőben -- alapból nincs terv-szintű kedvezmény.
    kedvezmenyOsszeg: null,
    // Alapból bekapcsolva -- docs/02-domain-modell.md § Tétel-leírás.
    leirasokMutatasa: true,
    // Új terv alapból teljes dokumentum -- a doki kapcsolója az Előnézet lapon.
    csakAjanlat: false,
  };
}
