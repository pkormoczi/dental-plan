import { describe, expect, it } from 'vitest';
import { tetelIlleszkedik, tetelMegtartando } from './arlistaSzures';
import type { Tetel } from './types';

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
    expect(tetelIlleszkedik(tetel(), '', 'all')).toBe(true);
  });

  it('ékezetfüggetlenül, mindkét nyelven keres', () => {
    expect(tetelIlleszkedik(tetel(), 'fogeltavolitas', 'all')).toBe(true);
    expect(tetelIlleszkedik(tetel(), 'zahnextraktion', 'all')).toBe(true);
    expect(tetelIlleszkedik(tetel(), 'zzznincsilyen', 'all')).toBe(false);
  });

  it('"noeur" szűrő csak az EUR ár nélküli tételeket engedi át', () => {
    expect(tetelIlleszkedik(tetel({ ar: { HUF: { tipus: 'FIX', ertek: 15000 }, EUR: null } }), '', 'noeur')).toBe(
      true,
    );
    expect(tetelIlleszkedik(tetel(), '', 'noeur')).toBe(false);
  });

  it('"range" szűrő a HUF vagy EUR sávos tételeket engedi át', () => {
    const savos = tetel({ ar: { HUF: { tipus: 'SAVOS', min: 1000, max: 2000 }, EUR: null } });
    expect(tetelIlleszkedik(savos, '', 'range')).toBe(true);
    expect(tetelIlleszkedik(tetel(), '', 'range')).toBe(false);
  });

  it('"off" szűrő csak az inaktív tételeket engedi át', () => {
    expect(tetelIlleszkedik(tetel({ aktiv: false }), '', 'off')).toBe(true);
    expect(tetelIlleszkedik(tetel(), '', 'off')).toBe(false);
  });

  it('"fav" szűrő csak a gyakori tételeket engedi át', () => {
    expect(tetelIlleszkedik(tetel({ gyakori: true }), '', 'fav')).toBe(true);
    expect(tetelIlleszkedik(tetel(), '', 'fav')).toBe(false);
  });
});

describe('tetelMegtartando', () => {
  it('a nyitott sort megtartja akkor is, ha a szűrő egyébként kizárná', () => {
    const item = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 15000 }, EUR: null } });
    expect(tetelMegtartando(item, '', 'range', item.id)).toBe(true);
  });

  it('nem nyitott sorra a sima illeszkedés dönt', () => {
    const item = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 15000 }, EUR: null } });
    expect(tetelMegtartando(item, '', 'range', 'mas-id')).toBe(false);
    expect(tetelMegtartando(item, '', 'all', 'mas-id')).toBe(true);
  });
});
