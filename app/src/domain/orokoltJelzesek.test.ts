import { describe, expect, it } from 'vitest';
import {
  orokoltInaktivSorok,
  orokoltJelzesekkel,
  orokoltKeziAru,
  orokoltKeziAruSorok,
  orokoltMegjegyzesu,
  orokoltMegjegyzesuFazisok,
  sorPatchOroklessel,
} from './orokoltJelzesek';
import type { Fazis, Plan, PriceList, Sor } from './types';

function sor(partial: Partial<Sor> = {}): Sor {
  return {
    tetelId: 't1',
    nevSnapshot: 'Fogeltávolítás',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 10000,
    tenylegesEgysegar: 10000,
    ...partial,
  };
}

function makePlan(fazisok: Partial<Fazis>[]): Plan {
  return {
    schemaVersion: 1,
    tervId: 't',
    verzio: 1,
    statusz: 'PISZKOZAT',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-01-01',
    ervenyesIg: '2026-02-01',
    arlistaVerzio: '2026-01-01',
    orvos: 'Dr. Teszt',
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
    fazisok: fazisok.map((f, i) => ({
      sorszam: i + 1,
      megnevezes: f.megnevezes ?? `${i + 1}. kezelés`,
      megjegyzes: '',
      sorok: [],
      ...f,
    })),
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak: [],
  tetelek: [
    {
      id: 't1',
      kategoriaId: 'k1',
      sorrend: 1,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Fogeltávolítás', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null },
    },
    {
      id: 't-inaktiv',
      kategoriaId: 'k1',
      sorrend: 2,
      aktiv: false,
      gyakori: false,
      nev: { hu: 'Kivont tétel', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 20000 }, EUR: null },
    },
  ],
};

describe('orokoltJelzesekkel', () => {
  it('kézzel felülírt ajánlati árú sort megjelöl', () => {
    const plan = makePlan([{ sorok: [sor({ listaEgysegar: 10000, tenylegesEgysegar: 8000 })] }]);
    const jelzett = orokoltJelzesekkel(plan, priceList);
    expect(jelzett.fazisok[0].sorok[0].orokoltKeziAr).toBe(true);
  });

  it('követő (lista === tényleges) sort NEM jelöl meg kézi árral', () => {
    const plan = makePlan([{ sorok: [sor()] }]);
    const jelzett = orokoltJelzesekkel(plan, priceList);
    expect(jelzett.fazisok[0].sorok[0].orokoltKeziAr).toBeUndefined();
  });

  it('egyedi sort sosem jelöl meg kézi árral, még ha a mezők explicit egyeznek is', () => {
    const plan = makePlan([{ sorok: [sor({ tetelId: '', listaEgysegar: 0, tenylegesEgysegar: 0 })] }]);
    const jelzett = orokoltJelzesekkel(plan, priceList);
    expect(jelzett.fazisok[0].sorok[0].orokoltKeziAr).toBeUndefined();
  });

  it('inaktivált tételre hivatkozó sort megjelöl, függetlenül a kézi ártól', () => {
    const plan = makePlan([{ sorok: [sor({ tetelId: 't-inaktiv', listaEgysegar: 20000, tenylegesEgysegar: 20000 })] }]);
    const jelzett = orokoltJelzesekkel(plan, priceList);
    expect(jelzett.fazisok[0].sorok[0].orokoltInaktivTetel).toBe(true);
    expect(jelzett.fazisok[0].sorok[0].orokoltKeziAr).toBeUndefined();
  });

  it('nem üres fázismegjegyzést megjelöl, üres megjegyzést nem', () => {
    const plan = makePlan([{ megjegyzes: 'Régi ütemezés' }, { megjegyzes: '' }]);
    const jelzett = orokoltJelzesekkel(plan, priceList);
    expect(jelzett.fazisok[0].orokoltMegjegyzes).toBe(true);
    expect(jelzett.fazisok[1].orokoltMegjegyzes).toBeUndefined();
  });

  it('stale markert explicit false-ra ír, ha a feltétel már nem áll (autoritatív, nem csak additív)', () => {
    const plan = makePlan([
      {
        megjegyzes: '',
        sorok: [sor({ orokoltKeziAr: true, orokoltInaktivTetel: true, listaEgysegar: 10000, tenylegesEgysegar: 10000 })],
      },
    ]);
    plan.fazisok[0].orokoltMegjegyzes = true;
    const jelzett = orokoltJelzesekkel(plan, priceList);
    expect(jelzett.fazisok[0].sorok[0].orokoltKeziAr).toBe(false);
    expect(jelzett.fazisok[0].sorok[0].orokoltInaktivTetel).toBe(false);
    expect(jelzett.fazisok[0].orokoltMegjegyzes).toBe(false);
  });
});

