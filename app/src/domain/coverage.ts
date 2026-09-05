// A német tartalom készültségének számlálása -- a Terv adatai lap
// figyelmeztetéseihez és a Beállítások készültség-kijelzőjéhez.
//
// Szándékosan NEM azonos a PriceListAdminPage "hiányzik az EUR ár"
// számlálójával (lásd pages/PriceListAdminPage.tsx): az admin MINDEN
// tételre számol, inaktívra is. Ez a függvény csak az AKTÍV tételekre néz --
// ugyanaz a halmaz, amit a szerkesztő kereső ténylegesen felkínál
// (`aktiv && ar[penznem]`, lásd PlanEditorPage.tsx `available`).

import type { Penznem, PriceList } from './types';

export interface Lefedettseg {
  /** Az aktív tételek száma összesen. */
  aktivOsszes: number;
  /** Az aktív tételek közül hánynak van ára a megadott pénznemben. */
  arazott: number;
  /** Az aktív tételek közül hánynak van német neve. */
  deNevvel: number;
}

export function lefedettseg(priceList: PriceList, penznem: Penznem): Lefedettseg {
  const aktiv = priceList.tetelek.filter((x) => x.aktiv);
  return {
    aktivOsszes: aktiv.length,
    arazott: aktiv.filter((x) => x.ar[penznem] != null).length,
    deNevvel: aktiv.filter((x) => x.nev.de).length,
  };
}
