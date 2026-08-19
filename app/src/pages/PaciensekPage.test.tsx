// backlog-28. tétel: a Páciensek képernyő -- a paciens-adatok.json (D33)
// szerkesztője. A törzsadat-nélküli sorok élő fallbackje a legutóbbi terv
// `paciens` pillanatképéből jön, lásd seed/plans.ts (Kovács János, Nagy
// Éva telefonszáma).

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import PaciensekPage from './PaciensekPage';
import { TestProviders } from '../testUtils';
import { DemoStorage } from '../storage/DemoStorage';

// backlog-30: a "Korábbi tervek" kereszt-link mostantól az egyesített
// páciens-részletoldalra mutat (`/paciensek/:patientDir`), a tab-ot
// `location.state.tab`-ban átadva.
function PaciensProbe() {
  const { patientDir } = useParams<{ patientDir: string }>();
  const location = useLocation();
  const tab = (location.state as { tab?: string } | null)?.tab ?? '';
  return <div data-testid="paciens-reszletei" data-patientdir={patientDir} data-tab={tab} />;
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

  it('átnevezés egy másik meglévő páciens nevére megerősítést kér mentéskor (D42, redesign D208)', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Tóth Zoltán');
    await user.click(screen.getByText('Tóth Zoltán'));
    const row = patientRow('Tóth Zoltán');
    const dirName = row.getAttribute('data-patient')!;

    const nevMezo = await within(row).findByRole('textbox', { name: 'Név *' });
    await user.clear(nevMezo);
    await user.type(nevMezo, 'Fekete Zoltán');
    await user.click(within(row).getByRole('button', { name: 'Mentés' }));

    const alert = await screen.findByRole('alertdialog');
    expect(within(alert).getByText('Hasonló nevű páciens már létezik')).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Mégse' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(within(row).getByRole('textbox', { name: 'Név *' })).toHaveValue('Fekete Zoltán');

    await user.click(within(row).getByRole('button', { name: 'Mentés' }));
    const alert2 = await screen.findByRole('alertdialog');
    await user.click(within(alert2).getByRole('button', { name: 'Mentés mégis' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    const verify = new DemoStorage();
    await verify.init();
    const adatok = await verify.loadPatientData(dirName);
    expect(adatok?.nev).toBe('Fekete Zoltán');
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

  it('"+ Új páciens" terv nélküli pácienst vesz fel, rögtön nyitva, "Rögzített törzsadat" jelvénnyel, a megadott születési dátummal/telefonnal', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Kovács János');
    await user.click(screen.getByRole('button', { name: '+ Új páciens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Új páciens' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Név *' }), 'Vadonatúj Elemér');
    await user.type(within(dialog).getByLabelText('Született'), '1985-03-20');
    await user.type(within(dialog).getByLabelText('Telefon'), '+36 20 333 4444');
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Vadonatúj Elemér')).toBeInTheDocument();
    const row = patientRow('Vadonatúj Elemér');
    expect(within(row).getByText('Rögzített törzsadat')).toBeInTheDocument();
    // Rögtön nyitva -- a szerkesztő mezői is látszanak, a megadott adatokkal.
    expect(within(row).getAllByDisplayValue('Vadonatúj Elemér')).toHaveLength(1);
    expect(within(row).getByDisplayValue('1985-03-20')).toBeInTheDocument();
    expect(within(row).getByDisplayValue('+36 20 333 4444')).toBeInTheDocument();
  });

  it('"+ Új páciens" névegyezésnél az "Ezt a pácienst választom" a meglévő sort nyitja meg (D203/D204)', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Kovács János');
    await user.click(screen.getByRole('button', { name: '+ Új páciens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Új páciens' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Név *' }), 'Kovács János');
    await user.click(
      await within(dialog).findByRole('button', { name: 'Ezt a pácienst választom: Kovács János' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByDisplayValue('+36 30 123 4567')).toBeInTheDocument();
  });

  it('a "Korábbi tervek" kereszt-link a páciens-részletoldalra navigál, a tervek tabbal előválasztva', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nagy Éva');
    await user.click(screen.getByText('Nagy Éva'));
    await user.click(await screen.findByRole('button', { name: 'Korábbi tervek' }));

    const probe = await screen.findByTestId('paciens-reszletei');
    expect(probe.dataset.patientdir).toBeTruthy();
    expect(probe.dataset.tab).toBe('tervek');
  });
});
