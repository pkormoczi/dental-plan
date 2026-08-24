// A legkritikusabb UX-pont tesztje (lásd CLAUDE.md "A UX kritikus pontja"):
// gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a fókuszt ->
// gépel tovább, egérhasználat nélkül.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import PlanEditorPage from './PlanEditorPage';
import { TestProviders } from '../testUtils';
import { createBlankPlan } from '../domain/blankPlan';
import { formatMoney } from '../domain/money';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';

function renderEditor() {
  return render(
    <TestProviders>
      <PlanEditorPage />
    </TestProviders>,
  );
}

/**
 * Egy német tervhez szükséges beállítás + egy árlista, amiben pontosan egy
 * tételnek ("Fogeltávolítás") van német neve -- a többi 117-nek nincs. Ezt a
 * localStorage-ot MIELŐTT a StorageProvider renderelne kell beírni, mert a
 * DemoStorage.init() az árlista hiányában resetDemoData()-t futtatna, ami
 * felülírná ezt az egyedi seedet.
 */
function seedGermanPlanWithOneTranslatedItem() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) =>
      x.nev.hu === 'Fogeltávolítás'
        ? { ...x, nev: { ...x.nev, de: 'Zahnextraktion' } }
        : { ...x, nev: { ...x.nev, de: null } },
    ),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem(
    'dp:beallitasok.json',
    JSON.stringify({ ...seedSettings, alapertelmezettNyelv: 'de' }),
  );
}

/** Egy árlista, amiben egyetlen tételnek sincs EUR ára. */
function seedWithNoEurPrices() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) => ({ ...x, ar: { ...x.ar, EUR: null } })),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
}

/**
 * ÉRINTETLEN árlista -- a `seedWithNoEurPrices`-tól eltérően itt minden
 * tételnek megvan az EUR ára, hogy egy EUR pénznemű terv szerkesztőjében
 * ténylegesen fel lehessen venni beárazott tételt (backlog-5).
 */
function seedWithIntactPriceList() {
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
}

/**
 * Egy piszkozat, aminek van egy "Fogeltávolítás" (t041, mai HUF ára 25000)
 * sora, elavult listaárral (20000) -- a backlog-61 ár-frissítés tesztjeihez.
 * Az érintetlen árlista/beállítás mellé, a DraftStorage `dp:piszkozat`
 * rekord-alakjában (DemoDraftStorage.ts `save()` mintája), MIELŐTT a
 * StorageProvider renderelne.
 */
function seedWithStalePriceRow() {
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
  const plan = createBlankPlan(seedSettings, seedPriceList);
  plan.paciens.nev = 'Teszt Elek';
  plan.fazisok[0].sorok.push({
    tetelId: 't041',
    nevSnapshot: 'Fogeltávolítás',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 20000,
    tenylegesEgysegar: 20000,
  });
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({ schemaVersion: 1, mentve: new Date().toISOString(), plan }),
  );
}

