// A nyelv/pénznem kártya láthatósága és figyelmeztetései (D21). Lásd
// CLAUDE.md "A UX kritikus pontja" -- ez a szomszédos képernyő, ahol a
// terv nyelve/pénzneme eldől, mielőtt a doki a szerkesztőbe lép.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import PatientPage from './PatientPage';
import { TestProviders } from '../testUtils';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';

function renderPatient() {
  return render(
    <TestProviders>
      <PatientPage />
    </TestProviders>,
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

    await user.click(screen.getByRole('radio', { name: 'EUR — euró' }));

    expect(
      await screen.findByText(/egyetlen tétel sincs beárazva/),
    ).toBeInTheDocument();
  });

  it('warns about missing German item names once Deutsch is selected', async () => {
    const user = userEvent.setup();
    seedWithGermanEnabledAndNoGermanNames();
    renderPatient();
    await screen.findByText('Az ajánlat nyelve és pénzneme');

    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));

    // A `lefedettseg()` csak az AKTÍV tételeket számolja -- a seedben (a 8.
    // backlog-tétel adattisztítása óta) néhány tétel `aktiv: false`.
    const aktivOsszes = seedPriceList.tetelek.filter((x) => x.aktiv).length;
    expect(
      await screen.findByText(
        new RegExp(`${aktivOsszes} / ${aktivOsszes} aktív tételnek nincs német neve`),
      ),
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

describe('PatientPage -- backlog-3b: nyelváltás megőrzi a kézzel szerkesztett neveket', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('szerkesztetlen sor neve frissül nyelváltáskor, a dialógus egyszerű szöveget mutat', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Elek');
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.click(screen.getByRole('link', { name: 'Páciens' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/A tervben már 1 tétel szerepel/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/átírt/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Terv szerkesztő' }));
    expect(await screen.findByDisplayValue('Zahnextraktion')).toBeInTheDocument();
    expect(screen.queryByText('átírt')).toBeNull();
  });

  it('kézzel átírt sor neve NEM frissül nyelváltáskor, "átírt" jelvényt kap, a dialógus jelzi előre', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Elek');
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    const nameField = screen.getByDisplayValue('Fogeltávolítás');
    await user.clear(nameField);
    await user.type(nameField, 'Kihúzás megbeszélt módon');

    await user.click(screen.getByRole('link', { name: 'Páciens' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));

    expect(
      await screen.findByText(/1 kézzel átírt név változatlan marad/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Terv szerkesztő' }));
    expect(await screen.findByDisplayValue('Kihúzás megbeszélt módon')).toBeInTheDocument();
    expect(screen.getByText('átírt')).toBeInTheDocument();
  });
});

describe('PatientPage -- backlog-10: nyelváltás szinkronizálja a tétel-leírást', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  function seedWithGermanLeirasItem() {
    const custom = {
      ...seedPriceList,
      tetelek: seedPriceList.tetelek.map((x) =>
        x.nev.hu === 'Fogeltávolítás'
          ? { ...x, leiras: { hu: 'Magyar leírás szövege', de: 'Deutsche Beschreibung' } }
          : x,
      ),
    };
    localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
    localStorage.setItem(
      'dp:beallitasok.json',
      JSON.stringify({ ...seedSettings, nemetEngedelyezve: true }),
    );
  }

  it('szerkesztetlen leírás frissül nyelváltáskor, a tétel német leírására', async () => {
    const user = userEvent.setup();
    seedWithGermanLeirasItem();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Elek');
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    // A "+ leírás" trigger már nyitva indul, mert a sornak van tartalma --
    // nem kell rákattintani (az bezárná).
    expect(screen.getByRole('button', { name: 'Leírás' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Magyar leírás szövege')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Páciens' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));
    await user.click(await screen.findByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Terv szerkesztő' }));
    expect(await screen.findByDisplayValue('Deutsche Beschreibung')).toBeInTheDocument();
  });

  it('kézzel átírt leírás NEM frissül nyelváltáskor', async () => {
    const user = userEvent.setup();
    seedWithGermanLeirasItem();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Elek');
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    // A "+ leírás" trigger már nyitva indul, mert a sornak van tartalma --
    // nem kell rákattintani (az bezárná).
    const leirasField = screen.getByDisplayValue('Magyar leírás szövege');
    await user.clear(leirasField);
    await user.type(leirasField, 'Kézzel pontosított leírás');

    await user.click(screen.getByRole('link', { name: 'Páciens' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));
    await user.click(await screen.findByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Terv szerkesztő' }));
    expect(await screen.findByDisplayValue('Kézzel pontosított leírás')).toBeInTheDocument();
  });
});
