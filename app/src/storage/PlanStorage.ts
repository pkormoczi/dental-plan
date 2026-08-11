// Szó szerint a docs/05-technologia.md:24-36 interfésze szerint, TS-re
// fordítva. Ez a réteg választja el a mockupot (DemoStorage, localStorage)
// a végleges alkalmazástól (FileSystemStorage, showDirectoryPicker()) --
// lásd CLAUDE.md "Két fázisú build". Ezen a felületen kívül semmi nem
// tudhat arról, hogy éppen melyik implementáció fut.

import type {
  PatientFolder,
  Plan,
  PlanFolder,
  PlanRef,
  PlanVersion,
  PriceList,
  Settings,
} from '../domain/types';

export interface PlanStorage {
  init(): Promise<void>;
  listPatients(): Promise<PatientFolder[]>;
  /** Egy páciens terv-láncai (D29) -- a köztes szint a verziók felett. */
  listPlans(patientDir: string): Promise<PlanFolder[]>;
  listVersions(patientDir: string, planDir: string): Promise<PlanVersion[]>;
  loadPlan(ref: PlanRef): Promise<Plan>;
  /** Mindig új verziómappát hoz létre (D4) -- soha nem ír felül meglévőt. */
  savePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef>;
  /**
   * A terv-cimke.json-t írja/törli -- a verziómappákon KÍVÜL él, D4 rá nem
   * vonatkozik. Üres/whitespace `tervCim` törli a fájlt (vissza az élő
   * auto-javaslatra, `domain/tervCim.ts`).
   */
  savePlanLabel(patientDir: string, planDir: string, tervCim: string): Promise<void>;
  loadPriceList(): Promise<PriceList>;
  /**
   * D31: az implementáció felelős azért, hogy egymást gyorsan követő
   * hívások sorrendhelyesen landoljanak -- ha az írás nem atomi (pl.
   * `FileSystemDirectoryHandle.createWritable`), sorosítania kell (lásd
   * `DemoStorage` `enqueue`/`savingChain`). A hívó (`AppState.tsx`) mindig a
   * legfrissebb, `apply*`-on át frissülő állapotra épített objektumot adja
   * át -- lásd ott a `savePriceList`/`saveSettings` context-metódus
   * doc-kommentjét.
   */
  savePriceList(pl: PriceList): Promise<void>;
  loadSettings(): Promise<Settings>;
  /** Lásd a `savePriceList` doc-kommentjét -- ugyanaz a sorosítási szerződés. */
  saveSettings(s: Settings): Promise<void>;
  loadTemplate(name: string): Promise<string>;
  /** Mindig új verziófájlt hoz létre, ennek a nevét adja vissza. */
  saveTemplate(name: string, body: string): Promise<string>;
}
