// A páciens master <-> terv-piszkozat mezőszintű összevető dialógus --
// backlog-40.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import TorzsadatDiffDialog from './TorzsadatDiffDialog';
import { masterSnapshotDiff } from '../domain/masterSnapshotDiff';
import type { Paciens } from '../domain/types';

function makePaciens(overrides: Partial<Paciens> = {}): Paciens {
  return {
    nev: 'Kovács János',
    szuletesiIdo: '1978-03-14',
    lakcim: '1113 Budapest, Bartók Béla út 42. 2/5',
    telefon: '+36 30 123 4567',
    email: 'kovacs.janos@example.hu',
    taj: '123 456 789',
    kiskoru: false,
    torvenyesKepviselo: null,
    ...overrides,
  };
}

function renderDialog(props: Partial<React.ComponentProps<typeof TorzsadatDiffDialog>> = {}) {
  const master = props.master ?? makePaciens();
  const draft = props.draft ?? makePaciens({ telefon: '+36 70 999 8888', email: 'uj@example.hu' });
  const elteresek = props.elteresek ?? masterSnapshotDiff(master, draft);
  const onOpenChange = vi.fn();
  const utils = render(
    <Theme>
      <TorzsadatDiffDialog
        open
        onOpenChange={onOpenChange}
        irany="draft-to-master"
        elteresek={elteresek}
        master={master}
        draft={draft}
        {...props}
      />
    </Theme>,
  );
  return { ...utils, onOpenChange, master, draft, elteresek };
}

describe('TorzsadatDiffDialog', () => {
  it('nyitáskor egyetlen checkbox sincs bejelölve', async () => {
    renderDialog();
    const dialog = await screen.findByRole('dialog');
    const checkboxok = dialog.querySelectorAll('button[role="checkbox"]');
    // Az "Összes kijelölése" + a 2 eltérő mező checkboxa -- egyik sincs bejelölve.
    expect(checkboxok.length).toBeGreaterThanOrEqual(3);
    checkboxok.forEach((cb) => expect(cb).toHaveAttribute('aria-checked', 'false'));
  });

  it('az "Összes kijelölése" mindet bejelöli', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('checkbox', { name: 'Összes kijelölése' }));

    expect(screen.getByRole('checkbox', { name: 'Telefon' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: 'E-mail' })).toHaveAttribute('aria-checked', 'true');
  });

  it('csak a kijelölt mezőket adja át onApplyToMaster-nek', async () => {
    const user = userEvent.setup();
    const onApplyToMaster = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onApplyToMaster });
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('checkbox', { name: 'Telefon' }));
    await user.click(screen.getByRole('button', { name: 'Törzsadat mentése' }));

    await waitFor(() => expect(onApplyToMaster).toHaveBeenCalledTimes(1));
    const next = onApplyToMaster.mock.calls[0][0] as Paciens;
    expect(next.telefon).toBe('+36 70 999 8888'); // draft értéke, mert draft->master
    expect(next.email).toBe('kovacs.janos@example.hu'); // NEM változott, mert nem volt kijelölve
  });

  it('üres kijelöléssel a mentés gomb inline üzenetet ad, nem hív onApply-t', async () => {
    const user = userEvent.setup();
    const onApplyToMaster = vi.fn();
    renderDialog({ onApplyToMaster });
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Törzsadat mentése' }));

    expect(await screen.findByText('Jelölj ki legalább egy mezőt.')).toBeInTheDocument();
    expect(onApplyToMaster).not.toHaveBeenCalled();
  });

  it('master->draft irányban a kijelölt mezőket a masterből viszi a draftba', async () => {
    const user = userEvent.setup();
    const onApplyToDraft = vi.fn();
    const master = makePaciens({ telefon: '+36 30 000 0000' });
    const draft = makePaciens({ telefon: '+36 70 999 8888' });
    renderDialog({
      irany: 'master-to-draft',
      master,
      draft,
      elteresek: masterSnapshotDiff(master, draft),
      onApplyToDraft,
    });
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('checkbox', { name: 'Telefon' }));
    await user.click(screen.getByRole('button', { name: 'Frissítés a piszkozatban' }));

    expect(onApplyToDraft).toHaveBeenCalledWith(expect.objectContaining({ telefon: '+36 30 000 0000' }));
  });

  it('írási hiba esetén nyitva marad, Callout + Újra/Mégse jelenik meg (kézi mód)', async () => {
    const user = userEvent.setup();
    const onApplyToMaster = vi.fn().mockRejectedValueOnce(new Error('Megtelt a tárhely.'));
    renderDialog({ onApplyToMaster });
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('checkbox', { name: 'Telefon' }));
    await user.click(screen.getByRole('button', { name: 'Törzsadat mentése' }));

    expect(await screen.findByText('Megtelt a tárhely.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Újra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mégse' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('lépés-elhagyási (skip) módban íráshiba esetén "Folytatás írás nélkül" jelenik meg, ami onSkip-et hívja', async () => {
    const user = userEvent.setup();
    const onApplyToMaster = vi.fn().mockRejectedValueOnce(new Error('Hiba.'));
    const onSkip = vi.fn();
    renderDialog({ onApplyToMaster, onSkip });
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('checkbox', { name: 'Telefon' }));
    await user.click(screen.getByRole('button', { name: /Frissítés és tovább/ }));

    await screen.findByText('Hiba.');
    await user.click(screen.getByRole('button', { name: 'Folytatás írás nélkül' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('skip módban a "Kihagyás, tovább lépek" gomb onSkip-et hív, írás nélkül', async () => {
    const user = userEvent.setup();
    const onApplyToMaster = vi.fn();
    const onSkip = vi.fn();
    renderDialog({ onApplyToMaster, onSkip });
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Kihagyás, tovább lépek' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onApplyToMaster).not.toHaveBeenCalled();
  });

  it('sikeres draft->master írás után (skip mód nélkül) bezárja a dialógust', async () => {
    const user = userEvent.setup();
    const onApplyToMaster = vi.fn().mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ onApplyToMaster });
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('checkbox', { name: 'Telefon' }));
    await user.click(screen.getByRole('button', { name: 'Törzsadat mentése' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
