// A tétel nevének nyelvfüggő feloldása. D21: a `plan.nyelv` a nyomtatvány
// szövegét vezérli -- a 118 tétel német neve gépi/AI-fordítás, orvos által
// nem lektorálva (lásd docs/06-arlista-import.md), ezért egy-egy tételnél
// előfordulhat hiányzó/pontatlan `de` név; a feloldás ilyenkor magyarra esik
// vissza. A visszaesés SOHA nem néma: lásd a `fallback` jelzőt és a
// `sorFallback` diagnosztikát, amit a PlanEditorPage (kereső, felvett sor)
// használ.

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
 * docs/01-attekintes-es-dontesek.md D24.
 */
export function nevKoveti(sor: Sor, tetel: Tetel, nyelv: Nyelv): boolean {
  const arlistaiNev = nyelv === 'hu' ? tetel.nev.hu : tetel.nev.de;
  return arlistaiNev != null && sor.nevSnapshot === arlistaiNev;
}

/**
 * Igaz, ha a sor neve kézzel eltér attól, amit a felvétel pillanatában
 * kapott volna -- nyelvfüggetlen, a `nevKoveti`-től (D24) eltérő kérdésre
 * válaszol. `resolveNev()`-hez mér, NEM `nevKoveti()`-hez: a `nevKoveti`
 * DE terven `nev.de == null`-nál mindig `false`, mert a MEGLÉVŐ,
 * fordítás-hiányt jelző kérdésre (`sorFallback`) válaszol -- ezzel a
 * komparátorral minden fordítatlan, egyébként érintetlen sor hamisan
 * "átírt"-nak látszana. A backlog-60 "kézzel átírt" marker/reset ezt
 * hívja, HU terven is (`sorFallback` ott korán `null`-t ad).
 */
export function nevAtirt(sor: Sor, tetel: Tetel, nyelv: Nyelv): boolean {
  return sor.nevSnapshot !== resolveNev(tetel.nev, nyelv).szoveg;
}

/** A `sorFallback` visszaadott oka: miért nem a terv nyelvén szerepel a sor neve. */
export type SorFallbackOk =
  /** A tételnek nincs neve ezen a nyelven. */
  | 'nincsForditas'
  /** Van neve a tételnek ezen a nyelven, de a sor mást mond -- kézzel szerkesztve. */
  | 'elterAzArlistatol'
  /** A sor egyedi (nincs árlistai tétele) -- nem tudni, milyen nyelven íródott. */
  | 'egyedi';

/**
 * Egy sor neve miért nem a terv nyelvén szerepel -- az EGYETLEN hely, ahol
 * ez a szabály eldől (a szerkesztő `HU`/„átírt" jelvénye, `PlanEditorPage.tsx`
 * `LineRow`, hívja).
 * `null`, ha a sor rendben van (követi az árlistát, vagy hu terven vagyunk).
 *
 * Egyedi (üres `tetelId`-jű) sornál nincs mit a `priceList`-ben megkeresni --
 * ez a sor mindig `'egyedi'`-t ad, amíg van kitöltött neve (backlog-23: nem
 * `'nincsForditas'`, mert nem árlistai fordítás hiányzik, hanem nem
 * ellenőrizhető, milyen nyelven íródott). Üres nevű egyedi sort nem jelez --
 * azt a `kitoltetlenSorok` kemény blokkja úgyis elkapja.
 *
 * `tetelId`-hez kötött sornál a `nevKoveti` dönt: ha a tételnek nincs neve
 * ezen a nyelven, `'nincsForditas'`; ha van, de a sor mást mond (a doki
 * kézzel pontosította), `'elterAzArlistatol'` --
 * docs/03-funkcionalis-spec.md § Nyelv és pénznem (D21).
 */
export function sorFallback(
  sor: Sor,
  nyelv: Nyelv,
  tetelById: ReadonlyMap<string, Tetel>,
): SorFallbackOk | null {
  if (nyelv === 'hu') return null;
  if (!sor.tetelId.trim()) return sor.nevSnapshot.trim() !== '' ? 'egyedi' : null;
  const tetel = tetelById.get(sor.tetelId);
  if (!tetel) return null;
  if (tetel.nev.de == null) return 'nincsForditas';
  return nevKoveti(sor, tetel, nyelv) ? null : 'elterAzArlistatol';
}

/**
 * A `Tetel.leiras` adott nyelvű szövege, hiányzó fordításnál üres string
 * -- D27 (nincs HU-visszaesés a leírásra), kiemelve, mert a `leirasKoveti`
 * és a `PlanEditorPage.tsx` `sorMezokTetelbol` mellett a backlog-60
 * leírás-reset a harmadik hívó.
 */
export function arlistaiLeiras(tetel: Tetel, nyelv: Nyelv): string {
  return (nyelv === 'hu' ? tetel.leiras?.hu : tetel.leiras?.de) ?? '';
}

/**
 * Igaz, ha a `Sor.leirasSnapshot` pontosan azt a leírást viseli, amit a
 * `Tetel.leiras` adna az adott nyelven -- a `nevKoveti` párja, de NEM ő maga:
 * a leírásnak nincs HU-visszaesése (D27, docs/01-attekintes-es-dontesek.md),
 * ezért a hiányzó fordítást itt -- a `nevKoveti`-től eltérően -- üres stringgé normalizáljuk
 * az összehasonlítás előtt, nem `!= null` őrrel zárjuk ki. Enélkül egy
 * hu->de->hu oda-vissza nyelváltás elveszítené az eredeti magyar leírást: a
 * de oldalon `leirasSnapshot` legitim módon üresre áll (nincs német
 * fordítás), és egy `!= null` őr a visszaváltásnál ezt "kézzel eltérőnek"
 * látná, nem szinkronizálna vissza.
 */
export function leirasKoveti(sor: Sor, tetel: Tetel, nyelv: Nyelv): boolean {
  return (sor.leirasSnapshot ?? '') === arlistaiLeiras(tetel, nyelv);
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
