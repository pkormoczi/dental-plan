import { describe, expect, it } from 'vitest';
import { kellMegerosites, megerositesTartalom, tervReszleteiUtvonal } from './planVersionActions';

describe('kellMegerosites', () => {
  it('nem kér megerősítést, ha nincs mentetlen piszkozat és a másolás a legfrissebb verzióról indul', () => {
    expect(kellMegerosites({ kind: 'copy', historical: false }, false)).toBe(false);
  });

  it('mentetlen piszkozatnál minden akciófajta megerősítést kér', () => {
    expect(kellMegerosites({ kind: 'open' }, true)).toBe(true);
    expect(kellMegerosites({ kind: 'copy', historical: false }, true)).toBe(true);
    expect(kellMegerosites({ kind: 'ujTerv' }, true)).toBe(true);
    expect(kellMegerosites({ kind: 'ujPaciens' }, true)).toBe(true);
  });

  it('historical másolás piszkozat nélkül is megerősítést kér', () => {
    expect(kellMegerosites({ kind: 'copy', historical: true }, false)).toBe(true);
  });

  it('"open"/"ujTerv" akciónál a `historical` mező irreleváns', () => {
    expect(kellMegerosites({ kind: 'open', historical: true }, false)).toBe(false);
    expect(kellMegerosites({ kind: 'ujTerv', historical: true }, false)).toBe(false);
  });
});

describe('megerositesTartalom', () => {
  it('tisztán historical másolásnál (nincs piszkozat) a "Korábbi verzió másolása" szöveget adja', () => {
    const tartalom = megerositesTartalom({ kind: 'copy', historical: true }, false);
    expect(tartalom.title).toBe('Korábbi verzió másolása');
    expect(tartalom.actionLabel).toBe('Másolás a korábbi verzióval');
  });

  it('piszkozat-vesztésnél a cím "Piszkozat felülírása" marad akkor is, ha historical másolás is történik', () => {
    const tartalom = megerositesTartalom({ kind: 'copy', historical: true }, true);
    expect(tartalom.title).toBe('Piszkozat felülírása');
    expect(tartalom.actionLabel).toBe('Másolás, piszkozat elvetésével');
    expect(tartalom.description).toContain('Ez egy korábbi, nem a legfrissebb verzió');
  });

  it('piszkozat-vesztésnél, nem historical másolásnál a leírás nem tartalmazza a historical figyelmeztetést', () => {
    const tartalom = megerositesTartalom({ kind: 'copy', historical: false }, true);
    expect(tartalom.title).toBe('Piszkozat felülírása');
    expect(tartalom.description).not.toContain('Ez egy korábbi, nem a legfrissebb verzió');
  });

  it('"open" akciónál a megfelelő szöveget adja', () => {
    const tartalom = megerositesTartalom({ kind: 'open' }, true);
    expect(tartalom.actionLabel).toBe('Új verzió, piszkozat elvetésével');
  });

  it('"ujTerv" akciónál a megfelelő szöveget adja', () => {
    const tartalom = megerositesTartalom({ kind: 'ujTerv' }, true);
    expect(tartalom.actionLabel).toBe('Új terv, piszkozat elvetésével');
  });

  it('"ujPaciens" akciónál a megfelelő szöveget adja', () => {
    const tartalom = megerositesTartalom({ kind: 'ujPaciens' }, true);
    expect(tartalom.actionLabel).toBe('Új páciens, piszkozat elvetésével');
  });
});

describe('tervReszleteiUtvonal', () => {
  it('a három szegmenst encodeURIComponent-tel építi', () => {
    expect(tervReszleteiUtvonal('Nagy Éva_n4e8w1', { planDir: 'Fogpótlás_a1', versionDir: '2026-08-05_v1' })).toBe(
      `/paciensek/${encodeURIComponent('Nagy Éva_n4e8w1')}/tervek/${encodeURIComponent('Fogpótlás_a1')}/${encodeURIComponent('2026-08-05_v1')}`,
    );
  });
});
