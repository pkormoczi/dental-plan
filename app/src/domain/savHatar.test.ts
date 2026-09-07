import { describe, expect, it } from 'vitest';
import { savHatarArbol, savonBelul, sorReferenciaAr } from './savHatar';
import type { Sor } from './types';

/** A t016 valós HUF sávja: 38 000--65 000. */
function sor(partial: Partial<Sor> = {}): Sor {
  return {
    tetelId: 't016',
    nevSnapshot: 'Gyökértömés csatornaszámtól függően',
    savos: true,
    fogak: '46',
    mennyiseg: 1,
    listaEgysegar: 38000,
    tenylegesEgysegar: 38000,
    savHatar: { min: 38000, max: 65000 },
    ...partial,
  };
}

describe('savHatarArbol', () => {
  it('SAVOS árból a min/max párt adja', () => {
    expect(savHatarArbol({ tipus: 'SAVOS', min: 38000, max: 65000 })).toEqual({
      min: 38000,
      max: 65000,
    });
  });

  it('FIX árra és hiányzó árra null -- nem hagyhat ittfelejtett sávot a soron', () => {
    expect(savHatarArbol({ tipus: 'FIX', ertek: 10000 })).toBeNull();
    expect(savHatarArbol(null)).toBeNull();
    expect(savHatarArbol(undefined)).toBeNull();
  });
});

describe('savonBelul', () => {
  it('a sáv két végpontja is BELÜL van (zárt intervallum)', () => {
    expect(savonBelul(sor({ tenylegesEgysegar: 38000 }))).toBe(true);
    expect(savonBelul(sor({ tenylegesEgysegar: 65000 }))).toBe(true);
  });

  it('a sávon belüli köztes ár is belül van', () => {
    expect(savonBelul(sor({ tenylegesEgysegar: 55000 }))).toBe(true);
  });

  it('a sáv fölött és alatt kívül van', () => {
    expect(savonBelul(sor({ tenylegesEgysegar: 70000 }))).toBe(false);
    expect(savonBelul(sor({ tenylegesEgysegar: 30000 }))).toBe(false);
  });

  it('sávhatár nélküli (régi) soron hamis -- a mező bevezetése előtti sor a mai viselkedést kapja', () => {
    expect(savonBelul(sor({ savHatar: undefined, tenylegesEgysegar: 55000 }))).toBe(false);
    expect(savonBelul(sor({ savHatar: null, tenylegesEgysegar: 55000 }))).toBe(false);
  });

  it('fordított sávnál (min > max) üres az intervallum, tehát hamis', () => {
    const forditott = sor({ savHatar: { min: 65000, max: 38000 }, tenylegesEgysegar: 55000 });
    expect(savonBelul(forditott)).toBe(false);
  });

  it('a `savos` kapcsoló nem befolyásolja -- az a nyomtatvány *-áról dönt, nem az árazásról', () => {
    expect(savonBelul(sor({ savos: false, tenylegesEgysegar: 55000 }))).toBe(true);
  });
});

describe('sorReferenciaAr', () => {
  it('sávon belül maga az ajánlati ár, tehát nincs mihez képest eltérni', () => {
    expect(sorReferenciaAr(sor({ tenylegesEgysegar: 55000 }))).toBe(55000);
  });

  it('sávon kívül a felvételkori listaEgysegar (a sáv alja), nem a max', () => {
    expect(sorReferenciaAr(sor({ tenylegesEgysegar: 70000 }))).toBe(38000);
    expect(sorReferenciaAr(sor({ tenylegesEgysegar: 30000 }))).toBe(38000);
  });

  it('sávhatár nélküli soron a listaEgysegar', () => {
    expect(sorReferenciaAr(sor({ savHatar: null, tenylegesEgysegar: 55000 }))).toBe(38000);
  });
});
