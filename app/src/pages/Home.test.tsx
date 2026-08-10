// docs/03-funkcionalis-spec.md § Autosave: a Home "Piszkozat folytatása"
// kártyája az EGYETLEN belépési pont egy visszaállított/mentetlen
// piszkozathoz -- ezeket a teszteket egy előre, közvetlenül a `dp:piszkozat`
// localStorage-kulcsba írt DraftRecord-dal szimuláljuk (AppState a betöltő
// effektjében ezt olvassa vissza, lásd AppState.test-szerű mintát
// PlanHistoryPage.test.tsx-ben: előbb a rendes seedet kell beírni, MERT a
// StorageProvider saját DemoStorage-példánya `init()`-kor `resetDemoData()`-t
// futtatna, ami a `clearAll()` miatt a piszkozatot is elsöpörné, ha az már
// előtte a helyén lenne).

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import Home from './Home';
import { TestProviders } from '../testUtils';
import { DemoStorage } from '../storage/DemoStorage';
import type { Plan } from '../domain/types';

function makeDirtyPlan(overrides: Partial<Plan> = {}): Plan {
  return {
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
      nev: 'Teszt Piroska',
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
}

function seedPersistedDraft(plan: Plan, mentve = '2026-08-09T10:15:00.000Z') {
  localStorage.setItem('dp:piszkozat', JSON.stringify({ schemaVersion: 1, mentve, plan }));
}

function renderHome() {
  return render(
    <TestProviders>
      <Home />
    </TestProviders>,
  );
}

describe('Home -- piszkozat-perzisztencia', () => {
  beforeEach(async () => {
    localStorage.clear();
    // Előbb a rendes seed (lásd fenti fejléc-komment), utána -- ha a teszt
    // kéri -- a piszkozat.
    const seeder = new DemoStorage();
    await seeder.init();
  });

  it('nincs "Piszkozat folytatása" kártya és hibaüzenet sincs, ha nincs perzisztált piszkozat', async () => {
    renderHome();
    await screen.findByRole('button', { name: 'Új terv indítása' });
    expect(screen.queryByText('Piszkozat folytatása')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Piszkozat elvetése' })).not.toBeInTheDocument();
  });

  it('a "Piszkozat folytatása" kártya a páciensnevet és az utolsó mentés időpontját mutatja', async () => {
    seedPersistedDraft(makeDirtyPlan());
    renderHome();

    expect(await screen.findByText('Piszkozat folytatása')).toBeInTheDocument();
    expect(screen.getByText('Teszt Piroska')).toBeInTheDocument();
    expect(screen.getByText(/Utolsó módosítás:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Megnyitás' })).toBeInTheDocument();
  });

  it('névtelen (de tartalmas) piszkozatnál "Névtelen piszkozat" jelenik meg', async () => {
    seedPersistedDraft(makeDirtyPlan({ paciens: { ...makeDirtyPlan().paciens, nev: '' }, tervId: 'abc123' }));
    renderHome();

    expect(await screen.findByText('Piszkozat folytatása')).toBeInTheDocument();
    expect(screen.getByText('Névtelen piszkozat')).toBeInTheDocument();
  });

  it('"Új terv indítása" azonnal indul, megerősítés nélkül, ha nincs mentetlen piszkozat', async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('"Új terv indítása" megerősítést kér mentetlen piszkozatnál -- Mégse megtartja, a megerősítés eldobja', async () => {
    seedPersistedDraft(makeDirtyPlan());
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Piszkozat folytatása');

    await user.click(screen.getByRole('button', { name: 'Új terv indítása' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    // Mégse -- a piszkozat megmarad.
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Piszkozat folytatása')).toBeInTheDocument();

    // Megerősítés -- a piszkozat kártya eltűnik (a plan egy friss, üres
    // tervre vált, ami már nem "tartalmas").
    await user.click(screen.getByRole('button', { name: 'Új terv indítása' }));
    await user.click(await screen.findByRole('button', { name: 'Elvetés és új terv' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Piszkozat folytatása')).not.toBeInTheDocument();
  });

  it('sérült perzisztált piszkozatnál látható hibaüzenet jelenik meg, ami az "Piszkozat elvetése" gombra eltűnik', async () => {
    localStorage.setItem('dp:piszkozat', 'not valid json {{{');
    const user = userEvent.setup();
    renderHome();

    expect(
      await screen.findByText(/A mentett piszkozatot nem sikerült visszaállítani/),
    ).toBeInTheDocument();
    // A sérült piszkozat nem tűnhet el nyomtalanul -- nincs "Piszkozat
    // folytatása" kártya sem, hiszen semmi nem állt vissza.
    expect(screen.queryByText('Piszkozat folytatása')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Piszkozat elvetése' }));
    expect(
      screen.queryByText(/A mentett piszkozatot nem sikerült visszaállítani/),
    ).not.toBeInTheDocument();
  });
});
