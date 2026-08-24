import { describe, expect, it } from 'vitest';
import { alapertelmezettPenznem } from './beallitasok';
import type { Settings } from './types';

const settings: Settings = {
  schemaVersion: 1,
  rendelo: {
    nev: 'Teszt Rendelő',
    cim: '',
    telefon: '',
    email: '',
    adoszam: '',
    cegjegyzekszam: '',
  },
  orvosok: ['Dr. Teszt Elek'],
  ervenyessegNap: 90,
  alapertelmezettNyelv: 'hu',
};

describe('alapertelmezettPenznem', () => {
  it('a beállított értéket adja vissza', () => {
    expect(alapertelmezettPenznem({ ...settings, alapertelmezettPenznem: 'EUR' })).toBe('EUR');
  });

  it('hiányzó mező esetén HUF-ra esik vissza', () => {
    expect(alapertelmezettPenznem(settings)).toBe('HUF');
  });
});
