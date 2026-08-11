import { describe, expect, it } from 'vitest';
import { fallbackSorok, leirasKoveti, nevKoveti, nyelvvaltasHatasa, resolveNev, sorFallback } from './nev';
import type { Plan, PriceList, Sor, Tetel } from './types';

describe('resolveNev', () => {
  it('returns the hu name for hu', () => {
    expect(resolveNev({ hu: 'Fogeltávolítás', de: 'Zahnextraktion' }, 'hu')).toEqual({
      szoveg: 'Fogeltávolítás',
      fallback: false,
    });
  });

  it('returns the de name for de when present', () => {
    expect(resolveNev({ hu: 'Fogeltávolítás', de: 'Zahnextraktion' }, 'de')).toEqual({
      szoveg: 'Zahnextraktion',
      fallback: false,
    });
  });

  it('falls back to hu for de when no de name exists, and flags it', () => {
    expect(resolveNev({ hu: 'Fogeltávolítás', de: null }, 'de')).toEqual({
      szoveg: 'Fogeltávolítás',
      fallback: true,
    });
  });
});

function sor(partial: Partial<Sor> = {}): Sor {
  return {
    tetelId: 't1',
    nevSnapshot: 'Teszt tétel',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 1000,
    tenylegesEgysegar: 1000,
    ...partial,
  };
}

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak: [],
  tetelek: [
    { id: 't1', kategoriaId: 'k1', sorrend: 1, aktiv: true, gyakori: false, nev: { hu: 'Van DE', de: 'Hat DE' }, ar: { HUF: { tipus: 'FIX', ertek: 1000 }, EUR: null } },
    { id: 't2', kategoriaId: 'k1', sorrend: 2, aktiv: true, gyakori: false, nev: { hu: 'Nincs DE', de: null }, ar: { HUF: { tipus: 'FIX', ertek: 2000 }, EUR: null } },
  ],
};

const tetel1 = priceList.tetelek[0]; // { hu: 'Van DE', de: 'Hat DE' }
const tetel2 = priceList.tetelek[1]; // { hu: 'Nincs DE', de: null }
const tetelById = new Map<string, Tetel>(priceList.tetelek.map((x) => [x.id, x]));

describe('nevKoveti', () => {
  it('igaz, ha a sor neve pontosan az árlistai nevet használja azon a nyelven', () => {
    expect(nevKoveti(sor({ tetelId: 't1', nevSnapshot: 'Hat DE' }), tetel1, 'de')).toBe(true);
    expect(nevKoveti(sor({ tetelId: 't1', nevSnapshot: 'Van DE' }), tetel1, 'hu')).toBe(true);
  });

  it('hamis, ha a sor neve eltér az árlistaitól', () => {
    expect(nevKoveti(sor({ tetelId: 't1', nevSnapshot: 'Átírt szöveg' }), tetel1, 'de')).toBe(false);
  });

  it('hamis, ha a tételnek nincs neve azon a nyelven', () => {
    expect(nevKoveti(sor({ tetelId: 't2', nevSnapshot: 'Nincs DE' }), tetel2, 'de')).toBe(false);
  });
});

const tetelLeirassal: Tetel = {
  id: 't3',
  kategoriaId: 'k1',
  sorrend: 3,
  aktiv: true,
  gyakori: false,
  nev: { hu: 'Csomag', de: 'Paket' },
  ar: { HUF: { tipus: 'FIX', ertek: 5000 }, EUR: null },
  leiras: { hu: 'Implantátum\nFelépítmény', de: null },
};

describe('leirasKoveti', () => {
  it('igaz, ha a snapshot pontosan az árlistai leírást viseli azon a nyelven', () => {
    expect(
      leirasKoveti(sor({ leirasSnapshot: 'Implantátum\nFelépítmény' }), tetelLeirassal, 'hu'),
    ).toBe(true);
  });

  it('hamis, ha a snapshot kézzel eltér', () => {
    expect(leirasKoveti(sor({ leirasSnapshot: 'Kézzel írt szöveg' }), tetelLeirassal, 'hu')).toBe(
      false,
    );
  });

  it('hiányzó DE leírásnál az üres snapshot "követi"-nek számít -- nincs HU-visszaesés (D27)', () => {
    expect(leirasKoveti(sor({ leirasSnapshot: '' }), tetelLeirassal, 'de')).toBe(true);
  });

  it('hiányzó leirasSnapshot mező (régi, a mező bevezetése előtti sor) üres stringként viselkedik', () => {
    expect(leirasKoveti(sor(), tetelLeirassal, 'de')).toBe(true);
  });

  it('regresszió: hu->de->hu oda-vissza nem veszíti el az eredeti magyar leírást', () => {
    // hu-n a sor a tétel hu leírását viseli -- "követi".
    expect(
      leirasKoveti(sor({ leirasSnapshot: 'Implantátum\nFelépítmény' }), tetelLeirassal, 'hu'),
    ).toBe(true);
    // hu -> de váltás után a leírás üresre áll (nincs de fordítás); a
    // visszaváltásnál a RÉGI nyelv 'de', a snapshot ('') pontosan az (üres)
    // de leírást viseli -- tehát "követi", visszaszinkronizálhat hu-ra.
    expect(leirasKoveti(sor({ leirasSnapshot: '' }), tetelLeirassal, 'de')).toBe(true);
  });
});

