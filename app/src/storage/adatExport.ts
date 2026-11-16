// A demóból az asztali alkalmazásba vitt egyszeri átvitel fájlformátuma. Az
// asztali app importja erre épül, ezért DOM-mentes, és csak a PlanStorage
// szerződésén át olvas. Páciens- és tervadat szándékosan nincs benne: a demó
// páciensei fiktívek, egy éles adatmappába csak törlendő szemetet vinnének.

import { assertPriceListShape, assertSettingsShape } from '../domain/validate';
import type { PriceList, Settings } from '../domain/types';
import type { PlanStorage } from './PlanStorage';

export const ADAT_EXPORT_FORMATUM = 'dental-plan-export';

export interface AdatExport {
  formatum: typeof ADAT_EXPORT_FORMATUM;
  schemaVersion: 1;
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
    schemaVersion: 1,
    keszult: keszult.toISOString(),
    arlista,
    beallitasok,
    sablonok,
  };
}

export function adatExportFajlnev(napIso: string): string {
  return `kezelesi-terv-export-${napIso}.json`;
}
