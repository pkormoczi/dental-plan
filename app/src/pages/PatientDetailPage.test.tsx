// backlog-30: az egyesített páciens-részletoldal (két tab: Páciens adatai |
// Kezelési tervek, URL-lel címezhető). A terv-lánc/verzió fa
// (PatientPlanChains) saját, teljes lefedettséggel rendelkezik a
// PlanHistoryPage.test.tsx-ben. A `Páciens adatai` tab tartalmának
// (PatientEditorPanel) mezőkészlet/Save-Cancel viselkedése -- a 38. tétel
// (D43) óta, mióta a Pácienslista tiszta navigációs lista, ennek az
// egyetlen hívási helye ez az oldal -- itt fedve (mentés → tényleges
// paciens-adatok.json, átnevezés-duplikáció megerősítés). Ami ezen felül
// marad, csak az ÚJ, oldal-szintű viselkedés: URL-ből feloldott páciens,
// alapértelmezett/átadott tab, tab-váltás navigáció NÉLKÜL, 0 láncú páciens
// CTA-ja, sticky fejléc.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { beforeEach, describe, expect, it } from 'vitest';
import PatientDetailPage from './PatientDetailPage';
import { AppStateProvider, useAppState } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
import { DemoStorage } from '../storage/DemoStorage';
import { seedPatients } from '../storage/seed/plans';

function DraftProbe() {
  const { plan } = useAppState();
  return <div data-testid="draft-nev">{plan.paciens.nev}</div>;
}

function renderDetail(patientDir: string, state?: Record<string, unknown>) {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter
        initialEntries={[{ pathname: `/paciensek/${encodeURIComponent(patientDir)}`, state }]}
      >
        <StorageProvider>
          <AppStateProvider>
            <Routes>
              <Route path="/paciensek/:patientDir" element={<PatientDetailPage />} />
              <Route path="/paciens" element={<DraftProbe />} />
            </Routes>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>,
  );
}

const nagyDir = seedPatients.find((p) => p.record.nev === 'Nagy Éva')!.patientDir;
const kovacsDir = seedPatients.find((p) => p.record.nev === 'Kovács János')!.patientDir;
const tothDir = seedPatients.find((p) => p.record.nev === 'Tóth Zoltán')!.patientDir;

