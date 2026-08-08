// Az alkalmazás-szintű állapot: a beállítások, az árlista, és a jelenleg
// szerkesztett terv piszkozata. A piszkozat SZÁNDÉKOSAN csak memóriában él
// (nem IndexedDB) -- az autosave a 2. fázis feladata, lásd CLAUDE.md
// "Két fázisú build". Oldalváltás közben megmarad, frissítéskor elvész,
// ami a mockup validációs céljának megfelelő.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { createBlankPlan } from '../domain/blankPlan';
import { osszesitokElter } from '../domain/totals';
import type { Osszesitok, Plan, PriceList, Settings } from '../domain/types';
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
  /**
   * P1-3: "`osszesitok` a fájlból számít igaznak, eltérés esetén
   * figyelmeztetni kell" (CLAUDE.md) -- ezt eddig semmi nem ellenőrizte. A
   * `loadPlanIntoDraft`-tal betöltött (nem újonnan létrehozott) terv mentett
   * `osszesitok`-ja és az élőben újraszámolt érték közti eltérés, ha van;
   * `null` egyezés esetén. Csak a BETÖLTÉS pillanatában frissül -- normál
   * szerkesztés közben (setPlan) szándékosan nem, mert ott a divergencia
   * triviális (épp azért szerkeszt a doki, hogy megváltozzon az összeg).
   */
  loadedOsszesitokDiff: Osszesitok | null;
  saveSettings: (s: Settings) => Promise<void>;
  savePriceList: (pl: PriceList) => Promise<void>;
  /**
   * P0-6: "Demó adat visszaállítása" korábban csak a localStorage-ot írta
   * felül -- az AppState memóriabeli settings/priceList/plan state-je
   * érintetlen maradt, és a következő mentés csendben visszaírta a régi
   * (elrontott) állapotot a friss seed fölé. Ez a settings/priceList-et
   * ÉS a piszkozatot is egy lépésben, a frissen betöltött adatokból építi
   * fel -- nem a (potenciálisan React-batch miatt elavult) closure-ből.
   */
  reloadFromStorage: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { storage, ready } = useStorage();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [priceList, setPriceList] = useState<PriceList | null>(null);
  const [plan, setPlanState] = useState<Plan | null>(null);
  const [loadedOsszesitokDiff, setLoadedOsszesitokDiff] = useState<Osszesitok | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loadToken, setLoadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    (async () => {
      try {
        // P1-1: korábban `void demo.init()` volt a StorageProvider-ben --
        // ha az init (első seed-írás) kvótahibába vagy Safari privát módba
        // futott, az a hiba sosem jutott el idáig. A `ready` promise-t itt
        // megvárjuk, hogy a hiba a lenti catch-ágban felszínre kerüljön.
        await ready;
        const [s, pl] = await Promise.all([storage.loadSettings(), storage.loadPriceList()]);
        if (cancelled) return;
        setSettings(s);
        setPriceList(pl);
        setPlanState((prev) => prev ?? createBlankPlan(s, pl));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
    return () => {
      cancelled = true;
    };
    // A storage csak egyszer, a Provider élettartama alatt cserélődik (reset esetén sem
    // az objektum-referencia változik, csak a benne lévő adat) -- a `loadToken` a kézi
    // "Újrapróbálás" triggere egy sikertelen betöltés után.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, storage, loadToken]);

  const reloadFromStorage = useCallback(async () => {
    const [s, pl] = await Promise.all([storage.loadSettings(), storage.loadPriceList()]);
    setSettings(s);
    setPriceList(pl);
    setPlanState(createBlankPlan(s, pl));
    setLoadedOsszesitokDiff(null);
  }, [storage]);

  const value = useMemo<AppStateValue | null>(() => {
    if (!settings || !priceList || !plan) return null;
    return {
      settings,
      priceList,
      plan,
      setPlan: (updater) =>
        setPlanState((prev) => {
          if (!prev) return prev;
          return typeof updater === 'function' ? (updater as (p: Plan) => Plan)(prev) : updater;
        }),
      resetPlanDraft: () => {
        setPlanState(createBlankPlan(settings, priceList));
        setLoadedOsszesitokDiff(null);
      },
      loadPlanIntoDraft: (p) => {
        setPlanState(p);
        setLoadedOsszesitokDiff(osszesitokElter(p.osszesitok, p.fazisok));
      },
      loadedOsszesitokDiff,
      saveSettings: async (s) => {
        await storage.saveSettings(s);
        setSettings(s);
      },
      savePriceList: async (pl2) => {
        await storage.savePriceList(pl2);
        setPriceList(pl2);
      },
      reloadFromStorage,
    };
  }, [settings, priceList, plan, loadedOsszesitokDiff, storage, reloadFromStorage]);

  if (loadError) {
    return (
      <Box style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', padding: 24 }}>
        <Text as="p" size="3" weight="bold" mb="2" style={{ color: t.danger }}>
          Nem sikerült betölteni az adatokat
        </Text>
        <Text as="p" size="2" color="gray" mb="4">
          {loadError.message}
        </Text>
        <Flex justify="center">
          <Button onClick={() => setLoadToken((n) => n + 1)}>Újrapróbálás</Button>
        </Flex>
      </Box>
    );
  }

  if (!value) {
    return (
      <Box style={{ padding: 40, textAlign: 'center' }}>
        <Text size="2" color="gray">
          Betöltés…
        </Text>
      </Box>
    );
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState csak az AppStateProvider-en belül használható.');
  return ctx;
}
