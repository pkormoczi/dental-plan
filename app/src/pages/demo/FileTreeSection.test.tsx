import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FileTreeSection from './FileTreeSection';
import { DemoStorage } from '../../storage/DemoStorage';
import type { Plan } from '../../domain/types';
import { TestProviders } from '../../testUtils';

function makeBlankPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'VEGLEGES',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Teszt Elek',
      szuletesiIdo: '1980-01-01',
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

function renderFileTree() {
  return render(
    <TestProviders>
      <FileTreeSection />
    </TestProviders>,
  );
}

describe('FileTreeSection', () => {
  let seeder: DemoStorage;

  beforeEach(async () => {
    localStorage.clear();
    seeder = new DemoStorage();
    await seeder.init();
  });

  it('a gyökér és az első szint alapból nyitva van -- a 6 sablon-fájl kattintás nélkül látszik', async () => {
    renderFileTree();
    await screen.findByText(/Ez a nézet azt mutatja meg/);

    expect(screen.getByRole('button', { name: 'sablonok' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'paciensek' })).toHaveAttribute('aria-expanded', 'true');

    const sablonokBox = document.querySelector('[data-path="sablonok"]') as HTMLElement;
    expect(within(sablonokBox).getAllByRole('button', { name: /^sablonok\/.*\.md$/ })).toHaveLength(6);
  });

  it('egy páciensmappa alapból csukva van -- kibontásig nincs paciens.json a DOM-ban', async () => {
    const ref = await seeder.savePlan(makeBlankPlan(), new Uint8Array([1, 2, 3]));
    renderFileTree();
    await screen.findByText(/Ez a nézet azt mutatja meg/);

    const patientToggle = screen.getByRole('button', { name: `paciensek/${ref.patientDir}` });
    expect(patientToggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('button', { name: `paciensek/${ref.patientDir}/paciens.json` }),
    ).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(patientToggle);

    expect(patientToggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: `paciensek/${ref.patientDir}/paciens.json` }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `paciensek/${ref.patientDir}/${ref.planDir}` }));
    await user.click(
      screen.getByRole('button', { name: `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}` }),
    );
    expect(
      screen.getByRole('button', {
        name: `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`,
      }),
    ).toBeInTheDocument();
  });

  it('arlista.json-ra kattintva a panel pretty-printelt tartalmat mutat, a nyers dp: kulccsal együtt', async () => {
    const user = userEvent.setup();
    renderFileTree();
    await screen.findByText(/Ez a nézet azt mutatja meg/);

    await user.click(screen.getByRole('button', { name: 'arlista.json' }));

    expect(await screen.findByText('dp:arlista.json')).toBeInTheDocument();
    const jsonBlock = screen.getByText(/"schemaVersion": 1/);
    expect(jsonBlock.textContent).toContain('{\n  "schemaVersion": 1');
  });

  it('garancia-hu-v1.md-re kattintva a panel a placeholder-jelölést mutatja', async () => {
    const user = userEvent.setup();
    renderFileTree();
    await screen.findByText(/Ez a nézet azt mutatja meg/);

    await user.click(screen.getByRole('button', { name: 'sablonok/garancia-hu-v1.md' }));

    expect(await screen.findByText(/\[PLACEHOLDER/)).toBeInTheDocument();
  });

  it('egy ténylegesen mentett terv PDF-je "Megnyitás új lapon" linket ad, a valódi bájtokból épített blob-URL-lel', async () => {
    const objectUrl = 'blob:mock-pdf-url';
    const createObjectURLMock = vi.fn(() => objectUrl);
    const revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURLMock;

    const ref = await seeder.savePlan(makeBlankPlan(), new Uint8Array([1, 2, 3]));
    const user = userEvent.setup();
    renderFileTree();
    await screen.findByText(/Ez a nézet azt mutatja meg/);

    await user.click(screen.getByRole('button', { name: `paciensek/${ref.patientDir}` }));
    await user.click(screen.getByRole('button', { name: `paciensek/${ref.patientDir}/${ref.planDir}` }));
    await user.click(
      screen.getByRole('button', { name: `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}` }),
    );
    await user.click(
      screen.getByRole('button', {
        name: `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/kezelesi-terv.pdf`,
      }),
    );

    const link = await screen.findByRole('link', { name: 'Megnyitás új lapon' });
    expect(link).toHaveAttribute('href', objectUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('a dp:piszkozat kulcs sehol nem jelenik meg, teljesen kibontott fánál sem', async () => {
    const ref = await seeder.savePlan(makeBlankPlan(), new Uint8Array([1]));
    // A seedelés UTÁN írjuk -- ha korábban írnánk, egy esetleges újra-init
    // (pl. legacy-migráció) elsöpörhetné, mielőtt a teszt ellenőrizné.
    localStorage.setItem(
      'dp:piszkozat',
      JSON.stringify({ schemaVersion: 1, mentve: '2026-08-11T10:00:00.000Z', plan: makeBlankPlan() }),
    );

    renderFileTree();
    await screen.findByText(/Ez a nézet azt mutatja meg/);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: `paciensek/${ref.patientDir}` }));
    await user.click(screen.getByRole('button', { name: `paciensek/${ref.patientDir}/${ref.planDir}` }));
    await user.click(
      screen.getByRole('button', { name: `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}` }),
    );

    expect(screen.queryByText(/piszkozat/i)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /piszkozat/i })).toHaveLength(0);
  });

  it('üres fánál semleges üres állapot jelenik meg', async () => {
    vi.spyOn(DemoStorage.prototype, 'listFileTree').mockReturnValue([]);

    renderFileTree();

    expect(await screen.findByText('Nincs megjeleníthető fájl — a tároló üres.')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('hiba esetén piros Callout jelenik meg a hibaüzenettel', async () => {
    vi.spyOn(DemoStorage.prototype, 'listFileTree').mockImplementation(() => {
      throw new Error('boom');
    });

    renderFileTree();

    expect(await screen.findByText(/A fájlfa betöltése nem sikerült: boom/)).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
