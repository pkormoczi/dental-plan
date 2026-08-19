// Az /uj-terv köztes páciensválasztó (D29, D40,
// docs/03-funkcionalis-spec.md § „Új terv indítása") relevancia-rendezője
// 2+ karakteres kereséshez -- külön modul a `search.ts`-től, mert az a
// kétnyelvű ártétel-név-egyezés (`nevEgyezik`) helye, ez páciensnév-rangsor.

import { norm } from './search';
import type { PatientFolder } from './types';

export const KERESES_MIN_KARAKTER = 2;

/**
 * A `q` MÉG NEM normalizált, nyers keresőszöveg -- a norm() itt fut le,
 * egyszer, a hívó ciklus előtt (a `nevEgyezik()` dokumentált konvenciója).
 * Nem mutálja a bemenetet.
 *
 * Rangsor: teljes név eleje > valamelyik szótöredék eleje > belső egyezés,
 * szinten belül `localeCompare('hu')` -- a magyar "Vezetéknév Keresztnév"
 * alak miatt a keresztnévre gépelés (pl. "éva") is a szó-eleji szintre esik,
 * nem csúszik a belső egyezések közé.
 */
export function paciensTalalatok(patients: PatientFolder[], q: string): PatientFolder[] {
  const nq = norm(q);
  if (!nq) return [];

  function rang(nev: string): number | null {
    const nNev = norm(nev);
    if (!nNev.includes(nq)) return null;
    if (nNev.startsWith(nq)) return 0;
    if (nNev.split(/\s+/).some((szo) => szo.startsWith(nq))) return 1;
    return 2;
  }

  return patients
    .map((p) => ({ p, rang: rang(p.nev) }))
    .filter((x): x is { p: PatientFolder; rang: number } => x.rang !== null)
    .sort((a, b) => (a.rang !== b.rang ? a.rang - b.rang : a.p.nev.localeCompare(b.p.nev, 'hu')))
    .map((x) => x.p);
}