describe('PlanEditorPage -- billentyűzetes tételfelvitel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('accent-independent search + arrow + enter adds a line, clears and refocuses the box', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);

    // Ékezetfüggetlen keresés (D19): "gyoker" -> "Gyökértömés..."
    await user.type(search, 'gyoker');
    await screen.findByText('Gyökértömés csatornaszámtól függően');

    await user.keyboard('{ArrowDown}{Enter}');

    // A kereső kiürül és visszakapja a fókuszt -- ez a ciklus lényege.
    await waitFor(() => expect(search).toHaveValue(''));
    expect(search).toHaveFocus();

    // A tétel bekerült a fázis soraiba (a dropdown már bezárult, egyetlen
    // találat) -- a sornév backlog-3 óta szerkeszthető mező, tehát az
    // értéke `getByDisplayValue`-val ellenőrizhető, nem `getByText`-tel.
    expect(screen.getByDisplayValue('Gyökértömés csatornaszámtól függően')).toBeInTheDocument();

    // Tovább lehet gépelni azonnal -- második tétel hozzáadása ugyanazzal a
    // ciklussal. A "tomes 3" kifejezetten a "3 felszín" változatra illik rá
    // (van 1/2/3 felszínes testvér-tétel is), így Enter az első (egyetlen)
    // találatot adja hozzá, ArrowDown nélkül is.
    await user.type(search, 'tomes 3');
    await screen.findByText('Esztétikus tömés 3 felszín');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(search).toHaveValue(''));
    expect(screen.getByDisplayValue('Esztétikus tömés 3 felszín')).toBeInTheDocument();
  });

  it('shows a SAVOS (sávos) price range and lets the actual price be edited from the min', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'gyokerto');
    const result = await screen.findByText('Gyökértömés csatornaszámtól függően');
    await user.click(result);

    // A hozzáadott sor tényleges ára a min értékre inicializálódik (38 000 Ft).
    const actualPriceInputs = screen.getAllByDisplayValue('38000');
    expect(actualPriceInputs.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Becsült ár', pressed: true })).toBeInTheDocument();
  });

  it('shows a discount indicator when the actual price is lowered below the list price (editor-only, D9)', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    const result = await screen.findByText('Fogeltávolítás');
    await user.click(result);
    // A tétel felvétele után a kereső egy requestAnimationFrame-ben kapja
    // vissza a fókuszt (lásd ItemPicker.commit) -- ezt itt be kell várni,
    // különben a lenti mezőre kattintás UTÁN futhat le, ellopva a fókuszt,
    // ami blurt (és a blur-re commitáló NumberField miatt egy "revert"-et)
    // váltana ki a még be sem fejezett gépelés közepén.
    await waitFor(() => expect(search).toHaveValue(''));

    const actualPriceInput = screen.getByDisplayValue('25000');
    await user.clear(actualPriceInput);
    await user.type(actualPriceInput, '20000');
    // A mező blur-re (nem minden leütésre) commitál a törzsadatba -- P0-4/P1-4.
    await user.tab();

    // A pontos jel egy speciális mínuszkarakter (U+2212), ezért a
    // mennyiséget és a %-ot nézzük, nem a karaktert magát.
    expect(await screen.findByText(/20%$/)).toBeInTheDocument();
    // hu-HU Intl-formázás: 4-jegyű összegeknél (itt 5000) nincs ezres
    // elválasztó, csak 5+ jegynél -- lásd domain/money.test.ts.
    expect(await screen.findByText(/Kedvezmény: 5000 Ft/)).toBeInTheDocument();
  });

  it('shows a surcharge indicator when the actual price is raised above the list price', async () => {
    // A fenti kedvezmény-teszt tükre (backlog-12, 4. döntés): a "Tényleges ár"
    // mezőnek nincs felső korlátja, a felfelé eltérést a szerkesztő korábban
    // némán elnyelte -- a nyomtatvány viszont mostantól mindkét irányban
    // megmutatja a "Kezelések összege" referenciasort.
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    const result = await screen.findByText('Fogeltávolítás');
    await user.click(result);
    await waitFor(() => expect(search).toHaveValue(''));

    const actualPriceInput = screen.getByDisplayValue('25000');
    await user.clear(actualPriceInput);
    await user.type(actualPriceInput, '30000');
    await user.tab();

    expect(await screen.findByText(/Felár: 5000 Ft/)).toBeInTheDocument();
    expect(screen.queryByText(/Kedvezmény:/)).not.toBeInTheDocument();
  });

  // backlog-9/D66: a doki eddig fejben osztotta ki az előleget és kézzel
  // írta a papír aljára; az előleg mostantól abszolút összeg, nem százalék.
  describe('az előleg-kapcsoló (D66: abszolút összeg)', () => {
    async function felvesz(user: ReturnType<typeof userEvent.setup>) {
      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));
    }

    it('bekapcsoláskor üresen, fókuszáltan jelenik meg, előtöltés nélkül (D517)', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      // Alapból nincs előleg-blokk, csak a kapcsoló.
      expect(screen.queryByLabelText('Előleg összege')).not.toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));

      const osszeg = await screen.findByLabelText('Előleg összege');
      expect(osszeg).toHaveValue('');
      expect(osszeg).toHaveFocus();
    });

    it('összeg beírása után a fennmaradó rész a fizetendőből számol', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
      const osszeg = await screen.findByLabelText('Előleg összege');
      // 25 000 Ft végösszeg -> 12 500 Ft előleg, 12 500 Ft fennmaradó.
      await user.type(osszeg, '12500');
      await user.tab();

      expect(await screen.findByText('12 500 Ft')).toBeInTheDocument();
      expect(screen.queryByText(/Add meg az előleg összegét/)).not.toBeInTheDocument();
    });

    it('explicit 0 beírása után blur/Enterre a kapcsoló automatikusan kikapcsol (D519)', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
      const osszeg = await screen.findByLabelText('Előleg összege');
      await user.type(osszeg, '0');
      await user.tab();

      await waitFor(() =>
        expect(screen.queryByLabelText('Előleg összege')).not.toBeInTheDocument(),
      );
      expect(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ })).not.toBeChecked();
    });

    it('kötelező-mező hiba csak blur után jelenik meg, bekapcsoláskor még nem (D518)', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));
      expect(screen.queryByText(/Add meg az előleg összegét/)).not.toBeInTheDocument();

      const osszeg = await screen.findByLabelText('Előleg összege');
      await user.click(osszeg);
      await user.tab();

      expect(await screen.findByText(/Add meg az előleg összegét/)).toBeInTheDocument();
    });

    it('a fizetendőt meghaladó előleg inline hard errort ad, az érték nem vágódik le (D326)', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

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

  // A doki gyakran arányban állapodik meg a pácienssel, nem összegben --
  // ez a módváltó egy beviteli segéd, a `Plan`-en változatlanul az
  // abszolút összeg marad az egyetlen tárolt érték.
  describe('az előleg-kapcsoló Ft/% módváltója', () => {
    async function felvesz(user: ReturnType<typeof userEvent.setup>) {
      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));
    }

    it('módváltáskor a %-mező üresen, fókuszáltan jelenik meg, a meglévő összeg változatlan marad', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

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
      renderEditor();
      await felvesz(user);

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
      renderEditor();
      await felvesz(user);

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
      renderEditor();
      await felvesz(user);

      // A listaár 25 000 Ft -- egy nem 1000-többszörösre írjuk át, hogy
      // 100%-nál a felkerekítés ténylegesen a fizetendő FÖLÉ vigyen.
      const actualPriceInput = screen.getByDisplayValue('25000');
      await user.clear(actualPriceInput);
      await user.type(actualPriceInput, '20001');
      await user.tab();

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
      renderEditor();
      // Nincs tétel felvéve -- csak megvárjuk, hogy az app betöltsön.
      await screen.findByPlaceholderText(/Tétel keresése/);

      await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));

      expect(screen.queryByRole('radio', { name: '%' })).not.toBeInTheDocument();
      expect(
        await screen.findByText(/Százalékos megadás kezelési sorok felvétele után/),
      ).toBeInTheDocument();
      expect(await screen.findByLabelText('Előleg összege')).toBeInTheDocument();
    });
  });

  // D69 (redesign DP-046): az alku lezárásakor a doki eddig fejben osztotta
  // vissza a sorokat, hogy a papíron kerek végösszeg jöjjön ki -- a mező
  // mostantól felár-irányban is állítható, üresen/autofókuszálva indul, és a
  // teljes elengedést (0) explicit megerősítéshez köti.
  describe('az egyedi végösszeg kapcsoló (D69)', () => {
    async function felvesz(user: ReturnType<typeof userEvent.setup>) {
      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));
    }

    it('bekapcsoláskor a mező üres és azonnal fókuszban van, nem a jelenlegi végösszeg', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      expect(screen.queryByLabelText('Egyedi végösszeg')).not.toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));

      const cel = await screen.findByLabelText('Egyedi végösszeg');
      expect(cel).toHaveValue('');
      expect(cel).toHaveFocus();
    });

    it('kisebb cél végösszeg beírása után a Summary "Kedvezmény" sora az összevont értéket mutatja', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
      const cel = await screen.findByLabelText('Egyedi végösszeg');
      await user.type(cel, '20000');
      await user.tab();

      expect(await screen.findByText(/→ 5000 Ft kedvezmény/)).toBeInTheDocument();
      expect(screen.getByText(/Kedvezmény: 5000 Ft/)).toBeInTheDocument();
      expect(screen.queryByText(/Add meg az egyedi végösszeget/)).not.toBeInTheDocument();
    });

    it('a sorok összege fölé írt cél felárat ad, nincs felső korlát (D69, 2. döntés)', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
      const cel = await screen.findByLabelText('Egyedi végösszeg');
      await user.type(cel, '30000');
      await user.tab();

      expect(cel).toHaveValue('30000');
      expect(await screen.findByText(/→ 5000 Ft felár/)).toBeInTheDocument();
      expect(screen.getByText(/Felár: 5000 Ft/)).toBeInTheDocument();
    });

    it('0 cél végösszeg megerősítést kér, Mégse esetén nem alkalmazódik', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
      const cel = await screen.findByLabelText('Egyedi végösszeg');
      await user.type(cel, '0');
      await user.tab();

      expect(await screen.findByText(/teljes elengedését/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Mégse' }));

      await waitFor(() => expect(screen.queryByText(/teljes elengedését/)).not.toBeInTheDocument());
      expect(screen.queryByText(/→ .* kedvezmény/)).not.toBeInTheDocument();
    });

    it('0 cél végösszeg megerősítve nullázza a Mindösszesent, 0→más→0 váltás újra kérdez', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
      const cel = await screen.findByLabelText('Egyedi végösszeg');
      await user.type(cel, '0');
      await user.tab();
      await user.click(await screen.findByRole('button', { name: 'Megerősítem' }));

      // 0 cél = a teljes 25 000 Ft-os sorösszeg mint kedvezmény.
      expect(await screen.findByText(/→ 25.000 Ft kedvezmény/)).toBeInTheDocument();
      expect(screen.getAllByText(/^0 Ft$/).length).toBeGreaterThan(0);

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
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /Egyedi végösszeg beállítása/ }));
      expect(screen.queryByText(/Add meg az egyedi végösszeget/)).not.toBeInTheDocument();

      await user.tab();
      expect(await screen.findByText(/Add meg az egyedi végösszeget/)).toBeInTheDocument();
    });
  });

  it('backlog-27: a darabszám automatikusan követi a fogak mezőt, kézi felülbírálásig', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    const result = await screen.findByText('Fogeltávolítás');
    await user.click(result);

    const teethInput = screen.getByPlaceholderText('16, 17, 26');
    const quantityInput = screen.getByRole('textbox', { name: 'Darabszám' });
    await user.type(teethInput, '16, 17');

    await waitFor(() => expect(quantityInput).toHaveValue('2'));
    expect(screen.queryByText(/fog van felsorolva/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Darabszám igazítása a fogakhoz' }),
    ).not.toBeInTheDocument();

    // A doki kézzel felülbírálja -- a sor leválik: megjelenik a figyelmeztetés
    // és a visszakapcsoló ⟳ gomb.
    await user.clear(quantityInput);
    await user.type(quantityInput, '1');
    await user.tab();

    expect(
      await screen.findByText(/2 fog van felsorolva, a darabszám 1\. Szándékos\?/),
    ).toBeInTheDocument();
    const visszakapcsolo = screen.getByRole('button', {
      name: 'Darabszám igazítása a fogakhoz',
    });
    expect(visszakapcsolo).toBeInTheDocument();

    // Visszakapcsolásra azonnal szinkronizál, és a sor újra követ.
    await user.click(visszakapcsolo);
    await waitFor(() => expect(quantityInput).toHaveValue('2'));
    expect(
      screen.queryByRole('button', { name: 'Darabszám igazítása a fogakhoz' }),
    ).not.toBeInTheDocument();

    await user.type(teethInput, ', 26');
    await waitFor(() => expect(quantityInput).toHaveValue('3'));
  });

  it('updates the mismatch warning live while the quantity is typed, before the blur-commit fires', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    const result = await screen.findByText('Fogeltávolítás');
    await user.click(result);
    await waitFor(() => expect(search).toHaveValue(''));

    const teethInput = screen.getByPlaceholderText('16, 17, 26');
    const quantityInput = screen.getByRole('textbox', { name: 'Darabszám' });
    await user.type(teethInput, '16, 17, 26');
    // A fogak-követés miatt a darabszám már gépelés közben 3-ra áll -- nincs
    // eltérés, amíg a doki nem ír a Db mezőbe.
    await waitFor(() => expect(quantityInput).toHaveValue('3'));
    expect(screen.queryByText(/fog van felsorolva/)).not.toBeInTheDocument();

    // A darabszám NumberField csak blur/Enterre committál a törzsadatba
    // (P1-4), de ennek a pusztán UI-visszajelzésnek élőben kell követnie a
    // gépelést, nem várhat a blurre.
    await user.clear(quantityInput);
    await user.type(quantityInput, '1');

    await screen.findByText(/3 fog van felsorolva, a darabszám 1\. Szándékos\?/);
    expect(quantityInput).toHaveValue('1');
  });

  it('a Fog mezőbe írt szabadszöveges jegyzetet (pl. "jobb felső") nem jelöli hibásnak -- docs/02-domain-modell.md', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    const teethInput = screen.getByPlaceholderText('16, 17, 26');
    await user.type(teethInput, 'jobb felső');

    expect(screen.queryByText(/Nem érvényes FDI fogszám/)).not.toBeInTheDocument();
    expect(teethInput).not.toHaveAttribute('aria-invalid');
  });

  it('egy számnak kinéző, de érvénytelen FDI kódra (pl. "99") figyelmeztetést ad', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    const teethInput = screen.getByPlaceholderText('16, 17, 26');
    await user.type(teethInput, '99');

    expect(await screen.findByText(/Nem érvényes FDI fogszám: 99/)).toBeInTheDocument();
    expect(teethInput).toHaveAttribute('aria-invalid', 'true');

    // Érvényesre javítva a figyelmeztetés eltűnik.
    await user.clear(teethInput);
    await user.type(teethInput, '16');
    await waitFor(() =>
      expect(screen.queryByText(/Nem érvényes FDI fogszám/)).not.toBeInTheDocument(),
    );
  });

  it('vegyes bemenetnél (érvényes FDI + szabadszöveg) nem jelez hibát, csak a valódi számhibánál', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    const teethInput = screen.getByPlaceholderText('16, 17, 26');
    await user.type(teethInput, '16, jobb felső');
    expect(screen.queryByText(/Nem érvényes FDI fogszám/)).not.toBeInTheDocument();

    await user.type(teethInput, ', 99');
    expect(await screen.findByText(/Nem érvényes FDI fogszám: 99/)).toBeInTheDocument();
  });
});

