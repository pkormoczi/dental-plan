// Egy üres terv kiinduló állapota -- új terv indításakor ebből dolgozik a
// szerkesztő. `tervId`/`verzio` üresen marad, a storage.savePlan() tölti ki
// első mentéskor (lásd storage/DemoStorage.ts).

import { addDaysIso } from './date';
import type { Nyelv, Plan, PriceList, Settings } from './types';

/** A nyilatkozat-sablon fájlneve (kiterjesztés nélkül) egy adott nyelvhez. */
export function sablonVerzioFor(nyelv: Nyelv): string {
  return `nyilatkozat-${nyelv}-v1`;
}

export function createBlankPlan(settings: Settings, priceList: PriceList): Plan {
  const today = new Date().toISOString().slice(0, 10);
  // D21: a nyelv és a pénznem független -- a német páciens Magyarországon
  // forintban is fizethet. Az `alapertelmezettNyelv` csak akkor számít,
  // ha a német nyelv engedélyezve van; a `nemetEngedelyezve` kikapcsolása
  // után induló új tervek mindig magyarok, hogy a nyelv soha ne maradjon
  // "de"-n úgy, hogy a doki sehol nem lát hozzá kapcsolót.
  //
  // A pénznem alapértéke MINDIG HUF, nem a nyelvtől függ: 0/118 tételnek
  // van ma EUR ára (docs/06-arlista-import.md), egy EUR alapértelmezés
  // garantáltan üres keresőt adó piszkozatot hozna létre. A doki egy
  // kattintással vált a Páciens adatlapon, ha mégis EUR kell.
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
    fazisok: [{ sorszam: 1, megnevezes: '1. kezelés', megjegyzes: '', sorok: [] }],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}
