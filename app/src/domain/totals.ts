// Osszegzesi logika. Az osszesitok mezo a fajlban szamit igaznak (az alairt
// papirral kell egyeznie, nem az ujraszamolt ertekkel -- lasd app/src/domain/CLAUDE.md),
// ez a modul allitja elo veglegesiteskor es szamolja ujra betolteskor
// az osszehasonlitashoz.

import type { Fazis, Osszesitok, Sor } from './types';

export function sorOsszeg(sor: Sor): number {
  return sor.tenylegesEgysegar * sor.mennyiseg;
}

export function sorListaOsszeg(sor: Sor): number {
  return sor.listaEgysegar * sor.mennyiseg;
}

export function fazisOsszeg(fazis: Fazis): number {
  return fazis.sorok.reduce((sum, sor) => sum + sorOsszeg(sor), 0);
}

export function fazisListaOsszeg(fazis: Fazis): number {
  return fazis.sorok.reduce((sum, sor) => sum + sorListaOsszeg(sor), 0);
}

export function sorokOsszeg(fazisok: Fazis[]): number {
  return fazisok.reduce((sum, f) => sum + fazisOsszeg(f), 0);
}

export function sorokListaOsszeg(fazisok: Fazis[]): number {
  return fazisok.reduce((sum, f) => sum + fazisListaOsszeg(f), 0);
}

/**
 * A terv tényleges végösszege (Fizetendő): a sorok összege mínusz a
 * terv-szintű, ELŐJELES eltérés (`kedvezmenyOsszeg` -- pozitív kedvezmény,
 * negatív felár). Ez az EGYETLEN hely, ahol a Fizetendő eldől -- a
 * szerkesztő, a nyomtatvány és a `computeOsszesitok` is ezt hívja.
 *
 * SOHA nem ad negatívat: az eltérés fix összeg, tehát utólagos
 * sortörléskor a kedvezmény-ág a sorok összege fölé kerülhet -- ilyenkor 0
 * a fizetendő, nem negatív szám az aláírandó papíron. A szerkesztő ezt
 * külön jelzi.
 */
export function tervVegosszeg(fazisok: Fazis[], kedvezmenyOsszeg?: number | null): number {
  return Math.max(0, sorokOsszeg(fazisok) - (kedvezmenyOsszeg ?? 0));
}

export interface ElteresBontas {
  /** Bruttó elengedett összeg (sorszintű + terv-szintű, összeadva). */
  kedvezmeny: number;
  /** Bruttó felár (sorszintű + terv-szintű, összeadva). */
  felar: number;
}

/**
 * A listaártól való eltérés BRUTTÓ bontása a két irányra. Nettózva a doki
 * nem látja, mennyi kedvezményt adott és mennyi felárat kért: egy 27 000-es
 * felár és egy 23 000-es kedvezmény "4000 felár"-rá olvadt. Ez az EGYETLEN
 * hely, ahol a bontás eldől.
 *
 * Invariáns: `sorokListaOsszeg + felar - kedvezmeny === tervVegosszeg`. A
 * `tervVegosszeg` 0-padlója esetén a kedvezmény-oldal ehhez igazodik, nem a
 * begépelt értéket mutatja -- többet nem lehet elengedni, mint amennyi a
 * tervben van.
 */
export function elteresBontas(fazisok: Fazis[], kedvezmenyOsszeg?: number | null): ElteresBontas {
  let kedvezmeny = 0;
  let felar = 0;
  for (const fazis of fazisok) {
    for (const sor of fazis.sorok) {
      const elteres = sorListaOsszeg(sor) - sorOsszeg(sor);
      if (elteres > 0) kedvezmeny += elteres;
      else felar -= elteres;
    }
  }
  const tervSzintu = kedvezmenyOsszeg ?? 0;
  if (tervSzintu > 0) kedvezmeny += tervSzintu;
  else felar -= tervSzintu;
  return { kedvezmeny: Math.min(kedvezmeny, sorokListaOsszeg(fazisok) + felar), felar };
}

export interface ElolegOsszegek {
  eloleg: number;
  /**
   * `null`, ha az előleg meghaladja a fizetendőt -- ilyenkor a
   * fennmaradó rész nem értelmezhető negatív számként a nyomtatványon/
   * szerkesztőben, a hívó „—"-t jelenít meg helyette. A véglegesítés-őr
   * ezt az esetet kemény blokkal fogja meg (`elolegTullepi`), de a szerkesztő
   * és a Csak-ajánlat előnézet a blokk előtt is meg kell tudja jeleníteni.
   */
  fennmarado: number | null;
}