describe('PlanEditorPage -- D59 friss piszkozat autofókusza', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('vadonatúj (tervId nélküli, sor nélküli) piszkozaton az első fázis keresője induláskor fókuszban van', async () => {
    renderEditor();
    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    expect(search).toHaveFocus();
  });

  it('betöltött (már mentett láncú) tervnél NINCS automatikus fókusz, akkor sem, ha nincs sora', async () => {
    // Az init() resetDemoData()-t futtatna (és vele clearAll()-t, ami a
    // lent beírt piszkozatot is elvinné), ha a `dp:arlista.json`/
    // `dp:beallitasok.json` hiányzik -- lásd seedGermanPlanWithOneTranslatedItem
    // fenti kommentjét, ugyanaz a gotcha.
    localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
    localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
    const plan = createBlankPlan(seedSettings, seedPriceList);
    plan.tervId = 'terv-1';
    localStorage.setItem(
      'dp:piszkozat',
      JSON.stringify({ schemaVersion: 1, mentve: new Date(0).toISOString(), plan }),
    );
    renderEditor();
    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    expect(search).not.toHaveFocus();
  });

  it('tervId nélküli, de már sorral rendelkező piszkozatnál NINCS automatikus fókusz', async () => {
    localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
    localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
    const plan = createBlankPlan(seedSettings, seedPriceList);
    const tetel = seedPriceList.tetelek[0];
    plan.fazisok[0].sorok.push({
      tetelId: tetel.id,
      nevSnapshot: tetel.nev.hu,
      savos: false,
      fogak: '',
      mennyiseg: 1,
      listaEgysegar: 1000,
      tenylegesEgysegar: 1000,
      leirasSnapshot: '',
      mennyisegKezi: false,
    });
    localStorage.setItem(
      'dp:piszkozat',
      JSON.stringify({ schemaVersion: 1, mentve: new Date(0).toISOString(), plan }),
    );
    renderEditor();
    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    expect(search).not.toHaveFocus();
  });
});

describe('PlanEditorPage -- backlog-59: új fázis kereső-autofókusza (D64)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('"Fázis hozzáadása" után az ÚJ fázis keresője kap fókuszt, kattintás nélkül gépelhető', async () => {
    const user = userEvent.setup();
    renderEditor();

    // A vadonatúj piszkozat 1. fázisa induláskor fókuszt kap (D59) -- ez
    // itt nem a vizsgált eset, csak a kiinduló állapot dokumentálása.
    await screen.findByPlaceholderText(/Tétel keresése/);

    await user.click(screen.getByRole('button', { name: 'Fázis hozzáadása' }));

    const searches = await screen.findAllByPlaceholderText(/Tétel keresése/);
    expect(searches).toHaveLength(2);
    expect(document.getElementById('kereso-fazis-1')).toHaveFocus();
    expect(searches[1]).toHaveFocus();
  });
});

