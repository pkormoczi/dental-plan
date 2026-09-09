import { describe, expect, it } from 'vitest';
import {
  MAGAS_MENNYISEG_KUSZOB,
  kovetettMennyiseg,
  magasMennyiseguSorok,
  sorPatchKovetessel,
} from './mennyiseg';
import type { Plan, Sor } from './types';

function sor(partial: Partial<Sor>): Sor {
  return {
    tetelId: 't1',
    nevSnapshot: 'Teszt tétel',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 1000,
    tenylegesEgysegar: 1000,
    ...partial,
  };
}

describe('kovetettMennyiseg', () => {
  it('érvényes FDI-listánál a dedupolt fogszámot adja', () => {
    expect(kovetettMennyiseg('16, 17, 26')).toBe(3);
  });

  it('ismételt FDI kódot egyszer számít', () => {
    expect(kovetettMennyiseg('16, 17, 16')).toBe(2);
  });

  it('üres mezőnél null-t ad', () => {
    expect(kovetettMennyiseg('')).toBeNull();
  });

  it('szabadszöveges jegyzetnél null-t ad', () => {
    expect(kovetettMennyiseg('jobb felső')).toBeNull();
  });

  it('hibás FDI kódnál (a mindent-vagy-semmit logika miatt) null-t ad', () => {
    expect(kovetettMennyiseg('16, 99')).toBeNull();
  });
});

describe('sorPatchKovetessel', () => {
  it('kézzel írt darabszám leválasztja a sort (mennyisegKezi: true)', () => {
    const s = sor({ fogak: '16, 17', mennyiseg: 2, mennyisegKezi: false });
    const patch = sorPatchKovetessel(s, { mennyiseg: 1 });
    expect(patch).toEqual({ mennyiseg: 1, mennyisegKezi: true });
  });

  it('követő soron a fogak bővítése szinkronizálja a darabszámot', () => {
    const s = sor({ fogak: '16, 17', mennyiseg: 2, mennyisegKezi: false });
    const patch = sorPatchKovetessel(s, { fogak: '16, 17, 26' });
    expect(patch).toEqual({ fogak: '16, 17, 26', mennyiseg: 3 });
  });

  it('követő soron a fogak mező kiürítése NEM írja felül a darabszámot -- a sor követő marad', () => {
    const s = sor({ fogak: '16, 17', mennyiseg: 2, mennyisegKezi: false });
    const patch = sorPatchKovetessel(s, { fogak: '' });
    expect(patch).toEqual({ fogak: '' });
  });

  it('követő soron szabadszöveges jegyzetre váltás NEM írja felül a darabszámot', () => {
    const s = sor({ fogak: '16, 17', mennyiseg: 2, mennyisegKezi: false });
    const patch = sorPatchKovetessel(s, { fogak: 'jobb felső' });
    expect(patch).toEqual({ fogak: 'jobb felső' });
  });

  it('levált (mennyisegKezi: true) soron a fogak módosítása nem szinkronizál', () => {
    const s = sor({ fogak: '16, 17', mennyiseg: 1, mennyisegKezi: true });
    const patch = sorPatchKovetessel(s, { fogak: '16, 17, 26' });
    expect(patch).toEqual({ fogak: '16, 17, 26' });
  });

  it('hiányzó mennyisegKezi (funkció előtti sor) mellett a fogak módosítása nem szinkronizál', () => {
    const s = sor({ fogak: '16, 17', mennyiseg: 1 });
    const patch = sorPatchKovetessel(s, { fogak: '16, 17, 26' });
    expect(patch).toEqual({ fogak: '16, 17, 26' });
  });

  it('explicit visszakapcsolás (mennyisegKezi: false patch) azonnal szinkronizál', () => {
    const s = sor({ fogak: '16, 17, 26', mennyiseg: 1, mennyisegKezi: true });
    const patch = sorPatchKovetessel(s, { mennyisegKezi: false });
    expect(patch).toEqual({ mennyisegKezi: false, mennyiseg: 3 });
  });

  it('visszakapcsoláskor, ha a fogak mező nem FDI-lista, a darabszám érintetlen marad', () => {
    const s = sor({ fogak: 'jobb felső', mennyiseg: 1, mennyisegKezi: true });
    const patch = sorPatchKovetessel(s, { mennyisegKezi: false });
    expect(patch).toEqual({ mennyisegKezi: false });
  });

  it('egyéb mezőt (pl. nevSnapshot) érintő patch változatlanul megy tovább', () => {
    const s = sor({ fogak: '16, 17', mennyiseg: 2, mennyisegKezi: false });
    const patch = sorPatchKovetessel(s, { nevSnapshot: 'Átírt név' });
    expect(patch).toEqual({ nevSnapshot: 'Átírt név' });
  });
});

