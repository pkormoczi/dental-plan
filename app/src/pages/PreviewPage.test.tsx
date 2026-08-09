// A kitöltetlen-sor véglegesítés-őr tesztje: egy fogtérkép-kattintással
// létrehozott, de be nem azonosított sor KEMÉNY blokk -- nem folytatható,
// amíg a doki nem választ hozzá beavatkozást vagy nem törli a sort. A
// @react-pdf/renderer usePDF()-jét ugyanúgy mockoljuk, mint App.test.tsx-ben
// (lásd ott a header-kommentet az indoklásért).

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

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

describe('PreviewPage -- kitöltetlen sorok véglegesítés-őre', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'kitöltetlen sorral a véglegesítés blokkolva -- kitöltés után folytatható',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Ilona');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      // Fogtérkép-kattintással létrehozott, tétel nélküli sor -- a panel
      // alapból csukva, előbb ki kell nyitni.
      await user.click(await screen.findByRole('button', { name: /Érintett fogak/ }));
      const chart = await screen.findByRole('toolbar');
      const tooth16 = chart.querySelector('[data-tooth="16"]') as Element;
      await user.click(tooth16);
      expect(screen.getByDisplayValue('16')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(finalizeBtn);

      // KEMÉNY blokk -- nincs AlertDialog, a hiba a lapon jelenik meg.
      expect(
        await screen.findByText(/A terv 1 kitöltetlen sort tartalmaz/),
      ).toBeInTheDocument();
      expect(screen.getByText(/1\. kezelés — 16/)).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.queryByText('A terv elmentve ✓')).not.toBeInTheDocument();

      // "Vissza a szerkesztőbe" -- valóban a szerkesztőre navigál. Két
      // kereső van egyszerre a DOM-ban: a soron belüli (a még kitöltetlen
      // sorban) és a fázis alatti "+ tétel" kereső.
      await user.click(screen.getByRole('button', { name: 'Vissza a szerkesztőbe' }));
      const [rowSearch] = await screen.findAllByPlaceholderText(/Tétel keresése/);

      await user.type(rowSearch, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      expect(screen.getByText('Fogeltávolítás')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText(/Tétel keresése/)).toHaveLength(1);

      // Most már folytatható a véglegesítés (a hiányos páciensadat miatt a
      // szokásos, NEM blokkoló megerősítő dialóguson át).
      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn2 = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(finalizeBtn2);
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));
      await waitFor(() =>
        expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument(),
      );
    },
    20000,
  );
});

// docs/03-funkcionalis-spec.md véglegesítés-lánc 4. lépése ("A piszkozat
// törlése") -- ha ez elmaradna, a most fájlba mentett terv azonnal
// vissza"íródna" piszkozatként (lásd AppState.tsx markPlanSaved).
describe('PreviewPage -- piszkozat törlése sikeres véglegesítéskor', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'sikeres véglegesítés után nincs perzisztált dp:piszkozat kulcs',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Piszkozat Béla');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await screen.findByText('Fogeltávolítás');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(search).toHaveValue(''));

      // A piszkozat itt már perzisztálva van -- az író effekt debounce
      // nélkül fut (3. döntés).
      await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).not.toBeNull());

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(finalizeBtn);
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

      expect(localStorage.getItem('dp:piszkozat')).toBeNull();
    },
    20000,
  );
});