describe('PlanEditorPage -- kattintható fogtérkép', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /** A panel alapból csukva -- a chart-tesztek előbb kinyitják, mielőtt a `toolbar`-t lekérdeznék. */
  async function nyisdKiFogterkepet(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: /Érintett fogak/ }));
  }

  it('üres terven a fogtérkép csukva indul, kattintásra nyílik, útmutató szöveggel', async () => {
    const user = userEvent.setup();
    renderEditor();

    // Csukva a fogtérkép -- billentyűzetes toolbarként -- nem elérhető.
    expect(await screen.findByRole('button', { name: 'Érintett fogak' })).toBeInTheDocument();
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();

    await nyisdKiFogterkepet(user);
    expect(await screen.findByRole('toolbar')).toBeInTheDocument();
    expect(await screen.findByText(/Kattints egy fogra/)).toBeInTheDocument();
  });

  it('kezeletlen fogra kattintva új, tétel nélküli sort hoz létre a fogszámmal, és a soron belüli keresőre fókuszál -- a választás a helyén tölti ki, nem fűz újat', async () => {
    const user = userEvent.setup();
    renderEditor();
    await nyisdKiFogterkepet(user);

    const chart = await screen.findByRole('toolbar');
    const tooth16 = chart.querySelector('[data-tooth="16"]') as Element;
    await user.click(tooth16);

    // Az új sor Fog mezője már "16"-ot tartalmaz.
    expect(screen.getByDisplayValue('16')).toBeInTheDocument();

    // A soron belüli kereső (a táblázatban, a fázis alatti előtt) fókuszban van.
    const keresok = screen.getAllByPlaceholderText(/Tétel keresése/);
    expect(keresok).toHaveLength(2); // soron belüli + fázis alatti
    expect(keresok[0]).toHaveFocus();

    await user.type(keresok[0], 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));

    // A sor a helyén töltődött ki -- a fogszám megmaradt, nincs második sor.
    expect(screen.getByDisplayValue('16')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fogeltávolítás')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText(/Tétel keresése/)).toHaveLength(1); // csak a fázis alatti maradt
  });

  it('már kezelt fogra kattintva a sorára ugrik, ismételt kattintásra a következő érintett sorra lép, majd körbeér', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.type(search, 'gyokerto');
    await user.click(await screen.findByText('Gyökértömés csatornaszámtól függően'));
    await waitFor(() => expect(search).toHaveValue(''));

    const fogInputs = screen.getAllByPlaceholderText('16, 17, 26');
    await user.type(fogInputs[0], '16');
    await user.type(fogInputs[1], '16');

    await nyisdKiFogterkepet(user);
    // A fogtérkép markup-ja minden kattintás után újraépül (a kattintott fog
    // lesz az új billentyűzetes kurzor, lásd DentalChart.tsx `aktivFog`) --
    // a `dangerouslySetInnerHTML` teljesen kicseréli a fog-elemeket, ezért a
    // referenciát MINDEN kattintás előtt frissen kell lekérdezni, egy
    // korábbi (immár leválasztott) node-ra kattintás nem buborékolna fel.
    const chart = screen.getByRole('toolbar');
    const tooth16 = () => chart.querySelector('[data-tooth="16"]') as Element;

    await user.click(tooth16());
    expect(document.getElementById('fog-0-0')).toHaveFocus();

    await user.click(tooth16());
    expect(document.getElementById('fog-0-1')).toHaveFocus();

    await user.click(tooth16());
    expect(document.getElementById('fog-0-0')).toHaveFocus(); // körbeér
  });

  it('egyetlen fázisnál nincs fázisválasztó; kettőnél megjelenik, és az új sor a kiválasztott fázisba kerül', async () => {
    const user = userEvent.setup();
    renderEditor();
    await nyisdKiFogterkepet(user);

    await screen.findByRole('toolbar');
    expect(screen.queryByRole('combobox', { name: /Új sor ide/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fázis hozzáadása' }));

    const valaszto = screen.getByRole('combobox', { name: /Új sor ide/ });
    await user.click(valaszto);
    await user.click(await screen.findByRole('option', { name: '2. kezelés' }));

    const chart = screen.getByRole('toolbar');
    const tooth26 = chart.querySelector('[data-tooth="26"]') as Element;
    await user.click(tooth26);

    expect(document.getElementById('kereso-1-0')).toHaveFocus();
  });

  it('a sor melletti fogválasztó ikonnal is kijelölhető fog -- a Fog mező frissül', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.click(screen.getByRole('button', { name: /Fogak kijelölése a fogtérképen/ }));
    const popoverChart = await screen.findByRole('listbox');
    const tooth24 = popoverChart.querySelector('[data-tooth="24"]') as Element;
    await user.click(tooth24);

    expect(screen.getByDisplayValue('24')).toBeInTheDocument();
    // backlog-27: a fogtérkép-popover írási útja is a fogak-követésen megy
    // át -- egy kijelölt fog a darabszámot is frissíti.
    expect(screen.getByRole('textbox', { name: 'Darabszám' })).toHaveValue('1');
  });
});

