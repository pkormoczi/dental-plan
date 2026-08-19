import { describe, expect, it } from 'vitest';
import { KERESES_MIN_KARAKTER, paciensTalalatok } from './paciensKereses';
import type { PatientFolder } from './types';

function patient(nev: string): PatientFolder {
  return { dirName: nev, paciensId: nev, nev };
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
