// A PlanStorage interfészt egyetlen React Context mögé rejti, hogy a 2.
// fázisban a DemoStorage -> FileSystemStorage csere egyetlen sort érintsen
// itt, semmit a képernyőkön (lásd CLAUDE.md "Két fázisú build").
//
// A `resetDemoData`/`clearAll`/`loadPlanPdf` NEM a PlanStorage interface
// része -- ezek csak a mockup kényelmi funkciói, ezért külön mezőként vannak
// kitéve, nem az interfészen keresztül.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DemoDraftStorage } from './DemoDraftStorage';
import { DemoStorage } from './DemoStorage';
import type { DraftStorage } from './DraftStorage';
import type { PlanStorage } from './PlanStorage';

export interface StorageContextValue {
  storage: PlanStorage;
  /**
   * A `DemoStorage.init()` promise-a. P1-1: korábban `void demo.init()`
   * volt -- egy kvótahiba vagy Safari privát mód alatti íráshiba itt
   * csendben elveszett volna. Az AppStateProvider ezt várja meg a
   * betöltés előtt, hogy a hiba a felhasználóig eljusson.
   */
  ready: Promise<void>;
  resetDemoData: () => void;
  /** P1-9: valódi kiút, ha a doki véletlenül valódi páciensadatot vitt be -- a
   *  "Demó adat visszaállítása" csak újraseedel, ez ténylegesen kiürít. */
  clearAll: () => void;
  loadPlanPdf: (ref: { patientDir: string; versionDir: string }) => Promise<Uint8Array | null>;
  loadLatestTemplateByBase: (base: string) => Promise<{ name: string; body: string }>;
  /**
   * docs/backlog-1-piszkozat-terv.md 2. döntés: a PlanStorage MELLETTI,
   * testvér-doboz -- nem annak metódusa, mert a végleges alkalmazásban is
   * külön marad (IndexedDB a FileSystemStorage mellett, nem alatta).
   */
  drafts: DraftStorage;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const value = useMemo<StorageContextValue>(() => {
    const demo = new DemoStorage();
    const ready = demo.init();
    const drafts = new DemoDraftStorage();
    return {
      storage: demo,
      ready,
      resetDemoData: () => demo.resetDemoData(),
      clearAll: () => demo.clearAll(),
      loadPlanPdf: (ref) => demo.loadPlanPdf(ref),
      loadLatestTemplateByBase: (base) => demo.loadLatestTemplateByBase(base),
      drafts,
    };
  }, []);

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage csak a StorageProvider-en belül használható.');
  return ctx;
}
