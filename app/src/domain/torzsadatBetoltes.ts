// EGY páciens megjelenítendő törzsadatának betöltése -- a `planChainData.ts`
// mintájára egy `PlanStorage`-ot paraméterként kapó domain modul (a
// `paciensAdatok.ts` marad tisztán pure, a `DemoStorage` is importálja).
// A `loadMegjelenitettTorzsadat` a Kezdőlap recent listája (max 5 páciens,
// eager) alatt fut. A `loadTorzsadatok` ugyanezt TÖBB páciensre futtatja --
// egyrészt a Pácienslista TELJES, látható listájára egyszerre, a
// `OsszesTervSection` végösszeg-betöltésének mintájára, másrészt egy
// szűk jelölt-körre, a `domain/paciensDuplikacio.ts` 2. fázisának
// betöltőjeként.

import { megjelenitettTorzsadat } from './paciensAdatok';
import { latestVersionAcrossPlans } from './planFolders';
import type { PatientFolder, PatientMasterData, Plan, PlanVersion } from './types';
import type { PlanStorage } from '../storage/PlanStorage';
import { generateId, nextVersionNumber } from '../storage/paths';

/**
 * Egy páciens legfrissebb terv-verziója (listPlans -> listVersions ->
 * latestVersionAcrossPlans -> EGY loadPlan) -- `null`, ha még nincs
 * egyetlen olvasható verziója sem. Szándékosan NEM `loadPlanChainData`: az
 * minden lánc MINDEN verzióját betölti, ide egyetlen `paciens` pillanatkép
 * kell a `megjelenitettTorzsadat()` fallback-ágához. Dob hiba esetén -- a
 * hívó dönti el, hogyan jelzi (lásd `loadMegjelenitettTorzsadat`, ami már
 * sosem dob).
 */
export async function loadUtolsoTerv(storage: PlanStorage, patientDir: string): Promise<Plan | null> {
  const plans = await storage.listPlans(patientDir);
  const versionsByPlanDir: Record<string, PlanVersion[]> = {};
  await Promise.all(
    plans.map(async (plan) => {
      versionsByPlanDir[plan.dirName] = await storage.listVersions(patientDir, plan.dirName);
    }),
  );
  const latest = latestVersionAcrossPlans(plans, (planDir) => versionsByPlanDir[planDir] ?? []);
  if (!latest) return null;
  return storage.loadPlan({ patientDir, planDir: latest.planDir, versionDir: latest.version.dirName });
}

export interface BetoltottTorzsadat {
  patient: PatientFolder;
  /** `megjelenitettTorzsadat()` eredménye -- hiba esetén is a legjobb elérhető (név-alapú) tartalék. */
  torzsadat: PatientMasterData;
  /** `null`, ha minden lépés sikerült; egyébként a doki felé mutatható üzenet. */
  hiba: string | null;
}

/**
 * `megjelenitettTorzsadat()` betöltve, EGY páciensre -- sosem dob (P1-2
 * mintája, `planChainData.ts`): egy sérült `paciens-adatok.json` vagy egy
 * olvashatatlan terv-lánc a `hiba` mezőben jelenik meg, nem üríti ki a
 * hívó teljes listáját.
 */
export async function loadMegjelenitettTorzsadat(
  storage: PlanStorage,
  patient: PatientFolder,
): Promise<BetoltottTorzsadat> {
  const [masterResult, planResult] = await Promise.allSettled([
    storage.loadPatientData(patient.dirName),
    loadUtolsoTerv(storage, patient.dirName),
  ]);

  const adatok = masterResult.status === 'fulfilled' ? masterResult.value : null;
  const utolsoTerv = planResult.status === 'fulfilled' ? planResult.value : null;

  const hibaUzenet = (r: PromiseRejectedResult): string =>
    r.reason instanceof Error ? r.reason.message : 'A törzsadat betöltése váratlanul meghiúsult.';
  const hibak = [masterResult, planResult]
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(hibaUzenet);

  return {
    patient,
    torzsadat: megjelenitettTorzsadat(adatok, utolsoTerv, patient),
    hiba: hibak.length > 0 ? hibak.join(' ') : null,
  };
}

/**
 * `loadMegjelenitettTorzsadat()` TÖBB páciensre, `dirName` szerint
 * kulcsolva -- a duplikáció-detektálás jelölt-körének betöltője.
 * Sosem dob (a `loadMegjelenitettTorzsadat` maga sem dob), egy sérült
 * páciens `hiba` mezőt kap, a többit nem érinti (P1-2 mintája).
 */
export async function loadTorzsadatok(
  storage: PlanStorage,
  patients: PatientFolder[],
): Promise<Record<string, BetoltottTorzsadat>> {
  const betoltottek = await Promise.all(
    patients.map((patient) => loadMegjelenitettTorzsadat(storage, patient)),
  );
  const eredmeny: Record<string, BetoltottTorzsadat> = {};
  betoltottek.forEach((b, i) => {
    eredmeny[patients[i].dirName] = b;
  });
  return eredmeny;
}

