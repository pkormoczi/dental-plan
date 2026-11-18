// A `PlanStorage` szerződés közös magja: egy szemantika fut a demóban (localStorage), a
// tesztekben (memória) és a telepített appban (gyökérmappa) -- csak a fájlprimitívek
// különböznek. DOM-mentes modul: a main process is importálja (migrációs terv §9.1).

import { megjelenitettTervCim } from '../domain/tervCim';
import { paciensIndexNev, uresTorzsadat } from '../domain/paciensAdatok';
import { ervenyesAktivitas, ujAktivitas } from '../domain/paciensAktivitas';
import { assertKnownSchemaVersion } from '../domain/schema';
import {
  assertPatientMasterDataShape,
  assertPlanShape,
  assertPriceListShape,
  assertSettingsShape,
} from '../domain/validate';
import type {
  Paciens,
  PatientFolder,
  PatientMasterData,
  PatientRecord,
  Plan,
  PlanFolder,
  PlanInvalidations,
  PlanLabel,
  PlanRef,
  PlanVersion,
  PriceList,
  Settings,
} from '../domain/types';
import { MarLetezikError, utvonal, type FajlPrimitivek } from './fajlPrimitivek';
import { parseJson } from './json';
import type { FelulirasOpciok, MentettVerzio, PlanStorage } from './PlanStorage';
import { sha256Hex } from './sha256';
import { FelulirasUtkozesError, HianyosVerzioError } from './taroloHibak';
import {
  assertVersionDirAvailable,
  buildPatientDirName,
  buildPlanDirName,
  buildUtkozesMasolatNev,
  buildVersionDirName,
  generateId,
  nextVersionNumber,
  parsePatientDirName,
  parsePlanDirName,
  parseVersionDirName,
  VersionConflictError,
  type LetezoVerzio,
} from './paths';
import { seedPriceList } from './seed/priceList';
import { seedSettings } from './seed/settings';
import {
  FIZETESI_FELTETELEK_DE_V1,
  FIZETESI_FELTETELEK_HU_V1,
  GARANCIA_DE_V1,
  GARANCIA_HU_V1,
  NYILATKOZAT_DE_V1,
  NYILATKOZAT_HU_V1,
} from './seed/templates';

export const ARLISTA_FAJL = 'arlista.json';
export const BEALLITASOK_FAJL = 'beallitasok.json';
export const PACIENSEK_MAPPA = 'paciensek';
export const SABLONOK_MAPPA = 'sablonok';
export const MANIFEST_FAJL = 'manifest.json';
/** Az ütközésben felülírt változatok helye; az app nem törli, a doki takarít. */
export const UTKOZESEK_MAPPA = '_utkozesek';
const TERV_FAJL = 'terv.json';
const MANIFEST_SEMA = 1;

/** A verziómappa utoljára írt fájlja: amíg nincs meg és nem egyezik, a verzió hiányos. */
interface VerzioManifest {
  schemaVersion: number;
  mentesId: string;
  keszult: string;
  fajlok: Record<string, { sha256: string; meret: number }>;
}

/** Alapértelmezett sablonfájlok: egy friss gyökérbe ezek kerülnek. */
export const DEFAULT_TEMPLATES: Array<[string, string]> = [
  ['nyilatkozat-hu-v1.md', NYILATKOZAT_HU_V1],
  ['fizetesi-feltetelek-hu-v1.md', FIZETESI_FELTETELEK_HU_V1],
  ['garancia-hu-v1.md', GARANCIA_HU_V1],
  ['nyilatkozat-de-v1.md', NYILATKOZAT_DE_V1],
  ['fizetesi-feltetelek-de-v1.md', FIZETESI_FELTETELEK_DE_V1],
  ['garancia-de-v1.md', GARANCIA_DE_V1],
];

/**
 * A páciens-mappa gyökerén élő fájlok neve -- a `listPlans` ezekkel szűri
 * ki a terv-mappák közül (különben egy új gyökér-fájl hamis terv-láncként
 * jelenne meg).
 */
const PATIENT_ROOT_FILES = new Set(['paciens.json', 'paciens-adatok.json']);

/**
 * A terv-mappa gyökerén élő fájlok neve -- a `listVersions` ezekkel szűri ki
 * a verziómappák közül, a `PATIENT_ROOT_FILES` párjaként (különben egy új
 * gyökér-fájl hamis verzióként jelenne meg).
 */
const PLAN_ROOT_FILES = new Set(['terv-cimke.json', 'terv-ervenytelenitesek.json']);

const pacUt = (patientDir: string) => utvonal(PACIENSEK_MAPPA, patientDir);
const pacRekordUt = (patientDir: string) => utvonal(pacUt(patientDir), 'paciens.json');
const pacAdatUt = (patientDir: string) => utvonal(pacUt(patientDir), 'paciens-adatok.json');
const tervMappaUt = (patientDir: string, planDir: string) => utvonal(pacUt(patientDir), planDir);
const cimkeUt = (patientDir: string, planDir: string) =>
  utvonal(tervMappaUt(patientDir, planDir), 'terv-cimke.json');
