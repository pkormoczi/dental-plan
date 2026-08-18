// backlog-31: a terv-workflow héj (breadcrumb + stepper). A három
// workflow-oldal saját tartalmát a PatientPage.test.tsx/
// PlanEditorPage.test.tsx/PreviewPage.test.tsx már lefedi -- ez a fájl csak
// az ÚJ, közös héjat teszteli (probe-route-okkal a `/terv`/`/elonezet`
// helyén, hogy a szerkesztő/előnézet saját betöltési logikája ne zajítsa
// a tesztet).

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { beforeEach, describe, expect, it } from 'vitest';
import TervWorkflowShell from './TervWorkflowShell';
import PatientPage from '../pages/PatientPage';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
import { DemoStorage } from '../storage/DemoStorage';
import type { Plan } from '../domain/types';

// D37: egy aktív, tartalmas piszkozat, opcionális patientDir/lastRoute
// metaadattal -- a `dp:piszkozat` kulcsba előre beírva, MIELŐTT a
// StorageProvider renderelne (lásd Home.test.tsx azonos mintáját: a
// DemoStorage.init() resetDemoData()-t futtatna hiányzó árlistánál, ami a
// clearAll() miatt a piszkozatot is elsöpörné).
function makeDirtyPlan(): Plan {
  return {
    schemaVersion: 1,
    tervId: 'meglevo123',
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
  };
}

async function seedActiveDraft(meta: { patientDir?: string; lastRoute?: string } = {}) {
  const seeder = new DemoStorage();
  await seeder.init();
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:15:00.000Z', plan: makeDirtyPlan(), ...meta }),
  );
}

function Probe({ label }: { label: string }) {
  return <div>{label}</div>;
}

function renderShell(initialPath: string) {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter initialEntries={[initialPath]}>
        <StorageProvider>
          <AppStateProvider>
            <Routes>
              <Route path="/paciensek" element={<Probe label="Pácienslista" />} />
              <Route element={<TervWorkflowShell />}>
                <Route path="/paciens" element={<PatientPage />} />
                <Route path="/terv" element={<Probe label="Kezelések-oldal" />} />
                <Route path="/elonezet" element={<Probe label="Előnézet-oldal" />} />
              </Route>
            </Routes>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>,
  );
}

describe('TervWorkflowShell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mindhárom lépést megjeleníti, a jelenlegi route lépése aria-current="step"', async () => {
    renderShell('/terv');
    const stepper = await screen.findByRole('navigation', { name: 'Terv munkafolyamat' });

    expect(within(stepper).getByRole('link', { name: /Terv adatai/ })).toBeInTheDocument();
    expect(within(stepper).getByRole('link', { name: /Előnézet és véglegesítés/ })).toBeInTheDocument();

    const aktivLepes = within(stepper).getByRole('link', { name: /Kezelések/ });
    expect(aktivLepes).toHaveAttribute('aria-current', 'step');
    expect(within(stepper).getByRole('link', { name: /Terv adatai/ })).not.toHaveAttribute('aria-current');
  });

  it('lépésre kattintva navigál, üres draftnál is -- blokkolás nélkül', async () => {
    const user = userEvent.setup();
    renderShell('/paciens');
    await screen.findByPlaceholderText('Kovács János'); // a /paciens oldal betöltött, a draft üres

    await user.click(screen.getByRole('link', { name: /Előnézet és véglegesítés/ }));

    expect(await screen.findByText('Előnézet-oldal')).toBeInTheDocument();
  });

  it('a Páciensek breadcrumb-szegmens /paciensek-re mutat, a páciens neve NEM link, üres névnél "Új páciens"', async () => {
    renderShell('/terv');
    const breadcrumb = await screen.findByRole('navigation', { name: 'Hol vagyok' });

    expect(within(breadcrumb).getByRole('link', { name: 'Páciensek' })).toHaveAttribute(
      'href',
      '/paciensek',
    );
    expect(within(breadcrumb).getByText('Új páciens')).toBeInTheDocument();
    expect(within(breadcrumb).queryByRole('link', { name: 'Új páciens' })).toBeNull();
  });

  it('a breadcrumb a draft páciensnevét tükrözi, amint a doki beírja', async () => {
    const user = userEvent.setup();
    renderShell('/paciens');
    const nameInput = await screen.findByPlaceholderText('Kovács János');

    await user.type(nameInput, 'Teszt Elek');

    const breadcrumb = await screen.findByRole('navigation', { name: 'Hol vagyok' });
    expect(within(breadcrumb).getByText('Teszt Elek')).toBeInTheDocument();
  });

  // D37: a korábban dangling (D36 "leendő aktív draft lifecycle tétel
  // hatóköre") előre-hivatkozás ezzel zárul le.
  it('ismert patientDir esetén a páciens-szegmens linkké válik a részletoldalára', async () => {
    await seedActiveDraft({ patientDir: 'Teszt-Piroska_abc123' });
    renderShell('/terv');

    const breadcrumb = await screen.findByRole('navigation', { name: 'Hol vagyok' });
    const link = within(breadcrumb).getByRole('link', { name: 'Teszt Piroska' });
    expect(link).toHaveAttribute('href', '/paciensek/Teszt-Piroska_abc123');
  });

  it('route-váltásra a lastRoute perzisztálódik a dp:piszkozat rekordba, ha van aktív draft', async () => {
    await seedActiveDraft();
    const user = userEvent.setup();
    renderShell('/paciens');

    await user.click(await screen.findByRole('link', { name: /Előnézet és véglegesítés/ }));
    await screen.findByText('Előnézet-oldal');

    await waitFor(() => {
      const rec = JSON.parse(localStorage.getItem('dp:piszkozat') as string);
      expect(rec.lastRoute).toBe('/elonezet');
    });
  });
});
