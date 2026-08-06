// A tétel nevének nyelvfüggő feloldása. D21: a `plan.nyelv` a nyomtatvány
// szövegét vezérli -- a 118 tétel német neve gépi/AI-fordítás, orvos által
// nem lektorálva (lásd docs/06-arlista-import.md), ezért egy-egy tételnél
// előfordulhat hiányzó/pontatlan `de` név; a feloldás ilyenkor magyarra esik
// vissza. A visszaesés SOHA nem néma: lásd a `fallback` jelzőt és a
// `fallbackSorok` diagnosztikát, amit a PlanEditorPage (kereső, felvett sor)
// és a PreviewPage (véglegesítés-őr) is felhasznál.

import type { LokalizaltSzoveg, Nyelv, Plan, PriceList } from './types';

export interface FeloldottNev {
  szoveg: string;
  /** true, ha a kért nyelven nem volt név, és magyarra esett vissza. */
  fallback: boolean;
}

export function resolveNev(nev: LokalizaltSzoveg, nyelv: Nyelv): FeloldottNev {
  const szoveg = nyelv === 'hu' ? nev.hu : nev.de;
  return szoveg ? { szoveg, fallback: false } : { szoveg: nev.hu, fallback: true };
}

/**
 * A tervben lévő sorok közül azoknak a `nevSnapshot`-ja, amik a terv
 * nyelvén nem lettek volna elérhetők a tétel jelenlegi állapota szerint --
 * azaz magyarra estek volna vissza. NEM rajzolja újra a snapshotot (D7),
 * csak diagnosztikát számol a szerkesztés alatt álló piszkozatra, a
 * véglegesítés-őr (PreviewPage) és a Páciens adatlap figyelmeztetéséhez.
 */
export function fallbackSorok(plan: Plan, priceList: PriceList): string[] {
  if (plan.nyelv === 'hu') return [];
  const eredmeny: string[] = [];
  for (const fazis of plan.fazisok) {
    for (const sor of fazis.sorok) {
      const tetel = priceList.tetelek.find((x) => x.id === sor.tetelId);
      if (tetel && !tetel.nev.de) eredmeny.push(sor.nevSnapshot);
    }
  }
  return eredmeny;
}
