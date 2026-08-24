// Pénznemváltás -- a `Sor` mindig a JELENLEGI `plan.penznem` árpárját
// tartja a `listaEgysegar`/`tenylegesEgysegar` mezőkben (implicit
// pénznemű, D21). Pénznemváltáskor korábban a sorok törlődtek
// (`PatientPage.tsx` régi `applyPenznem()`), mert nem volt hova
// "elmenteni" a másik pénznem állapotát. A `Sor.masikPenznemAr` additív
// stash-mezője (domain/types.ts) ezt oldja fel -- lásd D71
// (docs/01-attekintes-es-dontesek.md).

import { basePrice } from './money';
import type { Penznem, Plan, PriceList, Sor, Tetel } from './types';

/**
 * Egy sor pénznemváltása. A KILÉPŐ pénznem árpárja mindig `masikPenznemAr`-be
 * kerül (akár kézzel átírt, akár árlistai eredetű volt -- nincs
 * eredet-nyilvántartás, ugyanúgy, mint a `savos` "≈" kapcsolónál). A BELÉPŐ
 * pénznem ára ebben a sorrendben dől el:
 * 1. `sor.masikPenznemAr` -- a doki korábban már beállított egy értéket
 *    ebben a pénznemben, azt sosem írjuk felül némán az árlistával (D24
 *    szelleme: kézzel írt érték nem vész el egy oda-vissza váltásban).
 * 2. `tetel.ar[ujPenznem]` -- ha a tétel beárazott az új pénznemben,
 *    `basePrice()` adja mindkét mezőt, pontosan úgy, mint felvételkor
 *    (`PlanEditorPage.tsx` `sorMezokTetelbol`).
 * 3. `0/0` -- "hiányzó ár" állapot (egyedi sor, vagy a tétel nincs
 *    beárazva az új pénznemben); a doki kézzel tölti ki.
 *
 * A `savos` mező érintetlen marad: soronkénti, szabad, kétirányú
 * doki-kapcsoló (docs/03-funkcionalis-spec.md § Sor mezői), nem
 * pénznemből derivált érték.
 */
export function sorPenznemValtassal(sor: Sor, ujPenznem: Penznem, tetel: Tetel | undefined): Sor {
  const kilepoAr = { listaEgysegar: sor.listaEgysegar, tenylegesEgysegar: sor.tenylegesEgysegar };

  if (sor.masikPenznemAr) {
    return { ...sor, ...sor.masikPenznemAr, masikPenznemAr: kilepoAr };
  }

  const ujAr = tetel?.ar[ujPenznem];
  if (ujAr) {
    const base = basePrice(ujAr);
    return { ...sor, listaEgysegar: base, tenylegesEgysegar: base, masikPenznemAr: kilepoAr };
  }

  return { ...sor, listaEgysegar: 0, tenylegesEgysegar: 0, masikPenznemAr: kilepoAr };
}

export interface PenznemvaltasHatas {
  /** Hány sor kapja vissza a korábban ebben a pénznemben megadott (mentett) árát. */
  visszaall: number;
  /** Hány sor ára az árlistából szedődik újra. */
  arlistabol: number;
  /** Hány sor kerül "hiányzó ár" állapotba (egyedi sor, vagy nincs beárazva az új pénznemben). */
  arNelkul: number;
  /**
   * A terv-szintű `kedvezmenyOsszeg`/`elolegOsszeg` közül melyik
   * KAPCSOL KI (stash hiányában) vagy ÁLL VISSZA (stashelt érték
   * emelkedik elő) a váltáskor -- a `PatientPage.tsx`
   * pénznemváltás-dialógusának élő kiegészítéséhez.
   */
  tervSzintu: { mezo: 'vegosszeg' | 'eloleg'; hatas: 'kikapcsol' | 'visszaall' }[];
}

/**
 * Pénznemváltás előtt: hány sor melyik ágon jár a `sorPenznemValtassal()`
 * három ága közül -- a `PatientPage.tsx` pénznemváltás-megerősítő
 * dialógusának élő számlálásához, a `nev.ts` `nyelvvaltasHatasa()`
 * mintájára.
 */
