// Páciensenkénti "legutóbbi jelentős aktivitás" (D39,
// docs/03-funkcionalis-spec.md § 1. Indítás) -- a Kezdőlap recent-páciens
// listájának egyetlen forrása. Az `utolsoAktivitas` mező három meglévő
// storage-írási pont (createPatient, savePatientData, savePlan) egyikén
// frissül, sosem egy páciens/terv puszta megnyitásán -- ez adja D19-et
// (nem "megnyitás", tényleges tartalmi módosítás).

import { formatRelativIdo } from './date';
import type { AktivitasTipus, PatientActivity, PatientFolder } from './types';

const ISMERT_TIPUSOK = new Set<AktivitasTipus>(['letrehozva', 'torzsadat-mentve', 'terv-veglegesitve']);

/**
 * Egyetlen időbélyeg-forrás a storage írási pontjainak -- domain-függvény,
 * nem inline `new Date()` a storage rétegben, mert a `FileSystemStorage`-nak
 * (2. fázis) ugyanezt a szabályt kell követnie (`paciensIndexNev()` mintája,
 * `domain/paciensAdatok.ts`). A `most` csak a determinisztikus teszthez.
 */
export function ujAktivitas(tipus: AktivitasTipus, most: Date = new Date()): PatientActivity {
  return { tipus, idopont: most.toISOString() };
}

/**
 * Tolerant parse a `paciens.json` indexéből (D29: puszta index, soha nem
 * dobhat egy sérült/ismeretlen alakú mezőn) -- ismeretlen `tipus`, hiányzó
 * vagy nem parse-olható `idopont` esetén `undefined`, a páciens ilyenkor
 * egyszerűen kimarad a recent listából, nem béníthatja meg azt.
 */
export function ervenyesAktivitas(value: unknown): PatientActivity | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { tipus, idopont } = value as Record<string, unknown>;
  if (typeof tipus !== 'string' || !ISMERT_TIPUSOK.has(tipus as AktivitasTipus)) return undefined;
  if (typeof idopont !== 'string' || !Number.isFinite(Date.parse(idopont))) return undefined;
  return { tipus: tipus as AktivitasTipus, idopont };
}

export const RECENT_PACIENS_LIMIT = 5;

/**
 * A legutóbbi jelentős aktivitású páciensek, csökkenő sorrendben (D190/D191).
 * `utolsoAktivitas` nélküli páciens nem kerül a listába. Tiszta függvény --
 * nincs I/O, a hívó adja a MÁR betöltött `PatientFolder[]`-t (Home és a
 * páciensválasztó/35. tétel selectorja is ugyanezt hívja, D224). Nem
 * mutálja a bemenetet.
 */
export function legutobbAktivPaciensek(patients: PatientFolder[], limit: number): PatientFolder[] {
  return patients
    .filter((p): p is PatientFolder & { utolsoAktivitas: PatientActivity } => p.utolsoAktivitas != null)
    .sort((a, b) => {
      const diff = Date.parse(b.utolsoAktivitas.idopont) - Date.parse(a.utolsoAktivitas.idopont);
      return diff !== 0 ? diff : a.nev.localeCompare(b.nev, 'hu');
    })
    .slice(0, limit);
}

const AKTIVITAS_CIMKE: Record<AktivitasTipus, string> = {
  letrehozva: 'Páciens létrehozva',
  'torzsadat-mentve': 'Törzsadat mentve',
  'terv-veglegesitve': 'Terv véglegesítve',
};

/**
 * "Terv véglegesítve · 2 órája" -- az EGYETLEN hely, ahol egy aktivitás-sor
 * szövege eldől (D190/D225); a Home és a 35. tétel selectorja is ezt hívja,
 * a `AKTIVITAS_CIMKE` térkép modul-privát marad, hogy a két hely ne tudjon
 * egymástól eltérő szöveget komponálni.
 */
export function aktivitasSzoveg(aktivitas: PatientActivity, most: Date): string {
  return `${AKTIVITAS_CIMKE[aktivitas.tipus]} · ${formatRelativIdo(aktivitas.idopont, most)}`;
}