describe('PlanEditorPage -- nyelv és pénznem (D21)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Az egyik teszt a teljes App-ot (HashRouter) rendereli -- a
    // window.location.hash a jsdom window-on nem reset a tesztek között.
    window.location.hash = '';
  });

  it('snapshots the German name for an item that has one', async () => {
    const user = userEvent.setup();
    seedGermanPlanWithOneTranslatedItem();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'zahnextraktion');
    const result = await screen.findByText('Zahnextraktion');
    await user.click(result);

    await waitFor(() => expect(search).toHaveValue(''));
    expect(screen.getByDisplayValue('Zahnextraktion')).toBeInTheDocument();
    expect(screen.queryByText('HU')).toBeNull();
  });

  it('falls back to the Hungarian name and flags it with a HU chip when no German name exists', async () => {
    const user = userEvent.setup();
    seedGermanPlanWithOneTranslatedItem();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    // "csatornaszam" -- egyedi rész a névben, hogy ne ütközzön a hasonló
    // "Gyökértömés eltávolítása /csatorna" tétellel (mindkettő matchelne egy
    // rövidebb "gyoker" vagy "csatorna" query esetén).
    await user.type(search, 'csatornaszam');
    const result = await screen.findByText('Gyökértömés csatornaszámtól függően');
    await user.click(result);

    await waitFor(() => expect(search).toHaveValue(''));
    expect(screen.getByDisplayValue('Gyökértömés csatornaszámtól függően')).toBeInTheDocument();
    expect(screen.getByText('HU')).toBeInTheDocument();
  });

  it('backlog-3b: "átírt" jelvény egy kézzel eltérített, fordítással rendelkező soron -- nem "HU", és a kettő nem keveredik', async () => {
    const user = userEvent.setup();
    seedGermanPlanWithOneTranslatedItem();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'zahnextraktion');
    await user.click(await screen.findByText('Zahnextraktion'));
    await waitFor(() => expect(search).toHaveValue(''));

    // Az árlistai nevet még követi -- nincs jelvény.
    expect(screen.queryByText('átírt')).not.toBeInTheDocument();
    expect(screen.queryByText('HU')).not.toBeInTheDocument();

    // Kézzel eltérítjük a nevet -- "átírt" jelvényt kap, nem "HU"-t (VAN
    // fordítása, csak a sor mást mond).
    const nameField = screen.getByDisplayValue('Zahnextraktion');
    await user.clear(nameField);
    await user.type(nameField, 'Egyedi megjegyzéssel kihúzva');
    expect(await screen.findByText('átírt')).toBeInTheDocument();
    expect(screen.queryByText('HU')).not.toBeInTheDocument();

    // Egy másik, fordítás NÉLKÜLI tétel -- "HU" jelvényt kap, nem "átírt"-at.
    await user.type(search, 'csatornaszam');
    await user.click(await screen.findByText('Gyökértömés csatornaszámtól függően'));
    await waitFor(() => expect(search).toHaveValue(''));
    expect(await screen.findByText('HU')).toBeInTheDocument();
  });

  it('shows the empty-currency message in the search when NOTHING matches and the plan currency has zero priced items', async () => {
    const user = userEvent.setup();
    seedWithNoEurPrices();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt EUR');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await screen.findByText('Pénznem');
    await user.click(screen.getByRole('radio', { name: 'EUR — euró' }));
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    // 62. tétel (D71) óta egy beárazatlan tétel is találat -- ez a jelzés
    // csak akkor jelenik meg, ha a NÉVegyezés is nulla találatot ad.
    await user.type(search, 'zzznincsilyentetel');

    expect(await screen.findByText(/egyetlen aktív tétel sincs beárazva/)).toBeInTheDocument();
  });

  it('62. tétel (D71): egy a terv pénznemében beárazatlan tétel is megtalálható és felvehető, "—" listaárral, 0-ás ajánlati árral', async () => {
    const user = userEvent.setup();
    seedWithNoEurPrices();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt EUR');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await screen.findByText('Pénznem');
    await user.click(screen.getByRole('radio', { name: 'EUR — euró' }));
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    // A keresőben "—" jelzi a hiányzó listaárat -- lásd
    // `domain/money.ts` `formatPrice()` null-ágának `?? '—'` fallbackje.
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    // A felvett soron: "—" listaár, 0-ás ajánlati ár.
    const rows = screen.getAllByText('—');
    expect(rows.length).toBeGreaterThan(0);
    const priceField = screen.getByLabelText('Ajánlati egységár') as HTMLInputElement;
    expect(priceField.value).toBe('0,00');
  });

  it('74. tétel: beárazatlan tételhez kézzel megadott ajánlati ár NEM kap "Felár" jelvényt -- ott nincs referenciaár', async () => {
    const user = userEvent.setup();
    seedWithNoEurPrices();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt EUR');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await screen.findByText('Pénznem');
    await user.click(screen.getByRole('radio', { name: 'EUR — euró' }));
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    const priceField = screen.getByLabelText('Ajánlati egységár') as HTMLInputElement;
    await user.clear(priceField);
    await user.type(priceField, '35,50');
    await user.tab();

    expect(screen.queryByText('Felár')).not.toBeInTheDocument();
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it('backlog-5: az "Ajánlati ár" mező euróban jelenít meg és fogad be egy EUR pénznemű tervnél, a commit centben történik', async () => {
    const user = userEvent.setup();
    seedWithIntactPriceList();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt EUR');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await screen.findByText('Pénznem');
    await user.click(screen.getByRole('radio', { name: 'EUR — euró' }));
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'cbct');
    await user.click(await screen.findByText('CBCT'));
    await waitFor(() => expect(search).toHaveValue(''));

    // A fejléc is jelzi a terv pénznemét, nem csak a szerkeszthető oszlop.
    expect(screen.getByText('Listaár (€)')).toBeInTheDocument();
    expect(screen.getByText('Ajánlati ár (€)')).toBeInTheDocument();
    expect(screen.getByText('Összeg (€)')).toBeInTheDocument();

    // CBCT EUR ára a seedben FIX 6600 cent -- euróban megjelenítve "66,00",
    // NEM a nyers "6600".
    const priceField = screen.getByLabelText('Ajánlati egységár') as HTMLInputElement;
    expect(priceField.value).toBe('66,00');

    // A mező blur-re commitál (P1-4) -- "35,50" beírva a tárolt értéknek
    // 3550 centnek kell lennie. Javítás előtt a hiányzó unit prop miatt ez
    // a HUF-ágon parseolódott volna ("35.5" -> 36 cent -> "0,36 €").
    await user.clear(priceField);
    await user.type(priceField, '35,50');
    await user.tab();
    expect(priceField.value).toBe('35,50');
    expect((await screen.findAllByText(/35,50/)).length).toBeGreaterThan(0);
  });
});

describe('PlanEditorPage -- backlog-3: sornév szerkesztés és egyedi sor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('egy árlistai tételből felvett sor nevének felülírása után a tetelId-hez kötött ár és a sávos jelzés változatlan marad', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'gyokerto');
    await user.click(await screen.findByText('Gyökértömés csatornaszámtól függően'));
    await waitFor(() => expect(search).toHaveValue(''));

    // Sávos tétel -- a "becsült ár" chip és a min-ár (38 000 Ft) induló állapota.
    expect(screen.getByRole('button', { name: 'Becsült ár', pressed: true })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('38000').length).toBeGreaterThan(0);

    const nameInput = screen.getByDisplayValue('Gyökértömés csatornaszámtól függően');
    await user.clear(nameInput);
    await user.type(nameInput, 'Gyökértömés (rövidítve)');

    // A név megváltozott, de az árlistai kötés (ár, becsült-ár chip) érintetlen
    // -- a tetelId csak hivatkozásnak marad, a nevSnapshot önálló (D7).
    expect(screen.getByDisplayValue('Gyökértömés (rövidítve)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Becsült ár', pressed: true })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('38000').length).toBeGreaterThan(0);
    // Nincs "egyedi" jelvény -- a sor még mindig árlistai tételhez kötött.
    expect(screen.queryByText('egyedi')).not.toBeInTheDocument();
  });

  it('nulla találatra a fázis alatti keresőből egyedi sor vehető fel -- "egyedi" jelvénnyel, listaár nélkül, sosem kedvezmény-jelvénnyel', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'Érzéstelenítés');
    await screen.findByText(/Egyedi tétel felvétele/);
    await user.keyboard('{Enter}');

    await waitFor(() => expect(search).toHaveValue(''));
    expect(screen.getByDisplayValue('Érzéstelenítés')).toBeInTheDocument();
    expect(screen.getByText('egyedi')).toBeInTheDocument();
    // Listaár helyén "—" -- nincs értelmezhető árlistai referenciaár.
    expect(screen.getByText('—')).toBeInTheDocument();

    // A tényleges ár szerkesztése után sincs kedvezmény-jelvény -- egyedi
    // sornál a listaEgysegar mindig a tenylegesEgysegar-ral együtt íródik.
    const priceInput = screen.getByDisplayValue('0');
    await user.clear(priceInput);
    await user.type(priceInput, '15000');
    await user.tab();

    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
  });

  it('backlog-23: egyedi sor német terven csak "egyedi" jelvényt kap, "HU"-t nem', async () => {
    const user = userEvent.setup();
    seedGermanPlanWithOneTranslatedItem();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'Érzéstelenítés');
    await screen.findByText(/Egyedi tétel felvétele/);
    await user.keyboard('{Enter}');

    await waitFor(() => expect(search).toHaveValue(''));
    expect(screen.getByDisplayValue('Érzéstelenítés')).toBeInTheDocument();
    expect(screen.getByText('egyedi')).toBeInTheDocument();
    expect(screen.queryByText('HU')).not.toBeInTheDocument();
  });
});

