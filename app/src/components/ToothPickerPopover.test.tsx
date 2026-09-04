import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import ToothPickerPopover from './ToothPickerPopover';
import type { FogterkepAllapot } from '../domain/toothVisual';

function makeAllapot(): FogterkepAllapot {
  return { fogak: new Map(), tejfogak: [], ismeretlen: [], hianyzoTetel: false, jelmagyarazat: [] };
}

function renderPicker(fogak: string) {
  const onChange = vi.fn();
  const utils = render(
    <Theme>
      <ToothPickerPopover fogak={fogak} allapot={makeAllapot()} onChange={onChange} />
    </Theme>,
  );
  return { ...utils, onChange };
}

describe('ToothPickerPopover', () => {
  it('megnyitáskor a fogtérkép (listbox) látszik, kattintásra hozzáadja a fogat', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker('');

    await user.click(screen.getByRole('button', { name: /Fogak kijelölése/ }));
    const chart = await screen.findByRole('listbox');
    const tooth = chart.querySelector('[data-tooth="16"]') as Element;
    await user.click(tooth);

    expect(onChange).toHaveBeenCalledWith('16');
  });

  it('már kijelölt fogra kattintva kikapcsolja (üresre vált)', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker('16');

    await user.click(screen.getByRole('button', { name: /Fogak kijelölése/ }));
    const chart = await screen.findByRole('listbox');
    const tooth = chart.querySelector('[data-tooth="16"]') as Element;
    expect(tooth).toHaveAttribute('aria-selected', 'true');
    await user.click(tooth);

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('szabadszöveges mezőnél (pl. "jobb felső") figyelmeztet, nem cseréli némán a fogtérképre', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker('jobb felső');

    await user.click(screen.getByRole('button', { name: /Fogak kijelölése/ }));
    await screen.findByText(/szabad szöveget tartalmaz/);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mező kiürítése/ }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('üres mezőnél NEM szabadszöveg-figyelmeztetés, hanem az üres (kijelöletlen) fogtérkép jelenik meg', async () => {
    const user = userEvent.setup();
    renderPicker('');

    await user.click(screen.getByRole('button', { name: /Fogak kijelölése/ }));
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.queryByText(/szabad szöveget tartalmaz/)).not.toBeInTheDocument();
  });

  it('a billentyűzetes kurzor a MÁR kijelölt fogon indul -- kombinált eset, is-active ÉS is-picked egyszerre', async () => {
    const user = userEvent.setup();
    renderPicker('16');

    await user.click(screen.getByRole('button', { name: /Fogak kijelölése/ }));
    const chart = await screen.findByRole('listbox');
    expect(chart).toHaveAttribute('aria-activedescendant', 'tooth-16');
    const tooth = chart.querySelector('[data-tooth="16"]') as Element;
    expect(tooth).toHaveClass('is-active');
    expect(tooth).toHaveClass('is-picked');
    expect(tooth.innerHTML).toContain('tooth-kurzor-kontraszt');
    expect(tooth.innerHTML).toContain('tooth-kurzor"');
  });
});