describe('magasMennyiseguSorok', () => {
  function makePlan(fazisok: Sor[][]): Plan {
    return {
      schemaVersion: 1,
      tervId: 't',
      verzio: 1,
      statusz: 'PISZKOZAT',
      nyelv: 'hu',
      penznem: 'HUF',
      keltezes: '2026-01-01',
      ervenyesIg: '2026-02-01',
      arlistaVerzio: '2026-01-01',
      orvos: 'Dr. Teszt',
      paciens: {
        nev: 'Teszt Elek',
        szuletesiIdo: '1980-01-01',
        lakcim: 'Teszt utca 1.',
        telefon: '+36 20 123 4567',
        email: 'teszt@example.com',
        taj: '123456789',
        kiskoru: false,
        torvenyesKepviselo: null,
      },
      fazisok: fazisok.map((sorok, i) => ({
        sorszam: i + 1,
        megnevezes: `${i + 1}. fázis`,
        megjegyzes: '',
        sorok,
      })),
      osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    };
  }

  it('a küszöbön álló darabszám még nem gyanús', () => {
    const plan = makePlan([[sor({ mennyiseg: MAGAS_MENNYISEG_KUSZOB })]]);
    expect(magasMennyiseguSorok(plan)).toEqual([]);
  });

  it('a küszöb fölötti darabszámú sort a nevével és a darabszámával adja vissza', () => {
    const plan = makePlan([
      [sor({ nevSnapshot: 'Gyökértömés', mennyiseg: MAGAS_MENNYISEG_KUSZOB + 1 })],
    ]);
    expect(magasMennyiseguSorok(plan)).toEqual([
      { nev: 'Gyökértömés', mennyiseg: MAGAS_MENNYISEG_KUSZOB + 1 },
    ]);
  });

  it('a fogakat követő sor magas darabszámmal sem gyanús -- ott a szám a fogakból jön', () => {
    const plan = makePlan([
      [sor({ fogak: '11, 12, 13, 14, 15, 16, 17, 18, 21', mennyiseg: 9, mennyisegKezi: false })],
    ]);
    expect(magasMennyiseguSorok(plan)).toEqual([]);
  });

  it('hiányzó mennyisegKezi mellett jelez -- a régi sor nem igazolt követő', () => {
    const plan = makePlan([[sor({ nevSnapshot: 'Régi sor', mennyiseg: 36 })]]);
    expect(magasMennyiseguSorok(plan)).toEqual([{ nev: 'Régi sor', mennyiseg: 36 }]);
  });

  it('a névtelen sort kihagyja -- azt a kitöltetlenség kemény tétele fedi', () => {
    const plan = makePlan([[sor({ nevSnapshot: '   ', mennyiseg: 36 })]]);
    expect(magasMennyiseguSorok(plan)).toEqual([]);
  });

  it('több fázison át terv sorrendben gyűjt', () => {
    const plan = makePlan([
      [sor({ nevSnapshot: 'Első', mennyiseg: 12 }), sor({ nevSnapshot: 'Rendben', mennyiseg: 2 })],
      [sor({ nevSnapshot: 'Második', mennyiseg: 36 })],
    ]);
    expect(magasMennyiseguSorok(plan)).toEqual([
      { nev: 'Első', mennyiseg: 12 },
      { nev: 'Második', mennyiseg: 36 },
    ]);
  });
});
