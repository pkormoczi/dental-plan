// Az /uj-terv köztes páciensválasztó relevancia-rendezője
// 2+ karakteres kereséshez -- külön modul a `search.ts`-től, mert az a
// kétnyelvű ártétel-név-egyezés (`nevEgyezik`) helye, ez páciensnév-rangsor.
//
// A `keresoKulcs`/`torzsadatEgyezik` pár a Pácienslista bővült
// keresése: névre a fenti `norm()`-mintát követi, számjegyre a tárolt
// születési dátum/telefon számjegysorára illeszkedik -- a telefonnál a
// `telefonKulcs()` (`domain/paciensDuplikacio.ts`) normalizált alakját
// is bevonja, hogy a `06 20…`/`+36 20…` előtag ne számítson.

import { telefonKulcs } from './paciensDuplikacio';
import { norm } from './search';
import type { PatientFolder, PatientMasterData } from './types';

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

/** Ennél kevesebb számjegynél egy `keresoKulcs.szamjegyek` nem szűkít DOB-ra/telefonra -- egyetlen leütés ne találjon minden dátumot. */
const SZAMJEGY_MIN_KARAKTER = 2;

export interface KeresoKulcs {
  nq: string;
  szamjegyek: string;
}

/** `null` üres/whitespace keresésnél -- a hívó ilyenkor szűrés nélkül listáz. */
export function keresoKulcs(q: string): KeresoKulcs | null {
  if (!q.trim()) return null;
  return { nq: norm(q), szamjegyek: q.replace(/\D/g, '') };
}

/**
 * Egy páciens törzsadata illeszkedik-e a `kulcs`-ra: a mai névegyezés VAGY
 * a beírt számjegysor a tárolt születési dátum (`ÉÉÉÉHHNN`) VAGY telefon
 * számjegyeire. A telefonnál a nyers számjegyillesztés mellett a
 * `telefonKulcs()`-előtag-normalizált alakok egyezését is nézi -- enélkül
 * a `06 20 555 1234`-ként tárolt szám nem találna `+36205551234`-re
 * keresve, és fordítva.
 */
export function torzsadatEgyezik(
  adat: Pick<PatientMasterData, 'nev' | 'szuletesiIdo' | 'telefon'>,
  kulcs: KeresoKulcs,
): boolean {
  if (norm(adat.nev).includes(kulcs.nq)) return true;
  if (kulcs.szamjegyek.length < SZAMJEGY_MIN_KARAKTER) return false;

  const dobSzamjegyek = adat.szuletesiIdo.replace(/\D/g, '');
  if (dobSzamjegyek.includes(kulcs.szamjegyek)) return true;

  const telSzamjegyek = adat.telefon.replace(/\D/g, '');
  if (telSzamjegyek.includes(kulcs.szamjegyek)) return true;

  const telKulcs = telefonKulcs(adat.telefon);
  const beirtKulcs = telefonKulcs(kulcs.szamjegyek);
  return telKulcs !== null && beirtKulcs !== null && telKulcs === beirtKulcs;
}
