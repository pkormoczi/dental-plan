// A `PlanStorage` IPC-szerződése a renderer és a main között (migrációs terv §3.3): az IPC-n
// nem kivétel, hanem diszkriminált unió utazik, mert az Electron a hibákból csak az üzenetet
// vinné át -- a dialógusoknak a hibakód és a payload kell. DOM-mentes modul: a main, a preload
// és a renderer is importálja.

import { CURRENT_SCHEMA_VERSION, SchemaVersionError } from '../domain/schema';
import { VersionConflictError, type LetezoVerzio } from './paths';
import type { PlanRef } from '../domain/types';
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
  'listUtkozesek',
] as const satisfies readonly (keyof PlanStorage)[];

export type TaroloMetodus = (typeof TAROLO_METODUSOK)[number];

export const taroloCsatorna = (metodus: TaroloMetodus) => `storage:${metodus}`;
/** Szinkron lekérdezés a preload betöltésekor: az adatmappa állapota, vagy `null` a demó-tárolón. */
export const ADATMAPPA_ALLAPOT_CSATORNA = 'adatmappa:allapot';
/** Natív mappaválasztó; a választott mappát a main jegyzi meg, a renderer útvonalat nem küld. */
export const ADATMAPPA_VALASZT_CSATORNA = 'adatmappa:valaszt';
export const ADATMAPPA_UJRA_CSATORNA = 'adatmappa:ujra';
export const ADATMAPPA_POTOL_CSATORNA = 'adatmappa:potol';
export const ADATMAPPA_HASZNAL_CSATORNA = 'adatmappa:hasznal';
export const ADATMAPPA_MEGNYIT_CSATORNA = 'adatmappa:megnyit';
export const ALAPSABLONOK_POTOL_CSATORNA = 'adatmappa:alapsablonok';
/** Biztonsági mentés ZIP-be natív mentés-dialógussal (migrációs terv §6.5). */
export const MENTES_KESZIT_CSATORNA = 'mentes:keszit';
export const MENTES_ALLAPOT_CSATORNA = 'mentes:allapot';
/** Main → renderer: a bezárás előtt a záró képernyő (migrációs terv §6.4). */
export const ZARAS_CSATORNA = 'app:zaras';
export const KILEPES_CSATORNA = 'app:kilepes';
/** Egy gyökérmappán belüli elem megmutatása a rendszer fájlkezelőjében. */
export const MEGMUTAT_CSATORNA = 'shell:megmutat';
/** Egy mentett verzió PDF-je a rendszer PDF-olvasójában. */
export const PDF_MEGNYIT_CSATORNA = 'pdf:megnyit';
/** PDF kimásolása natív mentés-dialógussal (migrációs terv §5.3). */
export const PDF_MASOL_CSATORNA = 'pdf:masol';
/** A diagnosztikai napló mappája a rendszer fájlkezelőjében (migrációs terv §5.2). */
export const NAPLO_MEGMUTAT_CSATORNA = 'naplo:megmutat';

/**
 * Egy mappa vizsgálata, írás nélkül: `rendben` a miénk, `ures`-be új adatmappa építhető,
 * `hianyos`-ból hiányzik egy saját elem, `idegen` más tartalmú, `elerhetetlen` nem olvasható.
 */
export type MappaAllapot = 'rendben' | 'ures' | 'hianyos' | 'idegen' | 'elerhetetlen';

export interface MappaVizsgalat {
  ut: string;
  allapot: MappaAllapot;
  /** `hianyos`-nál a hiányzó saját elemek. */
  hianyzik: string[];
  /** `elerhetetlen`-nél a hiba fajtája. */
  errno?: IoErrno;
  /** A Windows 260 karakteres útvonalkorlátjához közeli gyökér. */
  hosszuUtvonal: boolean;
}

/** Az utolsó biztonsági mentés; a gépazonosító a mainben marad, a renderer csak az egyezést kapja. */
export interface MentesAllapot {
  /** ISO időbélyeg, vagy `null`, ha még nem készült (vagy az index olvashatatlan). */
  utolso: string | null;
  ezenAGepen: boolean;
}

