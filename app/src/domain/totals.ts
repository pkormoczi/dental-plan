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
