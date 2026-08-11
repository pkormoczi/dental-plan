import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppState } from './AppState';
import { planMasolatKent } from '../domain/planCopy';
import { TestProviders } from '../testUtils';
import { useStorage } from '../storage/StorageContext';
import type { Plan } from '../domain/types';

// Egy "korábbi tervek listából betöltött" Plan -- eltérő tervId/sorok, hogy a
// loadPlanIntoDraft/copyPlanIntoDraft közti viselkedéskülönbség (7. döntés,
// backlog-17) mérhető legyen.
function makeLoadedPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: 'abc123',
    verzio: 2,
    statusz: 'VEGLEGES',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-06-10',
    ervenyesIg: '2026-07-10',
    arlistaVerzio: '2026-05-01',
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Nagy Éva',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [
      {
        sorszam: 1,
        megnevezes: '1. kezelés',
        megjegyzes: '',
        sorok: [
          {
            tetelId: 't001',
            nevSnapshot: 'Fogeltávolítás',
            savos: false,
            fogak: '16',
            mennyiseg: 1,
            listaEgysegar: 10000,
            tenylegesEgysegar: 9000,
          },
        ],
      },
    ],
    osszesitok: { kezelesekOsszesen: 9000, kedvezmeny: 1000, fizetendo: 8000 },
    ...overrides,
  };
}

function Probe() {
  const { settings, loadPlanIntoDraft, copyPlanIntoDraft, vanMentetlenPiszkozat, loadedOsszesitokDiff } =
    useAppState();
  return (
    <div>
      <div data-testid="dirty">{String(vanMentetlenPiszkozat)}</div>
      <div data-testid="diff">{loadedOsszesitokDiff ? JSON.stringify(loadedOsszesitokDiff) : 'null'}</div>
      <button onClick={() => loadPlanIntoDraft(makeLoadedPlan())}>load</button>
      <button onClick={() => copyPlanIntoDraft(planMasolatKent(makeLoadedPlan(), settings, '2026-08-10'))}>
        copy
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <TestProviders>
      <Probe />
    </TestProviders>,
  );
}

describe('copyPlanIntoDraft', () => {
  it('a másolat betöltése után vanMentetlenPiszkozat igaz és loadedOsszesitokDiff null', async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(await screen.findByRole('button', { name: 'copy' }));

    expect(await screen.findByTestId('dirty')).toHaveTextContent('true');
    expect(screen.getByTestId('diff')).toHaveTextContent('null');
  });

  it('a másolat kiíródik az autosave-en keresztül a dp:piszkozat kulcsra (7. döntés)', async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(await screen.findByRole('button', { name: 'copy' }));

    await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).not.toBeNull());
    const rec = JSON.parse(localStorage.getItem('dp:piszkozat') as string);
    expect(rec.plan.tervId).toBe('');
    expect(rec.plan.paciens.nev).toBe('Nagy Éva');
  });

  // Kontraszt: loadPlanIntoDraft egy MÁR MENTETT tervet nyit meg, ezért nem
  // "mentetlen munka" -- ez igazolja, hogy a copyPlanIntoDraft fenti
  // viselkedése tényleg a `mentettPlan` referenciakülönbségén múlik, nem
  // valami máson.
  it('kontrasztként loadPlanIntoDraft után vanMentetlenPiszkozat hamis', async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(await screen.findByRole('button', { name: 'load' }));

    expect(await screen.findByTestId('dirty')).toHaveTextContent('false');
  });
});

function PriceListUpdaterProbe() {
  const { priceList, savePriceList } = useAppState();
  return (
    <div>
      <div data-testid="cat-count">{priceList.kategoriak.length}</div>
      <button
        onClick={() => {
          // Szándékosan NEM await-elve egymás után -- a D31 lényege pont az,
          // hogy két ilyen, egy tickben indított hívás egymás hatását ne
          // dobja el.
          void savePriceList((prev) => ({
            ...prev,
            kategoriak: [...prev.kategoriak, { id: 'kX', nev: { hu: 'X kategória', de: null }, sorrend: 900 }],
          }));
          void savePriceList((prev) => ({
            ...prev,
            kategoriak: [...prev.kategoriak, { id: 'kY', nev: { hu: 'Y kategória', de: null }, sorrend: 901 }],
          }));
        }}
      >
        add-two-categories
      </button>
    </div>
  );
}

function SettingsUpdaterProbe() {
  const { settings, saveSettings } = useAppState();
  return (
    <div>
      <div data-testid="nev">{settings.rendelo.nev}</div>
      <div data-testid="telefon">{settings.rendelo.telefon}</div>
      <button
        onClick={() => {
          void saveSettings((prev) => ({ ...prev, rendelo: { ...prev.rendelo, nev: 'Dr. Teszt Rendelő' } }));
          void saveSettings((prev) => ({
            ...prev,
            rendelo: { ...prev.rendelo, telefon: '+36 1 999 9999' },
          }));
        }}
      >
        edit-two-fields
      </button>
    </div>
  );
}

