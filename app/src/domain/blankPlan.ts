// Egy üres terv kiinduló állapota -- új terv indításakor ebből dolgozik a
// szerkesztő. `tervId`/`verzio` üresen marad, a storage.savePlan() tölti ki
// első mentéskor (lásd storage/DemoStorage.ts).

import { addDaysIso, todayIso } from './date';
import type { Nyelv, Plan, PriceList, Settings } from './types';

/**
 * A nyilatkozat-sablon ideiglenes kiinduló fájlneve (kiterjesztés nélkül) egy
 * adott nyelvhez, amíg a terv el nem indul. `PreviewPage` a tényleges
 * előnézetkor/véglegesítéskor mindig a legfrissebb elérhető verziót tölti be
 * és pinneli -- ez itt csak egy ártalmatlan alapérték a friss `Plan`-en,
 * amíg a doki el nem jut a nyomtatvány-előnézetig.
 */
export function sablonVerzioFor(nyelv: Nyelv): string {
  return `nyilatkozat-${nyelv}-v1`;
}

/**
 * Az egyetlen kezdő fázis neve egy friss tervben. Exportálva, mert a
 * `piszkozat.ts` `piszkozatTartalmas()`-a ehhez hasonlítja a piszkozat
 * fázislistáját (átnevezett/extra fázis = tartalmas piszkozat) -- két
 * helyen ugyanaz a string-literál driftelne.
 */
export const ELSO_FAZIS_NEV = '1. kezelés';

export function createBlankPlan(settings: Settings, priceList: PriceList): Plan {
  const today = todayIso();
  // D21: a nyelv és a pénznem független -- a német páciens Magyarországon
  // forintban is fizethet. Az `alapertelmezettNyelv` csak akkor számít,
  // ha a német nyelv engedélyezve van; a `nemetEngedelyezve` kikapcsolása
  // után induló új tervek mindig magyarok, hogy a nyelv soha ne maradjon
  // "de"-n úgy, hogy a doki sehol nem lát hozzá kapcsolót.
  //
  // A pénznem alapértéke MINDIG HUF, nem a nyelvtől függ: a rendelő
  // elsődleges pénzneme forint, az EUR árak pedig ma még lektorálatlan,
  // árfolyamból becsült kiindulóértékek (docs/06-arlista-import.md) -- a
  // HUF alapértelmezés a biztonságosabb kiindulás. A doki egy kattintással
  // vált a Páciens adatlapon, ha mégis EUR kell.
  const nyelv: Nyelv = settings.nemetEngedelyezve ? settings.alapertelmezettNyelv : 'hu';

  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv,
    penznem: 'HUF',
    keltezes: today,
    ervenyesIg: addDaysIso(today, settings.ervenyessegNap),
    arlistaVerzio: priceList.arlistaVerzio,
    sablonVerzio: sablonVerzioFor(nyelv),
    orvos: settings.orvosok[0] ?? '',
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
    elolegSzazalek: null,
    // A doki kapcsolója a szerkesztőben -- alapból nincs terv-szintű kedvezmény.
    kedvezmenyOsszeg: null,
    // Alapból bekapcsolva -- docs/02-domain-modell.md § Tétel-leírás.
    leirasokMutatasa: true,
  };
}
