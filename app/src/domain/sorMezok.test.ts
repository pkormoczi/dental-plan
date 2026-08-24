import { describe, expect, it } from 'vitest';
import { sorMezokEgyedibol, sorMezokTetelbol } from './sorMezok';
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
    leiras: { hu: 'HU leírás', de: 'DE Beschreibung' },
    ...overrides,
  };
}

describe('sorMezokTetelbol', () => {
  it('FIX árnál a listaEgysegar/tenylegesEgysegar az ertek, nem savos', () => {
    const mezok = sorMezokTetelbol(tetel(), 'HUF', 'hu');
    expect(mezok.tetelId).toBe('t001');
    expect(mezok.nevSnapshot).toBe('Fogeltávolítás');
    expect(mezok.savos).toBe(false);
    expect(mezok.listaEgysegar).toBe(15000);
    expect(mezok.tenylegesEgysegar).toBe(15000);
    expect(mezok.leirasSnapshot).toBe('HU leírás');
    expect(mezok.nevNyelv).toBeNull();
    expect(mezok.leirasNyelv).toBeNull();
  });

  it('SAVOS árnál a basePrice() a min-t adja, savos: true', () => {
    const item = tetel({ ar: { HUF: { tipus: 'SAVOS', min: 20000, max: 40000 }, EUR: null } });
    const mezok = sorMezokTetelbol(item, 'HUF', 'hu');
    expect(mezok.savos).toBe(true);
    expect(mezok.listaEgysegar).toBe(20000);
    expect(mezok.tenylegesEgysegar).toBe(20000);
  });

  it('a terv pénznemében nem beárazott tételnél 0-t ad, savos: false', () => {
    const item = tetel({ ar: { HUF: { tipus: 'FIX', ertek: 15000 }, EUR: null } });
    const mezok = sorMezokTetelbol(item, 'EUR', 'hu');
    expect(mezok.listaEgysegar).toBe(0);
    expect(mezok.tenylegesEgysegar).toBe(0);
    expect(mezok.savos).toBe(false);
  });

  it('a nevet és leírást a kért nyelven adja (fallback nélkül)', () => {
    const mezok = sorMezokTetelbol(tetel(), 'HUF', 'de');
    expect(mezok.nevSnapshot).toBe('Zahnextraktion');
    expect(mezok.leirasSnapshot).toBe('DE Beschreibung');
  });

  it('hiányzó DE leírásnál üres stringet ad, nem esik vissza HU-ra', () => {
    const item = tetel({ leiras: { hu: 'HU leírás', de: null } });
    const mezok = sorMezokTetelbol(item, 'HUF', 'de');
    expect(mezok.leirasSnapshot).toBe('');
  });
});

describe('sorMezokEgyedibol', () => {
  it('üres tetelId-t és 0 árat ad, a nevet trim-eli', () => {
    const mezok = sorMezokEgyedibol('  Saját kezelés  ', 'hu');
    expect(mezok.tetelId).toBe('');
    expect(mezok.nevSnapshot).toBe('Saját kezelés');
    expect(mezok.savos).toBe(false);
    expect(mezok.listaEgysegar).toBe(0);
    expect(mezok.tenylegesEgysegar).toBe(0);
    expect(mezok.leirasSnapshot).toBe('');
  });

  it('a nevNyelv-et a hívó nyelvére állítja, a leirasNyelv marad null', () => {
    const mezok = sorMezokEgyedibol('Saját kezelés', 'de');
    expect(mezok.nevNyelv).toEqual({ authoredInLanguage: 'de' });
    expect(mezok.leirasNyelv).toBeNull();
  });
});
