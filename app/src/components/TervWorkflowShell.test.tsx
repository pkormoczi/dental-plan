// backlog-31: a terv-workflow héj (breadcrumb + stepper). A három
// workflow-oldal saját tartalmát a PatientPage.test.tsx/
// PlanEditorPage.test.tsx/PreviewPage.test.tsx már lefedi -- ez a fájl csak
// az ÚJ, közös héjat teszteli (probe-route-okkal a `/terv`/`/elonezet`
// helyén, hogy a szerkesztő/előnézet saját betöltési logikája ne zajítsa
// a tesztet).

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { beforeEach, describe, expect, it } from 'vitest';
import TervWorkflowShell from './TervWorkflowShell';
import PatientPage from '../pages/PatientPage';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';

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
});
