// Mockup-tárolóréteg: localStorage. A kulcsok szándékosan ugyanazt az
// útvonalstruktúrát követik, mint amit a végleges FileSystemStorage majd a
// lemezre ír (lásd docs/02-domain-modell.md "Mappastruktúra") -- ez nem
// dísz, hanem annak a biztosítéka, hogy a paths.ts logika már itt éles
// terhelés alatt fut.
//
// FONTOS: ez csak demó -- nincs benne a docs/05-technologia.md-ben leírt
// séma-migráció (a mockup csak az 1-es schemaVersion-t ismeri), és a
// terv.json PDF-be ágyazása (pdf-lib) is a 2. fázisra marad.

import { assertKnownSchemaVersion } from '../domain/schema';
import { isPlaceholderTemplate } from '../domain/templates';
import { assertPlanShape, assertPriceListShape, assertSettingsShape } from '../domain/validate';
import type {
  PatientFolder,
  Plan,
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
  buildVersionDirName,
  generatePatientId,
  nextVersionNumber,
  parsePatientDirName,
  parseVersionDirName,
} from './paths';
import { seedPriceList } from './seed/priceList';
import { seedSettings } from './seed/settings';
import { seedPlans } from './seed/plans';
import {
  FIZETESI_FELTETELEK_DE_V1,
  FIZETESI_FELTETELEK_HU_V1,
  NYILATKOZAT_DE_V1,
  NYILATKOZAT_HU_V1,
} from './seed/templates';

/** Alapértelmezett sablonfájlok -- lásd `ensureSeedTemplates`. */
const DEFAULT_TEMPLATES: Array<[string, string]> = [
  ['nyilatkozat-hu-v1.md', NYILATKOZAT_HU_V1],
  ['fizetesi-feltetelek-hu-v1.md', FIZETESI_FELTETELEK_HU_V1],
  ['nyilatkozat-de-v1.md', NYILATKOZAT_DE_V1],
  ['fizetesi-feltetelek-de-v1.md', FIZETESI_FELTETELEK_DE_V1],
];

/**
 * Exportált, mert a DemoDraftStorage (docs/archive/backlog/backlog-1-piszkozat-terv.md
 * 2. döntés) is ezt a prefixet használja a `dp:piszkozat` kulcsához -- ez adja
 * a garanciát, hogy a lenti `clearAll()` prefix-seprése (és vele a "Minden
 * adat törlése"/"Demó adat visszaállítása" gomb) a piszkozatot is eltünteti,
 * külön kód nélkül. Egy literál duplikálása itt driftelhetne.
 */
export const PREFIX = 'dp:';
const PRICE_LIST_KEY = `${PREFIX}arlista.json`;
const SETTINGS_KEY = `${PREFIX}beallitasok.json`;
const PATIENTS_PREFIX = `${PREFIX}paciensek/`;
const TEMPLATES_PREFIX = `${PREFIX}sablonok/`;

