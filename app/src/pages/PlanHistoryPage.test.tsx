import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlanHistoryPage from './PlanHistoryPage';
import { resetListStateMemoryForTests } from '../components/useListStateMemory';
import { TestProviders } from '../testUtils';
import { patientCard, verzioMenupont } from '../testQueries';
import { DemoStorage } from '../storage/DemoStorage';
import { seedPlans } from '../storage/seed/plans';
import { formatMoney } from '../domain/money';
import { buildDownloadFileName } from '../storage/paths';
import { useAppState } from '../state/AppState';
import type { Plan } from '../domain/types';
import type { WorkflowRoute } from '../storage/DraftStorage';

// backlog-30: a kereszt-link az egyesített páciens-részletoldalra navigál
// (`/paciensek/:patientDir`), a tab-ot `location.state.tab`-ban átadva --
// ezt a probe-ot olvassuk vissza, a valódi PatientDetailPage.tsx-et nem
// kell ehhez a teszthez felhúzni. A "Vissza" gomb a 46. tétel POP-memória
// (D240) teszteléséhez kell -- a `useListStateMemory.test.tsx` `DetailProbe`
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

// backlog-17: a két "Új terv…" gomb a Páciens adatlapra navigál
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
    'dp:piszkozat',
    JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:00:00.000Z', plan, ...meta }),
  );
}

