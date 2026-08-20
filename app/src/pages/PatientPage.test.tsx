// A nyelv/pénznem kártya láthatósága és figyelmeztetései (D21). Lásd
// CLAUDE.md "A UX kritikus pontja" -- ez a szomszédos képernyő, ahol a
// terv nyelve/pénzneme eldől, mielőtt a doki a szerkesztőbe lép.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import PatientPage from './PatientPage';
import { TestProviders } from '../testUtils';
import { addDaysIso, formatLongDate, todayIso } from '../domain/date';
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

/** A német kártya + egy árlista, amiben egyetlen tételnek sincs EUR ára. */
function seedWithNoEurPrices() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) => ({ ...x, ar: { ...x.ar, EUR: null } })),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
}

/** A német kártya + egy árlista, amiben egyetlen tételnek sincs német neve. */
function seedWithNoGermanNames() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) => ({ ...x, nev: { ...x.nev, de: null } })),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
}

describe('PatientPage -- nyelv/pénznem kártya', () => {
  beforeEach(() => {
    localStorage.clear();
    // A "locks the card" teszt a teljes App-ot (HashRouter) rendereli --
    // a window.location.hash a jsdom window-on nem reset a tesztek között.
    window.location.hash = '';
  });

  it('shows the language/currency card without any enabling flag (52. tétel)', async () => {
    renderPatient();
    expect(await screen.findByText('Dokumentum nyelve')).toBeInTheDocument();
    expect(screen.getByText('Pénznem')).toBeInTheDocument();
  });

  it('warns when the selected pénznem has zero priced items', async () => {
    const user = userEvent.setup();
    seedWithNoEurPrices();
    renderPatient();
    await screen.findByText('Pénznem');

    await user.click(screen.getByRole('radio', { name: 'EUR — euró' }));

    expect(
      await screen.findByText(/egyetlen tétel sincs beárazva/),
    ).toBeInTheDocument();
  });

  it('warns about missing German item names once Deutsch is selected', async () => {
    const user = userEvent.setup();
    seedWithNoGermanNames();
    renderPatient();
    await screen.findByText('Dokumentum nyelve');

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

  it('a draft opened via "Új verzió" keeps the card editable (chips, no "nem módosítható" text, 52. tétel)', async () => {
    const user = userEvent.setup();
    render(<App />);

    // D39: a "Korábbi tervek" gomb lekerült a Kezdőlapról -- a `/tervek`
    // route URL-ről marad elérhető, itt közvetlen hash-navigációval. D54
    // óta a `/tervek` a DEMO "Összes terv" fülére (`/demo/tervek`)
    // redirectel -- ezt igazolja a hash-ellenőrzés lent.
    window.location.hash = '#/tervek';
    const patientNameEl = await screen.findByText('Kovács János');
    expect(window.location.hash).toBe('#/demo/tervek');
    const card = patientNameEl.closest('[data-patient]') as HTMLElement;
    // 50. tétel (D58) óta a legfrissebb soron látható gomb, nem "⋯" menüpont.
    await user.click(within(card).getByRole('button', { name: 'Új verzió' }));
    // Kovács János demó tervének két fázisa van, mindkettőnek saját
    // keresője -- findAllBy, nem findBy (ami az egyértelműséget várná el).
    // A 22 páciensre bővített demó-készlet (D40) miatt a `/tervek` lista
    // eagerly tölt be minden pácienst -- a navigáció ide-oda ezért az
    // alapértelmezett 1000ms-nél lassabb is lehet erősen terhelt CI-futásnál.
    await screen.findAllByPlaceholderText(/Tétel keresése/, {}, { timeout: 5000 });

    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));

    expect(await screen.findByText('Dokumentum nyelve')).toBeInTheDocument();
    expect(screen.getByText('Pénznem')).toBeInTheDocument();
    // A teljes piszkozat-életciklus alatt szerkeszthető (52. tétel) --
    // korábban ez az útvonal volt az EGYETLEN, ahol a mai `locked` igazra
    // értékelődött volna ki egy draftra.
    expect(screen.getByRole('radio', { name: 'Deutsch' })).toBeInTheDocument();
    expect(screen.queryByText(/nem módosítható/)).toBeNull();
  });
});