/**
 * Az előleg meghaladja-e a fizetendőt -- ez az EGYETLEN hely, ahol ez a
 * határ eldől; az `elolegOsszegek` és a véglegesítés-őr is ezt hívja.
 */
export function elolegTullepi(fizetendo: number, eloleg: number): boolean {
  return eloleg > fizetendo;
}

/**
 * Az előleg és a fennmaradó rész összege egy adott (abszolút) előleg-
 * összeghez (korábban százalékból számolt, drift-mentes érték volt,
 * a doki tudatosan fix összegre váltott).
 *
 * A `fizetendo` a TÉNYLEGES (kedvezménnyel csökkentett) végösszeg, nem a
 * listaáras -- a páciens ehhez képest fizet előleget (a nyomtatványon
 * amúgy sem látszik a kedvezmény). A fennmaradó részt KIVONÁSSAL adja, nem
 * külön kerekítéssel, hogy a két szám mindig pontosan a `fizetendo`-t adja
 * ki -- kivéve, ha az előleg túllépi a fizetendőt, ott `fennmarado: null`.
 *
 * Ez az EGYETLEN hely, ahol az előleg számítása eldől -- a szerkesztő és a
 * nyomtatvány is ezt hívja.
 */
export function elolegOsszegek(fizetendo: number, eloleg: number): ElolegOsszegek {
  return { eloleg, fennmarado: elolegTullepi(fizetendo, eloleg) ? null : fizetendo - eloleg };
}

/**
 * A százalékos előleg-bevitel kerekítési lépése, a pénznem alapegységében
 * (HUF: 1000 Ft, EUR: 1000 cent = 10 €) -- mindkét pénznemben ugyanaz a szám,
 * hogy egy aláírandó papíron ne álljon pl. "234 370 Ft" alakú összeg.
 */
export const ELOLEG_SZAZALEK_KEREKITES = 1000;

/**
 * Egy 0-100 közé szorított előleg-százalékot vált a Fizetendőből ABSZOLÚT
 * összeggé, felfelé kerekítve a legközelebbi `ELOLEG_SZAZALEK_KEREKITES`
 * többszörösére. A százalék ez után NEM tárolódik és nem számol újra -- csak
 * beviteli segéd az `elolegOsszeg` mezőhöz, a felkerekítés miatt a
 * Fizetendő fölé is vihet, ezt a hívó a mai
 * `elolegTullepi()` úton kezeli.
 */
export function elolegSzazalekbol(fizetendo: number, szazalek: number): number {
  const clamped = Math.min(100, Math.max(0, szazalek));
  const nyers = (fizetendo * clamped) / 100;
  return Math.ceil(nyers / ELOLEG_SZAZALEK_KEREKITES) * ELOLEG_SZAZALEK_KEREKITES;
}

export function computeOsszesitok(
  fazisok: Fazis[],
  kedvezmenyOsszeg?: number | null,
): Osszesitok {
  const kezelesekOsszesen = sorokListaOsszeg(fazisok);
  const fizetendo = tervVegosszeg(fazisok, kedvezmenyOsszeg);
  return {
    kezelesekOsszesen,
    kedvezmeny: kezelesekOsszesen - fizetendo,
    fizetendo,
  };
}

/**
 * P1-3: az `osszesitok` a fájlból számít igaznak (CLAUDE.md), de eltérés
 * esetén figyelmeztetni kell -- ez a modul csak írásnál (véglegesítéskor)
 * hívta eddig a computeOsszesitok-ot, betöltéskor senki nem hasonlította
 * össze. `null`, ha a mentett és az élőben újraszámolt érték egyezik;
 * egyébként az újraszámolt érték, hogy a hívó megjeleníthesse a diffet.
 * SOHA nem írja felül a mentett `osszesitok`-ot (a snapshot az igazság).
 */
export function osszesitokElter(
  mentett: Osszesitok,
  fazisok: Fazis[],
  kedvezmenyOsszeg?: number | null,
): Osszesitok | null {
  const ujraszamolt = computeOsszesitok(fazisok, kedvezmenyOsszeg);
  const egyezik =
    ujraszamolt.kezelesekOsszesen === mentett.kezelesekOsszesen &&
    ujraszamolt.kedvezmeny === mentett.kedvezmeny &&
    ujraszamolt.fizetendo === mentett.fizetendo;
  return egyezik ? null : ujraszamolt;
}
