// A PlanStorage interfészt egyetlen React Context mögé rejti, hogy a 2.
// fázisban a DemoStorage -> FileSystemStorage csere egyetlen sort érintsen
// itt, semmit a képernyőkön (lásd CLAUDE.md "Két fázisú build").
//
// A `resetDemoData`/`clearAll`/`loadPlanPdf`/`listFileTree`/`readRawFile`
// NEM a PlanStorage interface része -- ezek csak a mockup kényelmi
// funkciói (a Filerendszer nézet demó-only vizualizációja is közéjük
// tartozik), ezért külön mezőként vannak kitéve, nem az interfészen
// keresztül. A FileSystemStorage-váltáskor ez a két mező egyszerűen
// megszűnik, mert a doki onnantól a valódi Fájlkezelőt használja.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DemoDraftStorage } from './DemoDraftStorage';
import { DemoStorage } from './DemoStorage';
import type { DemoNode } from './demoFileTree';
import type { DraftStorage } from './DraftStorage';
import type { PlanStorage } from './PlanStorage';
import type { PlanRef } from '../domain/types';

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
  loadPlanPdf: (ref: PlanRef) => Promise<Uint8Array | null>;
  loadLatestTemplateByBase: (base: string) => Promise<{ name: string; body: string }>;
  /** Filerendszer nézet: a `dp:` kulcsokból épített fa (`storage/demoFileTree.ts`). Szinkron. */
  listFileTree: () => DemoNode[];
  /** Filerendszer nézet: egy fa-csomópont nyers tartalma (`null`, ha ismeretlen/nem `dp:` kulcs). */
  readRawFile: (storageKey: string) => string | null;
  /**
   * docs/05-technologia.md § Piszkozat-autosave: a PlanStorage MELLETTI,
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
      listFileTree: () => demo.listFileTree(),
      readRawFile: (storageKey) => demo.readRawFile(storageKey),
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
