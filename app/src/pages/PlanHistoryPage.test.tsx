import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import PlanHistoryPage from './PlanHistoryPage';
import { TestProviders } from '../testUtils';
import { DemoStorage } from '../storage/DemoStorage';
import { seedPlans } from '../storage/seed/plans';
import { formatMoney } from '../domain/money';
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
  return formatMoney(osszeg, 'HUF').replace(/\u00a0/g, ' ');
}

// A páciensblokk a `data-patient` horgonyról kereshető -- a névfejléc DOM-beli
// mélysége azóta nem stabil, hogy az akciógomb a fejléc MELLÉ került.
function patientCard(nev: string): HTMLElement {
  return screen.getByText(nev).closest('[data-patient]') as HTMLElement;
}

// A verziósor másodlagos akciói (Letöltés, "Új terv, ezzel a tartalommal")
// egy "⋯" DropdownMenu mögött vannak -- a menü csak nyitáskor rendeli a
// menüpontokat a DOM-ba, ezért minden ilyen teszt itt megy keresztül.
// `vi` = 0 a legfrissebb verzió sora (a lista fordítva rendez).
async function menupont(
  user: ReturnType<typeof userEvent.setup>,
  card: HTMLElement,
  nev: string,
  vi = 0,
): Promise<HTMLElement> {
  const triggers = within(card).getAllByRole('button', { name: /további műveletek$/ });
  await user.click(triggers[vi]);
  return screen.findByRole('menuitem', { name: nev });
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
    const kovacs = seedPlans[0]; // Kovács János, egyetlen verzió
    expect(kovacs.plan.paciens.nev).toBe('Kovács János');
    const corruptKey = `dp:paciensek/${kovacs.patientDir}/${kovacs.versionDir}/terv.json`;
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
    // Nagy Éva a seedben két verzióval szerepel, eltérő végösszeggel -- ez
    // igazolja, hogy soronként a SAJÁT verzió összege jelenik meg, nem a
    // legfrissebbé mindkettőn.
    const [v1, v2] = seedPlans.filter((e) => e.plan.paciens.nev === 'Nagy Éva');
    expect(v1.plan.osszesitok.fizetendo).not.toBe(v2.plan.osszesitok.fizetendo);

    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    expect(await within(card).findByText(penz(v1.plan.osszesitok.fizetendo))).toBeInTheDocument();
    expect(within(card).getByText(penz(v2.plan.osszesitok.fizetendo))).toBeInTheDocument();
  });

  it('sérült verziónál "—" áll az összeg helyén, a többi sor érintetlen', async () => {
    const kovacs = seedPlans[0]; // Kovács János, egyetlen verzió
    localStorage.setItem(
      `dp:paciensek/${kovacs.patientDir}/${kovacs.versionDir}/terv.json`,
      'not valid json {{{',
    );

    renderHistory();

    const marker = await screen.findByText(/⚠ néhány verziója nem olvasható/);
    const card = marker.closest('[data-patient]') as HTMLElement;
    expect(within(card).getByText('—')).toBeInTheDocument();

    // A többi páciens összege változatlanul látszik -- egy sérült fájl nem
    // viszi magával a lista többi sorát (ugyanaz a P1-2 elv).
    await screen.findByText('Nagy Éva');
    const nagyEvaCard = patientCard('Nagy Éva');
    const evaV2 = seedPlans.filter((e) => e.plan.paciens.nev === 'Nagy Éva')[1];
    expect(within(nagyEvaCard).getByText(penz(evaV2.plan.osszesitok.fizetendo))).toBeInTheDocument();
    expect(within(nagyEvaCard).queryByText('—')).not.toBeInTheDocument();
  });

  it('opening a corrupted version surfaces a visible inline error instead of doing nothing (P1-2)', async () => {
    const kovacs = seedPlans[0];
    const corruptKey = `dp:paciensek/${kovacs.patientDir}/${kovacs.versionDir}/terv.json`;
    localStorage.setItem(corruptKey, 'not valid json {{{');

    const user = userEvent.setup();
    renderHistory();

    const marker = await screen.findByText(/⚠ néhány verziója nem olvasható/);
    const card = marker.closest('[data-patient]') as HTMLElement;
    const openBtn = within(card).getByRole('button', { name: 'Szerkesztés új verzióként' });

    // Korábban itt `alert()` jelent meg -- most a sérintett verzió-sora
    // mellett, a szövegben (docs/07-felulet-rendszer.md: "Nem toast, ha a
    // hiba egy mezőhöz tartozik").
    await user.click(openBtn);

    expect(await within(card).findByText(/A terv megnyitása nem sikerült/)).toBeInTheDocument();
  });

  // docs/03-funkcionalis-spec.md § Autosave: ugyanaz a felülírás-kockázat,
  // mint a Home "Új terv indítása" gombjánál -- a "Szerkesztés új verzióként"
  // szó nélkül felülírná a folyamatban lévő, mentetlen piszkozatot.
  it('"Szerkesztés új verzióként" megerősítést kér mentetlen piszkozatnál, és csak megerősítésre nyit meg', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const openBtn = within(card).getAllByRole('button', { name: 'Szerkesztés új verzióként' })[0];

    await user.click(openBtn);
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    // Mégse -- nem navigál, nem hívja loadPlanIntoDraft-ot.
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Korábbi tervek')).toBeInTheDocument();

    // Megerősítés -- ténylegesen megnyitja (loadPlanIntoDraft -> navigate).
    await user.click(openBtn);
    await user.click(
      await screen.findByRole('button', { name: 'Szerkesztés, piszkozat elvetésével' }),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  // backlog-17: a két új belépési pont eltérő szinten él -- páciensenként
  // EGY "Új terv, csak a páciensadatokkal" a névfejlécnél, és minden
  // verzió-soron egy "Új terv, ezzel a tartalommal" a Letöltés/Szerkesztés
  // mellett.
  it('"Új terv, csak a páciensadatokkal" páciensszinten egyszer, "Új terv, ezzel a tartalommal" minden verzió-soron megjelenik', async () => {
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');

    expect(
      within(card).getByRole('button', { name: 'Új terv, csak a páciensadatokkal' }),
    ).toBeInTheDocument();
    // Nagy Éva két verzióval szerepel a seedben -- egy-egy "⋯" menü
    // verziónként, nem csak egy a páciensnek. Az accessible name is
    // verziónként külön, hogy megkülönböztethetők legyenek.
    expect(within(card).getByRole('button', { name: 'v2 — további műveletek' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'v1 — további műveletek' })).toBeInTheDocument();
  });

  it('"Új terv, ezzel a tartalommal" a kattintott verzió soraival és páciensadatával indít új piszkozatot a Páciens adatlapon', async () => {
    const [, v2] = seedPlans.filter((e) => e.plan.paciens.nev === 'Nagy Éva');
    const forrasSorSzam = v2.plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
    expect(forrasSorSzam).toBe(3); // v1 két sora + a v2-ben hozzáadott korona sor

    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    // A verziók lista fordítva (legfrissebb elöl) -- az első "⋯" menü a v2
    // sorához tartozik.
    await user.click(await menupont(user, card, 'Új terv, ezzel a tartalommal'));

    expect(await screen.findByTestId('draft-oldal')).toHaveTextContent('PACIENS-OLDAL');
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Nagy Éva');
    expect(screen.getByTestId('draft-tervid')).toHaveTextContent('„”'); // üres tervId -- új tervlánc
    expect(screen.getByTestId('draft-sorcount')).toHaveTextContent(String(forrasSorSzam));
    // A dátumbélyeg frissül (D22-mintájú, planMasolatKent) -- nem a forrás
    // 2026-07-22-es keltezése marad.
    expect(screen.getByTestId('draft-keltezes')).not.toHaveTextContent(v2.plan.keltezes);
  });

  it('"Új terv, csak a páciensadatokkal" csak a páciensadatot viszi át, a LEGFRISSEBB verzióból, sorok nélkül', async () => {
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');
    const ujTervBtn = within(card).getByRole('button', {
      name: 'Új terv, csak a páciensadatokkal',
    });

    await user.click(ujTervBtn);

    expect(await screen.findByTestId('draft-oldal')).toHaveTextContent('PACIENS-OLDAL');
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Nagy Éva');
    expect(screen.getByTestId('draft-tervid')).toHaveTextContent('„”');
    expect(screen.getByTestId('draft-sorcount')).toHaveTextContent('0');
  });

  // Ugyanaz a felülírás-kockázat, mint "Szerkesztés új verzióként"-nél -- a
  // két "Új terv…" gomb sem törölheti szó nélkül a mentetlen piszkozatot.
  it('mindkét új gomb megerősítést kér mentetlen piszkozatnál, Mégse-re nem történik semmi', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderHistory();

    await screen.findByText('Nagy Éva');
    const card = patientCard('Nagy Éva');

    await user.click(await menupont(user, card, 'Új terv, ezzel a tartalommal'));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('draft-oldal')).not.toBeInTheDocument();

    await user.click(await menupont(user, card, 'Új terv, ezzel a tartalommal'));
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

    // A seed-verziókhoz nincs mentett PDF (csak terv.json) -- a lényeg, hogy a
    // menüpont a downloadVersion ágra fut, és a hiánya a SOR alatt, inline
    // jelenik meg, nem alert()-tel (P1-2).
    await user.click(await menupont(user, card, 'Letöltés'));
    expect(await within(card).findByText('Ehhez a verzióhoz nincs mentett PDF.')).toBeInTheDocument();
  });
});
