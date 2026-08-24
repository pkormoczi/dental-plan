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
  const { plan, settings, loadPlanIntoDraft, copyPlanIntoDraft, vanMentetlenPiszkozat, loadedOsszesitokDiff } =
    useAppState();
  return (
    <div>
      <div data-testid="dirty">{String(vanMentetlenPiszkozat)}</div>
      <div data-testid="diff">{loadedOsszesitokDiff ? JSON.stringify(loadedOsszesitokDiff) : 'null'}</div>
      <div data-testid="statusz">{plan.statusz}</div>
      <div data-testid="tervid">{plan.tervId}</div>
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

  // D53 (48. tétel): a betöltött piszkozat statusz-a PISZKOZAT-ra áll --
  // enélkül a szerkesztő fejléce hamisan "véglegesítve"-t mutatna, és a
  // letöltés elmaradna a PISZKOZAT- előtagtól, holott a forrás mai naptól
  // nincs elmentve. A tervId (a lánc-hovatartozás jele) ezzel szemben
  // érintetlen marad -- a mentés így is a forrás láncba kerül.
  it('loadPlanIntoDraft után a statusz PISZKOZAT-ra áll, a tervId érintetlen marad', async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(await screen.findByRole('button', { name: 'load' }));

    expect(await screen.findByTestId('statusz')).toHaveTextContent('PISZKOZAT');
    expect(screen.getByTestId('tervid')).toHaveTextContent('abc123');
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

// D37: patientDir/lastRoute -- a piszkozat UI-workflow metaadata, a
// DraftRecord-ban perzisztálva, de NEM a Plan tartalma.
function MetaProbe() {
  const {
    settings,
    copyPlanIntoDraft,
    resetPlanDraft,
    jelezWorkflowLepes,
    markPlanSaved,
    piszkozatPatientDir,
    piszkozatLastRoute,
  } = useAppState();
  return (
    <div>
      <div data-testid="patientDir">{piszkozatPatientDir ?? 'null'}</div>
      <div data-testid="lastRoute">{piszkozatLastRoute ?? 'null'}</div>
      <button
        onClick={() =>
          copyPlanIntoDraft(
            planMasolatKent(makeLoadedPlan(), settings, '2026-08-10'),
            'Teszt-Elek_abc123',
          )
        }
      >
        copy-with-patient
      </button>
      <button onClick={() => resetPlanDraft()}>reset</button>
      <button onClick={() => jelezWorkflowLepes('/elonezet')}>signal-elonezet</button>
      <button onClick={() => void markPlanSaved(makeLoadedPlan({ tervId: 'saved1' }))}>
        mark-saved
      </button>
    </div>
  );
}

function renderMetaProbe() {
  return render(
    <TestProviders>
      <MetaProbe />
    </TestProviders>,
  );
}

describe('D37: piszkozat-metaadat (patientDir/lastRoute)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('copyPlanIntoDraft(next, patientDir) perzisztálja a patientDir-t a dp:piszkozat rekordba', async () => {
    const user = userEvent.setup();
    renderMetaProbe();
    await screen.findByTestId('patientDir');

    await user.click(screen.getByRole('button', { name: 'copy-with-patient' }));

    expect(await screen.findByTestId('patientDir')).toHaveTextContent('Teszt-Elek_abc123');
    await waitFor(() => {
      const rec = JSON.parse(localStorage.getItem('dp:piszkozat') as string);
      expect(rec.patientDir).toBe('Teszt-Elek_abc123');
    });
  });

  it('resetPlanDraft() után a patientDir eltűnik és a dp:piszkozat kulcs törlődik', async () => {
    const user = userEvent.setup();
    renderMetaProbe();
    await screen.findByTestId('patientDir');
    await user.click(screen.getByRole('button', { name: 'copy-with-patient' }));
    await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'reset' }));

    expect(screen.getByTestId('patientDir')).toHaveTextContent('null');
    await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).toBeNull());
  });

  it('jelezWorkflowLepes a piszkozatLastRoute-ot írja, aktív draft mellett a dp:piszkozat kulcsba is', async () => {
    const user = userEvent.setup();
    renderMetaProbe();
    await screen.findByTestId('lastRoute');
    await user.click(screen.getByRole('button', { name: 'copy-with-patient' }));
    await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'signal-elonezet' }));

    expect(await screen.findByTestId('lastRoute')).toHaveTextContent('/elonezet');
    await waitFor(() => {
      const rec = JSON.parse(localStorage.getItem('dp:piszkozat') as string);
      expect(rec.lastRoute).toBe('/elonezet');
    });
  });

  // Regresszió: enélkül egy véglegesítés utáni stepper-navigáció (a héj
  // jelezWorkflowLepes-e) feltámasztana egy már törölt piszkozatot a
  // memóriában maradt, immár MENTETT plan-ből (lásd AppState.tsx
  // `piszkozatKiirvaRef`).
  it('markPlanSaved() UTÁN egy jelezWorkflowLepes() nem hoz létre új piszkozatot', async () => {
    const user = userEvent.setup();
    renderMetaProbe();
    await screen.findByTestId('lastRoute');
    await user.click(screen.getByRole('button', { name: 'copy-with-patient' }));
    await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'mark-saved' }));
    await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'signal-elonezet' }));
    await waitFor(() => expect(screen.getByTestId('lastRoute')).toHaveTextContent('/elonezet'));

    expect(localStorage.getItem('dp:piszkozat')).toBeNull();
  });
});

