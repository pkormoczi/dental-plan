// backlog-30: az egyesített páciens-részletoldal (két tab: Páciens adatai |
// Kezelési tervek, URL-lel címezhető). A terv-lánc/verzió fa
// (PatientPlanChains) saját, teljes lefedettséggel rendelkezik a
// OsszesTervSection.test.tsx-ben. A `Páciens adatai` tab tartalmának
// (PatientEditorPanel) mezőkészlet/Save-Cancel viselkedése -- a 38. tétel
// (D43) óta, mióta a Pácienslista tiszta navigációs lista, ennek az
// egyetlen hívási helye ez az oldal -- itt fedve (mentés → tényleges
// paciens-adatok.json, átnevezés-duplikáció megerősítés). Ami ezen felül
// marad, csak az ÚJ, oldal-szintű viselkedés: URL-ből feloldott páciens,
// alapértelmezett/átadott tab, tab-váltás navigáció NÉLKÜL, 0 láncú páciens
// CTA-ja, sticky fejléc.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NavBar from '../components/NavBar';
import { NavGuardProvider } from '../components/NavGuardContext';
import PatientDetailPage from './PatientDetailPage';
import { resetListStateMemoryForTests } from '../components/useListStateMemory';
import { AppStateProvider, useAppState } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
import { DemoStorage } from '../storage/DemoStorage';
import { seedPatients, seedPlans } from '../storage/seed/plans';
import type { Plan } from '../domain/types';

function DraftProbe() {
  const { plan } = useAppState();
  return <div data-testid="draft-nev">{plan.paciens.nev}</div>;
}

// A 0 láncú páciens "+ Új terv" gombja a megosztott piszkozat-felülírás-őrön
// megy át -- ehhez kell egy MÁSIK pácienshez tartozó, ténylegesen a
// `DraftStorage`-ban ülő mentetlen piszkozat. A `OsszesTervSection.test.tsx`
// `seedPersistedDraft()`-jának egyszerűsített másolata (itt nincs szükség
// `meta`-ra).
function seedPersistedDraft(overrides: Partial<Plan> = {}) {
  const plan: Plan = {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Piszkozat Panni',
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
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:00:00.000Z', plan }),
  );
}

// A verziósor "Megnézés" gombja ide navigál (71. tétel) -- a "Vissza" gomb
// a `navigate(-1)`-es POP-visszatérést szimulálja, ugyanaz a minta, mint az
// OsszesTervSection.test.tsx `PaciensekProbe`-ja.
function TervReszleteiProbe() {
  const navigate = useNavigate();
  return (
    <div>
      <div data-testid="terv-reszletei-oldal" />
      <button onClick={() => navigate(-1)}>Vissza</button>
    </div>
  );
}

function renderDetail(patientDir: string, state?: Record<string, unknown>) {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter
        initialEntries={[{ pathname: `/paciensek/${encodeURIComponent(patientDir)}`, state }]}
      >
        <StorageProvider>
          <AppStateProvider>
            <NavGuardProvider>
              <Routes>
                <Route path="/paciensek/:patientDir" element={<PatientDetailPage />} />
                <Route path="/paciens" element={<DraftProbe />} />
                <Route
                  path="/paciensek/:patientDir/tervek/:planDir/:versionDir"
                  element={<TervReszleteiProbe />}
                />
              </Routes>
            </NavGuardProvider>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>,
  );
}

