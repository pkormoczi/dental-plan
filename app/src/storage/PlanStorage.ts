// Ez a réteg választja el a mockupot (DemoStorage, localStorage)
// a végleges alkalmazástól (FileSystemStorage, showDirectoryPicker()) --
// lásd PRODUCT.md § Két fázis. Ezen a felületen kívül semmi nem
// tudhat arról, hogy éppen melyik implementáció fut.

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

export interface PlanStorage {
  init(): Promise<void>;
  listPatients(): Promise<PatientFolder[]>;
  /** Egy páciens terv-láncai -- a köztes szint a verziók felett. */
  listPlans(patientDir: string): Promise<PlanFolder[]>;
  listVersions(patientDir: string, planDir: string): Promise<PlanVersion[]>;
  loadPlan(ref: PlanRef): Promise<Plan>;
  /**
   * Mindig új verziómappát hoz létre -- soha nem ír felül meglévőt.
   * `ujLancCim` a doki által a véglegesítés előtt megadott egyéni terv-cím --
   * KIZÁRÓLAG vadonatúj lánc (üres `plan.tervId`) mappanév-javaslatánál
   * hasznosul, a `megjelenitettTervCim()`-mel megegyező precedenciával (kézi
   * cím > automatikus javaslat); egy már létező lánc újabb verziójánál
   * hatástalan, a `planDir` a lánc létrehozásakor örökre fix marad.
   */
  savePlan(plan: Plan, pdf: Uint8Array, ujLancCim?: string): Promise<PlanRef>;
  /**
   * A terv-cimke.json-t írja/törli -- a verziómappákon KÍVÜL él, az append-only
   * szabály rá nem vonatkozik. Üres/whitespace `tervCim` törli a fájlt (vissza az élő
   * auto-javaslatra, `domain/tervCim.ts`).
   */
  savePlanLabel(patientDir: string, planDir: string, tervCim: string): Promise<void>;
  loadPriceList(): Promise<PriceList>;
  /**
   * Az implementáció felelős azért, hogy egymást gyorsan követő
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
  /**
   * Felülírja a base jelenleg legfrissebb -vN.md fájlját (ha még nincs egy
   * sem, -v1.md-t hoz létre), és ennek a fájlnevét adja vissza -- a fájlnév
   * innentől állandó, a korábbi szövegváltozatnak nincs másik forrása, mint
   * egy már véglegesített terv mentett PDF-je.
   */
  saveTemplate(name: string, body: string): Promise<string>;
  /**
   * A paciens-adatok.json -- `null`, ha még nem létezik (a hívó ekkor
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
   * Vadonatúj, terv nélküli páciens felvitele (backlog-28, 6. döntés;
   * backlog-36 a `kezdoAdatok`-kal bővítette). Generálja a
   * `paciensId`-t és a mappanevet, és mindkét fájlt megírja (`paciens.json`
   * + `paciens-adatok.json`) EGY logikailag atomi lépésben -- nem
   * `createPatient` + utólagos `savePatientData`, mert az utóbbi
   * `ujAktivitas('torzsadat-mentve')`-t írna egy frissen létrehozott
   * páciensre (hamis aktivitás-típus egy `createPatient`-hívásra).
   */
  createPatient(
    nev: string,
    kezdoAdatok?: Pick<Paciens, 'szuletesiIdo' | 'telefon'>,
  ): Promise<PatientFolder>;
  /**
   * A teljes páciensmappa törlése (backlog-41) -- az interfész ELSŐ
   * destruktív metódusa. Az előfeltétel (nincs véglegesített terve, nincs
   * rá mutató aktív draft) NEM ennek a metódusnak a felelőssége, hanem a
   * hívóé, `domain/paciensTorles.ts` `paciensTorlesAkadaly()`-jával
   * eldöntve -- ez itt feltétel nélkül végrehajt. Ismeretlen `patientDir`-re
   * **dob**, nem no-op: egy néma nyelés elfedne egy hívói hibát egy
   * visszafordíthatatlan műveletnél (ellentétben pl. a `loadPatientData`
   * `null`-jával, ami egy VÁRT, gyakori állapot).
   */
  deletePatient(patientDir: string): Promise<void>;
}
