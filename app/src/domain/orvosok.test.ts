import { describe, expect, it } from 'vitest';
import { aktivOrvosok, alapertelmezettOrvosNeve, orvosProblema, ujVerzioOrvosa } from './orvosok';
import type { Settings } from './types';

const settings: Settings = {
  schemaVersion: 1,
  rendelo: {
    nev: 'Teszt Rendelő',
    cim: '',
    telefon: '',
    email: '',
    adoszam: '',
    cegjegyzekszam: '',
  },
  orvosok: ['Dr. Régi Rezső', 'Dr. Új Orsolya'],
  ervenyessegNap: 90,
  alapertelmezettNyelv: 'hu',
};

describe('aktivOrvosok', () => {
  it('hiányzó inaktivOrvosok esetén minden orvos aktív', () => {
    expect(aktivOrvosok(settings)).toEqual(['Dr. Régi Rezső', 'Dr. Új Orsolya']);
  });

  it('kiszűri az inaktivOrvosok-ban szereplő neveket, a roster sorrendjét megtartva', () => {
    const s = { ...settings, inaktivOrvosok: ['Dr. Régi Rezső'] };
    expect(aktivOrvosok(s)).toEqual(['Dr. Új Orsolya']);
  });

  it('a rosterből már törölt, de az inaktivOrvosok-ban maradt név nem okoz hibát', () => {
    const s = { ...settings, inaktivOrvosok: ['Dr. Régi Rezső', 'Dr. Törölt Tamás'] };
    expect(aktivOrvosok(s)).toEqual(['Dr. Új Orsolya']);
  });

  it('trim-tolerő az inaktivOrvosok egyezésnél', () => {
    const s = { ...settings, inaktivOrvosok: [' Dr. Régi Rezső '] };
    expect(aktivOrvosok(s)).toEqual(['Dr. Új Orsolya']);
  });
});

describe('alapertelmezettOrvosNeve', () => {
  it('az explicit alapertelmezettOrvos-t adja, ha az aktív', () => {
    const s = { ...settings, alapertelmezettOrvos: 'Dr. Új Orsolya' };
    expect(alapertelmezettOrvosNeve(s)).toBe('Dr. Új Orsolya');
  });

  it('inaktív explicit érték esetén az első aktív névre esik vissza', () => {
    const s = {
      ...settings,
      alapertelmezettOrvos: 'Dr. Régi Rezső',
      inaktivOrvosok: ['Dr. Régi Rezső'],
    };
    expect(alapertelmezettOrvosNeve(s)).toBe('Dr. Új Orsolya');
  });

  it('nem létező explicit érték esetén az első aktív névre esik vissza', () => {
    const s = { ...settings, alapertelmezettOrvos: 'Dr. Ismeretlen' };
    expect(alapertelmezettOrvosNeve(s)).toBe('Dr. Régi Rezső');
  });

  it('hiányzó explicit érték esetén az első aktív nevet adja', () => {
    expect(alapertelmezettOrvosNeve(settings)).toBe('Dr. Régi Rezső');
  });

  it('aktív orvos híján üres stringet ad', () => {
    const s = { ...settings, inaktivOrvosok: settings.orvosok };
    expect(alapertelmezettOrvosNeve(s)).toBe('');
  });

  it('üres roster esetén üres stringet ad', () => {
    const s = { ...settings, orvosok: [] };
    expect(alapertelmezettOrvosNeve(s)).toBe('');
  });
});

describe('ujVerzioOrvosa', () => {
  it('aktív forrás esetén változatlan marad, fallback nélkül', () => {
    expect(ujVerzioOrvosa('Dr. Új Orsolya', settings)).toEqual({
      orvos: 'Dr. Új Orsolya',
      fallback: null,
    });
  });

  it('inaktivált forrás esetén a globális defaultra esik, fallback-bel', () => {
    const s = {
      ...settings,
      inaktivOrvosok: ['Dr. Régi Rezső'],
      alapertelmezettOrvos: 'Dr. Új Orsolya',
    };
    expect(ujVerzioOrvosa('Dr. Régi Rezső', s)).toEqual({
      orvos: 'Dr. Új Orsolya',
      fallback: { regi: 'Dr. Régi Rezső', uj: 'Dr. Új Orsolya' },
    });
  });

  it('a rosterből törölt (árva) forrás ugyanúgy fallback-el, mint egy inaktivált', () => {
    const s = { ...settings, orvosok: ['Dr. Új Orsolya'] };
    expect(ujVerzioOrvosa('Dr. Törölt Tamás', s)).toEqual({
      orvos: 'Dr. Új Orsolya',
      fallback: { regi: 'Dr. Törölt Tamás', uj: 'Dr. Új Orsolya' },
    });
  });

  it('üres forrás esetén a defaultra esik, fallback nélkül', () => {
    expect(ujVerzioOrvosa('', settings)).toEqual({
      orvos: 'Dr. Régi Rezső',
      fallback: null,
    });
  });
});

describe('orvosProblema', () => {
  const aktivNevek = ['Dr. Régi Rezső', 'Dr. Új Orsolya'];

  it('üres orvosnál "hianyzik"-ot ad', () => {
    expect(orvosProblema('', aktivNevek)).toBe('hianyzik');
  });

  it('nem aktív névnél "nem-aktiv"-ot ad', () => {
    expect(orvosProblema('Dr. Törölt Tamás', aktivNevek)).toBe('nem-aktiv');
  });

  it('aktív névnél null-t ad', () => {
    expect(orvosProblema('Dr. Régi Rezső', aktivNevek)).toBeNull();
  });
});
