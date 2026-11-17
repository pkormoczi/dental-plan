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
import { utvonal, type FajlPrimitivek } from './fajlPrimitivek';
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
  utvonal(tervMappaUt(patientDir, planDir), versionDir, 'terv.json');
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

export interface FajlTaroloOpciok {
  /** A verziómappa PDF-fájljának neve. */
  pdfFajlnev: string;
  /** A sikertelen `savePlan` üzenete -- a tároló-specifikus teendővel. */
  mentesHibaUzenet: string;
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
    const versions: PlanVersion[] = [];
    for (const dirName of dirs) {
      const parsed = parseVersionDirName(dirName);
      if (!parsed) continue;
      const indok = ervenytelenitesek[dirName];
      versions.push({ dirName, ...parsed, ...(indok ? { ervenytelenites: indok } : {}) });
    }
    return versions.sort((a, b) => a.verzio - b.verzio);
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
    const raw = await this.prim.olvasSzoveg(tervUt(ref.patientDir, ref.planDir, ref.versionDir));
    if (raw == null) {
      throw new Error(`Nincs terv itt: ${ref.patientDir}/${ref.planDir}/${ref.versionDir}`);
    }
    const plan = parseJson<Plan>(raw, 'terv.json');
    assertKnownSchemaVersion(plan, 'terv.json');
    assertPlanShape(plan, 'terv.json');
    return plan;
  }

  async savePlanLabel(patientDir: string, planDir: string, tervCim: string): Promise<void> {
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
  }

  async savePlanErvenytelenites(
    patientDir: string,
    planDir: string,
    versionDir: string,
    indok: string,
  ): Promise<void> {
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
  async savePlan(plan: Plan, pdf: Uint8Array, ujLancCim?: string): Promise<PlanRef> {
    return this.enqueue(() => this.doSavePlan(plan, pdf, ujLancCim));
  }

  private async doSavePlan(plan: Plan, pdf: Uint8Array, ujLancCim?: string): Promise<PlanRef> {
    // Írás előtt is validálunk, nem csak betöltéskor: ez a hívás adja ki a
    // véglegesített, append-only verziómappát -- egy tört pénzértékkel ide
    // beírt terv.json később csak betöltési hibaként derülne ki, amikor már
    // nem írható felül. A piszkozat-autosave szándékosan NEM validál.
    assertPlanShape(plan, 'terv.json');
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
      const priceList = await this.aktualisArlistaVagySeed();
      planDir = buildPlanDirName(
        megjelenitettTervCim(ujLancCim?.trim() || null, plan, priceList),
        tervId,
      );
    }

    const existingVersions = await this.listVersions(patientDir, planDir);
    const existingDirNames = existingVersions.map((v) => v.dirName);
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
    const tervFajl = tervUt(patientDir, planDir, versionDir);
    const pdfFajl = utvonal(tervMappaUt(patientDir, planDir), versionDir, this.opciok.pdfFajlnev);
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

    try {
      await this.prim.irSzoveg(tervFajl, JSON.stringify(finalPlan));
      await this.prim.irBajt(pdfFajl, pdf);
      await this.prim.irSzoveg(pacRekordUt(patientDir), JSON.stringify(patientRecord));
    } catch (err) {
      // A terv- és a PDF-fájl frissen létrehozott ebben a hívásban
      // (assertVersionDirAvailable fentebb ezt garantálja) -- a rollback
      // biztonságos, nem törölhet egy korábbi verziót. A paciens.json-t
      // NEM töröljük: az írása atomi, tehát ha ő hasalt el, korábbi
      // tartalma (ha volt) változatlan maradt.
      await this.prim.torol(tervFajl);
      await this.prim.torol(pdfFajl);
      throw new Error(this.opciok.mentesHibaUzenet, { cause: err });
    }

    return { patientDir, planDir, versionDir };
  }

  async loadPlanPdf(ref: PlanRef): Promise<Uint8Array | null> {
    return this.prim.olvasBajt(
      utvonal(tervMappaUt(ref.patientDir, ref.planDir), ref.versionDir, this.opciok.pdfFajlnev),
    );
  }

  async loadPriceList(): Promise<PriceList> {
    const raw = await this.prim.olvasSzoveg(ARLISTA_FAJL);
    if (raw == null) throw new Error('Az árlista még nincs inicializálva.');
    const priceList = parseJson<PriceList>(raw, ARLISTA_FAJL);
    assertKnownSchemaVersion(priceList, ARLISTA_FAJL);
    assertPriceListShape(priceList, ARLISTA_FAJL);
    return priceList;
  }

  async savePriceList(pl: PriceList): Promise<void> {
    return this.enqueue(() => this.prim.irSzoveg(ARLISTA_FAJL, JSON.stringify(pl)));
  }

  async loadSettings(): Promise<Settings> {
    const raw = await this.prim.olvasSzoveg(BEALLITASOK_FAJL);
    if (raw == null) throw new Error('A beállítások még nincsenek inicializálva.');
    const settings = parseJson<Settings>(raw, BEALLITASOK_FAJL);
    assertKnownSchemaVersion(settings, BEALLITASOK_FAJL);
    assertSettingsShape(settings, BEALLITASOK_FAJL);
    return settings;
  }

  async saveSettings(s: Settings): Promise<void> {
    return this.enqueue(() => this.prim.irSzoveg(BEALLITASOK_FAJL, JSON.stringify(s)));
  }

  async loadTemplate(name: string): Promise<string> {
    const raw = await this.prim.olvasSzoveg(sablonUt(name));
    if (raw == null) throw new Error(`Nincs ilyen sablon: ${name}`);
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
  async saveTemplate(name: string, body: string): Promise<string> {
    const base = name.replace(/\.md$/, '').replace(/-v\d+$/, '');
    const latest = await this.latestTemplateFile(base);
    const fileName = latest ?? `${base}-v1.md`;
    await this.prim.irSzoveg(sablonUt(fileName), body);
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
    const latest = await this.latestTemplateFile(base);
    if (!latest) throw new Error(`Nincs "${base}" kezdetű sablon.`);
    return { name: latest, body: (await this.prim.olvasSzoveg(sablonUt(latest)))! };
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
  async savePatientData(patientDir: string, data: PatientMasterData): Promise<void> {
    return this.enqueue(async () => {
      await this.prim.irSzoveg(pacAdatUt(patientDir), JSON.stringify(data));
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
      const paciensId = generateId();
      const patientDir = buildPatientDirName(nev, paciensId);
      const utolsoAktivitas = ujAktivitas('letrehozva');
      const record: PatientRecord = { schemaVersion: 1, paciensId, nev, utolsoAktivitas };
      const data = { ...uresTorzsadat(nev, paciensId), ...kezdoAdatok };
      await this.prim.irSzoveg(pacRekordUt(patientDir), JSON.stringify(record));
      await this.prim.irSzoveg(pacAdatUt(patientDir), JSON.stringify(data));
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
