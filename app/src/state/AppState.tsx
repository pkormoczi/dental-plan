// Az alkalmazás-szintű állapot: a beállítások, az árlista, és a jelenleg
// szerkesztett terv piszkozata. A piszkozat memóriában él, de MINDEN
// tartalmi módosításra azonnal perzisztálódik is a DraftStorage-on keresztül
// (mockupban localStorage, lásd storage/DemoDraftStorage.ts) -- frissítés
// vagy összeomlás után visszaáll. Ez a docs/03-funkcionalis-spec.md
// "Autosave" szakaszának korábbra hozott terve (eredetileg a 2. fázisra,
// IndexedDB-vel ütemezve), mert a valós fájdalom már a mockup-fázisban
// jelentkezett.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { createBlankPlan } from '../domain/blankPlan';
import { piszkozatTartalmas } from '../domain/piszkozat';
import { osszesitokElter } from '../domain/totals';
import { frissDatummal, type UjVerzioDatum } from '../domain/ujVerzioDatum';
import { todayIso } from '../domain/date';
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
   * Beteszi a piszkozatba egy `planUjPaciensselTervhez`/`planMasolatKent`
   * (domain/planCopy.ts, backlog-17) hívás EREDMÉNYÉT -- a hívó (
   * PlanHistoryPage.tsx) már elvégezte a tiszta transzformációt, ez a
   * függvény csak a React-bekötésért felel. A `resetPlanDraft` mintáját
   * követi, NEM a `loadPlanIntoDraft`-ét: a most kapott `next` MÉG SOHA
   * nincs elmentve a saját `tervId` alatt (a `planMasolatKent` is üres
   * `tervId`-t ad), tehát ténylegesen mentetlen munka -- ezért `plan` és
   * `mentettPlan` szándékosan KÜLÖNBÖZŐ referencia lesz, `vanMentetlenPiszkozat`
   * azonnal igaz. A `drafts.clear()` hívás (amit a `resetPlanDraft` a végén
   * elvégez) itt NEM fut -- ott azért törlünk, mert egy ÜRES tervre váltunk,
   * itt VAN tartalom, amit az autosave-effektnek meg kell őriznie.
   */
  copyPlanIntoDraft: (next: Plan) => void;
  /**
   * Igaz, ha `plan`-en van olyan tartalom (`piszkozatTartalmas`), ami még
   * nincs a fájl-storage-ban -- azaz `plan` egy másik objektumreferencia,
   * mint a legutóbb onnan betöltött/oda mentett terv. Ez vezérli a Home
   * "Piszkozat folytatása" kártyáját és a felülírás elleni AlertDialog-okat
   * (Home "Új terv indítása", PlanHistoryPage "Megnyitás szerkesztésre") --
   * lásd docs/03-funkcionalis-spec.md § Autosave.
   */
  vanMentetlenPiszkozat: boolean;
  /** Az utolsó sikeres automatikus piszkozat-mentés ISO időbélyege, vagy `null`. */
  piszkozatMentve: string | null;
  /** A piszkozat visszaállításának vagy írásának hibaüzenete, vagy `null`. */
  piszkozatHiba: string | null;
  /**
   * A Home "Piszkozat elvetése" gombja hívja egy nem visszaállítható
   * (sérült/inkompatibilis) perzisztált piszkozatnál (7. döntés) -- addig a
   * kulcs a helyén marad, a hiba minden indításkor visszatér.
   */
  discardPersistedDraft: () => Promise<void>;
  /**
   * Véglegesítés után hívandó (PreviewPage.tsx `doFinalize` sikerág) -- a
   * most fájlba írt `persisted` Plan-t "mentett" állapotúnak jelöli, és
   * törli a perzisztált piszkozatot. Ez a docs/03-funkcionalis-spec.md
   * véglegesítés-láncának 4. lépése ("A piszkozat törlése").
   */
  markPlanSaved: (persisted: Plan) => Promise<void>;
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
  /**
   * docs/03-funkcionalis-spec.md § Korábbi terv új verzióra nyitása (D22):
   * a `loadPlanIntoDraft`-tal betöltött terv `keltezes`/`ervenyesIg`-e itt
   * már a mai napra és az aktuális `settings.ervenyessegNap`-ra frissült
   * (nem a régi terv dátuma) -- ez az
   * ÚJ értékpár, amit a PlanEditorPage tájékoztató sávja olvas. `null`, ha
   * nincs friss betöltés, vagy a betöltött terv dátuma már úgyis a mai volt
   * (nincs tényleges változás, nincs mit jelezni).
   */
  frissitettDatum: UjVerzioDatum | null;
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
  const { storage, ready, drafts } = useStorage();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [priceList, setPriceList] = useState<PriceList | null>(null);
  const [plan, setPlanState] = useState<Plan | null>(null);
  // A legutóbb a fájl-storage-ban is meglévő (onnan betöltött vagy oda
  // mentett) Plan-referencia -- `plan !== mentettPlan` a "van mentetlen
  // munka" jelzés (lásd `vanMentetlenPiszkozat` a value-useMemo-ban).
  const [mentettPlan, setMentettPlan] = useState<Plan | null>(null);
  const [piszkozatMentve, setPiszkozatMentve] = useState<string | null>(null);
  const [piszkozatHiba, setPiszkozatHiba] = useState<string | null>(null);
  const [loadedOsszesitokDiff, setLoadedOsszesitokDiff] = useState<Osszesitok | null>(null);
  const [frissitettDatum, setFrissitettDatum] = useState<UjVerzioDatum | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loadToken, setLoadToken] = useState(0);
  // Amit legutóbb a DraftStorage-ból olvastunk vagy oda írtunk -- csak a
  // fölösleges újraírás kiszűrésére (lásd az író useEffect-et lent), nem
  // felhasználói állapot.
  const irtPiszkozatRef = useRef<Plan | null>(null);

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

        // Csendes, memóriabeli restore -- a láthatóságot a Home "Piszkozat
        // folytatása" kártyája adja, itt nincs semmilyen felhasználó felé
        // szóló jelzés.
        //
        // Egy sérült/inkompatibilis piszkozat NEM kerülhet a `loadError`
        // ágra -- az az egész alkalmazás betöltését blokkolná; csak a Home
        // saját hibaállapotát kell megkapnia.
        let restored: Plan | null = null;
        try {
          const rec = await drafts.load();
          if (!cancelled && rec) {
            restored = rec.plan;
            irtPiszkozatRef.current = rec.plan;
            setPiszkozatMentve(rec.mentve);
          }
        } catch (err) {
          if (!cancelled) {
            setPiszkozatHiba(
              err instanceof Error
                ? err.message
                : 'A piszkozat visszaállítása váratlanul meghiúsult.',
            );
          }
        }

        if (cancelled) return;
        setPlanState((prev) => prev ?? restored ?? createBlankPlan(s, pl));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
    return () => {
      cancelled = true;
    };
    // A storage/drafts csak egyszer, a Provider élettartama alatt cserélődik
    // (reset esetén sem az objektum-referencia változik, csak a benne lévő
    // adat) -- a `loadToken` a kézi "Újrapróbálás" triggere egy sikertelen
    // betöltés után.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, storage, drafts, loadToken]);

  // Írási trigger: minden tartalmi plan-változásra azonnal ír, debounce
  // nélkül (3. döntés) -- a terv-objektum kicsi, egy JSON.stringify +
  // localStorage.setItem ezen a méreten elhanyagolható költségű, a debounce
  // itt csak egy felesleges adatvesztési ablakot nyitna összeomláskor. Az
  // érintetlen, üres piszkozatot (`piszkozatTartalmas` false) NEM írja, hogy
  // minden "Új terv indítása" után ne jöjjön létre azonnal egy tartalmilag
  // üres, de technikailag létező perzisztált piszkozat.
  useEffect(() => {
    if (!plan) return;
    if (!piszkozatTartalmas(plan)) return;
    if (plan === irtPiszkozatRef.current) return; // épp visszaállított/mentett terv, nincs új tartalom
    let cancelled = false;
    drafts.save(plan).then(
      (rec) => {
        if (cancelled) return;
        irtPiszkozatRef.current = plan;
        setPiszkozatMentve(rec.mentve);
        setPiszkozatHiba(null);
      },
      (err) => {
        if (cancelled) return;
        setPiszkozatHiba(
          err instanceof Error ? err.message : 'A piszkozat mentése váratlanul meghiúsult.',
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [plan, drafts]);

  const reloadFromStorage = useCallback(async () => {
    const [s, pl] = await Promise.all([storage.loadSettings(), storage.loadPriceList()]);
    setSettings(s);
    setPriceList(pl);
    setPlanState(createBlankPlan(s, pl));
    setLoadedOsszesitokDiff(null);
    setFrissitettDatum(null);
    // A dp: kulcsokat (a piszkozatot is) a clearAll()/resetDemoData() már
    // elsöpörte -- csak a memóriabeli piszkozat-állapotot kell nullázni.
    setMentettPlan(null);
    setPiszkozatMentve(null);
    setPiszkozatHiba(null);
    irtPiszkozatRef.current = null;
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
        setFrissitettDatum(null);
        setMentettPlan(null);
        setPiszkozatMentve(null);
        setPiszkozatHiba(null);
        irtPiszkozatRef.current = null;
        // Explicit törlés -- egy üres tervre az író effekt nem fut le,
        // tehát a régi kulcs magától bennmaradna (6. döntés). P1-1 tanulsága
        // szerint egy `void`-olt promise hibája nyomtalanul elveszne -- ha a
        // törlés elhasal, a hiba a Home hibaállapotában landol.
        drafts.clear().catch((err) => {
          setPiszkozatHiba(
            err instanceof Error ? err.message : 'A piszkozat törlése váratlanul meghiúsult.',
          );
        });
      },
      loadPlanIntoDraft: (p) => {
        // D22 (docs/01-attekintes-es-dontesek.md): a dátumbélyeg itt,
        // betöltéskor íródik, nem véglegesítéskor -- a PreviewPage a
        // `pdfInstance`-t a `plan` state-ből rendereli, egy késői írás a
        // mentett JSON-t és a már korábban renderelt PDF-blob-ot szétcsúsztatná.
        const friss = frissDatummal(p, settings, todayIso());
        setPlanState(friss);
        setLoadedOsszesitokDiff(osszesitokElter(p.osszesitok, p.fazisok, p.kedvezmenyOsszeg));
        setFrissitettDatum(
          friss.keltezes !== p.keltezes || friss.ervenyesIg !== p.ervenyesIg
            ? { keltezes: friss.keltezes, ervenyesIg: friss.ervenyesIg }
            : null,
        );
        // A betöltött terv nem "mentetlen munka", amíg hozzá nem nyúlnak --
        // az első szerkesztés után az író effekt magától felülírja a régi
        // piszkozatot, külön törlés itt nem kell (6. döntés). UGYANAZT a
        // `friss` referenciát kapja a `plan` és a `mentettPlan` is -- két
        // külön példány hamis "mentetlen munka" jelzést adna, hiszen a
        // dátumbélyeg gépi lépés, nem doki-szerkesztés.
        setMentettPlan(friss);
      },
      copyPlanIntoDraft: (next) => {
        setPlanState(next);
        setLoadedOsszesitokDiff(null);
        setFrissitettDatum(null);
        setMentettPlan(null);
      },
      vanMentetlenPiszkozat: piszkozatTartalmas(plan) && plan !== mentettPlan,
      piszkozatMentve,
      piszkozatHiba,
      discardPersistedDraft: async () => {
        await drafts.clear();
        setPiszkozatHiba(null);
        setPiszkozatMentve(null);
      },
      markPlanSaved: async (persisted) => {
        irtPiszkozatRef.current = persisted;
        setPlanState(persisted);
        setMentettPlan(persisted);
        setPiszkozatMentve(null);
        setPiszkozatHiba(null);
        setFrissitettDatum(null);
        await drafts.clear();
      },
      loadedOsszesitokDiff,
      frissitettDatum,
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
  }, [
    settings,
    priceList,
    plan,
    mentettPlan,
    piszkozatMentve,
    piszkozatHiba,
    loadedOsszesitokDiff,
    frissitettDatum,
    storage,
    drafts,
    reloadFromStorage,
  ]);

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
