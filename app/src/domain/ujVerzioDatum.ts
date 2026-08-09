// docs/archive/backlog/backlog-2-friss-datum-terv.md -- egy korábbi (jellemzően VEGLEGES)
// terv új verzióra nyitásakor a `keltezes`/`ervenyesIg` a régi tervről
// öröklődött, ami egy lejárt, aláírásra alkalmatlan dokumentumot
// eredményezett (docs/08-backlog.md Függelék A) napja, Nagy Éva-eset). Ez a
// modul a betöltéskori dátumbélyeg EGYETLEN forrása -- ne írd újra máshol.

import { addDaysIso } from './date';
import type { Plan, Settings } from './types';

/**
 * Betöltéskor kizárólag ez a két mező változik. Minden más -- a sorok ára,
 * `nevSnapshot`, `listaEgysegar`, `tetelId`, `arlistaVerzio` -- D7 szerint
 * pillanatkép, érintetlen marad.
 */
export interface UjVerzioDatum {
  keltezes: string;
  ervenyesIg: string;
}

/**
 * Egy korábbi terv új verziójának dátumbélyege: `keltezes` a mai nap,
 * `ervenyesIg` ebből és az AKTUÁLIS `settings.ervenyessegNap`-ból számolva --
 * nem a régi terv megőrzött érvényességi ablak-hossza
 * (docs/archive/backlog/backlog-2-friss-datum-terv.md 3. döntés). A `ma`
 * szándékosan kötelező, nem defaultos paraméter -- ugyanaz az
 * indoklás, mint a `date.ts` `nyelv` paraméterénél: egy alapérték elrejtene
 * egy kihagyott hívási helyet, és óra-függetlenül tesztelhetővé teszi ezt a
 * függvényt.
 */
export function frissDatummal(plan: Plan, settings: Settings, ma: string): Plan {
  return {
    ...plan,
    keltezes: ma,
    ervenyesIg: addDaysIso(ma, settings.ervenyessegNap),
  };
}
