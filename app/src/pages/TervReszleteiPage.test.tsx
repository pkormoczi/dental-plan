// A 71. tétel alaptesztje -- lásd docs/03-funkcionalis-spec.md § 11. "Terv
// részletei (véglegesített verzió)". A `PatientDetailPage.test.tsx` saját
// provider-stack + `MemoryRouter initialEntries` + probe-route mintáját
// követi, valódi `DemoStorage`-zal.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TervReszleteiPage from './TervReszleteiPage';
import { AppStateProvider, useAppState } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
import { DemoStorage, PREFIX } from '../storage/DemoStorage';
import { seedPatients, seedPlans } from '../storage/seed/plans';
import { formatLongDate, formatShortDate } from '../domain/date';
import type { Plan, PatientMasterData } from '../domain/types';
import type { WorkflowRoute } from '../storage/DraftStorage';

function reszleteiUrl(patientDir: string, planDir: string, versionDir: string): string {
  return `/paciensek/${encodeURIComponent(patientDir)}/tervek/${encodeURIComponent(planDir)}/${encodeURIComponent(versionDir)}`;
}

function PaciensekProbe() {
  const { patientDir } = useParams<{ patientDir: string }>();
  const location = useLocation();
  const tab = (location.state as { tab?: string } | null)?.tab ?? '';
  return <div data-testid="paciensek-oldal" data-patientdir={patientDir} data-tab={tab} />;
}

function DraftProbe() {
  const { plan } = useAppState();
  return <div data-testid="draft-oldal">{plan.paciens.nev}</div>;
}

function ElozoOldalProbe() {
  return <div data-testid="elozo-oldal">ELŐZŐ OLDAL</div>;
}

function renderReszletek(initialPath: string, extraEntries: string[] = []) {
  const initialEntries = [...extraEntries, initialPath];
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
        <StorageProvider>
          <AppStateProvider>
            <Routes>
              <Route
                path="/paciensek/:patientDir/tervek/:planDir/:versionDir"
                element={<TervReszleteiPage />}
              />
              <Route path="/paciensek/:patientDir" element={<PaciensekProbe />} />
              <Route path="/paciens" element={<DraftProbe />} />
              <Route path="/terv" element={<div data-testid="terv-oldal">TERV-OLDAL</div>} />
              <Route path="/elozo" element={<ElozoOldalProbe />} />
            </Routes>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>,
  );
}

function seedPersistedDraft(overrides: Partial<Plan> = {}, meta: { patientDir?: string; lastRoute?: WorkflowRoute } = {}) {
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
    sablonVerzio: 'nyilatkozat-hu-v1',
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
    `${PREFIX}piszkozat`,
    JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:00:00.000Z', plan, ...meta }),
  );
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 1,
    statusz: 'VEGLEGES',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Egyedi Elek',
      szuletesiIdo: '1985-04-12',
      lakcim: '',
      telefon: '+36 30 111 2222',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
}

const nagyDir = seedPatients.find((p) => p.record.nev === 'Nagy Éva')!.patientDir;
const nagyEvaEntries = seedPlans.filter((e) => e.patientDir === nagyDir);
const nagyEvaChains = new Map<string, typeof nagyEvaEntries>();
for (const entry of nagyEvaEntries) {
  const list = nagyEvaChains.get(entry.planDir) ?? [];
  list.push(entry);
  nagyEvaChains.set(entry.planDir, list);
}
const multiChain = [...nagyEvaChains.values()].find((c) => c.length > 1)!.sort((a, b) => a.plan.verzio - b.plan.verzio);
const [nagyV1, nagyV2] = multiChain;

