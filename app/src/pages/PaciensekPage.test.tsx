// backlog-28. tétel: a Páciensek képernyő -- a paciens-adatok.json (D33)
// szerkesztője. A törzsadat-nélküli sorok élő fallbackje a legutóbbi terv
// `paciens` pillanatképéből jön, lásd seed/plans.ts (Kovács János, Nagy
// Éva telefonszáma).

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import PaciensekPage from './PaciensekPage';
import { TestProviders } from '../testUtils';
import { DemoStorage } from '../storage/DemoStorage';

function TervekProbe() {
  const location = useLocation();
  const patientDir = (location.state as { patientDir?: string } | null)?.patientDir;
  return <div data-testid="tervek-oldal">{patientDir}</div>;
}

function renderPage() {
  return render(
    <TestProviders>
      <Routes>
        <Route path="/" element={<PaciensekPage />} />
        <Route path="/tervek" element={<TervekProbe />} />
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
    const seeder = new DemoStorage();
    await seeder.init();
  });

  it('a keresőmezőnek van elérhető neve, nem csak placeholder-e (docs/07)', async () => {
    renderPage();
    expect(await screen.findByRole('textbox', { name: 'Keresés páciensnévre' })).toBeInTheDocument();
  });

  it('a törzsadat-állapot szerinti jelvényt mutatja soronként', async () => {
    renderPage();

    await screen.findByText('Nagy Éva');
    expect(within(patientRow('Nagy Éva')).getByText('Rögzített törzsadat')).toBeInTheDocument();
    expect(within(patientRow('Kovács János')).getByText('Élő adat a legutóbbi tervből')).toBeInTheDocument();
    expect(within(patientRow('Tóth Zoltán')).getByText('Élő adat a legutóbbi tervből')).toBeInTheDocument();
  });

  it('keresésre szűkíti a listát', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Kovács János');
    await user.type(screen.getByRole('textbox', { name: 'Keresés páciensnévre' }), 'nagy');

    expect(screen.queryByText('Kovács János')).not.toBeInTheDocument();
    expect(screen.getByText('Nagy Éva')).toBeInTheDocument();
  });

  it('lezárt törzsadat esetén rögtön a törzsadatból tölti fel a mezőket, fallback-jelzés nélkül', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nagy Éva');
    await user.click(screen.getByText('Nagy Éva'));

    expect(await screen.findByDisplayValue('+36 20 555 1234')).toBeInTheDocument();
    expect(screen.queryByText(/mentéssel önálló/)).not.toBeInTheDocument();
  });

  it('törzsadat nélkül a legutóbbi terv paciens pillanatképét mutatja, fallback-jelzéssel', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Kovács János');
    await user.click(screen.getByText('Kovács János'));

    expect(await screen.findByDisplayValue('+36 30 123 4567')).toBeInTheDocument();
    expect(screen.getByText(/mentéssel önálló/)).toBeInTheDocument();
  });

  it('mentés után a jelvény "Rögzített törzsadat"-ra vált, és a paciens-adatok.json ténylegesen létrejön', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Kovács János');
    await user.click(screen.getByText('Kovács János'));
    await screen.findByDisplayValue('+36 30 123 4567');

    const mentesBtn = screen.getByRole('button', { name: 'Mentés' });
    expect(mentesBtn).toBeDisabled(); // még nincs módosítás

    const telefonMezo = screen.getByDisplayValue('+36 30 123 4567');
    await user.clear(telefonMezo);
    await user.type(telefonMezo, '+36 70 000 1111');
    expect(mentesBtn).toBeEnabled();

    await user.click(mentesBtn);

    await waitFor(() =>
      expect(within(patientRow('Kovács János')).getByText('Rögzített törzsadat')).toBeInTheDocument(),
    );

    const verify = new DemoStorage();
    await verify.init();
    const patients = await verify.listPatients();
    const kovacs = patients.find((p) => p.nev === 'Kovács János')!;
    const adatok = await verify.loadPatientData(kovacs.dirName);
    expect(adatok?.telefon).toBe('+36 70 000 1111');
  });

  it('Mégse a legutóbb mentett/betöltött értékre állítja vissza a piszkozatot', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nagy Éva');
    await user.click(screen.getByText('Nagy Éva'));
    const telefonMezo = await screen.findByDisplayValue('+36 20 555 1234');

    await user.clear(telefonMezo);
    await user.type(telefonMezo, 'ideiglenes, nem mentett érték');
    await user.click(screen.getByRole('button', { name: 'Mégse' }));

    expect(await screen.findByDisplayValue('+36 20 555 1234')).toBeInTheDocument();
  });

  it('sor váltásakor mentetlen módosításnál megerősítést kér', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nagy Éva');
    await user.click(screen.getByText('Nagy Éva'));
    const telefonMezo = await screen.findByDisplayValue('+36 20 555 1234');
    await user.clear(telefonMezo);
    await user.type(telefonMezo, 'ideiglenes érték');

    await user.click(screen.getByText('Kovács János'));
    const dialog = await screen.findByRole('alertdialog');

    // Mégse -- a dialóguson BELÜL keresve (a Nagy Éva sornak is van saját
    // "Mégse" gombja, ami ilyenkor is a DOM-ban marad). A Nagy Éva sor
    // marad nyitva, a piszkozat megtartva.
    await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('ideiglenes érték')).toBeInTheDocument();

    // Váltás megerősítéssel -- a Kovács János sor nyílik meg, a piszkozat elveszik.
    await user.click(screen.getByText('Kovács János'));
    await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));
    expect(await screen.findByDisplayValue('+36 30 123 4567')).toBeInTheDocument();
  });

  it('"+ Új páciens" terv nélküli pácienst vesz fel, rögtön nyitva, "Rögzített törzsadat" jelvénnyel', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Kovács János');
    await user.click(screen.getByRole('button', { name: '+ Új páciens' }));
    const nevMezo = await screen.findByPlaceholderText('Kovács János');
    await user.type(nevMezo, 'Vadonatúj Elemér');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Vadonatúj Elemér')).toBeInTheDocument();
    expect(
      within(patientRow('Vadonatúj Elemér')).getByText('Rögzített törzsadat'),
    ).toBeInTheDocument();
    // Rögtön nyitva -- a szerkesztő mezői is látszanak, üresen.
    expect(screen.getAllByDisplayValue('Vadonatúj Elemér')).toHaveLength(1);
  });

  it('a "Korábbi tervek" kereszt-link a /tervek útvonalra navigál, a patientDir-t átadva', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nagy Éva');
    await user.click(screen.getByText('Nagy Éva'));
    await user.click(await screen.findByRole('button', { name: 'Korábbi tervek' }));

    const probe = await screen.findByTestId('tervek-oldal');
    expect(probe.textContent).toBeTruthy();
  });
});
