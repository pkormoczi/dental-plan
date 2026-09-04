import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import NumberField from './NumberField';

describe('NumberField', () => {
  it('does not commit while typing -- only on blur', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={100} onCommit={onCommit} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '250');

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits the parsed value on blur', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={100} onCommit={onCommit} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '250');
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith(250);
  });

  it('commits on Enter without requiring a blur', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={100} onCommit={onCommit} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '250{Enter}');

    expect(onCommit).toHaveBeenCalledWith(250);
  });

  it('P0-4: an emptied field reverts to the last known value instead of committing 0', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={100} onCommit={onCommit} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('100');
  });

  it('a value below `min` reverts instead of committing', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={5} onCommit={onCommit} min={1} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '0');
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('5');
  });

  it('Escape reverts the draft without committing', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={100} onCommit={onCommit} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '999');
    await user.keyboard('{Escape}');

    expect(input.value).toBe('100');
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('P0-5: unit="EUR" displays euros but commits cents', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={82500} onCommit={onCommit} unit="EUR" />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('825,00');

    await user.clear(input);
    await user.type(input, '825,50');
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith(82550);
  });

  it('null value displays as empty rather than "0"', () => {
    render(<NumberField value={null} onCommit={vi.fn()} unit="EUR" placeholder="—" />);
    const input = screen.getByPlaceholderText('—') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('ArrowUp/ArrowDown step the value and commit immediately, without needing blur', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={5} onCommit={onCommit} min={1} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.focus();
    await user.keyboard('{ArrowUp}');
    expect(input.value).toBe('6');
    expect(onCommit).toHaveBeenLastCalledWith(6);

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input.value).toBe('4');
    expect(onCommit).toHaveBeenLastCalledWith(4);
  });

  it('ArrowDown does not step below `min`', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={1} onCommit={onCommit} min={1} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.focus();
    await user.keyboard('{ArrowDown}');

    expect(input.value).toBe('1');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('the up/down stepper buttons step without stealing focus from the input', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={5} onCommit={onCommit} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.focus();
    await user.click(screen.getByRole('button', { name: 'Növelés' }));

    expect(input.value).toBe('6');
    expect(onCommit).toHaveBeenCalledWith(6);
    expect(input).toHaveFocus();
  });

  it('re-syncs the display after blur when the parent commits a different value (e.g. clamped)', async () => {
    // Regresszió: a szülő (pl. az Előleg % mező,
    // pages/planEditor/ElolegBlokk.tsx) a saját kerekített értéket tovább clampelheti egy
    // szűkebb tartományra, és egy ELTÉRŐ `value` prop-pal rendereli újra a
    // mezőt. Blur UTÁN a mezőnek ezt az új, tényleges értéket kell
    // mutatnia, nem a begépelt (clamp előtti) számot.
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { rerender } = render(<NumberField value={50} onCommit={onCommit} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '150');
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith(150);

    rerender(<NumberField value={100} onCommit={onCommit} />);

    expect(input.value).toBe('100');
  });

  it('reports the not-yet-committed draft via onDraftChange on every keystroke', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    render(<NumberField value={1} onCommit={vi.fn()} onDraftChange={onDraftChange} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '3');

    expect(onDraftChange).toHaveBeenLastCalledWith(3);
  });

  it('selects the entire content on focus', () => {
    render(<NumberField value={24000} onCommit={vi.fn()} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.focus();

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('typing over the focus-selected content replaces it instead of appending', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField value={24000} onCommit={onCommit} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.focus();
    await user.keyboard('28000');

    expect(input.value).toBe('28000');
  });

  it('autoFocus-mounted fields are already selected on the first focus', () => {
    render(<NumberField value={5000} onCommit={vi.fn()} autoFocus />);

    const input = screen.getByRole('textbox') as HTMLInputElement;

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('an empty field has nothing to select on focus', () => {
    render(<NumberField value={null} onCommit={vi.fn()} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.focus();

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(0);
  });
});
