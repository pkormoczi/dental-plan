// Segédfüggvény a Korábbi tervek fájának (páciens → terv → verzió, D29)
// "legutóbb módosított lánc legfrissebb verziója" kiválasztásához -- ezt
// használja a PlanHistoryPage páciensszintű "Új terv" gombja (melyik verzió
// `paciens` blokkját vigye tovább) és az /uj-terv "Meglévő páciens
// keresése" előtöltése is, hogy a két hely ne térjen el egymástól.

import type { PlanFolder, PlanVersion } from './types';

export interface PlanVersionLocation {
  planDir: string;
  version: PlanVersion;
}

/**
 * Az összes terv-lánc összes verziója, a `keltezes`-t kódoló `isoDate`
 * szerint csökkenően, holtversenynél a nagyobb `verzio`, majd a `planDir`
 * (`localeCompare('hu')`) szerint -- a `rendezettLancok()` determinizmus-
 * mintája (`planChainData.ts`). A 47. tétel (D534) öröklési bejárásának
 * alapja: onnan indulva csökkenő sorrendben kell megtalálni az első
 * VEGLEGES verziót, nem csak a legfrissebbet.
 */
export function verziokFrissessegSzerint(
  plans: PlanFolder[],
  versionsFor: (planDir: string) => PlanVersion[],
): PlanVersionLocation[] {
  const all: PlanVersionLocation[] = [];
  for (const plan of plans) {
    for (const version of versionsFor(plan.dirName)) {
      all.push({ planDir: plan.dirName, version });
    }
  }
  return all.sort((a, b) => {
    if (a.version.isoDate !== b.version.isoDate) return a.version.isoDate < b.version.isoDate ? 1 : -1;
    if (a.version.verzio !== b.version.verzio) return b.version.verzio - a.version.verzio;
    return a.planDir.localeCompare(b.planDir, 'hu');
  });
}

/**
 * Az összes terv-lánc összes verziója közül a legfrissebb (a `keltezes`-t
 * kódoló `isoDate` szerint, holtversenynél a nagyobb `verzio` szerint) --
 * `null`, ha a páciensnek még egyetlen olvasható verziója sincs.
 */
export function latestVersionAcrossPlans(
  plans: PlanFolder[],
  versionsFor: (planDir: string) => PlanVersion[],
): PlanVersionLocation | null {
  return verziokFrissessegSzerint(plans, versionsFor)[0] ?? null;
}

/**
 * EGY terv-lánc legfrissebb verziója (`latestVersionAcrossPlans` egy
 * láncra szűkített komparátora) -- `null`, ha a láncnak nincs olvasható
 * verziója. A `versions` tömb sorrendjétől független (a `DemoStorage`
 * `verzio` szerint növekvőn ad vissza, de ez nem szerződés) -- a lánc
 * fejlécének (46. tétel, D238) EZ a "legfrissebb verzió" forrása, nem
 * `versions[versions.length - 1]`.
 */
export function legfrissebbVerzio(versions: PlanVersion[]): PlanVersion | null {
  let best: PlanVersion | null = null;
  for (const version of versions) {
    if (!best || version.isoDate > best.isoDate || (version.isoDate === best.isoDate && version.verzio > best.verzio)) {
      best = version;
    }
  }
  return best;
}
