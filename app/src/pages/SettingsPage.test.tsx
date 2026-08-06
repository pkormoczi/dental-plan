import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';

function renderSettings() {
  return render(
    <MemoryRouter>
      <StorageProvider>
        <AppStateProvider>
          <SettingsPage />
        </AppStateProvider>
      </StorageProvider>
    </MemoryRouter>,
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
});
