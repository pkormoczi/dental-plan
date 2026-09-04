// Tömeges árváltoztatás dialógus (backlog-92) -- külön fájlban a
// PriceListAdminPage.test.tsx mellett, a PriceListAdminPage.leiras.test.tsx
// fejléc-kommentjében leírt okból (a fő teszt-fájl már ma is 40+ KB, minden
// új describe csak tovább lassítaná).

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

function seedPriceListWithNoEurPrices() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) => ({ ...x, ar: { ...x.ar, EUR: null } })),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText(/118 \/ 118 tétel látszik/);
  await user.click(screen.getByRole('button', { name: 'Tömeges árváltoztatás' }));
  return screen.getByRole('dialog', { name: 'Tömeges árváltoztatás' });
}

/** Kategória kör kiválasztása + a kategória-select kitöltése "Diagnosztika és konzultáció"-ra (3 tétel, mind FIX, mind >0 Ft). */
async function valasztKategoriat(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.click(within(dialog).getByRole('radio', { name: 'Kategória' }));
  await user.click(within(dialog).getByRole('combobox', { name: 'Kategória' }));
  await user.click(await screen.findByRole('option', { name: 'Diagnosztika és konzultáció' }));
}

async function irjSzazalekot(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, ertek: string) {
  const mezo = within(dialog).getByRole('textbox', { name: 'Százalék' });
  await user.type(mezo, `${ertek}{Enter}`);
}