describe('PatientPage -- 62. tétel (D63): pénznemváltás nem törli a sorokat', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('HUF->EUR->HUF váltás megőrzi a sort, a dialógus a tényleges hatást írja ki, a kézzel átírt ár visszaáll', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Elek');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    // A seedben Fogeltávolítás HUF listaára 25000 Ft -- kézzel 20000-re
    // írjuk át, hogy a stash-precedenciát is le lehessen ellenőrizni.
    const priceField = screen.getByLabelText('Ajánlati egységár') as HTMLInputElement;
    expect(priceField.value).toBe('25000');
    await user.clear(priceField);
    await user.type(priceField, '20000');
    await user.tab();

    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));
    await screen.findByText('Pénznem');
    await user.click(screen.getByRole('radio', { name: 'EUR — euró' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText(/1 sor ára az árlistából frissül/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/A sorok nem törlődnek/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Kezelések' }));
    // A sor megmaradt (nem törlődött), az árlistai EUR árra állt (69,00 €).
    expect(await screen.findByDisplayValue('Fogeltávolítás')).toBeInTheDocument();
    const eurPriceField = screen.getByLabelText('Ajánlati egységár') as HTMLInputElement;
    expect(eurPriceField.value).toBe('69,00');

    // Vissza HUF-ra -- a korábban kézzel átírt ár (20000) visszaáll.
    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));
    await screen.findByText('Pénznem');
    await user.click(screen.getByRole('radio', { name: 'HUF — forint' }));

    const dialog2 = await screen.findByRole('alertdialog');
    expect(
      within(dialog2).getByText(/1 sor a korábban ebben a pénznemben megadott árát kapja vissza/),
    ).toBeInTheDocument();
    await user.click(within(dialog2).getByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Kezelések' }));
    expect(await screen.findByDisplayValue('Fogeltávolítás')).toBeInTheDocument();
    const hufPriceField = screen.getByLabelText('Ajánlati egységár') as HTMLInputElement;
    expect(hufPriceField.value).toBe('20000');
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
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
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
    await screen.findByText('Dokumentum nyelve');
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
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
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
    await screen.findByText('Dokumentum nyelve');
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
    localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
  }

  it('szerkesztetlen leírás frissül nyelváltáskor, a tétel német leírására', async () => {
    const user = userEvent.setup();
    seedWithGermanLeirasItem();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
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
    await screen.findByText('Dokumentum nyelve');
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
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
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
    await screen.findByText('Dokumentum nyelve');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));
    await user.click(await screen.findByRole('button', { name: 'Folytatás' }));

    await user.click(screen.getByRole('link', { name: 'Kezelések' }));
    expect(await screen.findByDisplayValue('Kézzel pontosított leírás')).toBeInTheDocument();
  });
});

// backlog-40: a "Páciens törzsadata" eltérés-jelzés -- docs/03-funkcionalis-spec.md
// § 2. Terv adatai. A rész csak akkor renderelődik, ha a piszkozat
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

