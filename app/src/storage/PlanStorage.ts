// Szó szerint a docs/05-technologia.md:24-36 interfésze szerint, TS-re
// fordítva. Ez a réteg választja el a mockupot (DemoStorage, localStorage)
// a végleges alkalmazástól (FileSystemStorage, showDirectoryPicker()) --
// lásd CLAUDE.md "Két fázisú build". Ezen a felületen kívül semmi nem
// tudhat arról, hogy éppen melyik implementáció fut.

import type {
  PatientFolder,
  PatientMasterData,
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
  /**
   * D33: a paciens-adatok.json -- `null`, ha még nem létezik (a hívó ekkor
   * élő fallbackre esik vissza, `domain/paciensAdatok.ts`
   * `megjelenitettTorzsadat`), NEM üres/hiba.
   */
  loadPatientData(patientDir: string): Promise<PatientMasterData | null>;
  /**
   * A törzsadat mentése. Ellentétben a `savePlanLabel`-lel, nincs "üres =
   * törlés" szemantika -- a fájl létrejötte után a törzsadat lezárt, nincs
   * visszaút az élő fallbackre. A `paciens.json` index `nev`-jét is
   * frissíti (`domain/paciensAdatok.ts` `paciensIndexNev`), különben a
   * páciens-listákban a régi név látszana a következő terv-mentésig.
   */
  savePatientData(patientDir: string, data: PatientMasterData): Promise<void>;
  /**
   * Vadonatúj, terv nélküli páciens felvitele (backlog-28, 6. döntés) --
   * generálja a `paciensId`-t és a mappanevet, és mindkét fájlt megírja
   * (`paciens.json` + `paciens-adatok.json`, utóbbi csak a `nev`-vel
   * kitöltve).
   */
  createPatient(nev: string): Promise<PatientFolder>;
}