describe('PlanEditorPage -- backlog-4: becsült ár (≈ ikon) kapcsoló', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('FIX árú tételen a chip alapból kikapcsolt, kattintásra bekapcsol -- ez a tétel lényege', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    const chip = screen.getByRole('button', { name: 'Becsült ár' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('SAVOS árú tételen a chip alapból bekapcsolt, kattintásra levehető -- kétirányú', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'gyokerto');
    await user.click(await screen.findByText('Gyökértömés csatornaszámtól függően'));
    await waitFor(() => expect(search).toHaveValue(''));

    const chip = screen.getByRole('button', { name: 'Becsült ár' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('egyedi soron is megjelenik és átbillenthető a chip -- backlog-3 7. döntése ebben a körben oldódik fel', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'Érzéstelenítés');
    await screen.findByText(/Egyedi tétel felvétele/);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(search).toHaveValue(''));

    const chip = screen.getByRole('button', { name: 'Becsült ár' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('PlanEditorPage -- backlog-10: tétel-leírás', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function seedWithCsomagItem() {
    const custom = {
      ...seedPriceList,
      tetelek: seedPriceList.tetelek.map((x) =>
        x.nev.hu === 'Fogeltávolítás' ? { ...x, csomag: true } : x,
      ),
    };
    localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
    localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
  }

  it('a "+ leírás" trigger nyitja a textareát, a gépelés a leirasSnapshot-ba perzisztál', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.click(screen.getByRole('button', { name: '+ leírás' }));
    const textarea = screen.getByLabelText('Leírás (mi van benne?)');
    await user.type(textarea, 'Implantátum, felépítmény, korona');
    expect(textarea).toHaveValue('Implantátum, felépítmény, korona');
  });

  it('csomag: true tételre hivatkozó, üres leírású sor amber jelzést kap a triggeren, kitöltés után eltűnik', async () => {
    seedWithCsomagItem();
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    expect(screen.getByTitle('Csomagtétel — hiányzik a leírás')).toBeInTheDocument();

    await user.click(screen.getByTitle('Csomagtétel — hiányzik a leírás'));
    await user.type(screen.getByLabelText('Leírás (mi van benne?)'), 'Kihúzás');

    expect(screen.queryByTitle('Csomagtétel — hiányzik a leírás')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leírás' })).toBeInTheDocument();
  });

  it('nem csomag tételen nincs amber jelzés, akkor sem, ha üres a leírás', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    expect(screen.queryByTitle('Csomagtétel — hiányzik a leírás')).not.toBeInTheDocument();
    expect(screen.getByTitle('Leírás (mi van benne?)')).toBeInTheDocument();
  });

  it('a terv-szintű "Tétel-leírások nyomtatása" kapcsoló alapból be van kapcsolva, és kikapcsolható', async () => {
    const user = userEvent.setup();
    renderEditor();

    const kapcsolo = await screen.findByRole('checkbox', { name: 'Tétel-leírások nyomtatása' });
    expect(kapcsolo).toBeChecked();

    await user.click(kapcsolo);
    expect(kapcsolo).not.toBeChecked();
  });
});

describe('PlanEditorPage -- backlog-18: fázis törlése megerősítéssel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sorral rendelkező fázis törlése megerősítést kér -- a Mégse nem töröl, a Törlés töröl', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    // A canDelete gate (>1 fázis) miatt csak a második fázis felvétele után
    // jelenik meg a "Fázis törlése" gomb.
    await user.click(screen.getByRole('button', { name: 'Fázis hozzáadása' }));

    const torlesGombok = screen.getAllByRole('button', { name: 'Fázis törlése' });
    expect(torlesGombok).toHaveLength(2);
    await user.click(torlesGombok[0]);

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    // Mégse -- a fázis és a sora megmarad.
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Fogeltávolítás')).toBeInTheDocument();

    // Törlés -- a fázis (és a sora) eltűnik, a canDelete gomb is eltűnik.
    await user.click(screen.getAllByRole('button', { name: 'Fázis törlése' })[0]);
    await user.click(screen.getByRole('button', { name: 'Törlés' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    expect(screen.queryByDisplayValue('Fogeltávolítás')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fázis törlése' })).not.toBeInTheDocument();
  });

  it('üres fázis törlése egy kattintás, dialógus nélkül -- a mai viselkedés regressziós védelme', async () => {
    const user = userEvent.setup();
    renderEditor();

    await screen.findByPlaceholderText(/Tétel keresése/);
    await user.click(screen.getByRole('button', { name: 'Fázis hozzáadása' }));

    const torlesGombok = screen.getAllByRole('button', { name: 'Fázis törlése' });
    expect(torlesGombok).toHaveLength(2);
    await user.click(torlesGombok[0]);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fázis törlése' })).not.toBeInTheDocument();
  });
});

describe('PlanEditorPage -- backlog-58: fázis összecsukás', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fázisok egymástól függetlenül csukhatók/nyithatók, csukott fejléc a darabszámot/összeget mutatja', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.click(screen.getByRole('button', { name: 'Fázis hozzáadása' }));

    // Mindkét fázis alapból nyitva (D73) -- két kereső látszik.
    expect(screen.getAllByPlaceholderText(/Tétel keresése/)).toHaveLength(2);

    const csukoGombok = screen.getAllByRole('button', { name: 'Fázis összecsukása' });
    expect(csukoGombok).toHaveLength(2);

    // Az első (soros) fázis összecsukása -- a sora és a keresője eltűnik,
    // a fejléc a darabszámot/összeget mutatja.
    await user.click(csukoGombok[0]);
    expect(screen.getAllByPlaceholderText(/Tétel keresése/)).toHaveLength(1);
    expect(screen.queryByDisplayValue('Fogeltávolítás')).not.toBeInTheDocument();
    expect(await screen.findByText(/1 tétel/)).toBeInTheDocument();

    // A második (üres, nyitott) fázis érintetlen marad.
    expect(screen.getByRole('button', { name: 'Fázis összecsukása' })).toBeInTheDocument();

    // Visszanyitás -- a sor újra látszik.
    await user.click(screen.getByRole('button', { name: 'Fázis kinyitása' }));
    expect(screen.getAllByPlaceholderText(/Tétel keresése/)).toHaveLength(2);
    expect(screen.getByDisplayValue('Fogeltávolítás')).toBeInTheDocument();
  });
});

describe('PlanEditorPage -- backlog-58: fázis sorrendezés', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('nyilakkal mozgatva a sorok a helyes fázisban maradnak, a szélen a megfelelő nyíl tiltott, csak a generált név követi a pozíciót', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.click(screen.getByRole('button', { name: 'Fázis hozzáadása' }));

    // A 2. fázis nevét kézzel átírjuk -- ez utántól nem generált név, a
    // mozgatás nem frissítheti.
    const masodikNev = screen.getByDisplayValue('2. kezelés');
    await user.clear(masodikNev);
    await user.type(masodikNev, 'Röntgen fázis');

    const searchInputs = screen.getAllByPlaceholderText(/Tétel keresése/);
    await user.type(searchInputs[1], 'csatornaszam');
    await user.click(await screen.findByText('Gyökértömés csatornaszámtól függően'));
    await waitFor(() => expect(searchInputs[1]).toHaveValue(''));

    // Szélen a megfelelő nyíl tiltott.
    expect(screen.getAllByRole('button', { name: 'Fázis feljebb' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Fázis lejjebb' })[1]).toBeDisabled();

    // A "Röntgen fázis" (2. pozíció) feljebb mozgatása -- az 1. fázis
    // generált neve ("1. kezelés") a mozgatással "2. kezelés"-re frissül,
    // a kézzel átírt "Röntgen fázis" érintetlen marad.
    await user.click(screen.getAllByRole('button', { name: 'Fázis feljebb' })[1]);

    // A DOM-sorrend igazolja: a "Röntgen fázis" került előre, ÉS a sora
    // ("Gyökértömés…") vele ment -- nem a másik fázis alá "vándorolt".
    const sorrend = screen
      .getAllByDisplayValue(/^(Röntgen fázis|2\. kezelés|Gyökértömés csatornaszámtól függően)$/)
      .map((el) => (el as HTMLInputElement).value);
    expect(sorrend).toEqual(['Röntgen fázis', 'Gyökértömés csatornaszámtól függően', '2. kezelés']);

    // A szélek után a tiltott nyilak is a helyes (új) pozícióra vonatkoznak.
    expect(screen.getAllByRole('button', { name: 'Fázis feljebb' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Fázis lejjebb' })[1]).toBeDisabled();
  });
});

describe('PlanEditorPage -- backlog-58: sor törlése Undo-val', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sor törlése után Undo-sáv jelenik meg fókusszal, a Visszavonás az eredeti pozícióba állítja vissza', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.type(search, 'csatornaszam');
    await user.click(await screen.findByText('Gyökértömés csatornaszámtól függően'));
    await waitFor(() => expect(search).toHaveValue(''));

    expect(screen.queryByText(/Sor törölve/)).not.toBeInTheDocument();

    // Az első ("Fogeltávolítás") sor törlése.
    await user.click(screen.getAllByRole('button', { name: 'Sor törlése' })[0]);

    expect(screen.queryByDisplayValue('Fogeltávolítás')).not.toBeInTheDocument();
    expect(await screen.findByText(/Sor törölve: Fogeltávolítás/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visszavonás' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Visszavonás' }));

    expect(screen.queryByText(/Sor törölve/)).not.toBeInTheDocument();
    // Az eredeti pozícióba került vissza, nem a lista végére.
    const sorrend = screen
      .getAllByDisplayValue(/^(Fogeltávolítás|Gyökértömés csatornaszámtól függően)$/)
      .map((el) => (el as HTMLInputElement).value);
    expect(sorrend).toEqual(['Fogeltávolítás', 'Gyökértömés csatornaszámtól függően']);
  });

  it('egy újabb sortörlés lecseréli (nem halmozza) a korábbi Undo-sávot', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.type(search, 'csatornaszam');
    await user.click(await screen.findByText('Gyökértömés csatornaszámtól függően'));
    await waitFor(() => expect(search).toHaveValue(''));

    await user.click(screen.getAllByRole('button', { name: 'Sor törlése' })[0]);
    expect(await screen.findByText(/Sor törölve: Fogeltávolítás/)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Sor törlése' })[0]);

    expect(screen.queryByText(/Sor törölve: Fogeltávolítás/)).not.toBeInTheDocument();
    expect(await screen.findByText(/Sor törölve: Gyökértömés csatornaszámtól függően/)).toBeInTheDocument();
    expect(screen.getAllByText(/Sor törölve/)).toHaveLength(1);
  });
});

describe('PlanEditorPage -- backlog-32: piszkozat-mentés jelzés és eldobás', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sikeres autosave után "Piszkozat mentve …" jelenik meg a fejlécben', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    expect(await screen.findByText(/^Piszkozat mentve /)).toBeInTheDocument();
  });

  it('a trash-ikon megerősítést kér, elfogadás után a piszkozat kiürül és törlődik a localStorage-ból', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));
    await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'Piszkozat eldobása' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eldobás' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    expect(screen.queryByDisplayValue('Fogeltávolítás')).not.toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).toBeNull());
  });
});

