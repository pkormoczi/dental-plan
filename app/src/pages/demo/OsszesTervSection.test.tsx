import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OsszesTervSection from './OsszesTervSection';
import { resetListStateMemoryForTests } from '../../components/useListStateMemory';
import { TestProviders } from '../../testUtils';
import { patientCard, verzioMenupont } from '../../testQueries';
import { DemoStorage } from '../../storage/DemoStorage';
import { seedPlans } from '../../storage/seed/plans';
import { formatMoney } from '../../domain/money';
import { buildDownloadFileName } from '../../storage/paths';
import { useAppState } from '../../state/AppState';
import type { Plan } from '../../domain/types';
import type { WorkflowRoute } from '../../storage/DraftStorage';

// backlog-30: a kereszt-link az egyesített páciens-részletoldalra navigál
// (`/paciensek/:patientDir`), a tab-ot `location.state.tab`-ban átadva --
// ezt a probe-ot olvassuk vissza, a valódi PatientDetailPage.tsx-et nem
// kell ehhez a teszthez felhúzni. A "Vissza" gomb a 46. tétel POP-memória
// teszteléséhez kell -- a `useListStateMemory.test.tsx` `DetailProbe`
// mintája.
function PaciensekProbe() {
  const { patientDir } = useParams<{ patientDir: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = (location.state as { tab?: string } | null)?.tab ?? '';
  return (
    <div>
      <div data-testid="paciensek-oldal" data-patientdir={patientDir} data-tab={tab} />
      <button onClick={() => navigate(-1)}>Vissza</button>
    </div>
  );
}

// backlog-17: a két "Új terv…" gomb a Terv adatai lapra navigál
// (6. döntés) -- a navigáció TÉNYÉT és a
// piszkozatba került Plan tartalmát kell látni, ezért a "/paciens" célpont
// egy kis probe, ami a friss draftot írja ki, nem egy néma stub.
function DraftProbe() {
  const { plan } = useAppState();
  const sorCount = plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
  return (
    <div>
      <div data-testid="draft-oldal">PACIENS-OLDAL</div>
      <div data-testid="draft-nev">{plan.paciens.nev}</div>
      <div data-testid="draft-tervid">„{plan.tervId}”</div>
      <div data-testid="draft-sorcount">{sorCount}</div>
      <div data-testid="draft-keltezes">{plan.keltezes}</div>
      {/* A telefon (nem a névvel egyező mező) igazolja, hogy a paciens
          blokk a MASTERBŐL jön, nem csak a paciens.json index nev-jéből. */}
      <div data-testid="draft-telefon">{plan.paciens.telefon}</div>
    </div>
  );
}

function seedPersistedDraft(
  overrides: Partial<Plan> = {},
  meta: { patientDir?: string; lastRoute?: WorkflowRoute } = {},
) {
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
    JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:00:00.000Z', plan, ...meta }),
  );
}

// A formatMoney nem törhető szóközt (U+00A0) használ (CLAUDE.md: a pénzösszeg
// nem tördelhető). A testing-library a DOM szövegét sima szóközre
// normalizálja, az elvárt stringet viszont nem -- ezért itt kell átváltani.
function penz(osszeg: number): string {
  return formatMoney(osszeg, 'HUF', 'hu').replace(/ /g, ' ');
}

// backlog-20: egy ténylegesen elmentett (nem seed) verzió a Letöltés
// fájlnév-drótozottság teszthez -- fix tervId, hogy a várt fájlnevet a
// teszt maga is összeállíthassa.
function makeVeglegesPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: 'lt0001',
    verzio: 0,
    statusz: 'VEGLEGES',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Letöltés Teszt',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
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

// Nagy Éva a seedben KÉT önálló terv-lánccal szerepel (fogpótlás: v1+v2,
// fogkőeltávolítás: v1) -- ez a csoportosítás terv-lánc (planDir) szerint,
// hogy a teszt ne a konkrét tervId/planDir string-literálra épüljön.
const nagyEvaEntries = seedPlans.filter((e) => e.plan.paciens.nev === 'Nagy Éva');
const nagyEvaChains = new Map<string, typeof nagyEvaEntries>();
for (const entry of nagyEvaEntries) {
  const list = nagyEvaChains.get(entry.planDir) ?? [];
  list.push(entry);
  nagyEvaChains.set(entry.planDir, list);
}
const nagyEvaMultiVersionChain = [...nagyEvaChains.values()].find((c) => c.length > 1)!;
const nagyEvaSingleVersionChain = [...nagyEvaChains.values()].find((c) => c.length === 1)!;

/** EGY terv-lánc doboza a `data-plan` horgony alapján (46. tétel). */
function lancDoboz(card: HTMLElement, planDir: string): HTMLElement {
  return card.querySelector(`[data-plan="${planDir}"]`) as HTMLElement;
}

/**
 * A lánc-fejléc toggle gombja -- az EGYETLEN gomb a fejlécen, aminek van
 * `aria-expanded` attribútuma (a ceruza-gombnak nincs).
 */
function lancToggle(doboz: HTMLElement): HTMLElement {
  return within(doboz)
    .getAllByRole('button')
    .find((b) => b.hasAttribute('aria-expanded'))!;
}

/** Kinyit egy csukott láncot -- nem csinál semmit, ha már nyitva van. */
async function nyissLancot(user: ReturnType<typeof userEvent.setup>, doboz: HTMLElement) {
  const toggle = lancToggle(doboz);
  if (toggle.getAttribute('aria-expanded') === 'false') {
    await user.click(toggle);
  }
}

// A "Megnézés" gomb/menüpont a Terv részletei route-ra navigál -- ezt a
// probe-ot olvassuk vissza, a valódi TervReszleteiPage.tsx-et nem kell
// ehhez a teszthez felhúzni.
function TervReszleteiProbe() {
  const { patientDir, planDir, versionDir } = useParams<{
    patientDir: string;
    planDir: string;
    versionDir: string;
  }>();
  return (
    <div
      data-testid="terv-reszletei-oldal"
      data-patientdir={patientDir}
      data-plandir={planDir}
      data-versiondir={versionDir}
    />
  );
}

function renderHistory() {
  return render(
    <TestProviders>
      <Routes>
        <Route path="/" element={<OsszesTervSection />} />
        <Route path="/paciens" element={<DraftProbe />} />
        <Route path="/terv" element={<div>TERV-OLDAL</div>} />
        <Route path="/paciensek/:patientDir" element={<PaciensekProbe />} />
        <Route
          path="/paciensek/:patientDir/tervek/:planDir/:versionDir"
          element={<TervReszleteiProbe />}
        />
      </Routes>
    </TestProviders>,
  );
}

