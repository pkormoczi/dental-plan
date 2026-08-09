import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import ItemPicker from './ItemPicker';
import type { Tetel } from '../../domain/types';

function tetel(id: string, nevHu: string): Tetel {
  return {
    id,
    kategoriaId: 'k02',
    sorrend: 1,
    aktiv: true,
    gyakori: false,
    nev: { hu: nevHu, de: null },
    ar: { HUF: { tipus: 'FIX', ertek: 1000 }, EUR: null },
  };
}

const available: Tetel[] = [tetel('t1', 'Gyökértömés'), tetel('t2', 'Esztétikus tömés')];

function renderPicker(props: Partial<React.ComponentProps<typeof ItemPicker>> = {}) {
  const onPick = vi.fn();
  const utils = render(
    <Theme>
      <ItemPicker
        available={available}
        catName={() => 'Tömések'}
        currency="HUF"
        nyelv="hu"
        onPick={onPick}
        {...props}
      />
    </Theme>,
  );
  return { ...utils, onPick };
}

describe('ItemPicker', () => {
  it('inline (alap) mód: gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a fókuszt', async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'gyoker');
    await screen.findByText('Gyökértömés');
    await user.keyboard('{Enter}');

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    await waitFor(() => expect(input).toHaveValue(''));
    expect(input).toHaveFocus();
  });

  it('autoFocus: true esetén a mező rögtön fókuszt kap', () => {
    renderPicker({ autoFocus: true });
    expect(screen.getByPlaceholderText(/Tétel keresése/)).toHaveFocus();
  });

  it('clearOnPick: false esetén választás után a mező NEM ürül ki (a hívó úgyis eltünteti a komponenst)', async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ clearOnPick: false });

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'eszt');
    await screen.findByText('Esztétikus tömés');
    await user.keyboard('{Enter}');

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }));
    expect(input).toHaveValue('eszt');
  });

  it('floating: "portal" esetén a találati lista portálon is megjelenik és kattinthatóan választ', async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ floating: 'portal' });

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'gyoker');
    const talalat = await screen.findByText('Gyökértömés');
    await user.click(talalat);

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });
});
