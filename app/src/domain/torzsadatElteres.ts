// Terv-lánc/verzió lista jelzése a törzsadat <-> mentett pillanatkép
// mezőszintű eltéréséről -- a `masterSnapshotDiff()` (domain/masterSnapshotDiff.ts)
// ÚJRAHASZNÁLATÁVAL, komponálva a `planChainData.ts` `versionDataKey()`-jével.
// Nincs második összehasonlító logika itt.

import { type MezoElteres, masterSnapshotDiff } from './masterSnapshotDiff';
import { paciensTorzsadatbol } from './paciensAdatok';
import type { Paciens, PatientMasterData, Plan } from './types';

/**
 * Egy `Paciens` pillanatkép (mentett verzió vagy aktív piszkozat) eltérése a
 * VALÓDI, lezárt törzsadattól. `master === null`-nál (nincs
 * `paciens-adatok.json`, vagy nem olvasható) üres listát ad -- a
 * `megjelenitettTorzsadat()` élő fallbackje TILOS itt, mert az minden
 * régebbi verziót eltérőnek mutatna a puszta korkülönbség miatt.
 */
export function paciensElteres(master: PatientMasterData | null, snapshot: Paciens): MezoElteres[] {
  if (!master) return [];
  return masterSnapshotDiff(paciensTorzsadatbol(master), snapshot);
}

/**
 * `paciensElteres()` a `plansByVersion` MINDEN betöltött verziójára,
 * `versionDataKey()` szerint kulcsolva. Egy be nem töltött (olvashatatlan)
 * verzió eleve nincs a `plansByVersion`-ben, ezért némán kimarad -- nincs
 * jelzés, nem hibaállapot.
 */
export function verzioElteresek(
  master: PatientMasterData | null,
  plansByVersion: Record<string, Plan>,
): Record<string, MezoElteres[]> {
  const result: Record<string, MezoElteres[]> = {};
  if (!master) return result;
  for (const [key, plan] of Object.entries(plansByVersion)) {
    const elteres = paciensElteres(master, plan.paciens);
    if (elteres.length > 0) result[key] = elteres;
  }
  return result;
}
