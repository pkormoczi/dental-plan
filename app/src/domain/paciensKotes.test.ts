// 94. tétel: Másolás új tervbe -- páciens-identitás védőháló.

import { describe, expect, it } from 'vitest';
import { paciensKotes } from './paciensKotes';
import type { PatientFolder } from './types';

function patient(nev: string, dirName = nev, paciensId = `id-${dirName}`): PatientFolder {
  return { dirName, paciensId, nev };
}

describe('paciensKotes', () => {
  it('kötés nélkül (patientDir null) üres ütközés-listát ad, patients-t sem nézi', () => {
    const kovacs = patient('Kovács János', 'kovacs-dir');
    const kotes = paciensKotes([kovacs], null, 'Kovács János');
    expect(kotes).toEqual({ patientDir: null, kotott: null, utkozok: [] });
  });

  it('a kötött páciens saját (pontosan egyező) neve nem ütközik önmagával -- paciensId szerint kizárva', () => {
    const kovacs = patient('Kovács János', 'kovacs-dir', 'p1');
    const kotes = paciensKotes([kovacs], 'kovacs-dir', 'Kovács János', 'p1');
    expect(kotes.kotott).toEqual(kovacs);
    expect(kotes.utkozok).toEqual([]);
  });

  it('a kötött páciens saját neve akkor sem ütközik, ha paciensId nincs átadva -- dirName szerint kizárva', () => {
    const kovacs = patient('Kovács János', 'kovacs-dir', 'p1');
    const kotes = paciensKotes([kovacs], 'kovacs-dir', 'Kovács János');
    expect(kotes.utkozok).toEqual([]);
  });

  it('egy MÁSIK páciensre pontosan illő nevet ütközőnek jelöl', () => {
    const kovacs = patient('Kovács János', 'kovacs-dir', 'p1');
    const nagy = patient('Nagy Éva', 'nagy-dir', 'p2');
    const kotes = paciensKotes([kovacs, nagy], 'kovacs-dir', 'Nagy Éva', 'p1');
    expect(kotes.kotott).toEqual(kovacs);
    expect(kotes.utkozok).toEqual([nagy]);
  });

  it('ékezet-/kisbetűfüggetlen pontos egyezésnél is ütközik', () => {
    const kovacs = patient('Kovács János', 'kovacs-dir', 'p1');
    const nagy = patient('Nagy Éva', 'nagy-dir', 'p2');
    const kotes = paciensKotes([kovacs, nagy], 'kovacs-dir', 'nagy eva', 'p1');
    expect(kotes.utkozok).toEqual([nagy]);
  });

  it('csak HASONLÓ (nem pontos) egyezésnél nem ütközik', () => {
    const kovacs = patient('Kovács János', 'kovacs-dir', 'p1');
    const nagy = patient('Nagy Éva', 'nagy-dir', 'p2');
    const kotes = paciensKotes([kovacs, nagy], 'kovacs-dir', 'Éva', 'p1');
    expect(kotes.utkozok).toEqual([]);
  });

  it('a "-né" toldalékos névvel nem ütközik (a nevJeloltek() kizárása öröklődik)', () => {
    const kovacs = patient('Kovács János', 'kovacs-dir', 'p1');
    const janosne = patient('Kovács Jánosné', 'janosne-dir', 'p2');
    const kotes = paciensKotes([kovacs, janosne], 'kovacs-dir', 'Kovács János', 'p1');
    expect(kotes.utkozok).toEqual([]);
  });

  it('üres névre nem ad ütközést', () => {
    const kovacs = patient('Kovács János', 'kovacs-dir', 'p1');
    const nagy = patient('Nagy Éva', 'nagy-dir', 'p2');
    const kotes = paciensKotes([kovacs, nagy], 'kovacs-dir', '', 'p1');
    expect(kotes.utkozok).toEqual([]);
  });

  it('ismeretlen (a patients listában nem szereplő) patientDir esetén kotott null, de az ütközés-vizsgálat lefut', () => {
    const nagy = patient('Nagy Éva', 'nagy-dir', 'p2');
    const kotes = paciensKotes([nagy], 'ismeretlen-dir', 'Nagy Éva');
    expect(kotes.kotott).toBeNull();
    expect(kotes.utkozok).toEqual([nagy]);
  });
});
