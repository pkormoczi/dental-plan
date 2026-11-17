// A telepített app renderer-oldali tárolója: minden metódus egy IPC-hívás a main-oldali
// `FileSystemStorage`-ra. A hibaeredményből ugyanaz a hibaosztály lesz, amit a `PlanStorage`
// szerződés ígér, így a hívók `try/catch`-e változatlan (migrációs terv §3.3).

import type {
  Paciens,
  PatientFolder,
  PatientMasterData,
  Plan,
  PlanFolder,
  PlanRef,
  PlanVersion,
  PriceList,
  Settings,
} from '../domain/types';
import type { PlanStorage } from './PlanStorage';
import { storageHibaBolHiba, type TaroloHid, type TaroloMetodus } from './taroloIpc';

export class ElectronStorage implements PlanStorage {
  private readonly hid: TaroloHid;

  constructor(hid: TaroloHid) {
    this.hid = hid;
  }

  private async hiv<T>(metodus: TaroloMetodus, ...args: unknown[]): Promise<T> {
    const eredmeny = await this.hid.hiv(metodus, ...args);
    if (eredmeny.ok) return eredmeny.ertek as T;
    throw storageHibaBolHiba(eredmeny.hiba);
  }

  init(): Promise<void> {
    return this.hiv('init');
  }
  listPatients(): Promise<PatientFolder[]> {
    return this.hiv('listPatients');
  }
  listPlans(patientDir: string): Promise<PlanFolder[]> {
    return this.hiv('listPlans', patientDir);
  }
  listVersions(patientDir: string, planDir: string): Promise<PlanVersion[]> {
    return this.hiv('listVersions', patientDir, planDir);
  }
  loadPlan(ref: PlanRef): Promise<Plan> {
    return this.hiv('loadPlan', ref);
  }
  loadPlanPdf(ref: PlanRef): Promise<Uint8Array | null> {
    return this.hiv('loadPlanPdf', ref);
  }
  savePlan(plan: Plan, pdf: Uint8Array, ujLancCim?: string): Promise<PlanRef> {
    return this.hiv('savePlan', plan, pdf, ujLancCim);
  }
  savePlanLabel(patientDir: string, planDir: string, tervCim: string): Promise<void> {
    return this.hiv('savePlanLabel', patientDir, planDir, tervCim);
  }
  savePlanErvenytelenites(patientDir: string, planDir: string, versionDir: string, indok: string): Promise<void> {
    return this.hiv('savePlanErvenytelenites', patientDir, planDir, versionDir, indok);
  }
  loadPriceList(): Promise<PriceList> {
    return this.hiv('loadPriceList');
  }
  savePriceList(pl: PriceList): Promise<void> {
    return this.hiv('savePriceList', pl);
  }
  loadSettings(): Promise<Settings> {
    return this.hiv('loadSettings');
  }
  saveSettings(s: Settings): Promise<void> {
    return this.hiv('saveSettings', s);
  }
  loadTemplate(name: string): Promise<string> {
    return this.hiv('loadTemplate', name);
  }
  listTemplates(): Promise<string[]> {
    return this.hiv('listTemplates');
  }
  loadLatestTemplateByBase(base: string): Promise<{ name: string; body: string }> {
    return this.hiv('loadLatestTemplateByBase', base);
  }
  saveTemplate(name: string, body: string): Promise<string> {
    return this.hiv('saveTemplate', name, body);
  }
  loadPatientData(patientDir: string): Promise<PatientMasterData | null> {
    return this.hiv('loadPatientData', patientDir);
  }
  savePatientData(patientDir: string, data: PatientMasterData): Promise<void> {
    return this.hiv('savePatientData', patientDir, data);
  }
  createPatient(nev: string, kezdoAdatok?: Pick<Paciens, 'szuletesiIdo' | 'telefon'>): Promise<PatientFolder> {
    return this.hiv('createPatient', nev, kezdoAdatok);
  }
  deletePatient(patientDir: string): Promise<void> {
    return this.hiv('deletePatient', patientDir);
  }
}
