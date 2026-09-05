// A terv szerkesztő kezelési sorainak (LineRow) nyelv-/pénznem-függő és
// jelvény-viselkedése -- kiemelve a `PlanEditorPage.test.tsx`-ből (lásd ott
// a fejléc-kommentet), hogy a legkritikusabb UX-pont (billentyűzetes
// tételfelvitel) tesztje ne vesszen el a sor-szintű esetek tömegében. A
// lapot továbbra is teljes egészében rendereli (`renderEditor()`), a
// LineRow/PhaseSection nem önállóan renderelhető komponens.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { createBlankPlan } from '../domain/blankPlan';
import { formatMoney } from '../domain/money';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';
import {
  renderEditor,
  seedGermanPlanWithOneTranslatedItem,
  seedWithIntactPriceList,
  seedWithNoEurPrices,
  seedWithStalePriceRow,
} from './planEditor/testFixtures';

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

    const fogInputs = screen.getAllByPlaceholderText('pl. 16, 17, 26');
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

describe('PlanEditorPage -- nyelv és pénznem', () => {
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
    // 62. tétel óta egy beárazatlan tétel is találat -- ez a jelzés
    // csak akkor jelenik meg, ha a NÉVegyezés is nulla találatot ad.
    await user.type(search, 'zzznincsilyentetel');

    expect(await screen.findByText(/egyetlen aktív tétel sincs beárazva/)).toBeInTheDocument();
  });

  it('62. tétel: egy a terv pénznemében beárazatlan tétel is megtalálható és felvehető, "—" listaárral, 0-ás ajánlati árral', async () => {
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
    // -- a tetelId csak hivatkozásnak marad, a nevSnapshot önálló.
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
   * ezt hu terven sosem jelezné, a nyelvi review viszont igen.
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
    // Nincs "✓ ellenőrizve" sikerjelvény -- a figyelmeztetés egyszerűen eltűnik.
    expect(screen.queryByText(/ellenőrizve/i)).not.toBeInTheDocument();
  });

  it('puszta szóköz-javítás NEM hozza vissza a jelvényt; tényleges átírás igen, de a mismatch-elt mezőn a metaadat érintetlen marad', async () => {
    const user = userEvent.setup();
    seedWithNyelviMismatch();
    renderEditor();

    const nameInput = await screen.findByDisplayValue('Zahnextraktion (angepasst)');
    await user.type(nameInput, ' ');
    await user.keyboard('{Backspace}');
    // Whitespace-only edit -- a mismatch-jelvény továbbra is ott van (nem tűnt el, nem is duplikálódott).
    expect(await screen.findAllByText('DE szöveg')).toHaveLength(4);

    // Teljes átírás a JELENLEGI (hu) nyelven -- önmagában nem old fel,
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

/**
 * Egy piszkozat, aminek van egy örökölt (másolatból hozott) kézi ajánlati
 * árú sora ÉS egy örökölt fázismegjegyzése -- a 90. tétel
 * (`domain/orokoltJelzesek.ts`) badge- és törlés-teszteihez.
 */
function seedWithOrokoltJelzesek() {
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
  const plan = createBlankPlan(seedSettings, seedPriceList);
  plan.paciens.nev = 'Teszt Elek';
  plan.fazisok[0].megjegyzes = 'Régi ütemezés';
  plan.fazisok[0].orokoltMegjegyzes = true;
  plan.fazisok[0].sorok.push({
    tetelId: 't041',
    nevSnapshot: 'Fogeltávolítás',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 25000,
    tenylegesEgysegar: 20000,
    orokoltKeziAr: true,
  });
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({ schemaVersion: 1, mentve: new Date().toISOString(), plan }),
  );
}

describe('PlanEditorPage -- 90. tétel: másolt terv örökölt szakmai-tartalom jelzései', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('örökölt kézi ajánlati árú soron megjelenik az "örökölt ár" jelvény, ár-szerkesztés után eltűnik', async () => {
    const user = userEvent.setup();
    seedWithOrokoltJelzesek();
    renderEditor();

    await screen.findByText('örökölt ár');

    const priceField = screen.getByLabelText('Ajánlati egységár') as HTMLInputElement;
    await user.clear(priceField);
    await user.type(priceField, '21000');
    await user.tab();

    await waitFor(() => expect(screen.queryByText('örökölt ár')).not.toBeInTheDocument());
  });

  it('örökölt fázismegjegyzés mellett megjelenik az "örökölt" jelvény, szerkesztés után eltűnik', async () => {
    const user = userEvent.setup();
    seedWithOrokoltJelzesek();
    renderEditor();

    await screen.findByDisplayValue('Régi ütemezés');
    expect(screen.getByText('örökölt')).toBeInTheDocument();

    const noteField = screen.getByDisplayValue('Régi ütemezés');
    await user.type(noteField, ' + kiegészítve');

    await waitFor(() => expect(screen.queryByText('örökölt')).not.toBeInTheDocument());
  });
});

