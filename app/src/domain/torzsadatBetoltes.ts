// EGY páciens megjelenítendő törzsadatának betöltése -- a `planChainData.ts`
// mintájára egy `PlanStorage`-ot paraméterként kapó domain modul (a
// `paciensAdatok.ts` marad tisztán pure, a `DemoStorage` is importálja).
// A `loadMegjelenitettTorzsadat` a Kezdőlap recent listája (max 5 páciens,
// eager) alatt fut. A `loadTorzsadatok` ugyanezt TÖBB páciensre futtatja --
// egyrészt a Pácienslista (D43) TELJES, látható listájára egyszerre, a
// `OsszesTervSection` végösszeg-betöltésének mintájára, másrészt (D42) egy
// szűk jelölt-körre, a `domain/paciensDuplikacio.ts` 2. fázisának
// betöltőjeként.

import { megjelenitettTorzsadat } from './paciensAdatok';
import { latestVersionAcrossPlans } from './planFolders';
import type { PatientFolder, PatientMasterData, Plan, PlanVersion } from './types';
import type { PlanStorage } from '../storage/PlanStorage';

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
 * kulcsolva -- a duplikáció-detektálás (D42) jelölt-körének betöltője.
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
 * (backlog-40). A `piszkozatPatientDir` (D37, `state/AppState.tsx`)
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
