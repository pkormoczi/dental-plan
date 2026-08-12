// A "kinek induljon az új terv, a páciens ELÉRHETŐ adataival" közös lépése
// (backlog-28): a törzsadatot (paciens-adatok.json, D33) preferálja
// forrásként, ha van; egyébként a páciens legutóbb módosított terv-
// láncának legfrissebb `paciens` pillanatképére esik vissza (a D29 előtti
// viselkedés). A PlanHistoryPage.tsx páciensszintű "Új terv" gombja és a
// NewPlanPage.tsx "Meglévő páciens keresése" előtöltése EZT hívja -- nem
// egymástól függetlenül újraírva --, hogy a két hely ne térjen el egymástól.

import { planUjPaciensselTervhez, planUjTorzsadattal } from '../domain/planCopy';
import { latestVersionAcrossPlans } from '../domain/planFolders';
import type { Plan, PlanVersion, PriceList, Settings } from '../domain/types';
import type { PlanStorage } from '../storage/PlanStorage';

export async function ujTervForrasPaciensbol(
  storage: PlanStorage,
  settings: Settings,
  priceList: PriceList,
  patientDir: string,
): Promise<Plan> {
  const adatok = await storage.loadPatientData(patientDir);
  if (adatok) return planUjTorzsadattal(adatok, settings, priceList);

  const plans = await storage.listPlans(patientDir);
  const versionsByPlanDir: Record<string, PlanVersion[]> = {};
  await Promise.all(
    plans.map(async (plan) => {
      versionsByPlanDir[plan.dirName] = await storage.listVersions(patientDir, plan.dirName);
    }),
  );
  const latest = latestVersionAcrossPlans(plans, (planDir) => versionsByPlanDir[planDir] ?? []);
  if (!latest) {
    throw new Error('Ehhez a pácienshez nincs sem törzsadata, sem olvasható korábbi terve.');
  }
  const plan = await storage.loadPlan({
    patientDir,
    planDir: latest.planDir,
    versionDir: latest.version.dirName,
  });
  return planUjPaciensselTervhez(plan, settings, priceList);
}
