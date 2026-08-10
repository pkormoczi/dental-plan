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

/** Az előleg alapértelmezett százaléka, amikor a doki bekapcsolja a jelölőt. */
export const ELOLEG_ALAP_SZAZALEK = 50;

export interface ElolegOsszegek {
  eloleg: number;
  fennmarado: number;
}

/**
 * Az előleg és a fennmaradó rész összege egy adott százalékhoz.
 *
 * A `fizetendo` a TÉNYLEGES (kedvezménnyel csökkentett) végösszeg, nem a
 * listaáras -- a páciens ehhez képest fizet előleget (D9: a nyomtatványon
 * amúgy sem látszik a kedvezmény). Egész pénznemegységre kerekít (HUF:
 * forint, EUR: cent), és a fennmaradó részt KIVONÁSSAL adja, nem külön
 * kerekítéssel, hogy a két szám mindig pontosan a `fizetendo`-t adja ki.
 *
 * Ez az EGYETLEN hely, ahol az előleg számítása/kerekítése eldől -- a
 * szerkesztő és a nyomtatvány is ezt hívja.
 */
export function elolegOsszegek(fizetendo: number, szazalek: number): ElolegOsszegek {
  const eloleg = Math.round((szazalek / 100) * fizetendo);
  return { eloleg, fennmarado: fizetendo - eloleg };
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