describe('PlanEditorPage -- backlog-60: sor-szintű eltérés-jelzés és reset', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function seedWithLeirasItem() {
    const custom = {
      ...seedPriceList,
      tetelek: seedPriceList.tetelek.map((x) =>
        x.nev.hu === 'Fogeltávolítás'
          ? { ...x, leiras: { hu: 'Implantátum, felépítmény, korona', de: null } }
          : x,
      ),
    };
    localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
    localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
  }

  it('magyar terven egy kézzel átírt sornév "átírt" jelvényt kap (a sorFallback ezt hu-n sosem adta), a reset visszaállítja az árlistai nevet', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    expect(screen.queryByText('átírt')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Név visszaállítása az árlistaira' }),
    ).not.toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Fogeltávolítás');
    await user.clear(nameInput);
    await user.type(nameInput, 'Kihúzás (rövidítve)');

    expect(await screen.findByText('átírt')).toBeInTheDocument();
    const reset = screen.getByRole('button', { name: 'Név visszaállítása az árlistaira' });

    await user.click(reset);
    expect(screen.getByDisplayValue('Fogeltávolítás')).toBeInTheDocument();
    expect(screen.queryByText('átírt')).not.toBeInTheDocument();
  });

  it('az ajánlati árat a listaár fölé emelve amber "+X%" jelvényt kap a sor, a reset visszaadja a listaárat; lefelé továbbra is zöld "−X%"', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    expect(
      screen.queryByRole('button', { name: 'Ajánlati ár visszaállítása a listaárra' }),
    ).not.toBeInTheDocument();

    const priceInput = screen.getByLabelText('Ajánlati egységár');
    await user.clear(priceInput);
    await user.type(priceInput, '30000');
    await user.tab();

    expect(await screen.findByText('+20%')).toBeInTheDocument();
    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();

    const reset = screen.getByRole('button', { name: 'Ajánlati ár visszaállítása a listaárra' });
    await user.click(reset);
    expect(priceInput).toHaveValue('25000');
    expect(screen.queryByText('+20%')).not.toBeInTheDocument();

    await user.clear(priceInput);
    await user.type(priceInput, '20000');
    await user.tab();
    expect(await screen.findByText('−20%')).toBeInTheDocument();
  });

  it('német terven egy érintetlen, fordítás nélküli sor csak "HU"-t kap -- "átírt"-at nem (a nevKoveti()-alapú komparátor vakfoltja); kézzel átírva mindkettő megjelenik, a reset a magyar névre áll', async () => {
    const user = userEvent.setup();
    seedGermanPlanWithOneTranslatedItem();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'csatornaszam');
    await user.click(await screen.findByText('Gyökértömés csatornaszámtól függően'));
    await waitFor(() => expect(search).toHaveValue(''));

    expect(await screen.findByText('HU')).toBeInTheDocument();
    expect(screen.queryByText('átírt')).not.toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Gyökértömés csatornaszámtól függően');
    await user.clear(nameInput);
    await user.type(nameInput, 'Egyedi megjegyzéssel kihúzva');

    expect(await screen.findByText('átírt')).toBeInTheDocument();
    expect(screen.getByText('HU')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Név visszaállítása az árlistaira' }));
    expect(screen.getByDisplayValue('Gyökértömés csatornaszámtól függően')).toBeInTheDocument();
    expect(screen.queryByText('átírt')).not.toBeInTheDocument();
  });

  it('árlistai leírással bíró tétel átírt leírása "átírt leírás" jelvényt és resetet kap; leírás nélküli tételen egyik sem jelenik meg', async () => {
    const user = userEvent.setup();
    seedWithLeirasItem();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    // A leírás-sáv már nyitva indul, mert az árlistai tétel felvételekor
    // a snapshot nem üres (`leirasNyitva` kezdőértéke `Boolean(leirasTartalom)`).
    expect(screen.getByRole('button', { name: 'Leírás' })).toBeInTheDocument();
    const textarea = screen.getByLabelText('Leírás (mi van benne?)');
    expect(textarea).toHaveValue('Implantátum, felépítmény, korona');
    expect(screen.queryByText('átírt leírás')).not.toBeInTheDocument();

    await user.clear(textarea);
    await user.type(textarea, 'Kézzel írt leírás');
    expect(await screen.findByText('átírt leírás')).toBeInTheDocument();

    const reset = screen.getByRole('button', { name: 'Leírás visszaállítása az árlistaira' });
    await user.click(reset);
    expect(textarea).toHaveValue('Implantátum, felépítmény, korona');
    expect(screen.queryByText('átírt leírás')).not.toBeInTheDocument();
  });

  it('egyedi (árlistán kívüli) soron egyik marker/reset sem jelenik meg', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'Érzéstelenítés');
    await screen.findByText(/Egyedi tétel felvétele/);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(search).toHaveValue(''));

    expect(screen.queryByText('átírt')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Név visszaállítása az árlistaira' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ajánlati ár visszaállítása a listaárra' }),
    ).not.toBeInTheDocument();
  });
});

