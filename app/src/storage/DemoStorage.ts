// Mockup-tárolóréteg: localStorage. A kulcsok szándékosan ugyanazt az
// útvonalstruktúrát követik, mint amit a végleges FileSystemStorage majd a
// lemezre ír (lásd docs/02-domain-modell.md "Mappastruktúra") -- ez nem
// dísz, hanem annak a biztosítéka, hogy a paths.ts logika már itt éles
// terhelés alatt fut.
//
// FONTOS: ez csak demó -- nincs benne a docs/05-technologia.md-ben leírt
// séma-migráció (a mockup csak az 1-es schemaVersion-t ismeri), és a
// terv.json PDF-be ágyazása (pdf-lib) is a 2. fázisra marad.

import { javasoltTervCim } from '../domain/tervCim';
import { paciensIndexNev, uresTorzsadat } from '../domain/paciensAdatok';
import { ervenyesAktivitas, ujAktivitas } from '../domain/paciensAktivitas';
import { assertKnownSchemaVersion } from '../domain/schema';
import { isPlaceholderTemplate } from '../domain/templates';
import {
  assertPatientMasterDataShape,
  assertPlanShape,
  assertPriceListShape,
  assertSettingsShape,
} from '../domain/validate';
import { buildDemoFileTree, type DemoNode } from './demoFileTree';
import type {
  Paciens,
  PatientFolder,
  PatientMasterData,
  PatientRecord,
  Plan,
  PlanFolder,
  PlanLabel,
  PlanRef,
  PlanVersion,
  PriceList,
  Settings,
} from '../domain/types';
import { parseJson } from './json';
import type { PlanStorage } from './PlanStorage';
import {
  assertVersionDirAvailable,
  buildPatientDirName,
  buildPlanDirName,
  buildVersionDirName,
  generateId,
  nextVersionNumber,
  parsePatientDirName,
  parsePlanDirName,
  parseVersionDirName,
} from './paths';
import { seedPriceList } from './seed/priceList';
import { seedSettings } from './seed/settings';
import { seedPatientData, seedPatients, seedPlans } from './seed/plans';
import {
  FIZETESI_FELTETELEK_DE_V1,
  FIZETESI_FELTETELEK_DE_V2,
  FIZETESI_FELTETELEK_HU_V1,
  FIZETESI_FELTETELEK_HU_V2,
  GARANCIA_DE_V1,
  GARANCIA_HU_V1,
  NYILATKOZAT_DE_V1,
  NYILATKOZAT_HU_V1,
} from './seed/templates';

/**
 * Alapértelmezett sablonfájlok -- lásd `ensureSeedTemplates`. A fizetési
 * feltételek v2-je (D66: {{elolegSzazalek}} -> {{eloleg}}) egy ÚJ kulcs --
 * egy meglévő demó-tárolóban is hiányzik, tehát az `ensureSeedTemplates`
 * `existing == null` ága automatikusan beírja, a v1 (korábban véglegesített
 * tervek mentett PDF-je ennek szövegét őrzi) érintetlen marad.
 */
const DEFAULT_TEMPLATES: Array<[string, string]> = [
  ['nyilatkozat-hu-v1.md', NYILATKOZAT_HU_V1],
  ['fizetesi-feltetelek-hu-v1.md', FIZETESI_FELTETELEK_HU_V1],
  ['fizetesi-feltetelek-hu-v2.md', FIZETESI_FELTETELEK_HU_V2],
  ['garancia-hu-v1.md', GARANCIA_HU_V1],
  ['nyilatkozat-de-v1.md', NYILATKOZAT_DE_V1],
  ['fizetesi-feltetelek-de-v1.md', FIZETESI_FELTETELEK_DE_V1],
  ['fizetesi-feltetelek-de-v2.md', FIZETESI_FELTETELEK_DE_V2],
  ['garancia-de-v1.md', GARANCIA_DE_V1],
];

