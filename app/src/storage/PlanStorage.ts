// Szó szerint a docs/05-technologia.md:24-36 interfésze szerint, TS-re
// fordítva. Ez a réteg választja el a mockupot (DemoStorage, localStorage)
// a végleges alkalmazástól (FileSystemStorage, showDirectoryPicker()) --
// lásd CLAUDE.md "Két fázisú build". Ezen a felületen kívül semmi nem
// tudhat arról, hogy éppen melyik implementáció fut.

import type {
  PatientFolder,
  Plan,
  PlanRef,
  PlanVersion,
  PriceList,
  Settings,
} from '../domain/types';

export interface PlanStorage {
  init(): Promise<void>;
  listPatients(): Promise<PatientFolder[]>;
  listVersions(patientDir: string): Promise<PlanVersion[]>;
  loadPlan(ref: PlanRef): Promise<Plan>;
  /** Mindig új verziómappát hoz létre (D4) -- soha nem ír felül meglévőt. */
  savePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef>;
  loadPriceList(): Promise<PriceList>;
  savePriceList(pl: PriceList): Promise<void>;
  loadSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  loadTemplate(name: string): Promise<string>;
  /** Mindig új verziófájlt hoz létre, ennek a nevét adja vissza. */
  saveTemplate(name: string, body: string): Promise<string>;
}
