// Páciens master <-> terv-piszkozat mezőszintű összevetése -- backlog-40.
// docs/03-funkcionalis-spec.md § 2. Terv adatai "Páciens törzsadata".

import { describe, expect, it } from 'vitest';
import {
  alkalmazMezoket,
  diffAzonosito,
  masterSnapshotDiff,
  mezoErtekSzoveg,
  valodiUtkozesek,
} from './masterSnapshotDiff';
import type { Paciens } from './types';

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

describe('masterSnapshotDiff', () => {
  it('azonos adatoknál üres listát ad', () => {
    const p = makePaciens();
    expect(masterSnapshotDiff(p, makePaciens())).toEqual([]);
  });

  it('csak az eltérő mezőket sorolja fel', () => {
    const master = makePaciens();
    const snapshot = makePaciens({ telefon: '+36 70 000 0000', lakcim: 'Más cím' });
    const diff = masterSnapshotDiff(master, snapshot);
    expect(diff.map((d) => d.kulcs).sort()).toEqual(['lakcim', 'telefon']);
  });

  it('a torvenyesKepviselo null és üres string alakja NEM eltérés', () => {
    const master = makePaciens({ torvenyesKepviselo: null });
    const snapshot = makePaciens({ torvenyesKepviselo: '' });
    expect(masterSnapshotDiff(master, snapshot)).toEqual([]);
  });

  it('üres és kitöltött érték IGEN eltérés', () => {
    const master = makePaciens({ email: '' });
    const snapshot = makePaciens({ email: 'kovacs.janos@example.hu' });
    expect(masterSnapshotDiff(master, snapshot).map((d) => d.kulcs)).toEqual(['email']);
  });

  it('a kiskoru boolean-eltérést is felismeri', () => {
    const master = makePaciens({ kiskoru: false });
    const snapshot = makePaciens({ kiskoru: true });
    expect(masterSnapshotDiff(master, snapshot).map((d) => d.kulcs)).toEqual(['kiskoru']);
  });
});

describe('mezoErtekSzoveg', () => {
  it('kiskoru-t Igen/Nem szöveggé alakítja', () => {
    expect(mezoErtekSzoveg(makePaciens({ kiskoru: true }), 'kiskoru')).toBe('Igen');
    expect(mezoErtekSzoveg(makePaciens({ kiskoru: false }), 'kiskoru')).toBe('Nem');
  });

  it('a szuletesiIdo-t rövid magyar dátummá formázza', () => {
    expect(mezoErtekSzoveg(makePaciens({ szuletesiIdo: '1978-03-14' }), 'szuletesiIdo')).toBe(
      '1978.03.14.',
    );
  });

  it('üres szuletesiIdo-nál üres stringet ad, nem formázott dátumot', () => {
    expect(mezoErtekSzoveg(makePaciens({ szuletesiIdo: '' }), 'szuletesiIdo')).toBe('');
  });

  it('a torvenyesKepviselo null-t üres stringgé alakítja', () => {
    expect(mezoErtekSzoveg(makePaciens({ torvenyesKepviselo: null }), 'torvenyesKepviselo')).toBe('');
  });

  it('a sima szöveges mezőket változatlanul adja vissza', () => {
    expect(mezoErtekSzoveg(makePaciens({ lakcim: 'Teszt utca 1.' }), 'lakcim')).toBe('Teszt utca 1.');
  });
});

describe('alkalmazMezoket', () => {
  it('csak a felsorolt kulcsokat viszi át forrásból célba', () => {
    const cel = makePaciens({ telefon: 'régi', email: 'régi@example.hu' });
    const forras = makePaciens({ telefon: 'új', email: 'új@example.hu' });
    const next = alkalmazMezoket(cel, forras, ['telefon']);
    expect(next.telefon).toBe('új');
    expect(next.email).toBe('régi@example.hu');
  });

  it('üres kulcslistánál a cél változatlan marad (új objektumként)', () => {
    const cel = makePaciens();
    const next = alkalmazMezoket(cel, makePaciens({ nev: 'Más Név' }), []);
    expect(next).toEqual(cel);
    expect(next).not.toBe(cel);
  });

  it('nem mutálja a cél objektumot', () => {
    const cel = makePaciens();
    alkalmazMezoket(cel, makePaciens({ nev: 'Más Név' }), ['nev']);
    expect(cel.nev).toBe('Kovács János');
  });
});

describe('valodiUtkozesek', () => {
  it('kihagyja az üres-mező-pótlásokat -- vadonatúj páciens első adatkitöltése', () => {
    // A quick-create után a master csak a nev-et tartalmazza, a doki a
    // Terv adatai lapon tölti ki a többit -- ez pótlás, nem ütközés.
    const master = makePaciens({
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
    });
    const snapshot = makePaciens();
    const elteresek = masterSnapshotDiff(master, snapshot);
    expect(elteresek.length).toBeGreaterThan(0);
    expect(valodiUtkozesek(elteresek, master, snapshot)).toEqual([]);
  });

  it('megtartja a valódi ütközést -- mindkét oldalon van érték, és eltér', () => {
    const master = makePaciens({ telefon: '+36 30 000 0000' });
    const snapshot = makePaciens({ telefon: '+36 70 999 8888' });
    const elteresek = masterSnapshotDiff(master, snapshot);
    expect(valodiUtkozesek(elteresek, master, snapshot).map((e) => e.kulcs)).toEqual(['telefon']);
  });

  it('vegyes esetben csak az ütköző mezőt tartja meg, a pótlást nem', () => {
    const master = makePaciens({ telefon: '+36 30 000 0000', email: '' });
    const snapshot = makePaciens({ telefon: '+36 70 999 8888', email: 'uj@example.hu' });
    const elteresek = masterSnapshotDiff(master, snapshot);
    expect(elteresek.map((e) => e.kulcs).sort()).toEqual(['email', 'telefon']);
    expect(valodiUtkozesek(elteresek, master, snapshot).map((e) => e.kulcs)).toEqual(['telefon']);
  });
});

describe('diffAzonosito', () => {
  it('ugyanarra az eltérésre stabil azonosítót ad', () => {
    const master = makePaciens();
    const snapshot = makePaciens({ telefon: 'új szám' });
    const elteresek = masterSnapshotDiff(master, snapshot);
    expect(diffAzonosito(elteresek, master, snapshot)).toBe(
      diffAzonosito(masterSnapshotDiff(master, snapshot), master, snapshot),
    );
  });

  it('egy átszerkesztett érték új azonosítót ad', () => {
    const master = makePaciens();
    const snapshot1 = makePaciens({ telefon: 'A szám' });
    const snapshot2 = makePaciens({ telefon: 'B szám' });
    const id1 = diffAzonosito(masterSnapshotDiff(master, snapshot1), master, snapshot1);
    const id2 = diffAzonosito(masterSnapshotDiff(master, snapshot2), master, snapshot2);
    expect(id1).not.toBe(id2);
  });

  it('eltérés nélkül üres azonosítót ad', () => {
    const p = makePaciens();
    expect(diffAzonosito(masterSnapshotDiff(p, p), p, p)).toBe('');
  });
});