describe('PlanEditorPage -- 65. tétel: nyelvi review-jelvény', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * Magyar terv, aminek egy sora ÉS egy fázisa is kézzel írt szöveget
   * hordoz, ami korábban NÉMET nyelven íródott (a doki nyelvet váltott a
   * dokumentumon, de ezt a szöveget azóta nem nézte át) -- a `sorFallback`
   * (D21) ezt hu terven sosem jelezné, a nyelvi review viszont igen.
   */
  function seedWithNyelviMismatch() {
    localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
    localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
    const plan = createBlankPlan(seedSettings, seedPriceList);
    plan.paciens.nev = 'Teszt Elek';
    plan.fazisok[0].megnevezes = 'Kontrolle';
    plan.fazisok[0].megnevezesNyelv = { authoredInLanguage: 'de' };
    plan.fazisok[0].megjegyzes = 'Nächster Termin in 6 Monaten';
    plan.fazisok[0].megjegyzesNyelv = { authoredInLanguage: 'de' };
    plan.fazisok[0].sorok.push({
      tetelId: 't041',
      nevSnapshot: 'Zahnextraktion (angepasst)',
      savos: false,
      fogak: '',
      mennyiseg: 1,
      listaEgysegar: 25000,
      tenylegesEgysegar: 25000,
      leirasSnapshot: 'Vor dem Eingriff besprochen',
      nevNyelv: { authoredInLanguage: 'de' },
      leirasNyelv: { authoredInLanguage: 'de' },
    });
    localStorage.setItem(
      'dp:piszkozat',
      JSON.stringify({ schemaVersion: 1, mentve: new Date().toISOString(), plan }),
    );
  }

  it('sor neve/leírása és fázis neve/megjegyzése is "DE szöveg" jelvényt kap; "Nyelv ellenőrizve" eltünteti, nincs sikerjelvény', async () => {
    const user = userEvent.setup();
    seedWithNyelviMismatch();
    renderEditor();

    await screen.findByDisplayValue('Zahnextraktion (angepasst)');
    const jelvenyek = await screen.findAllByText('DE szöveg');
    expect(jelvenyek).toHaveLength(4); // fázisnév + fázis-megjegyzés + sornév + sorleírás

    const gombok = screen.getAllByRole('button', { name: 'Nyelv ellenőrizve' });
    expect(gombok).toHaveLength(4);

    await user.click(gombok[0]);
    expect(screen.getAllByText('DE szöveg')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Nyelv ellenőrizve' })).toHaveLength(3);
    // Nincs "✓ ellenőrizve" sikerjelvény -- a figyelmeztetés egyszerűen eltűnik (D465).
    expect(screen.queryByText(/ellenőrizve/i)).not.toBeInTheDocument();
  });

  it('puszta szóköz-javítás NEM hozza vissza a jelvényt; tényleges átírás igen, de a mismatch-elt mezőn a metaadat érintetlen marad (D480)', async () => {
    const user = userEvent.setup();
    seedWithNyelviMismatch();
    renderEditor();

    const nameInput = await screen.findByDisplayValue('Zahnextraktion (angepasst)');
    await user.type(nameInput, ' ');
    await user.keyboard('{Backspace}');
    // Whitespace-only edit -- a mismatch-jelvény továbbra is ott van (nem tűnt el, nem is duplikálódott).
    expect(await screen.findAllByText('DE szöveg')).toHaveLength(4);

    // Teljes átírás a JELENLEGI (hu) nyelven -- D480: önmagában nem old fel,
    // a jelvény szám nem csökken (a sor jelvénye ugyanaz marad).
    await user.clear(nameInput);
    await user.type(nameInput, 'Fogeltávolítás (átírva)');
    expect(await screen.findAllByText('DE szöveg')).toHaveLength(4);
  });

  it('a név reset a "DE szöveg" jelvényt is törli a sornévről', async () => {
    const user = userEvent.setup();
    seedWithNyelviMismatch();
    renderEditor();

    await screen.findByDisplayValue('Zahnextraktion (angepasst)');
    // A sornévhez tartozó "átírt" jelvény is jelen van (a snapshot eltér az
    // árlistai magyar névtől) -- a reset mindkettőt egyszerre törli.
    const nevReset = await screen.findByRole('button', { name: 'Név visszaállítása az árlistaira' });
    await user.click(nevReset);

    expect(screen.getByDisplayValue('Fogeltávolítás')).toBeInTheDocument();
    // 3 marad: fázisnév, fázis-megjegyzés, sorleírás -- a sornév jelvénye eltűnt.
    expect(await screen.findAllByText('DE szöveg')).toHaveLength(3);
  });
});

describe('PlanEditorPage -- backlog-61: árlista-snapshot és explicit refresh', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('friss (követő) soron nincs látható ⟳ ár-frissítő gomb', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    expect(
      screen.queryByRole('button', { name: 'Ár frissítése az árlistából' }),
    ).not.toBeInTheDocument();
  });

  it('elavult listaárú soron megjelenik a ⟳ gomb; elfogadás után a lista- és ajánlati ár is a mai árra vált, a kézi eltérés törlődik', async () => {
    const user = userEvent.setup();
    seedWithStalePriceRow();
    renderEditor();

    const refreshButton = await screen.findByRole('button', {
      name: 'Ár frissítése az árlistából',
    });

    await user.click(refreshButton);
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain(
      `${formatMoney(20000, 'HUF', 'hu')} → ${formatMoney(25000, 'HUF', 'hu')}`,
    );

    await user.click(within(dialog).getByRole('button', { name: 'Frissítés' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    expect(screen.getAllByDisplayValue('25000').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: 'Ár frissítése az árlistából' }),
    ).not.toBeInTheDocument();
  });

  it('Mégse a dialógusban nem változtat a soron', async () => {
    const user = userEvent.setup();
    seedWithStalePriceRow();
    renderEditor();

    await user.click(
      await screen.findByRole('button', { name: 'Ár frissítése az árlistából' }),
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    expect(screen.getByDisplayValue('20000')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Ár frissítése az árlistából' }),
    ).toBeInTheDocument();
  });
});
