import { describe, expect, it } from 'vitest';
import { zarasOr } from './zaras';

function kornyezet() {
  const kert: number[] = [];
  const bezart: number[] = [];
  const idozitett: Array<{ fn: () => void; ms: number }> = [];
  const or = zarasOr({
    kepernyotKer: () => kert.push(1),
    bezar: () => bezart.push(1),
    hatarido: 8000,
    idozit: (fn, ms) => idozitett.push({ fn, ms }),
  });
  return { or, kert, bezart, idozitett };
}

describe('zárás-őr', () => {
  it('írás nélkül a bezárás azonnal mehet, záró képernyő nincs', () => {
    const { or, kert } = kornyezet();

    expect(or.bezarhato()).toBe(true);
    expect(kert).toEqual([]);
  });

  it('írás után az első bezárás megakad és a záró képernyőt kéri; egy ismételt bezárás nem kéri újra', () => {
    const { or, kert, bezart } = kornyezet();
    or.irasTortent();

    expect(or.bezarhato()).toBe(false);
    expect(or.bezarhato()).toBe(false);

    expect(kert).toHaveLength(1);
    expect(bezart).toEqual([]);
  });

  it('a záró képernyő vége után a bezárás akadálytalan', () => {
    const { or, bezart } = kornyezet();
    or.irasTortent();
    or.bezarhato();

    or.kilep();

    expect(bezart).toHaveLength(1);
    expect(or.bezarhato()).toBe(true);
  });

  it('ha a renderer nem válaszol, a határidő után magától bezár, egyszer', () => {
    const { or, bezart, idozitett } = kornyezet();
    or.irasTortent();
    or.bezarhato();

    expect(idozitett).toHaveLength(1);
    expect(idozitett[0].ms).toBe(8000);
    idozitett[0].fn();
    or.kilep();

    expect(bezart).toHaveLength(1);
  });
});
