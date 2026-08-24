// A terv-cím és a generált fázisnév PDF-csak lokalizálása németre --
// EZ A FÁJL KIZÁRÓLAG A `pdf/` ALATT ÉLHET, a `pages/` alól nem
// importálható (a `pdf/labels.ts` mintája). A `javasoltTervCim()`
// (domain/tervCim.ts) és a `generaltFazisNev()` (domain/blankPlan.ts)
// MAGUK szándékosan mindig magyar szöveget adnak vissza, mert a
// szerkesztő UI-ja (Korábbi tervek fa, terv-mappa névjavaslat, „+ Fázis
// hozzáadása" gomb) végig magyar marad -- ez a réteg csak a PDF nyelvén
// oldja fel, amit a doki sosem írt át kézzel.

import { dominansKategoria, javasoltTervCim } from '../domain/tervCim';
import { fazisNevGeneralt } from '../domain/blankPlan';
import { resolveNev } from '../domain/nev';
import type { Nyelv, Plan, PriceList } from '../domain/types';

/**
 * A PDF-en ténylegesen megjelenő terv-cím. Ha a doki kézzel átírta (a
 * `tervCim` eltér az élő javaslattól), a szöveg VÁLTOZATLAN marad -- csak
 * az auto-javasolt cím (a domináns kategória neve) lokalizálódik németre.
 */
export function pdfTervCim(tervCim: string, plan: Plan, priceList: PriceList): string {
  if (plan.nyelv !== 'de' || tervCim !== javasoltTervCim(plan, priceList)) return tervCim;
  const kategoria = dominansKategoria(plan, priceList);
  return kategoria ? resolveNev(kategoria.nev, plan.nyelv).szoveg : tervCim;
}

/** A generált fázisnév-minta németül -- lásd `domain/blankPlan.ts` `generaltFazisNev()`. */
function generaltFazisNevDe(pos: number): string {
  return `${pos}. Behandlung`;
}

/**
 * A PDF-en ténylegesen megjelenő fázisnév. Ha a doki kézzel átnevezte a
 * fázist (a `nev` eltér a `pos` pozícióhoz tartozó generált mintától), a
 * szöveg VÁLTOZATLAN marad -- csak a generált minta lokalizálódik.
 */
export function pdfFazisNev(nev: string, pos: number, nyelv: Nyelv): string {
  if (nyelv !== 'de' || !fazisNevGeneralt(nev, pos)) return nev;
  return generaltFazisNevDe(pos);
}
