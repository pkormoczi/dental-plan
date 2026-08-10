import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import PriceListAdminPage from './PriceListAdminPage';
import { TestProviders } from '../testUtils';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';
import type { PriceList, Tetel } from '../domain/types';

function renderAdmin() {
  return render(
    <TestProviders>
      <PriceListAdminPage />
    </TestProviders>,
  );
}

function readPriceList(): PriceList {
  const raw = localStorage.getItem('dp:arlista.json');
  if (!raw) throw new Error('arlista.json még nincs a localStorage-ban');
  return JSON.parse(raw) as PriceList;
}

function findItem(pl: PriceList, hu: string): Tetel {
  const item = pl.tetelek.find((x) => x.nev.hu === hu);
  if (!item) throw new Error(`Nincs ilyen tétel: ${hu}`);
  return item;
}

/**
 * A tesztek az EUR-ár-kiegészítés munkafolyamatát vizsgálják, ezért egy
 * olyan árlistát seedelünk, amiben egyetlen tételnek sincs EUR ára --
 * függetlenül attól, hogy az élő seed (data/arlista.seed.json) mennyire
 * kész EUR-ban.
 */
function seedPriceListWithNoEurPrices() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) => ({ ...x, ar: { ...x.ar, EUR: null } })),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
}

describe('PriceListAdminPage', () => {
  beforeEach(() => {
    localStorage.clear();
    seedPriceListWithNoEurPrices();
  });

  it('a keresőmezőnek van elérhető neve, nem csak placeholder-e (docs/07)', async () => {
    renderAdmin();
    expect(
      await screen.findByRole('textbox', { name: 'Keresés a tételek között' }),
    ).toBeInTheDocument();
  });

  it('reflects that all 118 seed items are missing an EUR price (per the fixture set up above)', async () => {
    renderAdmin();
    expect(
      await screen.findByText(/118 \/ 118 tétel látszik · 118 tételnél hiányzik az EUR ár/),
    ).toBeInTheDocument();
  });

  it('filling in an EUR price removes the item from the missing-EUR count and persists it', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);

    // Nincs még EUR ára -- előbb hozzá kell adni (a mező euróban kér
    // bevitelt, a tárolás centben történik -- P0-5).
    await user.click(screen.getByRole('button', { name: '+ EUR ár hozzáadása' }));

    const eurInput = screen.getByLabelText('EUR ár (€)');
    await user.clear(eurInput);
    await user.type(eurInput, '5000');
    // A mező blur-re (nem minden leütésre) commitál -- P1-4/P0-7.
    await user.tab();

    expect(await screen.findByText(/117 tételnél hiányzik az EUR ár/)).toBeInTheDocument();

    const cbct = findItem(readPriceList(), 'CBCT');
    // "5000" a mezőben 5000 EURÓ, a tárolt érték centben: 500000.
    expect(cbct.ar.EUR).toEqual({ tipus: 'FIX', ertek: 500000 });
  });

  it('the EUR price field never lets a keystroke persist a truncated cent value under the "Nincs EUR ár" filter (P0-7)', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await screen.findByText(/118 \/ 118 tétel látszik/);
    await user.click(screen.getByRole('radio', { name: 'Nincs EUR ár' }));
    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);
    await user.click(screen.getByRole('button', { name: '+ EUR ár hozzáadása' }));

    const eurInput = screen.getByLabelText('EUR ár (€)');
    await user.clear(eurInput);
    await user.type(eurInput, '82');
    // A sor (és a szerkesztő) NEM tűnhet el gépelés közben, holott a
    // "Nincs EUR ár" szűrő alatt már van (0-ás) EUR ára a tételnek.
    expect(screen.getByLabelText('EUR ár (€)')).toBeInTheDocument();
    await user.tab();

    const cbct = findItem(readPriceList(), 'CBCT');
    expect(cbct.ar.EUR).toEqual({ tipus: 'FIX', ertek: 8200 });
  });

  it('inactivating a row persists aktiv:false without touching its id (D17: never delete/reuse)', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    const rowDiv = nameCell.parentElement!;
    const originalId = findItem(readPriceList(), 'CBCT').id;

    await user.click(within(rowDiv).getByLabelText('Aktív'));

    const cbct = findItem(readPriceList(), 'CBCT');
    expect(cbct.aktiv).toBe(false);
    expect(cbct.id).toBe(originalId);
  });

  it('moving an item to a different category via the dropdown persists the new kategoriaId', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);

    const before = findItem(readPriceList(), 'CBCT').kategoriaId;
    const categories = readPriceList().kategoriak;
    const beforeLabel = categories.find((k) => k.id === before)!.nev.hu;

    // Radix Select: combobox trigger -> portálban megjelenő option lista,
    // nem natív <select> -- userEvent.selectOptions itt nem használható.
    await user.click(screen.getByRole('combobox', { name: 'Kategória' }));
    const options = await screen.findAllByRole('option');
    const otherOption = options.find((o) => o.textContent !== beforeLabel)!;
    const otherLabel = otherOption.textContent;
    await user.click(otherOption);

    const cbct = findItem(readPriceList(), 'CBCT');
    const otherCategory = categories.find((k) => k.nev.hu === otherLabel)!;
    expect(cbct.kategoriaId).toBe(otherCategory.id);
    expect(cbct.kategoriaId).not.toBe(before);
  });

  it('a tétel-sor Enterrel/Space-szel is megnyitható, nem csak kattintással', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    expect(nameCell).toHaveAttribute('aria-expanded', 'false');

    nameCell.focus();
    await user.keyboard('{Enter}');
    expect(nameCell).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Megnevezés (magyar)')).toBeInTheDocument();

    await user.keyboard(' ');
    expect(nameCell).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Megnevezés (magyar)')).not.toBeInTheDocument();
  });

  it('the "Nincs EUR ár" filter still shows everything before any EUR price is filled in', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await screen.findByText(/118 \/ 118 tétel látszik/);
    await user.click(screen.getByRole('radio', { name: 'Nincs EUR ár' }));

    expect(await screen.findByText(/118 \/ 118 tétel látszik/)).toBeInTheDocument();
  });

  it('the "Fix → sávos" toggle converts BOTH the HUF and EUR price together (P0-2/D15)', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);
    await user.click(screen.getByRole('button', { name: '+ EUR ár hozzáadása' }));

    const eurInput = screen.getByLabelText('EUR ár (€)');
    await user.clear(eurInput);
    await user.type(eurInput, '66');
    await user.tab();

    await user.click(screen.getByRole('button', { name: 'Fix → sávos' }));

    const cbct = findItem(readPriceList(), 'CBCT');
    // A HUF listaár (24000 Ft a seedben) ÉS a most beírt EUR ár (66 € =
    // 6600 cent) is min=max-ra vált -- korábban csak a HUF váltott, az EUR
    // szerkezetileg csak FIX maradhatott (elveszítve a D15 `*`
    // lábjegyzet-védelmet egy német ajánlaton).
    expect(cbct.ar.HUF).toEqual({ tipus: 'SAVOS', min: 24000, max: 24000 });
    expect(cbct.ar.EUR).toEqual({ tipus: 'SAVOS', min: 6600, max: 6600 });
  });

  // "+ Új tétel" felugró dialógus: a gomb ma két helyen is megjelenik (a
  // Kategóriák gomb sorában és a lista alján), és a mentés a Mentés gomb
  // megnyomásáig NEM ír a törzsadatba -- se placeholder név, se némán az
  // első kategóriába eső tétel, ahogy a korábbi azonnali-commit viselkedés
  // tette.
  describe('"+ Új tétel" dialógus', () => {
    async function openUjTetelDialog(user: ReturnType<typeof userEvent.setup>) {
      await screen.findByText(/118 \/ 118 tétel látszik/);
      const buttons = screen.getAllByRole('button', { name: '+ Új tétel' });
      expect(buttons).toHaveLength(2);
      await user.click(buttons[0]);
      return screen.getByRole('dialog', { name: 'Új tétel' });
    }

    async function pickFirstCategory(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
      await user.click(within(dialog).getByRole('combobox', { name: 'Kategória *' }));
      const options = await screen.findAllByRole('option');
      const label = options[0].textContent;
      await user.click(options[0]);
      return label;
    }

    it('a fenti ÉS a lenti gomb is ugyanazt a dialógust nyitja', async () => {
      const user = userEvent.setup();
      renderAdmin();
      const dialog = await openUjTetelDialog(user);
      expect(dialog).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      const buttons = screen.getAllByRole('button', { name: '+ Új tétel' });
      await user.click(buttons[1]);
      expect(screen.getByRole('dialog', { name: 'Új tétel' })).toBeInTheDocument();
    });

    it('üres névvel a Mentés hibaszöveget mutat, és semmi nem mentődik', async () => {
      const user = userEvent.setup();
      renderAdmin();
      const dialog = await openUjTetelDialog(user);

      await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

      expect(within(dialog).getByText('A megnevezés nem lehet üres.')).toBeInTheDocument();
      expect(readPriceList().tetelek).toHaveLength(118);
    });

    it('kategória kiválasztása nélkül a Mentés hibaszöveget mutat, és semmi nem mentődik', async () => {
      const user = userEvent.setup();
      renderAdmin();
      const dialog = await openUjTetelDialog(user);

      await user.type(within(dialog).getByLabelText('Megnevezés (magyar) *'), 'Teszt tétel');
      await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

      expect(within(dialog).getByText('Válassz kategóriát.')).toBeInTheDocument();
      expect(readPriceList().tetelek).toHaveLength(118);
    });

    it('kitöltve a Mentés a kiválasztott kategóriában hozza létre a tételt, és a sor a listában nyílik ki', async () => {
      const user = userEvent.setup();
      renderAdmin();
      const dialog = await openUjTetelDialog(user);

      await user.type(within(dialog).getByLabelText('Megnevezés (magyar) *'), 'Teszt új tétel');
      await user.type(within(dialog).getByLabelText('Bezeichnung (német)'), 'Testneues Element');
      const categoryLabel = await pickFirstCategory(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(await screen.findByText(/119 \/ 119 tétel látszik/)).toBeInTheDocument();

      const pl = readPriceList();
      expect(pl.tetelek).toHaveLength(119);
      const created = pl.tetelek[pl.tetelek.length - 1];
      expect(created.id).toBe('t119');
      expect(created.nev).toEqual({ hu: 'Teszt új tétel', de: 'Testneues Element' });
      expect(created.aktiv).toBe(true);
      expect(created.gyakori).toBe(false);
      expect(created.ar.HUF).toEqual({ tipus: 'FIX', ertek: 0 });
      expect(created.ar.EUR).toBeNull();
      const category = pl.kategoriak.find((k) => k.nev.hu === categoryLabel)!;
      expect(created.kategoriaId).toBe(category.id);

      // A HUF ár mező kapja a fókuszt -- a doki a popupban csak nevet és
      // kategóriát adott meg, a logikus következő lépés az ár.
      expect(await screen.findByLabelText('HUF ár')).toHaveFocus();
    });

    it('Mégse eldob mindent, és a következő mentés még mindig a soron következő id-t kapja (D17)', async () => {
      const user = userEvent.setup();
      renderAdmin();
      let dialog = await openUjTetelDialog(user);

      await user.type(within(dialog).getByLabelText('Megnevezés (magyar) *'), 'Elvetett piszkozat');
      await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));

      expect(readPriceList().tetelek).toHaveLength(118);

      const buttons = screen.getAllByRole('button', { name: '+ Új tétel' });
      await user.click(buttons[0]);
      dialog = screen.getByRole('dialog', { name: 'Új tétel' });
      // A mező üresen indul -- a Mégse nem hagyott piszkozatot a következő megnyitásra.
      expect(within(dialog).getByLabelText('Megnevezés (magyar) *')).toHaveValue('');

      await user.type(within(dialog).getByLabelText('Megnevezés (magyar) *'), 'Teszt tétel 2');
      await pickFirstCategory(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

      expect(await screen.findByText(/119 \/ 119 tétel látszik/)).toBeInTheDocument();
      const created = readPriceList().tetelek.at(-1)!;
      expect(created.id).toBe('t119');
    });

    it('pontosan egyező névnél figyelmeztet, de a Mentés attól még végigmegy', async () => {
      const user = userEvent.setup();
      renderAdmin();
      const dialog = await openUjTetelDialog(user);

      await user.type(within(dialog).getByLabelText('Megnevezés (magyar) *'), 'CBCT');
      expect(
        await within(dialog).findByText('Már van ilyen nevű tétel a listában.'),
      ).toBeInTheDocument();

      await pickFirstCategory(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

      expect(await screen.findByText(/119 \/ 119 tétel látszik/)).toBeInTheDocument();
      expect(readPriceList().tetelek.filter((x) => x.nev.hu === 'CBCT')).toHaveLength(2);
    });
  });

  // backlog-7: az admin szűrője eddig CSAK a magyar néven illesztett, a
  // szerkesztő tétel-keresője viszont mindkét nyelven -- egy csak németül
  // megtalálható tétel itt egyáltalán nem jött elő.
  it('a keresés a német néven is talál (a sor továbbra is a magyar nevet mutatja)', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await screen.findByText(/118 \/ 118 tétel látszik/);
    const search = screen.getByPlaceholderText('Keresés a tételek között…');
    // A "Zahnhals" kizárólag a nev.de-ben szerepel ("Zahnhalsfüllung"), a
    // magyar név "Fognyaki tömés".
    await user.type(search, 'zahnhals');

    expect(await screen.findByText('Fognyaki tömés')).toBeInTheDocument();
    expect(screen.queryByText('Zahnhalsfüllung')).not.toBeInTheDocument();
  });

  // docs/08-backlog.md 8. tétel: kategória-karbantartó panel.
  describe('Kategóriák panel', () => {
    function catPanel(): HTMLElement {
      return document.getElementById('kategoriak-panel')!;
    }

    async function openCatPanel(user: ReturnType<typeof userEvent.setup>) {
      await screen.findByText(/118 \/ 118 tétel látszik/);
      const toggle = screen.getByRole('button', { name: /Kategóriák/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    }

    it('alapból csukva van, nyitva az összes kategóriát felsorolja', async () => {
      const user = userEvent.setup();
      renderAdmin();
      expect(document.getElementById('kategoriak-panel')).not.toBeInTheDocument();

      await openCatPanel(user);
      const kategoriak = readPriceList().kategoriak;
      for (const k of kategoriak) {
        expect(within(catPanel()).getByText(k.nev.hu)).toBeInTheDocument();
      }
    });

    it('"+ Új kategória" szürke, üres kategóriát hoz létre és megnyitja szerkesztésre', async () => {
      const user = userEvent.setup();
      renderAdmin();
      await openCatPanel(user);

      const before = readPriceList().kategoriak.length;
      await user.click(within(catPanel()).getByRole('button', { name: '+ Új kategória' }));

      const pl = readPriceList();
      expect(pl.kategoriak).toHaveLength(before + 1);
      const created = pl.kategoriak.at(-1)!;
      expect(created.nev.hu).toBe('Új kategória');
      expect(created.szin).toBe('#adb5bd');
      expect(created.sorrend).toBe(before + 1);

      // Rögtön szerkesztésre nyílik -- a HU név mező a jelenlegi értékkel látszik.
      expect(within(catPanel()).getByDisplayValue('Új kategória')).toBeInTheDocument();
    });

    it('kategória átnevezése (HU/DE) perzisztálódik', async () => {
      const user = userEvent.setup();
      renderAdmin();
      await openCatPanel(user);

      await user.click(within(catPanel()).getByRole('button', { name: '+ Új kategória' }));
      const created = readPriceList().kategoriak.at(-1)!;

      const huInput = within(catPanel()).getByDisplayValue('Új kategória');
      await user.clear(huInput);
      await user.type(huInput, 'Fogszabályozás');

      const deInput = within(catPanel()).getByPlaceholderText('még nincs megadva');
      await user.type(deInput, 'Kieferorthopädie');

      const updated = readPriceList().kategoriak.find((k) => k.id === created.id)!;
      expect(updated.nev.hu).toBe('Fogszabályozás');
      expect(updated.nev.de).toBe('Kieferorthopädie');
    });

    it('fel/le mozgatás megcseréli két szomszédos kategória sorrendjét, a szélső nyíl tiltva', async () => {
      const user = userEvent.setup();
      renderAdmin();
      await openCatPanel(user);

      const sorted = readPriceList().kategoriak.slice().sort((a, b) => a.sorrend - b.sorrend);
      const first = sorted[0];
      const second = sorted[1];

      const firstRow = within(catPanel()).getByText(first.nev.hu).closest('tr')!;
      expect(within(firstRow).getByRole('button', { name: 'Kategória feljebb' })).toBeDisabled();

      await user.click(within(firstRow).getByRole('button', { name: 'Kategória lejjebb' }));

      const updated = readPriceList().kategoriak;
      expect(updated.find((k) => k.id === first.id)!.sorrend).toBe(second.sorrend);
      expect(updated.find((k) => k.id === second.id)!.sorrend).toBe(first.sorrend);
    });

    it('a törlés gomb tiltva marad akkor is, ha egy kategória MINDEN tétele inaktív (8. döntés)', async () => {
      const user = userEvent.setup();
      renderAdmin();
      await openCatPanel(user);

      // A legkisebb tételszámú kategóriát választjuk, hogy a tesztben minden
      // tételét kényelmesen inaktiválni tudjuk -- utána a kategória "üresnek"
      // TŰNIK aktív tételek alapján nézve, de a törlés gombnak mégis
      // tiltottnak kell maradnia, mert az inaktív tételek bármikor
      // visszakapcsolhatók.
      const pl = readPriceList();
      const counts = new Map<string, number>();
      for (const x of pl.tetelek) counts.set(x.kategoriaId, (counts.get(x.kategoriaId) ?? 0) + 1);
      const smallestId = [...counts.entries()].sort((a, b) => a[1] - b[1])[0][0];
      const smallest = pl.kategoriak.find((k) => k.id === smallestId)!;
      const itemsInSmallest = pl.tetelek.filter((x) => x.kategoriaId === smallestId);

      for (const item of itemsInSmallest) {
        const nameCell = await screen.findByText(item.nev.hu);
        const rowDiv = nameCell.parentElement!;
        await user.click(within(rowDiv).getByLabelText('Aktív'));
      }

      expect(
        readPriceList().tetelek.filter((x) => x.kategoriaId === smallestId && x.aktiv),
      ).toHaveLength(0);

      const catRow = within(catPanel()).getByText(smallest.nev.hu).closest('tr')!;
      expect(within(catRow).getByRole('button', { name: 'Kategória törlése' })).toBeDisabled();
    });

    it('üres (frissen létrehozott) kategória törölhető', async () => {
      const user = userEvent.setup();
      renderAdmin();
      await openCatPanel(user);

      await user.click(within(catPanel()).getByRole('button', { name: '+ Új kategória' }));
      const created = readPriceList().kategoriak.at(-1)!;

      const createdRow = within(catPanel()).getByText(created.nev.hu).closest('tr')!;
      const deleteButton = within(createdRow).getByRole('button', { name: 'Kategória törlése' });
      expect(deleteButton).not.toBeDisabled();
      await user.click(deleteButton);

      expect(readPriceList().kategoriak.some((k) => k.id === created.id)).toBe(false);
    });

    it('a színválasztó palettából kiválasztott szín perzisztálódik', async () => {
      const user = userEvent.setup();
      renderAdmin();
      await openCatPanel(user);

      await user.click(within(catPanel()).getByRole('button', { name: '+ Új kategória' }));
      const created = readPriceList().kategoriak.at(-1)!;

      await user.click(within(catPanel()).getByRole('radio', { name: 'Türkiz' }));

      const updated = readPriceList().kategoriak.find((k) => k.id === created.id)!;
      expect(updated.szin).toBe('#20c997');
    });

    it('a kategória-sor is Enterrel/Space-szel nyitható billentyűzetről', async () => {
      const user = userEvent.setup();
      renderAdmin();
      await openCatPanel(user);

      const first = readPriceList().kategoriak.slice().sort((a, b) => a.sorrend - b.sorrend)[0];
      const nameCell = within(catPanel()).getByText(first.nev.hu);
      expect(nameCell).toHaveAttribute('aria-expanded', 'false');

      nameCell.focus();
      await user.keyboard('{Enter}');
      expect(nameCell).toHaveAttribute('aria-expanded', 'true');
      expect(within(catPanel()).getByDisplayValue(first.nev.hu)).toBeInTheDocument();
    });

    it('az új kategória a tétel-szerkesztő Kategória legördülőjében is megjelenik', async () => {
      const user = userEvent.setup();
      renderAdmin();
      await openCatPanel(user);

      await user.click(within(catPanel()).getByRole('button', { name: '+ Új kategória' }));

      const nameCell = await screen.findByText('CBCT');
      await user.click(nameCell);
      await user.click(screen.getByRole('combobox', { name: 'Kategória' }));

      expect(await screen.findByRole('option', { name: /Új kategória/ })).toBeInTheDocument();
    });
  });
});
