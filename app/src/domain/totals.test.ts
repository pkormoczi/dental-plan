import { describe, expect, it } from 'vitest';
import { computeOsszesitok, osszesitokElter } from './totals';
import type { Fazis } from './types';

const fazisok: Fazis[] = [
  {
    sorszam: 1,
    megnevezes: '1. kezelés',
    megjegyzes: '',
    sorok: [
      {
        tetelId: 't001',
        nevSnapshot: 'Fogeltávolítás',
        savos: false,
        fogak: '',
        mennyiseg: 1,
        listaEgysegar: 25000,
        tenylegesEgysegar: 20000,
      },
    ],
  },
];

describe('osszesitokElter', () => {
  it('returns null when the saved osszesitok matches the recomputed value', () => {
    const mentett = computeOsszesitok(fazisok);
    expect(osszesitokElter(mentett, fazisok)).toBeNull();
  });

  it('returns the recomputed value when the saved osszesitok does not match (P1-3)', () => {
    // Egy kézzel piszkált/sérült fájl, ahol a mentett `fizetendo` nem egyezik
    // az élőben újraszámolt sorokkal.
    const mentett = { kezelesekOsszesen: 25000, kedvezmeny: 0, fizetendo: 25000 };
    const diff = osszesitokElter(mentett, fazisok);
    expect(diff).toEqual({ kezelesekOsszesen: 25000, kedvezmeny: 5000, fizetendo: 20000 });
  });

  it('does NOT mutate or overwrite the passed-in mentett value (D7: the snapshot is the truth)', () => {
    const mentett = { kezelesekOsszesen: 25000, kedvezmeny: 0, fizetendo: 25000 };
    const mentettCopy = { ...mentett };
    osszesitokElter(mentett, fazisok);
    expect(mentett).toEqual(mentettCopy);
  });
});
