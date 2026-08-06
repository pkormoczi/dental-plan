// A nyelv/pénznem kártya láthatósága és figyelmeztetései (D21). Lásd
// CLAUDE.md "A UX kritikus pontja" -- ez a szomszédos képernyő, ahol a
// terv nyelve/pénzneme eldől, mielőtt a doki a szerkesztőbe lép.

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import PatientPage from './PatientPage';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';

function renderPatient() {
  return render(
    <MemoryRouter>
      <StorageProvider>
        <AppStateProvider>
          <PatientPage />
        </AppStateProvider>
      </StorageProvider>
    </MemoryRouter>,
  );
}

/** A kártya elrejtve-állapotát teszteli -- explicit `nemetEngedelyezve: false`, mert a seed alapértéke már `true`. */
function seedWithGermanDisabled() {
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem(
    'dp:beallitasok.json',
    JSON.stringify({ ...seedSettings, nemetEngedelyezve: false }),
  );
}

/** A német kártya + egy árlista, amiben egyetlen tételnek sincs EUR ára. */
function seedWithGermanEnabledAndNoEurPrices() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) => ({ ...x, ar: { ...x.ar, EUR: null } })),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem(
    'dp:beallitasok.json',
    JSON.stringify({ ...seedSettings, nemetEngedelyezve: true }),
  );
}

/** A német kártya + egy árlista, amiben egyetlen tételnek sincs német neve. */
function seedWithGermanEnabledAndNoGermanNames() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) => ({ ...x, nev: { ...x.nev, de: null } })),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem(
    'dp:beallitasok.json',
    JSON.stringify({ ...seedSettings, nemetEngedelyezve: true }),
  );
}

describe('PatientPage -- nyelv/pénznem kártya', () => {
  beforeEach(() => {
    localStorage.clear();
    // A "locks the card" teszt a teljes App-ot (HashRouter) rendereli --
    // a window.location.hash a jsdom window-on nem reset a tesztek között.
    window.location.hash = '';
  });

  it('hides the language/currency card when nemetEngedelyezve is false', async () => {
    seedWithGermanDisabled();
    renderPatient();
    await screen.findByPlaceholderText('Kovács János');
    expect(screen.queryByText('Az ajánlat nyelve és pénzneme')).toBeNull();
  });

  it('shows the card once nemetEngedelyezve is true (seed default)', async () => {
    renderPatient();
    expect(await screen.findByText('Az ajánlat nyelve és pénzneme')).toBeInTheDocument();
  });

  it('warns when the selected pénznem has zero priced items', async () => {
    const user = userEvent.setup();
    seedWithGermanEnabledAndNoEurPrices();
    renderPatient();
    await screen.findByText('Az ajánlat nyelve és pénzneme');

    await user.click(screen.getByRole('button', { name: 'EUR — euró' }));

    expect(
      await screen.findByText(/egyetlen tétel sincs beárazva/),
    ).toBeInTheDocument();
  });

  it('warns about missing German item names once Deutsch is selected', async () => {
    const user = userEvent.setup();
    seedWithGermanEnabledAndNoGermanNames();
    renderPatient();
    await screen.findByText('Az ajánlat nyelve és pénzneme');

    await user.click(screen.getByRole('button', { name: 'Deutsch' }));

    expect(
      await screen.findByText(/118 \/ 118 aktív tételnek nincs német neve/),
    ).toBeInTheDocument();
  });

  it('locks the card (no chips, static text) once a plan has a tervId (D4)', async () => {
    const user = userEvent.setup();
    render(<App />);

    // A német a seed alapértelmezés szerint már engedélyezve van, nincs
    // szükség a Beállítások oldalon való bekapcsolásra -- csak átnavigálunk
    // rajta, hogy a Kezdőlap "Korábbi tervek" parancsikonja (ami a navbar
    // linkjével azonos nevű) ne okozzon kétértelmű találatot.
    await user.click(await screen.findByRole('link', { name: 'Beállítások' }));
    await user.click(await screen.findByRole('link', { name: 'Korábbi tervek' }));
    const patientNameEl = await screen.findByText('Kovács János');
    const patientCard = patientNameEl.parentElement as HTMLElement;
    await user.click(
      within(patientCard).getByRole('button', { name: 'Megnyitás szerkesztésre' }),
    );
    // Kovács János demó tervének két fázisa van, mindkettőnek saját
    // keresője -- findAllBy, nem findBy (ami az egyértelműséget várná el).
    await screen.findAllByPlaceholderText(/Tétel keresése/);

    await user.click(screen.getByRole('link', { name: 'Páciens' }));

    expect(await screen.findByText('Az ajánlat nyelve és pénzneme')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deutsch' })).toBeNull();
    expect(screen.getByText(/nem módosítható/)).toBeInTheDocument();
  });
});
