// 68. tétel: PDF-render hiba esetén a doki ugyanazon a képernyőn marad --
// hibaüzenet + explicit "Újrapróbálás", a Véglegesítés és a Letöltés
// letiltva, az utolsó sikeres preview beszürkítve (nem eltűnve) látszik.
// A meglévő PreviewPage.test.tsx mockja statikus (fix loading:false/
// error:null), ezért nem bővíthető erre -- itt a mock állapota tesztenként
// mutálható, hogy a hibaágat és a hiba nélküli kontroll-ágat is le tudjuk
// fedni. Lásd App.test.tsx fejléckommentjét: usePDF mockolása azért kell,
// mert a valódi renderelés a betűtípusokat Vite dev-URL-ként töltené, ami
// jsdom alatt nem működik.

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
    url: 'blob:fake-preview-url',
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
          nev: 'Teszt PDF Hiba',
          szuletesiIdo: '',
          lakcim: '',
          telefon: '',
          email: '',
          taj: '',
          kiskoru: false,
          torvenyesKepviselo: null,
        },
        // D103: egy 0 soros fázis önmagában is HARD blokk -- ez a teszt
        // nem az üres fázist vizsgálja, ezért egy sort kap.
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

describe('PreviewPage -- 68. tétel: PDF-render hiba állapota', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    pdfMock.state.loading = false;
    pdfMock.state.error = null;
    pdfMock.state.url = 'blob:fake-preview-url';
    pdfMock.updatePdf.mockClear();
  });

  it(
    'hibaüzenet jelenik meg összeomlás nélkül, Újrapróbálás újrahívja updatePdf-et, Letöltés/Véglegesítés letiltva',
    async () => {
      const user = userEvent.setup();
      pdfMock.state.error = new Error('boom teszt hiba');
      seedValidDraft();
      render(<App />);
      window.location.hash = '#/elonezet';

      // A hibaüzenet ténylegesen a képernyőn látszik -- ha a komponens
      // összeomlana a nyers Error-objektum JSX-gyerekként renderelésekor,
      // ez a lekérdezés sosem találná meg. Explicit timeout (a
      // findByText alapértelmezett 1000ms-e a teljes csomag futtatásakor,
      // párhuzamos worker-terhelés alatt szűknek bizonyult).
      expect(
        await screen.findByText(
          /A PDF előállítása hibába futott: boom teszt hiba/,
          {},
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();

      // Az auto-generálás useEffect-je (D603) a betöltés/sablonok
      // beérkezésekor is újrahívja updatePdf-et -- a retry-gomb hatását a
      // kattintás ELŐTTI hívásszámhoz képest, nem abszolút nullához mérjük.
      // `toBeGreaterThan` (nem pontos `+1`), mert a sablon-betöltés
      // effektjének kései settle-je időzítésfüggően a kattintással egy
      // act()-flush-ba eshet.
      const retryBtn = screen.getByRole('button', { name: 'Újrapróbálás' });
      const callsBeforeRetry = pdfMock.updatePdf.mock.calls.length;
      await user.click(retryBtn);
      expect(pdfMock.updatePdf.mock.calls.length).toBeGreaterThan(callsBeforeRetry);

      expect(screen.getByRole('button', { name: /Véglegesítés és mentés/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Elavult PDF' })).toBeDisabled();
      expect(screen.queryByRole('link', { name: 'Letöltés' })).not.toBeInTheDocument();
    },
    20000,
  );

  it(
    'hiba nélkül nincs Újrapróbálás gomb, a Letöltés link elérhető',
    async () => {
      seedValidDraft();
      render(<App />);
      window.location.hash = '#/elonezet';

      await screen.findByRole('button', { name: /Véglegesítés és mentés/ });
      expect(screen.queryByRole('button', { name: 'Újrapróbálás' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Elavult PDF' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Letöltés' })).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Véglegesítés és mentés/ })).not.toBeDisabled(),
      );
    },
    20000,
  );
});
