import { describe, expect, it } from 'vitest';
import { kovetettMennyiseg, sorPatchKovetessel } from './mennyiseg';
import type { Sor } from './types';

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
