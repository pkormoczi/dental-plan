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

  it('shows the non-blocking tooth-count mismatch warning without preventing entry', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    const result = await screen.findByText('Fogeltávolítás');
    await user.click(result);

    const teethInput = screen.getByPlaceholderText('16, 17, 26');
    await user.type(teethInput, '16, 17');

    expect(
      await screen.findByText(/2 fog van felsorolva, a darabszám 1\. Szándékos\?/),
    ).toBeInTheDocument();
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
    await user.type(teethInput, '16, 17, 26');
    await screen.findByText(/3 fog van felsorolva, a darabszám 1\. Szándékos\?/);

    // A darabszám NumberField csak blur/Enterre committál a törzsadatba
    // (P1-4), de ennek a pusztán UI-visszajelzésnek élőben kell követnie a
    // gépelést, nem várhat a blurre.
    const quantityInput = screen.getByDisplayValue('1');
    await user.clear(quantityInput);
    await user.type(quantityInput, '3');

    await waitFor(() =>
      expect(screen.queryByText(/fog van felsorolva/)).not.toBeInTheDocument(),
    );
    expect(quantityInput).toHaveValue('3');
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
});

describe('PlanEditorPage -- backlog-4: becsült ár ("≈ Becsült" chip) kapcsoló', () => {
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
