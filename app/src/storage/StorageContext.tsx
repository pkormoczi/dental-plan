// A PlanStorage interfészt egyetlen React Context mögé rejti, hogy a 2.
// fázisban a DemoStorage -> FileSystemStorage csere egyetlen sort érintsen
// itt, semmit a képernyőkön (lásd CLAUDE.md "Két fázisú build").
//
// A `resetDemoData`/`loadPlanPdf` NEM a PlanStorage interface része -- ezek
// csak a mockup kényelmi funkciói, ezért külön mezőként vannak kitéve,
// nem az interfészen keresztül.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DemoStorage } from './DemoStorage';
import type { PlanStorage } from './PlanStorage';

export interface StorageContextValue {
  storage: PlanStorage;
  resetDemoData: () => void;
  loadPlanPdf: (ref: { patientDir: string; versionDir: string }) => Promise<Uint8Array | null>;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const value = useMemo<StorageContextValue>(() => {
    const demo = new DemoStorage();
    void demo.init();
    return {
      storage: demo,
      resetDemoData: () => demo.resetDemoData(),
      loadPlanPdf: (ref) => demo.loadPlanPdf(ref),
    };
  }, []);

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage csak a StorageProvider-en belül használható.');
  return ctx;
}
