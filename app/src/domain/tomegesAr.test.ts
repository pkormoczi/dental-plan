import { describe, expect, it } from 'vitest';
import {
  alkalmazTomegesArat,
  szazalekHiba,
  tenylegesLepes,
  tomegesArOsszegzes,
  tomegesArSor,
  tomegesArSorok,
  ujAr,
  type TomegesArParams,
} from './tomegesAr';
import type { Tetel } from './types';

function tetel(overrides: Partial<Tetel>): Tetel {
  return {
    id: 't1',
    kategoriaId: 'k01',
    sorrend: 1,
    aktiv: true,
    gyakori: false,
    nev: { hu: 'Teszt', de: null },
    ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: { tipus: 'FIX', ertek: 2800 } },
    ...overrides,
  };
}

const emelesParams = (extra?: Partial<TomegesArParams>): TomegesArParams => ({
  penznem: 'HUF',
  irany: 'emeles',
  szazalek: 5,
  kerekitesKorlat: 100,
  ...extra,
});

describe('tenylegesLepes', () => {
  it('a választott korlátot adja, ha a nyers változás elfér benne', () => {
    expect(tenylegesLepes(100, 500)).toBe(100);
  });

  it('finomabb lépésre vált, ha a nyers változás kisebb a korlátnál', () => {
    // 500 Ft +5%-a: nyers változás 25 Ft -- ez a döntés kulcspéldája.
    expect(tenylegesLepes(1000, 25)).toBe(10);
  });

  it('1 Ft-ra esik vissza, ha a változás 1 alapegység alatt van', () => {
    expect(tenylegesLepes(1000, 0.4)).toBe(1);
  });
});

describe('ujAr -- a felezési invariáns', () => {
  it('500 Ft, +5%, 1000 Ft-os korlát -> 530 Ft, nem 1000 Ft', () => {
    const { ar, lepesek } = ujAr({ tipus: 'FIX', ertek: 500 }, 'emeles', 5, 1000);
    expect(ar).toEqual({ tipus: 'FIX', ertek: 530 });
    expect(lepesek).toEqual([10]);
  });

  it('95 000 Ft, +5%, 100 Ft-os korlát -> 99 800 Ft', () => {
    const { ar } = ujAr({ tipus: 'FIX', ertek: 95000 }, 'emeles', 5, 100);
    expect(ar).toEqual({ tipus: 'FIX', ertek: 99800 });
  });

  it('a kerekítés legfeljebb a kért változás felével térhet el a nyers értéktől', () => {
    // 1 alapegység alatti nyers változásnál a `lepes` a pénz-egész-szám
    // korlát miatt szükségszerűen 1-re esik vissza (lásd `tenylegesLepes`
    // kommentjét) -- az invariáns ott a `nyersValtozas` helyett az 1
    // alapegységnyi rácsméret felével számol.
    for (let regi = 1; regi <= 2000; regi += 17) {
      for (const korlat of [100, 500, 1000]) {
        const { ar } = ujAr({ tipus: 'FIX', ertek: regi }, 'emeles', 5, korlat);
        const nyers = regi * 1.05;
        const nyersValtozas = Math.abs(nyers - regi);
        const eltérés = Math.abs(ar.tipus === 'FIX' ? ar.ertek - nyers : 0);
        expect(eltérés).toBeLessThanOrEqual(Math.max(nyersValtozas, 1) / 2 + 1e-9);
      }
    }
  });

  it('SAVOS: mindkét határ mozdul, külön lépés-számítással (a tervdokumentum példája)', () => {
    const { ar, lepesek } = ujAr({ tipus: 'SAVOS', min: 35000, max: 55000 }, 'emeles', 5, 100);
    expect(ar).toEqual({ tipus: 'SAVOS', min: 36800, max: 57800 });
    expect(lepesek).toEqual([100, 100]);
  });

  it('csökkentésnél sosem megy negatívba (padlózva 0-ra)', () => {
    const { ar } = ujAr({ tipus: 'FIX', ertek: 50 }, 'csokkentes', 90, 1000);
    expect((ar as { tipus: 'FIX'; ertek: number }).ertek).toBeGreaterThanOrEqual(0);
  });
});

