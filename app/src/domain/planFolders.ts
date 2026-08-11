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
 * Az összes terv-lánc összes verziója közül a legfrissebb (a `keltezes`-t
 * kódoló `isoDate` szerint, holtversenynél a nagyobb `verzio` szerint) --
 * `null`, ha a páciensnek még egyetlen olvasható verziója sincs.
 */
export function latestVersionAcrossPlans(
  plans: PlanFolder[],
  versionsFor: (planDir: string) => PlanVersion[],
): PlanVersionLocation | null {
  let best: PlanVersionLocation | null = null;
  for (const plan of plans) {
    for (const version of versionsFor(plan.dirName)) {
      if (
        !best ||
        version.isoDate > best.version.isoDate ||
        (version.isoDate === best.version.isoDate && version.verzio > best.version.verzio)
      ) {
        best = { planDir: plan.dirName, version };
      }
    }
  }
  return best;
}
