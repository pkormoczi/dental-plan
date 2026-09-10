// Másolás új tervbe: páciens-identitás védőháló. A `TervWorkflowShell.tsx`
// legkülső eleme mountolja, hogy a `PatientPage`/`TorzsadatSyncCard`/
// `PaciensBreadcrumb`/`PreviewPage` egyaránt elérje -- a `NyelviReviewContext`
// mintáján: `createContext<T | null>`, a `usePaciensKotes()` accessor
// Provider nélkül dob.
//
// A kötés (patientDir + a hozzá tartozó `PatientFolder`) egyetlen, önmagát
// betöltő effektből származik -- a `TorzsadatSyncCard.tsx`/`PreviewPage.tsx`
// meglévő `feloldPatientDir()`-effektjeinek mintáján, a `plan.paciens.nev`-et
// SZÁNDÉKOSAN NEM dependency-ként: csak az AZONOSÍTÓ (patientDir/paciensId)
// változása indokol újratöltést, a Név mező minden leütése nem. Az ütközés
// (`domain/paciensKotes.ts`) emiatt `useMemo`-val, I/O nélkül, minden
// leütésre újraszámolható.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { paciensKotes, type PaciensKotes } from '../domain/paciensKotes';
import type { PatientFolder } from '../domain/types';
import { feloldPatientDir } from '../domain/torzsadatBetoltes';
import { useAppState } from '../state/AppState';
import { useStorage } from '../storage/StorageContext';

interface PaciensKotesContextValue extends PaciensKotes {
  /** Igaz, amíg a kötés/pácienslista betöltése folyamatban van. */
  betolt: boolean;
  /**
   * A kötött páciens születési dátuma a mappa `paciens-adatok.json`-jából
   * (ISO), vagy `null`. A törzsadatból és nem a piszkozat `paciens` mezőjéből
   * jön: a kötést a mappa identitása mondja meg, a piszkozat mezője
   * szerkesztés alatt állhat. Azonos nevű pácienseknél ez különbözteti meg a
   * kötést a doki nyelvén, mappanév nélkül.
   */
  kotottSzuletesiIdo: string | null;
}

const PaciensKotesContext = createContext<PaciensKotesContextValue | null>(null);

export function PaciensKotesProvider({ children }: { children: ReactNode }) {
  const { plan, piszkozatPatientDir } = useAppState();
  const { storage } = useStorage();

  const [patientDir, setPatientDir] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [kotottSzuletesiIdo, setKotottSzuletesiIdo] = useState<string | null>(null);
  const [betolt, setBetolt] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBetolt(true);
    (async () => {
      // Sosem dob (P1-2 minta): egy sikertelen listázás/feloldás a védelmet
      // némán kikapcsolja, nem akasztja meg a workflow-t.
      const dir = await feloldPatientDir(storage, piszkozatPatientDir, plan.paciensId);
      let lista: PatientFolder[] = [];
      let szuletesiIdo: string | null = null;
      try {
        lista = await storage.listPatients();
      } catch {
        lista = [];
      }
      // Külön try: egy sérült paciens-adatok.json csak a dátumot veszíti el,
      // a névrokon-védelmet (pácienslista) nem kapcsolhatja ki.
      if (dir) {
        try {
          szuletesiIdo = (await storage.loadPatientData(dir))?.szuletesiIdo || null;
        } catch {
          szuletesiIdo = null;
        }
      }
      if (cancelled) return;
      setPatientDir(dir);
      setPatients(lista);
      setKotottSzuletesiIdo(szuletesiIdo);
      setBetolt(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, piszkozatPatientDir, plan.paciensId]);

  const kotes = useMemo(
    () => paciensKotes(patients, patientDir, plan.paciens.nev, plan.paciensId),
    [patients, patientDir, plan.paciens.nev, plan.paciensId],
  );

  const value = useMemo<PaciensKotesContextValue>(
    () => ({ ...kotes, betolt, kotottSzuletesiIdo }),
    [kotes, betolt, kotottSzuletesiIdo],
  );

  return <PaciensKotesContext.Provider value={value}>{children}</PaciensKotesContext.Provider>;
}

export function usePaciensKotes(): PaciensKotesContextValue {
  const ctx = useContext(PaciensKotesContext);
  if (!ctx) throw new Error('usePaciensKotes csak a PaciensKotesProvider-en belül használható.');
  return ctx;
}
