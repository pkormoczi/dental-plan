import { describe, expect, it } from 'vitest';
import { tetelIlleszkedik, tetelMegtartando } from './arlistaSzures';
import type { Tetel } from './types';

const URES_KAT_IDK = new Set<string>();

function tetel(overrides: Partial<Tetel> = {}): Tetel {
  return {
    id: 't001',
    kategoriaId: 'k01',
    sorrend: 1,
    aktiv: true,
    gyakori: false,
    nev: { hu: 'Fogeltávolítás', de: 'Zahnextraktion' },
    ar: { HUF: { tipus: 'FIX', ertek: 15000 }, EUR: { tipus: 'FIX', ertek: 40 } },
    ...overrides,
  };
}

describe('tetelIlleszkedik', () => {
  it('üres kereséssel és "all" szűrővel mindig igaz', () => {
    expect(tetelIlleszkedik(tetel(), '', 'all', URES_KAT_IDK)).toBe(true);
  });

  it('ékezetfüggetlenül, mindkét nyelven keres', () => {
    expect(tetelIlleszkedik(tetel(), 'fogeltavolitas', 'all', URES_KAT_IDK)).toBe(true);
    expect(tetelIlleszkedik(tetel(), 'zahnextraktion', 'all', URES_KAT_IDK)).toBe(true);
    expect(tetelIlleszkedik(tetel(), 'zzznincsilyen', 'all', URES_KAT_IDK)).toBe(false);
  });

  it('a kategórianévre illeszkedő kategória-id-n át is találat, akkor is, ha a tétel neve nem egyezik', () => {
    const item = tetel({ kategoriaId: 'k02' });
    expect(tetelIlleszkedik(item, 'zzznincsilyen', 'all', new Set(['k02']))).toBe(true);
    expect(tetelIlleszkedik(item, 'zzznincsilyen', 'all', new Set(['mas-kat']))).toBe(false);
  });

  it('"noeur" szűrő csak az EUR ár nélküli tételeket engedi át', () => {
    expect(
      tetelIlleszkedik(
        tetel({ ar: { HUF: { tipus: 'FIX', ertek: 15000 }, EUR: null } }),
        '',
        'noeur',
        URES_KAT_IDK,
      ),
    ).toBe(true);
    expect(tetelIlleszkedik(tetel(), '', 'noeur', URES_KAT_IDK)).toBe(false);
  });

  it('"range" szűrő a HUF vagy EUR sávos tételeket engedi át', () => {
    const savos = tetel({ ar: { HUF: { tipus: 'SAVOS', min: 1000, max: 2000 }, EUR: null } });
    expect(tetelIlleszkedik(savos, '', 'range', URES_KAT_IDK)).toBe(true);
    expect(tetelIlleszkedik(tetel(), '', 'range', URES_KAT_IDK)).toBe(false);
  });

  it('"off" szűrő csak az inaktív tételeket engedi át', () => {
    expect(tetelIlleszkedik(tetel({ aktiv: false }), '', 'off', URES_KAT_IDK)).toBe(true);
    expect(tetelIlleszkedik(tetel(), '', 'off', URES_KAT_IDK)).toBe(false);
  });

  it('"fav" szűrő csak a gyakori tételeket engedi át', () => {
    expect(tetelIlleszkedik(tetel({ gyakori: true }), '', 'fav', URES_KAT_IDK)).toBe(true);
    expect(tetelIlleszkedik(tetel(), '', 'fav', URES_KAT_IDK)).toBe(false);
  });
});

describe('tetelMegtartando', () => {
  it('a nyitott sort megtartja akkor is, ha a szűrő egyébként kizárná', () => {
    const item = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 15000 }, EUR: null } });
    expect(tetelMegtartando(item, '', 'range', item.id, URES_KAT_IDK)).toBe(true);
  });

  it('nem nyitott sorra a sima illeszkedés dönt', () => {
    const item = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 15000 }, EUR: null } });
    expect(tetelMegtartando(item, '', 'range', 'mas-id', URES_KAT_IDK)).toBe(false);
    expect(tetelMegtartando(item, '', 'all', 'mas-id', URES_KAT_IDK)).toBe(true);
  });
});
