// A felirat nélküli ikon-gomb szerződése: a tooltip nem opcionális dísz, hanem
// az EGYETLEN mód, ahogy az egérrel dolgozó doki kattintás előtt megtudja, mit
// tesz a gomb. A `Theme` adja a `TooltipProvider`-t (az appban az App.tsx).

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownMenu, Theme } from '@radix-ui/themes';
import { describe, expect, it } from 'vitest';
import IkonGomb from './IkonGomb';

function renderTemaban(ui: React.ReactElement) {
  return render(<Theme>{ui}</Theme>);
}

describe('IkonGomb', () => {
  it('a gomb fölé érve megjelenik a magyarázó szöveg', async () => {
    const user = userEvent.setup();
    renderTemaban(<IkonGomb cimke="Sor törlése">x</IkonGomb>);

    await user.hover(screen.getByRole('button', { name: 'Sor törlése' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Sor törlése');
  });

  it('letiltott gombnál is megjelenik, és az okot mondja -- a wrapper nem lesz Tab-megálló', async () => {
    const user = userEvent.setup();
    renderTemaban(
      <IkonGomb cimke="Fázis feljebb — ez már a legelső fázis" ariaLabel="Fázis feljebb" disabled>
        x
      </IkonGomb>,
    );

    const gomb = screen.getByRole('button', { name: 'Fázis feljebb' });
    expect(gomb).toBeDisabled();

    // A letiltott gomb nem kap egérmozgás-eseményt -- a tooltip triggere a
    // körülölelő <span>, ami viszont nem kap tabIndexet.
    const wrapper = gomb.parentElement!;
    expect(wrapper).not.toHaveAttribute('tabindex');

    await user.hover(wrapper);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('ez már a legelső fázis');
  });

  // Az árlista csillag/szem gombja állapotfüggő magyarázatot kap: a tooltip a
  // KÖVETKEZŐ hatást mondja, tehát az állapotváltással együtt kell váltania --
  // az `ariaLabel` pedig ettől függetlenül viszi a sornév-előtagot.
  it('a magyarázat az állapottal együtt vált', async () => {
    const user = userEvent.setup();
    const csillag = (gyakori: boolean) => (
      <IkonGomb
        cimke={gyakori ? 'Gyakori jelölés törlése' : 'Megjelölés gyakorinak'}
        ariaLabel={gyakori ? 'CBCT gyakori jelölés törlése' : 'CBCT megjelölése gyakorinak'}
      >
        ★
      </IkonGomb>
    );
    const { rerender } = renderTemaban(csillag(false));

    await user.hover(screen.getByRole('button', { name: 'CBCT megjelölése gyakorinak' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Megjelölés gyakorinak');

    rerender(<Theme>{csillag(true)}</Theme>);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Gyakori jelölés törlése');
    expect(screen.getByRole('button', { name: 'CBCT gyakori jelölés törlése' })).toBeInTheDocument();
  });

  it('menü-trigger gyerekeként kattintásra továbbra is nyit', async () => {
    const user = userEvent.setup();
    renderTemaban(
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IkonGomb cimke="További műveletek — sor mozgatása" ariaLabel="1. sor — további műveletek">
            ⋯
          </IkonGomb>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Feljebb</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );

    await user.click(screen.getByRole('button', { name: '1. sor — további műveletek' }));

    expect(await screen.findByRole('menuitem', { name: 'Feljebb' })).toBeInTheDocument();
  });
});
