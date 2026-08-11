import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlanHistoryPage from './PlanHistoryPage';
import { TestProviders } from '../testUtils';
import { patientCard, verzioMenupont } from '../testQueries';
import { DemoStorage } from '../storage/DemoStorage';
import { seedPlans } from '../storage/seed/plans';
import { formatMoney } from '../domain/money';
import { buildDownloadFileName } from '../storage/paths';
import { useAppState } from '../state/AppState';
import type { Plan } from '../domain/types';

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
    JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:00:00.000Z', plan }),
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

/** A "2 terv" összecsukás-kapcsoló -- csak akkor létezik, ha a páciensnek 2+ lánca van. */
async function expandPatientBlock(user: ReturnType<typeof userEvent.setup>, card: HTMLElement) {
  await user.click(within(card).getByRole('button', { name: /^\d+ terv$/ }));
}

function renderHistory() {
  return render(
    <TestProviders>
      <Routes>
        <Route path="/" element={<PlanHistoryPage />} />
        <Route path="/paciens" element={<DraftProbe />} />
        <Route path="/terv" element={<div>TERV-OLDAL</div>} />
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
    // Nagy Évának két önálló terv-lánca van (D29) -- a páciens-blokk emiatt
    // alapból csukva nyílik.
    await expandPatientBlock(user, card);

    expect(await within(card).findByText(penz(v1.plan.osszesitok.fizetendo))).toBeInTheDocument();
    expect(within(card).getByText(penz(v2.plan.osszesitok.fizetendo))).toBeInTheDocument();
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
    await expandPatientBlock(user, nagyEvaCard);
    const [, v2] = nagyEvaMultiVersionChain;
    expect(within(nagyEvaCard).getByText(penz(v2.plan.osszesitok.fizetendo))).toBeInTheDocument();
    expect(within(nagyEvaCard).queryByText('—')).not.toBeInTheDocument();
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
  // mint a Home "Új terv indítása" gombjánál -- az "Új verzió" szó nélkül
  // felülírná a folyamatban lévő, mentetlen piszkozatot.
  it('"Új verzió" megerősítést kér mentetlen piszkozatnál, és csak megerősítésre nyit meg', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    await expandPatientBlock(user, card);

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

    expect(within(card).getByRole('button', { name: 'Új terv' })).toBeInTheDocument();
    await expandPatientBlock(user, card);

    // Nagy Éva 3 verzióval szerepel a seedben, 2 önálló láncban -- egy-egy
    // "⋯" menü verziónként. Az accessible name a terv-címkével ÉS a
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
    await expandPatientBlock(user, card);
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

  it('"Másolás új tervbe" a kattintott verzió soraival és páciensadatával indít új piszkozatot a Páciens adatlapon', async () => {
    const [, v2] = nagyEvaMultiVersionChain;
    const forrasSorSzam = v2.plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
    expect(forrasSorSzam).toBe(3); // v1 két sora + a v2-ben hozzáadott korona sor

    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    await expandPatientBlock(user, card);
    // Az ELSŐ terv-lánc (fogpótlás) verziói fordítva listázódnak (legfrissebb
    // elöl) -- az első "⋯" menü ennek a láncnak a v2 sorához tartozik.
    await user.click(await verzioMenupont(user, card, 'Másolás új tervbe'));

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
    const ujTervBtn = within(card).getByRole('button', { name: 'Új terv' });

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
    await expandPatientBlock(user, card);

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
    await expandPatientBlock(user, card);

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
      await expandPatientBlock(user, card);

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

    it('2+ terv-lánccal rendelkező páciens alapból csukva jelenik meg', async () => {
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');

      expect(within(card).getByRole('button', { name: '2 terv' })).toBeInTheDocument();
      // Csukott állapotban a verziósorok NEM láthatók.
      expect(within(card).queryByRole('button', { name: /további műveletek$/ })).not.toBeInTheDocument();
      // ...de a "2 terv" kapcsoló melletti legutóbbi lánc dátuma/összege igen,
      // sima (nem kattintható) szövegként.
      expect(within(card).getByText(/^· legutóbb:/)).toBeInTheDocument();
    });

    it('kattintásra kinyílik, mindkét terv-lánc látszik a saját címkéjével', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');

      await expandPatientBlock(user, card);

      // Élő auto-javaslat -- a fogpótlás lánc domináns kategóriája "Tömések",
      // a fogkőeltávolítás láncé "Fogkőeltávolítás" (mindkettő egyetlen
      // kategóriára hivatkozik, lásd seed/plans.ts).
      expect(within(card).getByText(/^Tömések ·/)).toBeInTheDocument();
      expect(within(card).getByText(/^Fogkőeltávolítás ·/)).toBeInTheDocument();
    });

    it('a terv-címke inline szerkeszthető, üresen mentve visszaáll az automatikus javaslatra', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      await expandPatientBlock(user, card);

      // Nagy Évának két lánca van (két pencil-gomb, D29) -- a [0] a fogpótlás
      // lánc, a DOM-beli első (lásd a fenti "kattintásra kinyílik" tesztet).
      await user.click(
        within(card).getAllByRole('button', { name: 'Terv címének szerkesztése' })[0],
      );
      const input = within(card).getByRole('textbox', { name: 'Terv címe' });
      await user.clear(input);
      await user.type(input, 'Fogpótlás — Éva');
      await user.click(within(card).getByRole('button', { name: 'Címke mentése' }));

      expect(await within(card).findByText(/^Fogpótlás — Éva ·/)).toBeInTheDocument();

      // Üresen mentve vissza az automatikus javaslatra ("Tömések").
      await user.click(
        within(card).getAllByRole('button', { name: 'Terv címének szerkesztése' })[0],
      );
      const input2 = within(card).getByRole('textbox', { name: 'Terv címe' });
      await user.clear(input2);
      await user.click(within(card).getByRole('button', { name: 'Címke mentése' }));

      expect(await within(card).findByText(/^Tömések ·/)).toBeInTheDocument();
    });

    it('Escape a szerkesztés közben elveti a módosítást', async () => {
      const user = userEvent.setup();
      renderHistory();
      await screen.findByText('Nagy Éva');
      const card = patientCard('Nagy Éva');
      await expandPatientBlock(user, card);

      await user.click(
        within(card).getAllByRole('button', { name: 'Terv címének szerkesztése' })[0],
      );
      const input = within(card).getByRole('textbox', { name: 'Terv címe' });
      await user.type(input, 'Ideiglenes szöveg, ami nem mentődik');
      await user.keyboard('{Escape}');

      expect(within(card).queryByRole('textbox', { name: 'Terv címe' })).not.toBeInTheDocument();
      expect(within(card).getByText(/^Tömések ·/)).toBeInTheDocument();
    });
  });
});