/**
 * Exportált, mert a DemoDraftStorage (docs/05-technologia.md
 * § Piszkozat-autosave) is ezt a prefixet használja a `dp:piszkozat` kulcsához -- ez adja
 * a garanciát, hogy a lenti `clearAll()` prefix-seprése (és vele a "Minden
 * adat törlése"/"Demó adat visszaállítása" gomb) a piszkozatot is eltünteti,
 * külön kód nélkül. Egy literál duplikálása itt driftelhetne.
 */
export const PREFIX = 'dp:';
const PRICE_LIST_KEY = `${PREFIX}arlista.json`;
const SETTINGS_KEY = `${PREFIX}beallitasok.json`;
const PATIENTS_PREFIX = `${PREFIX}paciensek/`;
const TEMPLATES_PREFIX = `${PREFIX}sablonok/`;

function patientRecordKey(patientDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/paciens.json`;
}

function patientDataKey(patientDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/paciens-adatok.json`;
}

/**
 * A páciens-mappa gyökerén élő fájlok neve -- a `listPlans` ezekkel szűri
 * ki a terv-mappák közül (különben egy új gyökér-fájl hamis terv-láncként
 * jelenne meg). Egy `Set`, hogy egy jövőbeli harmadik gyökér-fájl (pl. egy
 * D33-hoz hasonló újabb tétel) egyetlen helyen bővítse a listát.
 */
const PATIENT_ROOT_FILES = new Set(['paciens.json', 'paciens-adatok.json']);

function planLabelKey(patientDir: string, planDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/${planDir}/terv-cimke.json`;
}

function planKey(patientDir: string, planDir: string, versionDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/${planDir}/${versionDir}/terv.json`;
}

