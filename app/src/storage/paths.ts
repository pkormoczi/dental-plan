// Mappanév- és verziólogika -- adapter-független, mindkét PlanStorage
// implementáció (DemoStorage, majd FileSystemStorage) ugyanezt használja.
// Lásd docs/02-domain-modell.md "Mappastruktúra" és "Mappanév szabályok".

// Tiltott karakterek Windows fájlnévben, plusz a záró pont/szóköz.
// Az ékezeteket SZÁNDÉKOSAN nem transzliteráljuk -- a doki a Fájlkezelőben
// keres rájuk névre.
const FORBIDDEN_CHARS = /[/\\:*?"<>|]/g;
const MAX_NAME_PART_LENGTH = 40; // Windows 260 karakteres útvonalkorlát miatt rövid nevek kellenek

export function sanitizeNamePart(raw: string): string {
  let s = raw.trim().replace(FORBIDDEN_CHARS, '-');
  // Windows: a névnek nem lehet záró pontja vagy szóköze.
  s = s.replace(/[ .]+$/, '');
  s = s.slice(0, MAX_NAME_PART_LENGTH);
  return s || 'Nevtelen';
}

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** 6 karakteres, stabil azonosító -- ez lesz a `paciensId` és a `tervId` is (D29). */
export function generateId(): string {
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return id;
}

/**
 * A `paciens.nev` egy string ("Kovács János", vezetéknév elöl). Az első
 * szóköznél vágjuk -- ez a legjobb erőfeszítéses szétválasztás, amit a
 * mappanévhez amúgy is csak sanitizálva használunk.
 */
export function splitHungarianName(fullName: string): {
  vezeteknev: string;
  keresztnev: string;
} {
  const trimmed = fullName.trim();
  const idx = trimmed.indexOf(' ');
  if (idx === -1) return { vezeteknev: trimmed, keresztnev: '' };
  return { vezeteknev: trimmed.slice(0, idx), keresztnev: trimmed.slice(idx + 1) };
}

/** `Vezeteknev-Keresztnev_<id6>` -- lásd docs/02-domain-modell.md. */
export function buildPatientDirName(fullName: string, patientId: string): string {
  const { vezeteknev, keresztnev } = splitHungarianName(fullName);
  const parts = [sanitizeNamePart(vezeteknev), sanitizeNamePart(keresztnev)].filter(Boolean);
  return `${parts.join('-')}_${patientId}`;
}

/** Közös `<...>_<id6>` alak -- páciens- és terv-mappanevek is ezt követik. */
const ID_SUFFIX_RE = /^(.+)_([a-z0-9]{6})$/i;

/**
 * Legjobb erőfeszítéses visszafejtés egy mappanévből -- kettős vezetéknevek
 * (pl. "Nagy-Kovács") esetén az első kötőjelnél vág, ami nem mindig a
 * valódi vezetéknév/keresztnév határ. Ez csak listázáshoz kell; a
 * megbízható névforrás a `paciens.json` `nev` mezője.
 */
export function parsePatientDirName(
  dirName: string,
): { vezeteknev: string; keresztnev: string; patientId: string } | null {
  const m = ID_SUFFIX_RE.exec(dirName);
  if (!m) return null;
  const [, namePart, patientId] = m;
  const dashIdx = namePart.indexOf('-');
  if (dashIdx === -1) return { vezeteknev: namePart, keresztnev: '', patientId };
  return {
    vezeteknev: namePart.slice(0, dashIdx),
    keresztnev: namePart.slice(dashIdx + 1),
    patientId,
  };
}

/**
 * `<szlugosított terv-cím>_<id6>` -- lásd docs/02-domain-modell.md § Páciens-
 * és terv-mappa (D29). A mappanév a terv-mappa LÉTREHOZÁSAKOR keletkezik és
 * utána örökre FIX marad, akkor is, ha a doki később átírja a megjelenített
 * (`terv-cimke.json`-beli vagy automatikusan javasolt) címkét -- pontosan
 * úgy, ahogy a páciensmappa neve sem követi a páciensnév utólagos javítását.
 * Üres/whitespace `tervCim`-nél "Terv" a kiinduló szó, mert a
 * `sanitizeNamePart`-alapértelmezett "Nevtelen" ide félrevezető lenne.
 */
export function buildPlanDirName(tervCim: string, planId: string): string {
  return `${sanitizeNamePart(tervCim.trim() || 'Terv')}_${planId}`;
}

/** Legjobb erőfeszítéses visszafejtés -- csak listázási tartaléknak, lásd `parsePatientDirName`. */
export function parsePlanDirName(dirName: string): { tervCim: string; planId: string } | null {
  const m = ID_SUFFIX_RE.exec(dirName);
  if (!m) return null;
  const [, tervCim, planId] = m;
  return { tervCim, planId };
}

const VERSION_DIR_RE = /^(\d{4}-\d{2}-\d{2})_v(\d+)$/;

/** `<ISO dátum>_v<n>` -- lásd docs/02-domain-modell.md. */
export function buildVersionDirName(isoDate: string, verzio: number): string {
  return `${isoDate}_v${verzio}`;
}

export function parseVersionDirName(
  dirName: string,
): { isoDate: string; verzio: number } | null {
  const m = VERSION_DIR_RE.exec(dirName);
  if (!m) return null;
  return { isoDate: m[1], verzio: Number(m[2]) };
}

/** A következő szabad verziószám egy páciens meglévő verziómappái alapján. */
export function nextVersionNumber(existingVersionDirNames: string[]): number {
  const versions = existingVersionDirNames
    .map(parseVersionDirName)
    .filter((v): v is { isoDate: string; verzio: number } => v !== null)
    .map((v) => v.verzio);
  return versions.length ? Math.max(...versions) + 1 : 1;
}

/** D4: verziómappát soha nem írunk felül. */
export class VersionConflictError extends Error {
  constructor(dirName: string) {
    super(
      `A(z) "${dirName}" verziómappa már létezik. Verziómappát soha nem ` +
        `írunk felül (D4) -- ez hiba a hívó kódban, nem a felhasználó adatában.`,
    );
    this.name = 'VersionConflictError';
  }
}

export function assertVersionDirAvailable(
  existingVersionDirNames: string[],
  dirName: string,
): void {
  if (existingVersionDirNames.includes(dirName)) {
    throw new VersionConflictError(dirName);
  }
}
