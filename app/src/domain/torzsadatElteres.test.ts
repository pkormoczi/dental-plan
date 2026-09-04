// 104. tétel: a lánc-fa törzsadat-eltérés jelzésének tiszta magja.
// docs/03-funkcionalis-spec.md § 5. Terv-láncok és verziók.

import { describe, expect, it } from 'vitest';
import { paciensElteres, verzioElteresek } from './torzsadatElteres';
import type { Paciens, PatientMasterData, Plan } from './types';

function makePaciens(overrides: Partial<Paciens> = {}): Paciens {
  return {
    nev: 'Kovács János',
    szuletesiIdo: '1978-03-14',
    lakcim: '1113 Budapest, Bartók Béla út 42. 2/5',
    telefon: '+36 30 123 4567',
    email: 'kovacs.janos@example.hu',
    taj: '123 456 789',
    kiskoru: false,
    torvenyesKepviselo: null,
    ...overrides,
  };
}

function makeMaster(overrides: Partial<Paciens> = {}): PatientMasterData {
  return { schemaVersion: 1, paciensId: 'p1', ...makePaciens(overrides) };
}

function makePlan(paciens: Paciens): Plan {
  return {
    schemaVersion: 1,
    tervId: 't',
    verzio: 1,
    statusz: 'VEGLEGES',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-01-01',
    ervenyesIg: '2026-02-01',
    arlistaVerzio: '2026-01-01',
    orvos: 'Dr. Teszt',
    paciens,
    fazisok: [],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

describe('paciensElteres', () => {
  it('nincs törzsadat -- üres listát ad', () => {
    expect(paciensElteres(null, makePaciens())).toEqual([]);
  });

  it('azonos adatoknál üres listát ad', () => {
    expect(paciensElteres(makeMaster(), makePaciens())).toEqual([]);
  });

  it('csak az eltérő mezőket sorolja fel', () => {
    const master = makeMaster();
    const snapshot = makePaciens({ telefon: '+36 70 000 0000' });
    expect(paciensElteres(master, snapshot).map((e) => e.kulcs)).toEqual(['telefon']);
  });
});

describe('verzioElteresek', () => {
  it('nincs törzsadat -- üres map, storage-hívás nélkül is', () => {
    const plansByVersion = { 'p1/v1': makePlan(makePaciens()) };
    expect(verzioElteresek(null, plansByVersion)).toEqual({});
  });

  it('csak az eltérő verziókat veszi fel a mapbe', () => {
    const master = makeMaster();
    const plansByVersion = {
      'p1/v1': makePlan(makePaciens({ telefon: '+36 70 000 0000' })),
      'p1/v2': makePlan(makePaciens()),
    };
    const elteresek = verzioElteresek(master, plansByVersion);
    expect(Object.keys(elteresek)).toEqual(['p1/v1']);
    expect(elteresek['p1/v1'].map((e) => e.kulcs)).toEqual(['telefon']);
  });

  it('egy be nem töltött (olvashatatlan) verzió eleve nincs a plansByVersion-ben -- némán kimarad', () => {
    const master = makeMaster({ telefon: '+36 70 000 0000' });
    // Az olvashatatlan verzió a hívó plansByVersion-jéből eleve hiányzik --
    // itt csak azt ellenőrizzük, hogy egy üres map üres eredményt ad.
    expect(verzioElteresek(master, {})).toEqual({});
  });
});
