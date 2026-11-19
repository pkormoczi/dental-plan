import { describe, expect, it } from 'vitest';
import { alapertelmezettPenznem, rendeloEgysorosCim, rendeloKetCimmezovel } from './beallitasok';
import type { Settings } from './types';

const settings: Settings = {
  schemaVersion: 1,
  rendelo: {
    nev: 'Teszt Rendelő',
    iranyitoszamVaros: '',
    utcaHazszam: '',
    telefon: '',
    email: '',
    adoszam: '',
    cegjegyzekszam: '',
  },
  orvosok: ['Dr. Teszt Elek'],
  ervenyessegNap: 90,
  alapertelmezettNyelv: 'hu',
};

/** Egy két cím-mező előtti `beallitasok.json` rendelője, ahogy a lemezről jön. */
function regiCimmel(cim: string): Settings {
  const rendelo: Record<string, unknown> = { ...settings.rendelo, cim };
  delete rendelo.iranyitoszamVaros;
  delete rendelo.utcaHazszam;
  return { ...settings, rendelo: rendelo as unknown as Settings['rendelo'] };
}

describe('rendeloKetCimmezovel', () => {
  it('a régi cim az első vesszőnél két mezőre válik, a cim kulcs eltűnik', () => {
    const { rendelo } = rendeloKetCimmezovel(regiCimmel('1117 Budapest, Móricz Zsigmond körtér 15. 3/8'));
    expect(rendelo.iranyitoszamVaros).toBe('1117 Budapest');
    expect(rendelo.utcaHazszam).toBe('Móricz Zsigmond körtér 15. 3/8');
    expect(rendelo).not.toHaveProperty('cim');
  });

  it('csak az első vessző vág: a további vesszők az utca-mezőben maradnak', () => {
    const { rendelo } = rendeloKetCimmezovel(regiCimmel('1117 Budapest, Október 23. utca 8, fsz. 2'));
    expect(rendelo.iranyitoszamVaros).toBe('1117 Budapest');
    expect(rendelo.utcaHazszam).toBe('Október 23. utca 8, fsz. 2');
  });

  it('vessző nélküli régi cim egészében az első mezőbe kerül, az utca-mező üres', () => {
    const { rendelo } = rendeloKetCimmezovel(regiCimmel('1117 Budapest Móricz Zsigmond körtér 15.'));
    expect(rendelo.iranyitoszamVaros).toBe('1117 Budapest Móricz Zsigmond körtér 15.');
    expect(rendelo.utcaHazszam).toBe('');
  });

  it('a két cím-mezős rendelőt változatlanul hagyja', () => {
    const ketMezos: Settings = {
      ...settings,
      rendelo: { ...settings.rendelo, iranyitoszamVaros: '1114 Budapest', utcaHazszam: 'Bartók Béla út 1.' },
    };
    expect(rendeloKetCimmezovel(ketMezos)).toEqual(ketMezos);
  });
});

describe('rendeloEgysorosCim', () => {
  it('a két mezőt vesszővel fűzi egy sorba', () => {
    const rendelo = { ...settings.rendelo, iranyitoszamVaros: '1117 Budapest', utcaHazszam: 'Móricz Zsigmond körtér 15. 3/8' };
    expect(rendeloEgysorosCim(rendelo)).toBe('1117 Budapest, Móricz Zsigmond körtér 15. 3/8');
  });

  it('üres utca-mező mellett nem marad árva vessző', () => {
    expect(rendeloEgysorosCim({ ...settings.rendelo, iranyitoszamVaros: '1117 Budapest' })).toBe('1117 Budapest');
  });
});

describe('alapertelmezettPenznem', () => {
  it('a beállított értéket adja vissza', () => {
    expect(alapertelmezettPenznem({ ...settings, alapertelmezettPenznem: 'EUR' })).toBe('EUR');
  });

  it('hiányzó mező esetén HUF-ra esik vissza', () => {
    expect(alapertelmezettPenznem(settings)).toBe('HUF');
  });
});
