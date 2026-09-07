// Az Előnézeten a véglegesítés-gomb alatt állandó sor mondja ki, hogy a lépés
// visszavonhatatlan. Nem megerősítő dialógus: a gomb kattintásra közbeiktatott
// kérdés nélkül ment -- a szekvenciális modal-lánc szándékosan megszűnt, ez a
// teszt azt is őrzi, hogy nem jön vissza. A usePDF mockolásának indoklása:
// App.test.tsx fejléckommentje.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';

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

const SZOVEG = 'Véglegesítés után a terv nem módosítható, csak új változat készíthető.';

function seedValidDraft() {
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({
      schemaVersion: 1,
      mentve: '2026-08-09T10:15:00.000Z',
      plan: {
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
          nev: 'Teszt Visszavonhatatlan',
          szuletesiIdo: '',
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
      },
    }),
  );
}

describe('PreviewPage -- a véglegesítés visszavonhatatlanságának jelzése', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'a gomb mellett látszik a "csak új változat készíthető" sor, és a gomb accessible description-je is ez',
    async () => {
      seedValidDraft();
      render(<App />);
      window.location.hash = '#/elonezet';

      const gomb = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      expect(screen.getByText(SZOVEG)).toBeInTheDocument();
      expect(gomb).toHaveAccessibleDescription(SZOVEG);
    },
    20000,
  );

  it(
    'a sor akkor is látszik, ha a gomb kemény blokk miatt letiltott',
    async () => {
      seedValidDraft();
      // A terv orvosa nem szerepel az aktív orvosok között -- KEMÉNY blokk.
      localStorage.setItem('dp:beallitasok.json', JSON.stringify({ ...seedSettings, orvosok: [] }));
      render(<App />);
      window.location.hash = '#/elonezet';

      const gomb = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await waitFor(() => expect(gomb).toBeDisabled());
      expect(screen.getByText(SZOVEG)).toBeInTheDocument();
    },
    20000,
  );

  it(
    'a gombra kattintva közbeiktatott kérdés nélkül mentődik a terv',
    async () => {
      const user = userEvent.setup();
      seedValidDraft();
      render(<App />);
      window.location.hash = '#/elonezet';

      const gomb = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await waitFor(() => expect(gomb).not.toBeDisabled());
      await user.click(gomb);

      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
      expect(screen.queryByRole('button', { name: 'Folytatás' })).not.toBeInTheDocument();
    },
    20000,
  );
});
