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
import App from '../App';
import PatientPage from '../pages/PatientPage';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
import { DemoStorage } from '../storage/DemoStorage';
import type { Paciens, Plan } from '../domain/types';

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

// backlog-40: a lépés-elhagyási törzsadat-prompthoz egy piszkozat, aminek a
// paciens blokkja/paciensId-ja explicit adott -- a `dp:piszkozat` kulcsba
// írva, MIELŐTT a StorageProvider renderelne (lásd `seedActiveDraft` fenti
// kommentjét).
async function seedDraftWithPaciens(patientDir: string, paciens: Paciens, paciensId: string) {
  const plan = { ...makeDirtyPlan(), paciens, paciensId };
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({
      schemaVersion: 1,
      mentve: '2026-08-09T10:15:00.000Z',
      plan,
      patientDir,
    }),
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

  // 94. tétel: a Név mező szerkesztése ELŐTT rögzített kötés a breadcrumb
  // felirata -- a link célja és felirata így garantáltan ugyanaz a rekord,
  // akkor is, ha a doki a Név mezőt egy másik páciens nevére írja át.
  it('a Név mező átírása után is a kötött páciens tárolt nevét mutatja', async () => {
    const user = userEvent.setup();
    const seeder = new DemoStorage();
    await seeder.init();
    const patient = await seeder.createPatient('Teszt Piroska', { szuletesiIdo: '1980-05-05', telefon: '' });
    await seedDraftWithPaciens(
      patient.dirName,
      {
        nev: 'Teszt Piroska',
        szuletesiIdo: '',
        lakcim: '',
        telefon: '',
        email: '',
        taj: '',
        kiskoru: false,
        torvenyesKepviselo: null,
      },
      patient.paciensId,
    );
    renderShell('/paciens');
    const nameInput = await screen.findByDisplayValue('Teszt Piroska');

    await user.clear(nameInput);
    await user.type(nameInput, 'Nagy Éva');

    const breadcrumb = await screen.findByRole('navigation', { name: 'Hol vagyok' });
    expect(within(breadcrumb).getByText('Teszt Piroska')).toBeInTheDocument();
    expect(within(breadcrumb).queryByText('Nagy Éva')).toBeNull();
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

// backlog-40 (3. döntés, D161): a "Terv adatai" lépés ELŐRE elhagyásának
// ajánlat-jellegű elfogása -- kizárólag VALÓDI ütközésnél (mindkét oldalon
// van érték, és eltér, lásd `domain/masterSnapshotDiff.ts` `valodiUtkozesek`),
// és kizárólag a stepper Kezelések/Előnézet linkjein + a PatientPage "Tovább"
// gombján, sosem a NavBar-on.
describe('TervWorkflowShell -- backlog-40: lépés-elhagyási törzsadat-prompt', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  function paciens(overrides: Partial<Paciens> = {}): Paciens {
    return {
      nev: 'Teszt Piroska',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '+36 20 111 2222',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
      ...overrides,
    };
  }

  async function seedUtkozoMasterEsDraft() {
    const seeder = new DemoStorage();
    await seeder.init();
    const patient = await seeder.createPatient('Teszt Piroska', {
      szuletesiIdo: '',
      telefon: '+36 70 999 8888',
    });
    await seedDraftWithPaciens(patient.dirName, paciens(), patient.paciensId);
    return patient;
  }

  it('a stepper "Kezelések" linkjére felajánlja a törzsadat-frissítést, amíg el nem dől', async () => {
    const user = userEvent.setup();
    await seedUtkozoMasterEsDraft();
    renderShell('/paciens');
    await screen.findByPlaceholderText('Kovács János');

    await user.click(screen.getByRole('link', { name: /Kezelések/ }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Kezelések-oldal')).toBeNull();
  });

  it('a "Kihagyás, tovább lépek" gomb navigál, ugyanarra a diffre visszatérve nem jelenik meg újra', async () => {
    const user = userEvent.setup();
    await seedUtkozoMasterEsDraft();
    renderShell('/paciens');
    await screen.findByPlaceholderText('Kovács János');

    await user.click(screen.getByRole('link', { name: /Kezelések/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Kihagyás, tovább lépek' }));
    expect(await screen.findByText('Kezelések-oldal')).toBeInTheDocument();

    // Vissza a Terv adatai lépésre (backward -- nem elfogott), majd újra
    // előre: ugyanarra a diffre a prompt NEM jelenik meg újra (D161).
    await user.click(screen.getByRole('link', { name: /Terv adatai/ }));
    await screen.findByPlaceholderText('Kovács János');
    await user.click(screen.getByRole('link', { name: /Kezelések/ }));

    expect(await screen.findByText('Kezelések-oldal')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a diff megváltozása után (mezőszerkesztés) a prompt ismét megjelenik', async () => {
    const user = userEvent.setup();
    await seedUtkozoMasterEsDraft();
    renderShell('/paciens');
    await screen.findByPlaceholderText('Kovács János');

    await user.click(screen.getByRole('link', { name: /Kezelések/ }));
    let dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Kihagyás, tovább lépek' }));
    await screen.findByText('Kezelések-oldal');

    await user.click(screen.getByRole('link', { name: /Terv adatai/ }));
    const telefonInput = await screen.findByLabelText('Telefon');
    await user.clear(telefonInput);
    await user.type(telefonInput, '+36 20 333 4444');

    await user.click(screen.getByRole('link', { name: /Kezelések/ }));

    dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('a PatientPage "Tovább" gombja is a lépés-elhagyási promptot futtatja', async () => {
    const user = userEvent.setup();
    await seedUtkozoMasterEsDraft();
    renderShell('/paciens');
    await screen.findByPlaceholderText('Kovács János');

    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Kezelések-oldal')).toBeNull();
  });

  // backlog-114: a törzsadat-hiány ág (a diff-ág testvére) ugyanezt a
  // "diffenként/eldöntésenként egyszer" memóriát kapja -- a Kovács János
  // demó-seed páciensnek nincs önálló törzsadata (fallback ág).
  async function seedKovacsNoMasterDraft() {
    const seeder = new DemoStorage();
    await seeder.init();
    const kovacs = (await seeder.listPatients()).find((p) => p.nev === 'Kovács János')!;
    await seedDraftWithPaciens(kovacs.dirName, paciens({ nev: 'Kovács János' }), kovacs.paciensId);
    return kovacs;
  }

  it('törzsadat nélküli páciensnél a "Törzsadat létrehozása" ajánlat kihagyás után nem jelenik meg újra oda-vissza navigációnál', async () => {
    const user = userEvent.setup();
    await seedKovacsNoMasterDraft();
    renderShell('/paciens');
    await screen.findByPlaceholderText('Kovács János');

    await user.click(screen.getByRole('link', { name: /Kezelések/ }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Kihagyás, tovább lépek' }));
    expect(await screen.findByText('Kezelések-oldal')).toBeInTheDocument();

    // Vissza a Terv adatai lépésre, majd újra előre: a kihagyott ajánlat
    // NEM tér vissza, a navigáció akadálytalan mindkét irányban.
    await user.click(screen.getByRole('link', { name: /Terv adatai/ }));
    await screen.findByPlaceholderText('Kovács János');
    await user.click(screen.getByRole('link', { name: /Kezelések/ }));

    expect(await screen.findByText('Kezelések-oldal')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('NavBar-navigációra a prompt NEM jelenik meg -- a teljes App-on át kilépés a workflow-ból azonnal navigál', async () => {
    const user = userEvent.setup();
    await seedUtkozoMasterEsDraft();
    render(<App />);
    window.location.hash = '#/paciens';

    await screen.findByPlaceholderText('Kovács János');
    await user.click(screen.getByRole('link', { name: 'Beállítások' }));

    expect(await screen.findByRole('heading', { name: /Beállítások/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