describe('PlanEditorPage -- 108. tétel: élő Összeg oszlop gépelés közben', () => {
  beforeEach(() => {
    localStorage.clear();
    // Az EUR-teszt a teljes App-ot (HashRouter) rendereli -- a
    // window.location.hash a jsdom window-on nem reset a tesztek között.
    window.location.hash = '';
  });

  /** A soron belüli Összeg cella (az utolsó előtti oszlop, a Törlés gomb előtt). */
  function osszegCella(priceField: HTMLElement) {
    const row = priceField.closest('tr') as HTMLTableRowElement;
    return row.cells[row.cells.length - 2];
  }

  it('az Ajánlati ár mezőbe gépelve az Összeg blur nélkül, azonnal frissül', async () => {
    const user = userEvent.setup();
    seedWithStalePriceRow();
    renderEditor();

    const priceField = await screen.findByLabelText('Ajánlati egységár');
    const osszeg = osszegCella(priceField);
    expect(osszeg).toHaveTextContent('20 000 Ft');

    await user.clear(priceField);
    await user.type(priceField, '12000');

    expect(osszeg).toHaveTextContent('12 000 Ft');
  });

  it('a darabszám mezőbe gépelve az Összeg a többszörösét mutatja, blur nélkül', async () => {
    const user = userEvent.setup();
    seedWithStalePriceRow();
    renderEditor();

    const priceField = await screen.findByLabelText('Ajánlati egységár');
    const osszeg = osszegCella(priceField);
    const mennyisegField = screen.getByLabelText('Darabszám');

    await user.clear(mennyisegField);
    await user.type(mennyisegField, '3');

    expect(osszeg).toHaveTextContent('60 000 Ft');
  });

  it('az ár mező teljes kiürítésekor az Összeg a törlés előtti committált értéket mutatja, nem 0 Ft-ot', async () => {
    const user = userEvent.setup();
    seedWithStalePriceRow();
    renderEditor();

    const priceField = (await screen.findByLabelText('Ajánlati egységár')) as HTMLInputElement;
    const osszeg = osszegCella(priceField);

    await user.clear(priceField);
    expect(osszeg).toHaveTextContent('20 000 Ft');

    await user.tab();
    expect(priceField.value).toBe('20000');
    expect(osszeg).toHaveTextContent('20 000 Ft');
  });

  it('Escape a mezőben: a mező és az Összeg is egyszerre áll vissza a committált értékre', async () => {
    const user = userEvent.setup();
    seedWithStalePriceRow();
    renderEditor();

    const priceField = (await screen.findByLabelText('Ajánlati egységár')) as HTMLInputElement;
    const osszeg = osszegCella(priceField);

    await user.clear(priceField);
    await user.type(priceField, '12000');
    expect(osszeg).toHaveTextContent('12 000 Ft');

    await user.keyboard('{Escape}');
    expect(priceField.value).toBe('20000');
    expect(osszeg).toHaveTextContent('20 000 Ft');
  });

  it('EUR-terven az élő Összeg a helyes euró-értéket mutatja, nem a centben értelmezett számot', async () => {
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

    const priceField = screen.getByLabelText('Ajánlati egységár') as HTMLInputElement;
    const osszeg = osszegCella(priceField);

    await user.clear(priceField);
    await user.type(priceField, '35,50');

    expect(osszeg).toHaveTextContent('35,50 €');
    expect(osszeg).not.toHaveTextContent('0,36 €');
  });

  it('gépelés közben a "Fázis összesen" és a "Mindösszesen" NEM változik, csak commit után', async () => {
    const user = userEvent.setup();
    seedWithStalePriceRow();
    renderEditor();

    const priceField = (await screen.findByLabelText('Ajánlati egységár')) as HTMLInputElement;
    await screen.findByText(/Fázis összesen:/);
    expect(screen.getByText(/Fázis összesen:/).parentElement).toHaveTextContent('20 000 Ft');
    expect(screen.getByText('Mindösszesen').parentElement).toHaveTextContent('20 000 Ft');

    await user.clear(priceField);
    await user.type(priceField, '12000');

    // Az Összeg cella már 12 000 Ft, de a Fázis összesen és a Mindösszesen még a régi.
    expect(screen.getByText(/Fázis összesen:/).parentElement).toHaveTextContent('20 000 Ft');
    expect(screen.getByText('Mindösszesen').parentElement).toHaveTextContent('20 000 Ft');

    await user.tab();
    await waitFor(() =>
      expect(screen.getByText(/Fázis összesen:/).parentElement).toHaveTextContent('12 000 Ft'),
    );
    expect(screen.getByText('Mindösszesen').parentElement).toHaveTextContent('12 000 Ft');
  });
});