export function penznemvaltasHatasa(
  plan: Plan,
  priceList: PriceList,
  ujPenznem: Penznem,
): PenznemvaltasHatas {
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  let visszaall = 0;
  let arlistabol = 0;
  let arNelkul = 0;
  for (const fazis of plan.fazisok) {
    for (const sor of fazis.sorok) {
      if (sor.masikPenznemAr) {
        visszaall++;
        continue;
      }
      const tetel = tetelById.get(sor.tetelId);
      if (tetel?.ar[ujPenznem]) arlistabol++;
      else arNelkul++;
    }
  }

  // A tényleges eredményből (nem csak a kilépő oldalból) vezetjük le a
  // hatást -- egy kikapcsolt aktuális mező mellett is lehet jelentős
  // változás, ha a stash egy korábbi értéket állít vissza (pl. HUF->EUR->HUF
  // váltásnál a HUF oldal a másodikig kikapcsolt marad, majd visszaáll).
  const eredmeny = tervOsszegekPenznemValtassal(plan);
  const tervSzintu: PenznemvaltasHatas['tervSzintu'] = [];
  if (plan.kedvezmenyOsszeg != null || eredmeny.kedvezmenyOsszeg != null) {
    tervSzintu.push({ mezo: 'vegosszeg', hatas: eredmeny.kedvezmenyOsszeg != null ? 'visszaall' : 'kikapcsol' });
  }
  if (plan.elolegOsszeg != null || eredmeny.elolegOsszeg != null) {
    tervSzintu.push({ mezo: 'eloleg', hatas: eredmeny.elolegOsszeg != null ? 'visszaall' : 'kikapcsol' });
  }
  return { visszaall, arlistabol, arNelkul, tervSzintu };
}

/**
 * A terv-szintű `kedvezmenyOsszeg`/`elolegOsszeg` pénznemváltása --
 * `sorPenznemValtassal()` terv-szintű párja. A sor-szintű háromágú
 * árlista-ág itt nem értelmezhető (a terv-szintű összegnek nincs
 * árlistai referenciája), ezért kétágú: stashelt pár előlép,
 * egyébként mindkét mező `null`-ra kapcsol -- nincs automatikus HUF<->EUR
 * átváltás, egy másik pénznem alapegységében átvitt szám mértékegység-hiba
 * lenne, nem adat. A visszaadott `masikPenznemOsszegek` `null`, ha a kilépő pár
 * mindkét tagja `null` -- nincs értelme fölösleges kulcsot tartani a
 * `terv.json`-ben.
 */
export function tervOsszegekPenznemValtassal(
  plan: Plan,
): Pick<Plan, 'kedvezmenyOsszeg' | 'elolegOsszeg' | 'masikPenznemOsszegek'> {
  const kilepoPar = { kedvezmenyOsszeg: plan.kedvezmenyOsszeg ?? null, elolegOsszeg: plan.elolegOsszeg ?? null };
  const ujStash = kilepoPar.kedvezmenyOsszeg == null && kilepoPar.elolegOsszeg == null ? null : kilepoPar;

  const stash = plan.masikPenznemOsszegek;
  if (stash) {
    return {
      kedvezmenyOsszeg: stash.kedvezmenyOsszeg,
      elolegOsszeg: stash.elolegOsszeg,
      masikPenznemOsszegek: ujStash,
    };
  }

  return { kedvezmenyOsszeg: null, elolegOsszeg: null, masikPenznemOsszegek: ujStash };
}

/**
 * Igaz, ha a sor `tetelId`-hez kötött, a tétel megvan az árlistában, de
 * nincs beárazva az adott pénznemben (`ar[penznem] == null`) -- az
 * EGYETLEN hely, ahol ez eldől (`PlanEditorPage.tsx` Listaár cellája és a
 * `kitoltetlen.ts` `araztalanSorok()` is ezt hívja). Egy ismeretlen
 * `tetelId` (a tétel már nincs az árlistában, D17) NEM számít hiányzónak
 * -- a pillanatkép-ár (D7) továbbra is érvényes, egy téves hard block
 * rosszabb lenne, mint a régi szám megjelenítése. Egyedi sor (üres
 * `tetelId`) sem számít hiányzónak -- annak sosincs értelmezhető
 * árlistai referenciaára, ez nem "hiány", hanem a sor jellege
 * (`sorMezokEgyedibol`).
 */
export function nincsListaar(sor: Sor, tetel: Tetel | undefined, penznem: Penznem): boolean {
  return sor.tetelId.trim() !== '' && tetel != null && !tetel.ar[penznem];
}