/**
 * A draft-hoz tartozó páciensmappa nevének feloldása a master-összevetéshez
 * (backlog-40). A `piszkozatPatientDir` (`state/AppState.tsx`)
 * best-effort ismert -- lehet `null` (pl. funkció előtti perzisztált
 * piszkozat). Tartalék: `plan.paciensId` -> `listPatients()` -> `dirName`,
 * ugyanaz a feloldás, mint amit a `DemoStorage.doSavePlan()` is használ
 * véglegesítéskor. Sosem dob -- egy sikertelen listázás egyszerűen
 * feloldatlan (`null`) marad, a hívó ilyenkor nem mutatja a törzsadat-kártyát.
 */
export async function feloldPatientDir(
  storage: PlanStorage,
  piszkozatPatientDir: string | null,
  paciensId: string | undefined,
): Promise<string | null> {
  if (piszkozatPatientDir) return piszkozatPatientDir;
  if (!paciensId) return null;
  try {
    const patients = await storage.listPatients();
    return patients.find((p) => p.paciensId === paciensId)?.dirName ?? null;
  } catch {
    return null;
  }
}

export interface TervCimkeRef {
  patientDir: string;
  planDir: string;
  /** `null` = nincs terv-cimke.json, a UI az élő javaslatot mutatja. */
  tervCim: string | null;
}

/**
 * A `TervCimField` (backlog-51) lánc-mappa- és tárolt-címke-feloldása,
 * a `feloldPatientDir()` mintáján. Üres `tervId`-nél (vadonatúj, még sosem
 * mentett lánc) `null`-t ad, STORAGE-HÍVÁS NÉLKÜL -- nincs `planDir`, amihez
 * a `terv-cimke.json`-t keresni lehetne. Sosem dob (P1-2 minta): egy
 * feloldhatatlan `patientDir` vagy egy dobó `listPlans` is `null`-t ad, a
 * hívó ilyenkor a `javasoltTervCim()` élő javaslatára esik vissza.
 */
export async function feloldTervCimke(
  storage: PlanStorage,
  piszkozatPatientDir: string | null,
  paciensId: string | undefined,
  tervId: string,
): Promise<TervCimkeRef | null> {
  if (!tervId) return null;
  const patientDir = await feloldPatientDir(storage, piszkozatPatientDir, paciensId);
  if (!patientDir) return null;
  try {
    const plans = await storage.listPlans(patientDir);
    const plan = plans.find((p) => p.tervId === tervId);
    if (!plan) return null;
    return { patientDir, planDir: plan.dirName, tervCim: plan.tervCim };
  } catch {
    return null;
  }
}

export interface FoglaltAzonosito {
  /** Vadonatúj lánchoz frissen generált, egyébként a lánc meglévő azonosítója. */
  tervId: string;
  /** A lánc következő szabad verziószáma -- vadonatúj lánchoz 1. */
  verzio: number;
}

/**
 * A most kiadandó nyomtatvány azonosítójának ELŐZETES feloldása, a
 * `feloldTervCimke()` mintáján, sosem dobva. Azért kell, mert a PDF bájtjai
 * az előnézetben, a `savePlan()` ELŐTT készülnek el: enélkül a papír fejléce
 * a piszkozat 0-s verzióját és üres `tervId`-jét mutatná, a mentett
 * `terv.json` viszont a storage által kiosztott valódit.
 *
 * A verziószám a lánc VERZIÓMAPPÁIBÓL jön (`nextVersionNumber`), nem a
 * forrásverzió +1-e -- egy régebbi verzióból nyitott új verzió is a lánc
 * következő szabad számát kapja, ahogy a `doSavePlan()` is számol.
 *
 * `null` = a foglalás nem oldható fel (feloldhatatlan páciensmappa, ismeretlen
 * lánc vagy dobó listázás); a hívó ilyenkor nem ad ki papírt.
 */
export async function feloldKovetkezoAzonosito(
  storage: PlanStorage,
  piszkozatPatientDir: string | null,
  paciensId: string | undefined,
  tervId: string,
): Promise<FoglaltAzonosito | null> {
  // Vadonatúj lánc: nincs mit listázni, a storage is friss id-t osztana ki.
  if (!tervId) return { tervId: generateId(), verzio: 1 };
  const patientDir = await feloldPatientDir(storage, piszkozatPatientDir, paciensId);
  if (!patientDir) return null;
  try {
    const plans = await storage.listPlans(patientDir);
    const plan = plans.find((p) => p.tervId === tervId);
    if (!plan) return null;
    const versions = await storage.listVersions(patientDir, plan.dirName);
    return { tervId, verzio: nextVersionNumber(versions.map((v) => v.dirName)) };
  } catch {
    return null;
  }
}
