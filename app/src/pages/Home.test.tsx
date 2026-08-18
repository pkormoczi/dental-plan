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
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { beforeEach, describe, expect, it } from 'vitest';
import Home from './Home';
import { TestProviders } from '../testUtils';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
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

function seedPersistedDraft(
  plan: Plan,
  mentve = '2026-08-09T10:15:00.000Z',
  meta: { patientDir?: string; lastRoute?: string } = {},
) {
  localStorage.setItem('dp:piszkozat', JSON.stringify({ schemaVersion: 1, mentve, plan, ...meta }));
}

function renderHome() {
  return render(
    <TestProviders>
      <Home />
    </TestProviders>,
  );
}

function Probe({ label }: { label: string }) {
  return <div>{label}</div>;
}

// A `TestProviders` bare MemoryRouter-je nem vált route-ot (lásd fenti
// D29-komment) -- ahol a "Megnyitás" TÉNYLEGES célja számít (D37
// lastRoute), valódi Routes/probe-oldalak kellenek, a
// TervWorkflowShell.test.tsx mintáján.
function renderHomeWithRoutes() {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter initialEntries={['/']}>
        <StorageProvider>
          <AppStateProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/paciens" element={<Probe label="Páciens-oldal" />} />
              <Route path="/terv" element={<Probe label="Kezelések-oldal" />} />
              <Route path="/elonezet" element={<Probe label="Előnézet-oldal" />} />
            </Routes>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>,
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

  // D29: a piszkozat-felülírás-őr innentől az /uj-terv köztes
  // páciens-választón fut le (lásd NewPlanPage.test.tsx) -- a Home gombja
  // feltétel nélkül odanavigál, itt csak ennyi ellenőrizhető izoláltan
  // (a `TestProviders` bare `MemoryRouter`-je nem vált route-ot).
  it('"Új terv indítása" nem nyit megerősítő dialógust -- feltétel nélkül az /uj-terv köztes lépésre navigál', async () => {
    seedPersistedDraft(makeDirtyPlan());
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Piszkozat folytatása');

    await user.click(screen.getByRole('button', { name: 'Új terv indítása' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // A piszkozat itt még nem veszett el -- az őr a NewPlanPage-en dől el.
    expect(screen.getByText('Piszkozat folytatása')).toBeInTheDocument();
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

  // D37: a "Megnyitás" a perzisztált lastRoute-ra navigál, nem a
  // névkitöltés-heurisztikára.
  it('"Megnyitás" a piszkozat lastRoute-jára navigál, ha az ismert', async () => {
    seedPersistedDraft(makeDirtyPlan(), undefined, { lastRoute: '/elonezet' });
    const user = userEvent.setup();
    renderHomeWithRoutes();
    await user.click(await screen.findByRole('button', { name: 'Megnyitás' }));

    expect(await screen.findByText('Előnézet-oldal')).toBeInTheDocument();
  });

  it('lastRoute nélküli (funkció előtti) piszkozatnál a mai névkitöltés-heurisztika dönt', async () => {
    seedPersistedDraft(makeDirtyPlan());
    const user = userEvent.setup();
    renderHomeWithRoutes();
    await user.click(await screen.findByRole('button', { name: 'Megnyitás' }));

    // makeDirtyPlan() nem-üres nevet ad -> a heurisztika a /terv-re visz.
    expect(await screen.findByText('Kezelések-oldal')).toBeInTheDocument();
  });

  // D37/7. döntés: a Home EGÉSZSÉGES kártyáján az eldobás megerősítést kér
  // (ellentétben a fenti, sérült-kártya megerősítés NÉLKÜLI gombjával).
  it('az egészséges kártya "Piszkozat elvetése" gombja megerősítést kér, elfogadás után a kártya eltűnik', async () => {
    seedPersistedDraft(makeDirtyPlan());
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Piszkozat folytatása');

    await user.click(screen.getByRole('button', { name: 'Piszkozat elvetése' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Piszkozat folytatása')).toBeInTheDocument(); // még nem tűnt el

    await user.click(screen.getByRole('button', { name: 'Elvetés' }));
    expect(screen.queryByText('Piszkozat folytatása')).not.toBeInTheDocument();
  });
});