const ervenytelenitesUt = (patientDir: string, planDir: string) =>
  utvonal(tervMappaUt(patientDir, planDir), 'terv-ervenytelenitesek.json');
const tervUt = (patientDir: string, planDir: string, versionDir: string) =>
  utvonal(tervMappaUt(patientDir, planDir), versionDir, TERV_FAJL);
const sablonUt = (fileName: string) => utvonal(SABLONOK_MAPPA, fileName);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Az árlista, a beállítások és az alapsablonok egy friss gyökérbe, páciens nélkül. */
export async function alapKeszletetIr(prim: FajlPrimitivek): Promise<void> {
  await prim.irSzoveg(ARLISTA_FAJL, JSON.stringify(seedPriceList));
  await prim.irSzoveg(BEALLITASOK_FAJL, JSON.stringify(seedSettings));
  for (const [name, body] of DEFAULT_TEMPLATES) await prim.irSzoveg(sablonUt(name), body);
}

async function ujManifest(tervJson: string, pdfFajlnev: string, pdf: Uint8Array): Promise<VerzioManifest> {
  return {
    schemaVersion: MANIFEST_SEMA,
    mentesId: globalThis.crypto.randomUUID(),
    keszult: new Date().toISOString(),
    fajlok: {
      [TERV_FAJL]: { sha256: await sha256Hex(tervJson), meret: new TextEncoder().encode(tervJson).length },
      [pdfFajlnev]: { sha256: await sha256Hex(pdf), meret: pdf.length },
    },
  };
}

export interface FajlTaroloOpciok {
  /** A verziómappa PDF-fájljának neve. */
  pdfFajlnev: string;
  /** A sikertelen `savePlan` üzenete -- a tároló-specifikus teendővel. */
  mentesHibaUzenet: string;
  /**
   * Verziómappa manifesttel és teljesség-ellenőrzéssel. A két gép között szinkronizált
   * gyökérmappán kell, ahol a JSON és a PDF nem egyszerre érkezik (migrációs terv §4.3); a
   * demóban nincs, ott minden verzió teljes.
   */
  verzioManifest?: boolean;
  /**
   * Ütközésőr a felülírt system-of-record fájlokon: betöltéskor a tartalom hash-e megjegyezve,
   * mentés előtt újraolvasva (migrációs terv §4.6). A demóban nincs, ott egy gép ír.
   */
  utkozesOr?: boolean;
}

export class FajlTarolo implements PlanStorage {
  protected readonly prim: FajlPrimitivek;
  private readonly opciok: FajlTaroloOpciok;

  constructor(prim: FajlPrimitivek, opciok: FajlTaroloOpciok) {
    this.prim = prim;
    this.opciok = opciok;
  }

  /**
   * Minden író (`savePlan`, `savePriceList`, `saveSettings`) EGYETLEN
   * közös láncba fut be -- két egymást gyorsan követő hívás (pl. dupla
   * kattintás, vagy egy admin-mezőn gyors egymás utáni szerkesztés)
   * enélkül egymással versenyezve írna, és fordított sorrendben landolhatna
   * (`savePlan`-nál ráadásul ugyanazt a verziószámot is kiszámolhatná,
   * és egy már meglévő verziómappa íródna felül -- tervet soha
   * nem írunk felül). A lánc mindig `undefined`-re fut ki, sikeres
   * vagy hibás hívás után is, hogy egy korábbi hiba ne akassza meg a
   * rákövetkező mentéseket. A localStorage-on a `setItem` szinkron, ott a
   * lánc önmagában no-op; fájlrendszeren egy nem atomi írás csonka tartalmat
   * is okozhatna, nem csak fordított sorrendet.
   */
  private savingChain: Promise<unknown> = Promise.resolve();

  /**
   * A már teljesnek látott verziómappák, a manifest szövegével és a fájlméretekkel kulcsolva.
   * A verziómappa append-only, így egy teljes verzió nem romlik el; enélkül minden lánc-nézés
   * minden PDF-et újra hash-elne. Hiányos verzió sosem kerül ide: az mindig újraellenőrződik.
   */
  private readonly teljesVerziok = new Map<string, string>();

  /**
   * Fájlonként a tartalom hash-e, ahogy ez a példány utoljára látta (betöltötte vagy írta). Nem
   * `mtime`: a Drive a módosítási időt nem őrzi megbízhatóan, a tartalmat igen.
   */
  private readonly ismertHash = new Map<string, string>();

  private async megjegyez(ut: string, tartalom: string): Promise<void> {
    if (this.opciok.utkozesOr) this.ismertHash.set(ut, await sha256Hex(tartalom));
  }

