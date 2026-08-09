import { describe, expect, it } from 'vitest';
import { computeOsszesitok, elolegOsszegek, osszesitokElter } from './totals';
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

describe('elolegOsszegek', () => {
  it('a szokásos 50%-ot pontosan felezi', () => {
    expect(elolegOsszegek(820000, 50)).toEqual({ eloleg: 410000, fennmarado: 410000 });
  });

  it('egész pénznemegységre kerekít, és a két szám együtt PONTOSAN a fizetendőt adja', () => {
    // 33% egy páratlan összegre: a kerekítés nem hozhat létre 1 Ft-os rést.
    const { eloleg, fennmarado } = elolegOsszegek(100001, 33);
    expect(eloleg).toBe(33000);
    expect(eloleg + fennmarado).toBe(100001);
  });

  it('0%: nincs előleg, a teljes összeg marad fenn', () => {
    expect(elolegOsszegek(45000, 0)).toEqual({ eloleg: 0, fennmarado: 45000 });
  });

  it('100%: a teljes összeg előleg, nincs fennmaradó rész', () => {
    expect(elolegOsszegek(45000, 100)).toEqual({ eloleg: 45000, fennmarado: 0 });
  });
});