describe('PriceListAdminPage -- backlog-92: Tömeges árváltoztatás', () => {
  beforeEach(() => {
    localStorage.clear();
    seedPriceListWithNoEurPrices();
  });

  it('kategória-kör, HUF, +5%: csak a kategória tételei változnak, a többi bájtra azonos marad', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const eredetiVerzio = readPriceList().arlistaVerzio;
    const dialog = await openDialog(user);

    await valasztKategoriat(user, dialog);
    await irjSzazalekot(user, dialog, '5');

    await screen.findByText('3 tétel HUF ára változik');

    await user.click(within(dialog).getByRole('button', { name: 'Alkalmazás' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Tömeges árváltoztatás megerősítése' });
    await user.click(within(confirm).getByRole('button', { name: 'Alkalmazás' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const utana = readPriceList();
    expect(findItem(utana, 'Konzultáció/fél óránként').ar.HUF).toEqual({ tipus: 'FIX', ertek: 10500 });
    expect(findItem(utana, 'Panoráma-, TeleRtg, Arcüregfelvétel').ar.HUF).toEqual({
      tipus: 'FIX',
      ertek: 9500,
    });
    expect(findItem(utana, 'CBCT').ar.HUF).toEqual({ tipus: 'FIX', ertek: 25200 });

    // Az összes többi (nem k01) tétel bájtra azonos.
    const eredeti = seedPriceList.tetelek.filter((x) => x.kategoriaId !== 'k01');
    for (const x of eredeti) {
      expect(findItem(utana, x.nev.hu).ar).toEqual({ ...x.ar, EUR: null });
    }

    expect(utana.arlistaVerzio).not.toBe(eredetiVerzio);
  });

  it('soronkénti kihagyás: a kipipálásból kivett sor ára a mentés után változatlan', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const dialog = await openDialog(user);

    await valasztKategoriat(user, dialog);
    await irjSzazalekot(user, dialog, '5');
    await screen.findByText('3 tétel HUF ára változik');

    await user.click(within(dialog).getByRole('checkbox', { name: 'CBCT' }));
    await screen.findByText('2 tétel HUF ára változik');

    await user.click(within(dialog).getByRole('button', { name: 'Alkalmazás' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Tömeges árváltoztatás megerősítése' });
    await user.click(within(confirm).getByRole('button', { name: 'Alkalmazás' }));

    const utana = readPriceList();
    expect(findItem(utana, 'CBCT').ar.HUF).toEqual({ tipus: 'FIX', ertek: 24000 });
    expect(findItem(utana, 'Konzultáció/fél óránként').ar.HUF).toEqual({ tipus: 'FIX', ertek: 10500 });
  });

  it('0%-nál az Alkalmazás hibaszöveget mutat, nem ment', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const eredetiVerzio = readPriceList().arlistaVerzio;
    const dialog = await openDialog(user);

    await valasztKategoriat(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Alkalmazás' }));

    expect(
      within(dialog).getByText('A százaléknak nullánál nagyobbnak kell lennie.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(readPriceList().arlistaVerzio).toBe(eredetiVerzio);
  });

  it('Escape nyomtalanul eldobja a piszkozatot, a lista változatlan marad', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const eredetiVerzio = readPriceList().arlistaVerzio;
    const dialog = await openDialog(user);

    await valasztKategoriat(user, dialog);
    await irjSzazalekot(user, dialog, '5');
    await screen.findByText('3 tétel HUF ára változik');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const utana = readPriceList();
    expect(utana.arlistaVerzio).toBe(eredetiVerzio);
    expect(findItem(utana, 'CBCT').ar.HUF).toEqual({ tipus: 'FIX', ertek: 24000 });
  });

  it('nincs aktív keresés/szűrő esetén a "jelenlegi szűrt lista" kör-opció nem jelenik meg', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const dialog = await openDialog(user);

    expect(within(dialog).queryByText(/A jelenlegi szűrt lista/)).not.toBeInTheDocument();
  });

  it('aktív kereséssel megjelenik a "jelenlegi szűrt lista" kör-opció, a találatok számával', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText(/118 \/ 118 tétel látszik/);
    await user.type(screen.getByPlaceholderText('Keresés a tételek között…'), 'CBCT');
    await screen.findByText(/1 \/ 118 tétel látszik/);

    await user.click(screen.getByRole('button', { name: 'Tömeges árváltoztatás' }));
    const dialog = screen.getByRole('dialog', { name: 'Tömeges árváltoztatás' });
    expect(within(dialog).getByText('A jelenlegi szűrt lista (1 tétel)')).toBeInTheDocument();
  });

  it('kategórianévre keresve a "jelenlegi szűrt lista" kör pontosan a kategória-egyezéssel bekerült tételeket fogja', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText(/118 \/ 118 tétel látszik/);
    // A "Fogkőeltávolítás" két tétele csak a kategórianéven át találat.
    await user.type(screen.getByPlaceholderText('Keresés a tételek között…'), 'fogko');
    await screen.findByText(/2 \/ 118 tétel látszik/);

    await user.click(screen.getByRole('button', { name: 'Tömeges árváltoztatás' }));
    const dialog = screen.getByRole('dialog', { name: 'Tömeges árváltoztatás' });
    expect(within(dialog).getByText('A jelenlegi szűrt lista (2 tétel)')).toBeInTheDocument();
  });

  // 106. tétel: a sor-szintű "Mentve ✓" kizárólag a közvetlen sor-szerkesztést
  // (patchItem) váltja ki, a Tömeges árváltoztatást nem -- száz egyszerre
  // felvillanó felirat nem visszajelzés, hanem zaj.
  it('a Tömeges árváltoztatás alkalmazása után egyetlen sor sem mutat "Mentve ✓"-t', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const dialog = await openDialog(user);

    await valasztKategoriat(user, dialog);
    await irjSzazalekot(user, dialog, '5');
    await screen.findByText('3 tétel HUF ára változik');

    await user.click(within(dialog).getByRole('button', { name: 'Alkalmazás' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Tömeges árváltoztatás megerősítése' });
    await user.click(within(confirm).getByRole('button', { name: 'Alkalmazás' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(findItem(readPriceList(), 'CBCT').ar.HUF).toEqual({ tipus: 'FIX', ertek: 25200 });
    expect(screen.queryByText('Mentve ✓')).not.toBeInTheDocument();
  });
});