function planKey(patientDir: string, versionDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/${versionDir}/terv.json`;
}

function pdfKey(patientDir: string, versionDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/${versionDir}/pdf`;
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
   * P0-1/P1-5: `savePlan` privát futási sorba fűzve -- két egymást gyorsan
   * követő hívás (pl. dupla kattintás a "Véglegesítés és mentés" gombon)
   * enélkül ugyanazt a verziószámot számolná ki egymástól függetlenül
   * (`nextVersionNumber` mindkettőnél a még-nem-írt állapotot olvasná), és a
   * második némán felülírná az első verziómappáját (D4 sérülne). A lánc
   * mindig `undefined`-re fut ki, sikeres vagy hibás hívás után is, hogy egy
   * korábbi hiba ne akassza meg a rákövetkező mentéseket.
   */
  private savingChain: Promise<unknown> = Promise.resolve();

  async init(): Promise<void> {
    if (localStorage.getItem(PRICE_LIST_KEY) == null) {
      this.resetDemoData();
      return;
    }
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
    for (const { patientDir, versionDir, plan } of seedPlans) {
      localStorage.setItem(planKey(patientDir, versionDir), JSON.stringify(plan));
    }
  }

  /**
   * A hiányzó alapértelmezett sablonfájlokat pótolja. Kivétel: ha egy
   * meglévő -v1 sablon törzse még a régi "[PLACEHOLDER"/"[PLATZHALTER"
   * jelölőt tartalmazza, felülírjuk a friss (immár valódi, az eredeti
   * Excelből átvett) seed-szöveggel -- ez a frissítési út azoknak, akik a
   * placeholder bevezetése előtt már használták a demót. Idempotens (a
   * friss magyar szövegben nincs jelölő), és a doki által ténylegesen
   * szerkesztett -- tehát már nem placeholder -- törzshöz nem nyúl.
   */
  private ensureSeedTemplates(): void {
    for (const [name, body] of DEFAULT_TEMPLATES) {
      const key = templateKey(name);
      const existing = localStorage.getItem(key);
      if (existing == null || isPlaceholderTemplate(existing)) {
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

  async listPatients(): Promise<PatientFolder[]> {
    const dirs = new Set<string>();
    this.eachKey((key) => {
      if (!key.startsWith(PATIENTS_PREFIX)) return;
      const dir = key.slice(PATIENTS_PREFIX.length).split('/')[0];
      if (dir) dirs.add(dir);
    });
    return [...dirs].map((dirName) => {
      const parsed = parsePatientDirName(dirName);
      return {
        dirName,
        vezeteknev: parsed?.vezeteknev ?? dirName,
        keresztnev: parsed?.keresztnev ?? '',
        patientId: parsed?.patientId ?? '',
      };
    });
  }

  async listVersions(patientDir: string): Promise<PlanVersion[]> {
    const prefix = `${PATIENTS_PREFIX}${patientDir}/`;
    const dirs = new Set<string>();
    this.eachKey((key) => {
      if (!key.startsWith(prefix)) return;
      const dir = key.slice(prefix.length).split('/')[0];
      if (dir) dirs.add(dir);
    });
    const versions: PlanVersion[] = [];
    for (const dirName of dirs) {
      const parsed = parseVersionDirName(dirName);
      if (parsed) versions.push({ dirName, ...parsed });
    }
    return versions.sort((a, b) => a.verzio - b.verzio);
  }

  async loadPlan(ref: PlanRef): Promise<Plan> {
    const raw = localStorage.getItem(planKey(ref.patientDir, ref.versionDir));
    if (raw == null) {
      throw new Error(`Nincs terv itt: ${ref.patientDir}/${ref.versionDir}`);
    }
    const plan = parseJson<Plan>(raw, 'terv.json');
    assertKnownSchemaVersion(plan, 'terv.json');
    assertPlanShape(plan, 'terv.json');
    return plan;
  }

  /**
   * D4: mindig új verziómappát hoz létre. Ha a `plan.tervId` egy már
   * létező páciensmappához tartozik, oda kerül az új verzió; egyébként új
   * páciensmappa jön létre. A verziószámot a storage számolja ki -- a
   * hívó nem adhat meg tetszőlegeset (ez a D4 kikényszerítése).
   *
   * P0-1/P1-5: soros végrehajtás (`savingChain`) + a két `setItem` egy
   * try/catch-ben -- ha bármelyik írás elhasal (pl. kvótahiba), egyik kulcs
   * sem marad félkész állapotban (D4: verziómappát soha nem hagyunk
   * csonkán), és két gyors egymás utáni hívás nem számolhatja ki ugyanazt a
   * verziószámot.
   */
  async savePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef> {
    const run = () => this.doSavePlan(plan, pdf);
    const result = this.savingChain.then(run, run);
    this.savingChain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async doSavePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef> {
    const patients = await this.listPatients();
    let tervId = plan.tervId;
    let patientDir = patients.find((p) => p.patientId === tervId)?.dirName;

    if (!tervId || !patientDir) {
      tervId = tervId || generatePatientId();
      patientDir = buildPatientDirName(plan.paciens.nev, tervId);
    }

    const existingVersions = await this.listVersions(patientDir);
    const existingDirNames = existingVersions.map((v) => v.dirName);
    const verzio = nextVersionNumber(existingDirNames);
    const versionDir = buildVersionDirName(plan.keltezes, verzio);
    assertVersionDirAvailable(existingDirNames, versionDir);

    const finalPlan: Plan = { ...plan, schemaVersion: 1, tervId, verzio };
    const planKeyStr = planKey(patientDir, versionDir);
    const pdfKeyStr = pdfKey(patientDir, versionDir);

    try {
      localStorage.setItem(planKeyStr, JSON.stringify(finalPlan));
      localStorage.setItem(pdfKeyStr, uint8ToBase64(pdf));
    } catch {
      // Mindkét kulcs frissen létrehozott ebben a hívásban
      // (assertVersionDirAvailable fentebb ezt garantálja) -- a rollback
      // biztonságos, nem törölhet egy korábbi verziót.
      localStorage.removeItem(planKeyStr);
      localStorage.removeItem(pdfKeyStr);
      throw new Error(
        'A tervet nem sikerült elmenteni -- valószínűleg megtelt a böngésző tárhelye. ' +
          'Semmi nem íródott félkészen, próbáld törölni pár korábbi tervet.',
      );
    }

    return { patientDir, versionDir };
  }

  async loadPlanPdf(ref: PlanRef): Promise<Uint8Array | null> {
    const raw = localStorage.getItem(pdfKey(ref.patientDir, ref.versionDir));
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
    localStorage.setItem(PRICE_LIST_KEY, JSON.stringify(pl));
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
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  async loadTemplate(name: string): Promise<string> {
    const raw = localStorage.getItem(templateKey(name));
    if (raw == null) throw new Error(`Nincs ilyen sablon: ${name}`);
    return raw;
  }

  /** `name`: alap név kiterjesztés nélkül, pl. "nyilatkozat-hu". Mindig új -vN.md fájlt ír. */
  async saveTemplate(name: string, body: string): Promise<string> {
    const base = name.replace(/\.md$/, '').replace(/-v\d+$/, '');
    const nextV = this.nextTemplateVersion(base);
    const fileName = `${base}-v${nextV}.md`;
    localStorage.setItem(templateKey(fileName), body);
    return fileName;
  }

  /**
   * A legfrissebb elérhető verziót adja vissza egy alapnévhez (pl.
   * "fizetesi-feltetelek-hu"), a fájlnevével együtt. A `terv.json`
   * véglegesítéskor a MEGJELENÍTETT nyilatkozat verzióját pinneli
   * (`sablonVerzio`) -- lásd docs/02-domain-modell.md és
   * `PreviewPage.tsx` --, ezért a hívónak a fájlnévre is szüksége van, nem
   * csak a szövegre.
   */
  async loadLatestTemplateByBase(base: string): Promise<{ name: string; body: string }> {
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
    if (!latestKey || !latestName) throw new Error(`Nincs "${base}" kezdetű sablon.`);
    return { name: latestName, body: localStorage.getItem(latestKey)! };
  }

  private nextTemplateVersion(base: string): number {
    const re = new RegExp(`^${escapeRegExp(base)}-v(\\d+)\\.md$`);
    let maxV = 0;
    this.eachKey((key) => {
      if (!key.startsWith(TEMPLATES_PREFIX)) return;
      const m = re.exec(key.slice(TEMPLATES_PREFIX.length));
      if (m) maxV = Math.max(maxV, Number(m[1]));
    });
    return maxV + 1;
  }
}
