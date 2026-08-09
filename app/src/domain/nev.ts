// A tétel nevének nyelvfüggő feloldása. D21: a `plan.nyelv` a nyomtatvány
// szövegét vezérli -- a 118 tétel német neve gépi/AI-fordítás, orvos által
// nem lektorálva (lásd docs/06-arlista-import.md), ezért egy-egy tételnél
// előfordulhat hiányzó/pontatlan `de` név; a feloldás ilyenkor magyarra esik
// vissza. A visszaesés SOHA nem néma: lásd a `fallback` jelzőt és a
// `fallbackSorok` diagnosztikát, amit a PlanEditorPage (kereső, felvett sor)
// és a PreviewPage (véglegesítés-őr) is felhasznál.

import type { LokalizaltSzoveg, Nyelv, Plan, PriceList, Sor, Tetel } from './types';

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
 * Igaz, ha a tételnek van neve az adott nyelven, ÉS a sor jelenlegi
 * `nevSnapshot`-ja pontosan azt használja -- azaz a sor még "követi" az
 * árlistát ezen a nyelven. Ez a mag-összehasonlítás adja mind a szerkesztő
 * jelvényét (`sorFallback`, a JELENLEGI nyelvvel), mind a nyelváltás
 * névmegőrzését (`PatientPage.tsx` `applyNyelv`, a RÉGI nyelvvel) --
 * docs/backlog-3b-nyelvvaltas-nevmegorzes-terv.md 1. döntés.
 */
export function nevKoveti(sor: Sor, tetel: Tetel, nyelv: Nyelv): boolean {
  const arlistaiNev = nyelv === 'hu' ? tetel.nev.hu : tetel.nev.de;
  return arlistaiNev != null && sor.nevSnapshot === arlistaiNev;
}

/** A `sorFallback` visszaadott oka: miért nem a terv nyelvén szerepel a sor neve. */
export type SorFallbackOk =
  /** A tételnek nincs neve ezen a nyelven (vagy a sor egyedi, azaz sosem lehetne). */
  | 'nincsForditas'
  /** Van neve a tételnek ezen a nyelven, de a sor mást mond -- kézzel szerkesztve. */
  | 'elterAzArlistatol';

/**
 * Egy sor neve miért nem a terv nyelvén szerepel -- az EGYETLEN hely, ahol
 * ez a szabály eldől (a szerkesztő `HU`/„átírt" jelvénye, `PlanEditorPage.tsx`
 * `LineRow`, és a `fallbackSorok` véglegesítés-őre is ezt hívja).
 * `null`, ha a sor rendben van (követi az árlistát, vagy hu terven vagyunk).
 *
 * Egyedi (üres `tetelId`-jű, backlog-3) sornál nincs mit a `priceList`-ben
 * megkeresni -- szabad szöveghez sosem volt/lesz fordítás, tehát ez a sor
 * mindig `'nincsForditas'`-t ad, amíg van kitöltött neve. Üres nevű egyedi
 * sort nem jelez -- azt a `kitoltetlenSorok` kemény blokkja úgyis elkapja.
 *
 * `tetelId`-hez kötött sornál a `nevKoveti` dönt: ha a tételnek nincs neve
 * ezen a nyelven, `'nincsForditas'`; ha van, de a sor mást mond (a doki
 * kézzel pontosította, lásd 3. tétel 2. döntése), `'elterAzArlistatol'` --
 * docs/backlog-3b-nyelvvaltas-nevmegorzes-terv.md 2-3. döntés.
 */
export function sorFallback(
  sor: Sor,
  nyelv: Nyelv,
  tetelById: ReadonlyMap<string, Tetel>,
): SorFallbackOk | null {
  if (nyelv === 'hu') return null;
  if (!sor.tetelId.trim()) return sor.nevSnapshot.trim() !== '' ? 'nincsForditas' : null;
  const tetel = tetelById.get(sor.tetelId);
  if (!tetel) return null;
  if (tetel.nev.de == null) return 'nincsForditas';
  return nevKoveti(sor, tetel, nyelv) ? null : 'elterAzArlistatol';
}

export interface FallbackSorokEredmeny {
  /** Azon sorok neve, amiknek a tétele nem kapott fordítást az árlistában. */
  nincsForditas: string[];
  /** Azon sorok neve, amik kézzel eltérnek az árlistai (lefordított) névtől. */
  elterAzArlistatol: string[];
}

/**
 * A tervben lévő sorok közül azoknak a `nevSnapshot`-ja, amik a terv
 * nyelvén nem a várt (árlistai) formában szerepelnek -- két okra bontva
 * (lásd `SorFallbackOk`). NEM rajzolja újra a snapshotot (D7), csak
 * diagnosztikát számol a szerkesztés alatt álló piszkozatra, a
 * véglegesítés-őr (PreviewPage) és a Páciens adatlap figyelmeztetéséhez.
 */
export function fallbackSorok(plan: Plan, priceList: PriceList): FallbackSorokEredmeny {
  const eredmeny: FallbackSorokEredmeny = { nincsForditas: [], elterAzArlistatol: [] };
  if (plan.nyelv === 'hu') return eredmeny;
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  for (const fazis of plan.fazisok) {
    for (const sor of fazis.sorok) {
      const ok = sorFallback(sor, plan.nyelv, tetelById);
      if (ok === 'nincsForditas') eredmeny.nincsForditas.push(sor.nevSnapshot);
      else if (ok === 'elterAzArlistatol') eredmeny.elterAzArlistatol.push(sor.nevSnapshot);
    }
  }
  return eredmeny;
}

export interface NyelvvaltasHatas {
  /** Hány `tetelId`-hez kötött sor neve frissülne automatikusan az új nyelvre. */
  frissul: number;
  /** Hány `tetelId`-hez kötött sor neve maradna változatlan (kézzel eltér az árlistától). */
  valtozatlan: number;
}

/**
 * Nyelváltás előtt: hány `tetelId`-hez kötött sor neve frissülne
 * automatikusan, és hány maradna változatlan, mert kézzel eltér attól,
 * amit a `plan.nyelv` szerinti árlistai név adna -- a `PatientPage.tsx`
 * nyelváltás-megerősítő dialógusának élő számlálásához. Egyedi sorokat nem
 * számolja (őket a nyelváltás sosem érinti).
 */
export function nyelvvaltasHatasa(plan: Plan, priceList: PriceList): NyelvvaltasHatas {
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  let frissul = 0;
  let valtozatlan = 0;
  for (const fazis of plan.fazisok) {
    for (const sor of fazis.sorok) {
      if (!sor.tetelId.trim()) continue;
      const tetel = tetelById.get(sor.tetelId);
      if (!tetel) continue;
      if (nevKoveti(sor, tetel, plan.nyelv)) frissul++;
      else valtozatlan++;
    }
  }
  return { frissul, valtozatlan };
}
