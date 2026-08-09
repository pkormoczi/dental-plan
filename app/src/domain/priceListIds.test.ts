import { describe, expect, it } from 'vitest';
import { nextKategoriaId, nextTetelId } from './priceListIds';

describe('nextTetelId', () => {
  it('üres listára t001-et ad', () => {
    expect(nextTetelId([])).toBe('t001');
  });

  it('a meglévő legnagyobb tNNN utáni számot adja', () => {
    expect(nextTetelId([{ id: 't001' }, { id: 't003' }, { id: 't002' }])).toBe('t004');
  });

  it('törlés után nem ismétli meg a legnagyobb korábbi id-t (D17)', () => {
    // A t003 törölve/inaktiválva sincs a listában, de az id-je akkor sem
    // hasznosul újra -- ez a max-alapú (nem hossz-alapú) számítás lényege.
    const megmaradt = [{ id: 't001' }, { id: 't002' }, { id: 't004' }];
    expect(nextTetelId(megmaradt)).toBe('t005');
  });

  it('nem tNNN alakú id-ket figyelmen kívül hagyja', () => {
    expect(nextTetelId([{ id: 't001' }, { id: 'k02' }, { id: 'valami' }])).toBe('t002');
  });
});

describe('nextKategoriaId', () => {
  it('üres listára k01-et ad', () => {
    expect(nextKategoriaId([])).toBe('k01');
  });

  it('a meglévő legnagyobb kNN utáni számot adja', () => {
    expect(nextKategoriaId([{ id: 'k01' }, { id: 'k03' }, { id: 'k02' }])).toBe('k04');
  });

  it('törlés után nem ismétli meg a legnagyobb korábbi id-t', () => {
    const megmaradt = [{ id: 'k01' }, { id: 'k02' }, { id: 'k04' }];
    expect(nextKategoriaId(megmaradt)).toBe('k05');
  });

  it('nem kNN alakú id-ket figyelmen kívül hagyja', () => {
    expect(nextKategoriaId([{ id: 'k01' }, { id: 't002' }, { id: 'valami' }])).toBe('k02');
  });

  it('kétjegyű számra pad-el (k01..k09, majd k10+)', () => {
    expect(nextKategoriaId([{ id: 'k09' }])).toBe('k10');
    expect(nextKategoriaId([{ id: 'k10' }])).toBe('k11');
  });
});
