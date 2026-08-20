// Sor <-> árlista ár-követés (backlog-61, D70). A `mennyiseg.ts` mintáján
// önálló, `Sor`-tudatos modul: a `nev.ts` a névfeloldás helye, itt az árra
// vonatkozó, ugyanolyan szerepű komparátor/diagnosztika/patch-builder él.
//
// Az ár-követés DERIVED, nincs hozzá tárolt flag a sémában (a `nevKoveti`/
// `leirasKoveti` mintája) -- a `listaEgysegar` már ma is a felvitelkori
// pillanatkép (D7), a követés MINDIG levezethető belőle a mai árlistával
// összevetve.

import { basePrice } from './money';
import { leirasKoveti, nevKoveti } from './nev';
import type { Fazis, Penznem, Plan, PriceList, Sor, Tetel } from './types';

/**
 * Igaz, ha a sor `listaEgysegar`-ja pontosan a tétel MAI, adott pénznemű
 * árlistai alapára (`basePrice`) -- a `nevKoveti()` (domain/nev.ts:30-33)
 * mintája. Hiányzó (`null`) árlistai árnál mindig `false`.
 */
export function arKoveti(sor: Sor, tetel: Tetel, penznem: Penznem): boolean {
  const ar = tetel.ar[penznem];
  return ar != null && sor.listaEgysegar === basePrice(ar);
}

export interface ArFrissites {
  regi: number;
  uj: number;
  savos: boolean;
}

/**
 * Egy sor konkrét ár-frissítési javaslata a mai árlistához képest, vagy
 * `null`, ha nincs mit frissíteni -- a `sorFallback()` (domain/nev.ts:61-72)
 * tri-state mintája. `null` egyedi sornál (nincs árlistai referencia),
 * ismeretlen/törölt `tetelId`-nél (a `nev.ts` néma-kihagyás konvenciója),
 * az adott pénznemben ajánlhatatlan (`null` árú) tételnél (nincs mire
 * frissíteni), és egy már követő sornál.
 */
export function arFrissites(
  sor: Sor,
  penznem: Penznem,
  tetelById: ReadonlyMap<string, Tetel>,
): ArFrissites | null {
  if (!sor.tetelId.trim()) return null;
  const tetel = tetelById.get(sor.tetelId);
  if (!tetel) return null;
  const ar = tetel.ar[penznem];
  if (ar == null) return null;
  if (arKoveti(sor, tetel, penznem)) return null;
  return { regi: sor.listaEgysegar, uj: basePrice(ar), savos: ar.tipus === 'SAVOS' };
}

/**
 * Egy elfogadott `ArFrissites` sor-patchké alakítása. A `tenylegesEgysegar`-t
 * is átírja az új listaárra -- a refresh a MANUÁLIS felülírást (kedvezmény
 * vagy felár) törli, visszaáll a default-following állapotba (a
 * tervdokumentum 3. döntése, a mennyiség-⟳ reset-mintáján). Nevet és
 * leírást szándékosan nem érinti -- azok a 60. tétel reset-vezérlőihez
 * tartoznak.
 */
export function arFrissitesPatch(frissites: ArFrissites): Partial<Sor> {
  return { listaEgysegar: frissites.uj, tenylegesEgysegar: frissites.uj, savos: frissites.savos };
}

export interface ArElteroSorok {
  /** Azon sorok neve, amiknek `listaEgysegar`-ja eltér a mai árlistától. */
  elavult: string[];
  /** Azon sorok neve, amiknek ajánlati ára kézzel eltér a listaártól (kedvezmény vagy felár). */
  keziAr: string[];
}

/**
 * A tervben lévő sorok közül azok neve, amik eltérnek a mai árlistától --
 * két okra bontva. A véglegesítés-őr `ar-elteres` puha csekklista-tételéhez
 * (D73, `domain/veglegesitesOr.ts`).
 */
export function arElteroSorok(plan: Plan, priceList: PriceList): ArElteroSorok {
  const eredmeny: ArElteroSorok = { elavult: [], keziAr: [] };
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  for (const fazis of plan.fazisok) {
    for (const sor of fazis.sorok) {
      if (arFrissites(sor, plan.penznem, tetelById) !== null) eredmeny.elavult.push(sor.nevSnapshot);
      if (sor.tenylegesEgysegar !== sor.listaEgysegar) eredmeny.keziAr.push(sor.nevSnapshot);
    }
  }
  return eredmeny;
}

/**
 * A `plan` sorai közül azok frissítése a MAI árlistára, amik a forrásban
 * mindhárom dimenzióban (ár ÉS név ÉS leírás) követték az árlistát -- a
 * `frissDatummal()` (domain/ujVerzioDatum.ts) mintájú tiszta transzformáció,
 * a "Másolás új tervbe" default-following útjához (49. tétel 2. döntése,
 * D70). Minden más sor érintetlen marad (D7). A `plan.arlistaVerzio` a
 * `priceList.arlistaVerzio`-ra áll.
 *
 * Az ár-dimenzióhoz SZÁNDÉKOSAN NEM az `arKoveti()`-t használja: az a MAI
 * árlistával hasonlít, ami pontosan az árváltozás miatt driftelt soroknál
 * MINDIG hamis lenne -- ellehetetlenítve a frissítést, holott épp ezeket a
 * sorokat kellene frissíteni. A kézi árfelülírás egyetlen megbízható jele
 * `tenylegesEgysegar !== listaEgysegar` (az `arElteroSorok` "keziAr"
 * ágának mintája) -- ez FÜGGETLEN attól, hogy a listaár azóta driftelt-e.
 */
export function frissArlistaval(plan: Plan, priceList: PriceList): Plan {
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  const fazisok: Fazis[] = plan.fazisok.map((fazis) => ({
    ...fazis,
    sorok: fazis.sorok.map((sor) => {
      if (!sor.tetelId.trim()) return sor;
      const tetel = tetelById.get(sor.tetelId);
      if (!tetel) return sor;
      const arGate = sor.tenylegesEgysegar === sor.listaEgysegar;
      const koveti = arGate && nevKoveti(sor, tetel, plan.nyelv) && leirasKoveti(sor, tetel, plan.nyelv);
      if (!koveti) return sor;
      const ar = tetel.ar[plan.penznem];
      if (ar == null) return sor;
      const ujAr = basePrice(ar);
      const nev = plan.nyelv === 'hu' ? tetel.nev.hu : tetel.nev.de;
      const leiras = (plan.nyelv === 'hu' ? tetel.leiras?.hu : tetel.leiras?.de) ?? '';
      return {
        ...sor,
        nevSnapshot: nev ?? sor.nevSnapshot,
        leirasSnapshot: leiras,
        listaEgysegar: ujAr,
        tenylegesEgysegar: ujAr,
        savos: ar.tipus === 'SAVOS',
        // D72: a sor default-following állapotba kerül (visszaáll az
        // árlistai szövegre) -- nincs mit nyelvileg ellenőrizni rajta.
        nevNyelv: null,
        leirasNyelv: null,
      };
    }),
  }));
  return { ...plan, fazisok, arlistaVerzio: priceList.arlistaVerzio };
}