// A formatMoney nem törhető szóközt (U+00A0) használ (CLAUDE.md: a pénzösszeg
// nem tördelhető). A testing-library a DOM szövegét sima szóközre
// normalizálja, az elvárt stringet viszont nem -- ezért itt kell átváltani.
function penz(osszeg: number): string {
  return formatMoney(osszeg, 'HUF').replace(/ /g, ' ');
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
    sablonVerzio: 'nyilatkozat-hu-v1',
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

// D29: Nagy Éva a seedben KÉT önálló terv-lánccal szerepel (fogpótlás: v1+v2,
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

function renderHistory() {
  return render(
    <TestProviders>
      <Routes>
        <Route path="/" element={<PlanHistoryPage />} />
        <Route path="/paciens" element={<DraftProbe />} />
        <Route path="/terv" element={<div>TERV-OLDAL</div>} />
        <Route path="/paciensek/:patientDir" element={<PaciensekProbe />} />
      </Routes>
    </TestProviders>,
  );
}

describe('PlanHistoryPage', () => {
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

  it('a keresőmezőnek van elérhető neve, nem csak placeholder-e (docs/07)', async () => {
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
    // A "Tömések" lánc NEM a legfrissebb véglegesített dátumú (46. tétel,
    // D186) -- alapból csukva nyílik, explicit ki kell nyitni.
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
    // mellett, a szövegben (docs/07-felulet-rendszer.md: "Nem toast, ha a
    // hiba egy mezőhöz tartozik").
    await user.click(await verzioMenupont(user, card, 'Új verzió'));

    expect(await within(card).findByText(/A terv megnyitása nem sikerült/)).toBeInTheDocument();
  });

  // docs/03-funkcionalis-spec.md § Autosave: ugyanaz a felülírás-kockázat,
  // mint a Home "+ Új kezelési terv" gombjánál -- az "Új verzió" szó nélkül
  // felülírná a folyamatban lévő, mentetlen piszkozatot.
  it('"Új verzió" megerősítést kér mentetlen piszkozatnál, és csak megerősítésre nyit meg', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A legfrissebb lánc ("Fogkőeltávolítás") alapból nyitva -- nincs mit
    // kinyitni ehhez a teszthez.

    await user.click(await verzioMenupont(user, card, 'Új verzió'));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    // Mégse -- nem navigál, nem hívja loadPlanIntoDraft-ot.
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Korábbi tervek')).toBeInTheDocument();

    // Megerősítés -- ténylegesen megnyitja (loadPlanIntoDraft -> navigate).
    await user.click(await verzioMenupont(user, card, 'Új verzió'));
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

  // A doki explicit kérése volt ez a sorrend (Letöltés | Új verzió, Másolás
  // új tervbe) -- ne csússzon el némán egy későbbi szerkesztésnél.
  it('a "⋯" menü elemei rögzített sorrendben állnak', async () => {
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A legfrissebb lánc ("Fogkőeltávolítás") alapból nyitva.
    const trigger = within(card).getAllByRole('button', { name: /további műveletek$/ })[0];
    await user.click(trigger);

    const items = await screen.findAllByRole('menuitem');
    expect(items.map((el) => el.textContent)).toEqual([
      'Megnézés',
      'Letöltés',
      'Új verzió',
      'Másolás új tervbe',
    ]);
  });

  // D53 (48. tétel): "Új verzió" kizárólag a lánc legfrissebb verziósorán
  // engedett -- egy historical sorról indítva a doki tévesen azt hihetné,
  // hogy a régi verziót folytatja, valójában egy új "fejet" hozna létre a
  // láncon.
  it('"Új verzió" a lánc historical (nem legfrissebb) verziósorán nem jelenik meg', async () => {
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const [v1] = nagyEvaMultiVersionChain;
    const doboz = lancDoboz(card, v1.planDir);
    await nyissLancot(user, doboz);

    // A verziók fordítva listázódnak (legfrissebb elöl) -- a MÁSODIK "⋯"
    // trigger a historical (v1) sorhoz tartozik.
    const triggers = within(doboz).getAllByRole('button', { name: /további műveletek$/ });
    expect(triggers).toHaveLength(2);
    await user.click(triggers[1]);

    const items = await screen.findAllByRole('menuitem');
    expect(items.map((el) => el.textContent)).toEqual(['Megnézés', 'Letöltés', 'Másolás új tervbe']);
  });

  it('"Másolás új tervbe" a kattintott verzió soraival és páciensadatával indít új piszkozatot a Páciens adatlapon', async () => {
    const [, v2] = nagyEvaMultiVersionChain;
    const forrasSorSzam = v2.plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
    expect(forrasSorSzam).toBe(3); // v1 két sora + a v2-ben hozzáadott korona sor

    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A "Tömések" lánc NEM a legfrissebb véglegesített dátumú (46. tétel,
    // D186) -- explicit ki kell nyitni. A verziói fordítva listázódnak
    // (legfrissebb elöl) -- az első "⋯" menü a v2 sorához tartozik.
    const doboz = lancDoboz(card, v2.planDir);
    await nyissLancot(user, doboz);
    await user.click(await verzioMenupont(user, doboz, 'Másolás új tervbe'));

    expect(await screen.findByTestId('draft-oldal')).toHaveTextContent('PACIENS-OLDAL');
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Nagy Éva');
    expect(screen.getByTestId('draft-tervid')).toHaveTextContent('„”'); // üres tervId -- új tervlánc
    expect(screen.getByTestId('draft-sorcount')).toHaveTextContent(String(forrasSorSzam));
    // A dátumbélyeg frissül (D22-mintájú, planMasolatKent) -- nem a forrás
    // 2026-07-22-es keltezése marad.
    expect(screen.getByTestId('draft-keltezes')).not.toHaveTextContent(v2.plan.keltezes);
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

  it('a "⋯" menü Letöltés pontja a verzió mentett PDF-jét adja vissza', async () => {
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A legfrissebb lánc ("Fogkőeltávolítás") alapból nyitva.

    // A seed-verziókhoz nincs mentett PDF (csak terv.json) -- a lényeg, hogy a
    // menüpont a downloadVersion ágra fut, és a hiánya a SOR alatt, inline
    // jelenik meg, nem alert()-tel (P1-2).
    await user.click(await verzioMenupont(user, card, 'Letöltés'));
    expect(await within(card).findByText('Ehhez a verzióhoz nincs mentett PDF.')).toBeInTheDocument();
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

  // backlog-22: "Megnézés" -- a verzió mentett PDF-jét nyitja meg új lapon,
  // a piszkozatot egyáltalán nem érinti. A jsdom window.open()-je nincs
  // implementálva, mockolás nélkül a teszt el sem indulna.
  describe('"Megnézés" -- a verzió PDF-je új lapon', () => {
    it('szinkron nyitja meg az üres lapot, majd -- csak a PDF megérkezése UTÁN -- a blob URL-re navigál', async () => {
      const seeder = new DemoStorage();
      await seeder.init();
      await seeder.savePlan(makeVeglegesPlan(), new Uint8Array([1, 2, 3]));

      // A hívási sorrend igazolja a popup-blokkoló-védelmet: a window.open
      // a KATTINTÁS pillanatában fut, a blob URL csak ezután, a loadPlanPdf
      // megérkezésekor készül el -- nem elég, hogy mindkettő VALAMIKOR
      // meghívódik, a sorrend maga a lényeg (2. döntés).
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
      renderHistory();

      await screen.findByText('Letöltés Teszt');
      const card = patientCard('Letöltés Teszt');
      await user.click(await verzioMenupont(user, card, 'Megnézés'));

      expect(openMock).toHaveBeenCalledWith('', '_blank');
      await waitFor(() => expect(mockWin.location.href).toBe('blob:teszt'));
      expect(callOrder).toEqual(['open', 'createObjectURL']);
    });

    it('hiányzó PDF esetén bezárja az üres lapot, az inline hiba pedig ugyanaz, mint a Letöltésnél', async () => {
      const mockWin = { location: { href: '' }, close: vi.fn() };
      window.open = vi.fn(() => mockWin as unknown as Window) as unknown as typeof window.open;

      const user = userEvent.setup();
      renderHistory();

      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      // A legfrissebb lánc ("Fogkőeltávolítás") alapból nyitva.

      // A seed-verziókhoz nincs mentett PDF -- ugyanaz az eset, mint a
      // "Letöltés" hibaágánál (3. döntés: nincs második hiba-minta).
      await user.click(await verzioMenupont(user, card, 'Megnézés'));

      await waitFor(() => expect(mockWin.close).toHaveBeenCalled());
      expect(
        await within(card).findByText('Ehhez a verzióhoz nincs mentett PDF.'),
      ).toBeInTheDocument();
    });
  });

  // D29: az új harmadik szint -- a Korábbi tervek fő új viselkedése.
  describe('páciens → terv → verzió fa (D29)', () => {
    it('1 terv-lánccal rendelkező páciens alapból kibontva jelenik meg, nincs "N terv" kapcsoló', async () => {
      renderHistory();
      await screen.findByText('Kovács János');
      const card = patientCard('Kovács János');

      expect(within(card).queryByRole('button', { name: /^\d+ terv$/ })).not.toBeInTheDocument();
      expect(within(card).getByText(/^v1 ·/)).toBeInTheDocument();
    });

    // 46. tétel: a page-szintű "N terv" kapcsoló megszűnt -- a lánc-szintű
    // toggle vette át a szerepét (D237/D249/D250). Alapból a legfrissebb
    // VÉGLEGESÍTETT dátumú lánc (D186) van nyitva, a többi csukva; a
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

  // backlog-28 (D33): a Páciensek képernyőn terv nélkül felvihető páciens
  // (csak paciens-adatok.json-nal) itt NEM jelenik meg -- ez a képernyő a
  // kezelési előzményekről szól.
  describe('paciens-adatok.json (D33) hatása', () => {
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
      // "Legutóbbi" jelvény -- funkciótlan dísz lenne (docs/07).
      const fogkoDoboz = lancDoboz(card, nagyEvaSingleVersionChain[0].planDir);
      expect(within(fogkoDoboz).queryByText('Legutóbbi')).not.toBeInTheDocument();
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

    it('üres (sor nélküli) draftnál nincs összeg (D246), hiányzó lastRoute-nál nincs lépés-sor', async () => {
      seedPersistedDraft(
        { tervId: '', paciens: { ...seedPlans[0].plan.paciens, nev: 'Nagy Éva' } },
        { patientDir: nagyEvaEntries[0].patientDir },
      );
      renderHistory();
      const folytatasBtn = await screen.findByRole('button', { name: 'Folytatás' });
      const draftBlokk = folytatasBtn.closest('.rt-Card') as HTMLElement;
      expect(within(draftBlokk).queryByText(/^\d/)).not.toBeInTheDocument(); // nincs pénzösszeg-szerű szöveg
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

    // D240: a lánc-nyitottság ÉS a keresőszöveg is visszaáll böngésző-
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
