// docs/03-funkcionalis-spec.md § Autosave: a Home "Piszkozat folytatása"
// kártyája az EGYETLEN belépési pont egy visszaállított/mentetlen
// piszkozathoz -- ezeket a teszteket egy előre, közvetlenül a `dp:piszkozat`
// localStorage-kulcsba írt DraftRecord-dal szimuláljuk (AppState a betöltő
// effektjében ezt olvassa vissza, lásd AppState.test-szerű mintát
// PlanHistoryPage.test.tsx-ben: előbb a rendes seedet kell beírni, MERT a
// StorageProvider saját DemoStorage-példánya `init()`-kor `resetDemoData()`-t
// futtatna, ami a `clearAll()` miatt a piszkozatot is elsöpörné, ha az már
// előtte a helyén lenne).

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { beforeEach, describe, expect, it } from 'vitest';
import Home from './Home';
import { TestProviders } from '../testUtils';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
import { DemoStorage } from '../storage/DemoStorage';
import { legutobbAktivPaciensek, RECENT_PACIENS_LIMIT } from '../domain/paciensAktivitas';
import { seedPatientData } from '../storage/seed/plans';
import type { AktivitasTipus, Plan } from '../domain/types';

function makeDirtyPlan(overrides: Partial<Plan> = {}): Plan {
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
    ...overrides,
  };
}

function seedPersistedDraft(
  plan: Plan,
  mentve = '2026-08-09T10:15:00.000Z',
  meta: { patientDir?: string; lastRoute?: string } = {},
) {
  localStorage.setItem('dp:piszkozat', JSON.stringify({ schemaVersion: 1, mentve, plan, ...meta }));
}

function renderHome() {
  return render(
    <TestProviders>
      <Home />
    </TestProviders>,
  );
}

function Probe({ label }: { label: string }) {
  return <div>{label}</div>;
}

function PatientProbe() {
  const { patientDir } = useParams();
  const location = useLocation();
  return (
    <div>
      <div data-testid="patientdir">{patientDir}</div>
      <div data-testid="state">{JSON.stringify(location.state ?? null)}</div>
    </div>
  );
}

function renderHomeWithPatientRoute() {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter initialEntries={['/']}>
        <StorageProvider>
          <AppStateProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/paciensek/:patientDir" element={<PatientProbe />} />
            </Routes>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>,
  );
}

/** A `dp:paciensek/<dir>/<fajl>` alakú seed-kulcsok közül az elsőt adja, aminek a mappaneve tartalmazza a keresett részletet. */
function findSeedKey(dirReszlet: string, fajlnev: string): string {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith('dp:paciensek/') && key.includes(dirReszlet) && key.endsWith(`/${fajlnev}`)) {
      return key;
    }
  }
  throw new Error(`nincs "${fajlnev}" kulcs "${dirReszlet}"-hez`);
}

/** A demó-készlet MINDEN pácienséről leveszi az `utolsoAktivitas` mezőt -- a 22 páciensre bővített
 * seed (D40) miatt a "teljesen üres recents" állapot teszteléséhez már nem elég 1-3 nevesített pácienst kezelni. */
function stripAllUtolsoAktivitas() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith('dp:paciensek/') && key.endsWith('/paciens.json')) {
      const raw = JSON.parse(localStorage.getItem(key)!);
      delete raw.utolsoAktivitas;
      localStorage.setItem(key, JSON.stringify(raw));
    }
  }
}

/** A `paciensAktivitas.ts` modul-privát `AKTIVITAS_CIMKE` térképének tesztbeli tükre -- csak a
 * várt szöveg összeállításához, nem a döntési logikához (azt `paciensAktivitas.test.ts` fedi). */
const AKTIVITAS_CIMKE: Record<AktivitasTipus, string> = {
  letrehozva: 'Páciens létrehozva',
  'torzsadat-mentve': 'Törzsadat mentve',
  'terv-veglegesitve': 'Terv véglegesítve',
};

// A `TestProviders` bare MemoryRouter-je nem vált route-ot (lásd fenti
// D29-komment) -- ahol a "Megnyitás" TÉNYLEGES célja számít (D37
// lastRoute), valódi Routes/probe-oldalak kellenek, a
// TervWorkflowShell.test.tsx mintáján.
function renderHomeWithRoutes() {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter initialEntries={['/']}>
        <StorageProvider>
          <AppStateProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/paciens" element={<Probe label="Páciens-oldal" />} />
              <Route path="/terv" element={<Probe label="Kezelések-oldal" />} />
              <Route path="/elonezet" element={<Probe label="Előnézet-oldal" />} />
            </Routes>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>,
  );
}

