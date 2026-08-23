import { describe, expect, it } from 'vitest';
import { sorElteres } from './sorElteres';
import type { Sor } from './types';

function sor(partial: Partial<Sor> = {}): Sor {
  return {
    tetelId: 't1',
    nevSnapshot: 'Fogeltávolítás',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 25000,
    tenylegesEgysegar: 25000,
    ...partial,
  };
}

describe('sorElteres', () => {
  it('lefelé eltérő ajánlati ár kedvezmény, egész százalékkal', () => {
    const eredmeny = sorElteres(sor({ listaEgysegar: 25000, tenylegesEgysegar: 20000 }));
    expect(eredmeny?.tipus).toBe('kedvezmeny');
    expect(eredmeny?.szazalek).toBeCloseTo(20);
    expect(eredmeny?.cimke).toBe('−20%');
  });

  it('felfelé eltérő ajánlati ár felár, egész százalékkal', () => {
    const eredmeny = sorElteres(sor({ listaEgysegar: 25000, tenylegesEgysegar: 30000 }));
    expect(eredmeny?.tipus).toBe('felar');
    expect(eredmeny?.szazalek).toBeCloseTo(20);
    expect(eredmeny?.cimke).toBe('+20%');
  });

  it('a listaár kétszerese pontosan +100% -- legitim a felár-ágon', () => {
    expect(sorElteres(sor({ listaEgysegar: 10000, tenylegesEgysegar: 20000 }))?.cimke).toBe('+100%');
  });

  it('egyező listaár és ajánlati ár esetén nincs osztályozás', () => {
    expect(sorElteres(sor({ listaEgysegar: 10000, tenylegesEgysegar: 10000 }))).toBeNull();
  });

  it('0 listaár és 0 ajánlati ár sem ad osztályozást', () => {
    expect(sorElteres(sor({ listaEgysegar: 0, tenylegesEgysegar: 0 }))).toBeNull();
  });

  it('0 listaár mellett pozitív ajánlati ár százalék nélküli "Felár"', () => {
    expect(sorElteres(sor({ listaEgysegar: 0, tenylegesEgysegar: 15000 }))).toEqual({
      tipus: 'felar',
      szazalek: null,
      cimke: 'Felár',
    });
  });

  it('0 ajánlati ár pozitív listaár mellett −100% -- legitim, nem hiba', () => {
    expect(sorElteres(sor({ listaEgysegar: 10000, tenylegesEgysegar: 0 }))).toEqual({
      tipus: 'kedvezmeny',
      szazalek: 100,
      cimke: '−100%',
    });
  });

  it('0,3%-os eltérés −0,3%-ot ad, nem 0%-ot', () => {
    expect(sorElteres(sor({ listaEgysegar: 10000, tenylegesEgysegar: 9970 }))?.cimke).toBe('−0,3%');
  });

  it('99,6%-os kedvezmény nem jelenhet meg −100%-ként', () => {
    expect(sorElteres(sor({ listaEgysegar: 10000, tenylegesEgysegar: 40 }))?.cimke).toBe('−99,6%');
  });

  it('ha még 1 tizedesre is 0%-ot adna, szó-alakra esik vissza', () => {
    const eredmeny = sorElteres(sor({ listaEgysegar: 1000000, tenylegesEgysegar: 999999 }));
    expect(eredmeny?.tipus).toBe('kedvezmeny');
    expect(eredmeny?.szazalek).toBeCloseTo(0.0001, 6);
    expect(eredmeny?.cimke).toBe('Kedvezmény');
  });

  it('nincsReferenciaAr esetén sosincs osztályozás, még valódi eltérésnél sem', () => {
    expect(sorElteres(sor({ listaEgysegar: 0, tenylegesEgysegar: 15000 }), true)).toBeNull();
    expect(sorElteres(sor({ listaEgysegar: 25000, tenylegesEgysegar: 20000 }), true)).toBeNull();
  });

  it('nem véges vagy negatív értékre null, nem "Infinity%" jelvény', () => {
    expect(sorElteres(sor({ listaEgysegar: NaN, tenylegesEgysegar: 20000 }))).toBeNull();
    expect(sorElteres(sor({ listaEgysegar: Infinity, tenylegesEgysegar: 20000 }))).toBeNull();
    expect(sorElteres(sor({ listaEgysegar: -5000, tenylegesEgysegar: 20000 }))).toBeNull();
    expect(sorElteres(sor({ listaEgysegar: 25000, tenylegesEgysegar: -1000 }))).toBeNull();
  });

  it('a mennyiség nem befolyásolja az egységár-arányt', () => {
    const a = sorElteres(sor({ listaEgysegar: 25000, tenylegesEgysegar: 20000, mennyiseg: 1 }));
    const b = sorElteres(sor({ listaEgysegar: 25000, tenylegesEgysegar: 20000, mennyiseg: 5 }));
    expect(a).toEqual(b);
  });
});
