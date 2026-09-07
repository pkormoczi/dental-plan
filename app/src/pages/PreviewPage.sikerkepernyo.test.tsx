// A véglegesítés utáni sikerképernyő: a most mentett PDF egy kattintással
// megnyitható/letölthető, a böngésző Vissza a plan előnézetére visz (ahol
// újra-véglegesíteni már nem lehet), az Előre visszahozza a sikerképernyőt.
// A usePDF mockolásának indoklása: App.test.tsx fejléckommentje.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { DemoStorage } from '../storage/DemoStorage';
import { buildDownloadFileName } from '../storage/paths';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';
import type { Plan } from '../domain/types';

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

function planSablon(overrides: Partial<Plan> = {}): Plan {
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
      nev: 'Siker Elek',
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
        megnevezes: '1. kezelés',
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
    ...overrides,
  };
}

function seedAlap() {
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:15:00.000Z', plan: planSablon() }),
  );
}

/** Véglegesítés a sikerképernyőig. */
async function veglegesit(user: ReturnType<typeof userEvent.setup>) {
  const gomb = await screen.findByRole(
    'button',
    { name: /Véglegesítés és mentés/ },
    { timeout: 10000 },
  );
  await waitFor(() => expect(gomb).not.toBeDisabled());
  await user.click(gomb);
  await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });
}

describe('PreviewPage -- a sikerképernyő PDF-műveletei és a Vissza útja', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'a sikerképernyőn a most mentett verzióra mutató Megnyitás külön és Letöltés jelenik meg',
    async () => {
      const user = userEvent.setup();
      seedAlap();
      render(<App />);
      window.location.hash = '#/elonezet';
      await veglegesit(user);

      expect(screen.getByRole('button', { name: 'Megnyitás külön' })).toBeInTheDocument();
      const link = await screen.findByRole('link', { name: 'Letöltés' }, { timeout: 10000 });

      // A mentett verzió archivált PDF-je -- isDraft:false + a versionDir
      // suffix, ugyanaz a fájlnév-konvenció, mint a Terv részletei lapon.
      const storage = new DemoStorage();
      const patient = (await storage.listPatients()).find((p) => p.nev === 'Siker Elek')!;
      const [chain] = await storage.listPlans(patient.dirName);
      const [version] = await storage.listVersions(patient.dirName, chain.dirName);
      expect(link).toHaveAttribute(
        'download',
        buildDownloadFileName('Siker Elek', {
          tervId: chain.tervId,
          isDraft: false,
          suffix: version.dirName,
        }),
      );
    },
    30000,
  );

  it(
    'a böngésző Vissza a plan előnézetére visz, ahol újra-véglegesíteni már nem lehet; az Előre visszahozza a sikerképernyőt',
    async () => {
      const user = userEvent.setup();
      seedAlap();
      render(<App />);
      window.location.hash = '#/elonezet';
      await veglegesit(user);

      window.history.back();

      const gomb = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      expect(gomb).toBeDisabled();
      expect(
        screen.getByText('Ez a verzió már véglegesítve van — módosításhoz készíts új változatot.'),
      ).toBeInTheDocument();

      window.history.forward();
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });
    },
    30000,
  );
});
