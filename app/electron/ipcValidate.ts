// A tároló-csatornák bemenetének futásidejű ellenőrzése a main oldalon (migrációs terv §3.2):
// a renderer kompromittálódása se adhasson szabad fájlrendszer-hozzáférést, ezért minden
// paraméter a szerződés szerinti alakra szűkül, mielőtt a storage-hoz érne.

import {
  assertPatientMasterDataShape,
  assertPlanShape,
  assertPriceListShape,
  assertSettingsShape,
} from '../src/domain/validate';
import { parsePatientDirName, parsePlanDirName, parseVersionDirName } from '../src/storage/paths';
import { ErvenytelenParameterError } from '../src/storage/taroloHibak';
import type { TaroloMetodus } from '../src/storage/taroloIpc';

export const PDF_MAX_BAJT = 20 * 1024 * 1024;
const SZOVEG_MAX = 1_000_000;

const hiba = (mit: string) => new ErvenytelenParameterError(mit);

function szoveg(x: unknown, mit: string, max = SZOVEG_MAX): string {
  if (typeof x !== 'string' || x.length > max) throw hiba(mit);
  return x;
}

/** Egyetlen útvonalelem: elválasztó, `.`/`..` és vezérlőkarakter nélkül. */
function egyElem(x: unknown, mit: string): string {
  // eslint-disable-next-line no-control-regex
  if (typeof x !== 'string' || !x || x === '.' || x === '..' || x.length > 255 || /[\\/\u0000-\u001f]/.test(x)) {
    throw hiba(mit);
  }
  return x;
}

const patientDir = (x: unknown) => {
  const s = egyElem(x, 'patientDir');
  if (!parsePatientDirName(s)) throw hiba('patientDir');
  return s;
};
const planDir = (x: unknown) => {
  const s = egyElem(x, 'planDir');
  if (!parsePlanDirName(s)) throw hiba('planDir');
  return s;
};
const versionDir = (x: unknown) => {
  const s = egyElem(x, 'versionDir');
  if (!parseVersionDirName(s)) throw hiba('versionDir');
  return s;
};
const sablonNev = (x: unknown) => {
  const s = egyElem(x, 'sablonnév');
  if (!/^[\p{L}\p{N}._-]+$/u.test(s)) throw hiba('sablonnév');
  return s;
};

function planRef(x: unknown) {
  if (!x || typeof x !== 'object') throw hiba('PlanRef');
  const r = x as Record<string, unknown>;
  return { patientDir: patientDir(r.patientDir), planDir: planDir(r.planDir), versionDir: versionDir(r.versionDir) };
}

function alak(ellenor: (data: unknown) => void, x: unknown, mit: string): unknown {
  try {
    ellenor(x);
  } catch {
    throw hiba(mit);
  }
  return x;
}

function pdf(x: unknown): Uint8Array {
  if (!(x instanceof Uint8Array)) throw hiba('PDF');
  if (x.byteLength > PDF_MAX_BAJT) throw hiba('PDF mérete');
  return x;
}

function kezdoAdatok(x: unknown) {
  if (x === undefined) return undefined;
  if (!x || typeof x !== 'object') throw hiba('kezdőadatok');
  const r = x as Record<string, unknown>;
  return {
    ...(r.szuletesiIdo !== undefined ? { szuletesiIdo: szoveg(r.szuletesiIdo, 'születési idő', 100) } : {}),
    ...(r.telefon !== undefined ? { telefon: szoveg(r.telefon, 'telefon', 100) } : {}),
  };
}

function felulirasOpciok(x: unknown) {
  if (x === undefined) return undefined;
  if (!x || typeof x !== 'object') throw hiba('felülírás-opció');
  const felulir = (x as Record<string, unknown>).felulir;
  if (felulir !== undefined && typeof felulir !== 'boolean') throw hiba('felülírás-opció');
  return felulir === undefined ? {} : { felulir };
}

/** Gyökérhez relatív útvonal: `/`-sel tagolt, elemenként `egyElem`-szabályú, abszolút út és `..` nélkül. */
export function gyokerRelativUtvonal(x: unknown): string {
  if (typeof x !== 'string' || !x || x.length > 1000) throw hiba('útvonal');
  for (const elem of x.split('/')) egyElem(elem, 'útvonal');
  return x;
}

function nincsArgumentum(args: unknown[]): unknown[] {
  if (args.length) throw hiba('fölösleges paraméter');
  return [];
}

/** A metódus paraméterei a szerződés szerinti alakban; eltérésnél `ErvenytelenParameterError`. */
export function ervenyesArgumentumok(metodus: TaroloMetodus, args: unknown[]): unknown[] {
  switch (metodus) {
    case 'init':
    case 'listPatients':
    case 'loadPriceList':
    case 'loadSettings':
    case 'listTemplates':
    case 'listUtkozesek':
      return nincsArgumentum(args);
    case 'listPlans':
    case 'loadPatientData':
    case 'deletePatient':
      return [patientDir(args[0])];
    case 'listVersions':
      return [patientDir(args[0]), planDir(args[1])];
    case 'loadPlan':
    case 'loadPlanPdf':
      return [planRef(args[0])];
    case 'savePlan':
      return [
        alak(assertPlanShape, args[0], 'terv'),
        pdf(args[1]),
        args[2] === undefined ? undefined : szoveg(args[2], 'láncnév', 500),
      ];
    case 'savePlanLabel':
      return [patientDir(args[0]), planDir(args[1]), szoveg(args[2], 'tervcím', 500)];
    case 'savePlanErvenytelenites':
      return [patientDir(args[0]), planDir(args[1]), versionDir(args[2]), szoveg(args[3], 'indok', 2000)];
    case 'savePriceList':
      return [alak(assertPriceListShape, args[0], 'árlista'), felulirasOpciok(args[1])];
    case 'saveSettings':
      return [alak(assertSettingsShape, args[0], 'beállítások'), felulirasOpciok(args[1])];
    case 'loadTemplate':
    case 'loadLatestTemplateByBase':
      return [sablonNev(args[0])];
    case 'saveTemplate':
      return [sablonNev(args[0]), szoveg(args[1], 'sablonszöveg'), felulirasOpciok(args[2])];
    case 'savePatientData':
      return [
        patientDir(args[0]),
        alak(assertPatientMasterDataShape, args[1], 'törzsadat'),
        felulirasOpciok(args[2]),
      ];
    case 'createPatient': {
      const nev = szoveg(args[0], 'név', 200);
      if (!nev.trim()) throw hiba('név');
      return [nev, kezdoAdatok(args[1])];
    }
  }
}