describe('sorPatchOroklessel', () => {
  it('törli az orokoltKeziAr-t, ha a patch az ajánlati árat érinti', () => {
    const s = sor({ orokoltKeziAr: true, listaEgysegar: 10000, tenylegesEgysegar: 8000 });
    expect(sorPatchOroklessel(s, { tenylegesEgysegar: 9000 })).toEqual({
      tenylegesEgysegar: 9000,
      orokoltKeziAr: false,
    });
  });

  it('nem nyúl az orokoltKeziAr-hoz, ha nincs beállítva', () => {
    const s = sor();
    expect(sorPatchOroklessel(s, { tenylegesEgysegar: 9000 })).toEqual({ tenylegesEgysegar: 9000 });
  });

  it('törli az orokoltInaktivTetel-t, ha a tetelId ténylegesen másik tételre vált', () => {
    const s = sor({ tetelId: 't-inaktiv', orokoltInaktivTetel: true });
    expect(sorPatchOroklessel(s, { tetelId: 't1' })).toEqual({ tetelId: 't1', orokoltInaktivTetel: false });
  });

  it('NEM törli az orokoltInaktivTetel-t, ha ugyanarra a tetelId-re választanak újra', () => {
    const s = sor({ tetelId: 't-inaktiv', orokoltInaktivTetel: true });
    expect(sorPatchOroklessel(s, { tetelId: 't-inaktiv', nevSnapshot: 'Kivont tétel' })).toEqual({
      tetelId: 't-inaktiv',
      nevSnapshot: 'Kivont tétel',
    });
  });
});

describe('orokoltKeziAru / orokoltMegjegyzesu -- megosztott predikátumok', () => {
  it('igaz, ha a marker be van állítva ÉS az ár ténylegesen eltér', () => {
    expect(orokoltKeziAru(sor({ orokoltKeziAr: true, listaEgysegar: 10000, tenylegesEgysegar: 8000 }))).toBe(true);
  });

  it('hamis, ha a marker be van állítva, de az ár időközben (pl. pénznemváltással) egyezővé vált', () => {
    expect(orokoltKeziAru(sor({ orokoltKeziAr: true, listaEgysegar: 8000, tenylegesEgysegar: 8000 }))).toBe(false);
  });

  it('hamis, ha a marker nincs beállítva', () => {
    expect(orokoltKeziAru(sor({ listaEgysegar: 10000, tenylegesEgysegar: 8000 }))).toBe(false);
  });

  it('fázis-megjegyzés: igaz, ha a marker be van állítva ÉS a szöveg nem üres', () => {
    expect(orokoltMegjegyzesu({ sorszam: 1, megnevezes: '1. kezelés', megjegyzes: 'Régi', sorok: [], orokoltMegjegyzes: true })).toBe(
      true,
    );
  });

  it('fázis-megjegyzés: hamis, ha a marker be van állítva, de a szöveget kiürítették', () => {
    expect(orokoltMegjegyzesu({ sorszam: 1, megnevezes: '1. kezelés', megjegyzes: '', sorok: [], orokoltMegjegyzes: true })).toBe(
      false,
    );
  });
});

describe('checklist-collectorok', () => {
  it('orokoltKeziAruSorok/orokoltInaktivSorok/orokoltMegjegyzesuFazisok a nevSnapshot/megnevezes listát adja', () => {
    const plan = makePlan([
      {
        sorok: [
          sor({ nevSnapshot: 'Kézi ár', orokoltKeziAr: true, listaEgysegar: 10000, tenylegesEgysegar: 8000 }),
          sor({ nevSnapshot: 'Inaktív', tetelId: 't-inaktiv', orokoltInaktivTetel: true }),
        ],
        megjegyzes: 'Örökölt megjegyzés',
        orokoltMegjegyzes: true,
      },
    ]);
    expect(orokoltKeziAruSorok(plan)).toEqual(['Kézi ár']);
    expect(orokoltInaktivSorok(plan)).toEqual(['Inaktív']);
    expect(orokoltMegjegyzesuFazisok(plan)).toEqual(['1. kezelés']);
  });
});
