import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage';
import { TestProviders } from '../testUtils';

function renderSettings() {
  return render(
    <TestProviders>
      <SettingsPage />
    </TestProviders>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows "Mentve ✓" after a successful save', async () => {
    const user = userEvent.setup();
    renderSettings();

    await screen.findByText('Beállítások');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    expect(await screen.findByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument();
  });

  // P0-8: korábban a "Mentve ✓" a tényleges mentési eredménytől függetlenül
  // jelent meg (`void saveSettings(...)`, nem várt be semmit).
  it('does NOT show "Mentve ✓" when the save fails, and shows the error instead', async () => {
    const user = userEvent.setup();
    renderSettings();

    // A kezdeti seed-írás (StorageProvider init) legyen kész, MIELŐTT a
    // localStorage.setItem-et hibázóra állítjuk.
    await screen.findByText('Beállítások');

    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'dp:beallitasok.json') throw new DOMException('QuotaExceededError');
      originalSetItem(key, value);
    });

    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    expect(screen.queryByRole('button', { name: 'Mentve ✓' })).not.toBeInTheDocument();
    expect(await screen.findByText(/A mentés nem sikerült/)).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  describe('Nyomtatvány szövegei', () => {
    it('shows the real seed text (without the "# " heading) in both boxes', async () => {
      renderSettings();

      const nyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozat.value.startsWith('#')).toBe(false);
      expect(nyilatkozat.value).toContain('Megrendelő megrendeli a KEZELÉSI TERV szerinti');

      const fizetesiFeltetelek = screen.getByLabelText('Fizetési feltételek') as HTMLTextAreaElement;
      expect(fizetesiFeltetelek.value.startsWith('#')).toBe(false);
      expect(fizetesiFeltetelek.value).toContain('Megrendelő a kezelési tervben szereplő');

      expect(screen.getByText('nyilatkozat-hu-v1.md')).toBeInTheDocument();
    });

    // A seed nemetEngedelyezve:true (mockup-alapérték), tehát a kártya saját
    // nyelvváltója is megjelenik -- a Deutsch chip váltás a német (AI-fordítású)
    // szöveget mutatja, a nem mentett HU piszkozat pedig visszaváltáskor megmarad.
    it('switching the card language to Deutsch shows the DE seed text, HU draft survives switching back', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' HU piszkozat.');

      const card = screen.getByText('Nyomtatvány szövegei').closest('.rt-Card') as HTMLElement;
      await user.click(within(card).getByRole('radio', { name: 'Deutsch' }));

      const deNyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(deNyilatkozat.value).toContain('Der Auftraggeber bestellt die im BEHANDLUNGSPLAN');

      await user.click(within(card).getByRole('radio', { name: 'Magyar' }));
      const huAgain = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(huAgain.value).toContain('HU piszkozat.');
    });

    it('saving an edited template creates a new -v2 file and updates the shown filename', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Kiegészítés.');

      expect(screen.getByText('Nem mentett módosítás')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Szöveg mentése' }));

      expect(await screen.findByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument();
      expect(screen.getByText('nyilatkozat-hu-v2.md')).toBeInTheDocument();

      const stored = localStorage.getItem('dp:sablonok/nyilatkozat-hu-v2.md');
      expect(stored).toContain('Kiegészítés.');
      // A v1 változatlan marad (D4 -- korábbi tervek erre hivatkozhatnak).
      const v1 = localStorage.getItem('dp:sablonok/nyilatkozat-hu-v1.md');
      expect(v1).not.toContain('Kiegészítés.');
    });

    it('does NOT show "Mentve ✓" when saving a template fails, and shows the error instead', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Kiegészítés.');

      const originalSetItem = localStorage.setItem.bind(localStorage);
      vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'dp:sablonok/nyilatkozat-hu-v2.md') throw new DOMException('QuotaExceededError');
        originalSetItem(key, value);
      });

      await user.click(screen.getByRole('button', { name: 'Szöveg mentése' }));

      expect(screen.queryByRole('button', { name: 'Mentve ✓' })).not.toBeInTheDocument();
      expect(await screen.findByText(/A szöveg mentése nem sikerült/)).toBeInTheDocument();

      vi.restoreAllMocks();
    });

    // docs/backlog-6-sablon-placeholder-terv.md 4. döntés: a sablonszerkesztő
    // piszkozata a `dp:sablon-piszkozat` localStorage-kulcson él, néma
    // visszaállítással -- ugyanaz a hibaosztály, amit az 1. backlog-tétel
    // (piszkozat-perzisztencia) a tervszerkesztőre már megoldott.
    it('a piszkozat túléli az elnavigálást (unmount + újrarender) mentés nélkül', async () => {
      const user = userEvent.setup();
      const { unmount } = renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');
      await waitFor(() =>
        expect(localStorage.getItem('dp:sablon-piszkozat')).toContain('Elmentetlen piszkozat.'),
      );

      unmount();
      renderSettings();

      const nyilatkozatAgain = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozatAgain.value).toContain('Elmentetlen piszkozat.');
      expect(screen.getByText('Nem mentett módosítás')).toBeInTheDocument();
    });

    // docs/backlog-6-sablon-placeholder-terv.md 5. döntés: ugyanaz a
    // `useRef`-alapú in-flight zár, mint a `PreviewPage.tsx` `savingRef`-je --
    // a `disabled` prop önmagában megkerülhető egy render előtti második
    // kattintással (`fireEvent.click` szinkron, `await` nélkül a kettő közt).
    it('dupla kattintás a "Szöveg mentése" gombon csak egy új verziófájlt hoz létre', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Kiegészítés.');

      const saveBtn = screen.getByRole('button', { name: 'Szöveg mentése' });
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument(),
      );

      expect(localStorage.getItem('dp:sablonok/nyilatkozat-hu-v2.md')).not.toBeNull();
      expect(localStorage.getItem('dp:sablonok/nyilatkozat-hu-v3.md')).toBeNull();
    });
  });
});