function ReloadThenAddProbe() {
  const { priceList, savePriceList, reloadFromStorage } = useAppState();
  const { resetDemoData } = useStorage();
  return (
    <div>
      <div data-testid="cat-count">{priceList.kategoriak.length}</div>
      <button
        onClick={() => {
          void savePriceList((prev) => ({
            ...prev,
            kategoriak: [
              ...prev.kategoriak,
              { id: 'kExtra', nev: { hu: 'Extra kategória', de: null }, sorrend: 900 },
            ],
          }));
        }}
      >
        add-extra
      </button>
      <button
        onClick={async () => {
          resetDemoData();
          await reloadFromStorage();
          await savePriceList((prev) => ({
            ...prev,
            kategoriak: [
              ...prev.kategoriak,
              { id: 'kFriss', nev: { hu: 'Friss kategória', de: null }, sorrend: 901 },
            ],
          }));
        }}
      >
        reset-reload-add
      </button>
    </div>
  );
}

function FailingPriceListProbe() {
  const { priceList, savePriceList } = useAppState();
  return (
    <div>
      <div data-testid="cat-count">{priceList.kategoriak.length}</div>
      <button
        onClick={() => {
          void savePriceList((prev) => ({
            ...prev,
            kategoriak: [
              ...prev.kategoriak,
              { id: 'kHiba', nev: { hu: 'Hiba kategória', de: null }, sorrend: 900 },
            ],
          })).catch(() => {});
        }}
      >
        add-with-failing-storage
      </button>
    </div>
  );
}

// D31: a savePriceList/saveSettings context-metódus KIZÁRÓLAG updatert fogad,
// és a `priceList`/`settings` állapot a mentés ELŐTT, szinkron frissül
// (`settingsRef`/`priceListRef` + `apply*`, AppState.tsx) -- ezek a tesztek
// pont ezt a szerződést pin-elik, nem a hívóoldali PriceListAdminPage/
// SettingsPage kód konkrét viselkedését (azt lásd ott).
describe('savePriceList / saveSettings -- D31 updater szerződés', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('két, egy tickben indított savePriceList updater mindkét hatása perzisztál', async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <PriceListUpdaterProbe />
      </TestProviders>,
    );
    await screen.findByTestId('cat-count');

    await user.click(screen.getByRole('button', { name: 'add-two-categories' }));

    await waitFor(() => {
      const pl = JSON.parse(localStorage.getItem('dp:arlista.json') as string) as {
        kategoriak: Array<{ id: string }>;
      };
      const ids = pl.kategoriak.map((k) => k.id);
      expect(ids).toEqual(expect.arrayContaining(['kX', 'kY']));
    });
  });

  it('két, egy tickben indított saveSettings updater mindkét hatása perzisztál', async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <SettingsUpdaterProbe />
      </TestProviders>,
    );
    await screen.findByTestId('nev');

    await user.click(screen.getByRole('button', { name: 'edit-two-fields' }));

    await waitFor(() => {
      const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
        rendelo: { nev: string; telefon: string };
      };
      expect(s.rendelo.nev).toBe('Dr. Teszt Rendelő');
      expect(s.rendelo.telefon).toBe('+36 1 999 9999');
    });
  });

  it('reloadFromStorage után az updater a FRISS állapotra épül, nem a reset előttire', async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <ReloadThenAddProbe />
      </TestProviders>,
    );
    await screen.findByTestId('cat-count');

    await user.click(screen.getByRole('button', { name: 'add-extra' }));
    await waitFor(() => expect(screen.getByTestId('cat-count')).toHaveTextContent('14'));

    await user.click(screen.getByRole('button', { name: 'reset-reload-add' }));

    await waitFor(() => {
      const pl = JSON.parse(localStorage.getItem('dp:arlista.json') as string) as {
        kategoriak: Array<{ id: string }>;
      };
      const ids = pl.kategoriak.map((k) => k.id);
      // Ha a ref elavult (reset előtti) állapotra épülne, a törölt "kExtra"
      // is visszakerülne -- ez pin-eli, hogy a reloadFromStorage az apply*-on
      // át valóban frissíti a settingsRef/priceListRef tükröt is, nem csak a
      // React state-et.
      expect(ids).not.toContain('kExtra');
      expect(ids).toContain('kFriss');
      expect(pl.kategoriak).toHaveLength(14);
    });
  });

  it('sikertelen mentés után a context-érték az ÚJ állapotot mutatja, nincs visszagördülés', async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <FailingPriceListProbe />
      </TestProviders>,
    );
    await screen.findByTestId('cat-count');

    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'dp:arlista.json') throw new DOMException('QuotaExceededError');
      originalSetItem(key, value);
    });

    await user.click(screen.getByRole('button', { name: 'add-with-failing-storage' }));

    await waitFor(() => expect(screen.getByTestId('cat-count')).toHaveTextContent('14'));

    vi.restoreAllMocks();
  });
});