describe('TervReszleteiPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    const seeder = new DemoStorage();
    await seeder.init();
  });

  it('a fejléc a páciens nevét és születési dátumát mutatja -- telefont NEM (nem a PatientDetailHeader)', async () => {
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await screen.findByTestId('terv-reszletei-fejlec');
    expect(screen.getByText(formatShortDate('1990-11-02', 'hu'))).toBeInTheDocument();
    expect(screen.queryByText('+36 20 555 1234')).not.toBeInTheDocument();
  });

  it('a metaadat-blokk a terv verzióját, dátumait, nyelvét, pénznemét, orvosát és a "Véglegesített" jelvényt mutatja', async () => {
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await screen.findByTestId('terv-reszletei-fejlec');

    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText(formatLongDate(nagyV2.plan.keltezes, 'hu'))).toBeInTheDocument();
    expect(screen.getByText(formatLongDate(nagyV2.plan.ervenyesIg, 'hu'))).toBeInTheDocument();
    expect(screen.getByText('Magyar')).toBeInTheDocument();
    expect(screen.getByText('HUF — forint')).toBeInTheDocument();
    expect(screen.getByText('Dr. Mándoki István')).toBeInTheDocument();
    expect(screen.getByText('Véglegesített')).toBeInTheDocument();
    expect(screen.queryByText('Csak ajánlat')).not.toBeInTheDocument();
  });

  it('a fázisok blokk (72. tétel) a terv fázisait mutatja, a placeholder-szöveg eltűnt', async () => {
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await screen.findByTestId('terv-reszletei-fejlec');

    expect(
      screen.queryByText('A fázisok és kezelési sorok a következő lépésben kerülnek ide.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('1. kezelés — fogkő és tömés')).toBeInTheDocument();
    expect(screen.getByText('2. kezelés — korona')).toBeInTheDocument();
    expect(screen.getByText('Fognyaki tömés')).toBeInTheDocument();
  });

  it('"Csak ajánlat" jelvényt csak a ténylegesen csakAjanlat:true-val mentett verzión mutat', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const ref = await seeder.savePlan(makePlan({ csakAjanlat: true }), new Uint8Array([1]));

    renderReszletek(reszleteiUrl(ref.patientDir, ref.planDir, ref.versionDir));
    await screen.findByTestId('terv-reszletei-fejlec');
    expect(screen.getByText('Csak ajánlat')).toBeInTheDocument();
  });

  it('a páciens-pillanatkép alapból összecsukva, kibontva mind a 8 mező látszik, szinkron-gomb nélkül', async () => {
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    const trigger = await screen.findByRole('button', { name: 'Megjelenítés' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('+36 20 555 1234')).not.toBeInTheDocument();

    await userEvent.setup().click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('+36 20 555 1234')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Frissítés/ })).not.toBeInTheDocument();
  });

  it('eltérő törzsadatnál a diff-tábla mindkét értéket mutatja, szinkron-gomb nélkül', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const plan = makePlan({ paciensId: 'teszt-diff' });
    const ref = await seeder.savePlan(plan, new Uint8Array([1]));
    const master: PatientMasterData = {
      schemaVersion: 1,
      paciensId: 'teszt-diff',
      ...plan.paciens,
      telefon: '+36 99 000 0000',
    };
    await seeder.savePatientData(ref.patientDir, master);

    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(ref.patientDir, ref.planDir, ref.versionDir));
    // A badge szövege ("1 mező azóta módosult") a gomb accessible name-ébe
    // folyik (a badge a gomb GYEREKE) -- ezért itt regex, nem pontos egyezés.
    await user.click(await screen.findByRole('button', { name: /Megjelenítés/ }));

    expect(screen.getByText('1 mező azóta módosult')).toBeInTheDocument();
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByText('+36 99 000 0000')).toBeInTheDocument();
    expect(within(tabla).getByText(plan.paciens.telefon)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Frissítés/ })).not.toBeInTheDocument();
  });

  it('egyező törzsadatnál nincs eltérés-jelző badge és nincs diff-tábla', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const plan = makePlan({ paciensId: 'teszt-egyezo' });
    const ref = await seeder.savePlan(plan, new Uint8Array([1]));
    await seeder.savePatientData(ref.patientDir, {
      schemaVersion: 1,
      paciensId: 'teszt-egyezo',
      ...plan.paciens,
    });

    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(ref.patientDir, ref.planDir, ref.versionDir));
    await user.click(await screen.findByRole('button', { name: 'Megjelenítés' }));

    expect(screen.queryByText(/mező azóta módosult/)).not.toBeInTheDocument();
    expect(screen.queryByText('Törzsadat')).not.toBeInTheDocument();
  });

  it('sérült paciens-adatok.json esetén a lap NEM hibaágban renderel -- a pillanatkép-szekcióban halk jelzés helyettesíti a diffet', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const plan = makePlan();
    const ref = await seeder.savePlan(plan, new Uint8Array([1]));
    localStorage.setItem(`${PREFIX}paciensek/${ref.patientDir}/paciens-adatok.json`, 'nem-json');

    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(ref.patientDir, ref.planDir, ref.versionDir));
    await screen.findByTestId('terv-reszletei-fejlec');
    expect(screen.queryByText(/A terv betöltése nem sikerült/)).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Megjelenítés' }));
    expect(screen.getByText('A jelenlegi törzsadat nem olvasható, az összevetés kimarad.')).toBeInTheDocument();
  });

  it('a lánc legfrissebb verzióján csak a "régebbi" nav-gomb jelenik meg; rákattintva a szomszédos verzióra vált', async () => {
    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await screen.findByTestId('terv-reszletei-fejlec');

    expect(screen.getByText('Új verzió')).toBeInTheDocument();
    expect(screen.queryByText(/^v2 ·/)).not.toBeInTheDocument(); // az "ujabb" gomb nincs a legfrissebbön

    const regebbiGomb = screen.getByText(`v${nagyV1.plan.verzio} · ${formatShortDate(nagyV1.plan.keltezes, 'hu')}`);
    await user.click(regebbiGomb);

    await waitFor(() => expect(screen.getByText('v1')).toBeInTheDocument());
  });

  it('a lánc legrégebbi verzióján csak az "újabb" gomb jelenik meg, és "Ugrás a legfrissebbre" van "Új verzió" helyett', async () => {
    renderReszletek(reszleteiUrl(nagyDir, nagyV1.planDir, nagyV1.versionDir));
    await screen.findByTestId('terv-reszletei-fejlec');

    expect(screen.getByText('Ugrás a legfrissebbre')).toBeInTheDocument();
    expect(screen.queryByText('Új verzió')).not.toBeInTheDocument();
    expect(screen.getByText(`v${nagyV2.plan.verzio} · ${formatShortDate(nagyV2.plan.keltezes, 'hu')}`)).toBeInTheDocument();
  });

  it('legfrissebb verzión "Új verzió" (mentetlen piszkozat nélkül) a /terv route-ra navigál', async () => {
    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await user.click(await screen.findByText('Új verzió'));
    await screen.findByTestId('terv-oldal');
  });

  it('"Új verzió" mentetlen piszkozattal megerősítést kér, Mégse-nél nem navigál', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await user.click(await screen.findByText('Új verzió'));

    expect(await screen.findByText('Piszkozat felülírása')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByTestId('terv-oldal')).not.toBeInTheDocument();

    await user.click(screen.getByText('Új verzió'));
    await user.click(await screen.findByRole('button', { name: 'Új verzió, piszkozat elvetésével' }));
    await screen.findByTestId('terv-oldal');
  });

  it('historical verzión "Másolás új tervbe" (piszkozat nélkül) a "Korábbi verzió másolása" figyelmeztetést adja, elfogadás után /paciens', async () => {
    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(nagyDir, nagyV1.planDir, nagyV1.versionDir));
    await user.click(await screen.findByText('Másolás új tervbe'));

    expect(await screen.findByText('Korábbi verzió másolása')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Másolás a korábbi verzióval' }));
    await screen.findByTestId('draft-oldal');
  });

  it('legfrissebb verzión "Másolás új tervbe" (piszkozat nélkül) dialógus nélkül egyenesen /paciens-re navigál', async () => {
    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await user.click(await screen.findByText('Másolás új tervbe'));
    await screen.findByTestId('draft-oldal');
    expect(screen.queryByText('Korábbi verzió másolása')).not.toBeInTheDocument();
  });

  it('sérült cél terv.json esetén piros hibaüzenetet ad, menekülő gombbal', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const ref = await seeder.savePlan(makePlan(), new Uint8Array([1]));
    localStorage.setItem(`${PREFIX}paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`, 'nem-json');

    renderReszletek(reszleteiUrl(ref.patientDir, ref.planDir, ref.versionDir));
    expect(await screen.findByText(/A terv betöltése nem sikerült/)).toBeInTheDocument();
    expect(screen.getByText('Összes verzió')).toBeInTheDocument();
  });

  it.each([
    ['nincs ilyen páciens', 'nincs-ilyen-paciens', nagyV2.planDir, nagyV2.versionDir],
    ['nincs ilyen terv-lánc', nagyDir, 'nincs-ilyen-terv', nagyV2.versionDir],
    ['nincs ilyen verzió', nagyDir, nagyV2.planDir, 'nincs-ilyen-verzio'],
  ])('%s -> not-found üzenet', async (_label, patientDir, planDir, versionDir) => {
    renderReszletek(reszleteiUrl(patientDir, planDir, versionDir));
    expect(await screen.findByText(/Nincs ilyen/)).toBeInTheDocument();
  });

  it('nem véglegesített (PISZKOZAT) mentett verzióra a védőháló-ág fut, nem a tartalom', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const ref = await seeder.savePlan(makePlan({ statusz: 'PISZKOZAT' }), new Uint8Array([1]));

    renderReszletek(reszleteiUrl(ref.patientDir, ref.planDir, ref.versionDir));
    expect(
      await screen.findByText(
        'Ez a verzió nem véglegesített -- a Terv részletei nézet csak véglegesített verziót mutat.',
      ),
    ).toBeInTheDocument();
  });

  it('"Összes verzió" első history-bejegyzésként a páciens-lapra, "tervek" tabbal navigál', async () => {
    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    // A betöltés-ág is ad egy "Összes verzió" gombot -- meg kell várni a
    // teljes betöltést, különben a kattintás egy közben lecserélt (unmountolt)
    // gombra eshet, ami néma no-op-ot okoz.
    await screen.findByTestId('terv-reszletei-fejlec');
    await user.click(screen.getByText('Összes verzió'));

    const probe = await screen.findByTestId('paciensek-oldal');
    expect(probe.dataset.patientdir).toBe(nagyDir);
    expect(probe.dataset.tab).toBe('tervek');
  });

  it('"Összes verzió" nem-első bejegyzésnél POP-pal az előző oldalra navigál', async () => {
    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir), ['/elozo']);
    await screen.findByTestId('terv-reszletei-fejlec');
    await user.click(screen.getByText('Összes verzió'));
    await screen.findByTestId('elozo-oldal');
  });

  it('verzióváltás után a korábban kibontott páciens-pillanatkép újra összecsukva jelenik meg (key-alapú remount)', async () => {
    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    const trigger = await screen.findByRole('button', { name: 'Megjelenítés' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByText(`v${nagyV1.plan.verzio} · ${formatShortDate(nagyV1.plan.keltezes, 'hu')}`));
    await waitFor(() => expect(screen.getByText('v1')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Megjelenítés' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('verzióváltáskor a lap tetejére görget', async () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo');
    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await screen.findByTestId('terv-reszletei-fejlec');
    scrollSpy.mockClear();

    await user.click(screen.getByText(`v${nagyV1.plan.verzio} · ${formatShortDate(nagyV1.plan.keltezes, 'hu')}`));
    await waitFor(() => expect(scrollSpy).toHaveBeenCalledWith(0, 0));
  });

  it('nincs a lapon /további műveletek$/-re illeszkedő accessible name (a testQueries.verzioMenupont szerződésének védelme)', async () => {
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await screen.findByTestId('terv-reszletei-fejlec');
    expect(screen.queryByRole('button', { name: /további műveletek$/ })).not.toBeInTheDocument();
  });

  it('"Megnyitás külön" a kattintás pillanatában szinkron nyitja meg az üres lapot, majd a PDF megérkezése után a blob URL-re navigál', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const ref = await seeder.savePlan(makePlan(), new Uint8Array([1, 2, 3]));

    const callOrder: string[] = [];
    const mockWin = { location: { href: '' }, close: vi.fn() };
    const openMock = vi.fn(() => {
      callOrder.push('open');
      return mockWin as unknown as Window;
    });
    window.open = openMock as unknown as typeof window.open;
    URL.createObjectURL = vi.fn(() => {
      callOrder.push('createObjectURL');
      return 'blob:teszt';
    }) as unknown as typeof URL.createObjectURL;

    const user = userEvent.setup();
    renderReszletek(reszleteiUrl(ref.patientDir, ref.planDir, ref.versionDir));
    await user.click(await screen.findByText('Megnyitás külön'));

    expect(openMock).toHaveBeenCalledWith('', '_blank');
    await waitFor(() => expect(mockWin.location.href).toBe('blob:teszt'));
    expect(callOrder).toEqual(['open', 'createObjectURL']);
  });

  it('"Megnyitás külön" hiányzó PDF esetén bezárja az üres lapot és inline hibát mutat', async () => {
    const mockWin = { location: { href: '' }, close: vi.fn() };
    window.open = vi.fn(() => mockWin as unknown as Window) as unknown as typeof window.open;

    const user = userEvent.setup();
    // A seed-verziókhoz nincs mentett PDF.
    renderReszletek(reszleteiUrl(nagyDir, nagyV2.planDir, nagyV2.versionDir));
    await user.click(await screen.findByText('Megnyitás külön'));

    await waitFor(() => expect(mockWin.close).toHaveBeenCalled());
    expect(await screen.findByText('Ehhez a verzióhoz nincs mentett PDF.')).toBeInTheDocument();
  });
});
