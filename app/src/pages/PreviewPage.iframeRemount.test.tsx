// Az előnézet PDF-iframe-je URL-változáskor ÚJ DOM-elemként jön létre, nem a
// meglévő elem `src`-je íródik át -- egy élő iframe src-cseréje a szülő
// böngésző-előzményébe kerül, és a Vissza a visszavont blob-URL hibaoldalára
// lépne. A PreviewPage.test.tsx usePDF-mockja állandó URL-t ad, ezért ott ez
// nem figyelhető meg; itt a PreviewPage.pdfHiba.test.tsx mutálható mock-mintája
// kell (lásd App.test.tsx: a valódi renderelés jsdom alatt nem fut).

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';

const pdfMock = vi.hoisted(() => ({
  state: {
    loading: false,
    error: null as Error | null,
    blob: new Blob(['%PDF-fake'], { type: 'application/pdf' }),
    url: 'blob:elso-url',
  },
  updatePdf: vi.fn(),
}));

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
  return {
    ...actual,
    usePDF: () => [pdfMock.state, pdfMock.updatePdf],
  };
});

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
          nev: 'Teszt Iframe Remount',
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

describe('PreviewPage -- az előnézet-iframe URL-változáskor', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    pdfMock.state.loading = false;
    pdfMock.state.error = null;
    pdfMock.state.url = 'blob:elso-url';
    pdfMock.updatePdf.mockClear();
  });

  it(
    'új DOM-elemként jön létre, a régi elem eltűnik -- nem a meglévő iframe src-je íródik át',
    async () => {
      const user = userEvent.setup();
      seedValidDraft();
      render(<App />);
      window.location.hash = '#/elonezet';

      const elsoIframe = await screen.findByTitle('Kezelési terv előnézet', {}, { timeout: 10000 });
      expect(elsoIframe).toHaveAttribute('src', 'blob:elso-url');

      // A "Csak ajánlat" kapcsoló újrarendereli a lapot; a mock ekkor már az
      // új blob-URL-t adja vissza, ahogy a valódi usePDF() is új URL-t ad
      // minden újragenerálás után.
      pdfMock.state.url = 'blob:masodik-url';
      await user.click(screen.getByRole('checkbox', { name: /Csak ajánlat/ }));

      await waitFor(() =>
        expect(screen.getByTitle('Kezelési terv előnézet')).toHaveAttribute('src', 'blob:masodik-url'),
      );
      expect(screen.getByTitle('Kezelési terv előnézet')).not.toBe(elsoIframe);
      expect(elsoIframe).not.toBeInTheDocument();
    },
    20000,
  );

  it(
    'a Letöltés link és a véglegesítés-gomb változatlanul elérhető marad',
    async () => {
      seedValidDraft();
      render(<App />);
      window.location.hash = '#/elonezet';

      await screen.findByRole('button', { name: /Véglegesítés és mentés/ }, { timeout: 10000 });
      expect(screen.getByRole('link', { name: 'Letöltés' })).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Véglegesítés és mentés/ })).not.toBeDisabled(),
      );
    },
    20000,
  );
});