  /**
   * Írás előtt: ha a fájl azóta a lemezen megváltozott, dob, és semmi nem íródik -- `felulir`-nál
   * a lemezen lévőt előbb az `_utkozesek/` alá menti. Egy általunk még nem látott, de létező fájl
   * is ütközés: a másik gép közben létrehozhatta.
   */
  private async utkozesOr(ut: string, opciok: FelulirasOpciok | undefined, ertelmez: (raw: string) => unknown): Promise<void> {
    if (!this.opciok.utkozesOr) return;
    const raw = await this.prim.olvasSzoveg(ut);
    if (raw == null || this.ismertHash.get(ut) === (await sha256Hex(raw))) return;
    if (!opciok?.felulir) {
      let lemezenLevo: unknown = null;
      try {
        lemezenLevo = ertelmez(raw);
      } catch {
        lemezenLevo = null;
      }
      throw new FelulirasUtkozesError(ut, lemezenLevo);
    }
    await this.prim.irSzoveg(utvonal(UTKOZESEK_MAPPA, buildUtkozesMasolatNev(ut, new Date())), raw);
  }

  /** Ütközésőrrel ír, és a frissen írt tartalmat jegyzi meg ismertként. */
  private async orzottIr(
    ut: string,
    tartalom: string,
    opciok: FelulirasOpciok | undefined,
    ertelmez: (raw: string) => unknown,
  ): Promise<void> {
    await this.utkozesOr(ut, opciok, ertelmez);
    await this.prim.irSzoveg(ut, tartalom);
    await this.megjegyez(ut, tartalom);
  }

