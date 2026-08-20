import { describe, expect, it } from 'vitest';
import { computeOsszesitok, elolegOsszegek, elolegTullepi, osszesitokElter, tervVegosszeg } from './totals';
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

describe('tervVegosszeg (backlog-16)', () => {
  it('kedvezmény nélkül a sorok nyers összege', () => {
    expect(tervVegosszeg(fazisok)).toBe(20000);
    expect(tervVegosszeg(fazisok, null)).toBe(20000);
    expect(tervVegosszeg(fazisok, undefined)).toBe(20000);
  });

  it('kedvezménnyel a csökkentett összeg', () => {
    expect(tervVegosszeg(fazisok, 5000)).toBe(15000);
  });

  it('a sorok összegét meghaladó kedvezménynél 0-ra padlóz, soha nem negatív (D25)', () => {
    expect(tervVegosszeg(fazisok, 25000)).toBe(0);
  });
});

describe('computeOsszesitok terv-szintű kedvezménnyel (backlog-16)', () => {
  it('2. paraméter nélkül a mai (csak sorszintű) viselkedés', () => {
    expect(computeOsszesitok(fazisok)).toEqual({
      kezelesekOsszesen: 25000,
      kedvezmeny: 5000,
      fizetendo: 20000,
    });
  });

  it('a fizetendő csökken, és az osszesitok.kedvezmeny a sor- ÉS terv-szintű eltérés összege', () => {
    expect(computeOsszesitok(fazisok, 3000)).toEqual({
      kezelesekOsszesen: 25000,
      kedvezmeny: 8000,
      fizetendo: 17000,
    });
  });
});

describe('osszesitokElter terv-szintű kedvezménnyel (backlog-16)', () => {
  it('nem jelez hamis eltérést egy kedvezményes tervnél', () => {
    const mentett = computeOsszesitok(fazisok, 3000);
    expect(osszesitokElter(mentett, fazisok, 3000)).toBeNull();
  });
});

describe('elolegOsszegek (D66: abszolút összeg)', () => {
  it('az előleg alatt marad a fizetendőnek, a fennmaradó rész a különbség', () => {
    expect(elolegOsszegek(820000, 410000)).toEqual({ eloleg: 410000, fennmarado: 410000 });
  });

  it('a két szám együtt PONTOSAN a fizetendőt adja páratlan összegnél is', () => {
    const { eloleg, fennmarado } = elolegOsszegek(100001, 33000);
    expect(eloleg).toBe(33000);
    expect(eloleg + (fennmarado ?? 0)).toBe(100001);
  });

  it('0 összegű előleg: a teljes összeg marad fenn', () => {
    expect(elolegOsszegek(45000, 0)).toEqual({ eloleg: 0, fennmarado: 45000 });
  });

  it('az előleg pontosan egyenlő a fizetendővel: a fennmaradó rész explicit 0', () => {
    expect(elolegOsszegek(45000, 45000)).toEqual({ eloleg: 45000, fennmarado: 0 });
  });

  it('az előleg meghaladja a fizetendőt: a fennmaradó rész null, nem negatív szám', () => {
    expect(elolegOsszegek(45000, 50000)).toEqual({ eloleg: 50000, fennmarado: null });
  });
});

describe('elolegTullepi (D66)', () => {
  it('igaz, ha az előleg nagyobb a fizetendőnél', () => {
    expect(elolegTullepi(45000, 50000)).toBe(true);
  });

  it('hamis egyenlőségnél és az alatt', () => {
    expect(elolegTullepi(45000, 45000)).toBe(false);
    expect(elolegTullepi(45000, 40000)).toBe(false);
  });
});
