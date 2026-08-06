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

export function computeOsszesitok(fazisok: Fazis[]): Osszesitok {
  const kezelesekOsszesen = fazisok.reduce((sum, f) => sum + fazisListaOsszeg(f), 0);
  const fizetendo = fazisok.reduce((sum, f) => sum + fazisOsszeg(f), 0);
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
export function osszesitokElter(mentett: Osszesitok, fazisok: Fazis[]): Osszesitok | null {
  const ujraszamolt = computeOsszesitok(fazisok);
  const egyezik =
    ujraszamolt.kezelesekOsszesen === mentett.kezelesekOsszesen &&
    ujraszamolt.kedvezmeny === mentett.kedvezmeny &&
    ujraszamolt.fizetendo === mentett.fizetendo;
  return egyezik ? null : ujraszamolt;
}
