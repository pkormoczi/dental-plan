// A demóból az asztali alkalmazásba vitt egyszeri átvitel fájlformátuma. Az
// asztali app importja erre épül, ezért DOM-mentes, és csak a PlanStorage
// szerződésén át olvas. Páciens- és tervadat szándékosan nincs benne: a demó
// páciensei fiktívek, egy éles adatmappába csak törlendő szemetet vinnének.

import { assertKnownSchemaVersion } from '../domain/schema';
import { assertPriceListShape, assertSettingsShape } from '../domain/validate';
import type { PriceList, Settings } from '../domain/types';
import { parseJson } from './json';
import type { PlanStorage } from './PlanStorage';

export const ADAT_EXPORT_FORMATUM = 'dental-plan-export';
export const ADAT_EXPORT_SEMA = 1;

export interface AdatExport {
  formatum: typeof ADAT_EXPORT_FORMATUM;
  schemaVersion: typeof ADAT_EXPORT_SEMA;
  keszult: string;
  arlista: PriceList;
  beallitasok: Settings;
  /** Fájlnév (`<base>-v<n>.md`) → a teljes, címsoros tartalom. */
  sablonok: Record<string, string>;
}

/**
 * Az alak-ellenőrzés itt is lefut, nem csak a tároló betöltésénél: egy sérült
 * demó-állapot exportáláskor bukjon hangosan, amikor a doki még javíthat a
 * demóban, ne egy friss gépen az importnál.
 */
export async function adatExportOsszeallitasa(storage: PlanStorage, keszult: Date): Promise<AdatExport> {
  const arlista = await storage.loadPriceList();
  assertPriceListShape(arlista);
  const beallitasok = await storage.loadSettings();
  assertSettingsShape(beallitasok);
  const sablonok: Record<string, string> = {};
  for (const fajlnev of await storage.listTemplates()) {
    sablonok[fajlnev] = await storage.loadTemplate(fajlnev);
  }
  return {
    formatum: ADAT_EXPORT_FORMATUM,
    schemaVersion: ADAT_EXPORT_SEMA,
    keszult: keszult.toISOString(),
    arlista,
    beallitasok,
    sablonok,
  };
}

export function adatExportFajlnev(napIso: string): string {
  return `kezelesi-terv-export-${napIso}.json`;
}

/**
 * Az import saját üzenete: az alatta dobott hibák szövege a demóra (`parseJson`) vagy a
 * másik gép újabb appjára (az IPC sémahiba-kiegészítése) utalna, ami itt félrevezető.
 */
export class AdatImportError extends Error {
  constructor(uzenet: string) {
    super(uzenet);
    this.name = 'AdatImportError';
  }
}

// A kulcs a main oldalon fájlnévvé válik a `sablonok/` alatt: út-elválasztó és `..` nem fér bele.
const SABLON_FAJLNEV = /^([a-z0-9]+(?:-[a-z0-9]+)*)-v([1-9]\d*)\.md$/;

/** A sablonfájl alapneve (`garancia-hu-v2.md` → `garancia-hu`), vagy `null`, ha a név nem ilyen. */
export function sablonBase(fajlnev: string): string | null {
  return SABLON_FAJLNEV.exec(fajlnev)?.[1] ?? null;
}

/**
 * Alapnév → az export legmagasabb `-vN` fájlja. Az app egy alapnévből mindig a legmagasabb
 * sorszámút olvassa, ezért az egyesítés alapnév szerint megy, nem fájlnév szerint.
 */
export function exportLegfrissebbSablonjai(sablonok: Record<string, string>): Map<string, string> {
  const legfrissebb = new Map<string, { fajlnev: string; v: number }>();
  for (const fajlnev of Object.keys(sablonok)) {
    const m = SABLON_FAJLNEV.exec(fajlnev);
    if (!m) continue;
    const v = Number(m[2]);
    const eddigi = legfrissebb.get(m[1]);
    if (!eddigi || v > eddigi.v) legfrissebb.set(m[1], { fajlnev, v });
  }
  return new Map([...legfrissebb].map(([base, { fajlnev }]) => [base, fajlnev]));
}

const nemExport = 'A fájl nem a demóból exportált adatfájl (kezelesi-terv-export-….json).';

/**
 * A demó-export ellenőrzése, írás előtt, a fájl minden részére: bármelyik bukásánál semmi nem
 * íródik. Sorrend: JSON → formátum → az export sémaverziója → árlista → beállítások → sablonok.
 */
export function adatImportEllenoriz(raw: string): AdatExport {
  let adat: unknown;
  try {
    adat = parseJson<unknown>(raw, 'export');
  } catch {
    throw new AdatImportError('A fájl nem olvasható: nem a demóból exportált fájl, vagy sérült.');
  }
  if (adat == null || typeof adat !== 'object' || Array.isArray(adat)) {
    throw new AdatImportError(nemExport);
  }
  const e = adat as Record<string, unknown>;
  if (e.formatum !== ADAT_EXPORT_FORMATUM) throw new AdatImportError(nemExport);
  if (typeof e.schemaVersion !== 'number' || !Number.isInteger(e.schemaVersion) || e.schemaVersion < 1) {
    throw new AdatImportError(nemExport);
  }
  if (e.schemaVersion > ADAT_EXPORT_SEMA) {
    throw new AdatImportError(
      `Az exportot az alkalmazás egy újabb verziója készítette (formátumverzió: ${e.schemaVersion}, ez az alkalmazás legfeljebb ${ADAT_EXPORT_SEMA}-et ismer). Frissítsd az asztali alkalmazást, és próbáld újra.`,
    );
  }
  reszEllenoriz(() => {
    assertKnownSchemaVersion(e.arlista as { schemaVersion?: number } | null, 'arlista.json');
    assertPriceListShape(e.arlista, 'arlista.json');
  });
  reszEllenoriz(() => {
    assertKnownSchemaVersion(e.beallitasok as { schemaVersion?: number } | null, 'beallitasok.json');
    assertSettingsShape(e.beallitasok, 'beallitasok.json');
  });
  const sablonok = e.sablonok;
  if (sablonok == null || typeof sablonok !== 'object' || Array.isArray(sablonok)) {
    throw new AdatImportError('Az export nem tölthető be: hiányoznak belőle a nyomtatvány-szövegek.');
  }
  for (const [kulcs, ertek] of Object.entries(sablonok)) {
    if (!SABLON_FAJLNEV.test(kulcs)) {
      throw new AdatImportError(`Az export nem tölthető be: „${kulcs}” nem nyomtatvány-szöveg fájlneve.`);
    }
    if (typeof ertek !== 'string') {
      throw new AdatImportError(`Az export nem tölthető be: a(z) „${kulcs}” tartalma nem szöveg.`);
    }
  }
  return {
    formatum: ADAT_EXPORT_FORMATUM,
    schemaVersion: ADAT_EXPORT_SEMA,
    keszult: typeof e.keszult === 'string' ? e.keszult : '',
    arlista: e.arlista as PriceList,
    beallitasok: e.beallitasok as Settings,
    sablonok: sablonok as Record<string, string>,
  };
}

function reszEllenoriz(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    throw new AdatImportError(`Az export nem tölthető be. ${err instanceof Error ? err.message : String(err)}`);
  }
}
