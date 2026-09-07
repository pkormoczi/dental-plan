// A két-fül ütközés dialógusa izoláltan: a doki két VALÓS változat között
// választ, ezért mindkettőről a sorszám és a végösszeg látszik (két időbélyeg
// között nem tudna dönteni). A tényleges huzalozást az AppState.test.tsx
// "piszkozat-ütközés két fül között" leírása fedi.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it, vi } from 'vitest';
import PiszkozatKonfliktusDialog from './PiszkozatKonfliktusDialog';
import type { Plan } from '../domain/types';

function makePlan(sorArak: number[]): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Teszt Elek',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [
      {
        sorszam: 1,
        megnevezes: '1. kezelés',
        megjegyzes: '',
        sorok: sorArak.map((ar) => ({
          tetelId: '',
          nevSnapshot: 'Tétel',
          savos: false,
          fogak: '',
          mennyiseg: 1,
          listaEgysegar: ar,
          tenylegesEgysegar: ar,
        })),
      },
    ],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

function renderDialog(props: Partial<Parameters<typeof PiszkozatKonfliktusDialog>[0]> = {}) {
  const onMegtartomSajat = vi.fn();
  const onBetoltomMasikat = vi.fn();
  render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <PiszkozatKonfliktusDialog
        open
        sajat={makePlan([10000])}
        masik={makePlan([20000, 5000])}
        onMegtartomSajat={onMegtartomSajat}
        onBetoltomMasikat={onBetoltomMasikat}
        onOpenChange={() => {}}
        {...props}
      />
    </Theme>,
  );
  return { onMegtartomSajat, onBetoltomMasikat };
}

describe('PiszkozatKonfliktusDialog', () => {
  it('mindkét változatról a sorszámot és a végösszeget mutatja', () => {
    renderDialog();

    // A címke `<strong>`-ban van, az összefoglaló a körülvevő bekezdésben.
    const sajatSor = screen.getByText(/Ebben az ablakban:/).parentElement!;
    const masikSor = screen.getByText(/A másik ablakban:/).parentElement!;
    expect(sajatSor).toHaveTextContent('1 sor');
    expect(sajatSor).toHaveTextContent('10 000');
    expect(masikSor).toHaveTextContent('2 sor');
    expect(masikSor).toHaveTextContent('25 000');
  });

  it('a két gomb a hozzá tartozó feloldást hívja', async () => {
    const user = userEvent.setup();
    const { onMegtartomSajat, onBetoltomMasikat } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'A saját változatomat mentem' }));
    expect(onMegtartomSajat).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'A másik ablak változatát töltöm be' }));
    expect(onBetoltomMasikat).toHaveBeenCalledTimes(1);
  });

  it('Escape-re zár (onOpenChange(false)) -- se néma elnyelés, se bezárhatatlan csapda', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