function pdfKey(patientDir: string, planDir: string, versionDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/${planDir}/${versionDir}/pdf`;
}

function templateKey(fileName: string): string {
  return `${TEMPLATES_PREFIX}${fileName}`;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class DemoStorage implements PlanStorage {
  /**
   * D31: minden író (`savePlan`, `savePriceList`, `saveSettings`) EGYETLEN
   * közös láncba fut be -- két egymást gyorsan követő hívás (pl. dupla
   * kattintás, vagy egy admin-mezőn gyors egymás utáni szerkesztés)
   * enélkül egymással versenyezve írna, és fordított sorrendben landolhatna
   * (`savePlan`-nál ráadásul ugyanazt a verziószámot is kiszámolhatná --
   * P0-1/P1-5, D4 sérülne). A lánc mindig `undefined`-re fut ki, sikeres
   * vagy hibás hívás után is, hogy egy korábbi hiba ne akassza meg a
   * rákövetkező mentéseket. Ma a `localStorage.setItem` szinkron, tehát ez
   * a lánc önmagában no-op -- a `FileSystemStorage`-váltásnál
   * (`docs/05-technologia.md`, 2. fázis) válik éles védelemmé, ahol egy
   * `createWritable`/`write`/`close` írás nem atomi, és két párhuzamos
   * writable ugyanarra a fájlra csonka tartalmat is okozhatna, nem csak
   * fordított sorrendet.
   */
  private savingChain: Promise<unknown> = Promise.resolve();

  /** A `savingChain`-re fűz egy írást -- lásd a mező doc-kommentjét. */
  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const result = this.savingChain.then(run, run);
    this.savingChain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async init(): Promise<void> {
    if (localStorage.getItem(PRICE_LIST_KEY) == null) {
      this.resetDemoData();
      return;
    }
    // D29: aki a páciens-entitás bevezetése előtt már használta a demót,
    // annak a régi (páciens → verzió) 2 szintű mappaszerkezete megvan a
    // localStorage-ban -- ezt egyszeri migrációval alakítjuk át a mostani
    // (páciens → terv → verzió) 3 szintűre, hogy a korábban felvitt saját
    // teszttervei ne vesszenek el.
    this.migrateLegacyLayout();
    // D21: aki a német sablonok bevezetése előtt már használta a demót,
    // annak az árlistája megvan, tehát resetDemoData() itt nem futna le
    // újra -- enélkül a nyilatkozat-de-v1.md sosem jönne létre neki, és a
    // PreviewPage üres/hibás sablonnal futna németre váltva. Idempotens:
    // csak a HIÁNYZÓ sablonkulcsokat pótolja, meglévőt nem ír felül.
    this.ensureSeedTemplates();
  }

  /**
   * "Demó adat visszaállítása" -- törli az összes dp: kulcsot és újratölti
   * a seedet. Ez NEM az interface része (a valódi FileSystemStorage-nak
   * nincs ilyen fogalma), csak a mockup kényelmi funkciója.
   */
  resetDemoData(): void {
    this.clearAll();
    localStorage.setItem(PRICE_LIST_KEY, JSON.stringify(seedPriceList));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(seedSettings));
    this.ensureSeedTemplates();
    for (const { patientDir, record } of seedPatients) {
      localStorage.setItem(patientRecordKey(patientDir), JSON.stringify(record));
    }
    // D33: csak EGY seed pácienshez -- a demónak mindkét állapotot mutatnia
    // kell (lezárt törzsadat vs. élő fallback a legutóbbi tervből), lásd
    // seed/plans.ts.
    for (const { patientDir, data } of seedPatientData) {
      localStorage.setItem(patientDataKey(patientDir), JSON.stringify(data));
    }
    for (const { patientDir, planDir, versionDir, plan } of seedPlans) {
      localStorage.setItem(planKey(patientDir, planDir, versionDir), JSON.stringify(plan));
    }
  }

  private currentPriceListOrSeed(): PriceList {
    const raw = localStorage.getItem(PRICE_LIST_KEY);
    if (raw == null) return seedPriceList;
    try {
      return parseJson<PriceList>(raw, 'arlista.json');
    } catch {
      return seedPriceList;
    }
  }

  /**
   * D29 egyszeri migrációja: a régi `<patientDir>/<ISO>_v<n>/…` alakú
   * kulcsokat páciensenként egy új terv-mappa alá tereli (minden régi
   * verzió UGYANABBA az egy terv-láncba kerül -- a régi szerkezet ezt úgyis
   * feltételezte), és felveszi a hiányzó `paciens.json` indexet. A
   * legacy-jelenlétet onnan ismerjük fel, hogy a páciensmappa alatti
   * második útvonalszegmens verzió-mintázatú (`<ISO>_v<n>`) -- az új
   * szerkezetben ez a szegmens mindig egy terv-mappa neve, sosem az.
   * Eldobható mockup-kód: a FileSystemStorage-váltás (2. fázis) ezt nem
   * örökli.
   */
  private migrateLegacyLayout(): void {
    const legacyPatientDirs = new Set<string>();
    this.eachKey((key) => {
      if (!key.startsWith(PATIENTS_PREFIX)) return;
      const segments = key.slice(PATIENTS_PREFIX.length).split('/');
      if (segments.length >= 2 && parseVersionDirName(segments[1])) {
        legacyPatientDirs.add(segments[0]);
      }
    });
    if (legacyPatientDirs.size === 0) return;

    try {
      const priceList = this.currentPriceListOrSeed();
      for (const patientDir of legacyPatientDirs) {
        this.migratePatientLegacyLayout(patientDir, priceList);
      }
    } catch {
      // Félmigrált állapotot nem hagyunk a localStorage-ban -- inkább a
      // teljes demó-adat áll vissza a friss seedre.
      this.resetDemoData();
    }
  }

  private migratePatientLegacyLayout(patientDir: string, priceList: PriceList): void {
    const prefix = `${PATIENTS_PREFIX}${patientDir}/`;
    const legacyVersionDirs = new Set<string>();
    this.eachKey((key) => {
      if (!key.startsWith(prefix)) return;
      const versionDir = key.slice(prefix.length).split('/')[0];
      if (parseVersionDirName(versionDir)) legacyVersionDirs.add(versionDir);
    });
    const sorted = [...legacyVersionDirs].sort(
      (a, b) => parseVersionDirName(a)!.verzio - parseVersionDirName(b)!.verzio,
    );
    if (sorted.length === 0) return;

    const versions = sorted.map((versionDir) => {
      const raw = localStorage.getItem(`${prefix}${versionDir}/terv.json`);
      if (raw == null) throw new Error(`Migráció: hiányzó terv.json (${patientDir}/${versionDir})`);
      const plan = parseJson<Plan>(raw, 'terv.json');
      assertKnownSchemaVersion(plan, 'terv.json');
      assertPlanShape(plan, 'terv.json');
      return { versionDir, plan };
    });

    const paciensId = parsePatientDirName(patientDir)?.patientId || generateId();
    // A terv-mappa neve a lánc LEGKORÁBBI verziójának tartalmából számolt
    // javaslatból képződik -- ugyanaz az elv, mint a `doSavePlan`-ban.
    const planDir = buildPlanDirName(javasoltTervCim(versions[0].plan, priceList), generateId());

    for (const { versionDir, plan } of versions) {
      const migratedPlan: Plan = { ...plan, paciensId };
      localStorage.setItem(planKey(patientDir, planDir, versionDir), JSON.stringify(migratedPlan));
      const rawPdf = localStorage.getItem(`${prefix}${versionDir}/pdf`);
      if (rawPdf != null) {
        localStorage.setItem(pdfKey(patientDir, planDir, versionDir), rawPdf);
      }
      localStorage.removeItem(`${prefix}${versionDir}/terv.json`);
      localStorage.removeItem(`${prefix}${versionDir}/pdf`);
    }

    // Nincs utolsoAktivitas: az egyetlen elérhető időbélyeg itt a `keltezes`
    // (üzleti, doki által szabadon szerkeszthető dátum, D22) -- abból
    // szintetizálni fals, akár JÖVŐBELI wall-clock időt adna, ami a pácienst
    // örökre a recent lista tetejére ragasztaná. A hiányzó mező a következő
    // valódi íráskor magától gyógyul.
    const record: PatientRecord = {
      schemaVersion: 1,
      paciensId,
      nev: versions[versions.length - 1].plan.paciens.nev,
    };
    localStorage.setItem(patientRecordKey(patientDir), JSON.stringify(record));
  }

  /**
   * A hiányzó alapértelmezett sablonfájlokat pótolja. Kivétel: ha egy
   * meglévő -v1 sablon törzse még a "[PLACEHOLDER"/"[PLATZHALTER" jelölőt
   * tartalmazza, felülírjuk a friss seed-szöveggel -- ez a frissítési út
   * azoknak, akik egy régebbi demó-állapotot hoznak magukkal. A nyilatkozat/
   * fizetési feltételek HU szövege ma már valódi (az eredeti Excelből átvett,
   * nem placeholder), ezért ott ez a felülírás egyszeri migráció, utána nem
   * fut le újra.
   *
   * A `body` is placeholder-e -- nem csak az `existing` -- azért kell, mert
   * `saveTemplate()` a doki szövegét ugyanabba a fájlba (`garancia-hu-v1.md`)
   * írja felül: ha a doki a `[PLACEHOLDER` jelölőt bent hagyta a saját
   * szövegében, egy erre rákövetkező `init()` a régi feltétellel némán
   * visszaírná a seedet, elveszítve a doki munkáját. A garancia HU/DE
   * SZÁNDÉKOSAN placeholder marad a seedben (nincs forrása az Excelben) --
   * rá ez az ág továbbra is minden `init()`-en lefut, amíg a doki valódi
   * szöveget nem ment.
   */
  private ensureSeedTemplates(): void {
    for (const [name, body] of DEFAULT_TEMPLATES) {
      const key = templateKey(name);
      const existing = localStorage.getItem(key);
      if (existing == null || (isPlaceholderTemplate(existing) && !isPlaceholderTemplate(body))) {
        localStorage.setItem(key, body);
      }
    }
  }

  clearAll(): void {
    this.eachKey((key) => localStorage.removeItem(key));
  }

  private eachKey(fn: (key: string) => void): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach(fn);
  }

  /**
   * Filerendszer nézet: a `dp:` kulcsokat fává alakítja (`demoFileTree.ts`).
   * NEM a `PlanStorage` interfész része -- demó-only vizualizáció, a
   * `resetDemoData`/`clearAll` mintájára (lásd StorageContext.tsx fejléce).
   * Szinkron, mert egy `localStorage`-bejárás, nem I/O.
   */
  listFileTree(): DemoNode[] {
    const keys: string[] = [];
    this.eachKey((key) => keys.push(key));
    return buildDemoFileTree(keys, PREFIX);
  }

  /**
   * Egy fa-csomópont `storageKey`-éhez tartozó nyers tartalom (JSON string,
   * markdown, vagy a PDF base64-kódolt bájtjai -- a hívó dönti el a
   * `format` mező alapján, mit kezd vele). A `PREFIX`-őr megakadályozza,
   * hogy ez általános localStorage-olvasóvá váljon.
   */
  readRawFile(storageKey: string): string | null {
    if (!storageKey.startsWith(PREFIX)) return null;
    return localStorage.getItem(storageKey);
  }

  async listPatients(): Promise<PatientFolder[]> {
    const dirs = new Set<string>();
    this.eachKey((key) => {
      if (!key.startsWith(PATIENTS_PREFIX)) return;
      const dir = key.slice(PATIENTS_PREFIX.length).split('/')[0];
      if (dir) dirs.add(dir);
    });
    return [...dirs].map((dirName) => {
      const raw = localStorage.getItem(patientRecordKey(dirName));
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
    });
  }

  async listPlans(patientDir: string): Promise<PlanFolder[]> {
    const prefix = `${PATIENTS_PREFIX}${patientDir}/`;
    const dirs = new Set<string>();
    this.eachKey((key) => {
      if (!key.startsWith(prefix)) return;
      const dir = key.slice(prefix.length).split('/')[0];
      if (dir && !PATIENT_ROOT_FILES.has(dir)) dirs.add(dir);
    });
    return [...dirs].map((dirName) => {
      const parsed = parsePlanDirName(dirName);
      const labelRaw = localStorage.getItem(planLabelKey(patientDir, dirName));
      let tervCim: string | null = null;
      if (labelRaw != null) {
        try {
          tervCim = parseJson<PlanLabel>(labelRaw, 'terv-cimke.json').tervCim;
        } catch {
          tervCim = null; // sérült terv-cimke.json -- vissza az élő auto-javaslatra
        }
      }
      return { dirName, tervId: parsed?.planId ?? '', tervCim };
    });
  }

  async listVersions(patientDir: string, planDir: string): Promise<PlanVersion[]> {
    const prefix = `${PATIENTS_PREFIX}${patientDir}/${planDir}/`;
    const dirs = new Set<string>();
    this.eachKey((key) => {
      if (!key.startsWith(prefix)) return;
      const dir = key.slice(prefix.length).split('/')[0];
      if (dir && dir !== 'terv-cimke.json') dirs.add(dir);
    });
    const versions: PlanVersion[] = [];
    for (const dirName of dirs) {
      const parsed = parseVersionDirName(dirName);
      if (parsed) versions.push({ dirName, ...parsed });
    }
    return versions.sort((a, b) => a.verzio - b.verzio);
  }

  async loadPlan(ref: PlanRef): Promise<Plan> {
    const raw = localStorage.getItem(planKey(ref.patientDir, ref.planDir, ref.versionDir));
    if (raw == null) {
      throw new Error(`Nincs terv itt: ${ref.patientDir}/${ref.planDir}/${ref.versionDir}`);
    }
    const plan = parseJson<Plan>(raw, 'terv.json');
    assertKnownSchemaVersion(plan, 'terv.json');
    assertPlanShape(plan, 'terv.json');
    return plan;
  }

  async savePlanLabel(patientDir: string, planDir: string, tervCim: string): Promise<void> {
    const key = planLabelKey(patientDir, planDir);
    const trimmed = tervCim.trim();
    if (!trimmed) {
      // Üres címke = vissza az élő auto-javaslatra (domain/tervCim.ts), nem
      // egy tárolt üres string.
      localStorage.removeItem(key);
      return;
    }
    const label: PlanLabel = { schemaVersion: 1, tervCim: trimmed };
    localStorage.setItem(key, JSON.stringify(label));
  }

  /**
   * D4: mindig új verziómappát hoz létre. Ha a `plan.paciensId` egy már
   * létező páciensmappához tartozik, oda kerül az új terv/verzió;
   * egyébként új páciensmappa jön létre. Ugyanígy a `plan.tervId`-hoz
   * tartozó terv-mappa: ha létezik, oda kerül az új verzió, egyébként új
   * terv-mappa nyílik a páciensen belül (D29). A verziószámot a storage
   * számolja ki -- a hívó nem adhat meg tetszőlegeset (ez a D4
   * kikényszerítése).
   *
   * P0-1/P1-5: soros végrehajtás (`savingChain`) + a három `setItem` egy
   * try/catch-ben -- ha bármelyik írás elhasal (pl. kvótahiba), egyik kulcs
   * sem marad félkész állapotban (D4: verziómappát soha nem hagyunk
   * csonkán), és két gyors egymás utáni hívás nem számolhatja ki ugyanazt a
   * verziószámot.
   */
  async savePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef> {
    return this.enqueue(() => this.doSavePlan(plan, pdf));
  }

  private async doSavePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef> {
    const patients = await this.listPatients();
    let paciensId = plan.paciensId;
    let patientDir = paciensId ? patients.find((p) => p.paciensId === paciensId)?.dirName : undefined;

    if (!paciensId || !patientDir) {
      paciensId = paciensId || generateId();
      patientDir = buildPatientDirName(plan.paciens.nev, paciensId);
    }

    let tervId = plan.tervId;
    const existingPlans = await this.listPlans(patientDir);
    let planDir = tervId ? existingPlans.find((p) => p.tervId === tervId)?.dirName : undefined;

    if (!tervId || !planDir) {
      tervId = tervId || generateId();
      const priceList = this.currentPriceListOrSeed();
      planDir = buildPlanDirName(javasoltTervCim(plan, priceList), tervId);
    }

    const existingVersions = await this.listVersions(patientDir, planDir);
    const existingDirNames = existingVersions.map((v) => v.dirName);
    const verzio = nextVersionNumber(existingDirNames);
    const versionDir = buildVersionDirName(plan.keltezes, verzio);
    assertVersionDirAvailable(existingDirNames, versionDir);

    const finalPlan: Plan = { ...plan, schemaVersion: 1, tervId, verzio, paciensId };
    const planKeyStr = planKey(patientDir, planDir, versionDir);
    const pdfKeyStr = pdfKey(patientDir, planDir, versionDir);
    // paciens.json index -- kereséshez/előtöltéshez, sosem system of record
    // (D29): a most mentett plan.paciens.nev-re frissül, HACSAK nincs lezárt
    // paciens-adatok.json (D33) -- akkor az a törzsadat marad az igazság a
    // névre is, a terv-mentés nem írhatja felül némán (paciensIndexNev).
    const existingPatientData = await this.loadPatientData(patientDir);
    const patientRecord: PatientRecord = {
      schemaVersion: 1,
      paciensId,
      nev: paciensIndexNev(existingPatientData, plan.paciens.nev),
      utolsoAktivitas: ujAktivitas('terv-veglegesitve'),
    };
    const patientRecordKeyStr = patientRecordKey(patientDir);

    try {
      localStorage.setItem(planKeyStr, JSON.stringify(finalPlan));
      localStorage.setItem(pdfKeyStr, uint8ToBase64(pdf));
      localStorage.setItem(patientRecordKeyStr, JSON.stringify(patientRecord));
    } catch {
      // A plan/pdf kulcs frissen létrehozott ebben a hívásban
      // (assertVersionDirAvailable fentebb ezt garantálja) -- a rollback
      // biztonságos, nem törölhet egy korábbi verziót. A paciens.json-t
      // NEM töröljük: `localStorage.setItem` szinkron és atomi kulcsonként,
      // tehát ha az ő írása hasalt el, korábbi tartalma (ha volt)
      // változatlan maradt.
      localStorage.removeItem(planKeyStr);
      localStorage.removeItem(pdfKeyStr);
      throw new Error(
        'A tervet nem sikerült elmenteni -- valószínűleg megtelt a böngésző tárhelye. ' +
          'Semmi nem íródott félkészen, próbáld törölni pár korábbi tervet.',
      );
    }

    return { patientDir, planDir, versionDir };
  }

  async loadPlanPdf(ref: PlanRef): Promise<Uint8Array | null> {
    const raw = localStorage.getItem(pdfKey(ref.patientDir, ref.planDir, ref.versionDir));
    return raw == null ? null : base64ToUint8(raw);
  }

  async loadPriceList(): Promise<PriceList> {
    const raw = localStorage.getItem(PRICE_LIST_KEY);
    if (raw == null) throw new Error('Az árlista még nincs inicializálva.');
    const priceList = parseJson<PriceList>(raw, 'arlista.json');
    assertKnownSchemaVersion(priceList, 'arlista.json');
    assertPriceListShape(priceList, 'arlista.json');
    return priceList;
  }

  async savePriceList(pl: PriceList): Promise<void> {
    return this.enqueue(async () => {
      localStorage.setItem(PRICE_LIST_KEY, JSON.stringify(pl));
    });
  }

  async loadSettings(): Promise<Settings> {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw == null) throw new Error('A beállítások még nincsenek inicializálva.');
    const settings = parseJson<Settings>(raw, 'beallitasok.json');
    assertKnownSchemaVersion(settings, 'beallitasok.json');
    assertSettingsShape(settings, 'beallitasok.json');
    return settings;
  }

  async saveSettings(s: Settings): Promise<void> {
    return this.enqueue(async () => {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    });
  }

  async loadTemplate(name: string): Promise<string> {
    const raw = localStorage.getItem(templateKey(name));
    if (raw == null) throw new Error(`Nincs ilyen sablon: ${name}`);
    return raw;
  }

  /**
   * `name`: alap név kiterjesztés nélkül, pl. "nyilatkozat-hu". Felülírja a
   * base jelenleg legfrissebb -vN.md fájlját (ha még nincs egy sem, -v1.md-t
   * hoz létre) -- a fájlnév ezután állandó, csak a tartalma cserélődik. A
   * korábbi szövegváltozatok egyetlen igazsága a véglegesítéskor mentett PDF,
   * a `terv.json` nem hivatkozik sablonfájlra.
   */
  async saveTemplate(name: string, body: string): Promise<string> {
    const base = name.replace(/\.md$/, '').replace(/-v\d+$/, '');
    const latest = this.latestTemplateFile(base);
    const fileName = latest?.name ?? `${base}-v1.md`;
    localStorage.setItem(templateKey(fileName), body);
    return fileName;
  }

  /**
   * A legfrissebb elérhető verziót adja vissza egy alapnévhez (pl.
   * "fizetesi-feltetelek-hu"), a fájlnevével együtt -- a `PreviewPage.tsx`
   * a fájlnevet a betöltés forrásának megjelenítéséhez (a szerkesztődoboz
   * alatti "Jelenleg: ...md" feliratban) használja, nem csak a szövegre
   * van szüksége.
   */
  async loadLatestTemplateByBase(base: string): Promise<{ name: string; body: string }> {
    const latest = this.latestTemplateFile(base);
    if (!latest) throw new Error(`Nincs "${base}" kezdetű sablon.`);
    return { name: latest.name, body: localStorage.getItem(latest.key)! };
  }

  private latestTemplateFile(base: string): { key: string; name: string } | null {
    const re = new RegExp(`^${escapeRegExp(base)}-v(\\d+)\\.md$`);
    let maxV = 0;
    let latestKey: string | null = null;
    let latestName: string | null = null;
    this.eachKey((key) => {
      if (!key.startsWith(TEMPLATES_PREFIX)) return;
      const fileName = key.slice(TEMPLATES_PREFIX.length);
      const m = re.exec(fileName);
      if (m && Number(m[1]) > maxV) {
        maxV = Number(m[1]);
        latestKey = key;
        latestName = fileName;
      }
    });
    return latestKey && latestName ? { key: latestKey, name: latestName } : null;
  }

  /**
   * D33: `null`, ha még nincs `paciens-adatok.json` -- ez a hívónak az élő
   * fallbackre lépés jele (`domain/paciensAdatok.ts`
   * `megjelenitettTorzsadat`), NEM hiba. Ellentétben a `paciens.json`/
   * `terv-cimke.json` index-fájlokkal, egy SÉRÜLT törzsadat itt betöltési
   * hibaként dobódik -- ez valódi system of record, egy néma visszaesés
   * adatvesztést takarna el.
   */
  async loadPatientData(patientDir: string): Promise<PatientMasterData | null> {
    const raw = localStorage.getItem(patientDataKey(patientDir));
    if (raw == null) return null;
    const data = parseJson<PatientMasterData>(raw, 'paciens-adatok.json');
    assertKnownSchemaVersion(data, 'paciens-adatok.json');
    assertPatientMasterDataShape(data, 'paciens-adatok.json');
    return data;
  }

  /**
   * A `paciens.json` index `nev`-jét is frissíti a törzsadatéra -- enélkül a
   * Páciensek/Korábbi tervek listákban a régi név látszana a következő
   * terv-mentésig (D33).
   */
  async savePatientData(patientDir: string, data: PatientMasterData): Promise<void> {
    return this.enqueue(async () => {
      localStorage.setItem(patientDataKey(patientDir), JSON.stringify(data));
      const record: PatientRecord = {
        schemaVersion: 1,
        paciensId: data.paciensId,
        nev: data.nev,
        utolsoAktivitas: ujAktivitas('torzsadat-mentve'),
      };
      localStorage.setItem(patientRecordKey(patientDir), JSON.stringify(record));
    });
  }

  /**
   * Vadonatúj, terv nélküli páciens (backlog-28, 6. döntés) -- mindkét
   * gyökér-fájlt megírja. A `kezdoAdatok` (backlog-36, D15) a quick-create
   * dialógus opcionális szuletesiIdo/telefon mezőit terjeszti az
   * `uresTorzsadat()` alapértékére.
   */
  async createPatient(
    nev: string,
    kezdoAdatok?: Pick<Paciens, 'szuletesiIdo' | 'telefon'>,
  ): Promise<PatientFolder> {
    return this.enqueue(async () => {
      const paciensId = generateId();
      const patientDir = buildPatientDirName(nev, paciensId);
      const utolsoAktivitas = ujAktivitas('letrehozva');
      const record: PatientRecord = { schemaVersion: 1, paciensId, nev, utolsoAktivitas };
      const data = { ...uresTorzsadat(nev, paciensId), ...kezdoAdatok };
      localStorage.setItem(patientRecordKey(patientDir), JSON.stringify(record));
      localStorage.setItem(patientDataKey(patientDir), JSON.stringify(data));
      return { dirName: patientDir, paciensId, nev, utolsoAktivitas };
    });
  }

  /**
   * A teljes páciensmappa törlése (backlog-41, D50) -- egyetlen
   * prefix-seprés, mert a `listPatients()` BÁRMELY, a mappa alatti kulcsból
   * levezeti a páciens létezését (lásd ott): egy részleges törlés
   * dirnév-ből visszafejtett nevű szellem-pácienst hagyna vissza. A záró
   * `/` azért kell a prefixben, hogy egy másik páciens mappaneve, aminek ez
   * a `patientDir` az előtagja, ne essen bele. Az `eachKey` előbb
   * snapshotol, tehát a `removeItem` a callbackben biztonságos.
   */
  async deletePatient(patientDir: string): Promise<void> {
    return this.enqueue(async () => {
      const prefix = `${PATIENTS_PREFIX}${patientDir}/`;
      const keys: string[] = [];
      this.eachKey((key) => {
        if (key.startsWith(prefix)) keys.push(key);
      });
      if (keys.length === 0) {
        throw new Error(`Nincs ilyen páciens: ${patientDir}`);
      }
      keys.forEach((key) => localStorage.removeItem(key));
    });
  }
}
