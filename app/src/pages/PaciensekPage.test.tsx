// 38. tétel (D43): a lista tiszta NAVIGÁCIÓS lista -- a sorok a
// páciens-részletoldalra (`/paciensek/:patientDir`) navigálnak, a
// törzsadat-szerkesztő (`PatientEditorPanel`) mezőkészlet/Save-Cancel
// viselkedése a `PatientDetailPage.test.tsx`-ben fedett (az egyetlen
// megmaradó hívási hely). Ez a fájl a lista-specifikus viselkedést fedi:
// sor tartalma, keresés (név/DOB/telefon), navigáció, state-megőrzés.

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import PaciensekPage from './PaciensekPage';
import { TestProviders } from '../testUtils';
import { resetListStateMemoryForTests } from '../components/useListStateMemory';
import { DemoStorage } from '../storage/DemoStorage';

function PaciensProbe() {
  const { patientDir } = useParams<{ patientDir: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { tab?: string; mod?: string } | null;
  const tab = state?.tab ?? '';
  const mod = state?.mod ?? '';
  return (
    <div>
      <div data-testid="paciens-reszletei" data-patientdir={patientDir} data-tab={tab} data-mod={mod} />
      {/* `navigate(-1)` -- valódi böngésző-"vissza" (POP), a `Link to="/"`-tól
          eltérően, ami PUSH-ot adna, tehát a `useListStateMemory` (D43) nem
          állítana vissza semmit -- lásd useListStateMemory.test.tsx. */}
      <button onClick={() => navigate(-1)}>Vissza a listára</button>
    </div>
  );
}

function renderPage() {
  return render(
    <TestProviders>
      <Routes>
        <Route path="/" element={<PaciensekPage />} />
        <Route path="/paciensek/:patientDir" element={<PaciensProbe />} />
      </Routes>
    </TestProviders>,
  );
}

function patientRow(nev: string): HTMLElement {
  return screen.getByText(nev).closest('[data-patient]') as HTMLElement;
}

describe('PaciensekPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    resetListStateMemoryForTests();
    const seeder = new DemoStorage();
    await seeder.init();
  });

  it('a keresőmezőnek van elérhető neve, nem csak placeholder-e (docs/07)', async () => {
    renderPage();
    expect(
      await screen.findByRole('textbox', { name: 'Keresés névre, születési dátumra vagy telefonra' }),
    ).toBeInTheDocument();
  });

  it('a sor nevet, születési dátumot és telefont mutat, jelvény nélkül', async () => {
    renderPage();

    await screen.findByText('Nagy Éva');
    const row = patientRow('Nagy Éva');
    expect(within(row).getByText('1990.11.02.')).toBeInTheDocument();
    expect(within(row).getByText('+36 20 555 1234')).toBeInTheDocument();
    expect(within(row).queryByText('Rögzített törzsadat')).not.toBeInTheDocument();
    expect(within(row).queryByText('Élő adat a legutóbbi tervből')).not.toBeInTheDocument();
  });

  it('egy sorra kattintás a páciens-részletoldalra navigál, nem nyílik ki helyben', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nagy Éva');
    await user.click(screen.getByText('Nagy Éva'));

    const probe = await screen.findByTestId('paciens-reszletei');
    expect(probe.dataset.patientdir).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mentés' })).not.toBeInTheDocument();
  });

  it('keresésre névre szűkíti a listát', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Kovács János');
    await user.type(
      screen.getByRole('textbox', { name: 'Keresés névre, születési dátumra vagy telefonra' }),
      'nagy',
    );

    expect(screen.queryByText('Kovács János')).not.toBeInTheDocument();
    expect(screen.getByText('Nagy Éva')).toBeInTheDocument();
  });

  it('keresés a születési dátumra is talál egyezést', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nagy Éva');
    await user.type(
      screen.getByRole('textbox', { name: 'Keresés névre, születési dátumra vagy telefonra' }),
      '1990',
    );

    expect(screen.getByText('Nagy Éva')).toBeInTheDocument();
    expect(screen.queryByText('Kovács János')).not.toBeInTheDocument();
  });

  it('keresés a telefonszámra is talál egyezést, elválasztójeltől függetlenül', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nagy Éva');
    await user.type(
      screen.getByRole('textbox', { name: 'Keresés névre, születési dátumra vagy telefonra' }),
      '5551234',
    );

    expect(screen.getByText('Nagy Éva')).toBeInTheDocument();
    expect(screen.queryByText('Kovács János')).not.toBeInTheDocument();
  });

  it('"+ Új páciens" mentés után a részletoldalra navigál, a Páciens adatai tabbal', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Kovács János');
    await user.click(screen.getByRole('button', { name: '+ Új páciens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Új páciens' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Név *' }), 'Vadonatúj Elemér');
    await user.type(within(dialog).getByLabelText('Született'), '1985-03-20');
    await user.type(within(dialog).getByLabelText('Telefon'), '+36 20 333 4444');
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

    const probe = await screen.findByTestId('paciens-reszletei');
    expect(probe.dataset.patientdir).toBeTruthy();
    expect(probe.dataset.tab).toBe('adatai');
    // Frissen létrehozott páciens -- szerkesztés módban nyílik (D45), hogy
    // a doki tovább tölthesse a mezőket.
    expect(probe.dataset.mod).toBe('szerkesztes');

    const verify = new DemoStorage();
    await verify.init();
    const patients = await verify.listPatients();
    expect(patients.some((p) => p.nev === 'Vadonatúj Elemér')).toBe(true);
  });

  it('"+ Új páciens" névegyezésnél az "Ezt a pácienst választom" a meglévő páciens részletoldalára navigál (D203/D204)', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Kovács János');
    await user.click(screen.getByRole('button', { name: '+ Új páciens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Új páciens' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Név *' }), 'Kovács János');
    await user.click(
      await within(dialog).findByRole('button', { name: 'Ezt a pácienst választom: Kovács János' }),
    );

    const probe = await screen.findByTestId('paciens-reszletei');
    expect(probe.dataset.tab).toBe('adatai');
    // Egy MEGLÉVŐ páciens kiválasztása -- nem létrehozás -- nézet módban
    // nyit, nem szerkesztésben (D45).
    expect(probe.dataset.mod).toBe('');
  });

  it('elnavigálás után böngésző-"vissza" navigálva a keresőszöveg megmarad (D43)', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nagy Éva');
    await user.type(
      screen.getByRole('textbox', { name: 'Keresés névre, születési dátumra vagy telefonra' }),
      'nagy',
    );
    await user.click(screen.getByText('Nagy Éva'));
    await screen.findByTestId('paciens-reszletei');

    await user.click(screen.getByRole('button', { name: 'Vissza a listára' }));
    expect(
      await screen.findByRole('textbox', { name: 'Keresés névre, születési dátumra vagy telefonra' }),
    ).toHaveValue('nagy');
  });
});
