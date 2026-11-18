// A `PlanStorage` IPC-szerződése a renderer és a main között (migrációs terv §3.3): az IPC-n
// nem kivétel, hanem diszkriminált unió utazik, mert az Electron a hibákból csak az üzenetet
// vinné át -- a dialógusoknak a hibakód és a payload kell. DOM-mentes modul: a main, a preload
// és a renderer is importálja.

import { CURRENT_SCHEMA_VERSION, SchemaVersionError } from '../domain/schema';
import { VersionConflictError, type LetezoVerzio } from './paths';
import type { PlanStorage } from './PlanStorage';
import {
  ErvenytelenParameterError,
  FelulirasUtkozesError,
  HianyosMappaError,
  HianyosVerzioError,
  IdegenMappaError,
  IoError,
  SerultJsonError,
  TiltottKuldoError,
  TorlesAkadalyError,
  type IoErrno,
} from './taroloHibak';

export const TAROLO_METODUSOK = [
  'init',
  'listPatients',
  'listPlans',
  'listVersions',
  'loadPlan',
  'loadPlanPdf',
  'savePlan',
  'savePlanLabel',
  'savePlanErvenytelenites',
  'loadPriceList',
  'savePriceList',
  'loadSettings',
  'saveSettings',
  'loadTemplate',
  'listTemplates',
  'loadLatestTemplateByBase',
  'saveTemplate',
  'loadPatientData',
  'savePatientData',
  'createPatient',
  'deletePatient',
] as const satisfies readonly (keyof PlanStorage)[];

export type TaroloMetodus = (typeof TAROLO_METODUSOK)[number];

export const taroloCsatorna = (metodus: TaroloMetodus) => `storage:${metodus}`;
/** Szinkron lekérdezés a preload betöltésekor: fut-e a main-oldali tároló. */
export const AKTIV_CSATORNA = 'storage:aktiv';

export type StorageHiba =
  | {
      kod: 'VERZIO_UTKOZES';
      versionDir: string;
      /** A meglévő verzió adatai; hiányos meglévő verziónál `null`. */
      letezo: LetezoVerzio | null;
    }
  | { kod: 'FELULIRAS_UTKOZES'; fajl: string; lemezenLevo: unknown; mentettMasolat: string }
  | { kod: 'TORLES_AKADALY'; ok: string }
  | { kod: 'IO'; errno: IoErrno; utvonal: string }
  | { kod: 'SERULT_JSON'; fajl: string; uzenet: string }
  | { kod: 'SEMA_VERZIO'; fajl: string; talalt: number; ismert: number }
  | { kod: 'HIANYOS_VERZIO'; versionDir: string; hianyzik: string[] }
  | { kod: 'HIANYOS_MAPPA'; hianyzik: string[] }
  | { kod: 'IDEGEN_MAPPA' }
  | { kod: 'TILTOTT_KULDO' }
  | { kod: 'ERVENYTELEN_PARAMETER'; uzenet: string }
  | { kod: 'EGYEB'; uzenet: string };

export type IpcEredmeny<T> = { ok: true; ertek: T } | { ok: false; hiba: StorageHiba };

/** A preload által a rendererbe tett híd. */
export interface TaroloHid {
  aktiv: boolean;
  hiv(metodus: TaroloMetodus, ...args: unknown[]): Promise<IpcEredmeny<unknown>>;
}

declare global {
  interface Window {
    mandokiTarolo?: TaroloHid;
  }
}

/** Main oldal: egy elkapott hibából a szerializálható hibaeredmény. */
export function hibaBolStorageHiba(err: unknown): StorageHiba {
  if (err instanceof VersionConflictError) return { kod: 'VERZIO_UTKOZES', versionDir: err.dirName, letezo: err.letezo };
  if (err instanceof FelulirasUtkozesError) {
    return { kod: 'FELULIRAS_UTKOZES', fajl: err.fajl, lemezenLevo: err.lemezenLevo, mentettMasolat: err.mentettMasolat };
  }
  if (err instanceof TorlesAkadalyError) return { kod: 'TORLES_AKADALY', ok: err.ok };
  if (err instanceof IoError) return { kod: 'IO', errno: err.errno, utvonal: err.utvonal };
  if (err instanceof SerultJsonError) return { kod: 'SERULT_JSON', fajl: err.fajl, uzenet: err.message };
  if (err instanceof SchemaVersionError) {
    return { kod: 'SEMA_VERZIO', fajl: err.fileKind, talalt: err.foundVersion, ismert: CURRENT_SCHEMA_VERSION };
  }
  if (err instanceof HianyosVerzioError) return { kod: 'HIANYOS_VERZIO', versionDir: err.versionDir, hianyzik: err.hianyzik };
  if (err instanceof HianyosMappaError) return { kod: 'HIANYOS_MAPPA', hianyzik: err.hianyzik };
  if (err instanceof IdegenMappaError) return { kod: 'IDEGEN_MAPPA' };
  if (err instanceof TiltottKuldoError) return { kod: 'TILTOTT_KULDO' };
  if (err instanceof ErvenytelenParameterError) return { kod: 'ERVENYTELEN_PARAMETER', uzenet: err.message };
  return { kod: 'EGYEB', uzenet: err instanceof Error ? err.message : String(err) };
}

/** Renderer oldal: a hibaeredményből ugyanaz a hibaosztály, amit a `PlanStorage` szerződés ígér. */
export function storageHibaBolHiba(h: StorageHiba): Error {
  switch (h.kod) {
    case 'VERZIO_UTKOZES':
      return new VersionConflictError(h.versionDir, h.letezo);
    case 'FELULIRAS_UTKOZES':
      return new FelulirasUtkozesError(h.fajl, h.lemezenLevo, h.mentettMasolat);
    case 'TORLES_AKADALY':
      return new TorlesAkadalyError(h.ok);
    case 'IO':
      return new IoError(h.errno, h.utvonal);
    case 'SERULT_JSON':
      return new SerultJsonError(h.fajl, h.uzenet);
    case 'SEMA_VERZIO':
      return new SchemaVersionError(h.fajl, h.talalt);
    case 'HIANYOS_VERZIO':
      return new HianyosVerzioError(h.versionDir, h.hianyzik);
    case 'HIANYOS_MAPPA':
      return new HianyosMappaError(h.hianyzik);
    case 'IDEGEN_MAPPA':
      return new IdegenMappaError();
    case 'TILTOTT_KULDO':
      return new TiltottKuldoError();
    case 'ERVENYTELEN_PARAMETER': {
      const hiba = new ErvenytelenParameterError('');
      hiba.message = h.uzenet;
      return hiba;
    }
    case 'EGYEB':
      return new Error(h.uzenet);
  }
}
