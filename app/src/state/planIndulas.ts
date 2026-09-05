// A "kinek induljon az új terv, a páciens ELÉRHETŐ adataival" közös lépése
// (backlog-28): a törzsadatot (paciens-adatok.json) preferálja
// forrásként, ha van; egyébként a páciens legutóbb módosított terv-
// láncának legfrissebb `paciens` pillanatképére esik vissza (a törzsadat
// bevezetése előtti viselkedés). A OsszesTervSection.tsx páciensszintű "Új terv" gombja és a
// NewPlanPage.tsx "Meglévő páciens keresése" előtöltése EZT hívja -- nem
// egymástól függetlenül újraírva --, hogy a két hely ne térjen el egymástól.
//
// A nyelv/pénznem-öröklés (47. tétel) is itt dől el, mindkét
// forrásághoz közösen: a páciens legutóbb VÉGLEGESÍTETT terve adja az
// `OroklottNyelvPenznem`-et, függetlenül attól, hogy a `paciens` blokk
// maga a törzsadatból vagy egy korábbi terv pillanatképéből jön.

import type { OroklottNyelvPenznem } from '../domain/blankPlan';
import { planUjPaciensselTervhez, planUjTorzsadattal } from '../domain/planCopy';
import { verziokFrissessegSzerint } from '../domain/planFolders';
import type { Plan, PlanVersion, PriceList, Settings } from '../domain/types';
import type { PlanStorage } from '../storage/PlanStorage';

/**
 * A páciens terv-láncainak összes verziója közül a legfrissebb (a `paciens`
 * pillanatkép forrása) és a legfrissebb VÉGLEGESÍTETT (a nyelv/pénznem-
 * öröklés forrása) -- csökkenő frissesség szerint bejárva, az első
 * találatnál megállva mindkettőre. Egy olvashatatlan verzió (a `loadPlan`
 * hibázik) NEM szakítja meg a bejárást, csak kimarad -- az öröklés
 * kényelmi funkció, egyetlen sérült verzió sem akadályozhatja meg az "Új
 * terv" indítását. Hiba esetén `listPlans`/`listVersions`-re is üres
 * eredménnyel tér vissza, ugyanezen okból sosem dob.
 */
async function legfrissebbEsOroklesForras(
  storage: PlanStorage,
  patientDir: string,
): Promise<{ legfrissebb: Plan | null; oroklesForras: OroklottNyelvPenznem | null }> {
  let plans;
  try {
    plans = await storage.listPlans(patientDir);
  } catch {
    return { legfrissebb: null, oroklesForras: null };
  }
  const versionsByPlanDir: Record<string, PlanVersion[]> = {};
  await Promise.all(
    plans.map(async (plan) => {
      try {
        versionsByPlanDir[plan.dirName] = await storage.listVersions(patientDir, plan.dirName);
      } catch {
        versionsByPlanDir[plan.dirName] = [];
      }
    }),
  );
  const sorrend = verziokFrissessegSzerint(plans, (planDir) => versionsByPlanDir[planDir] ?? []);

  let legfrissebb: Plan | null = null;
  let oroklesForras: OroklottNyelvPenznem | null = null;
  for (const { planDir, version } of sorrend) {
    if (legfrissebb && oroklesForras) break;
    let plan: Plan;
    try {
      plan = await storage.loadPlan({ patientDir, planDir, versionDir: version.dirName });
    } catch {
      continue;
    }
    if (!legfrissebb) legfrissebb = plan;
    if (!oroklesForras && plan.statusz === 'VEGLEGES') {
      oroklesForras = { nyelv: plan.nyelv, penznem: plan.penznem };
    }
  }
  return { legfrissebb, oroklesForras };
}

export async function ujTervForrasPaciensbol(
  storage: PlanStorage,
  settings: Settings,
  priceList: PriceList,
  patientDir: string,
): Promise<Plan> {
  const adatok = await storage.loadPatientData(patientDir);
  const { legfrissebb, oroklesForras } = await legfrissebbEsOroklesForras(storage, patientDir);

  if (adatok) return planUjTorzsadattal(adatok, settings, priceList, oroklesForras);

  if (!legfrissebb) {
    throw new Error('Ehhez a pácienshez nincs sem törzsadata, sem olvasható korábbi terve.');
  }
  return planUjPaciensselTervhez(legfrissebb, settings, priceList, oroklesForras);
}
