// A legkritikusabb UX-pont tesztje (lásd CLAUDE.md "A UX kritikus pontja"):
// gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a fókuszt ->
// gépel tovább, egérhasználat nélkül.
//
// A LineRow/PhaseSection sor-szintű jelvényeit és a nyelv/pénznem-függő
// viselkedést a `PlanEditorPage.sorok.test.tsx` fedi (kiemelve innen); az
// ElolegBlokk/EgyediVegosszegBlokk saját, izolált komponensteszteket kapott
// (`pages/planEditor/ElolegBlokk.test.tsx`,
// `pages/planEditor/EgyediVegosszegBlokk.test.tsx`) -- lásd
// backlog/plans/backlog-93-nagy-komponensfajlok-terv.md.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createBlankPlan } from '../domain/blankPlan';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';
import { renderEditor } from './planEditor/testFixtures';

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

  it('backlog-27: a darabszám automatikusan követi a fogak mezőt, kézi felülbírálásig', async () => {
    const user = userEvent.setup();
    renderEditor();

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    const result = await screen.findByText('Fogeltávolítás');
    await user.click(result);

    const teethInput = screen.getByPlaceholderText('pl. 16, 17, 26');
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

    const teethInput = screen.getByPlaceholderText('pl. 16, 17, 26');
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

    const teethInput = screen.getByPlaceholderText('pl. 16, 17, 26');
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

    const teethInput = screen.getByPlaceholderText('pl. 16, 17, 26');
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

    const teethInput = screen.getByPlaceholderText('pl. 16, 17, 26');
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