describe('tomegesArSor -- állapot-osztályozás', () => {
  it('nincs-ar: hiányzó pénznemű ár nem kap értéket', () => {
    const t = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null } });
    const sor = tomegesArSor(t, emelesParams({ penznem: 'EUR' }));
    expect(sor.allapot).toBe('nincs-ar');
    expect(sor.uj).toBeNull();
  });

  it('nem-valtozik: 0 Ft-os tétel 0 marad', () => {
    const t = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 0 }, EUR: null } });
    const sor = tomegesArSor(t, emelesParams());
    expect(sor.allapot).toBe('nem-valtozik');
  });

  it('nulla-ra-csokkenne: erős csökkentés kis áron kimarad, nem kap 0-t', () => {
    const t = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 1 }, EUR: null } });
    const sor = tomegesArSor(t, { penznem: 'HUF', irany: 'csokkentes', szazalek: 90, kerekitesKorlat: 100 });
    expect(sor.allapot).toBe('nulla-ra-csokkenne');
    expect(sor.uj).toBeNull();
  });

  it('valtozik: jelzi, ha a választottnál finomabb lépés kellett', () => {
    const t = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 500 }, EUR: null } });
    const sor = tomegesArSor(t, emelesParams({ kerekitesKorlat: 1000 }));
    expect(sor.allapot).toBe('valtozik');
    expect(sor.finomabbLepes).toBe(10);
  });

  it('valtozik: nincs finomabbLepes jelzés, ha a választott korlát érvényesült', () => {
    const t = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 95000 }, EUR: null } });
    const sor = tomegesArSor(t, emelesParams({ kerekitesKorlat: 100 }));
    expect(sor.allapot).toBe('valtozik');
    expect(sor.finomabbLepes).toBeNull();
  });

  it('EUR (cent) ugyanazzal a létrával számol', () => {
    // 1 € = 100 cent -- a HUF 100-as fokának EUR párja.
    const t = tetel({ ar: { HUF: null, EUR: { tipus: 'FIX', ertek: 2800 } } });
    const sor = tomegesArSor(t, emelesParams({ penznem: 'EUR', kerekitesKorlat: 100 }));
    expect(sor.allapot).toBe('valtozik');
    // 2800 * 1.05 = 2940, 100-cent lépéssel kerekítve 2900.
    expect(sor.uj).toEqual({ tipus: 'FIX', ertek: 2900 });
  });
});

describe('tomegesArOsszegzes', () => {
  it('csak a nem kivett "valtozik" sorokat számolja változónak', () => {
    const tetelek = [
      tetel({ id: 'a', ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null } }),
      tetel({ id: 'b', ar: { HUF: { tipus: 'FIX', ertek: 20000 }, EUR: null } }),
      tetel({ id: 'c', ar: { HUF: { tipus: 'FIX', ertek: 0 }, EUR: null } }),
      tetel({ id: 'd', ar: { HUF: null, EUR: null } }),
    ];
    const sorok = tomegesArSorok(tetelek, emelesParams());
    const osszegzes = tomegesArOsszegzes(sorok, new Set(['b']));
    expect(osszegzes).toEqual({ valtozik: 1, nincsAr: 1, nemValtozik: 1, nullara: 0, finomabb: 0 });
  });
});

describe('alkalmazTomegesArat', () => {
  it('csak a kijelölt idk-t és csak a HUF ágat módosítja', () => {
    const tetelek = [
      tetel({ id: 'a', ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: { tipus: 'FIX', ertek: 2800 } } }),
      tetel({ id: 'b', ar: { HUF: { tipus: 'FIX', ertek: 20000 }, EUR: { tipus: 'FIX', ertek: 5600 } } }),
    ];
    const next = alkalmazTomegesArat(tetelek, new Set(['a']), emelesParams());
    expect(next.find((x) => x.id === 'a')?.ar.HUF).toEqual({ tipus: 'FIX', ertek: 10500 });
    expect(next.find((x) => x.id === 'a')?.ar.EUR).toEqual({ tipus: 'FIX', ertek: 2800 });
    expect(next.find((x) => x.id === 'b')?.ar.HUF).toEqual({ tipus: 'FIX', ertek: 20000 });
  });

  it('null árat sosem ír felül -- egy nincs-ar tétel érintetlen marad', () => {
    const tetelek = [tetel({ id: 'a', ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null } })];
    const next = alkalmazTomegesArat(tetelek, new Set(['a']), emelesParams({ penznem: 'EUR' }));
    expect(next[0].ar.EUR).toBeNull();
  });

  it('a friss (mentés pillanatában kapott) tetelek-en számol, nem az előnézet befagyasztott értékein', () => {
    const eloneziKor = [tetel({ id: 'a', ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null } })];
    // Időközben megváltozott érték a "friss prev"-ben -- az alkalmazás ebből indul ki.
    const frissTetelek = [tetel({ id: 'a', ar: { HUF: { tipus: 'FIX', ertek: 12000 }, EUR: null } })];
    const next = alkalmazTomegesArat(frissTetelek, new Set(['a']), emelesParams());
    expect(next[0].ar.HUF).toEqual({ tipus: 'FIX', ertek: 12600 });
    expect(eloneziKor[0].ar.HUF).toEqual({ tipus: 'FIX', ertek: 10000 });
  });
});

describe('szazalekHiba', () => {
  it('0%-nál hibát ad', () => {
    expect(szazalekHiba('emeles', 0)).not.toBeNull();
  });

  it('emelésnél 100% fölött hibát ad, 100%-on nem', () => {
    expect(szazalekHiba('emeles', 100)).toBeNull();
    expect(szazalekHiba('emeles', 101)).not.toBeNull();
  });

  it('csökkentésnél 90% fölött hibát ad, 90%-on nem', () => {
    expect(szazalekHiba('csokkentes', 90)).toBeNull();
    expect(szazalekHiba('csokkentes', 91)).not.toBeNull();
  });

  it('érvényes tartományban nincs hiba', () => {
    expect(szazalekHiba('emeles', 5)).toBeNull();
  });
});