describe('PatientDetailPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    const seeder = new DemoStorage();
    await seeder.init();
  });

  it('közvetlen URL-ről (hideg render, nem kattintva) a helyes páciens jelenik meg', async () => {
    renderDetail(nagyDir);
    const header = await screen.findByTestId('patient-detail-header');
    expect(within(header).getByText('Nagy Éva')).toBeInTheDocument();
  });

  it('alapból a Kezelési tervek tab aktív', async () => {
    renderDetail(nagyDir);

    const tervekTab = await screen.findByRole('tab', { name: /Kezelési tervek/ });
    expect(tervekTab).toHaveAttribute('aria-selected', 'true');
    // A "Kezelési tervek" tab tartalmának "Új terv" gombja csak ebben a
    // tabban van jelen (a "Páciens adatai" tabon nincs, lásd lentebb) --
    // megbízható jelzés arra, hogy ténylegesen ez a tab renderel (Radix
    // Tabs.Content az inaktív tabot nem is rendereli, nem csak elrejti).
    expect(await screen.findByRole('button', { name: 'Új terv' })).toBeInTheDocument();
  });

  it('location.state.tab: "adatai" felülírja az alapértelmezett tabot, és nincs rajta Új terv gomb', async () => {
    renderDetail(nagyDir, { tab: 'adatai' });

    const adataiTab = await screen.findByRole('tab', { name: /Páciens adatai/ });
    expect(adataiTab).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: 'Mentés' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Új terv' })).not.toBeInTheDocument();
  });

  it('a sticky fejléc a törzsadatnak megfelelő nevet, születési dátumot és telefont mutatja', async () => {
    renderDetail(nagyDir);

    const header = await screen.findByTestId('patient-detail-header');
    expect(within(header).getByText('Nagy Éva')).toBeInTheDocument();
    expect(within(header).getByText('1990.11.02.')).toBeInTheDocument();
    expect(within(header).getByText('+36 20 555 1234')).toBeInTheDocument();
  });

  // D44: a sticky fejléc már kimondja a páciens nevét, a tabsor pedig
  // kínálja a "Páciens adatai" utat -- a "Kezelési tervek" tab beágyazott
  // PatientPlanChains-fejléce egyiket sem ismételheti meg.
  it('a Kezelési tervek tabon a páciens neve nincs duplikálva, és nincs második "Páciens adatai" út', async () => {
    renderDetail(nagyDir);

    const header = await screen.findByTestId('patient-detail-header');
    await screen.findByRole('button', { name: 'Új terv' }); // a tab tartalma betöltött

    expect(screen.getAllByText('Nagy Éva')).toHaveLength(1);
    expect(within(header).getByText('Nagy Éva')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Páciens adatai' })).not.toBeInTheDocument();
  });

  // D44: a tabsor már kínálja a "Kezelési tervek" váltást -- a
  // PatientEditorPanel alján nincs tükör-link ugyanerre.
  it('a Páciens adatai tabon nincs "Korábbi tervek" gomb', async () => {
    renderDetail(nagyDir, { tab: 'adatai' });

    await screen.findByRole('button', { name: 'Mentés' }); // a panel betöltött
    expect(screen.queryByRole('button', { name: 'Korábbi tervek' })).not.toBeInTheDocument();
  });

  it('0 láncú páciens a Kezelési tervek tabon CTA-t mutat, és a gomb sikeresen elindít egy tervet', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const folder = await seeder.createPatient('Teszt Üres');

    const user = userEvent.setup();
    renderDetail(folder.dirName);

    expect(await screen.findByText('Ennek a páciensnek még nincs kezelési terve.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Új terv' }));

    expect(await screen.findByTestId('draft-nev')).toHaveTextContent('Teszt Üres');
  });

  it('meglévő terv-láncú páciensnél (Kovács János) a Kezelési tervek tab a fát mutatja, nem CTA-t', async () => {
    renderDetail(kovacsDir);

    expect(
      screen.queryByText('Ennek a páciensnek még nincs kezelési terve.'),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Új terv' })).toBeInTheDocument();
  });

  // D38: a Radix `Tabs` unmountolja az inaktív tabot -- a "Páciens
  // adatai" tabon félbehagyott szerkesztés máskülönben némán elveszne
  // egy tab-váltásnál.
  it('mentetlen módosítással tabot váltva megerősítést kér -- Mégse megtartja a piszkozatot', async () => {
    const user = userEvent.setup();
    renderDetail(nagyDir, { tab: 'adatai' });

    const telefonMezo = await screen.findByDisplayValue('+36 20 555 1234');
    await user.clear(telefonMezo);
    await user.type(telefonMezo, 'ideiglenes érték');

    await user.click(await screen.findByRole('tab', { name: /Kezelési tervek/ }));
    const dialog = await screen.findByRole('alertdialog');

    await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('ideiglenes érték')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Páciens adatai/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('mentetlen módosítással tabot váltva a megerősítés után elveszik a piszkozat', async () => {
    const user = userEvent.setup();
    renderDetail(nagyDir, { tab: 'adatai' });

    const telefonMezo = await screen.findByDisplayValue('+36 20 555 1234');
    await user.clear(telefonMezo);
    await user.type(telefonMezo, 'ideiglenes érték');

    await user.click(await screen.findByRole('tab', { name: /Kezelési tervek/ }));
    await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));

    const tervekTab = await screen.findByRole('tab', { name: /Kezelési tervek/ });
    expect(tervekTab).toHaveAttribute('aria-selected', 'true');

    await user.click(await screen.findByRole('tab', { name: /Páciens adatai/ }));
    expect(await screen.findByDisplayValue('+36 20 555 1234')).toBeInTheDocument();
  });

  // Kovács Jánosnak (a seed szerint) nincs saját paciens-adatok.json-ja --
  // a mezők a legutóbbi terv paciens-pillanatképéből előre kitöltve
  // nyílnak, fallback-jelzéssel; mentés után a jelzés eltűnik és a fájl
  // ténylegesen létrejön.
  it('törzsadat nélküli páciensnél a legutóbbi terv paciens pillanatképét mutatja, fallback-jelzéssel, mentés után önálló törzsadattá válik', async () => {
    const user = userEvent.setup();
    renderDetail(kovacsDir, { tab: 'adatai' });

    expect(await screen.findByDisplayValue('+36 30 123 4567')).toBeInTheDocument();
    expect(screen.getByText(/mentéssel önálló/)).toBeInTheDocument();

    const telefonMezo = screen.getByDisplayValue('+36 30 123 4567');
    await user.clear(telefonMezo);
    await user.type(telefonMezo, '+36 70 000 1111');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    await waitFor(() => expect(screen.queryByText(/mentéssel önálló/)).not.toBeInTheDocument());

    const verify = new DemoStorage();
    await verify.init();
    const adatok = await verify.loadPatientData(kovacsDir);
    expect(adatok?.telefon).toBe('+36 70 000 1111');
  });

  it('átnevezés egy másik meglévő páciens nevére megerősítést kér mentéskor (D42, redesign D208)', async () => {
    const user = userEvent.setup();
    renderDetail(tothDir, { tab: 'adatai' });

    const nevMezo = await screen.findByRole('textbox', { name: 'Név *' });
    await user.clear(nevMezo);
    await user.type(nevMezo, 'Fekete Zoltán');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    const alert = await screen.findByRole('alertdialog');
    expect(within(alert).getByText('Hasonló nevű páciens már létezik')).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Mégse' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Név *' })).toHaveValue('Fekete Zoltán');

    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    const alert2 = await screen.findByRole('alertdialog');
    await user.click(within(alert2).getByRole('button', { name: 'Mentés mégis' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    const verify = new DemoStorage();
    await verify.init();
    const adatok = await verify.loadPatientData(tothDir);
    expect(adatok?.nev).toBe('Fekete Zoltán');
  });
});