/** A telepített app adatmappája; `nincs` = még nem választott (első indítás). */
export type AdatmappaAllapot = { allapot: 'nincs' } | MappaVizsgalat;

/** A „Másolás máshová” forrása: egy mentett verzió, vagy a még nem mentett piszkozat bájtjai. */
export type PdfForras = { ref: PlanRef } | { bajtok: Uint8Array };

export type StorageHiba =
  | {
      kod: 'VERZIO_UTKOZES';
      versionDir: string;
      /** A meglévő verzió adatai; hiányos meglévő verziónál `null`. */
      letezo: LetezoVerzio | null;
    }
  | { kod: 'FELULIRAS_UTKOZES'; fajl: string; lemezenLevo: unknown }
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
  /** Az adatmappa állapota a renderer betöltésekor; `null`, ha a renderer a demó-tárolón fut. */
  adatmappa: AdatmappaAllapot | null;
  hiv(metodus: TaroloMetodus, ...args: unknown[]): Promise<IpcEredmeny<unknown>>;
  /** A gyökérhez relatív útvonalú elem kijelölve a rendszer fájlkezelőjében. */
  megmutat(relUtvonal: string): Promise<IpcEredmeny<void>>;
  pdfMegnyit(ref: PlanRef): Promise<IpcEredmeny<void>>;
  /** A célt a main kérdezi meg a dokitól; a választott fájl neve, vagy `null`, ha bezárta. */
  pdfMasol(forras: PdfForras, javasoltNev: string): Promise<IpcEredmeny<string | null>>;
  naploMegmutat(): Promise<IpcEredmeny<void>>;
  /** `null`, ha a doki bezárta a dialógust. */
  adatmappaValaszt(): Promise<IpcEredmeny<MappaVizsgalat | null>>;
  /** A vizsgált (induláskor a beállított) mappa újbóli vizsgálata, írás nélkül. */
  adatmappaUjra(): Promise<IpcEredmeny<AdatmappaAllapot>>;
  /** Hiányos vizsgált mappában a hiányzó alapfájlok; a meglévőkhöz nem nyúl. */
  adatmappaPotol(): Promise<IpcEredmeny<MappaVizsgalat>>;
  /**
   * A vizsgált mappa lesz az adatmappa, ha `rendben`; üresbe csak `letrehoz`-zal épül új. Más
   * állapotnál nem vált, a vizsgálatot adja.
   */
  adatmappaHasznal(letrehoz: boolean): Promise<IpcEredmeny<MappaVizsgalat>>;
  adatmappaMegnyit(): Promise<IpcEredmeny<void>>;
  /** A beírt alapsablonok neve. */
  alapsablonokPotol(): Promise<IpcEredmeny<string[]>>;
  mentesAllapot(): Promise<IpcEredmeny<MentesAllapot>>;
  /** A célt a main kérdezi meg a dokitól; a mentett fájl neve, vagy `null`, ha bezárta. */
  mentesKeszit(): Promise<IpcEredmeny<string | null>>;
  /** A main a bezárás előtt a záró képernyőt kéri; a visszaadott függvény leiratkozik. */
  zarasra(fn: () => void): () => void;
  kilepes(): Promise<IpcEredmeny<void>>;
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
    return { kod: 'FELULIRAS_UTKOZES', fajl: err.fajl, lemezenLevo: err.lemezenLevo };
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
      return new FelulirasUtkozesError(h.fajl, h.lemezenLevo);
    case 'TORLES_AKADALY':
      return new TorlesAkadalyError(h.ok);
    case 'IO':
      return new IoError(h.errno, h.utvonal);
    case 'SERULT_JSON':
      return new SerultJsonError(h.fajl, h.uzenet);
    case 'SEMA_VERZIO': {
      // A telepített appban egy újabb sémájú fájl szinte mindig a másik gép frissebb appjától
      // jön (kézi frissítés, migrációs terv §12); a demóban nincs másik gép, ott ez nem kell.
      const hiba = new SchemaVersionError(h.fajl, h.talalt);
      hiba.message += ' Valószínűleg a másik gépen újabb az alkalmazás.';
      return hiba;
    }
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