  /** A `savingChain`-re fűz egy írást -- lásd a mező doc-kommentjét. */
  protected enqueue<T>(run: () => Promise<T>): Promise<T> {
    const result = this.savingChain.then(run, run);
    this.savingChain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async init(): Promise<void> {}

  /**
   * Új páciensmappa neve friss azonosítóval. NTFS és APFS alapból kis-/nagybetű-érzéketlen, és
   * egy Drive-ról érkezett név NFD-alakú is lehet: egy csak ezekben eltérő név ugyanabba a
   * mappába írna, ezért ilyenkor új azonosító kell.
   */
  private async ujPaciensMappa(nev: string): Promise<{ paciensId: string; patientDir: string }> {
    const kulcs = (n: string) => n.normalize('NFC').toLocaleLowerCase('hu');
    const foglalt = new Set((await this.prim.listaz(PACIENSEK_MAPPA)).map(kulcs));
    for (;;) {
      const paciensId = generateId();
      const patientDir = buildPatientDirName(nev, paciensId);
      if (!foglalt.has(kulcs(patientDir))) return { paciensId, patientDir };
    }
  }

  /** A tervmappa-név javaslatához: sérült vagy hiányzó árlista mellett is ad nevet. */
  private async aktualisArlistaVagySeed(): Promise<PriceList> {
    const raw = await this.prim.olvasSzoveg(ARLISTA_FAJL);
    if (raw == null) return seedPriceList;
    try {
      return parseJson<PriceList>(raw, ARLISTA_FAJL);
    } catch {
      return seedPriceList;
    }
  }

  async listPatients(): Promise<PatientFolder[]> {
    const dirs = await this.prim.listaz(PACIENSEK_MAPPA);
    return Promise.all(
      dirs.map(async (dirName) => {
        const raw = await this.prim.olvasSzoveg(pacRekordUt(dirName));
        if (raw != null) {
          try {
            const record = parseJson<PatientRecord>(raw, 'paciens.json');
            return {
              dirName,
              paciensId: record.paciensId,
              nev: record.nev,
              utolsoAktivitas: ervenyesAktivitas(record.utolsoAktivitas),
            };
          } catch {
            // esik át a mappanév-visszafejtésre lent
          }
        }
        const parsed = parsePatientDirName(dirName);
        return {
          dirName,
          paciensId: parsed?.patientId ?? '',
          nev: (parsed ? `${parsed.vezeteknev} ${parsed.keresztnev}`.trim() : '') || dirName,
        };
      }),
    );
  }

  async listPlans(patientDir: string): Promise<PlanFolder[]> {
    const dirs = (await this.prim.listaz(pacUt(patientDir))).filter((d) => !PATIENT_ROOT_FILES.has(d));
    return Promise.all(
      dirs.map(async (dirName) => {
        const parsed = parsePlanDirName(dirName);
        const labelRaw = await this.prim.olvasSzoveg(cimkeUt(patientDir, dirName));
        let tervCim: string | null = null;
        if (labelRaw != null) {
          try {
            tervCim = parseJson<PlanLabel>(labelRaw, 'terv-cimke.json').tervCim;
          } catch {
            tervCim = null; // sérült terv-cimke.json -- vissza az élő auto-javaslatra
          }
        }
        return { dirName, tervId: parsed?.planId ?? '', tervCim };
      }),
    );
  }

  async listVersions(patientDir: string, planDir: string): Promise<PlanVersion[]> {
    const dirs = (await this.prim.listaz(tervMappaUt(patientDir, planDir))).filter(
      (d) => !PLAN_ROOT_FILES.has(d),
    );
    const ervenytelenitesek = await this.olvasErvenytelenitesek(patientDir, planDir);
    const versions = await Promise.all(
      dirs.map(async (dirName): Promise<PlanVersion | null> => {
        const parsed = parseVersionDirName(dirName);
        if (!parsed) return null;
        const indok = ervenytelenitesek[dirName];
        const hianyzik = await this.verzioHianyai(utvonal(tervMappaUt(patientDir, planDir), dirName));
        return {
          dirName,
          ...parsed,
          ...(indok ? { ervenytelenites: indok } : {}),
          allapot: hianyzik.length ? 'hianyos' : 'teljes',
          ...(hianyzik.length ? { hianyzik } : {}),
        };
      }),
    );
    return versions.filter((v): v is PlanVersion => v !== null).sort((a, b) => a.verzio - b.verzio);
  }

  /**
   * Mi hiányzik ahhoz, hogy a verzió teljes JSON+PDF-pár legyen; üres lista = teljes. A
   * manifest nélküli tárolón mindig üres.
   */
  private async verzioHianyai(verzioMappa: string): Promise<string[]> {
    if (!this.opciok.verzioManifest) return [];
    const fajlnevek = [TERV_FAJL, this.opciok.pdfFajlnev];
    const raw = await this.prim.olvasSzoveg(utvonal(verzioMappa, MANIFEST_FAJL));
    const meretek = await Promise.all(fajlnevek.map((nev) => this.prim.meret(utvonal(verzioMappa, nev))));
    const hianyzoFajlok = fajlnevek.filter((_, i) => meretek[i] == null);
    if (raw == null) return [MANIFEST_FAJL, ...hianyzoFajlok];
    let manifest: VerzioManifest;
    try {
      manifest = parseJson<VerzioManifest>(raw, MANIFEST_FAJL);
    } catch {
      return [`${MANIFEST_FAJL}: sérült`, ...hianyzoFajlok];
    }
    // Egy újabb appverzió manifestjét ez a verzió nem tudja igazolni -- a magasabb
    // schemaVersion itt is megtagadott betöltést jelent.
    if (typeof manifest.schemaVersion !== 'number' || manifest.schemaVersion > MANIFEST_SEMA) {
      return [`${MANIFEST_FAJL}: ismeretlen formátum`];
    }
    const kulcs = [raw, ...meretek].join('|');
    if (this.teljesVerziok.get(verzioMappa) === kulcs) return [];
    const hianyzik: string[] = [];
    for (const [i, nev] of fajlnevek.entries()) {
      const elvart = manifest.fajlok?.[nev];
      if (meretek[i] == null) {
        hianyzik.push(nev);
        continue;
      }
      const bajt = elvart && elvart.meret === meretek[i] ? await this.prim.olvasBajt(utvonal(verzioMappa, nev)) : null;
      if (!bajt || (await sha256Hex(bajt)) !== elvart?.sha256) hianyzik.push(`${nev}: eltérő tartalom`);
    }
    if (hianyzik.length === 0) this.teljesVerziok.set(verzioMappa, kulcs);
    return hianyzik;
  }

  /** Hiányos verzióra dob: annak tartalma még nem a végleges, nem nyitható meg. */
  private async teljesVerzioOr(ref: PlanRef): Promise<void> {
    const hianyzik = await this.verzioHianyai(utvonal(tervMappaUt(ref.patientDir, ref.planDir), ref.versionDir));
    if (hianyzik.length) throw new HianyosVerzioError(ref.versionDir, hianyzik);
  }

  /**
   * A lánc érvénytelenítés-sidecarja, `{}`-ként ha nincs vagy sérült -- a
   * `terv-cimke.json` olvasásának mintája (`listPlans`): egy index-fájl
   * olvashatatlansága nem viheti el az egész lánc listázását, csak a
   * jelölés marad el. A verziók `terv.json`-ja ettől függetlenül a szigorú,
   * `assertKnownSchemaVersion`-ös úton (`loadPlan`) töltődik.
   */
  private async olvasErvenytelenitesek(patientDir: string, planDir: string): Promise<Record<string, string>> {
    const raw = await this.prim.olvasSzoveg(ervenytelenitesUt(patientDir, planDir));
    if (raw == null) return {};
    try {
      const rec = parseJson<PlanInvalidations>(raw, 'terv-ervenytelenitesek.json');
      const verziok = rec.verziok;
      if (!verziok || typeof verziok !== 'object') return {};
      const tisztitott: Record<string, string> = {};
      for (const [dirName, indok] of Object.entries(verziok)) {
        if (typeof indok === 'string' && indok.trim()) tisztitott[dirName] = indok;
      }
      return tisztitott;
    } catch {
      return {};
    }
  }

  async loadPlan(ref: PlanRef): Promise<Plan> {
    const nincs = () => new Error(`Nincs terv itt: ${ref.patientDir}/${ref.planDir}/${ref.versionDir}`);
    if (!(await this.prim.letezik(utvonal(tervMappaUt(ref.patientDir, ref.planDir), ref.versionDir)))) throw nincs();
    await this.teljesVerzioOr(ref);
    const raw = await this.prim.olvasSzoveg(tervUt(ref.patientDir, ref.planDir, ref.versionDir));
    if (raw == null) throw nincs();
    const plan = parseJson<Plan>(raw, 'terv.json');
    assertKnownSchemaVersion(plan, 'terv.json');
    assertPlanShape(plan, 'terv.json');
    return plan;
  }

  async savePlanLabel(patientDir: string, planDir: string, tervCim: string): Promise<void> {
    return this.enqueue(async () => {
      const ut = cimkeUt(patientDir, planDir);
      const trimmed = tervCim.trim();
      if (!trimmed) {
        // Üres címke = vissza az élő auto-javaslatra (domain/tervCim.ts), nem
        // egy tárolt üres string.
        await this.prim.torol(ut);
        return;
      }
      const label: PlanLabel = { schemaVersion: 1, tervCim: trimmed };
      await this.prim.irSzoveg(ut, JSON.stringify(label));
    });
  }

  async savePlanErvenytelenites(
    patientDir: string,
    planDir: string,
    versionDir: string,
    indok: string,
  ): Promise<void> {
    return this.enqueue(async () => {
      const ut = ervenytelenitesUt(patientDir, planDir);
      const verziok = await this.olvasErvenytelenitesek(patientDir, planDir);
      const trimmed = indok.trim();
      if (trimmed) {
        verziok[versionDir] = trimmed;
      } else {
        delete verziok[versionDir];
      }
      if (Object.keys(verziok).length === 0) {
        // Az utolsó jelölés visszavonása a FÁJLT is elviszi -- egy üres
        // `verziok` objektum ugyanazt jelentené, csak szemétként a fában.
        await this.prim.torol(ut);
        return;
      }
      const rec: PlanInvalidations = { schemaVersion: 1, verziok };
      await this.prim.irSzoveg(ut, JSON.stringify(rec));
    });
  }

  /**
   * Mindig új verziómappát hoz létre, meglévőt sosem ír felül (aláírt
   * szerződést nem lehet visszamenőleg átírni). Ha a `plan.paciensId` egy már
   * létező páciensmappához tartozik, oda kerül az új terv/verzió;
   * egyébként új páciensmappa jön létre. Ugyanígy a `plan.tervId`-hoz
   * tartozó terv-mappa: ha létezik, oda kerül az új verzió, egyébként új
   * terv-mappa nyílik a páciensen belül. A verziószámot a storage
   * számolja ki -- a hívó nem adhat meg tetszőlegeset (ez tartja a láncot
   * append-only-ban).
   *
   * soros végrehajtás (`savingChain`) + a három írás egy
   * try/catch-ben -- ha bármelyik írás elhasal, sem a terv, sem a PDF nem
   * marad félkész állapotban (verziómappát soha nem hagyunk
   * csonkán), és két gyors egymás utáni hívás nem számolhatja ki ugyanazt a
   * verziószámot.
   */
  async savePlan(plan: Plan, pdf: Uint8Array, ujLancCim?: string): Promise<MentettVerzio> {
    return this.enqueue(() => this.doSavePlan(plan, pdf, ujLancCim));
  }

  private async doSavePlan(plan: Plan, pdf: Uint8Array, ujLancCim?: string): Promise<MentettVerzio> {
    // Írás előtt is validálunk, nem csak betöltéskor: ez a hívás adja ki a
    // véglegesített, append-only verziómappát -- egy tört pénzértékkel ide
    // beírt terv.json később csak betöltési hibaként derülne ki, amikor már
    // nem írható felül. A piszkozat-autosave szándékosan NEM validál.
    assertPlanShape(plan, 'terv.json');
    const patients = await this.listPatients();
    let paciensId = plan.paciensId;
    let patientDir = paciensId ? patients.find((p) => p.paciensId === paciensId)?.dirName : undefined;

    if (!paciensId) {
      ({ paciensId, patientDir } = await this.ujPaciensMappa(plan.paciens.nev));
    } else if (!patientDir) {
      patientDir = buildPatientDirName(plan.paciens.nev, paciensId);
    }

    let tervId = plan.tervId;
    const existingPlans = await this.listPlans(patientDir);
    let planDir = tervId ? existingPlans.find((p) => p.tervId === tervId)?.dirName : undefined;

    if (!tervId || !planDir) {
      tervId = tervId || generateId();
      const priceList = await this.aktualisArlistaVagySeed();
      planDir = buildPlanDirName(
        megjelenitettTervCim(ujLancCim?.trim() || null, plan, priceList),
        tervId,
      );
    }

    const lancMappa = tervMappaUt(patientDir, planDir);
    // Csak a nevek kellenek: a hiányos verzió is foglalja a sorszámát, a teljesség itt közömbös.
    const existingDirNames = (await this.prim.listaz(lancMappa)).filter((d) => parseVersionDirName(d));
    const verzio = nextVersionNumber(existingDirNames);
    // A kiosztás autoritása itt marad, de egy nem nulla `plan.verzio` a hívó
    // ELŐZETES foglalása (az előnézet a PDF-be már beleírta ezt a számot).
    // Eltérésnél DOBUNK, nem írunk felül némán: a néma felülírás pont azt a
    // szétcsúszást állítaná vissza, hogy a papíron más verzió áll, mint a
    // mentett terv.json-ban. A 0 a piszkozat "nincs foglalás" értéke.
    if (plan.verzio !== 0 && plan.verzio !== verzio) {
      throw new Error(
        `A nyomtatványra v${plan.verzio} került, de a lánc következő szabad verziója v${verzio} — ` +
          'a terv nem mentődött. Lépj vissza az Előnézetre, hogy friss verziószámmal készüljön el a PDF.',
      );
    }
    const versionDir = buildVersionDirName(plan.keltezes, verzio);
    assertVersionDirAvailable(existingDirNames, versionDir);

    const finalPlan: Plan = { ...plan, schemaVersion: 1, tervId, verzio, paciensId };
    const tervJson = JSON.stringify(finalPlan);
    const verzioMappa = utvonal(lancMappa, versionDir);
    const manifesttel = this.opciok.verzioManifest === true;
    // Manifesttel a verzió egy átnevezéssel, készen jelenik meg: a `.`-tal kezdődő temp-mappát
    // sem a listázás, sem a sorszámozás nem látja, és a másik gépre is csak a kész mappa jut át
    // (migrációs terv §4.3).
    const irasMappa = manifesttel ? utvonal(lancMappa, `.tmp-${versionDir}-${generateId()}`) : verzioMappa;
    // paciens.json index -- kereséshez/előtöltéshez, sosem system of record:
    // a most mentett plan.paciens.nev-re frissül, HACSAK nincs lezárt
    // paciens-adatok.json -- akkor az a törzsadat marad az igazság a
    // névre is, a terv-mentés nem írhatja felül némán (paciensIndexNev).
    const existingPatientData = await this.loadPatientData(patientDir);
    const patientRecord: PatientRecord = {
      schemaVersion: 1,
      paciensId,
      nev: paciensIndexNev(existingPatientData, plan.paciens.nev),
      utolsoAktivitas: ujAktivitas('terv-veglegesitve'),
    };
    const ujPaciens = !patients.some((p) => p.dirName === patientDir);
    const ujLanc = !existingPlans.some((p) => p.dirName === planDir);

    // A listázás óta egy másik gép is létrehozhatta ugyanezt a mappát: a kizárólagos
    // létrehozás a felülírás-tilalom utolsó őre.
    try {
      await this.prim.mappaLetrehoz(irasMappa, { kizarolagos: true });
    } catch (err) {
      if (err instanceof MarLetezikError && !manifesttel) {
        throw new VersionConflictError(versionDir, await this.letezoVerzio(lancMappa, versionDir));
      }
      throw err;
    }

    try {
      await this.prim.irSzoveg(utvonal(irasMappa, TERV_FAJL), tervJson);
      await this.prim.irBajt(utvonal(irasMappa, this.opciok.pdfFajlnev), pdf);
      if (manifesttel) {
        const manifest = await ujManifest(tervJson, this.opciok.pdfFajlnev, pdf);
        await this.prim.irSzoveg(utvonal(irasMappa, MANIFEST_FAJL), JSON.stringify(manifest));
        await this.sorszamMegSzabadOr(lancMappa, verzio);
        try {
          await this.prim.atnevez(irasMappa, verzioMappa);
        } catch (err) {
          if (err instanceof MarLetezikError) {
            throw new VersionConflictError(versionDir, await this.letezoVerzio(lancMappa, versionDir));
          }
          throw err;
        }
      }
    } catch (err) {
      await this.visszagorget(irasMappa, ujLanc ? lancMappa : null, ujPaciens ? pacUt(patientDir) : null);
      if (err instanceof VersionConflictError) throw err;
      throw new Error(this.opciok.mentesHibaUzenet, { cause: err });
    }

    // A verzió itt már teljesen a lemezen van: az index hibája nem teheti sikertelenné a
    // mentést, mert egy újrapróba duplikált verziót szülne (migrációs terv §4.5).
    try {
      await this.prim.irSzoveg(pacRekordUt(patientDir), JSON.stringify(patientRecord));
    } catch {
      return { patientDir, planDir, versionDir, figyelmeztetes: 'INDEX_IRAS_HIBA' };
    }
    return { patientDir, planDir, versionDir };
  }

  /**
   * Az átnevezés előtt friss listázással: ha közben megjelent egy ugyanilyen vagy nagyobb
   * sorszám, dob. A sorszám számít, nem a név -- a másik gép más dátummal ugyanazt a `_vN`-t
   * adhatja.
   */
  private async sorszamMegSzabadOr(lancMappa: string, verzio: number): Promise<void> {
    let utkozo: { dirName: string; verzio: number } | null = null;
    for (const dirName of await this.prim.listaz(lancMappa)) {
      const parsed = parseVersionDirName(dirName);
      if (parsed && parsed.verzio >= verzio && (!utkozo || parsed.verzio < utkozo.verzio)) {
        utkozo = { dirName, verzio: parsed.verzio };
      }
    }
    if (utkozo) throw new VersionConflictError(utkozo.dirName, await this.letezoVerzio(lancMappa, utkozo.dirName));
  }

  /** Az ütköző verzió adatai a doki döntéséhez; hiányos vagy olvashatatlan verziónál `null`. */
  private async letezoVerzio(lancMappa: string, versionDir: string): Promise<LetezoVerzio | null> {
    const mappa = utvonal(lancMappa, versionDir);
    try {
      if ((await this.verzioHianyai(mappa)).length) return null;
      const raw = await this.prim.olvasSzoveg(utvonal(mappa, TERV_FAJL));
      if (raw == null) return null;
      const plan = parseJson<Plan>(raw, TERV_FAJL);
      return { datum: plan.keltezes, orvos: plan.orvos, vegosszeg: plan.osszesitok.fizetendo, penznem: plan.penznem };
    } catch {
      return null;
    }
  }

  /**
   * A hívás saját írásmappája mindig megy. Az e hívásban született lánc- és páciensmappa csak
   * üresen: közben a másik gép is írhatott beléjük, és egy ottani verzió nem veszhet el.
   */
  private async visszagorget(
    irasMappa: string,
    ujLancMappa: string | null,
    ujPaciensMappa: string | null,
  ): Promise<void> {
    await this.prim.torolMappa(irasMappa);
    for (const mappa of [ujLancMappa, ujPaciensMappa]) {
      if (mappa && (await this.prim.listaz(mappa)).length === 0) await this.prim.torolMappa(mappa);
    }
  }

  async loadPlanPdf(ref: PlanRef): Promise<Uint8Array | null> {
    const verzioMappa = utvonal(tervMappaUt(ref.patientDir, ref.planDir), ref.versionDir);
    if (!(await this.prim.letezik(verzioMappa))) return null;
    await this.teljesVerzioOr(ref);
    return this.prim.olvasBajt(utvonal(verzioMappa, this.opciok.pdfFajlnev));
  }

  async loadPriceList(): Promise<PriceList> {
    const raw = await this.prim.olvasSzoveg(ARLISTA_FAJL);
    if (raw == null) throw new Error('Az árlista még nincs inicializálva.');
    await this.megjegyez(ARLISTA_FAJL, raw);
    const priceList = parseJson<PriceList>(raw, ARLISTA_FAJL);
    assertKnownSchemaVersion(priceList, ARLISTA_FAJL);
    assertPriceListShape(priceList, ARLISTA_FAJL);
    return priceList;
  }

  async savePriceList(pl: PriceList, opciok?: FelulirasOpciok): Promise<void> {
    return this.enqueue(() =>
      this.orzottIr(ARLISTA_FAJL, JSON.stringify(pl), opciok, (raw) => parseJson<PriceList>(raw, ARLISTA_FAJL)),
    );
  }

  async loadSettings(): Promise<Settings> {
    const raw = await this.prim.olvasSzoveg(BEALLITASOK_FAJL);
    if (raw == null) throw new Error('A beállítások még nincsenek inicializálva.');
    await this.megjegyez(BEALLITASOK_FAJL, raw);
    const settings = parseJson<Settings>(raw, BEALLITASOK_FAJL);
    assertKnownSchemaVersion(settings, BEALLITASOK_FAJL);
    assertSettingsShape(settings, BEALLITASOK_FAJL);
    return settings;
  }

  async saveSettings(s: Settings, opciok?: FelulirasOpciok): Promise<void> {
    return this.enqueue(() =>
      this.orzottIr(BEALLITASOK_FAJL, JSON.stringify(s), opciok, (raw) => parseJson<Settings>(raw, BEALLITASOK_FAJL)),
    );
  }

  async loadTemplate(name: string): Promise<string> {
    const raw = await this.prim.olvasSzoveg(sablonUt(name));
    if (raw == null) throw new Error(`Nincs ilyen sablon: ${name}`);
    await this.megjegyez(sablonUt(name), raw);
    return raw;
  }

  async listTemplates(): Promise<string[]> {
    return (await this.prim.listaz(SABLONOK_MAPPA)).sort();
  }

  /**
   * `name`: alap név kiterjesztés nélkül, pl. "nyilatkozat-hu". Felülírja a
   * base jelenleg legfrissebb -vN.md fájlját (ha még nincs egy sem, -v1.md-t
   * hoz létre) -- a fájlnév ezután állandó, csak a tartalma cserélődik. A
   * korábbi szövegváltozatok egyetlen igazsága a véglegesítéskor mentett PDF,
   * a `terv.json` nem hivatkozik sablonfájlra.
   */
  async saveTemplate(name: string, body: string, opciok?: FelulirasOpciok): Promise<string> {
    return this.enqueue(async () => {
      const base = name.replace(/\.md$/, '').replace(/-v\d+$/, '');
      const latest = await this.latestTemplateFile(base);
      const fileName = latest ?? `${base}-v1.md`;
      await this.orzottIr(sablonUt(fileName), body, opciok, (raw) => raw);
      return fileName;
    });
  }

  /**
   * A legfrissebb elérhető verziót adja vissza egy alapnévhez (pl.
   * "fizetesi-feltetelek-hu"), a fájlnevével együtt -- a `PreviewPage.tsx`
   * a fájlnevet a betöltés forrásának megjelenítéséhez (a szerkesztődoboz
   * alatti "Jelenleg: ...md" feliratban) használja, nem csak a szövegre
   * van szüksége.
   */
  async loadLatestTemplateByBase(base: string): Promise<{ name: string; body: string }> {
    const latest = await this.latestTemplateFile(base);
    if (!latest) throw new Error(`Nincs "${base}" kezdetű sablon.`);
    const body = (await this.prim.olvasSzoveg(sablonUt(latest)))!;
    await this.megjegyez(sablonUt(latest), body);
    return { name: latest, body };
  }

  private async latestTemplateFile(base: string): Promise<string | null> {
    const re = new RegExp(`^${escapeRegExp(base)}-v(\\d+)\\.md$`);
    let maxV = 0;
    let latestName: string | null = null;
    for (const fileName of await this.prim.listaz(SABLONOK_MAPPA)) {
      const m = re.exec(fileName);
      if (m && Number(m[1]) > maxV) {
        maxV = Number(m[1]);
        latestName = fileName;
      }
    }
    return latestName;
  }

  /**
   * `null`, ha még nincs `paciens-adatok.json` -- ez a hívónak az élő
   * fallbackre lépés jele (`domain/paciensAdatok.ts`
   * `megjelenitettTorzsadat`), NEM hiba. Ellentétben a `paciens.json`/
   * `terv-cimke.json` index-fájlokkal, egy SÉRÜLT törzsadat itt betöltési
   * hibaként dobódik -- ez valódi system of record, egy néma visszaesés
   * adatvesztést takarna el.
   */
  async loadPatientData(patientDir: string): Promise<PatientMasterData | null> {
    const raw = await this.prim.olvasSzoveg(pacAdatUt(patientDir));
    if (raw == null) return null;
    await this.megjegyez(pacAdatUt(patientDir), raw);
    const data = parseJson<PatientMasterData>(raw, 'paciens-adatok.json');
    assertKnownSchemaVersion(data, 'paciens-adatok.json');
    assertPatientMasterDataShape(data, 'paciens-adatok.json');
    return data;
  }

  /**
   * A `paciens.json` index `nev`-jét is frissíti a törzsadatéra -- enélkül a
   * Páciensek/Korábbi tervek listákban a régi név látszana a következő
   * terv-mentésig.
   */
  async savePatientData(patientDir: string, data: PatientMasterData, opciok?: FelulirasOpciok): Promise<void> {
    return this.enqueue(async () => {
      await this.orzottIr(pacAdatUt(patientDir), JSON.stringify(data), opciok, (raw) =>
        parseJson<PatientMasterData>(raw, 'paciens-adatok.json'),
      );
      const record: PatientRecord = {
        schemaVersion: 1,
        paciensId: data.paciensId,
        nev: data.nev,
        utolsoAktivitas: ujAktivitas('torzsadat-mentve'),
      };
      await this.prim.irSzoveg(pacRekordUt(patientDir), JSON.stringify(record));
    });
  }

  /**
   * Vadonatúj, terv nélküli páciens -- mindkét
   * gyökér-fájlt megírja. A `kezdoAdatok` a quick-create
   * dialógus opcionális szuletesiIdo/telefon mezőit terjeszti az
   * `uresTorzsadat()` alapértékére.
   */
  async createPatient(
    nev: string,
    kezdoAdatok?: Pick<Paciens, 'szuletesiIdo' | 'telefon'>,
  ): Promise<PatientFolder> {
    return this.enqueue(async () => {
      const { paciensId, patientDir } = await this.ujPaciensMappa(nev);
      const utolsoAktivitas = ujAktivitas('letrehozva');
      const record: PatientRecord = { schemaVersion: 1, paciensId, nev, utolsoAktivitas };
      const data = { ...uresTorzsadat(nev, paciensId), ...kezdoAdatok };
      await this.prim.irSzoveg(pacRekordUt(patientDir), JSON.stringify(record));
      await this.prim.irSzoveg(pacAdatUt(patientDir), JSON.stringify(data));
      await this.megjegyez(pacAdatUt(patientDir), JSON.stringify(data));
      return { dirName: patientDir, paciensId, nev, utolsoAktivitas };
    });
  }

  /**
   * A teljes páciensmappa törlése -- a mappa minden fájljával: a
   * `listPatients()` a mappa létezéséből vezeti le a pácienst, egy részleges
   * törlés dirnév-ből visszafejtett nevű szellem-pácienst hagyna vissza.
   */
  async deletePatient(patientDir: string): Promise<void> {
    return this.enqueue(async () => {
      const ut = pacUt(patientDir);
      if (!(await this.prim.letezik(ut))) {
        throw new Error(`Nincs ilyen páciens: ${patientDir}`);
      }
      await this.prim.torolMappa(ut);
    });
  }
}
