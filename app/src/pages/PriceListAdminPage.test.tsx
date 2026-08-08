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

  it('reflects that all 118 seed items are missing an EUR price (docs/06-arlista-import.md)', async () => {
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

  it('"+ Új tétel" creates a fresh FIX item with a never-before-used id and opens it for editing', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await screen.findByText(/118 \/ 118 tétel látszik/);
    await user.click(screen.getByRole('button', { name: '+ Új tétel' }));

    expect(await screen.findByText(/119 \/ 119 tétel látszik/)).toBeInTheDocument();
    const pl = readPriceList();
    expect(pl.tetelek).toHaveLength(119);
    const created = pl.tetelek[pl.tetelek.length - 1];
    expect(created.id).toBe('t119');
    expect(created.ar.HUF).toEqual({ tipus: 'FIX', ertek: 0 });
  });
});