// D63: a loadPlanIntoDraft orvos-öröklése/fallback-je -- a betöltött terv
// orvosa (`makeLoadedPlan().orvos === 'Dr. Mándoki István'`, a seed egyetlen
// orvosa) marad, HA aktív; ha időközben deaktiválták, a globális default
// orvosra esik vissza, `orvosFallback`-ben jelezve.
function OrvosProbe() {
  const { plan, orvosFallback, saveSettings, loadPlanIntoDraft, resetPlanDraft, markPlanSaved, vanMentetlenPiszkozat } =
    useAppState();
  return (
    <div>
      <div data-testid="orvos">{plan.orvos}</div>
      <div data-testid="fallback">{orvosFallback ? JSON.stringify(orvosFallback) : 'null'}</div>
      <div data-testid="dirty">{String(vanMentetlenPiszkozat)}</div>
      <button
        onClick={() =>
          void saveSettings((prev) => ({
            ...prev,
            orvosok: [...prev.orvosok, 'Dr. Új Orsolya'],
            inaktivOrvosok: [...prev.orvosok],
            alapertelmezettOrvos: 'Dr. Új Orsolya',
          }))
        }
      >
        deactivate-current-doctor
      </button>
      <button onClick={() => loadPlanIntoDraft(makeLoadedPlan())}>load</button>
      <button onClick={() => resetPlanDraft()}>reset</button>
      <button onClick={() => void markPlanSaved(makeLoadedPlan({ tervId: 'saved1' }))}>mark-saved</button>
    </div>
  );
}

function renderOrvosProbe() {
  return render(
    <TestProviders>
      <OrvosProbe />
    </TestProviders>,
  );
}

describe('D63: loadPlanIntoDraft orvos-öröklés/fallback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('aktív forrás-orvos esetén a betöltés után a plan.orvos változatlan, orvosFallback null', async () => {
    const user = userEvent.setup();
    renderOrvosProbe();
    await screen.findByTestId('orvos');

    await user.click(screen.getByRole('button', { name: 'load' }));

    expect(await screen.findByTestId('orvos')).toHaveTextContent('Dr. Mándoki István');
    expect(screen.getByTestId('fallback')).toHaveTextContent('null');
  });

  it('inaktivált forrás-orvos esetén a betöltés a globális defaultra vált, orvosFallback kitöltve', async () => {
    const user = userEvent.setup();
    renderOrvosProbe();
    await screen.findByTestId('orvos');
    await user.click(screen.getByRole('button', { name: 'deactivate-current-doctor' }));
    await waitFor(() => {
      const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
        alapertelmezettOrvos?: string;
      };
      expect(s.alapertelmezettOrvos).toBe('Dr. Új Orsolya');
    });

    await user.click(screen.getByRole('button', { name: 'load' }));

    expect(await screen.findByTestId('orvos')).toHaveTextContent('Dr. Új Orsolya');
    expect(screen.getByTestId('fallback')).toHaveTextContent(
      JSON.stringify({ regi: 'Dr. Mándoki István', uj: 'Dr. Új Orsolya' }),
    );
  });

  // Regresszió (lásd a copyPlanIntoDraft-hoz hasonló teszt fent, `frissDatummal`
  // mintája): a gépi orvos-fallback nem adhat hamis "mentetlen munka" jelzést.
  it('az orvos-fallback után is vanMentetlenPiszkozat hamis', async () => {
    const user = userEvent.setup();
    renderOrvosProbe();
    await screen.findByTestId('orvos');
    await user.click(screen.getByRole('button', { name: 'deactivate-current-doctor' }));
    await waitFor(() => {
      const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
        alapertelmezettOrvos?: string;
      };
      expect(s.alapertelmezettOrvos).toBe('Dr. Új Orsolya');
    });

    await user.click(screen.getByRole('button', { name: 'load' }));

    expect(await screen.findByTestId('fallback')).not.toHaveTextContent('null');
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
  });

  it('resetPlanDraft() nullázza az orvosFallback-et', async () => {
    const user = userEvent.setup();
    renderOrvosProbe();
    await screen.findByTestId('orvos');
    await user.click(screen.getByRole('button', { name: 'deactivate-current-doctor' }));
    await waitFor(() => {
      const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
        alapertelmezettOrvos?: string;
      };
      expect(s.alapertelmezettOrvos).toBe('Dr. Új Orsolya');
    });
    await user.click(screen.getByRole('button', { name: 'load' }));
    expect(await screen.findByTestId('fallback')).not.toHaveTextContent('null');

    await user.click(screen.getByRole('button', { name: 'reset' }));

    expect(screen.getByTestId('fallback')).toHaveTextContent('null');
  });

  it('markPlanSaved() nullázza az orvosFallback-et', async () => {
    const user = userEvent.setup();
    renderOrvosProbe();
    await screen.findByTestId('orvos');
    await user.click(screen.getByRole('button', { name: 'deactivate-current-doctor' }));
    await waitFor(() => {
      const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
        alapertelmezettOrvos?: string;
      };
      expect(s.alapertelmezettOrvos).toBe('Dr. Új Orsolya');
    });
    await user.click(screen.getByRole('button', { name: 'load' }));
    expect(await screen.findByTestId('fallback')).not.toHaveTextContent('null');

    await user.click(screen.getByRole('button', { name: 'mark-saved' }));

    expect(screen.getByTestId('fallback')).toHaveTextContent('null');
  });
});

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