// D46: a NavBar-t IS rendereli, ugyanabban a router-fában -- a valós
// bekötés (`useNavGuard(dirtyAdatai)` a PatientDetailPage-ben, a NavBar
// kattintás-elfogása) csak így igazolható, nem a `renderDetail()` szűkebb
// harness-ével.
function renderDetailWithNavBar(patientDir: string, state?: Record<string, unknown>) {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter
        initialEntries={[{ pathname: `/paciensek/${encodeURIComponent(patientDir)}`, state }]}
      >
        <StorageProvider>
          <AppStateProvider>
            <NavGuardProvider>
              <NavBar />
              <Routes>
                <Route path="/paciensek/:patientDir" element={<PatientDetailPage />} />
                <Route path="/" element={<div>Kezdőlap-próba</div>} />
              </Routes>
            </NavGuardProvider>
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
    // useListStateMemory.ts fejléce: egy MemoryRouter kezdeti navigációja is
    // POP-nak számít, tesztfájlon belüli it()-ek enélkül tévesen örökölnék
    // egymás lánc-nyitottsági állapotát.
    resetListStateMemoryForTests();
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
    // A "Kezelési tervek" tab tartalmának "+ Új terv" gombja csak ebben a
    // tabban van jelen (a "Páciens adatai" tabon nincs, lásd lentebb) --
    // megbízható jelzés arra, hogy ténylegesen ez a tab renderel (Radix
    // Tabs.Content az inaktív tabot nem is rendereli, nem csak elrejti).
    expect(await screen.findByRole('button', { name: '+ Új terv' })).toBeInTheDocument();
  });

  it('location.state.tab: "adatai" felülírja az alapértelmezett tabot, és nincs rajta Új terv gomb', async () => {
    renderDetail(nagyDir, { tab: 'adatai' });

    const adataiTab = await screen.findByRole('tab', { name: /Páciens adatai/ });
    expect(adataiTab).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: 'Szerkesztés' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Új terv' })).not.toBeInTheDocument();
  });

  it('a sticky fejléc a törzsadatnak megfelelő nevet, születési dátumot és telefont mutatja', async () => {
    renderDetail(nagyDir);

    const header = await screen.findByTestId('patient-detail-header');
    expect(within(header).getByText('Nagy Éva')).toBeInTheDocument();
    // A születési dátum és a telefon egyetlen "· "-tal fűzött szövegcsomó
    // (redesign) -- nem két külön szöveg-node, mint korábban.
    expect(within(header).getByText('1990.11.02. · +36 20 555 1234')).toBeInTheDocument();
  });

  // D44: a sticky fejléc már kimondja a páciens nevét, a tabsor pedig
  // kínálja a "Páciens adatai" utat -- a "Kezelési tervek" tab beágyazott
  // PatientPlanChains-fejléce egyiket sem ismételheti meg.
  it('a Kezelési tervek tabon a páciens neve nincs duplikálva, és nincs második "Páciens adatai" út', async () => {
    renderDetail(nagyDir);

    const header = await screen.findByTestId('patient-detail-header');
    await screen.findByRole('button', { name: '+ Új terv' }); // a tab tartalma betöltött

    expect(screen.getAllByText('Nagy Éva')).toHaveLength(1);
    expect(within(header).getByText('Nagy Éva')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Páciens adatai' })).not.toBeInTheDocument();
  });

  // D44: a tabsor már kínálja a "Kezelési tervek" váltást -- a
  // PatientEditorPanel alján nincs tükör-link ugyanerre.
  it('a Páciens adatai tabon nincs "Korábbi tervek" gomb', async () => {
    renderDetail(nagyDir, { tab: 'adatai' });

    await screen.findByRole('button', { name: 'Szerkesztés' }); // a panel betöltött
    expect(screen.queryByRole('button', { name: 'Korábbi tervek' })).not.toBeInTheDocument();
  });

  it('0 láncú páciens a Kezelési tervek tabon CTA-t mutat, és a gomb sikeresen elindít egy tervet', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const folder = await seeder.createPatient('Teszt Üres');

    const user = userEvent.setup();
    renderDetail(folder.dirName);

    expect(await screen.findByText('Ennek a páciensnek még nincs kezelési terve.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Új terv' }));

    expect(await screen.findByTestId('draft-nev')).toHaveTextContent('Teszt Üres');
  });

  // Korábban ez az ág megerősítés nélkül hívta a `copyPlanIntoDraft`-ot --
  // egy MÁSIK páciens mentetlen piszkozata szó nélkül eltűnt volna. A
  // `latestOverall === null && sajatAktivDraft === null` ág itt renderel,
  // tehát a piszkozat szükségszerűen egy másik pácienshez tartozik (lásd
  // `PatientDetailPage.tsx` idevágó kommentje).
  it('0 láncú páciens "+ Új terv" gombja megerősítést kér, ha MÁS páciensnek van mentetlen piszkozata', async () => {
    seedPersistedDraft();
    const seeder = new DemoStorage();
    await seeder.init();
    const folder = await seeder.createPatient('Teszt Üres Piszkozattal');

    const user = userEvent.setup();
    renderDetail(folder.dirName);

    await user.click(await screen.findByRole('button', { name: '+ Új terv' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('draft-nev')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Új terv' }));
    await user.click(
      await screen.findByRole('button', { name: 'Új terv, piszkozat elvetésével' }),
    );

    expect(await screen.findByTestId('draft-nev')).toHaveTextContent('Teszt Üres Piszkozattal');
  });

  it('meglévő terv-láncú páciensnél (Kovács János) a Kezelési tervek tab a fát mutatja, nem CTA-t', async () => {
    renderDetail(kovacsDir);

    expect(
      screen.queryByText('Ennek a páciensnek még nincs kezelési terve.'),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '+ Új terv' })).toBeInTheDocument();
  });

  // A korábbi, oldal-szintű "N terv" burkoló toggle (páciens-szinten) itt
  // MA IS nincs (a 46. tétel előtt sem volt, D44) -- de a 46. tétel óta a
  // `PatientPlanChains` lánc-SZINTŰ toggle-je EZEN a tabon is érvényes,
  // ugyanazzal az alapértelmezéssel (csak a legfrissebb véglegesített
  // dátumú lánc nyitva), mint a `standalone` Korábbi tervek listán
  // (OsszesTervSection.test.tsx) -- a fejlécek attól függetlenül mindig
  // látszanak.
  it('2+ terv-lánccal rendelkező páciensnél a Kezelési tervek tabon is per-lánc összecsukás van, ugyanazzal az alapértelmezéssel', async () => {
    renderDetail(nagyDir);

    await screen.findByRole('button', { name: '+ Új terv' }); // a tab tartalma betöltött
    // Nincs páciens-szintű burkoló toggle.
    expect(screen.queryByRole('button', { name: /^\d+ terv$/ })).not.toBeInTheDocument();
    // A fejlécek nyitottságtól függetlenül mindig látszanak.
    expect(screen.getByText(/^Tömések ·/)).toBeInTheDocument();
    expect(screen.getByText(/^Fogkőeltávolítás ·/)).toBeInTheDocument();

    const nagyEvaEntries = seedPlans.filter((e) => e.plan.paciens.nev === 'Nagy Éva');
    const nagyEvaChains = new Map<string, typeof nagyEvaEntries>();
    for (const entry of nagyEvaEntries) {
      const list = nagyEvaChains.get(entry.planDir) ?? [];
      list.push(entry);
      nagyEvaChains.set(entry.planDir, list);
    }
    const tomesekPlanDir = [...nagyEvaChains.values()].find((c) => c.length > 1)![0].planDir;
    const fogkoPlanDir = [...nagyEvaChains.values()].find((c) => c.length === 1)![0].planDir;
    const tomesekDoboz = document.querySelector(`[data-plan="${tomesekPlanDir}"]`) as HTMLElement;
    const fogkoDoboz = document.querySelector(`[data-plan="${fogkoPlanDir}"]`) as HTMLElement;

    // A "Fogkőeltávolítás" lánc (2026-08-01) a legfrissebb véglegesített
    // dátumú (D186) -- ez nyitva, a "Tömések" lánc csukva.
    expect(within(fogkoDoboz).getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(within(tomesekDoboz).getByRole('button', { expanded: false })).toBeInTheDocument();
    expect(
      within(tomesekDoboz).queryByRole('button', { name: /további műveletek$/ }),
    ).not.toBeInTheDocument();
  });

  // 71. tétel: a Terv részletei lap "Összes verzió" gombja ide, POP-
  // navigációval tér vissza -- a lánc-nyitottságnak (amit a doki a "Tömések"
  // láncon kézzel nyitott ki, mert alapból csukva van) meg kell maradnia.
  it('a Terv részletei lapra navigálva, majd onnan POP-pal visszatérve a lánc-nyitottság visszaáll', async () => {
    const user = userEvent.setup();
    renderDetail(nagyDir);

    await screen.findByRole('button', { name: '+ Új terv' });
    const nagyEvaEntries = seedPlans.filter((e) => e.plan.paciens.nev === 'Nagy Éva');
    const nagyEvaChains = new Map<string, typeof nagyEvaEntries>();
    for (const entry of nagyEvaEntries) {
      const list = nagyEvaChains.get(entry.planDir) ?? [];
      list.push(entry);
      nagyEvaChains.set(entry.planDir, list);
    }
    const tomesekPlanDir = [...nagyEvaChains.values()].find((c) => c.length > 1)![0].planDir;
    const tomesekDoboz = document.querySelector(`[data-plan="${tomesekPlanDir}"]`) as HTMLElement;

    const toggle = within(tomesekDoboz).getByRole('button', { expanded: false });
    await user.click(toggle);
    expect(within(tomesekDoboz).getByRole('button', { expanded: true })).toBeInTheDocument();

    await user.click(within(tomesekDoboz).getByRole('button', { name: 'Megnézés' }));
    await screen.findByTestId('terv-reszletei-oldal');
    await user.click(screen.getByRole('button', { name: 'Vissza' }));

    await screen.findByRole('button', { name: '+ Új terv' });
    const tomesekDobozAfter = document.querySelector(`[data-plan="${tomesekPlanDir}"]`) as HTMLElement;
    expect(within(tomesekDobozAfter).getByRole('button', { expanded: true })).toBeInTheDocument();
  });

  // D38: a Radix `Tabs` unmountolja az inaktív tabot -- a "Páciens
  // adatai" tabon félbehagyott szerkesztés máskülönben némán elveszne
  // egy tab-váltásnál.
  it('mentetlen módosítással tabot váltva megerősítést kér -- Mégse megtartja a piszkozatot', async () => {
    const user = userEvent.setup();
    renderDetail(nagyDir, { tab: 'adatai' });

    await user.click(await screen.findByRole('button', { name: 'Szerkesztés' }));
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

    await user.click(await screen.findByRole('button', { name: 'Szerkesztés' }));
    const telefonMezo = await screen.findByDisplayValue('+36 20 555 1234');
    await user.clear(telefonMezo);
    await user.type(telefonMezo, 'ideiglenes érték');

    await user.click(await screen.findByRole('tab', { name: /Kezelési tervek/ }));
    await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));

    const tervekTab = await screen.findByRole('tab', { name: /Kezelési tervek/ });
    expect(tervekTab).toHaveAttribute('aria-selected', 'true');

    // A tab-váltás a szerkesztés módot is nullázza -- a visszatérés nézet
    // módban, nem a piszkozatban félbehagyott adatokkal történik.
    await user.click(await screen.findByRole('tab', { name: /Páciens adatai/ }));
    // A sticky fejléc is mutatja ugyanezt a telefonszámot -- a `tabpanel`-re
    // szűkítve egyértelmű, hogy a panel (nem a fejléc) tartalmát nézzük.
    const panel = await screen.findByRole('tabpanel');
    expect(await within(panel).findByText('+36 20 555 1234')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mentés' })).not.toBeInTheDocument();
  });

  // Kovács Jánosnak (a seed szerint) nincs saját paciens-adatok.json-ja --
  // a mezők a legutóbbi terv paciens-pillanatképéből előre kitöltve
  // nyílnak, fallback-jelzéssel; mentés után a jelzés eltűnik és a fájl
  // ténylegesen létrejön.
  it('törzsadat nélküli páciensnél a legutóbbi terv paciens pillanatképét mutatja, fallback-jelzéssel, mentés után önálló törzsadattá válik', async () => {
    const user = userEvent.setup();
    renderDetail(kovacsDir, { tab: 'adatai' });

    // A sticky fejléc is mutatja ugyanezt a telefonszámot -- a `tabpanel`-re
    // szűkítve egyértelmű, hogy a panel (nem a fejléc) tartalmát nézzük.
    const panel = await screen.findByRole('tabpanel');
    expect(await within(panel).findByText('+36 30 123 4567')).toBeInTheDocument();
    expect(screen.getByText(/mentéssel önálló/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Szerkesztés' }));
    const telefonMezo = await screen.findByDisplayValue('+36 30 123 4567');
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

    await user.click(await screen.findByRole('button', { name: 'Szerkesztés' }));
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

  // D45: a törzsadat-szerkesztő alapból olvasó nézetben nyílik, a
  // kitöltetlen mezők az app meglévő "—" hiányzó-érték konvencióját kapják
  // (nem egy új "Nincs megadva" szöveget).
  it('alapból olvasó nézetben nyílik, a kitöltetlen mezők "—"-t mutatnak', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const folder = await seeder.createPatient('Teszt Üres');

    renderDetail(folder.dirName, { tab: 'adatai' });

    expect(await screen.findByRole('button', { name: 'Szerkesztés' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mentés' })).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Törvényes képviselő/)).not.toBeInTheDocument();
  });

  it('location.state.mod: "szerkesztes" a Páciens adatai tabot azonnal szerkesztés módban nyitja (quick-create után)', async () => {
    renderDetail(nagyDir, { tab: 'adatai', mod: 'szerkesztes' });

    expect(await screen.findByRole('button', { name: 'Mentés' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Szerkesztés' })).not.toBeInTheDocument();
  });

  it('jövőbeli születési dátum blokkolja a mentést', async () => {
    const user = userEvent.setup();
    renderDetail(nagyDir, { tab: 'adatai' });

    await user.click(await screen.findByRole('button', { name: 'Szerkesztés' }));
    const szuletettMezo = await screen.findByLabelText('Született');
    await user.clear(szuletettMezo);
    await user.type(szuletettMezo, '2099-01-01');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    expect(await screen.findByText('A születési dátum nem lehet jövőbeli.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mentés' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    const verify = new DemoStorage();
    await verify.init();
    const adatok = await verify.loadPatientData(nagyDir);
    expect(adatok?.szuletesiIdo).toBe('1990-11-02');
  });

  it('érvénytelen e-mail cím blokkolja a mentést', async () => {
    const user = userEvent.setup();
    renderDetail(nagyDir, { tab: 'adatai' });

    await user.click(await screen.findByRole('button', { name: 'Szerkesztés' }));
    const emailMezo = await screen.findByRole('textbox', { name: 'E-mail' });
    await user.clear(emailMezo);
    await user.type(emailMezo, 'nem-ervenyes-cim');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    expect(await screen.findByText('Érvénytelen e-mail cím.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    const verify = new DemoStorage();
    await verify.init();
    const adatok = await verify.loadPatientData(nagyDir);
    expect(adatok?.email).toBe('nagy.eva@example.hu');
  });

  it('mentési hiba után a beírt érték megmarad, szerkesztés módban', async () => {
    const user = userEvent.setup();
    renderDetail(nagyDir, { tab: 'adatai' });

    await user.click(await screen.findByRole('button', { name: 'Szerkesztés' }));
    const telefonMezo = await screen.findByDisplayValue('+36 20 555 1234');

    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === `dp:paciensek/${nagyDir}/paciens-adatok.json`) {
        throw new DOMException('QuotaExceededError');
      }
      originalSetItem(key, value);
    });

    await user.clear(telefonMezo);
    await user.type(telefonMezo, '+36 70 111 2222');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    expect(await screen.findByText(/A mentés váratlanul meghiúsult|QuotaExceededError/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('+36 70 111 2222')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mentés' })).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  // D46: a Páciens adatai tabon mentetlen módosítással NavBar-kattintás is
  // megerősítést kér -- korábban (D38 eredeti hatóköre) csak a lapon
  // belüli tab-váltás volt védve, a NavBar-ról a piszkozat némán elveszett.
  it('mentetlen módosítással a NavBar-kattintás is megerősítést kér -- Mégse a lapon tart', async () => {
    const user = userEvent.setup();
    renderDetailWithNavBar(nagyDir, { tab: 'adatai' });

    await user.click(await screen.findByRole('button', { name: 'Szerkesztés' }));
    const telefonMezo = await screen.findByDisplayValue('+36 20 555 1234');
    await user.clear(telefonMezo);
    await user.type(telefonMezo, 'ideiglenes érték');

    await user.click(screen.getByRole('link', { name: 'Kezdőlap' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Nem mentett módosítás')).toBeInTheDocument();
    expect(screen.queryByText('Kezdőlap-próba')).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('ideiglenes érték')).toBeInTheDocument();
  });

  it('mentetlen módosítással a NavBar-kattintás megerősítés után ténylegesen navigál', async () => {
    const user = userEvent.setup();
    renderDetailWithNavBar(nagyDir, { tab: 'adatai' });

    await user.click(await screen.findByRole('button', { name: 'Szerkesztés' }));
    const telefonMezo = await screen.findByDisplayValue('+36 20 555 1234');
    await user.clear(telefonMezo);
    await user.type(telefonMezo, 'ideiglenes érték');

    await user.click(screen.getByRole('link', { name: 'Kezdőlap' }));
    await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));

    expect(await screen.findByText('Kezdőlap-próba')).toBeInTheDocument();
  });

  it('nézet módban (nincs mentetlen módosítás) a NavBar-kattintás megerősítés nélkül navigál', async () => {
    const user = userEvent.setup();
    renderDetailWithNavBar(nagyDir, { tab: 'adatai' });

    await screen.findByRole('button', { name: 'Szerkesztés' });
    await user.click(screen.getByRole('link', { name: 'Kezdőlap' }));

    expect(await screen.findByText('Kezdőlap-próba')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // A "← Vissza" `navigate(-1)`-et hív -- a teszteléshez valódi előzmény
  // kell a MemoryRouter-ben, ezért ez a két teszt nem a `renderDetail()`
  // harnesst használja, hanem egy előzménnyel rendelkező sajátot.
  function renderDetailWithHistory(patientDir: string) {
    return render(
      <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
        <MemoryRouter
          initialEntries={['/paciensek', `/paciensek/${encodeURIComponent(patientDir)}`]}
          initialIndex={1}
        >
          <StorageProvider>
            <AppStateProvider>
              <NavGuardProvider>
                <Routes>
                  <Route path="/paciensek" element={<div>Páciensek-próba</div>} />
                  <Route path="/paciensek/:patientDir" element={<PatientDetailPage />} />
                </Routes>
              </NavGuardProvider>
            </AppStateProvider>
          </StorageProvider>
        </MemoryRouter>
      </Theme>,
    );
  }

  it('nézet módban a "← Vissza" megerősítés nélkül navigál oda, ahonnan érkeztünk', async () => {
    const user = userEvent.setup();
    renderDetailWithHistory(nagyDir);

    await screen.findByRole('button', { name: '+ Új terv' }); // a lap betöltött
    await user.click(screen.getByRole('button', { name: 'Vissza' }));

    expect(await screen.findByText('Páciensek-próba')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // D46 mintája (lásd fent a NavBar-teszteket): a "← Vissza" a "Páciens
  // adatai" tabon félbehagyott szerkesztést sem hagyhatja csendben elveszni.
  it('mentetlen módosítással a "← Vissza" is megerősítést kér -- Mégse a lapon tart', async () => {
    const user = userEvent.setup();
    renderDetailWithHistory(nagyDir);

    await user.click(await screen.findByRole('tab', { name: /Páciens adatai/ }));
    await user.click(await screen.findByRole('button', { name: 'Szerkesztés' }));
    const telefonMezo = await screen.findByDisplayValue('+36 20 555 1234');
    await user.clear(telefonMezo);
    await user.type(telefonMezo, 'ideiglenes érték');

    await user.click(screen.getByRole('button', { name: 'Vissza' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Nem mentett módosítás')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('ideiglenes érték')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Vissza' }));
    await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));
    expect(await screen.findByText('Páciensek-próba')).toBeInTheDocument();
  });
});
