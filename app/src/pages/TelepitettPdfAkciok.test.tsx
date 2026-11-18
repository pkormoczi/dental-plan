// A telepített app PDF-akciói (migrációs terv §5.3) az öt helyen. A valódi demó-tároló mellé a
// `useStorage` egy hamis `pdfMuveletek` képességet ad: ez az a jelzés, amire a felület a
// telepített app gombjait mutatja. A képesség nélküli (Pages) viselkedést a lapok saját
// tesztjei fedik. A usePDF mockolásának indoklása: App.test.tsx fejléckommentje.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { DemoStorage } from '../storage/DemoStorage';
import { seedPatients, seedPlans } from '../storage/seed/plans';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';
import type { Plan, PlanRef } from '../domain/types';
import type { PdfForras } from '../storage/taroloIpc';

const pdfMuveletek = vi.hoisted(() => ({
  megnyit: vi.fn<(ref: PlanRef) => Promise<void>>(async () => {}),
  masol: vi.fn<(forras: PdfForras, javasoltNev: string) => Promise<string | null>>(async () => 'valasztott-nev.pdf'),
}));

vi.mock('../storage/StorageContext', async (eredeti) => {
  const m = await eredeti<typeof import('../storage/StorageContext')>();
  return { ...m, useStorage: () => ({ ...m.useStorage(), pdfMuveletek }) };
});

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
  return {
    ...actual,
    usePDF: () => [
      {
        loading: false,
        error: null,
        blob: new Blob(['%PDF-fake'], { type: 'application/pdf' }),
        url: 'blob:fake-preview-url',
      },
      () => {},
    ],
  };
});

const nagyDir = seedPatients.find((p) => p.record.nev === 'Nagy Éva')!.patientDir;
const nagyVerzio = seedPlans.find((e) => e.patientDir === nagyDir)!;

function piszkozat(): Plan {
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
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Telepített Elek',
      szuletesiIdo: '1980-01-01',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [
      {
        sorszam: 1,
        megnevezes: '1. fázis',
        megjegyzes: '',
        sorok: [
          {
            tetelId: '',
            nevSnapshot: 'Kontroll',
            savos: false,
            fogak: '',
            mennyiseg: 1,
            listaEgysegar: 0,
            tenylegesEgysegar: 0,
          },
        ],
      },
    ],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

describe('a telepített app PDF-akciói', () => {
  beforeEach(async () => {
    localStorage.clear();
    window.location.hash = '';
    pdfMuveletek.megnyit.mockClear();
    pdfMuveletek.masol.mockClear();
  });

  async function seedDemo() {
    const seeder = new DemoStorage();
    await seeder.init();
  }

  it('Terv részletei: „Megnyitás” és „Másolás máshová” a böngészős gombok helyett; a másolás után a választott név látszik', async () => {
    await seedDemo();
    const user = userEvent.setup();
    window.location.hash = `#/paciensek/${encodeURIComponent(nagyDir)}/tervek/${encodeURIComponent(nagyVerzio.planDir)}/${encodeURIComponent(nagyVerzio.versionDir)}`;
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Megnyitás' }, { timeout: 10000 }));
    expect(pdfMuveletek.megnyit).toHaveBeenCalledWith({
      patientDir: nagyDir,
      planDir: nagyVerzio.planDir,
      versionDir: nagyVerzio.versionDir,
    });
    expect(screen.queryByRole('button', { name: 'Megnyitás külön' })).toBeNull();
    expect(screen.queryByText('Letöltés')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Másolás máshová' }));

    expect(pdfMuveletek.masol).toHaveBeenCalledWith(
      { ref: { patientDir: nagyDir, planDir: nagyVerzio.planDir, versionDir: nagyVerzio.versionDir } },
      expect.stringMatching(/^kezelesi-terv-.*\.pdf$/),
    );
    expect(await screen.findByText('Másolva:')).toBeInTheDocument();
    expect(screen.getByText('valasztott-nev.pdf')).toBeInTheDocument();
  });

  it('a lánc ⋯ menüjében „Megnyitás” és „Másolás máshová” áll „Letöltés” helyett', async () => {
    await seedDemo();
    const user = userEvent.setup();
    window.location.hash = `#/paciensek/${encodeURIComponent(nagyDir)}`;
    render(<App />);

    const menuk = await screen.findAllByRole('button', { name: /további műveletek$/ }, { timeout: 10000 });
    await user.click(menuk[0]);
    const menu = await screen.findByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: 'Letöltés' })).toBeNull();
    expect(within(menu).getByRole('menuitem', { name: 'Másolás máshová' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: 'Megnyitás' }));

    await waitFor(() => expect(pdfMuveletek.megnyit).toHaveBeenCalledOnce());
    expect(pdfMuveletek.megnyit.mock.calls[0][0]).toMatchObject({ patientDir: nagyDir });
  });

  it(
    'az Előnézeten a piszkozat-PDF „Másolás máshová”-val, a PISZKOZAT-fájlnévvel kerül ki; a sikerképernyőn és a Kezdőlap-kártyán „Megnyitás” + „Másolás máshová” áll',
    async () => {
      const user = userEvent.setup();
      localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
      localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
      localStorage.setItem(
        'dp:piszkozat',
        JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:15:00.000Z', plan: piszkozat() }),
      );
      render(<App />);
      window.location.hash = '#/elonezet';

      const masolas = await screen.findByRole('button', { name: 'Másolás máshová' }, { timeout: 10000 });
      await waitFor(() => expect(masolas).not.toBeDisabled());
      expect(screen.queryByText('Letöltés')).toBeNull();
      await user.click(masolas);
      await waitFor(() => expect(pdfMuveletek.masol).toHaveBeenCalledOnce());
      const [forras, nev] = pdfMuveletek.masol.mock.calls[0];
      expect('bajtok' in forras && forras.bajtok).toBeInstanceOf(Uint8Array);
      expect(nev).toMatch(/^PISZKOZAT-kezelesi-terv-.*\.pdf$/);

      const gomb = screen.getByRole('button', { name: /Véglegesítés és mentés/ });
      await waitFor(() => expect(gomb).not.toBeDisabled());
      await user.click(gomb);
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });
      expect(screen.getByRole('button', { name: 'Megnyitás' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Másolás máshová' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Megnyitás külön' })).toBeNull();

      window.location.hash = '#/';
      const kartya = (await screen.findByText('Az imént véglegesített terv', {}, { timeout: 10000 })).closest('.rt-Card')!;
      expect(within(kartya as HTMLElement).getByRole('button', { name: 'Megnyitás' })).toBeInTheDocument();
      expect(within(kartya as HTMLElement).getByRole('button', { name: 'Másolás máshová' })).toBeInTheDocument();
      expect(within(kartya as HTMLElement).queryByText('Letöltés')).toBeNull();
    },
    40000,
  );

  it('a sikertelen megnyitás hibája a lapon látszik', async () => {
    await seedDemo();
    pdfMuveletek.megnyit.mockRejectedValueOnce(new Error('Ez a verzió még nem teljes (hiányzik: kezelesi-terv.pdf).'));
    const user = userEvent.setup();
    window.location.hash = `#/paciensek/${encodeURIComponent(nagyDir)}/tervek/${encodeURIComponent(nagyVerzio.planDir)}/${encodeURIComponent(nagyVerzio.versionDir)}`;
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Megnyitás' }, { timeout: 10000 }));

    expect(await screen.findByText(/A megnyitás nem sikerült: Ez a verzió még nem teljes/)).toBeInTheDocument();
  });
});
