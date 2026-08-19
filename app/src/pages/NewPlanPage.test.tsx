// D29: a Home "+ Új kezelési terv" gombja utáni köztes kereső/választó lépés
// (docs/03-funkcionalis-spec.md § Új terv indítása). Lásd
// PlanHistoryPage.test.tsx a `DraftProbe`/`seedPersistedDraft` mintáért --
// ugyanaz a piszkozat-felülírás-őr fut itt is.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import NewPlanPage from './NewPlanPage';
import { TestProviders } from '../testUtils';
import { DemoStorage } from '../storage/DemoStorage';
import { useAppState } from '../state/AppState';
import type { Plan } from '../domain/types';

function DraftProbe() {
  const { plan } = useAppState();
  const sorCount = plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
  return (
    <div>
      <div data-testid="draft-oldal">PACIENS-OLDAL</div>
      <div data-testid="draft-nev">{plan.paciens.nev}</div>
      <div data-testid="draft-telefon">{plan.paciens.telefon}</div>
      <div data-testid="draft-tervid">„{plan.tervId}”</div>
      <div data-testid="draft-sorcount">{sorCount}</div>
    </div>
  );
}

function seedPersistedDraft(overrides: Partial<Plan> = {}) {
  const plan: Plan = {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Piszkozat Panni',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [{ sorszam: 1, megnevezes: '1. kezelés', megjegyzes: '', sorok: [] }],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:00:00.000Z', plan }),
  );
}

/** Csak a `paciensek/` alatti kulcsokat törli -- az árlista/beállítások megmaradnak,
 * ezért a StorageProvider saját (belső) `DemoStorage.init()`-je nem seedel újra. */
function removeAllPatients() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('dp:paciensek/')) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

function renderNewPlan() {
  return render(
    <TestProviders>
      <Routes>
        <Route path="/" element={<NewPlanPage />} />
        <Route path="/paciens" element={<DraftProbe />} />
      </Routes>
    </TestProviders>,
  );
}

describe('NewPlanPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    const seeder = new DemoStorage();
    await seeder.init();
  });

  it('a keresőmezőnek és a "Vadonatúj páciens" gombnak van elérhető neve', async () => {
    renderNewPlan();
    expect(
      await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vadonatúj páciens' })).toBeInTheDocument();
  });

  it('felsorolja a meglévő pácienseket, keresésre szűkíti a listát', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    expect(await screen.findByRole('button', { name: 'Kovács János' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nagy Éva' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tóth Zoltán' })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Meglévő páciens keresése' }), 'nagy');
    expect(screen.queryByRole('button', { name: 'Kovács János' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nagy Éva' })).toBeInTheDocument();
  });

  it('nulla meglévő páciensnél csak a "Vadonatúj páciens" ág látszik', async () => {
    removeAllPatients();
    renderNewPlan();

    expect(
      await screen.findByText('Még nincs mentett terv, akihez visszatérhetnél.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vadonatúj páciens' })).toBeInTheDocument();
  });

  it('"Vadonatúj páciens" azonnal indul, megerősítés nélkül, ha nincs mentetlen piszkozat', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('');
  });

  it('meglévő páciens kiválasztása a legutóbb módosított láncának legfrissebb verziójából előtölti a páciensadatot, sorok nélkül', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: 'Kovács János' }));

    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Kovács János');
    expect(screen.getByTestId('draft-tervid')).toHaveTextContent('„”'); // üres tervId -- új tervlánc
    expect(screen.getByTestId('draft-sorcount')).toHaveTextContent('0');
  });

  it('"Vadonatúj páciens" megerősítést kér mentetlen piszkozatnál -- Mégse megtartja', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('draft-oldal')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Vadonatúj páciens' }));
    await user.click(await screen.findByRole('button', { name: 'Elvetés és új terv' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
  });

  it('meglévő páciens kiválasztása is megerősítést kér mentetlen piszkozatnál', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: 'Kovács János' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByTestId('draft-oldal')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kovács János' }));
    await user.click(
      await screen.findByRole('button', { name: 'Folytatás, piszkozat elvetésével' }),
    );
    expect(await screen.findByTestId('draft-nev')).toHaveTextContent('Kovács János');
  });

  // backlog-28 (D33): a törzsadat előnyben részesül a legutóbbi terv
  // pillanatképéhez képest, ha van lezárt paciens-adatok.json.
  describe('paciens-adatok.json (D33) hatása', () => {
    it('lezárt törzsadat esetén onnan tölt elő, nem a legutóbbi terv paciens pillanatképéből', async () => {
      const seeder = new DemoStorage();
      await seeder.init();
      const patients = await seeder.listPatients();
      const kovacs = patients.find((p) => p.nev === 'Kovács János')!;
      await seeder.savePatientData(kovacs.dirName, {
        schemaVersion: 1,
        paciensId: kovacs.paciensId,
        nev: 'Kovács János',
        szuletesiIdo: '',
        lakcim: '',
        telefon: '+36 99 999 9999', // eltér a seed terv telefonjától
        email: '',
        taj: '',
        kiskoru: false,
        torvenyesKepviselo: null,
      });

      const user = userEvent.setup();
      renderNewPlan();

      await user.click(await screen.findByRole('button', { name: 'Kovács János' }));

      expect(await screen.findByTestId('draft-nev')).toHaveTextContent('Kovács János');
      expect(screen.getByTestId('draft-telefon')).toHaveTextContent('+36 99 999 9999');
    });

    it('egy terv nélküli, csak törzsadattal rendelkező páciens is kereshető és előtölthető', async () => {
      const seeder = new DemoStorage();
      await seeder.init();
      await seeder.createPatient('Terv Nélküli Panni');

      const user = userEvent.setup();
      renderNewPlan();

      await user.click(await screen.findByRole('button', { name: 'Terv Nélküli Panni' }));

      expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
      expect(screen.getByTestId('draft-nev')).toHaveTextContent('Terv Nélküli Panni');
      expect(screen.queryByText(/Ehhez a pácienshez nincs/)).not.toBeInTheDocument();
    });
  });
});
