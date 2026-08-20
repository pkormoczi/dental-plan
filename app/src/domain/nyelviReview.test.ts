import { describe, expect, it } from 'vitest';
import {
  nyelviMismatch,
  nyelviMismatchek,
  reviewElfogadva,
  reviewIrasUtan,
  sorPatchNyelvvel,
} from './nyelviReview';
import type { Fazis, NyelviReview, Plan, Sor } from './types';

function sor(partial: Partial<Sor> = {}): Sor {
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

function fazis(sorok: Sor[], overrides: Partial<Fazis> = {}, i = 0): Fazis {
  return { sorszam: i + 1, megnevezes: `${i + 1}. kezelés`, megjegyzes: '', sorok, ...overrides };
}

function makePlan(fazisok: Fazis[], overrides: Partial<Plan> = {}): Plan {
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
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: 'Dr. Teszt',
    paciens: {
      nev: 'Teszt Elek',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok,
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
}

describe('reviewIrasUtan', () => {
  it('csak whitespace-eltérés NEM invalidál -- a meglévő metaadat érintetlen', () => {
    const elozo: NyelviReview = { authoredInLanguage: 'de', reviewedForLanguage: 'hu' };
    expect(reviewIrasUtan(elozo, 'Szöveg', '  Szöveg  ', 'hu')).toEqual(elozo);
  });

  it('valódi tartalmi változás a JELENLEGI nyelvre stampel, a review elvész', () => {
    const elozo: NyelviReview = { authoredInLanguage: 'de', reviewedForLanguage: 'hu' };
    expect(reviewIrasUtan(elozo, 'Szöveg', 'Más szöveg', 'hu')).toEqual({ authoredInLanguage: 'hu' });
  });

  it('hiányzó előző metaadat + változatlan szöveg -- null marad', () => {
    expect(reviewIrasUtan(null, 'Szöveg', 'Szöveg', 'hu')).toBeNull();
    expect(reviewIrasUtan(undefined, 'Szöveg', 'Szöveg', 'hu')).toBeNull();
  });

  it('hiányzó előző metaadat + tényleges változás -- új metaadat a jelenlegi nyelvvel', () => {
    expect(reviewIrasUtan(null, 'Régi', 'Új', 'de')).toEqual({ authoredInLanguage: 'de' });
  });

  it('D480: MÁR mismatch-elt mezőn a teljes átírás (akár a másik nyelvre fordítva) sem old fel automatikusan -- a metaadat érintetlen marad', () => {
    // A doki 'hu'-n gépelt, a dokumentum azóta 'de'-re váltott -- a sor
    // 'de' nyelven MISMATCH-elt (nincs reviewedForLanguage). Egy teljes,
    // akár szó szerint lefordított átírás sem stampel új authored nyelvet.
    const elozo: NyelviReview = { authoredInLanguage: 'hu' };
    expect(nyelviMismatch(elozo, 'de')).toBe(true);
    const uj = reviewIrasUtan(elozo, 'Magyar szöveg', 'Deutscher Text', 'de');
    expect(uj).toEqual(elozo);
    expect(nyelviMismatch(uj, 'de')).toBe(true);
  });

  it('nem mismatch-elt mezőn (nincs metaadat, vagy a jelenlegi nyelvre már reviewed) egy valódi változás rendesen stampel', () => {
    expect(reviewIrasUtan(undefined, 'Régi', 'Új', 'de')).toEqual({ authoredInLanguage: 'de' });
    const reviewedElozo: NyelviReview = { authoredInLanguage: 'de', reviewedForLanguage: 'hu' };
    expect(nyelviMismatch(reviewedElozo, 'hu')).toBe(false);
    expect(reviewIrasUtan(reviewedElozo, 'Régi', 'Új', 'hu')).toEqual({ authoredInLanguage: 'hu' });
  });
});

describe('nyelviMismatch', () => {
  it('hiányzó metaadat SOHA nem mismatch', () => {
    expect(nyelviMismatch(null, 'hu')).toBe(false);
    expect(nyelviMismatch(undefined, 'de')).toBe(false);
  });

  it('authoredInLanguage eltér, nincs reviewedForLanguage -- mismatch', () => {
    expect(nyelviMismatch({ authoredInLanguage: 'de' }, 'hu')).toBe(true);
  });

  it('authoredInLanguage megegyezik -- nincs mismatch', () => {
    expect(nyelviMismatch({ authoredInLanguage: 'hu' }, 'hu')).toBe(false);
  });

  it('reviewedForLanguage a jelenlegi nyelvre -- feloldva, nincs mismatch', () => {
    expect(nyelviMismatch({ authoredInLanguage: 'de', reviewedForLanguage: 'hu' }, 'hu')).toBe(false);
  });

  it('reviewedForLanguage egy HARMADIK (nem jelenlegi) nyelvre -- továbbra is mismatch', () => {
    // Csak hu/de nyelv létezik, de a szabály elvben bővíthető -- itt azt
    // ellenőrizzük, hogy a reviewedForLanguage KIZÁRÓLAG a JELENLEGI
    // nyelvre old fel, nem általánosan.
    expect(nyelviMismatch({ authoredInLanguage: 'de', reviewedForLanguage: 'de' }, 'hu')).toBe(true);
  });
});

describe('reviewElfogadva', () => {
  it('a "Nyelv ellenőrizve" akció a jelenlegi nyelvre állítja a reviewedForLanguage-et, authoredInLanguage változatlan', () => {
    expect(reviewElfogadva({ authoredInLanguage: 'de' }, 'hu')).toEqual({
      authoredInLanguage: 'de',
      reviewedForLanguage: 'hu',
    });
  });

  it('hiányzó előző metaadat esetén authoredInLanguage a jelenlegi nyelvre esik -- defenzív ág', () => {
    expect(reviewElfogadva(null, 'hu')).toEqual({ authoredInLanguage: 'hu', reviewedForLanguage: 'hu' });
  });
});

describe('sorPatchNyelvvel', () => {
  it('változatlan nevSnapshot (whitespace-eltérés) NEM invalidálja a nevNyelv-et', () => {
    const s = sor({ nevSnapshot: 'Fogeltávolítás', nevNyelv: { authoredInLanguage: 'de', reviewedForLanguage: 'hu' } });
    const patch = sorPatchNyelvvel(s, { nevSnapshot: '  Fogeltávolítás  ' }, 'hu');
    expect(patch.nevNyelv).toEqual({ authoredInLanguage: 'de', reviewedForLanguage: 'hu' });
  });

  it('tényleges nevSnapshot-változás a jelenlegi nyelvre stampel', () => {
    const s = sor({ nevSnapshot: 'Fogeltávolítás' });
    const patch = sorPatchNyelvvel(s, { nevSnapshot: 'Zahnextraktion' }, 'hu');
    expect(patch.nevNyelv).toEqual({ authoredInLanguage: 'hu' });
  });

  it('leirasSnapshot-változás a leirasNyelv-et frissíti, a nevNyelv-et nem érinti', () => {
    const s = sor({ leirasSnapshot: 'Régi leírás' });
    const patch = sorPatchNyelvvel(s, { leirasSnapshot: 'Új leírás' }, 'de');
    expect(patch.leirasNyelv).toEqual({ authoredInLanguage: 'de' });
    expect('nevNyelv' in patch).toBe(false);
  });

  it('explicit nevNyelv a patch-ben MINDIG felülír -- a reset/"Nyelv ellenőrizve" útja', () => {
    const s = sor({ nevSnapshot: 'Régi', nevNyelv: { authoredInLanguage: 'de' } });
    const patch = sorPatchNyelvvel(s, { nevSnapshot: 'Új', nevNyelv: null }, 'hu');
    expect(patch.nevNyelv).toBeNull();
  });

  it('sem nevSnapshot, sem leirasSnapshot nincs a patch-ben -- a patch változatlanul visszaadva', () => {
    const s = sor();
    const patch = sorPatchNyelvvel(s, { fogak: '16' }, 'hu');
    expect(patch).toEqual({ fogak: '16' });
  });
});

describe('nyelviMismatchek', () => {
  it('üres terven üres listát ad', () => {
    expect(nyelviMismatchek(makePlan([]))).toEqual([]);
  });

  it('nincs mismatch -- üres lista', () => {
    const plan = makePlan([fazis([sor({ nevSnapshot: 'Rendben' })])]);
    expect(nyelviMismatchek(plan)).toEqual([]);
  });

  it('sorrend: fázisonként fázisnév -> fázis-megjegyzés -> soronként sornév -> sorleírás', () => {
    const plan = makePlan([
      fazis(
        [
          sor({
            nevSnapshot: 'Sor neve',
            nevNyelv: { authoredInLanguage: 'de' },
            leirasSnapshot: 'Sor leírása',
            leirasNyelv: { authoredInLanguage: 'de' },
          }),
        ],
        {
          megnevezes: 'Fázis neve',
          megnevezesNyelv: { authoredInLanguage: 'de' },
          megjegyzes: 'Fázis jegyzete',
          megjegyzesNyelv: { authoredInLanguage: 'de' },
        },
      ),
    ]);
    expect(nyelviMismatchek(plan).map((t) => t.cel.mezo)).toEqual([
      'fazisNev',
      'fazisMegjegyzes',
      'sorNev',
      'sorLeiras',
    ]);
  });

  it('több fázison és soron át a terv-sorrendet követi', () => {
    const plan = makePlan([
      fazis([sor({ nevSnapshot: 'A', nevNyelv: { authoredInLanguage: 'de' } })], {}, 0),
      fazis([sor({ nevSnapshot: 'B', nevNyelv: { authoredInLanguage: 'de' } })], {}, 1),
    ]);
    expect(nyelviMismatchek(plan)).toEqual([
      { cel: { mezo: 'sorNev', fazisIndex: 0, sorIndex: 0 }, cimke: 'A', szoveg: 'A' },
      { cel: { mezo: 'sorNev', fazisIndex: 1, sorIndex: 0 }, cimke: 'B', szoveg: 'B' },
    ]);
  });

  it('feloldott (reviewedForLanguage a jelenlegi nyelvre) szöveget nem jelez', () => {
    const plan = makePlan([
      fazis([
        sor({
          nevSnapshot: 'Rendben',
          nevNyelv: { authoredInLanguage: 'de', reviewedForLanguage: 'hu' },
        }),
      ]),
    ]);
    expect(nyelviMismatchek(plan)).toEqual([]);
  });
});
