import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PriceListAdminPage from './PriceListAdminPage';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
import type { PriceList, Tetel } from '../domain/types';

function renderAdmin() {
  return render(
    <MemoryRouter>
      <StorageProvider>
        <AppStateProvider>
          <PriceListAdminPage />
        </AppStateProvider>
      </StorageProvider>
    </MemoryRouter>,
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

describe('PriceListAdminPage', () => {
  beforeEach(() => {
    localStorage.clear();
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

    const eurInput = screen.getByPlaceholderText('—');
    await user.type(eurInput, '5000');

    expect(await screen.findByText(/117 tételnél hiányzik az EUR ár/)).toBeInTheDocument();

    const cbct = findItem(readPriceList(), 'CBCT');
    expect(cbct.ar.EUR).toEqual({ tipus: 'FIX', ertek: 5000 });
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

    const select = screen.getByLabelText('Kategória') as HTMLSelectElement;
    const before = select.value;
    const otherOption = within(select)
      .getAllByRole('option')
      .map((o) => o as HTMLOptionElement)
      .find((o) => o.value !== before)!;

    await user.selectOptions(select, otherOption.value);

    const cbct = findItem(readPriceList(), 'CBCT');
    expect(cbct.kategoriaId).toBe(otherOption.value);
    expect(cbct.kategoriaId).not.toBe(before);
  });

  it('the "Nincs EUR ár" filter still shows everything before any EUR price is filled in', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await screen.findByText(/118 \/ 118 tétel látszik/);
    await user.click(screen.getByRole('button', { name: 'Nincs EUR ár' }));

    expect(await screen.findByText(/118 \/ 118 tétel látszik/)).toBeInTheDocument();
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
