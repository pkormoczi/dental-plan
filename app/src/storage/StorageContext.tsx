// A PlanStorage interfészt egyetlen React Context mögé rejti, hogy a 2.
// fázisban a DemoStorage -> FileSystemStorage csere egyetlen sort érintsen
// itt, semmit a képernyőkön (lásd PRODUCT.md § Két fázis).
//
// A `resetDemoData`/`clearAll`/`listFileTree`/`readRawFile`/`isSeedVersion`
// NEM a PlanStorage interface része -- ezek csak a mockup
// kényelmi funkciói (a Filerendszer nézet demó-only vizualizációja is
// közéjük tartozik), ezért külön mezőként vannak kitéve, nem az
// interfészen keresztül. A FileSystemStorage-váltáskor ezek a mezők
// egyszerűen megszűnnek, mert a doki onnantól a valódi Fájlkezelőt
// használja.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DemoDraftStorage } from './DemoDraftStorage';
import { DemoTemplateDraftCache } from './DemoTemplateDraftCache';
import { DemoStorage } from './DemoStorage';
import { ElectronStorage } from './ElectronStorage';
import { storageHibaBolHiba } from './taroloIpc';
import type { DemoNode } from './demoFileTree';
import type { DraftStorage } from './DraftStorage';
import type { PlanStorage } from './PlanStorage';
import type { TemplateDraftCache } from './TemplateDraftCache';
import type { PlanRef } from '../domain/types';

export interface StorageContextValue {
  storage: PlanStorage;
  /**
   * A `DemoStorage.init()` promise-a. Korábban `void demo.init()`
   * volt -- egy kvótahiba vagy Safari privát mód alatti íráshiba itt
   * csendben elveszett volna. Az AppStateProvider ezt várja meg a
   * betöltés előtt, hogy a hiba a felhasználóig eljusson.
   */
  ready: Promise<void>;
  resetDemoData: () => void;
  /** valódi kiút, ha a doki véletlenül valódi páciensadatot vitt be -- a
   *  "Demó adat visszaállítása" csak újraseedel, ez ténylegesen kiürít. */
  clearAll: () => void;
  /** Filerendszer nézet: a `dp:` kulcsokból épített fa (`storage/demoFileTree.ts`). Szinkron. */
  listFileTree: () => DemoNode[];
  /** Filerendszer nézet: egy fa-csomópont nyers tartalma (`null`, ha ismeretlen/nem `dp:` kulcs). */
  readRawFile: (storageKey: string) => string | null;
  /** Igaz, ha a hármas a beépített demó-készletből származik (sosincs mentett PDF-je). */
  isSeedVersion: (ref: PlanRef) => boolean;
  /**
   * Lásd app/src/storage/CLAUDE.md: a PlanStorage MELLETTI,
   * testvér-doboz -- nem annak metódusa, mert a végleges alkalmazásban is
   * külön marad (a renderer localStorage-ában, a FileSystemStorage mellett).
   */
  drafts: DraftStorage;
  /** A `drafts` testvére a Nyomtatványok fül sablonszövegeihez -- lásd `TemplateDraftCache.ts`. */
  templateDraftCache: TemplateDraftCache;
  /**
   * Egy gyökérmappán belüli elem kijelölve a rendszer fájlkezelőjében („Mappa megnyitása”); a
   * demóban nincs gyökérmappa, ott `null`.
   */
  megmutat: ((relUtvonal: string) => Promise<void>) | null;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const value = useMemo<StorageContextValue>(() => {
    const drafts = new DemoDraftStorage();
    // A piszkozat és a sablon-piszkozat a telepített appban is a renderer localStorage-ában
    // marad, gépenként (migrációs terv §2); csak a system of record költözik a gyökérmappába.
    const hid = typeof window === 'undefined' ? undefined : window.mandokiTarolo;
    if (hid?.aktiv) {
      const storage = new ElectronStorage(hid);
      return {
        storage,
        ready: storage.init(),
        resetDemoData: () => {},
        clearAll: () => {},
        listFileTree: () => [],
        readRawFile: () => null,
        isSeedVersion: () => false,
        drafts,
        templateDraftCache: new DemoTemplateDraftCache(),
        megmutat: async (relUtvonal) => {
          const eredmeny = await hid.megmutat(relUtvonal);
          if (!eredmeny.ok) throw storageHibaBolHiba(eredmeny.hiba);
        },
      };
    }
    const demo = new DemoStorage();
    const ready = demo.init();
    return {
      storage: demo,
      ready,
      resetDemoData: () => demo.resetDemoData(),
      clearAll: () => demo.clearAll(),
      listFileTree: () => demo.listFileTree(),
      readRawFile: (storageKey) => demo.readRawFile(storageKey),
      isSeedVersion: (ref) => demo.isSeedVersion(ref),
      drafts,
      templateDraftCache: new DemoTemplateDraftCache(),
      megmutat: null,
    };
  }, []);

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage csak a StorageProvider-en belül használható.');
  return ctx;
}
