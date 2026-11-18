import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it, vi } from 'vitest';
import UtkozesSav from './UtkozesSav';
import type { PlanStorage, UtkozesTetel } from '../storage/PlanStorage';
import { useStorage } from '../storage/StorageContext';

vi.mock('../storage/StorageContext', () => ({ useStorage: vi.fn() }));

const TETELEK: UtkozesTetel[] = [
  { utvonal: 'paciensek/Kovacs-Janos_abc123 (1)', fajta: 'drive-utkozes' },
  { utvonal: '_utkozesek/arlista.2026-11-18T10-00-00.000Z.json', fajta: 'utkozes-mentes' },
];

/** Minden teszt saját tárolót kap: a sáv állapota tároló-példányonként (app-futásonként) él. */
function tarolo(lista: () => Promise<UtkozesTetel[]>) {
  const storage = { listUtkozesek: vi.fn(lista) } as unknown as PlanStorage;
  const megmutat = vi.fn(async () => {});
  vi.mocked(useStorage).mockReturnValue({ storage, megmutat } as unknown as ReturnType<typeof useStorage>);
  return { storage, megmutat };
}

const renderSav = () =>
  render(
    <Theme>
      <UtkozesSav />
    </Theme>,
  );

describe('UtkozesSav', () => {
  it('tételenként a fajtát és az útvonalat mutatja, és a „Mappa megnyitása” a tétel útvonalát mutatja meg', async () => {
    const { megmutat } = tarolo(async () => TETELEK);
    const user = userEvent.setup();
    renderSav();

    expect(await screen.findByText('paciensek/Kovacs-Janos_abc123 (1)')).toBeInTheDocument();
    expect(screen.getByText(/A Drive két változatot tartott meg/)).toBeInTheDocument();
    expect(screen.getByText(/Ütközéskor félretett változat/)).toBeInTheDocument();
    const gombok = screen.getAllByRole('button', { name: 'Mappa megnyitása' });
    expect(gombok).toHaveLength(2);

    await user.click(gombok[1]);

    expect(megmutat).toHaveBeenCalledWith('_utkozesek/arlista.2026-11-18T10-00-00.000Z.json');
  });

  it('az Elrejtés után ugyanebben a futásban újramountolva sem jelenik meg, és a vizsgálat nem fut újra', async () => {
    const { storage } = tarolo(async () => TETELEK);
    const user = userEvent.setup();
    const { unmount } = renderSav();
    await user.click(await screen.findByRole('button', { name: 'Elrejtés' }));
    expect(screen.queryByText('paciensek/Kovacs-Janos_abc123 (1)')).toBeNull();
    unmount();

    renderSav();

    await waitFor(() => expect(storage.listUtkozesek).toHaveBeenCalledOnce());
    expect(screen.queryByRole('button', { name: 'Elrejtés' })).toBeNull();
  });

  it('üres listánál nincs sáv', async () => {
    const { storage } = tarolo(async () => []);
    renderSav();

    await waitFor(() => expect(storage.listUtkozesek).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Elrejtés' })).toBeNull();
  });

  it('ha a vizsgálat hibázik, a sáv csendben elmarad', async () => {
    const { storage } = tarolo(async () => {
      throw new Error('EACCES');
    });
    renderSav();

    await waitFor(() => expect(storage.listUtkozesek).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Elrejtés' })).toBeNull();
    expect(screen.queryByText(/EACCES/)).toBeNull();
  });
});
