// docs/03-funkcionalis-spec.md § Terv másolása új tervként, D26
// (docs/01-attekintes-es-dontesek.md). Két tiszta transzformáció egy
// korábbi tervből -- a `tervId` üresen indul, tehát a storage.savePlan()
// (D4) automatikusan új páciensmappát nyit, sosem csúszik be verzióként
// egy meglévő láncba.

import { createBlankPlan } from './blankPlan';
import { computeOsszesitok } from './totals';
import { frissDatummal } from './ujVerzioDatum';
import type { Plan, PriceList, Settings } from './types';

/**
 * "Új terv" (páciensszintű) -- csak a `paciens` blokk és a `paciensId` jön a
 * forrásból (D29: ez tartja a másolatot ugyanabban a páciens-mappában, új
 * terv-láncként -- lásd `planMasolatKent` kommentjét), minden más a mai
 * `createBlankPlan()` friss alapértéke (nyelv/pénznem is), ugyanúgy, mintha
 * a doki a Kezdőlap "Új terv indítása" gombját nyomta volna.
 */
export function planUjPaciensselTervhez(
  plan: Plan,
  settings: Settings,
  priceList: PriceList,
): Plan {
  return { ...createBlankPlan(settings, priceList), paciens: plan.paciens, paciensId: plan.paciensId };
}

/**
 * "Másolás új tervbe" -- mindent átvisz a forrásból, ami nem
 * azonosító/állapot/dátum (az `arlistaVerzio` is, ugyanaz a snapshot-elv,
 * mint egy meglévő terv új verzióra nyitásakor). Az `osszesitok` a saját
 * (átvett) `fazisok`-ból ÚJRASZÁMOLVA -- a forrás `osszesitok`-ja az EREDETI,
 * már mentett terv fájl-igazsága (D7), nem a most keletkező piszkozaté.
 */
export function planMasolatKent(plan: Plan, settings: Settings, ma: string): Plan {
  const friss = frissDatummal(plan, settings, ma);
  return {
    ...friss,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    osszesitok: computeOsszesitok(friss.fazisok, friss.kedvezmenyOsszeg),
  };
}
