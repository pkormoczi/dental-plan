// A sávos (SAVOS) ártétel sávhatára a SORON -- felvételkor rögzített
// pillanatkép, nem élő árlista-lookup: egy későbbi árlista-módosítás nem
// írhatja át visszamenőleg, mi számított sávon belülinek.
//
// A "sávon belül" FÜGGETLEN a `Sor.savos` kapcsolótól: az a nyomtatvány
// `*`-áról dönt (lásd app/src/domain/CLAUDE.md), nem az árazásról -- egy
// kézzel becsültre állított FIX vagy egyedi sornak nincs sávhatára.

import type { Ar, Sor } from './types';

/** A sorra menthető sávhatár egy árlistai `Ar`-ból; `null`, ha nem SAVOS. */
export function savHatarArbol(ar: Ar | null | undefined): { min: number; max: number } | null {
  return ar?.tipus === 'SAVOS' ? { min: ar.min, max: ar.max } : null;
}

/**
 * A sor ajánlati ára a felvételkori sávon belül van-e. Fordított sávnál
 * (`min > max`, lásd `savosHatarForditott`) az intervallum üres, tehát hamis
 * -- ilyenkor a sor a sávhatár előtti viselkedést kapja, nem külön ág.
 */
export function savonBelul(sor: Sor): boolean {
  const sav = sor.savHatar;
  if (!sav) return false;
  return sor.tenylegesEgysegar >= sav.min && sor.tenylegesEgysegar <= sav.max;
}

/**
 * A sor referencia-listaára: sávon belüli ajánlati árnál MAGA az ajánlati ár
 * (a sávon belül nincs mihez képest eltérni), egyébként a felvételkori
 * `listaEgysegar`. Ez az EGYETLEN hely, ahol ez eldől -- a jelvény
 * (`sorElteres`), az összegzés (`totals.ts`), a véglegesítés-őr
 * (`arKoveti.ts`) és a másolat-jelzés (`orokoltJelzesek.ts`) is ezt hívja.
 */
export function sorReferenciaAr(sor: Sor): number {
  return savonBelul(sor) ? sor.tenylegesEgysegar : sor.listaEgysegar;
}
