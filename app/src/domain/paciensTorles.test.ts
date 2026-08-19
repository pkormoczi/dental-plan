import { describe, expect, it } from 'vitest';
import { paciensTorlesAkadaly } from './paciensTorles';
import type { PlanChainData } from './planChainData';
import type { Paciens, Plan, TervStatusz } from './types';

const paciens: Paciens = {
  nev: 'Kovács János',
  szuletesiIdo: '1978-03-14',
  lakcim: '1113 Budapest, Bartók Béla út 42. 2/5',
  telefon: '+36 30 123 4567',
  email: 'kovacs.janos@example.hu',
  taj: '123 456 789',
  kiskoru: false,
  torvenyesKepviselo: null,
};

function makePlan(statusz: TervStatusz): Plan {
  return {
    schemaVersion: 1,
    tervId: 't1',
    verzio: 1,
    statusz,
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-01-01',
    ervenyesIg: '2026-02-01',
    arlistaVerzio: '2026-01-01',
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: 'Dr. Teszt',
    paciens,
    fazisok: [],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

function chainData(overrides: Partial<PlanChainData> = {}): PlanChainData {
  return {
    plans: [],
    versionsByPlan: {},
    plansByVersion: {},
    totalsByVersion: {},
    unreadable: false,
    ...overrides,
  };
}

describe('paciensTorlesAkadaly', () => {
  it('null, ha nincs terv-lánc egyáltalán (törölhető, terv nélküli páciens)', () => {
    expect(paciensTorlesAkadaly(chainData(), false)).toBeNull();
  });

  it('null, ha minden verzió PISZKOZAT és nincs saját aktív draft', () => {
    const data = chainData({ plansByVersion: { 'a/v1': makePlan('PISZKOZAT') } });
    expect(paciensTorlesAkadaly(data, false)).toBeNull();
  });

  it("'veglegesitett-terv', ha legalább egy verzió VEGLEGES", () => {
    const data = chainData({
      plansByVersion: { 'a/v1': makePlan('PISZKOZAT'), 'a/v2': makePlan('VEGLEGES') },
    });
    expect(paciensTorlesAkadaly(data, false)).toBe('veglegesitett-terv');
  });

  it("'aktiv-piszkozat', ha a doki jelenlegi drafja ehhez a pácienshez tartozik", () => {
    expect(paciensTorlesAkadaly(chainData(), true)).toBe('aktiv-piszkozat');
  });

  it("'nem-olvashato', ha a chainData null", () => {
    expect(paciensTorlesAkadaly(null, false)).toBe('nem-olvashato');
  });

  it("'nem-olvashato', ha legalább egy verzió/lánc nem volt betölthető", () => {
    const data = chainData({ unreadable: true });
    expect(paciensTorlesAkadaly(data, false)).toBe('nem-olvashato');
  });

  it("egy olvashatatlan VEGLEGES verziónál is 'veglegesitett-terv' az elsőbbség, nem 'nem-olvashato'", () => {
    const data = chainData({
      plansByVersion: { 'a/v1': makePlan('VEGLEGES') },
      unreadable: true,
    });
    expect(paciensTorlesAkadaly(data, false)).toBe('veglegesitett-terv');
  });

  it("'veglegesitett-terv' előzi meg az 'aktiv-piszkozat'-ot", () => {
    const data = chainData({ plansByVersion: { 'a/v1': makePlan('VEGLEGES') } });
    expect(paciensTorlesAkadaly(data, true)).toBe('veglegesitett-terv');
  });
});
