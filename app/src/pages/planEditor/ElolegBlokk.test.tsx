// Az `ElolegBlokk` izolált komponensteszte -- kiemelve a
// `PlanEditorPage.test.tsx`-ből (lásd ott a fejléc-kommentet), a
// `tervReszletei/FazisokBlokk.test.tsx` mintáján: a komponens tisztán
// prezentációs (nincs storage-/router-függősége), ezért önállóan
// renderelhető `<Theme>` alatt. A `Wrapper` a hívó (`PlanEditorPage.tsx`)
// `onChange={(next) => updatePlan(...)}` huzalozását szimulálja lokális
// state-tel, hogy a komponens saját `useEffect`-je (a prop-változást
// követő szinkronizálás) ugyanúgy működjön, mint éles használatban.

import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ElolegBlokk from './ElolegBlokk';

function Wrapper({ grand, initial }: { grand: number; initial?: number | null }) {
  const [elolegOsszeg, setElolegOsszeg] = useState<number | null>(initial ?? null);
  return (
    <ElolegBlokk
      grand={grand}
      currency="HUF"
      nyelv="hu"
      elolegOsszeg={elolegOsszeg}
      onChange={setElolegOsszeg}
    />
  );
}

function renderBlokk(grand: number, initial?: number | null) {
  return render(
    <Theme>
      <Wrapper grand={grand} initial={initial} />
    </Theme>,
  );
}

// backlog-9: a doki eddig fejben osztotta ki az előleget és kézzel írta
// a papír aljára; az előleg mostantól abszolút összeg, nem százalék.
describe('az előleg-kapcsoló (abszolút összeg)', () => {
  it('bekapcsoláskor üresen, fókuszáltan jelenik meg, előtöltés nélkül', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    // Alapból nincs előleg-blokk, csak a kapcsoló.
    expect(screen.queryByLabelText('Előleg összege')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));

    const osszeg = await screen.findByLabelText('Előleg összege');
    expect(osszeg).toHaveValue('');
    expect(osszeg).toHaveFocus();
  });

  it('összeg beírása után a fennmaradó rész a fizetendőből számol', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
    const osszeg = await screen.findByLabelText('Előleg összege');
    // 25 000 Ft végösszeg -> 12 500 Ft előleg, 12 500 Ft fennmaradó.
    await user.type(osszeg, '12500');
    await user.tab();

    expect(await screen.findByText('12 500 Ft')).toBeInTheDocument();
    expect(screen.queryByText(/Add meg az előleg összegét/)).not.toBeInTheDocument();
  });

  it('explicit 0 beírása után blur/Enterre a kapcsoló automatikusan kikapcsol', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
    const osszeg = await screen.findByLabelText('Előleg összege');
    await user.type(osszeg, '0');
    await user.tab();

    await waitFor(() =>
      expect(screen.queryByLabelText('Előleg összege')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ })).not.toBeChecked();
  });

  it('kötelező-mező hiba csak blur után jelenik meg, bekapcsoláskor még nem', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
    expect(screen.queryByText(/Add meg az előleg összegét/)).not.toBeInTheDocument();

    const osszeg = await screen.findByLabelText('Előleg összege');
    await user.click(osszeg);
    await user.tab();

    expect(await screen.findByText(/Add meg az előleg összegét/)).toBeInTheDocument();
  });

  it('a fizetendőt meghaladó előleg inline hard errort ad, az érték nem vágódik le', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
    const osszeg = await screen.findByLabelText('Előleg összege');
    // 25 000 Ft a fizetendő, 30 000 Ft-ot írunk be.
    await user.type(osszeg, '30000');
    await user.tab();

    expect(await screen.findByText(/Az előleg nagyobb, mint a fizetendő/)).toBeInTheDocument();
    expect(osszeg).toHaveValue('30000');
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

// A doki gyakran arányban állapodik meg a pácienssel, nem összegben -- ez a
// módváltó egy beviteli segéd, a `Plan`-en változatlanul az abszolút összeg
// marad az egyetlen tárolt érték.
describe('az előleg-kapcsoló Ft/% módváltója', () => {
  it('módváltáskor a %-mező üresen, fókuszáltan jelenik meg, a meglévő összeg változatlan marad', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
    const osszeg = await screen.findByLabelText('Előleg összege');
    await user.type(osszeg, '10000');
    await user.tab();
    expect(await screen.findByText('15 000 Ft')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '%' }));

    const szazalek = await screen.findByLabelText('Előleg százaléka');
    expect(szazalek).toHaveValue('');
    await waitFor(() => expect(szazalek).toHaveFocus());
    // Az elolegOsszeg és a fennmaradó rész nem mozdul, amíg nincs commit.
    expect(screen.getByText('10 000 Ft')).toBeInTheDocument();
    expect(screen.getByText('15 000 Ft')).toBeInTheDocument();

    await user.tab();
    // Puszta módváltás + kilépés nem írja át az összeget.
    expect(screen.getByText('10 000 Ft')).toBeInTheDocument();
    expect(screen.getByText('15 000 Ft')).toBeInTheDocument();
  });

  it('a százalékból számolt összeg felfelé kerekedik a legközelebbi ezerre', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
    await user.click(screen.getByRole('radio', { name: '%' }));

    const szazalek = await screen.findByLabelText('Előleg százaléka');
    // 25 000 Ft fizetendő 30%-a 7500 -> felkerekítve 8000 Ft.
    await user.type(szazalek, '30');
    await user.tab();

    // hu-HU Intl-formázás: 4-jegyű összegnél (8000) nincs ezres elválasztó.
    expect(await screen.findByText('8000 Ft')).toBeInTheDocument();
    expect(screen.getByText('17 000 Ft')).toBeInTheDocument();
  });

  it('0% beírása után blur/Enterre a kapcsoló automatikusan kikapcsol', async () => {
    const user = userEvent.setup();
    renderBlokk(25000);

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
    await user.click(screen.getByRole('radio', { name: '%' }));

    const szazalek = await screen.findByLabelText('Előleg százaléka');
    await user.type(szazalek, '0');
    await user.tab();

    await waitFor(() =>
      expect(screen.queryByLabelText('Előleg százaléka')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ })).not.toBeChecked();
  });

  it('a felkerekítés miatt a fizetendő fölé kerülő összeg a meglévő hard errort váltja ki', async () => {
    const user = userEvent.setup();
    // A lapszintű teszt itt egy 20001 Ft-os listaárat állított be kézzel
    // (25000 -> 20001) -- izoláltan egyszerűbb egyenesen 20001-es
    // fizetendővel indítani, ugyanazzal a felkerekítési hatással.
    renderBlokk(20001);

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
    await user.click(screen.getByRole('radio', { name: '%' }));

    const szazalek = await screen.findByLabelText('Előleg százaléka');
    await user.type(szazalek, '100');
    await user.tab();

    expect(await screen.findByText(/Az előleg nagyobb, mint a fizetendő/)).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('kezelési sor nélkül nincs módváltó, csak a magyarázó szöveg', async () => {
    const user = userEvent.setup();
    renderBlokk(0);

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));

    expect(screen.queryByRole('radio', { name: '%' })).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Százalékos megadás kezelési sorok felvétele után/),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('Előleg összege')).toBeInTheDocument();
  });
});
