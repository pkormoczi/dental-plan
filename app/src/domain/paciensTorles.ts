// Páciens törlésének feltételei (backlog-41). Tiszta függvény,
// nincs I/O -- a hívó (`PatientDetailPage.tsx`) adja a MÁR betöltött
// `PlanChainData`-t (`domain/planChainData.ts`) és a saját aktív draftjának
// hovatartozását, ugyanúgy, mint pl. a `legutobbAktivPaciensek()`.

import type { PlanChainData } from './planChainData';

export type TorlesAkadaly = 'veglegesitett-terv' | 'aktiv-piszkozat' | 'nem-olvashato';

/**
 * `null`, ha a páciens törölhető; egyébként az akadály oka, ebben a
 * precedencia-sorrendben:
 *
 * 1. `veglegesitett-terv` -- van legalább egy `statusz === 'VEGLEGES'`
 *    verziója. SZÁNDÉKOSAN `statusz`, nem `tervId` a diszkriminátor --
 *    ellentétben a `piszkozat.ts` `piszkozatTartalmas()` szabályával
 *    ("már mentve volt" = `tervId`), ami más kérdésre válaszol (van-e kár
 *    elveszíteni való piszkozat-tartalom, nem hogy a mentett terv aláírt-e).
 * 2. `aktiv-piszkozat` -- a doki JELENLEGI, mentetlen piszkozata ehhez a
 *    pácienshez tartozik (a hívó a `feloldPatientDir()`-rel dönti el).
 * 3. `nem-olvashato` -- `chainData` hiányzik vagy `unreadable`. Enélkül egy
 *    sérült, valójában VÉGLEGESÍTETT verzió (ami emiatt hiányzik a
 *    `plansByVersion`-ből) csendben "nincs véglegesített terve"-ként
 *    értékelődne, és engedné a törlést.
 */
export function paciensTorlesAkadaly(
  chainData: PlanChainData | null,
  sajatAktivPiszkozat: boolean,
): TorlesAkadaly | null {
  if (chainData != null) {
    const vanVeglegesitett = Object.values(chainData.plansByVersion).some(
      (plan) => plan.statusz === 'VEGLEGES',
    );
    if (vanVeglegesitett) return 'veglegesitett-terv';
  }

  if (sajatAktivPiszkozat) return 'aktiv-piszkozat';

  if (chainData == null || chainData.unreadable) return 'nem-olvashato';

  return null;
}
