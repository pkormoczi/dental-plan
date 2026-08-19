import { describe, expect, it } from 'vitest';
import { KERESES_MIN_KARAKTER, keresoKulcs, paciensTalalatok, torzsadatEgyezik } from './paciensKereses';
import type { PatientFolder, PatientMasterData } from './types';

function patient(nev: string): PatientFolder {
  return { dirName: nev, paciensId: nev, nev };
}

function torzsadat(over: Partial<PatientMasterData>): PatientMasterData {
  return {
    schemaVersion: 1,
    paciensId: 'p1',
    nev: 'Nagy Éva',
    szuletesiIdo: '1985-11-02',
    lakcim: '',
    telefon: '+36 20 555 1234',
    email: '',
    taj: '',
    kiskoru: false,
    torvenyesKepviselo: null,
    ...over,
  };
}

describe('paciensTalalatok', () => {
  it('a teljes név elejére illeszkedő találat megelőzi a szó-eleji egyezést', () => {
    const eva = patient('Éva Kis');
    const nagyEva = patient('Nagy Éva');
    const result = paciensTalalatok([nagyEva, eva], 'ev');
    expect(result).toEqual([eva, nagyEva]);
  });

  it('a szó-eleji egyezés megelőzi a belső egyezést', () => {
    const nagyEva = patient('Nagy Éva'); // szó eleje
    const szever = patient('Szevér Tamás'); // belső egyezés
    const result = paciensTalalatok([szever, nagyEva], 'ev');
    expect(result).toEqual([nagyEva, szever]);
  });

  it('azonos rangon belül alfabetikus (hu) sorrend', () => {
    const b = patient('Nagy Éva');
    const a = patient('Kovács Evelin');
    const result = paciensTalalatok([b, a], 'ev'); // mindkettő szó-eleji egyezés (Éva/Evelin)
    expect(result).toEqual([a, b]);
  });

  it('ékezetfüggetlen', () => {
    const eva = patient('Éva Kis');
    expect(paciensTalalatok([eva], 'eva')).toEqual([eva]);
  });

  it('nem talál egyezést nem tartalmazó nevet', () => {
    const kovacs = patient('Kovács János');
    expect(paciensTalalatok([kovacs], 'xyz')).toEqual([]);
  });

  it('üres keresőszóra üres listát ad', () => {
    const kovacs = patient('Kovács János');
    expect(paciensTalalatok([kovacs], '')).toEqual([]);
    expect(paciensTalalatok([kovacs], '   ')).toEqual([]);
  });

  it('nem mutálja a bemeneti tömböt', () => {
    const patients = [patient('Tóth Zoltán'), patient('Nagy Éva'), patient('Éva Kis')];
    const eredeti = [...patients];
    paciensTalalatok(patients, 'ev');
    expect(patients).toEqual(eredeti);
  });
});

describe('KERESES_MIN_KARAKTER', () => {
  it('2', () => {
    expect(KERESES_MIN_KARAKTER).toBe(2);
  });
});

describe('keresoKulcs', () => {
  it('üres/whitespace keresésre null-t ad', () => {
    expect(keresoKulcs('')).toBeNull();
    expect(keresoKulcs('   ')).toBeNull();
  });

  it('a névrészt normalizálja, a számjegyeket külön gyűjti', () => {
    expect(keresoKulcs('Nagy 1985')).toEqual({ nq: 'nagy 1985', szamjegyek: '1985' });
  });
});

describe('torzsadatEgyezik', () => {
  const eva = torzsadat({});

  it('névre a mai ékezetfüggetlen egyezés', () => {
    expect(torzsadatEgyezik(eva, keresoKulcs('nagy')!)).toBe(true);
    expect(torzsadatEgyezik(eva, keresoKulcs('xyz')!)).toBe(false);
  });

  it('a születési dátum számjegyeire illeszkedik', () => {
    expect(torzsadatEgyezik(eva, keresoKulcs('1985')!)).toBe(true);
    expect(torzsadatEgyezik(eva, keresoKulcs('1102')!)).toBe(true);
  });

  it('a telefonszám számjegyeire illeszkedik, elválasztójeltől függetlenül', () => {
    expect(torzsadatEgyezik(eva, keresoKulcs('5551234')!)).toBe(true);
    expect(torzsadatEgyezik(eva, keresoKulcs('555 1234')!)).toBe(true);
  });

  it('a telefonszám előtag-normalizált alakjára is illeszkedik (06 vs +36)', () => {
    expect(torzsadatEgyezik(eva, keresoKulcs('06205551234')!)).toBe(true);
  });

  it('1 számjegy nem szűkít dátumra/telefonra', () => {
    expect(torzsadatEgyezik(eva, keresoKulcs('1')!)).toBe(false);
  });

  it('nem talál egyezést sem névre, sem számjegyre', () => {
    expect(torzsadatEgyezik(eva, keresoKulcs('999999')!)).toBe(false);
  });
});
