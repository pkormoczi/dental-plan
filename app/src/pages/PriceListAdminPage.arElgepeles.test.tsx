// Elgépelés-védelem az árlista árainál -- külön fájlban a PriceListAdminPage.test.tsx mellett,
// a PriceListAdminPage.leiras.test.tsx fejléc-kommentjében leírt okból (a
// fő teszt-fájl kumulatív lassulása).

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

beforeEach(() => {
  localStorage.clear();
  // A CBCT (24 000 Ft) a seed messze nem-legdrágább aktív HUF tétele
  // (a legdrágább ~1 950 000 Ft) -- egy 10×-es elgépelés itt tisztán a
  // RELATÍV detektort váltja ki, az abszolút néma marad.
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
});

describe('PriceListAdminPage -- backlog-96: elgépelés-védelem', () => {
  it('10x-es HUF ár-ugrás figyelmeztet, a jelzés kis további módosítás után is megmarad', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);

    const hufInput = screen.getByLabelText('HUF ár');
    await user.clear(hufInput);
    await user.type(hufInput, '240000');
    await user.tab();

    expect(await screen.findByText(/Szokatlanul nagy változás/)).toBeInTheDocument();
    expect(findItem(readPriceList(), 'CBCT').ar.HUF).toEqual({ tipus: 'FIX', ertek: 240000 });

    await user.clear(hufInput);
    await user.type(hufInput, '240500');
    await user.tab();

    // A baseline a sor KINYITÁSAKORI (24 000) érték marad, nem a megelőző
    // commit -- a jelzés a kis módosítás után is él.
    expect(await screen.findByText(/Szokatlanul nagy változás/)).toBeInTheDocument();
  });

  it('a "Visszaállítás" gomb a baseline-ra írja vissza az árat, és elviszi a jelzést', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);

    const hufInput = screen.getByLabelText('HUF ár');
    await user.clear(hufInput);
    await user.type(hufInput, '240000');
    await user.tab();

    const visszaallit = await screen.findByRole('button', { name: /Visszaállítás/ });
    await user.click(visszaallit);

    expect(screen.queryByText(/Szokatlanul nagy változás/)).not.toBeInTheDocument();
    expect(findItem(readPriceList(), 'CBCT').ar.HUF).toEqual({ tipus: 'FIX', ertek: 24000 });
  });

  it('a sor újranyitása után az új érték lesz a friss baseline -- nincs jelzés', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);

    const hufInput = screen.getByLabelText('HUF ár');
    await user.clear(hufInput);
    await user.type(hufInput, '240000');
    await user.tab();
    expect(await screen.findByText(/Szokatlanul nagy változás/)).toBeInTheDocument();

    // Sor bezárása (fejlécre kattintás), majd újranyitása.
    await user.click(nameCell);
    await user.click(await screen.findByText('CBCT'));

    expect(screen.queryByText(/Szokatlanul nagy változás/)).not.toBeInTheDocument();
  });

  it('vadonatúj (0 Ft-ról induló) tételnél az abszolút detektor jelez, a relatív néma marad', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText(/118 \/ 118 tétel látszik/);

    const ujTetelGombok = screen.getAllByRole('button', { name: '+ Új tétel' });
    await user.click(ujTetelGombok[0]);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Megnevezés (magyar) *'), 'Kirívó új tétel');
    await user.click(within(dialog).getByRole('combobox', { name: 'Kategória *' }));
    await user.click((await screen.findAllByRole('option'))[0]);
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

    const hufInput = await screen.findByLabelText('HUF ár');
    await user.clear(hufInput);
    await user.type(hufInput, '6000000');
    await user.tab();

    expect(await screen.findByText(/Kirívóan magas ár/)).toBeInTheDocument();
    expect(screen.queryByText(/Szokatlanul nagy változás/)).not.toBeInTheDocument();
  });

  it('a sávos „ig” mezőn is a mező alatt jelenik meg a figyelmeztetés', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);
    // Az ártípus-váltás a sor kinyitása UTÁN keletkező slot -- ennek nincs
    // baseline-ja (a tervdokumentum elfogadott következménye), tehát a
    // relatív detektor itt nem szólalhat meg, csak az abszolút, kellően
    // nagy értéknél (az árlista legdrágább aktív tétele ~1 950 000 Ft).
    await user.click(screen.getByRole('button', { name: 'Fix → sávos' }));

    const ig = screen.getByLabelText('HUF ár — ig');
    await user.clear(ig);
    await user.type(ig, '10000000');
    await user.tab();

    expect(await screen.findByText(/Kirívóan magas ár/)).toBeInTheDocument();
    // A "tól" mező (24 000, változatlan) alatt nem jelenik meg figyelmeztetés.
    const tol = screen.getByLabelText('HUF ár — tól');
    expect(tol).toHaveValue('24000');
    expect(screen.queryByText(/Szokatlanul nagy változás/)).not.toBeInTheDocument();
  });

  it('a −90%-os tömeges árváltoztatás után nyitva maradt soron nincs figyelmeztetés', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);

    await user.click(screen.getByRole('button', { name: 'Tömeges árváltoztatás' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tömeges árváltoztatás' });
    await user.click(within(dialog).getByRole('radio', { name: 'Teljes árlista' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Csökkentés' }));
    const mezo = within(dialog).getByRole('textbox', { name: 'Százalék' });
    await user.type(mezo, '90{Enter}');
    await user.click(within(dialog).getByRole('button', { name: 'Alkalmazás' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Tömeges árváltoztatás megerősítése' });
    await user.click(within(confirm).getByRole('button', { name: 'Alkalmazás' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // A CBCT ára a -90%-os csökkentés után is 24 000 Ft alá esett -- a
    // nyitott soron mégsem jelenik meg figyelmeztetés, mert a baseline a
    // művelet UTÁN újrarögzült a friss értékre (8. döntés).
    expect(findItem(readPriceList(), 'CBCT').ar.HUF).not.toEqual({ tipus: 'FIX', ertek: 24000 });
    expect(screen.queryByText(/Szokatlanul nagy változás/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kirívóan magas ár/)).not.toBeInTheDocument();
  });

  it('az EUR mezők jelzése euróban (nem centben) írja ki az értékeket', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);

    // A CBCT seed EUR ára 66 € (6600 cent) -- 10x = 660 €.
    const eurInput = screen.getByLabelText('EUR ár (€)');
    await user.clear(eurInput);
    await user.type(eurInput, '660');
    await user.tab();

    // A "€" előtti szóköz szándékosan U+00A0 (nem törhető) -- lásd
    // `domain/money.ts` -- innen a `\s`, nem szó szerinti szóköz a regexben.
    // A "66,00 €" a táblázat sorában és a "Visszaállítás" gomb feliratában
    // is megjelenik -- a figyelmeztető szöveg konkrét mondatára szűkítünk.
    expect(await screen.findByText(/Szokatlanul nagy változás.*66,00\s€/)).toBeInTheDocument();
    expect(screen.queryByText(/6\.600/)).not.toBeInTheDocument();
  });
});
