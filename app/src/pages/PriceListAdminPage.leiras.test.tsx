// docs/02-domain-modell.md § Tétel-leírás: tétel-leírás + csomag-jelölés az Árlista
// adminban. Külön fájlban a PriceListAdminPage.test.tsx mellett -- a fő
// fájl 25+ tesztje egyetlen vitest-fájlon belül kumulatívan lassul (lásd
// vite.config.ts testTimeout-kommentje a "kategória-átnevezés" tesztről),
// ide kerülve a két itteni teszt saját, friss modulkörnyezetben fut, nem
// terheli tovább a már határeset fájlt.

import { render, screen } from '@testing-library/react';
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

describe('PriceListAdminPage -- backlog-10: leírás és csomag-jelölés', () => {
  beforeEach(() => {
    localStorage.clear();
    seedPriceListWithNoEurPrices();
  });

  it(
    'a leírás hu/de mezők nem ejtenek karaktert gyors gépelésnél (a BufferedTextField mintáján)',
    async () => {
      const user = userEvent.setup();
      renderAdmin();

      const nameCell = await screen.findByText('CBCT');
      await user.click(nameCell);

      // Rövid, de többkarakteres szöveg -- elég a gyors-gépelés (P0-7 minta)
      // igazolásához, nem kell hosszú mondat a teszt lényegéhez.
      const leirasHu = screen.getByLabelText('Leírás (mi van benne?)');
      await user.type(leirasHu, 'Kontraszt');
      expect(leirasHu).toHaveValue('Kontraszt');

      const leirasDe = screen.getByLabelText('Beschreibung (mi van benne, németül)');
      await user.type(leirasDe, 'Kontrast');
      expect(leirasDe).toHaveValue('Kontrast');

      const cbct = findItem(readPriceList(), 'CBCT');
      expect(cbct.leiras).toEqual({ hu: 'Kontraszt', de: 'Kontrast' });
    },
    20000,
  );

  it('a csomag checkbox alapból kikapcsolt, kattintásra bekapcsol és perzisztál', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const nameCell = await screen.findByText('CBCT');
    await user.click(nameCell);

    const csomag = screen.getByRole('checkbox', { name: /Csomagtétel/ });
    expect(csomag).not.toBeChecked();

    await user.click(csomag);
    expect(csomag).toBeChecked();
    expect(findItem(readPriceList(), 'CBCT').csomag).toBe(true);
  });
});