// backlog-51 (D68): a lap hat, vizuálisan elkülönített szekcióra tagolódik.
describe('PatientPage -- backlog-51: hat szekció', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('a fejléc "Terv adatai", nem "Páciens adatlap"', async () => {
    renderPatient();
    expect(await screen.findByRole('heading', { name: 'Terv adatai' })).toBeInTheDocument();
  });

  it('a hat szekció ebben a sorrendben jelenik meg (D68)', async () => {
    renderPatient();
    await screen.findByRole('heading', { name: 'Terv adatai' });

    const cimek = ['Terv címe', 'Páciens adatai', 'Dokumentum nyelve', 'Pénznem', 'Kezelőorvos', 'Dátumok'];
    const elemek = cimek.map((cim) => screen.getByText(cim));
    for (let i = 1; i < elemek.length; i++) {
      expect(
        elemek[i - 1].compareDocumentPosition(elemek[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });
});

// D67: a Kezelőorvos szekció -- korábban csak olvasható placeholder volt,
// mostantól Radix `Select`, csak az aktív orvosok közül, a teljes
// piszkozat-életciklus alatt szabadon szerkeszthető.
describe('PatientPage -- Kezelőorvos szekció (D67)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  function seedWithDoctors(
    orvosok: string[],
    opts: { inaktivOrvosok?: string[]; alapertelmezettOrvos?: string } = {},
  ) {
    localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
    localStorage.setItem('dp:beallitasok.json', JSON.stringify({ ...seedSettings, orvosok, ...opts }));
  }

  function seedDraftWithOrvos(orvos: string, tervId = '') {
    localStorage.setItem(
      'dp:piszkozat',
      JSON.stringify({
        schemaVersion: 1,
        mentve: '2026-08-09T10:15:00.000Z',
        plan: {
          schemaVersion: 1,
          tervId,
          verzio: tervId ? 1 : 0,
          statusz: 'PISZKOZAT',
          nyelv: 'hu',
          penznem: 'HUF',
          keltezes: '2026-08-05',
          ervenyesIg: '2026-11-03',
          arlistaVerzio: '2026-07-01',
          sablonVerzio: 'nyilatkozat-hu-v1',
          orvos,
          paciens: {
            nev: 'Teszt Elek',
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
        },
      }),
    );
  }

  it('alapból a globális default orvos van kiválasztva', async () => {
    renderPatient();
    await screen.findByText('Kezelőorvos');

    expect(screen.getByRole('combobox', { name: 'Kezelőorvos (aláírás-blokk)' })).toHaveTextContent(
      'Dr. Mándoki István',
    );
  });

  // A `piszkozatTartalmas()` (domain/piszkozat.ts) szándékosan NEM veszi
  // figyelembe az orvos mezőt (az a beállításokból származik, mint a
  // nyelv/pénznem) -- egy üres, vadonatúj piszkozaton önmagában az
  // orvos-választás nem indít autosave-et, ezért a kiválasztott értéket
  // közvetlenül a UI-n, nem a `dp:piszkozat` kulcson át ellenőrizzük.
  it('másik aktív orvos választása frissíti a kiválasztott értéket', async () => {
    const user = userEvent.setup();
    seedWithDoctors(['Dr. Mándoki István', 'Dr. Új Orsolya']);
    renderPatient();
    await screen.findByText('Kezelőorvos');

    await user.click(screen.getByRole('combobox', { name: 'Kezelőorvos (aláírás-blokk)' }));
    await user.click(await screen.findByRole('option', { name: 'Dr. Új Orsolya' }));

    expect(screen.getByRole('combobox', { name: 'Kezelőorvos (aláírás-blokk)' })).toHaveTextContent(
      'Dr. Új Orsolya',
    );
  });

  it('egy már mentett (tervId !== "") lánc draftján is szerkeszthető', async () => {
    const user = userEvent.setup();
    seedWithDoctors(['Dr. Mándoki István', 'Dr. Új Orsolya']);
    seedDraftWithOrvos('Dr. Mándoki István', 'terv-abc123');
    renderPatient();
    await screen.findByText('Kezelőorvos');

    const combobox = screen.getByRole('combobox', { name: 'Kezelőorvos (aláírás-blokk)' });
    expect(combobox).not.toBeDisabled();

    await user.click(combobox);
    await user.click(await screen.findByRole('option', { name: 'Dr. Új Orsolya' }));

    await waitFor(() => {
      const rec = JSON.parse(localStorage.getItem('dp:piszkozat') as string) as { plan: Plan };
      expect(rec.plan.orvos).toBe('Dr. Új Orsolya');
    });
  });

  it('árva (inaktivált) orvosra hivatkozó terv a nevet mutatja, amber figyelmeztetéssel, aktívra váltható', async () => {
    const user = userEvent.setup();
    seedWithDoctors(['Dr. Mándoki István', 'Dr. Régi Rezső'], { inaktivOrvosok: ['Dr. Régi Rezső'] });
    seedDraftWithOrvos('Dr. Régi Rezső');
    renderPatient();
    await screen.findByText('Kezelőorvos');

    expect(screen.getByRole('combobox', { name: 'Kezelőorvos (aláírás-blokk)' })).toHaveTextContent(
      'Dr. Régi Rezső',
    );
    expect(screen.getByText(/már nem aktív/)).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Kezelőorvos (aláírás-blokk)' }));
    await user.click(await screen.findByRole('option', { name: 'Dr. Mándoki István' }));

    expect(screen.queryByText(/már nem aktív/)).not.toBeInTheDocument();
    await waitFor(() => {
      const rec = JSON.parse(localStorage.getItem('dp:piszkozat') as string) as { plan: Plan };
      expect(rec.plan.orvos).toBe('Dr. Mándoki István');
    });
  });

  it('nincs aktív orvos esetén amber figyelmeztetést ad', async () => {
    seedWithDoctors(['Dr. Mándoki István'], { inaktivOrvosok: ['Dr. Mándoki István'] });
    renderPatient();
    await screen.findByText('Kezelőorvos');

    expect(await screen.findByText(/Nincs aktív kezelőorvos a Beállításokban/)).toBeInTheDocument();
  });
});

// backlog-51 (D61): a "Terv címe" mező -- vadonatúj lánchoz a `DraftMeta`-ban
// él és a véglegesítéskor íródik ki (lásd PreviewPage.test.tsx), mentett
// lánchoz azonnal ír a `storage.savePlanLabel`-lel.
describe('PatientPage -- backlog-51: terv címe mező', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('vadonatúj lánc: a placeholder az élő javaslat, gépelésre nincs Mentés gomb, az érték túléli a navigációt', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Cím Nav Teszt');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Vadonatúj, üres tervnek nincs kategóriába sorolható sora -- az élő
    // javaslat az `ALAPERTELMEZETT_TERV_CIM` ("Terv", domain/tervCim.ts).
    const cimInput = await screen.findByRole('textbox', { name: 'Terv címe' });
    expect(cimInput).toHaveAttribute('placeholder', 'Terv');

    await user.type(cimInput, 'Egyedi cím');
    expect(screen.queryByRole('button', { name: 'Mentés' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));
    await screen.findByPlaceholderText(/Tétel keresése/);
    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));

    expect(await screen.findByRole('textbox', { name: 'Terv címe' })).toHaveValue('Egyedi cím');
  });

  it('mentett lánc: a mező a tárolt címkét mutatja, a Mentés gomb ír a terv-cimke.json-ba', async () => {
    const user = userEvent.setup();
    render(<App />);

    window.location.hash = '#/tervek';
    const patientNameEl = await screen.findByText('Kovács János');
    const card = patientNameEl.closest('[data-patient]') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'Új verzió' }));
    await screen.findAllByPlaceholderText(/Tétel keresése/, {}, { timeout: 5000 });

    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));

    // Kovács János seed-adata sosem kapott kézi címkét (a seed nem hív
    // savePlanLabel-t) -- a mező üresen, a Mentés gomb nélkül indul.
    const cimInput = await screen.findByRole('textbox', { name: 'Terv címe' });
    expect(screen.queryByRole('button', { name: 'Mentés' })).toBeNull();

    await user.type(cimInput, 'Gyökérkezelés és korona');
    expect(await screen.findByRole('button', { name: 'Mentés' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mentés' })).toBeNull());

    const storage = new DemoStorage();
    const kovacs = (await storage.listPatients()).find((p) => p.nev === 'Kovács János')!;
    const [chain] = await storage.listPlans(kovacs.dirName);
    expect(chain.tervCim).toBe('Gyökérkezelés és korona');
  });

  it('mentett lánc: Enter is menti a beírt címet', async () => {
    const user = userEvent.setup();
    render(<App />);

    window.location.hash = '#/tervek';
    const patientNameEl = await screen.findByText('Kovács János');
    const card = patientNameEl.closest('[data-patient]') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'Új verzió' }));
    await screen.findAllByPlaceholderText(/Tétel keresése/, {}, { timeout: 5000 });
    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));

    const cimInput = await screen.findByRole('textbox', { name: 'Terv címe' });
    await user.type(cimInput, 'Enterrel mentve{Enter}');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mentés' })).toBeNull());

    const storage = new DemoStorage();
    const kovacs = (await storage.listPatients()).find((p) => p.nev === 'Kovács János')!;
    const [chain] = await storage.listPlans(kovacs.dirName);
    expect(chain.tervCim).toBe('Enterrel mentve');
  });

  it('mentett lánc: írási hiba esetén a Callout megjelenik és gépelés után is látszik', async () => {
    const user = userEvent.setup();
    vi.spyOn(DemoStorage.prototype, 'savePlanLabel').mockRejectedValue(
      new Error('megtelt a tárhely'),
    );
    render(<App />);

    window.location.hash = '#/tervek';
    const patientNameEl = await screen.findByText('Kovács János');
    const card = patientNameEl.closest('[data-patient]') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'Új verzió' }));
    await screen.findAllByPlaceholderText(/Tétel keresése/, {}, { timeout: 5000 });
    await user.click(screen.getByRole('link', { name: 'Terv adatai' }));

    const cimInput = await screen.findByRole('textbox', { name: 'Terv címe' });
    await user.type(cimInput, 'Hibás mentés');
    await user.click(await screen.findByRole('button', { name: 'Mentés' }));

    expect(await screen.findByText(/A címke mentése nem sikerült/)).toBeInTheDocument();

    // Egy nem kapcsolódó gépelés (re-render) nem tünteti el a hibát --
    // csak egy ÚJABB mentési kísérlet.
    await user.type(cimInput, '!');
    expect(screen.getByText(/A címke mentése nem sikerült/)).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});

