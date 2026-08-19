import { describe, expect, it } from 'vitest';
import {
  RECENT_PACIENS_LIMIT,
  aktivitasSzoveg,
  ervenyesAktivitas,
  legutobbAktivPaciensek,
  ujAktivitas,
} from './paciensAktivitas';
import type { PatientActivity, PatientFolder } from './types';

function makePatient(overrides: Partial<PatientFolder> = {}): PatientFolder {
  return { dirName: 'p1', paciensId: 'p1', nev: 'A Páciens', ...overrides };
}

describe('ujAktivitas', () => {
  it('a megadott most szerinti ISO időbélyeget hordozza', () => {
    const most = new Date('2026-08-09T10:15:00.000Z');
    expect(ujAktivitas('letrehozva', most)).toEqual({
      tipus: 'letrehozva',
      idopont: '2026-08-09T10:15:00.000Z',
    });
  });
});

describe('ervenyesAktivitas', () => {
  it('elfogadja az érvényes objektumot', () => {
    const value = { tipus: 'terv-veglegesitve', idopont: '2026-08-09T10:15:00.000Z' };
    expect(ervenyesAktivitas(value)).toEqual(value);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['szám', 42],
    ['string', 'x'],
    ['tömb', []],
    ['üres objektum', {}],
    ['ismeretlen tipus', { tipus: 'torolve', idopont: '2026-08-09T10:15:00.000Z' }],
    ['hiányzó idopont', { tipus: 'letrehozva' }],
    ['nem string idopont', { tipus: 'letrehozva', idopont: 12345 }],
    ['parse-olhatatlan idopont', { tipus: 'letrehozva', idopont: 'nem-datum' }],
  ])('sosem dob, %s esetén undefined-et ad', (_label, value) => {
    expect(ervenyesAktivitas(value)).toBeUndefined();
  });
});

describe('legutobbAktivPaciensek', () => {
  it('utolsoAktivitas nélküli pácienst kihagy', () => {
    const withActivity = makePatient({
      dirName: 'a',
      nev: 'A',
      utolsoAktivitas: { tipus: 'letrehozva', idopont: '2026-08-09T10:00:00.000Z' },
    });
    const withoutActivity = makePatient({ dirName: 'b', nev: 'B' });
    expect(legutobbAktivPaciensek([withActivity, withoutActivity], 5)).toEqual([withActivity]);
  });

  it('csökkenő időrendben ad vissza', () => {
    const regi = makePatient({
      dirName: 'a',
      nev: 'A',
      utolsoAktivitas: { tipus: 'letrehozva', idopont: '2026-08-01T10:00:00.000Z' },
    });
    const uj = makePatient({
      dirName: 'b',
      nev: 'B',
      utolsoAktivitas: { tipus: 'letrehozva', idopont: '2026-08-09T10:00:00.000Z' },
    });
    expect(legutobbAktivPaciensek([regi, uj], 5)).toEqual([uj, regi]);
  });

  it('holtversenynél név szerint rendez', () => {
    const azonos: PatientActivity = { tipus: 'letrehozva', idopont: '2026-08-09T10:00:00.000Z' };
    const b = makePatient({ dirName: 'b', nev: 'Béla', utolsoAktivitas: azonos });
    const a = makePatient({ dirName: 'a', nev: 'Ádám', utolsoAktivitas: azonos });
    expect(legutobbAktivPaciensek([b, a], 5)).toEqual([a, b]);
  });

  it('a limitre vág', () => {
    const patients = Array.from({ length: RECENT_PACIENS_LIMIT + 2 }, (_, i) =>
      makePatient({
        dirName: `p${i}`,
        nev: `P${i}`,
        utolsoAktivitas: { tipus: 'letrehozva', idopont: new Date(2026, 7, i + 1).toISOString() },
      }),
    );
    expect(legutobbAktivPaciensek(patients, RECENT_PACIENS_LIMIT)).toHaveLength(RECENT_PACIENS_LIMIT);
  });

  it('nem mutálja a bemenetet', () => {
    const patients = [
      makePatient({
        dirName: 'a',
        nev: 'A',
        utolsoAktivitas: { tipus: 'letrehozva', idopont: '2026-08-01T10:00:00.000Z' },
      }),
      makePatient({
        dirName: 'b',
        nev: 'B',
        utolsoAktivitas: { tipus: 'letrehozva', idopont: '2026-08-09T10:00:00.000Z' },
      }),
    ];
    const eredeti = [...patients];
    legutobbAktivPaciensek(patients, 5);
    expect(patients).toEqual(eredeti);
  });
});

describe('aktivitasSzoveg', () => {
  const most = new Date('2026-08-09T12:00:00.000Z');

  it.each([
    ['letrehozva', 'Páciens létrehozva'],
    ['torzsadat-mentve', 'Törzsadat mentve'],
    ['terv-veglegesitve', 'Terv véglegesítve'],
  ] as const)('%s -> "%s · <relatív idő>"', (tipus, cimke) => {
    const aktivitas: PatientActivity = { tipus, idopont: '2026-08-09T10:00:00.000Z' };
    expect(aktivitasSzoveg(aktivitas, most)).toBe(`${cimke} · 2 órája`);
  });
});
