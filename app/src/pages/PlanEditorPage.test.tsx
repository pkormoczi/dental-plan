// A legkritikusabb UX-pont tesztje (lásd CLAUDE.md "A UX kritikus pontja"):
// gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a fókuszt ->
// gépel tovább, egérhasználat nélkül.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import PlanEditorPage from './PlanEditorPage';
import { TestProviders } from '../testUtils';
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
    JSON.stringify({ ...seedSettings, nemetEngedelyezve: true, alapertelmezettNyelv: 'de' }),
  );
}

/** A `nemetEngedelyezve` kapcsoló + egy árlista, amiben egyetlen tételnek sincs EUR ára. */
function seedWithGermanEnabledAndNoEurPrices() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) => ({ ...x, ar: { ...x.ar, EUR: null } })),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem(
    'dp:beallitasok.json',
    JSON.stringify({ ...seedSettings, nemetEngedelyezve: true }),
  );
}

/**
 * A `nemetEngedelyezve` kapcsoló egy ÉRINTETLEN árlistával -- a
 * `seedWithGermanEnabledAndNoEurPrices`-tól eltérően itt minden tételnek
 * megvan az EUR ára, hogy egy EUR pénznemű terv szerkesztőjében ténylegesen
 * fel lehessen venni beárazott tételt (backlog-5).
 */
function seedWithGermanEnabled() {
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem(
    'dp:beallitasok.json',
    JSON.stringify({ ...seedSettings, nemetEngedelyezve: true }),
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
    // megmutatja a "Kezelések összesen" referenciasort.
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

  // backlog-9: a doki eddig fejben osztotta ki az előleget és kézzel írta a
  // papír aljára.
  it('az előleg-kapcsoló bekapcsolva 50%-ról indul, és a végösszegből számol', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await user.click(await screen.findByText('Fogeltávolítás'));
    await waitFor(() => expect(search).toHaveValue(''));

    // Alapból nincs előleg-blokk, csak a kapcsoló.
    expect(screen.queryByLabelText('Előleg százaléka')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ }));

    // 25 000 Ft végösszeg -> 50% = 12 500 / 12 500.
    const szazalek = await screen.findByLabelText('Előleg százaléka');
    expect(szazalek).toHaveValue('50');
    expect(screen.getAllByText('12 500 Ft')).toHaveLength(2);

    // Százalék átírása után mindkét szám követi (a mező blur-re commitál).
    await user.clear(szazalek);
    await user.type(szazalek, '30');
    await user.tab();

    expect(await screen.findByText('7500 Ft')).toBeInTheDocument();
    expect(screen.getByText('17 500 Ft')).toBeInTheDocument();
  });

  // backlog-16: az alku lezárásakor a doki eddig fejben osztotta vissza a
  // sorokat, hogy a papíron kerek végösszeg jöjjön ki.
  describe('a kerek végösszeg kapcsoló', () => {
    async function felvesz(user: ReturnType<typeof userEvent.setup>) {
      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));
    }

    it('alapból ki van kapcsolva, bekapcsolva a jelenlegi végösszeget mutatja, kedvezmény nélkül', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      expect(screen.queryByLabelText('Cél végösszeg')).not.toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: /Kerek végösszeg beállítása/ }));

      const cel = await screen.findByLabelText('Cél végösszeg');
      expect(cel).toHaveValue('25000');
      expect(screen.getByText(/→ 0 Ft kedvezmény/)).toBeInTheDocument();
    });

    it('kisebb cél végösszeg beírása után a Summary "Kedvezmény" sora az összevont értéket mutatja', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /Kerek végösszeg beállítása/ }));
      const cel = await screen.findByLabelText('Cél végösszeg');
      await user.clear(cel);
      await user.type(cel, '20000');
      await user.tab();

      expect(await screen.findByText(/→ 5000 Ft kedvezmény/)).toBeInTheDocument();
      // A Summary "Kedvezmény" sora a mai (sorszintű) számítást használja --
      // terv-szintű kedvezménnyel automatikusan az összevont értéket mutatja.
      expect(screen.getByText(/Kedvezmény: 5000 Ft/)).toBeInTheDocument();
    });

    it('a sorok összege fölé írt cél a felső határra szorítódik (nincs felár ezen az úton)', async () => {
      const user = userEvent.setup();
      renderEditor();
      await felvesz(user);

      await user.click(screen.getByRole('checkbox', { name: /Kerek végösszeg beállítása/ }));
      const cel = await screen.findByLabelText('Cél végösszeg');
      await user.clear(cel);
      await user.type(cel, '30000');
      await user.tab();

      expect(cel).toHaveValue('25000');
      expect(screen.getByText(/→ 0 Ft kedvezmény/)).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: '+ Új kezelési fázis' }));

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

  it('shows the empty-currency message in the search when the plan currency has zero priced items', async () => {
    const user = userEvent.setup();
    seedWithGermanEnabledAndNoEurPrices();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'EUR — euró' }));
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');

    expect(await screen.findByText(/egyetlen aktív tétel sincs beárazva/)).toBeInTheDocument();
  });

  it('backlog-5: az "Ajánlati ár" mező euróban jelenít meg és fogad be egy EUR pénznemű tervnél, a commit centben történik', async () => {
    const user = userEvent.setup();
    seedWithGermanEnabled();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    await screen.findByText('Az ajánlat nyelve és pénzneme');
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
    await user.click(screen.getByRole('button', { name: '+ Új kezelési fázis' }));

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
    await user.click(screen.getByRole('button', { name: '+ Új kezelési fázis' }));

    const torlesGombok = screen.getAllByRole('button', { name: 'Fázis törlése' });
    expect(torlesGombok).toHaveLength(2);
    await user.click(torlesGombok[0]);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fázis törlése' })).not.toBeInTheDocument();
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
