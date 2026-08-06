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
});
