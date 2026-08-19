// Az EGYETLEN globális, mentetlen piszkozat (D21) feloldott páciensmappája
// (46. tétel). Eredetileg a `PatientDetailPage.tsx` D50 törlés-őrének
// `draftPatientDir` effektje volt -- kiemelve, mert a terv-lánc fa
// aktív-draft blokkja (`components/PatientPlanChains.tsx`) is ugyanezt a
// feloldást igényli, és az `OsszesTervSection.tsx`-en (sok páciens egy lapon)
// ezt EGYSZER kell hívni, nem páciensenként -- a `feloldPatientDir()`
// `listPatients()` tartaléka különben N-szer futna le egy nagy listán.

import { useEffect, useState } from 'react';
import type { Plan } from '../domain/types';
import { feloldPatientDir } from '../domain/torzsadatBetoltes';
import type { WorkflowRoute } from '../storage/DraftStorage';
import { useAppState } from '../state/AppState';
import { useStorage } from '../storage/StorageContext';

export interface AktivDraft {
  /** `feloldPatientDir()` eredménye -- `null`, ha a mappa nem oldható fel. */
  patientDir: string | null;
  plan: Plan;
  /** `piszkozatMentve` -- az utolsó automatikus mentés időbélyege. */
  mentve: string | null;
  /** `piszkozatLastRoute` -- a doki utoljára látogatott workflow-lépése. */
  lastRoute: WorkflowRoute | null;
}

/**
 * `null`, ha nincs mentetlen piszkozat -- ilyenkor a `feloldPatientDir`
 * effekt SEM fut le (nincs fölösleges `listPatients()` hívás egy draft
 * nélküli lapon).
 */
export function useAktivDraft(): AktivDraft | null {
  const { storage } = useStorage();
  const { plan, vanMentetlenPiszkozat, piszkozatMentve, piszkozatLastRoute, piszkozatPatientDir } =
    useAppState();

  const [patientDir, setPatientDir] = useState<string | null>(null);

  useEffect(() => {
    if (!vanMentetlenPiszkozat) {
      setPatientDir(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const dir = await feloldPatientDir(storage, piszkozatPatientDir, plan.paciensId);
      if (!cancelled) setPatientDir(dir);
    })();
    return () => {
      cancelled = true;
    };
  }, [storage, vanMentetlenPiszkozat, piszkozatPatientDir, plan.paciensId]);

  if (!vanMentetlenPiszkozat) return null;
  return { patientDir, plan, mentve: piszkozatMentve, lastRoute: piszkozatLastRoute };
}

/** A globális aktív draft, HA a `patientDir`-hez tartozik -- egyébként `null`. */
export function sajatDraft(draft: AktivDraft | null, patientDir: string): AktivDraft | null {
  if (draft === null || draft.patientDir === null) return null;
  return draft.patientDir === patientDir ? draft : null;
}
