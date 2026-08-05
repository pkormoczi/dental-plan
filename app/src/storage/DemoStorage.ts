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
import type {
  PatientFolder,
  Plan,
  PlanRef,
  PlanVersion,
  PriceList,
  Settings,
} from '../domain/types';
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
import { FIZETESI_FELTETELEK_HU_V1, NYILATKOZAT_HU_V1 } from './seed/templates';

const PREFIX = 'dp:';
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
  async init(): Promise<void> {
    if (localStorage.getItem(PRICE_LIST_KEY) == null) {
      this.resetDemoData();
    }
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
    localStorage.setItem(templateKey('nyilatkozat-hu-v1.md'), NYILATKOZAT_HU_V1);
    localStorage.setItem(templateKey('fizetesi-feltetelek-hu-v1.md'), FIZETESI_FELTETELEK_HU_V1);
    for (const { patientDir, versionDir, plan } of seedPlans) {
      localStorage.setItem(planKey(patientDir, versionDir), JSON.stringify(plan));
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
    const plan = JSON.parse(raw) as Plan;
    assertKnownSchemaVersion(plan, 'terv.json');
    return plan;
  }

  /**
   * D4: mindig új verziómappát hoz létre. Ha a `plan.tervId` egy már
   * létező páciensmappához tartozik, oda kerül az új verzió; egyébként új
   * páciensmappa jön létre. A verziószámot a storage számolja ki -- a
   * hívó nem adhat meg tetszőlegeset (ez a D4 kikényszerítése).
   */
  async savePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef> {
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
    localStorage.setItem(planKey(patientDir, versionDir), JSON.stringify(finalPlan));
    localStorage.setItem(pdfKey(patientDir, versionDir), uint8ToBase64(pdf));

    return { patientDir, versionDir };
  }

  async loadPlanPdf(ref: PlanRef): Promise<Uint8Array | null> {
    const raw = localStorage.getItem(pdfKey(ref.patientDir, ref.versionDir));
    return raw == null ? null : base64ToUint8(raw);
  }

  async loadPriceList(): Promise<PriceList> {
    const raw = localStorage.getItem(PRICE_LIST_KEY);
    if (raw == null) throw new Error('Az árlista még nincs inicializálva.');
    const priceList = JSON.parse(raw) as PriceList;
    assertKnownSchemaVersion(priceList, 'arlista.json');
    return priceList;
  }

  async savePriceList(pl: PriceList): Promise<void> {
    localStorage.setItem(PRICE_LIST_KEY, JSON.stringify(pl));
  }

  async loadSettings(): Promise<Settings> {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw == null) throw new Error('A beállítások még nincsenek inicializálva.');
    const settings = JSON.parse(raw) as Settings;
    assertKnownSchemaVersion(settings, 'beallitasok.json');
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