// backlog-51 (D62, D22): a "Dátumok" szekció -- a `keltezes` marad
// automatikus, az `ervenyesIg` szerkeszthető, alapértéke
// `plan.keltezes + settings.ervenyessegNap`.
describe('PatientPage -- backlog-51: dátumok szekció', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('a "Kiadás dátuma" nem szerkeszthető, csak olvasható hosszú dátumot mutat', async () => {
    renderPatient();
    await screen.findByRole('heading', { name: 'Terv adatai' });

    expect(screen.queryByLabelText('Kiadás dátuma')).toBeNull();
    expect(screen.getByText(formatLongDate(todayIso(), 'hu'))).toBeInTheDocument();
  });

  it('az "Érvényes eddig" alapértéke keltezés + ervenyessegNap, módosítható, üresen visszaáll, jelzi a hibás sorrendet', async () => {
    renderPatient();
    const ervenyesIgInput = (await screen.findByLabelText('Érvényes eddig')) as HTMLInputElement;
    const alapErtek = addDaysIso(todayIso(), seedSettings.ervenyessegNap);
    expect(ervenyesIgInput).toHaveValue(alapErtek);
    expect(screen.queryByRole('button', { name: /Vissza az alapértelmezettre/ })).toBeNull();

    fireEvent.change(ervenyesIgInput, { target: { value: '2020-01-01' } });
    expect(ervenyesIgInput).toHaveValue('2020-01-01');
    expect(
      await screen.findByRole('button', { name: /Vissza az alapértelmezettre/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Az érvényesség vége a kiadás dátuma előttre esik.'),
    ).toBeInTheDocument();

    fireEvent.change(ervenyesIgInput, { target: { value: '' } });
    fireEvent.blur(ervenyesIgInput);
    await waitFor(() => expect(ervenyesIgInput).toHaveValue(alapErtek));
    expect(screen.queryByRole('button', { name: /Vissza az alapértelmezettre/ })).toBeNull();
  });
});
