// Az `EgyediVegosszegBlokk` izolált komponensteszte -- kiemelve a
// `PlanEditorPage.test.tsx`-ből (lásd ott a fejléc-kommentet), a
// `tervReszletei/FazisokBlokk.test.tsx` mintáján: a komponens tisztán
// prezentációs (nincs storage-/router-függősége), ezért önállóan
// renderelhető `<Theme>` alatt. A `Wrapper` a hívó (`PlanEditorPage.tsx`)
// `onChange={(next) => updatePlan(...)}` huzalozását szimulálja lokális
// state-tel.

import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import EgyediVegosszegBlokk from './EgyediVegosszegBlokk';

function Wrapper({ sorszintuOsszeg }: { sorszintuOsszeg: number }) {
  const [kedvezmenyOsszeg, setKedvezmenyOsszeg] = useState<number | null>(null);
  return (
    <EgyediVegosszegBlokk
      sorszintuOsszeg={sorszintuOsszeg}
      currency="HUF"
      nyelv="hu"
      kedvezmenyOsszeg={kedvezmenyOsszeg}
      onChange={setKedvezmenyOsszeg}
    />
  );
}

function renderBlokk(sorszintuOsszeg: number) {
  return render(
    <Theme>
      <Wrapper sorszintuOsszeg={sorszintuOsszeg} />
    </Theme>,
  );
}

// D69 (redesign DP-046): az alku lezárásakor a doki eddig fejben osztotta
// vissza a sorokat, hogy a papíron kerek végösszeg jöjjön ki -- a mező
// mostantól felár-irányban is állítható, üresen/autofókuszálva indul, és a
// teljes elengedést (0) explicit megerősítéshez köti.
describe('az egyedi végösszeg kapcsoló (D69)', () => {
  it('bekapcsoláskor a mező üres és azonnal fókuszban van, nem a jelenlegi végösszeg', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    expect(screen.queryByLabelText('Egyedi végösszeg')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));

    const cel = await screen.findByLabelText('Egyedi végösszeg');
    expect(cel).toHaveValue('');
    expect(cel).toHaveFocus();
  });

  it('kisebb cél végösszeg beírása után a "→ kedvezmény" sor az összevont értéket mutatja', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
    const cel = await screen.findByLabelText('Egyedi végösszeg');
    await user.type(cel, '20000');
    await user.tab();

    expect(await screen.findByText(/→ 5000 Ft kedvezmény/)).toBeInTheDocument();
    expect(screen.queryByText(/Add meg az egyedi végösszeget/)).not.toBeInTheDocument();
  });

  it('a sorok összege fölé írt cél felárat ad, nincs felső korlát (D69, 2. döntés)', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
    const cel = await screen.findByLabelText('Egyedi végösszeg');
    await user.type(cel, '30000');
    await user.tab();

    expect(cel).toHaveValue('30000');
    expect(await screen.findByText(/→ 5000 Ft felár/)).toBeInTheDocument();
  });

  it('0 cél végösszeg megerősítést kér, Mégse esetén nem alkalmazódik', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
    const cel = await screen.findByLabelText('Egyedi végösszeg');
    await user.type(cel, '0');
    await user.tab();

    expect(await screen.findByText(/teljes elengedését/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mégse' }));

    await waitFor(() => expect(screen.queryByText(/teljes elengedését/)).not.toBeInTheDocument());
    expect(screen.queryByText(/→ .* kedvezmény/)).not.toBeInTheDocument();
  });

  it('0 cél végösszeg megerősítve nullázza a mezőt, 0→más→0 váltás újra kérdez', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
    const cel = await screen.findByLabelText('Egyedi végösszeg');
    await user.type(cel, '0');
    await user.tab();
    await user.click(await screen.findByRole('button', { name: 'Megerősítem' }));

    // 0 cél = a teljes 25 000 Ft-os sorösszeg mint kedvezmény.
    expect(await screen.findByText(/→ 25.000 Ft kedvezmény/)).toBeInTheDocument();

    await user.clear(cel);
    await user.type(cel, '10000');
    await user.tab();
    expect(await screen.findByText(/→ 15.000 Ft kedvezmény/)).toBeInTheDocument();

    // 0 → más → 0: a megerősítés elévült, újra kérdez.
    await user.clear(cel);
    await user.type(cel, '0');
    await user.tab();
    expect(await screen.findByText(/teljes elengedését/)).toBeInTheDocument();
  });

  it('üres, kötelező mező hibája csak blur után jelenik meg, nem a bekapcsolás pillanatában (D521)', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
    expect(screen.queryByText(/Add meg az egyedi végösszeget/)).not.toBeInTheDocument();

    await user.tab();
    expect(await screen.findByText(/Add meg az egyedi végösszeget/)).toBeInTheDocument();
  });
});
