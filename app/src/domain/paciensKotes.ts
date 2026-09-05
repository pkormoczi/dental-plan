// Másolás új tervbe: páciens-identitás védőháló. SZÁNDÉKOSAN külön modul a
// `paciensDuplikacio.ts`-től: az ott (a köztes páciens-választó) PONTOS és HASONLÓ
// névtalálatokat is felsoroló, javaslat-jellegű detektálás egy ÚJ páciens
// quick-create pillanatában fut; ez a modul egy MÁR KÖTÖTT piszkozat Név
// mezőjét méri a meglévő páciensekhez képest, kizárólag PONTOS egyezésre,
// mert csak az adja a legalacsonyabb false-positive arányú, egyértelmű
// azonosítási kollíziót.
//
// A `nevJeloltek()`-et hívja (nem duplikálja a token-egyezés logikáját) --
// csak az `egyezes === 'nev-pontos'` találatok számítanak ütközésnek.

import { nevJeloltek } from './paciensDuplikacio';
import type { PatientFolder } from './types';

export interface PaciensKotes {
  /** A piszkozathoz kötött páciensmappa, vagy `null`, ha nincs feloldható kötés. */
  patientDir: string | null;
  /** A kötött mappa `paciens.json` index-bejegyzése, vagy `null`. */
  kotott: PatientFolder | null;
  /** A beírt névre PONTOSAN illeszkedő, a kötött páciensTŐL KÜLÖNBÖZŐ páciensek. */
  utkozok: PatientFolder[];
}

/**
 * Kötés nélkül (`patientDir === null`) nincs mihez ütközni -- üres
 * `utkozok`-kal tér vissza, `nevJeloltek()`-et sem hívja. A kötött páciens
 * KÉTFÉLE módon zárva ki, hogy sose üssön vissza saját magára: a
 * `paciensId` szerint (a `nevJeloltek()` `kihagyottPaciensId` paramétere) ÉS
 * `dirName` szerint is -- a `paciensId` egy vadonatúj, még sosem mentett
 * láncnál hiányozhat, ilyenkor a `dirName`-szűrés az egyetlen védelem.
 */
export function paciensKotes(
  patients: PatientFolder[],
  patientDir: string | null,
  nev: string,
  paciensId?: string,
): PaciensKotes {
  const kotott = patientDir ? (patients.find((p) => p.dirName === patientDir) ?? null) : null;
  if (!patientDir) return { patientDir: null, kotott: null, utkozok: [] };

  const jeloltek = nevJeloltek(patients, nev, { kihagyottPaciensId: paciensId ?? kotott?.paciensId });
  const utkozok = jeloltek
    .filter((j) => j.egyezes === 'nev-pontos' && j.patient.dirName !== patientDir)
    .map((j) => j.patient);

  return { patientDir, kotott, utkozok };
}