describe('sorFallback', () => {
  it('hu terven sosem esik vissza', () => {
    expect(sorFallback(sor({ tetelId: 't2', nevSnapshot: 'Nincs DE' }), 'hu', tetelById)).toBeNull();
  });

  it('de terven a fordítás nélküli tétel sora mindig "nincsForditas"', () => {
    expect(sorFallback(sor({ tetelId: 't2', nevSnapshot: 'Nincs DE' }), 'de', tetelById)).toBe(
      'nincsForditas',
    );
  });

  it('de terven, ha van fordítás és a sor azt használja, nincs fallback', () => {
    expect(sorFallback(sor({ tetelId: 't1', nevSnapshot: 'Hat DE' }), 'de', tetelById)).toBeNull();
  });

  it('backlog-3b: de terven, ha van fordítás, de a sor mást mond, "elterAzArlistatol"', () => {
    expect(
      sorFallback(sor({ tetelId: 't1', nevSnapshot: 'Kézzel átírt szöveg' }), 'de', tetelById),
    ).toBe('elterAzArlistatol');
  });

  it('ismeretlen (törölt) tetelId-re nem jelez', () => {
    expect(sorFallback(sor({ tetelId: 'torolve' }), 'de', tetelById)).toBeNull();
  });

  it('backlog-23: egyedi (üres tetelId-jű), kitöltött nevű sor de terven "egyedi"', () => {
    expect(
      sorFallback(sor({ tetelId: '', nevSnapshot: 'Egyedi tétel' }), 'de', tetelById),
    ).toBe('egyedi');
  });

  it('backlog-3: egyedi, üres nevű sort nem jelez -- azt a kitoltetlenSorok kapja el', () => {
    expect(sorFallback(sor({ tetelId: '', nevSnapshot: '' }), 'de', tetelById)).toBeNull();
  });
});

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: 'de',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    sablonVerzio: 'nyilatkozat-de-v1',
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
    fazisok: [],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
}

describe('fallbackSorok', () => {
  it('returns empty lists for a hu plan (never falls back)', () => {
    const plan = makePlan({
      nyelv: 'hu',
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: 't2', nevSnapshot: 'Nincs DE', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 2000, tenylegesEgysegar: 2000 },
          ],
        },
      ],
    });
    expect(fallbackSorok(plan, priceList)).toEqual({ nincsForditas: [], elterAzArlistatol: [], egyedi: [] });
  });

  it('lists snapshot names whose item has no de name under nincsForditas', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: 't1', nevSnapshot: 'Hat DE', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 1000, tenylegesEgysegar: 1000 },
            { tetelId: 't2', nevSnapshot: 'Nincs DE', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 2000, tenylegesEgysegar: 2000 },
          ],
        },
      ],
    });
    expect(fallbackSorok(plan, priceList)).toEqual({
      nincsForditas: ['Nincs DE'],
      elterAzArlistatol: [],
      egyedi: [],
    });
  });

  it('backlog-3b: lists a manually diverged, has-translation row under elterAzArlistatol', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: 't1', nevSnapshot: 'Kézzel átírt szöveg', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 1000, tenylegesEgysegar: 1000 },
          ],
        },
      ],
    });
    expect(fallbackSorok(plan, priceList)).toEqual({
      nincsForditas: [],
      elterAzArlistatol: ['Kézzel átírt szöveg'],
      egyedi: [],
    });
  });

  it('does not warn for a tetelId no longer in the price list', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: 'ismeretlen', nevSnapshot: 'Régi tétel', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 1000, tenylegesEgysegar: 1000 },
          ],
        },
      ],
    });
    expect(fallbackSorok(plan, priceList)).toEqual({ nincsForditas: [], elterAzArlistatol: [], egyedi: [] });
  });

  it('backlog-3: kitöltött egyedi (tetelId nélküli) sor is bekerül de terven, egyedi alá', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: '', nevSnapshot: 'Egyedi anyagköltség', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 0, tenylegesEgysegar: 0 },
          ],
        },
      ],
    });
    expect(fallbackSorok(plan, priceList)).toEqual({
      nincsForditas: [],
      elterAzArlistatol: [],
      egyedi: ['Egyedi anyagköltség'],
    });
  });

  it('backlog-3: üres nevű egyedi sort nem jelez', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: '', nevSnapshot: '', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 0, tenylegesEgysegar: 0 },
          ],
        },
      ],
    });
    expect(fallbackSorok(plan, priceList)).toEqual({ nincsForditas: [], elterAzArlistatol: [], egyedi: [] });
  });
});

describe('nyelvvaltasHatasa', () => {
  it('minden tetelId-hez kötött, egyező nevű sor a "frissul" számlálóba kerül', () => {
    const plan = makePlan({
      nyelv: 'hu',
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: 't1', nevSnapshot: 'Van DE', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 1000, tenylegesEgysegar: 1000 },
          ],
        },
      ],
    });
    expect(nyelvvaltasHatasa(plan, priceList)).toEqual({ frissul: 1, valtozatlan: 0 });
  });

  it('egy kézzel átírt nevű sor a "valtozatlan" számlálóba kerül', () => {
    const plan = makePlan({
      nyelv: 'hu',
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: 't1', nevSnapshot: 'Kézzel írt magyar szöveg', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 1000, tenylegesEgysegar: 1000 },
          ],
        },
      ],
    });
    expect(nyelvvaltasHatasa(plan, priceList)).toEqual({ frissul: 0, valtozatlan: 1 });
  });

  it('egyedi sort nem számol -- azt a nyelváltás sosem érinti', () => {
    const plan = makePlan({
      nyelv: 'hu',
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: '', nevSnapshot: 'Egyedi sor', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 0, tenylegesEgysegar: 0 },
          ],
        },
      ],
    });
    expect(nyelvvaltasHatasa(plan, priceList)).toEqual({ frissul: 0, valtozatlan: 0 });
  });
});
