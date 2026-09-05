// Páciens-szintű törzsadat (paciens-adatok.json, lásd
// app/src/storage/CLAUDE.md). Ugyanaz a minta, mint
// a terv-címke élő auto-javaslata (`tervCim.ts`): a döntés -- lezárt fájl
// vagy élő fallback -- EGYETLEN helyen, egy `??`-szerű ágban dől el, itt
// `megjelenitettTorzsadat()`-ben.

import type { Paciens, PatientFolder, PatientMasterData, Plan } from './types';

/** Egy vadonatúj, terv nélküli páciens kezdő törzsadata -- csak a `nev` kitöltve. */
export function uresTorzsadat(nev: string, paciensId: string): PatientMasterData {
  return {
    schemaVersion: 1,
    paciensId,
    nev,
    szuletesiIdo: '',
    lakcim: '',
    telefon: '',
    email: '',
    taj: '',
    kiskoru: false,
    torvenyesKepviselo: null,
  };
}

/** A fallback előállítása egy már mentett terv `paciens` pillanatképéből (a pillanatkép változatlan marad, csak kiindulópontként szolgál). */
export function torzsadatTervbol(paciens: Paciens, paciensId: string): PatientMasterData {
  return { schemaVersion: 1, paciensId, ...paciens };
}

/**
 * Melyik törzsadat látszik ténylegesen: a lezárt `paciens-adatok.json`, vagy
 * -- ha még nem létezik -- egy élő fallback. A fallback a páciens
 * legutóbb módosított terv-láncának legfrissebb `paciens` pillanatképéből
 * épül (`utolsoTerv`); ha a páciensnek egyetlen terve sincs (6. döntés,
 * backlog-28), a `PatientFolder.nev`-ből induló üres rekordra esik vissza.
 * Ez az EGYETLEN hely, ahol ez a döntés eldől.
 */
export function megjelenitettTorzsadat(
  adatok: PatientMasterData | null,
  utolsoTerv: Plan | null,
  patient: PatientFolder,
): PatientMasterData {
  if (adatok) return adatok;
  if (utolsoTerv) return torzsadatTervbol(utolsoTerv.paciens, patient.paciensId);
  return uresTorzsadat(patient.nev, patient.paciensId);
}

/**
 * A `paciens.json` index `nev`-jének forrása egy terv mentésekor (3.
 * döntés, backlog-28): ha van lezárt törzsadat, az nyer -- a terv
 * `paciens.nev`-je NEM írhatja felül némán a törzsadatban rögzített nevet.
 * Domain-függvény, nem inline `??` a storage rétegben, mert a
 * `FileSystemStorage`-nak (2. fázis) ugyanezt a szabályt kell követnie.
 */
export function paciensIndexNev(adatok: PatientMasterData | null, planNev: string): string {
  return adatok ? adatok.nev : planNev;
}

/** A `Paciens` részhalmaz kiemelése egy törzsadatból -- terv-előtöltéshez (`planUjTorzsadattal`, domain/planCopy.ts). */
export function paciensTorzsadatbol(adatok: PatientMasterData): Paciens {
  return {
    nev: adatok.nev,
    szuletesiIdo: adatok.szuletesiIdo,
    lakcim: adatok.lakcim,
    telefon: adatok.telefon,
    email: adatok.email,
    taj: adatok.taj,
    kiskoru: adatok.kiskoru,
    torvenyesKepviselo: adatok.torvenyesKepviselo,
  };
}
