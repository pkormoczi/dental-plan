import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useAppState } from './AppState';
import { planMasolatKent } from '../domain/planCopy';
import { TestProviders } from '../testUtils';
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