describe('Home -- piszkozat-perzisztencia', () => {
  beforeEach(async () => {
    localStorage.clear();
    // Előbb a rendes seed (lásd fenti fejléc-komment), utána -- ha a teszt
    // kéri -- a piszkozat.
    const seeder = new DemoStorage();
    await seeder.init();
  });

  it('nincs "Piszkozat folytatása" kártya és hibaüzenet sincs, ha nincs perzisztált piszkozat', async () => {
    renderHome();
    await screen.findByRole('button', { name: '+ Új kezelési terv' });
    expect(screen.queryByText('Piszkozat folytatása')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Piszkozat elvetése' })).not.toBeInTheDocument();
  });

  // D39: a demó-only "Demó adat visszaállítása"/"Minden adat törlése" a
  // DEMO oldal Adatkezelés fülére költözött, a "Korábbi tervek" gomb pedig
  // lekerült (a `/tervek` route URL-ről marad elérhető) -- lásd
  // DemoPage.test.tsx / AdatkezelesSection.test.tsx.
  it('nincs "Korábbi tervek" gomb és nincs demó-only adatkezelő gomb sem', async () => {
    renderHome();
    await screen.findByRole('button', { name: '+ Új kezelési terv' });
    expect(screen.queryByRole('button', { name: 'Korábbi tervek' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demó adat visszaállítása' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Minden adat törlése' })).not.toBeInTheDocument();
  });

  it('a "Piszkozat folytatása" kártya a páciensnevet és az utolsó mentés időpontját mutatja', async () => {
    seedPersistedDraft(makeDirtyPlan());
    renderHome();

    expect(await screen.findByText('Piszkozat folytatása')).toBeInTheDocument();
    expect(screen.getByText('Teszt Piroska')).toBeInTheDocument();
    expect(screen.getByText(/Utolsó módosítás:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Megnyitás' })).toBeInTheDocument();
  });

  it('névtelen (de tartalmas) piszkozatnál "Névtelen piszkozat" jelenik meg', async () => {
    seedPersistedDraft(makeDirtyPlan({ paciens: { ...makeDirtyPlan().paciens, nev: '' }, tervId: 'abc123' }));
    renderHome();

    expect(await screen.findByText('Piszkozat folytatása')).toBeInTheDocument();
    expect(screen.getByText('Névtelen piszkozat')).toBeInTheDocument();
  });

  // D29: a piszkozat-felülírás-őr innentől az /uj-terv köztes
  // páciens-választón fut le (lásd NewPlanPage.test.tsx) -- a Home gombja
  // feltétel nélkül odanavigál, itt csak ennyi ellenőrizhető izoláltan
  // (a `TestProviders` bare `MemoryRouter`-je nem vált route-ot).
  it('"+ Új kezelési terv" nem nyit megerősítő dialógust -- feltétel nélkül az /uj-terv köztes lépésre navigál', async () => {
    seedPersistedDraft(makeDirtyPlan());
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Piszkozat folytatása');

    await user.click(screen.getByRole('button', { name: '+ Új kezelési terv' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // A piszkozat itt még nem veszett el -- az őr a NewPlanPage-en dől el.
    expect(screen.getByText('Piszkozat folytatása')).toBeInTheDocument();
  });

  it('sérült perzisztált piszkozatnál látható hibaüzenet jelenik meg, ami az "Piszkozat elvetése" gombra eltűnik', async () => {
    localStorage.setItem('dp:piszkozat', 'not valid json {{{');
    const user = userEvent.setup();
    renderHome();

    expect(
      await screen.findByText(/A mentett piszkozatot nem sikerült visszaállítani/),
    ).toBeInTheDocument();
    // A sérült piszkozat nem tűnhet el nyomtalanul -- nincs "Piszkozat
    // folytatása" kártya sem, hiszen semmi nem állt vissza.
    expect(screen.queryByText('Piszkozat folytatása')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Piszkozat elvetése' }));
    expect(
      screen.queryByText(/A mentett piszkozatot nem sikerült visszaállítani/),
    ).not.toBeInTheDocument();
  });

  // D37: a "Megnyitás" a perzisztált lastRoute-ra navigál, nem a
  // névkitöltés-heurisztikára.
  it('"Megnyitás" a piszkozat lastRoute-jára navigál, ha az ismert', async () => {
    seedPersistedDraft(makeDirtyPlan(), undefined, { lastRoute: '/elonezet' });
    const user = userEvent.setup();
    renderHomeWithRoutes();
    await user.click(await screen.findByRole('button', { name: 'Megnyitás' }));

    expect(await screen.findByText('Előnézet-oldal')).toBeInTheDocument();
  });

  it('lastRoute nélküli (funkció előtti) piszkozatnál a mai névkitöltés-heurisztika dönt', async () => {
    seedPersistedDraft(makeDirtyPlan());
    const user = userEvent.setup();
    renderHomeWithRoutes();
    await user.click(await screen.findByRole('button', { name: 'Megnyitás' }));

    // makeDirtyPlan() nem-üres nevet ad -> a heurisztika a /terv-re visz.
    expect(await screen.findByText('Kezelések-oldal')).toBeInTheDocument();
  });

  // D37/7. döntés: a Home EGÉSZSÉGES kártyáján az eldobás megerősítést kér
  // (ellentétben a fenti, sérült-kártya megerősítés NÉLKÜLI gombjával).
  it('az egészséges kártya "Piszkozat elvetése" gombja megerősítést kér, elfogadás után a kártya eltűnik', async () => {
    seedPersistedDraft(makeDirtyPlan());
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Piszkozat folytatása');

    await user.click(screen.getByRole('button', { name: 'Piszkozat elvetése' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Piszkozat folytatása')).toBeInTheDocument(); // még nem tűnt el

    await user.click(screen.getByRole('button', { name: 'Elvetés' }));
    expect(screen.queryByText('Piszkozat folytatása')).not.toBeInTheDocument();
  });
});

describe('Home -- legutóbbi páciensek (D39)', () => {
  beforeEach(async () => {
    localStorage.clear();
    const seeder = new DemoStorage();
    await seeder.init();
  });

  // Adatvezérelt: a várt sorrendet/tartalmat magából a seedből
  // (`legutobbAktivPaciensek`) számolja ki, nem konkrét neveket hardkódol --
  // így a demó-készlet bővítése (backlog-35 utáni, 22 páciensre bővített
  // seed, D40) nem töri meg.
  it('a friss seeden a limitnek megfelelő recent sort mutat, a legutóbbi aktivitás szerint, aktivitás-címkével', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const patients = await seeder.listPatients();
    const top = legutobbAktivPaciensek(patients, RECENT_PACIENS_LIMIT);

    renderHome();
    await screen.findByText('Legutóbbi páciensek');

    const links = await screen.findAllByRole('link');
    expect(links).toHaveLength(top.length);
    top.forEach((p, i) => {
      expect(links[i]).toHaveTextContent(p.nev);
      expect(links[i]).toHaveTextContent(AKTIVITAS_CIMKE[p.utolsoAktivitas!.tipus]);
    });
  });

  it('egy páciens MEGNYITÁSA (kattintás) nem befolyásolja, milyen sorrendben és tartalommal jelenik meg a lista', async () => {
    const user = userEvent.setup();
    renderHomeWithPatientRoute();

    const link = await screen.findByRole('link', { name: /Kovács János/ });
    await user.click(link);

    // D192: nincs location.state -- a PatientDetailPage alapértelmezett
    // tabja ('tervek') a `null` state mellett is a Kezelési tervek tabot
    // mutatja.
    expect(await screen.findByTestId('state')).toHaveTextContent('null');
    expect(screen.getByTestId('patientdir')).not.toHaveTextContent('');
  });

  it('utolsoAktivitas nélküli pácienseknél az üres állapot jelenik meg', async () => {
    stripAllUtolsoAktivitas();

    renderHome();
    expect(await screen.findByText(/Még nincs mentett munkád/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('egy páciens sérült paciens-adatok.json-ja mellett a sora "⚠ adat nem olvasható"-t mutat, a többi érintetlen', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const patients = await seeder.listPatients();
    const top = legutobbAktivPaciensek(patients, RECENT_PACIENS_LIMIT);
    // A sérült-fájl demó csak lezárt törzsadatú (paciens-adatok.json-nal
    // rendelkező) pácienst érinthet -- a recentsben lévő, patientData-val
    // rendelkezők közül az elsőt választjuk, hogy a teszt a demó-készlet
    // jövőbeli bővítésével is stabil maradjon.
    const serult = top.find((p) => seedPatientData.some((d) => d.patientDir === p.dirName));
    if (!serult) throw new Error('a teszthez legalább egy, a recentsben lévő, törzsadatos páciens kell');
    const key = findSeedKey(serult.dirName, 'paciens-adatok.json');
    localStorage.setItem(key, 'not valid json {{{');

    renderHome();
    const links = await screen.findAllByRole('link');
    expect(links).toHaveLength(top.length);
    const serultIndex = top.findIndex((p) => p.dirName === serult.dirName);
    links.forEach((link, i) => {
      if (i === serultIndex) {
        expect(link).toHaveTextContent(serult.nev);
        expect(link).toHaveTextContent('⚠ adat nem olvasható');
      } else {
        expect(link).not.toHaveTextContent('⚠ adat nem olvasható');
      }
    });
  });
});
