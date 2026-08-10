import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import PlanHistoryPage from './PlanHistoryPage';
import { TestProviders } from '../testUtils';
import { DemoStorage } from '../storage/DemoStorage';
import { seedPlans } from '../storage/seed/plans';
import { formatMoney } from '../domain/money';
import type { Plan } from '../domain/types';

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

function renderHistory() {
  return render(
    <TestProviders>
      <PlanHistoryPage />
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

    const nagyEva = await screen.findByText('Nagy Éva');
    const card = nagyEva.parentElement as HTMLElement;
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
    const card = marker.closest('div')!.parentElement as HTMLElement;
    expect(within(card).getByText('—')).toBeInTheDocument();

    // A többi páciens összege változatlanul látszik -- egy sérült fájl nem
    // viszi magával a lista többi sorát (ugyanaz a P1-2 elv).
    const nagyEva = await screen.findByText('Nagy Éva');
    const nagyEvaCard = nagyEva.parentElement as HTMLElement;
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
    const card = marker.closest('div')!.parentElement as HTMLElement;
    const openBtn = within(card).getByRole('button', { name: 'Megnyitás szerkesztésre' });

    // Korábban itt `alert()` jelent meg -- most a sérintett verzió-sora
    // mellett, a szövegben (docs/07-felulet-rendszer.md: "Nem toast, ha a
    // hiba egy mezőhöz tartozik").
    await user.click(openBtn);

    expect(await within(card).findByText(/A terv megnyitása nem sikerült/)).toBeInTheDocument();
  });

  // docs/03-funkcionalis-spec.md § Autosave: ugyanaz a felülírás-kockázat,
  // mint a Home "Új terv indítása" gombjánál -- a "Megnyitás szerkesztésre"
  // szó nélkül felülírná a folyamatban lévő, mentetlen piszkozatot.
  it('"Megnyitás szerkesztésre" megerősítést kér mentetlen piszkozatnál, és csak megerősítésre nyit meg', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderHistory();

    const nagyEva = await screen.findByText('Nagy Éva');
    const card = nagyEva.parentElement as HTMLElement;
    const openBtn = within(card).getAllByRole('button', { name: 'Megnyitás szerkesztésre' })[0];

    await user.click(openBtn);
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    // Mégse -- nem navigál, nem hívja loadPlanIntoDraft-ot.
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Korábbi tervek')).toBeInTheDocument();

    // Megerősítés -- ténylegesen megnyitja (loadPlanIntoDraft -> navigate).
    await user.click(openBtn);
    await user.click(await screen.findByRole('button', { name: 'Megnyitás, piszkozat elvetésével' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
