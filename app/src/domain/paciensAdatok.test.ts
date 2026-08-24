import { describe, expect, it } from 'vitest';
import {
  megjelenitettTorzsadat,
  paciensIndexNev,
  paciensTorzsadatbol,
  torzsadatTervbol,
  uresTorzsadat,
} from './paciensAdatok';
import type { Paciens, PatientFolder, PatientMasterData, Plan } from './types';

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

function makePlan(paciens: Paciens): Plan {
  return {
    schemaVersion: 1,
    tervId: 't1',
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

const patient: PatientFolder = { dirName: 'Kovacs-Janos_k9m2r4', paciensId: 'k9m2r4', nev: 'Kovács János' };

describe('uresTorzsadat', () => {
  it('csak a nev-et tölti ki, minden más mező üres/false/null', () => {
    const adatok = uresTorzsadat('Kovács János', 'k9m2r4');
    expect(adatok).toEqual({
      schemaVersion: 1,
      paciensId: 'k9m2r4',
      nev: 'Kovács János',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    });
  });
});

describe('torzsadatTervbol', () => {
  it('egy terv paciens pillanatképéből épít törzsadatot', () => {
    const paciens = makePaciens();
    const adatok = torzsadatTervbol(paciens, 'k9m2r4');
    expect(adatok).toEqual({ schemaVersion: 1, paciensId: 'k9m2r4', ...paciens });
  });

  it('nem mutálja a forrás paciens objektumot', () => {
    const paciens = makePaciens();
    torzsadatTervbol(paciens, 'k9m2r4');
    expect(paciens).toEqual(makePaciens());
  });
});

describe('megjelenitettTorzsadat', () => {
  it('a lezárt törzsadatot adja vissza, ha van -- a terv/patient forrás mellékes', () => {
    const adatok: PatientMasterData = { schemaVersion: 1, paciensId: 'k9m2r4', ...makePaciens() };
    const plan = makePlan(makePaciens({ nev: 'Más Név' }));
    expect(megjelenitettTorzsadat(adatok, plan, patient)).toBe(adatok);
  });

  it('törzsadat nélkül a legutóbbi terv paciens pillanatképére esik vissza', () => {
    const tervPaciens = makePaciens({ telefon: '+36 70 000 0000' });
    const plan = makePlan(tervPaciens);
    const result = megjelenitettTorzsadat(null, plan, patient);
    expect(result).toEqual(torzsadatTervbol(tervPaciens, patient.paciensId));
  });

  it('törzsadat és terv nélkül a PatientFolder nevéből épült üres rekordra esik vissza (terv nélküli páciens)', () => {
    const result = megjelenitettTorzsadat(null, null, patient);
    expect(result).toEqual(uresTorzsadat(patient.nev, patient.paciensId));
  });
});

describe('paciensIndexNev', () => {
  it('a törzsadat nevét adja, ha van lezárt törzsadat', () => {
    const adatok: PatientMasterData = { schemaVersion: 1, paciensId: 'k9m2r4', ...makePaciens() };
    expect(paciensIndexNev(adatok, 'Terv Alatt Beírt Név')).toBe(adatok.nev);
  });

  it('a terv paciens.nev-jét adja, ha nincs törzsadat', () => {
    expect(paciensIndexNev(null, 'Terv Alatt Beírt Név')).toBe('Terv Alatt Beírt Név');
  });
});

describe('paciensTorzsadatbol', () => {
  it('a Paciens részhalmazt emeli ki, a schemaVersion/paciensId nélkül', () => {
    const paciens = makePaciens();
    const adatok: PatientMasterData = { schemaVersion: 1, paciensId: 'k9m2r4', ...paciens };
    expect(paciensTorzsadatbol(adatok)).toEqual(paciens);
  });
});
