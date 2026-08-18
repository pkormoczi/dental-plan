// EGY páciens terv-lánc/verzió adatainak 3-lépéses betöltése
// (listPlans -> listVersions -> loadPlan), amit a PlanHistoryPage.tsx
// (patiensenként) és a PatientDetailPage.tsx (backlog-30) is használ --
// ne írd újra egyik hívó oldalon se. Sosem dob: egy sérült lépés
// `unreadable: true`-t állít, a többi sikeresen betöltött adat mellett
// (P1-2 mintája) -- a hívó dönti el, hogyan jelzi ezt (⚠ jelvény,
// "—" az összeg helyén stb.).

import type { Penznem, Plan, PlanFolder, PlanVersion } from './types';
import type { PlanStorage } from '../storage/PlanStorage';

/** Egy verzió végösszege a saját terv.json-jából -- a pénznem verziónként jön (D21). */
export interface VersionTotal {
  fizetendo: number;
  penznem: Penznem;
}

export interface PlanChainData {
  plans: PlanFolder[];
  versionsByPlan: Record<string, PlanVersion[]>; // planDir -> versions
  plansByVersion: Record<string, Plan>; // "planDir/versionDir" -> Plan
  totalsByVersion: Record<string, VersionTotal>; // "planDir/versionDir" -> total
  /** Igaz, ha legalább egy terv-lánc vagy verzió listázása/betöltése hibázott. */
  unreadable: boolean;
}

export function versionDataKey(planDir: string, versionDir: string): string {
  return `${planDir}/${versionDir}`;
}

export async function loadPlanChainData(
  storage: PlanStorage,
  patientDir: string,
): Promise<PlanChainData> {
  let plans: PlanFolder[];
  try {
    plans = await storage.listPlans(patientDir);
  } catch {
    return { plans: [], versionsByPlan: {}, plansByVersion: {}, totalsByVersion: {}, unreadable: true };
  }

  let unreadable = false;

  const versionsResults = await Promise.allSettled(
    plans.map((plan) => storage.listVersions(patientDir, plan.dirName)),
  );
  const versionsByPlan: Record<string, PlanVersion[]> = {};
  versionsResults.forEach((res, i) => {
    const planDir = plans[i].dirName;
    if (res.status === 'fulfilled') versionsByPlan[planDir] = res.value;
    else unreadable = true;
  });

  const versionRefs = plans.flatMap((plan) =>
    (versionsByPlan[plan.dirName] ?? []).map((v) => ({ planDir: plan.dirName, versionDir: v.dirName })),
  );
  const planResults = await Promise.allSettled(
    versionRefs.map((ref) =>
      storage.loadPlan({ patientDir, planDir: ref.planDir, versionDir: ref.versionDir }),
    ),
  );
  const plansByVersion: Record<string, Plan> = {};
  const totalsByVersion: Record<string, VersionTotal> = {};
  planResults.forEach((res, i) => {
    const ref = versionRefs[i];
    if (res.status === 'fulfilled') {
      const key = versionDataKey(ref.planDir, ref.versionDir);
      plansByVersion[key] = res.value;
      // A mentett osszesitok az igazság, nincs újraszámolás -- az
      // eltérés-őr (osszesitokElter) ott fut, ahol ténylegesen
      // kockázatos: szerkesztőbe töltéskor (AppState.tsx).
      totalsByVersion[key] = { fizetendo: res.value.osszesitok.fizetendo, penznem: res.value.penznem };
    } else {
      unreadable = true;
    }
  });

  return { plans, versionsByPlan, plansByVersion, totalsByVersion, unreadable };
}