describe('OsszesTervSection', () => {
  beforeEach(async () => {
    localStorage.clear();
    // A rendes seedet egy különálló DemoStorage-példánnyal írjuk be előre --
    // a StorageProvider saját, belső példánya ezt már meglévőnek látja
    // (init() csak akkor futtat resetDemoData()-t, ha az árlista hiányzik),
    // tehát a lenti kézi sérülés a render UTÁN is megmarad.
    const seeder = new DemoStorage();
    await seeder.init();
    // useListStateMemory.ts fejléce: egy MemoryRouter kezdeti navigációja is
    // POP-nak számít, tesztfájlon belüli it()-ek enélkül tévesen örökölnék
    // egymás kereső-/nyitottsági állapotát (46. tétel).
    resetListStateMemoryForTests();
  });

  it('a keresőmezőnek van elérhető neve, nem csak placeholder-e', async () => {
    renderHistory();
    expect(await screen.findByRole('textbox', { name: 'Keresés páciensnévre' })).toBeInTheDocument();
  });

  it('lists every patient even when one plan is corrupted -- one bad file cannot take down the rest (P1-2)', async () => {
    const kovacs = seedPlans[0]; // Kovács János, egyetlen lánc, egyetlen verzió
    expect(kovacs.plan.paciens.nev).toBe('Kovács János');
    const corruptKey = `dp:paciensek/${kovacs.patientDir}/${kovacs.planDir}/${kovacs.versionDir}/terv.json`;
    expect(localStorage.getItem(corruptKey)).not.toBeNull();
    // Korábban ez a `Promise.all` (all-or-nothing) miatt az EGÉSZ listát
    // megbénította volna -- a doki örökre "Betöltés…"-t látott volna.
    localStorage.setItem(corruptKey, 'not valid json {{{');

    renderHistory();

    // A többi páciens rendben megjelenik...
    expect(await screen.findByText('Nagy Éva')).toBeInTheDocument();
    expect(await screen.findByText('Tóth Zoltán')).toBeInTheDocument();
    // ...a sérült páciens sora is látszik (mappanév-alapú fallback névvel),
    // csak jelölve -- nem tűnik el, és nem blokkolja a többit.
    expect(await screen.findByText(/⚠ néhány verziója nem olvasható/)).toBeInTheDocument();
  });

  // backlog-11: a doki nyitás nélkül lássa, mennyi volt egy korábbi ajánlat.
  it('minden verziósor a saját osszesitok.fizetendo értékét mutatja', async () => {
    // Ugyanazon terv-lánc két verziója eltérő végösszeggel -- ez igazolja,
    // hogy soronként a SAJÁT verzió összege jelenik meg, nem a legfrissebbé
    // mindkettőn.
    const [v1, v2] = nagyEvaMultiVersionChain;
    expect(v1.plan.osszesitok.fizetendo).not.toBe(v2.plan.osszesitok.fizetendo);

    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A "Tömések" lánc NEM a legfrissebb véglegesített dátumú (46. tétel)
    // -- alapból csukva nyílik, explicit ki kell nyitni.
    const doboz = lancDoboz(card, v1.planDir);
    await nyissLancot(user, doboz);

    expect(await within(doboz).findByText(penz(v1.plan.osszesitok.fizetendo))).toBeInTheDocument();
    expect(within(doboz).getByText(penz(v2.plan.osszesitok.fizetendo))).toBeInTheDocument();
  });

  it('sérült verziónál "—" áll az összeg helyén, a többi sor érintetlen', async () => {
    const kovacs = seedPlans[0]; // Kovács János, egyetlen lánc, egyetlen verzió
    localStorage.setItem(
      `dp:paciensek/${kovacs.patientDir}/${kovacs.planDir}/${kovacs.versionDir}/terv.json`,
      'not valid json {{{',
    );

    const user = userEvent.setup();
    renderHistory();

    const marker = await screen.findByText(/⚠ néhány verziója nem olvasható/);
    const card = marker.closest('[data-patient]') as HTMLElement;
    expect(within(card).getByText('—')).toBeInTheDocument();

    // A többi páciens összege változatlanul látszik -- egy sérült fájl nem
    // viszi magával a lista többi sorát (ugyanaz a P1-2 elv).
    await screen.findByText('Nagy Éva');
    const nagyEvaCard = patientCard('Nagy Éva');
    const [, v2] = nagyEvaMultiVersionChain;
    const doboz = lancDoboz(nagyEvaCard, v2.planDir);
    await nyissLancot(user, doboz);
    expect(within(doboz).getByText(penz(v2.plan.osszesitok.fizetendo))).toBeInTheDocument();
    expect(within(doboz).queryByText('—')).not.toBeInTheDocument();
  });

  it('opening a corrupted version surfaces a visible inline error instead of doing nothing (P1-2)', async () => {
    const kovacs = seedPlans[0];
    const corruptKey = `dp:paciensek/${kovacs.patientDir}/${kovacs.planDir}/${kovacs.versionDir}/terv.json`;
    localStorage.setItem(corruptKey, 'not valid json {{{');

    const user = userEvent.setup();
    renderHistory();

    const marker = await screen.findByText(/⚠ néhány verziója nem olvasható/);
    const card = marker.closest('[data-patient]') as HTMLElement;

    // Korábban itt `alert()` jelent meg -- most a sérintett verzió-sora
    // mellett, a szövegben (nem toast, ha a
    // hiba egy mezőhöz tartozik). 50. tétel óta a legfrissebb soron
    // látható gomb, nem "⋯" menüpont.
    await user.click(within(card).getByRole('button', { name: 'Új verzió' }));

    expect(await within(card).findByText(/A terv megnyitása nem sikerült/)).toBeInTheDocument();
  });

  // Ugyanaz a felülírás-kockázat,
  // mint a Home "+ Új kezelési terv" gombjánál -- az "Új verzió" szó nélkül
  // felülírná a folyamatban lévő, mentetlen piszkozatot.
  it('"Új verzió" megerősítést kér mentetlen piszkozatnál, és csak megerősítésre nyit meg', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A legfrissebb lánc ("Fogkőeltávolítás") alapból nyitva -- nincs mit
    // kinyitni ehhez a teszthez. 50. tétel óta a legfrissebb soron
    // látható gomb, nem "⋯" menüpont.

    await user.click(within(card).getByRole('button', { name: 'Új verzió' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    // Mégse -- nem navigál, nem hívja loadPlanIntoDraft-ot.
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Összes terv')).toBeInTheDocument();

    // Megerősítés -- ténylegesen megnyitja (loadPlanIntoDraft -> navigate).
    await user.click(within(card).getByRole('button', { name: 'Új verzió' }));
    await user.click(
      await screen.findByRole('button', { name: 'Új verzió, piszkozat elvetésével' }),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  // backlog-17: a két belépési pont eltérő szinten él -- páciensenként EGY
  // "Új terv" gomb a névfejlécnél, a verzió-szintű műveletek pedig
  // soronként a saját "⋯" menüjükben.
  it('"Új terv" páciensszinten egyszer, verzió-soronként egy-egy "⋯" menü jelenik meg', async () => {
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');

    expect(within(card).getByRole('button', { name: '+ Új terv' })).toBeInTheDocument();
    // Nagy Éva 3 verzióval szerepel a seedben, 2 önálló láncban -- a
    // "Fogkőeltávolítás" lánc alapból nyitva, a "Tömések" láncot explicit
    // ki kell nyitni (46. tétel), hogy mindhárom verziósor látszódjon.
    const [v1] = nagyEvaMultiVersionChain;
    await nyissLancot(user, lancDoboz(card, v1.planDir));

    // Egy-egy "⋯" menü verziónként. Az accessible name a terv-címkével ÉS a
    // verziószámmal képzett, mert két különböző lánc is indulhat v1-gyel.
    const triggers = within(card).getAllByRole('button', { name: /további műveletek$/ });
    expect(triggers).toHaveLength(3);
  });

  // A doki explicit kérése volt ez a sorrend (Letöltés, Másolás új tervbe)
  // -- ne csússzon el némán egy későbbi szerkesztésnél. 50. tétel óta
  // a Megnézés/Új verzió a legfrissebb soron látható gomb, nem menüpont --
  // ez a teszt csak a `⋯`-ben MARADT elemekre vonatkozik.
  it('a "⋯" menü elemei rögzített sorrendben állnak, a legfrissebb sor két látható gombot kap', async () => {
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A legfrissebb lánc ("Fogkőeltávolítás") alapból nyitva.
    expect(within(card).getByRole('button', { name: 'Új verzió' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Megnézés' })).toBeInTheDocument();

    const trigger = within(card).getAllByRole('button', { name: /további műveletek$/ })[0];
    await user.click(trigger);

    const items = await screen.findAllByRole('menuitem');
    expect(items.map((el) => el.textContent)).toEqual(['Letöltés', 'Másolás új tervbe']);
  });

  // 48. tétel: "Új verzió" kizárólag a lánc legfrissebb verziósorán
  // engedett -- egy historical sorról indítva a doki tévesen azt hihetné,
  // hogy a régi verziót folytatja, valójában egy új "fejet" hozna létre a
  // láncon.
  it('"Új verzió" a lánc historical (nem legfrissebb) verziósorán nem jelenik meg, se gombként, se menüpontként', async () => {
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const [v1] = nagyEvaMultiVersionChain;
    const doboz = lancDoboz(card, v1.planDir);
    await nyissLancot(user, doboz);

    // A láncban EGYETLEN "Új verzió"/"Megnézés" látható gomb van -- a
    // legfrissebb (v2) soré; a historical (v1) soron nincs látható
    // gomb egyáltalán.
    expect(within(doboz).getAllByRole('button', { name: 'Új verzió' })).toHaveLength(1);
    expect(within(doboz).getAllByRole('button', { name: 'Megnézés' })).toHaveLength(1);

    // A verziók fordítva listázódnak (legfrissebb elöl) -- a MÁSODIK "⋯"
    // trigger a historical (v1) sorhoz tartozik.
    const triggers = within(doboz).getAllByRole('button', { name: /további műveletek$/ });
    expect(triggers).toHaveLength(2);
    await user.click(triggers[1]);

    const items = await screen.findAllByRole('menuitem');
    expect(items.map((el) => el.textContent)).toEqual([
      'Megnézés',
      'Letöltés',
      'Másolás új tervbe',
      'Ugrás a legfrissebb verzióra',
    ]);
  });

  // Azonos oldalon belüli scroll+fókusz, nem route-navigáció -- a
  // jsdom stub (test-setup.ts) a scrollIntoView-t no-op-ra cseréli, ezért a
  // hívást spy-jal igazoljuk, a célt a fókusszal.
  it('"Ugrás a legfrissebb verzióra" a lánc dobozára görget és a lánc-fejléc toggle gombjára fókuszál', async () => {
    const [v1] = nagyEvaMultiVersionChain;
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const doboz = lancDoboz(card, v1.planDir);
    await nyissLancot(user, doboz);
    const triggers = within(doboz).getAllByRole('button', { name: /további műveletek$/ });
    await user.click(triggers[1]);
    await user.click(await screen.findByRole('menuitem', { name: 'Ugrás a legfrissebb verzióra' }));

    expect(scrollSpy).toHaveBeenCalled();
    // A fókusz requestAnimationFrame-ben érkezik (lásd ugrasLegfrissebbre) --
    // a menü FocusScope-ja alatt egy szinkron .focus() a trap miatt nem
    // állna meg a célon.
    await waitFor(() => expect(lancToggle(doboz)).toHaveFocus());
  });

  it('"Másolás új tervbe" a kattintott verzió soraival és páciensadatával indít új piszkozatot a Terv adatai lapon', async () => {
    const [, v2] = nagyEvaMultiVersionChain;
    const forrasSorSzam = v2.plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
    expect(forrasSorSzam).toBe(3); // v1 két sora + a v2-ben hozzáadott korona sor

    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A "Tömések" lánc NEM a legfrissebb véglegesített dátumú (46. tétel)
    // -- explicit ki kell nyitni. A verziói fordítva listázódnak
    // (legfrissebb elöl) -- az első "⋯" menü a v2 sorához tartozik.
    const doboz = lancDoboz(card, v2.planDir);
    await nyissLancot(user, doboz);
    await user.click(await verzioMenupont(user, doboz, 'Másolás új tervbe'));

    expect(await screen.findByTestId('draft-oldal')).toHaveTextContent('PACIENS-OLDAL');
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Nagy Éva');
    expect(screen.getByTestId('draft-tervid')).toHaveTextContent('„”'); // üres tervId -- új tervlánc
    expect(screen.getByTestId('draft-sorcount')).toHaveTextContent(String(forrasSorSzam));
    // A dátumbélyeg frissül (betöltéskori dátumbélyegzés mintája, planMasolatKent) -- nem a forrás
    // 2026-07-22-es keltezése marad.
    expect(screen.getByTestId('draft-keltezes')).not.toHaveTextContent(v2.plan.keltezes);
  });

  // 50. tétel: a lánchoz azóta újabb verzió készült -- a doki
  // figyelmeztetést kap, de a pontos (exact) másolás a megerősítés után is
  // lefut. NINCS mentetlen piszkozat itt -- ez önmagában, a piszkozat-őrtől
  // FÜGGETLENÜL nyitja a dialógust.
  it('"Másolás új tervbe" egy historical soron figyelmeztet, hogy a láncnak van frissebb verziója', async () => {
    const [v1] = nagyEvaMultiVersionChain;
    const forrasSorSzam = v1.plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);

    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const doboz = lancDoboz(card, v1.planDir);
    await nyissLancot(user, doboz);
    // A verziók fordítva listázódnak (legfrissebb elöl) -- a MÁSODIK "⋯"
    // trigger a historical (v1) sorhoz tartozik.
    const triggers = within(doboz).getAllByRole('button', { name: /további műveletek$/ });
    await user.click(triggers[1]);
    await user.click(await screen.findByRole('menuitem', { name: 'Másolás új tervbe' }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Korábbi verzió másolása')).toBeInTheDocument();
    expect(screen.getByText(/azóta újabb verzió készült/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Másolás a korábbi verzióval' }));

    expect(await screen.findByTestId('draft-oldal')).toHaveTextContent('PACIENS-OLDAL');
    expect(screen.getByTestId('draft-sorcount')).toHaveTextContent(String(forrasSorSzam));
  });

  // A "Másolás új tervbe" a paciens blokkot az ÉLŐ törzsadatból veszi,
  // nem a forrás verzió pillanatképéből -- a doki a másolás pillanatában a
  // páciens JELENLEGI adatát akarja az új ajánlatba, nem egy régebbi
  // telefonszámot.
  it('"Másolás új tervbe" az ÉLŐ törzsadat telefonszámát viszi át, nem a forrás verzió pillanatképéét', async () => {
    const [, v2] = nagyEvaMultiVersionChain;
    expect(v2.plan.paciens.telefon).not.toBe('+36 70 111 2222');

    const seeder = new DemoStorage();
    await seeder.init();
    const meglevoAdatok = await seeder.loadPatientData(v2.patientDir);
    if (!meglevoAdatok) throw new Error('Nagy Éva seed-törzsadata hiányzik a teszt előfeltételéből.');
    await seeder.savePatientData(v2.patientDir, { ...meglevoAdatok, telefon: '+36 70 111 2222' });

    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const doboz = lancDoboz(card, v2.planDir);
    await nyissLancot(user, doboz);
    await user.click(await verzioMenupont(user, doboz, 'Másolás új tervbe'));

    expect(await screen.findByTestId('draft-oldal')).toHaveTextContent('PACIENS-OLDAL');
    expect(screen.getByTestId('draft-telefon')).toHaveTextContent('+36 70 111 2222');
  });

  // A paciens-adatok.json valódi system of record (lásd app/src/storage/CLAUDE.md) -- egy sérült fájl
  // hibaként dobódik, a másolás nem eshet vissza némán a forrás régi
  // pillanatképére.
  it('"Másolás új tervbe" hibát jelez, ha a törzsadat sérült, és nem navigál el', async () => {
    const [, v2] = nagyEvaMultiVersionChain;
    localStorage.setItem(`dp:paciensek/${v2.patientDir}/paciens-adatok.json`, 'not valid json {{{');

    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const doboz = lancDoboz(card, v2.planDir);
    await nyissLancot(user, doboz);
    await user.click(await verzioMenupont(user, doboz, 'Másolás új tervbe'));

    expect(await within(card).findByText(/A másolás nem sikerült/)).toBeInTheDocument();
    expect(screen.queryByTestId('draft-oldal')).not.toBeInTheDocument();
  });

  it('"Új terv" a páciens LEGUTÓBB MÓDOSÍTOTT láncának legfrissebb verziójából viszi át a páciensadatot, sorok nélkül', async () => {
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const ujTervBtn = within(card).getByRole('button', { name: '+ Új terv' });

    await user.click(ujTervBtn);

    expect(await screen.findByTestId('draft-oldal')).toHaveTextContent('PACIENS-OLDAL');
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Nagy Éva');
    expect(screen.getByTestId('draft-tervid')).toHaveTextContent('„”');
    expect(screen.getByTestId('draft-sorcount')).toHaveTextContent('0');
  });

  // Ugyanaz a felülírás-kockázat, mint az "Új verzió"-nál -- a másolás sem
  // törölheti szó nélkül a mentetlen piszkozatot.
  it('a "Másolás új tervbe" is megerősítést kér mentetlen piszkozatnál, Mégse-re nem történik semmi', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A legfrissebb lánc ("Fogkőeltávolítás") alapból nyitva.

    await user.click(await verzioMenupont(user, card, 'Másolás új tervbe'));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('draft-oldal')).not.toBeInTheDocument();

    await user.click(await verzioMenupont(user, card, 'Másolás új tervbe'));
    // A menü záráskor nem halászhatja el a fókuszt a most nyíló dialógus elől
    // (DropdownMenu.Content onCloseAutoFocus) -- ha mégis, ez a kattintás nem
    // ér célba, és a piszkozat-őr megkerülhetővé válik.
    await user.click(await screen.findByRole('button', { name: 'Másolás, piszkozat elvetésével' }));
    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
  });

  // Piszkozat-felülírás ÉS historical-másolás egyszerre -- a cím a
  // súlyosabb (piszkozat-vesztés) következményt nevezi meg, de a leírás
  // MINDKÉT figyelmeztetést tartalmazza, és a piros gomb marad.
  it('historical verzió másolása mentetlen piszkozat mellett mindkét figyelmeztetést mutatja', async () => {
    seedPersistedDraft();
    const [v1] = nagyEvaMultiVersionChain;
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const doboz = lancDoboz(card, v1.planDir);
    await nyissLancot(user, doboz);
    const triggers = within(doboz).getAllByRole('button', { name: /további műveletek$/ });
    await user.click(triggers[1]);
    await user.click(await screen.findByRole('menuitem', { name: 'Másolás új tervbe' }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Piszkozat felülírása')).toBeInTheDocument();
    expect(screen.getByText(/azóta újabb verzió készült/)).toBeInTheDocument();
    expect(screen.getByText(/Van mentetlen piszkozatod/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Másolás, piszkozat elvetésével' }));
    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
  });

  it('a "⋯" menü Letöltés pontja a verzió mentett PDF-jét adja vissza', async () => {
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A legfrissebb lánc ("Fogkőeltávolítás") alapból nyitva.

    // A seed-verziókhoz nincs mentett PDF (csak terv.json) -- a lényeg, hogy a
    // menüpont a downloadVersion ágra fut, és a hiánya a SOR alatt, inline
    // jelenik meg, nem alert()-tel (P1-2). 103. tétel: seed-eredetű verzión ez
    // a demó-magyarázó (info, nem piros) szöveg.
    await user.click(await verzioMenupont(user, card, 'Letöltés'));
    expect(
      await within(card).findByText(/nincs mentett PDF, mert a beépített demó-adatkészletből származik/),
    ).toBeInTheDocument();
  });

  // backlog-20: a sanitizálás/előtag lényegi lefedettsége a
  // storage/paths.test.ts `buildDownloadFileName`-jét fedi -- itt csak azt,
  // hogy a "Letöltés" menüpont ténylegesen az ő kimenetét adja az <a> elem
  // download attribútumaként.
  it('a "⋯" menü Letöltés pontja a verzió páciensnevével és a verziómappa-suffixszel nevezi el a fájlt', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const ref = await seeder.savePlan(makeVeglegesPlan(), new Uint8Array([1, 2, 3]));

    URL.createObjectURL = vi.fn(() => 'blob:mock-download-url') as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    let capturedDownload: string | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      capturedDownload = this.download;
    });

    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Letöltés Teszt');
    const card = patientCard('Letöltés Teszt');
    await user.click(await verzioMenupont(user, card, 'Letöltés'));

    await waitFor(() => expect(capturedDownload).not.toBeNull());
    expect(capturedDownload).toBe(
      buildDownloadFileName('Letöltés Teszt', {
        tervId: 'lt0001',
        isDraft: false,
        suffix: ref.versionDir,
      }),
    );
  });

  // "Megnézés" a Terv részletei route-ra navigál -- a nyers PDF új lapon
  // való megnyitása (window.open + popup-blokkoló őr) a Terv részletei lap
  // saját "Megnyitás külön" akciójába költözött.
  describe('"Megnézés" -- a Terv részletei route-ra navigál', () => {
    it('a legfrissebb sor látható "Megnézés" gombja a saját verziójának route-jára navigál', async () => {
      const seeder = new DemoStorage();
      await seeder.init();
      const openMock = vi.fn(() => null);
      window.open = openMock as unknown as typeof window.open;
      const plan = makeVeglegesPlan();
      const { versionDir } = await seeder.savePlan(plan, new Uint8Array([1, 2, 3]));

      const user = userEvent.setup();
      renderHistory();

      await screen.findByText('Letöltés Teszt');
      const card = patientCard('Letöltés Teszt');
      await user.click(within(card).getByRole('button', { name: 'Megnézés' }));

      expect(openMock).not.toHaveBeenCalled();
      const probe = await screen.findByTestId('terv-reszletei-oldal');
      expect(probe.dataset.versiondir).toBe(versionDir);
    });

    it('historical soron a "⋯" "Megnézés" menüpontja a SAJÁT (nem a legfrissebb) verziójának route-jára navigál', async () => {
      const user = userEvent.setup();
      renderHistory();

      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      const multiChainPlanDir = nagyEvaMultiVersionChain[0].planDir;
      const doboz = lancDoboz(card, multiChainPlanDir);
      await nyissLancot(user, doboz);

      // A doboz-ra szűkítve keresünk -- Nagy Évának KÉT lánca van, a másik
      // (egyverziós) lánc is nyitva lehet alapból, saját "⋯" triggerrel; a
      // `verzioMenupont()` (testQueries.ts) a TELJES kártyán keres, itt a
      // pontos lánc-hovatartozás a lényeg.
      const triggers = within(doboz).getAllByRole('button', { name: /további műveletek$/ });
      // triggers[0] a lánc legfrissebb (v2) sora, triggers[1] a historical (v1).
      await user.click(triggers[1]);
      const historicalVersion = nagyEvaMultiVersionChain[0].versionDir;
      await user.click(await screen.findByRole('menuitem', { name: 'Megnézés' }));

      const probe = await screen.findByTestId('terv-reszletei-oldal');
      expect(probe.dataset.plandir).toBe(multiChainPlanDir);
      expect(probe.dataset.versiondir).toBe(historicalVersion);
    });
  });

  // Az új harmadik szint -- a Korábbi tervek fő új viselkedése.
  describe('páciens → terv → verzió fa', () => {
    it('1 terv-lánccal rendelkező páciens alapból kibontva jelenik meg, nincs "N terv" kapcsoló', async () => {
      renderHistory();
      await screen.findByText('Kovács János');
      const card = patientCard('Kovács János');

      expect(within(card).queryByRole('button', { name: /^\d+ terv$/ })).not.toBeInTheDocument();
      expect(within(card).getByText(/^v1 ·/)).toBeInTheDocument();
    });

    // 46. tétel: a page-szintű "N terv" kapcsoló megszűnt -- a lánc-szintű
    // toggle vette át a szerepét. Alapból a legfrissebb
    // VÉGLEGESÍTETT dátumú lánc van nyitva, a többi csukva; a
    // fejlécek (címke + legfrissebb verzió + csukott állapotban az összeg)
    // NYITOTTSÁGTÓL FÜGGETLENÜL mindig látszanak.
    it('2+ terv-lánccal rendelkező páciensnél alapból csak a legfrissebb (véglegesített dátumú) lánc nyitva', async () => {
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');

      expect(within(card).queryByRole('button', { name: /^\d+ terv$/ })).not.toBeInTheDocument();

      const [v1] = nagyEvaMultiVersionChain;
      const tomesekDoboz = lancDoboz(card, v1.planDir);
      const fogkoDoboz = lancDoboz(card, nagyEvaSingleVersionChain[0].planDir);

      // A "Fogkőeltávolítás" lánc (2026-08-01) a legfrissebb véglegesített
      // dátumú -- ez nyitva; a "Tömések" lánc (legfrissebb verziója
      // 2026-07-22) csukva.
      expect(lancToggle(fogkoDoboz)).toHaveAttribute('aria-expanded', 'true');
      expect(lancToggle(tomesekDoboz)).toHaveAttribute('aria-expanded', 'false');

      // Csukott állapotban a verziósorok NEM láthatók...
      expect(
        within(tomesekDoboz).queryByRole('button', { name: /további műveletek$/ }),
      ).not.toBeInTheDocument();
      // ...de a fejléc (címke + legfrissebb verzió + összeg) igen.
      expect(within(tomesekDoboz).getByText(/^Tömések ·/)).toBeInTheDocument();
    });

    it('a csukott lánc fejléce kattintás nélkül is látszik, kattintásra a verziósorai is megjelennek', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');

      // Élő auto-javaslat -- a "Tömések" lánc domináns kategóriája "Tömések",
      // a "Fogkőeltávolítás" láncé "Fogkőeltávolítás" (mindkettő egyetlen
      // kategóriára hivatkozik, lásd seed/plans.ts). Mindkét fejléc
      // kattintás NÉLKÜL is látszik (46. tétel) -- a nyitottság csak a
      // verziósorokat rejti.
      expect(within(card).getByText(/^Tömések ·/)).toBeInTheDocument();
      expect(within(card).getByText(/^Fogkőeltávolítás ·/)).toBeInTheDocument();

      const [v1] = nagyEvaMultiVersionChain;
      const tomesekDoboz = lancDoboz(card, v1.planDir);
      expect(
        within(tomesekDoboz).queryByRole('button', { name: /további műveletek$/ }),
      ).not.toBeInTheDocument();

      await nyissLancot(user, tomesekDoboz);
      expect(within(tomesekDoboz).getAllByRole('button', { name: /további műveletek$/ })).toHaveLength(2);
    });

    it('a terv-címke inline szerkeszthető, üresen mentve visszaáll az automatikus javaslatra', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      // A ceruza-gomb a lánc nyitottságától függetlenül elérhető.
      const [v1] = nagyEvaMultiVersionChain;
      const doboz = lancDoboz(card, v1.planDir);

      await user.click(within(doboz).getByRole('button', { name: 'Terv címének szerkesztése' }));
      const input = within(doboz).getByRole('textbox', { name: 'Terv címe' });
      await user.clear(input);
      await user.type(input, 'Fogpótlás — Éva');
      await user.click(within(doboz).getByRole('button', { name: 'Címke mentése' }));

      expect(await within(doboz).findByText(/^Fogpótlás — Éva ·/)).toBeInTheDocument();

      // Üresen mentve vissza az automatikus javaslatra ("Tömések").
      await user.click(within(doboz).getByRole('button', { name: 'Terv címének szerkesztése' }));
      const input2 = within(doboz).getByRole('textbox', { name: 'Terv címe' });
      await user.clear(input2);
      await user.click(within(doboz).getByRole('button', { name: 'Címke mentése' }));

      expect(await within(doboz).findByText(/^Tömések ·/)).toBeInTheDocument();
    });

    it('Escape a szerkesztés közben elveti a módosítást', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      const [v1] = nagyEvaMultiVersionChain;
      const doboz = lancDoboz(card, v1.planDir);

      await user.click(within(doboz).getByRole('button', { name: 'Terv címének szerkesztése' }));
      const input = within(doboz).getByRole('textbox', { name: 'Terv címe' });
      await user.type(input, 'Ideiglenes szöveg, ami nem mentődik');
      await user.keyboard('{Escape}');

      expect(within(doboz).queryByRole('textbox', { name: 'Terv címe' })).not.toBeInTheDocument();
      expect(within(doboz).getByText(/^Tömések ·/)).toBeInTheDocument();
    });
  });

  // backlog-28: a Páciensek képernyőn terv nélkül felvihető páciens
  // (csak paciens-adatok.json-nal) itt NEM jelenik meg -- ez a képernyő a
  // kezelési előzményekről szól.
  describe('paciens-adatok.json hatása', () => {
    it('egy terv nélküli, csak törzsadattal rendelkező páciens nem jelenik meg a listán', async () => {
      const seeder = new DemoStorage();
      await seeder.init();
      await seeder.createPatient('Terv Nélküli Panni');

      renderHistory();

      await screen.findByText('Nagy Éva'); // megvárjuk, hogy a lista betöltsön
      expect(screen.queryByText('Terv Nélküli Panni')).not.toBeInTheDocument();
    });

    it('a "Páciens adatai" kereszt-link a páciens-részletoldalra navigál, az adatai tabbal előválasztva', async () => {
      const user = userEvent.setup();
      renderHistory();

      await screen.findByText('Kovács János');
      const card = patientCard('Kovács János');
      await user.click(within(card).getByRole('button', { name: 'Páciens adatai' }));

      const probe = await screen.findByTestId('paciensek-oldal');
      expect(probe.dataset.patientdir).toBeTruthy();
      expect(probe.dataset.tab).toBe('adatai');
    });
  });

  // 46. tétel: lánc-fejléc tartalom/rendezés/badge-ek, aktív-draft blokk,
  // POP-memória.
  describe('lánc-fejléc, badge-ek és aktív draft blokk (46. tétel)', () => {
    it('a láncok a legfrissebb VÉGLEGESÍTETT dátum szerint csökkenően rendeződnek, NEM a lánc indulási dátuma szerint', async () => {
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');

      // A "Tömések" lánc 2026-06-10-én INDULT (korábban, mint a
      // "Fogkőeltávolítás" 2026-08-01-es egyetlen verziója) -- mégis a
      // "Fogkőeltávolítás" áll elöl a DOM-ban, mert a legfrissebb
      // VÉGLEGESÍTETT verziója (2026-08-01) frissebb, mint a "Tömések"
      // láncé (2026-07-22).
      const dobozok = card.querySelectorAll('[data-plan]');
      expect(dobozok[0]).toHaveAttribute('data-plan', nagyEvaSingleVersionChain[0].planDir);
      expect(dobozok[1]).toHaveAttribute('data-plan', nagyEvaMultiVersionChain[0].planDir);
    });

    it('a csukott lánc fejléce a legfrissebb verzió dátumát/verziószámát/összegét mutatja, nem a lánc indulási dátumát/összegét (bug-regresszió)', async () => {
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      const [v1, v2] = nagyEvaMultiVersionChain;
      const doboz = lancDoboz(card, v1.planDir);
      const headerRow = doboz.firstElementChild as HTMLElement;

      expect(within(headerRow).getByText(/v2 · 2026-07-22/)).toBeInTheDocument();
      expect(within(headerRow).queryByText(/v1 · 2026-06-10/)).not.toBeInTheDocument();
      expect(within(headerRow).getByText(penz(v2.plan.osszesitok.fizetendo))).toBeInTheDocument();
      expect(within(headerRow).queryByText(penz(v1.plan.osszesitok.fizetendo))).not.toBeInTheDocument();
    });

    it('nyitáskor a fejléc-összeg eltűnik (a legfrissebb verziósor ugyanazt az értéket mutatja alatta)', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      const [, v2] = nagyEvaMultiVersionChain;
      const doboz = lancDoboz(card, v2.planDir);
      const headerRow = doboz.firstElementChild as HTMLElement;

      expect(within(headerRow).getByText(penz(v2.plan.osszesitok.fizetendo))).toBeInTheDocument();
      await nyissLancot(user, doboz);
      expect(within(headerRow).queryByText(penz(v2.plan.osszesitok.fizetendo))).not.toBeInTheDocument();
      // ...de a verziósorban ugyanez az összeg megvan.
      expect(within(doboz).getByText(penz(v2.plan.osszesitok.fizetendo))).toBeInTheDocument();
    });

    it('nyitott lánc visszazárható a fejléc-toggle-re kattintva', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      const doboz = lancDoboz(card, nagyEvaSingleVersionChain[0].planDir);

      expect(lancToggle(doboz)).toHaveAttribute('aria-expanded', 'true');
      await user.click(lancToggle(doboz));
      expect(lancToggle(doboz)).toHaveAttribute('aria-expanded', 'false');
      expect(within(doboz).queryByRole('button', { name: /további műveletek$/ })).not.toBeInTheDocument();
    });

    it('a lánc-toggle billentyűzettel (Space) is elérhető, natív gomb, nincs fa-szemantika az oldalon', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      const doboz = lancDoboz(card, nagyEvaSingleVersionChain[0].planDir);
      const toggle = lancToggle(doboz);

      toggle.focus();
      await user.keyboard(' ');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
      expect(screen.queryByRole('treeitem')).not.toBeInTheDocument();
    });

    it('"Legutóbbi" badge csak a 2+ verziós lánc legfrissebb során jelenik meg, egyverziós láncon sosem', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      const [v1, v2] = nagyEvaMultiVersionChain;
      const doboz = lancDoboz(card, v1.planDir);
      await nyissLancot(user, doboz);

      const v2Sor = within(doboz).getByText(new RegExp(`^v${v2.plan.verzio} · ${v2.plan.keltezes}`))
        .closest('.rt-Flex') as HTMLElement;
      const v1Sor = within(doboz).getByText(new RegExp(`^v${v1.plan.verzio} · ${v1.plan.keltezes}`))
        .closest('.rt-Flex') as HTMLElement;
      expect(within(v2Sor).getByText('Legutóbbi')).toBeInTheDocument();
      expect(within(v1Sor).queryByText('Legutóbbi')).not.toBeInTheDocument();

      // Az egyverziós "Fogkőeltávolítás" láncon (alapból nyitva) nincs
      // "Legutóbbi" jelvény -- funkciótlan dísz lenne.
      const fogkoDoboz = lancDoboz(card, nagyEvaSingleVersionChain[0].planDir);
      expect(within(fogkoDoboz).queryByText('Legutóbbi')).not.toBeInTheDocument();
    });

    // A "Csak ajánlat" jelvény a MÁR betöltött `plansByVersion`-ből
    // olvas, a "Legutóbbi" jelvény mintáján.
    it('"Csak ajánlat" jelvény csak azon a verziósoron jelenik meg, aminek plan.csakAjanlat === true', async () => {
      const user = userEvent.setup();
      const [v1, v2] = nagyEvaMultiVersionChain;
      const key = `dp:paciensek/${v2.patientDir}/${v2.planDir}/${v2.versionDir}/terv.json`;
      const saved = JSON.parse(localStorage.getItem(key)!);
      saved.csakAjanlat = true;
      localStorage.setItem(key, JSON.stringify(saved));

      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      const doboz = lancDoboz(card, v1.planDir);
      await nyissLancot(user, doboz);

      const v2Sor = within(doboz).getByText(new RegExp(`^v${v2.plan.verzio} · ${v2.plan.keltezes}`))
        .closest('.rt-Flex') as HTMLElement;
      const v1Sor = within(doboz).getByText(new RegExp(`^v${v1.plan.verzio} · ${v1.plan.keltezes}`))
        .closest('.rt-Flex') as HTMLElement;
      expect(within(v2Sor).getByText('Csak ajánlat')).toBeInTheDocument();
      expect(within(v1Sor).queryByText('Csak ajánlat')).not.toBeInTheDocument();
    });

    it('aktív draft esetén a hozzá tartozó lánc fejléce "Piszkozat" jelzést kap, a másik lánc nem, és a jelzés nem külön kattintható', async () => {
      const [v1] = nagyEvaMultiVersionChain;
      seedPersistedDraft(
        { tervId: v1.plan.tervId, paciens: { ...v1.plan.paciens, nev: 'Nagy Éva' } },
        { patientDir: nagyEvaEntries[0].patientDir },
      );
      renderHistory();
      // A draft blokk is "Nagy Éva" szöveget mutat -- screen.findByText itt
      // ambiguus lenne, a "Folytatás" gomb megjelenése egyértelmű várakozás.
      await screen.findByRole('button', { name: 'Folytatás' });
      const card = document.querySelector(`[data-patient="${nagyEvaEntries[0].patientDir}"]`) as HTMLElement;
      const tomesekDoboz = lancDoboz(card, v1.planDir);
      const fogkoDoboz = lancDoboz(card, nagyEvaSingleVersionChain[0].planDir);

      expect(within(tomesekDoboz).getByText('Piszkozat')).toBeInTheDocument();
      expect(within(fogkoDoboz).queryByText('Piszkozat')).not.toBeInTheDocument();

      // A fejlécen csak a toggle és a ceruza gomb van -- a jelzés nem hozott
      // létre harmadik, önálló kattintható elemet.
      const headerRow = tomesekDoboz.firstElementChild as HTMLElement;
      expect(within(headerRow).getAllByRole('button')).toHaveLength(2);
    });

    it('a saját draft nélküli páciensnél nincs draft-blokk és nincs lánc-jelzés', async () => {
      seedPersistedDraft(
        { paciens: { ...seedPlans[0].plan.paciens, nev: 'Piszkozat Panni' } },
        { patientDir: 'nem-letezo-mappa' },
      );
      renderHistory();
      await screen.findByText('Kovács János');
      const card = patientCard('Kovács János');

      expect(within(card).queryByText('Piszkozat')).not.toBeInTheDocument();
      expect(within(card).queryByRole('button', { name: 'Folytatás' })).not.toBeInTheDocument();
    });

    it('aktív draft esetén a hozzá tartozó páciens kártyáján a láncok FÖLÖTT jelenik meg a draft-blokk, tartalmazza a kontextust, a workflow-lépést és az utolsó módosítás időbélyegét', async () => {
      seedPersistedDraft(
        {
          tervId: '',
          paciens: { ...seedPlans[0].plan.paciens, nev: 'Nagy Éva' },
          fazisok: [
            {
              sorszam: 1,
              megnevezes: '1. kezelés',
              megjegyzes: '',
              sorok: [
                {
                  tetelId: 't001',
                  nevSnapshot: 'Teszt tétel',
                  savos: false,
                  fogak: '',
                  mennyiseg: 1,
                  listaEgysegar: 10000,
                  tenylegesEgysegar: 10000,
                },
              ],
            },
          ],
        },
        { patientDir: nagyEvaEntries[0].patientDir, lastRoute: '/terv' },
      );
      renderHistory();
      const folytatasBtn = await screen.findByRole('button', { name: 'Folytatás' });
      const card = document.querySelector(`[data-patient="${nagyEvaEntries[0].patientDir}"]`) as HTMLElement;

      expect(within(card).getByText('Új terv')).toBeInTheDocument();
      expect(within(card).getByText('Kezelések')).toBeInTheDocument();
      expect(within(card).getByText(/Utolsó módosítás:/)).toBeInTheDocument();
      expect(within(card).getByText(penz(10000))).toBeInTheDocument();

      // A blokk a láncok FÖLÖTT áll: a DOM-sorrendben a "Folytatás" gomb
      // megelőzi az első `[data-plan]` blokkot.
      const elsoLanc = card.querySelector('[data-plan]') as HTMLElement;
      expect(
        folytatasBtn.compareDocumentPosition(elsoLanc) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('üres (sor nélküli) draftnál nincs összeg, hiányzó lastRoute-nál nincs lépés-sor', async () => {
      seedPersistedDraft(
        { tervId: '', paciens: { ...seedPlans[0].plan.paciens, nev: 'Nagy Éva' } },
        { patientDir: nagyEvaEntries[0].patientDir },
      );
      renderHistory();
      const folytatasBtn = await screen.findByRole('button', { name: 'Folytatás' });
      const draftBlokk = folytatasBtn.closest('.rt-Card') as HTMLElement;
      // nincs pénzösszeg-szerű szöveg (formatMoney mindig "Ft"/"€" végződéssel zár) --
      // a törzsadat-eltérés jelvénye (104. tétel) is számjeggyel kezdődik, ezért a
      // regex a formatMoney-specifikus végződést is megköveteli, nem elég a "^\d".
      expect(within(draftBlokk).queryByText(/^\d[\d\s .,]*\s(Ft|€)/)).not.toBeInTheDocument();
      expect(within(draftBlokk).queryByText('Terv adatai')).not.toBeInTheDocument();
      expect(within(draftBlokk).queryByText('Kezelések')).not.toBeInTheDocument();
      expect(within(draftBlokk).queryByText('Előnézet és véglegesítés')).not.toBeInTheDocument();
    });

    it('a "Folytatás" gomb megerősítés NÉLKÜL navigál (szemben az "Új verzió"-val), és a blokk törzsére kattintva sem duplikálódik a navigáció', async () => {
      const user = userEvent.setup();
      seedPersistedDraft(
        { tervId: '', paciens: { ...seedPlans[0].plan.paciens, nev: 'Nagy Éva' } },
        { patientDir: nagyEvaEntries[0].patientDir, lastRoute: '/terv' },
      );
      renderHistory();
      const folytatasBtn = await screen.findByRole('button', { name: 'Folytatás' });

      await user.click(folytatasBtn);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(await screen.findByText('TERV-OLDAL')).toBeInTheDocument();
    });

    it('a draft-blokk törzsére (nem a gombra) kattintva is navigál', async () => {
      const user = userEvent.setup();
      seedPersistedDraft(
        { tervId: '', paciens: { ...seedPlans[0].plan.paciens, nev: 'Nagy Éva' } },
        { patientDir: nagyEvaEntries[0].patientDir, lastRoute: '/terv' },
      );
      renderHistory();
      await screen.findByRole('button', { name: 'Folytatás' });
      const card = document.querySelector(`[data-patient="${nagyEvaEntries[0].patientDir}"]`) as HTMLElement;

      const kontextusSzoveg = within(card).getByText('Új terv');
      await user.click(kontextusSzoveg);
      expect(await screen.findByText('TERV-OLDAL')).toBeInTheDocument();
    });

    // A lánc-nyitottság ÉS a keresőszöveg is visszaáll böngésző-
    // "vissza" (POP) navigációnál, a MEGLÉVŐ useListStateMemory bővítésével.
    it('böngésző-"vissza" navigációnál a lánc-nyitottság és a keresőszöveg is visszaáll', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      const doboz = lancDoboz(card, nagyEvaMultiVersionChain[0].planDir);

      await user.type(screen.getByRole('textbox', { name: 'Keresés páciensnévre' }), 'Nagy');
      await nyissLancot(user, doboz);
      expect(lancToggle(doboz)).toHaveAttribute('aria-expanded', 'true');

      await user.click(within(card).getByRole('button', { name: 'Páciens adatai' }));
      await screen.findByTestId('paciensek-oldal');
      await user.click(screen.getByRole('button', { name: 'Vissza' }));

      await screen.findByText('Nagy Éva');
      expect(screen.getByRole('textbox', { name: 'Keresés páciensnévre' })).toHaveValue('Nagy');
      const cardAfter = patientCard('Nagy Éva');
      const dobozAfter = lancDoboz(cardAfter, nagyEvaMultiVersionChain[0].planDir);
      expect(lancToggle(dobozAfter)).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
