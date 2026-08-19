// A nyelv/pénznem kártya láthatósága és figyelmeztetései (D21). Lásd
// CLAUDE.md "A UX kritikus pontja" -- ez a szomszédos képernyő, ahol a
// terv nyelve/pénzneme eldől, mielőtt a doki a szerkesztőbe lép.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import PatientPage from './PatientPage';
import { TestProviders } from '../testUtils';
import { verzioMenupont } from '../testQueries';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';
import { DemoStorage } from '../storage/DemoStorage';
import type { Paciens, Plan } from '../domain/types';

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

    // D39: a "Korábbi tervek" gomb lekerült a Kezdőlapról -- a `/tervek`
    // route URL-ről marad elérhető, itt közvetlen hash-navigációval.
    window.location.hash = '#/tervek';
    const patientNameEl = await screen.findByText('Kovács János');
    const card = patientNameEl.closest('[data-patient]') as HTMLElement;
    await user.click(await verzioMenupont(user, card, 'Új verzió'));
    // Kovács János demó tervének két fázisa van, mindkettőnek saját
    // keresője -- findAllBy, nem findBy (ami az egyértelműséget várná el).
    // A 22 páciensre bővített demó-készlet (D40) miatt a `/tervek` lista
    // eagerly tölt be minden pácienst -- a navigáció ide-oda ezért az
    // alapértelmezett 1000ms-nél lassabb is lehet erősen terhelt CI-futásnál.
    await screen.findAllByPlaceholderText(/Tétel keresése/, {}, { timeout: 5000 });

    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));

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

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Elek');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/A tervben már 1 tétel szerepel/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/átírt/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Kezelések' }));
    expect(await screen.findByDisplayValue('Zahnextraktion')).toBeInTheDocument();
    expect(screen.queryByText('átírt')).toBeNull();
  });

  it('kézzel átírt sor neve NEM frissül nyelváltáskor, "átírt" jelvényt kap, a dialógus jelzi előre', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Elek');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    const nameField = screen.getByDisplayValue('Fogeltávolítás');
    await user.clear(nameField);
    await user.type(nameField, 'Kihúzás megbeszélt módon');

    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));

    expect(
      await screen.findByText(/1 kézzel átírt név változatlan marad/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Kezelések' }));
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

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Elek');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    // A "+ leírás" trigger már nyitva indul, mert a sornak van tartalma --
    // nem kell rákattintani (az bezárná).
    expect(screen.getByRole('button', { name: 'Leírás' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Magyar leírás szövege')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));
    await user.click(await screen.findByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Kezelések' }));
    expect(await screen.findByDisplayValue('Deutsche Beschreibung')).toBeInTheDocument();
  });

  it('kézzel átírt leírás NEM frissül nyelváltáskor', async () => {
    const user = userEvent.setup();
    seedWithGermanLeirasItem();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Elek');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    // A "+ leírás" trigger már nyitva indul, mert a sornak van tartalma --
    // nem kell rákattintani (az bezárná).
    const leirasField = screen.getByDisplayValue('Magyar leírás szövege');
    await user.clear(leirasField);
    await user.type(leirasField, 'Kézzel pontosított leírás');

    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));
    await user.click(await screen.findByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Kezelések' }));
    expect(await screen.findByDisplayValue('Kézzel pontosított leírás')).toBeInTheDocument();
  });
});

// backlog-40: a "Páciens törzsadata" kártya -- docs/03-funkcionalis-spec.md
// § 2. Páciens adatlap. A kártya csak akkor renderelődik, ha a piszkozat
// patientDir-je ismert (D37) -- ezért itt közvetlenül a `dp:piszkozat`
// kulcsba seedelünk, a TervWorkflowShell.test.tsx `seedActiveDraft`
// mintáját követve, MIELŐTT a StorageProvider renderelne.
describe('PatientPage -- backlog-40: páciens törzsadata kártya', () => {
  function makePaciens(overrides: Partial<Paciens> = {}): Paciens {
    return {
      nev: 'Teszt Elek',
      szuletesiIdo: '1980-05-05',
      lakcim: 'Régi utca 1.',
      telefon: '+36 30 000 0000',
      email: 'regi@example.hu',
      taj: '111 222 333',
      kiskoru: false,
      torvenyesKepviselo: null,
      ...overrides,
    };
  }

  function makePlanWithPaciens(paciens: Paciens, paciensId: string): Plan {
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
      paciens,
      fazisok: [{ sorszam: 1, megnevezes: '1. kezelés', megjegyzes: '', sorok: [] }],
      osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
      paciensId,
    };
  }

  async function seedDraft(patientDir: string, paciens: Paciens, paciensId: string) {
    localStorage.setItem(
      'dp:piszkozat',
      JSON.stringify({
        schemaVersion: 1,
        mentve: '2026-08-09T10:15:00.000Z',
        plan: makePlanWithPaciens(paciens, paciensId),
        patientDir,
      }),
    );
  }

  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('lezárt törzsadatnál eltérésszámot és KÉT külön gombot mutat, "Szinkronizálás" feliratú gomb nincs', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const patient = await seeder.createPatient('Teszt Elek', {
      szuletesiIdo: '1980-05-05',
      telefon: '+36 70 999 8888',
    });
    await seedDraft(patient.dirName, makePaciens(), patient.paciensId);

    renderPatient();

    expect(await screen.findByText('Páciens törzsadata')).toBeInTheDocument();
    expect(await screen.findByText(/mező eltér a páciens törzsadatától/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Frissítés a törzsadatból' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Törzsadat frissítése a tervből' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Szinkronizálás/ })).toBeNull();
  });

  it('megegyező adatoknál semleges szöveget mutat, gombok nélkül', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const paciens = makePaciens();
    const patient = await seeder.createPatient(paciens.nev, {
      szuletesiIdo: paciens.szuletesiIdo,
      telefon: paciens.telefon,
    });
    await seeder.savePatientData(patient.dirName, { schemaVersion: 1, paciensId: patient.paciensId, ...paciens });
    await seedDraft(patient.dirName, paciens, patient.paciensId);

    renderPatient();

    expect(await screen.findByText('A törzsadat és a terv adatai megegyeznek.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Frissítés a törzsadatból' })).toBeNull();
  });

  it('"Frissítés a törzsadatból": a kijelölt mező a törzsadat értékét írja a piszkozatba', async () => {
    const user = userEvent.setup();
    const seeder = new DemoStorage();
    await seeder.init();
    const patient = await seeder.createPatient('Teszt Elek', {
      szuletesiIdo: '1980-05-05',
      telefon: '+36 70 999 8888',
    });
    await seedDraft(patient.dirName, makePaciens(), patient.paciensId);

    renderPatient();
    await screen.findByText(/mező eltér a páciens törzsadatától/);
    await user.click(screen.getByRole('button', { name: 'Frissítés a törzsadatból' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Telefon' }));
    await user.click(within(dialog).getByRole('button', { name: 'Frissítés a piszkozatban' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Telefon')).toHaveValue('+36 70 999 8888');
    // Nem kijelölt mező NEM változik.
    expect(screen.getByLabelText('E-mail')).toHaveValue('regi@example.hu');
  });

  it('"Törzsadat frissítése a tervből": a kijelölt mező perzisztálódik a paciens-adatok.json-ba', async () => {
    const user = userEvent.setup();
    const seeder = new DemoStorage();
    await seeder.init();
    const patient = await seeder.createPatient('Teszt Elek', {
      szuletesiIdo: '1980-05-05',
      telefon: '+36 70 999 8888',
    });
    await seedDraft(patient.dirName, makePaciens(), patient.paciensId);

    renderPatient();
    await screen.findByText(/mező eltér a páciens törzsadatától/);
    await user.click(screen.getByRole('button', { name: 'Törzsadat frissítése a tervből' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Összes kijelölése' }));
    await user.click(within(dialog).getByRole('button', { name: 'Törzsadat mentése' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const verify = new DemoStorage();
    await verify.init();
    const adatok = await verify.loadPatientData(patient.dirName);
    expect(adatok?.telefon).toBe('+36 30 000 0000'); // a draft (makePaciens()) értéke
  });

  it('törzsadat nélküli (fallback) páciensnél információs blokkot mutat, és a gomb azonnal létrehozza a törzsadatot', async () => {
    const user = userEvent.setup();
    const seeder = new DemoStorage();
    await seeder.init();
    // Kovács János a demó-seedben törzsadat NÉLKÜL szerepel (fallback).
    const kovacs = (await seeder.listPatients()).find((p) => p.nev === 'Kovács János')!;
    await seedDraft(kovacs.dirName, makePaciens({ nev: 'Kovács János' }), kovacs.paciensId);

    renderPatient();

    expect(
      await screen.findByText(/még nincs önálló törzsadata/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Törzsadat létrehozása a terv adataiból' }));

    await waitFor(async () => {
      const verify = new DemoStorage();
      await verify.init();
      const adatok = await verify.loadPatientData(kovacs.dirName);
      expect(adatok?.telefon).toBe('+36 30 000 0000');
    });
  });

  it('draft->master írási hiba esetén a dialógus nyitva marad, Újra/Mégse jelenik meg, a piszkozat érintetlen', async () => {
    const user = userEvent.setup();
    const seeder = new DemoStorage();
    await seeder.init();
    const patient = await seeder.createPatient('Teszt Elek', {
      szuletesiIdo: '1980-05-05',
      telefon: '+36 70 999 8888',
    });
    await seedDraft(patient.dirName, makePaciens(), patient.paciensId);

    renderPatient();
    await screen.findByText(/mező eltér a páciens törzsadatától/);
    await user.click(screen.getByRole('button', { name: 'Törzsadat frissítése a tervből' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Telefon' }));

    const setItemSpy = vi
      .spyOn(localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('Megtelt a tárhely.');
      });
    await user.click(within(dialog).getByRole('button', { name: 'Törzsadat mentése' }));

    expect(await screen.findByText('Megtelt a tárhely.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    setItemSpy.mockRestore();

    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // A piszkozat (a "Telefon" mező a lapon) érintetlen maradt.
    expect(screen.getByLabelText('Telefon')).toHaveValue('+36 30 000 0000');
  });
});
