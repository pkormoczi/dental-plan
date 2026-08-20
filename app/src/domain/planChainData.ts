// EGY páciens terv-lánc/verzió adatainak 3-lépéses betöltése
// (listPlans -> listVersions -> loadPlan), amit az OsszesTervSection.tsx
// (patiensenként) és a PatientDetailPage.tsx (backlog-30) is használ --
// ne írd újra egyik hívó oldalon se. Sosem dob: egy sérült lépés
// `unreadable: true`-t állít, a többi sikeresen betöltött adat mellett
// (P1-2 mintája) -- a hívó dönti el, hogyan jelzi ezt (⚠ jelvény,
// "—" az összeg helyén stb.).

import type { Nyelv, Penznem, Plan, PlanFolder, PlanVersion } from './types';
import type { PlanStorage } from '../storage/PlanStorage';

/**
 * Egy verzió végösszege a saját terv.json-jából -- a pénznem és a nyelv is
 * verziónként jön (D21): a `nyelv` a `formatMoney` ezres/tizedes
 * elválasztójához kell (52. tétel), nem csak megjelenítő metaadat.
 */
export interface VersionTotal {
  fizetendo: number;
  penznem: Penznem;
  nyelv: Nyelv;
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
      totalsByVersion[key] = {
        fizetendo: res.value.osszesitok.fizetendo,
        penznem: res.value.penznem,
        nyelv: res.value.nyelv,
      };
    } else {
      unreadable = true;
    }
  });

  return { plans, versionsByPlan, plansByVersion, totalsByVersion, unreadable };
}

/**
 * EGY lánc "rendezési dátuma" (46. tétel, D186): a legfrissebb VÉGLEGESÍTETT
 * verziójának `isoDate`-je -- a MÁR betöltött `plansByVersion`-ből, nincs új
 * storage-hívás. `null`, ha a láncnak nincs VEGLEGES verziója (ma nem
 * fordul elő: a `storage.savePlan()` egyetlen hívója a PreviewPage.tsx
 * véglegesítés-ága -- ez a backlog-48 még nem létező PISZKOZAT-státuszú
 * mentett verziójára készül elő). Egy olvashatatlan verzió (nincs a
 * `plansByVersion`-ben) best-effort VEGLEGES-nek számít, hogy egy sérült
 * fájl ne dobja csendben a láncot a rendezés végére.
 */
export function legfrissebbVeglegesVerzio(
  planDir: string,
  versions: PlanVersion[],
  plansByVersion: Record<string, Plan>,
): PlanVersion | null {
  let best: PlanVersion | null = null;
  for (const version of versions) {
    const plan = plansByVersion[versionDataKey(planDir, version.dirName)];
    const veglegesnekSzamit = plan ? plan.statusz === 'VEGLEGES' : true;
    if (!veglegesnekSzamit) continue;
    if (!best || version.isoDate > best.isoDate || (version.isoDate === best.isoDate && version.verzio > best.verzio)) {
      best = version;
    }
  }
  return best;
}

/**
 * A láncok listája a legfrissebb VÉGLEGESÍTETT verzió dátuma szerint
 * csökkenően (D186) -- `legfrissebbVeglegesVerzio()`-val, a `plans`
 * másolatán (nem mutálja a bemenetet). Kulcs nélküli lánc (nincs VEGLEGES
 * verziója) a lista VÉGÉRE kerül; holtversenynél a nagyobb `verzio`, majd
 * a `planDir` (`localeCompare('hu')`) dönt -- nem a `sort` stabilitására
 * támaszkodva.
 */
export function rendezettLancok(
  plans: PlanFolder[],
  versionsByPlan: Record<string, PlanVersion[]>,
  plansByVersion: Record<string, Plan>,
): PlanFolder[] {
  return [...plans].sort((a, b) => {
    const va = legfrissebbVeglegesVerzio(a.dirName, versionsByPlan[a.dirName] ?? [], plansByVersion);
    const vb = legfrissebbVeglegesVerzio(b.dirName, versionsByPlan[b.dirName] ?? [], plansByVersion);
    if (!va && !vb) return a.dirName.localeCompare(b.dirName, 'hu');
    if (!va) return 1;
    if (!vb) return -1;
    if (va.isoDate !== vb.isoDate) return va.isoDate < vb.isoDate ? 1 : -1;
    if (va.verzio !== vb.verzio) return vb.verzio - va.verzio;
    return a.dirName.localeCompare(b.dirName, 'hu');
  });
}
