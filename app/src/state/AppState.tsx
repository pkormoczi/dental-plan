// Az alkalmazás-szintű állapot: a beállítások, az árlista, és a jelenleg
// szerkesztett terv piszkozata. A piszkozat SZÁNDÉKOSAN csak memóriában él
// (nem IndexedDB) -- az autosave a 2. fázis feladata, lásd CLAUDE.md
// "Két fázisú build". Oldalváltás közben megmarad, frissítéskor elvész,
// ami a mockup validációs céljának megfelelő.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createBlankPlan } from '../domain/blankPlan';
import type { Plan, PriceList, Settings } from '../domain/types';
import { useStorage } from '../storage/StorageContext';
import { t } from '../design/tokens';

interface AppStateValue {
  settings: Settings;
  priceList: PriceList;
  plan: Plan;
  setPlan: (updater: Plan | ((prev: Plan) => Plan)) => void;
  /** Eldobja a jelenlegi piszkozatot, és egy vadonatúj üres tervvel kezd. */
  resetPlanDraft: () => void;
  /** Betölt egy korábbi tervet a piszkozatba szerkesztésre (lásd "Korábbi tervek"). */
  loadPlanIntoDraft: (plan: Plan) => void;
  saveSettings: (s: Settings) => Promise<void>;
  savePriceList: (pl: PriceList) => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { storage } = useStorage();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [priceList, setPriceList] = useState<PriceList | null>(null);
  const [plan, setPlanState] = useState<Plan | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, pl] = await Promise.all([storage.loadSettings(), storage.loadPriceList()]);
      if (cancelled) return;
      setSettings(s);
      setPriceList(pl);
      setPlanState(createBlankPlan(s, pl));
    })();
    return () => {
      cancelled = true;
    };
    // A storage csak egyszer, a Provider élettartama alatt cserélődik (reset esetén sem
    // az objektum-referencia változik, csak a benne lévő adat) -- egyszeri betöltés elég.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!settings || !priceList || !plan) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: t.textFaint, fontSize: 13 }}>
        Betöltés…
      </div>
    );
  }

  const value: AppStateValue = {
    settings,
    priceList,
    plan,
    setPlan: (updater) =>
      setPlanState((prev) => {
        if (!prev) return prev;
        return typeof updater === 'function' ? (updater as (p: Plan) => Plan)(prev) : updater;
      }),
    resetPlanDraft: () => setPlanState(createBlankPlan(settings, priceList)),
    loadPlanIntoDraft: (p) => setPlanState(p),
    saveSettings: async (s) => {
      await storage.saveSettings(s);
      setSettings(s);
    },
    savePriceList: async (pl) => {
      await storage.savePriceList(pl);
      setPriceList(pl);
    },
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState csak az AppStateProvider-en belül használható.');
  return ctx;
}
