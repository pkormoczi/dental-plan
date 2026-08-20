// Osszegzesi logika. Az osszesitok mezo a fajlban szamit igaznak (lasd
// schema.ts / docs/02-domain-modell.md "Miert van osszesitok, ha szarmaztathato"),
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
 * terv-szintű kedvezmény (backlog-16). Ez az EGYETLEN hely, ahol a
 * Fizetendő eldől -- a szerkesztő, a nyomtatvány és a `computeOsszesitok`
 * is ezt hívja.
 *
 * SOHA nem ad negatívat: a kedvezmény fix összeg (D25), tehát utólagos
 * sortörléskor a sorok összege fölé kerülhet -- ilyenkor 0 a fizetendő,
 * nem negatív szám az aláírandó papíron. A szerkesztő ezt külön jelzi.
 */
export function tervVegosszeg(fazisok: Fazis[], kedvezmenyOsszeg?: number | null): number {
  return Math.max(0, sorokOsszeg(fazisok) - (kedvezmenyOsszeg ?? 0));
}

export interface ElolegOsszegek {
  eloleg: number;
  /**
   * `null`, ha az előleg meghaladja a fizetendőt (D66) -- ilyenkor a
   * fennmaradó rész nem értelmezhető negatív számként a nyomtatványon/
   * szerkesztőben, a hívó „—"-t jelenít meg helyette. A véglegesítés-őr
   * ezt az esetet kemény blokkal fogja meg (`elolegTullepi`), de a szerkesztő
   * és a Csak-ajánlat előnézet a blokk előtt is meg kell tudja jeleníteni.
   */
  fennmarado: number | null;
}

/**
 * Az előleg meghaladja-e a fizetendőt -- ez az EGYETLEN hely, ahol ez a
 * határ eldől; az `elolegOsszegek` és a véglegesítés-őr is ezt hívja (D66).
 */
export function elolegTullepi(fizetendo: number, eloleg: number): boolean {
  return eloleg > fizetendo;
}

/**
 * Az előleg és a fennmaradó rész összege egy adott (abszolút) előleg-
 * összeghez (D66 -- korábban százalékból számolt, drift-mentes érték volt,
 * a doki tudatosan fix összegre váltott).
 *
 * A `fizetendo` a TÉNYLEGES (kedvezménnyel csökkentett) végösszeg, nem a
 * listaáras -- a páciens ehhez képest fizet előleget (D9: a nyomtatványon
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
 * SOHA nem írja felül a mentett `osszesitok`-ot (D7: a snapshot az igazság).
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
