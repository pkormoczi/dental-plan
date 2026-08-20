import { describe, expect, it } from 'vitest';
import {
  kovetkezoLepes,
  veglegesitesDiagnozis,
  VEGLEGESITES_LEPESEK,
  type VeglegesitesLepes,
} from './veglegesitesOr';
import type { Paciens, Plan, PriceList, Sor } from './types';

/** A legtöbb teszt a master-eltérést nem vizsgálja -- lásd külön describe lent. */
const NO_MASTER = null;

function paciens(partial: Partial<Paciens> = {}): Paciens {
  return {
    nev: 'Teszt Elek',
    szuletesiIdo: '1980-01-01',
    lakcim: 'Teszt utca 1.',
    telefon: '+36 20 123 4567',
    email: 'teszt@example.com',
    taj: '123456789',
    kiskoru: false,
    torvenyesKepviselo: null,
    ...partial,
  };
}

function sor(partial: Partial<Sor> = {}): Sor {
  return {
    tetelId: 't1',
    nevSnapshot: 'Fogeltávolítás',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 10000,
    tenylegesEgysegar: 10000,
    ...partial,
  };
}

function makePlan(fazisok: Sor[][], overrides: Partial<Plan> = {}): Plan {
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
    paciens: paciens(),
    fazisok: fazisok.map((sorok, i) => ({
      sorszam: i + 1,
      megnevezes: `${i + 1}. kezelés`,
      megjegyzes: '',
      sorok,
    })),
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
}

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak: [],
  tetelek: [
    {
      id: 't1',
      kategoriaId: 'k1',
      sorrend: 1,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Fogeltávolítás', de: null }, // nincs DE név -> nincsForditas
      ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null },
    },
    {
      id: 't-csomag',
      kategoriaId: 'k1',
      sorrend: 2,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'All-on-4 csomag', de: 'All-on-4 Paket' },
      ar: { HUF: { tipus: 'FIX', ertek: 1950000 }, EUR: null },
      csomag: true,
    },
  ],
};

describe('veglegesitesDiagnozis', () => {
  it('teljesen kitöltött magyar terven minden kemény és puha jelzés hamis/üres', () => {
    const plan = makePlan([[sor()]]);
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER);

    expect(diag.nameMissing).toBe(false);
    expect(diag.uresSorok).toEqual([]);
    expect(diag.elolegTullep).toBe(false);
    expect(diag.nevProblemak).toEqual({ nincsForditas: [], elterAzArlistatol: [], egyedi: [] });
    expect(diag.nullaSorok).toEqual([]);
    expect(diag.hianyzoLeirasok).toEqual([]);
    expect(diag.masterElteresek).toEqual([]);
    expect(diag.alkalmazhato).toEqual({
      'missing-fields': false,
      'de-fallback-names': false,
      'zero-price-rows': false,
      'missing-leiras': false,
    });
  });

  it('üres páciensnév a nameMissing kemény jelzőt adja, a puha láncot nem érinti', () => {
    const plan = makePlan([[sor()]], { paciens: paciens({ nev: '  ' }) });
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER);

    expect(diag.nameMissing).toBe(true);
    expect(diag.alkalmazhato['missing-fields']).toBe(false); // a NÉV külön flag, nem a "többi mező hiányzik" lépés
  });

  it('meg nem nevezett sor az uresSorok kemény listában jelenik meg, a puha láncban NEM', () => {
    const plan = makePlan([[sor({ tetelId: '', nevSnapshot: '', fogak: '16' })]]);
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER);

    expect(diag.uresSorok).toEqual([{ fazisIndex: 0, fazisNev: '1. kezelés', sorIndex: 0, fogak: '16' }]);
    // egy névtelen sor összege is 0, de a nullaSorok CSAK a megnevezett
    // sorokat listázza -- lásd domain/kitoltetlen.ts.
    expect(diag.nullaSorok).toEqual([]);
  });

  it('hiányzó egyéb páciensadat a "missing-fields" lépést teszi alkalmazhatóvá', () => {
    const plan = makePlan([[sor()]], { paciens: paciens({ telefon: '' }) });
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER);
    expect(diag.alkalmazhato['missing-fields']).toBe(true);
  });

  it('német nyelvű terven a fordítás nélküli tétel neve a "de-fallback-names" lépést teszi alkalmazhatóvá', () => {
    const plan = makePlan([[sor({ tetelId: 't1', nevSnapshot: 'Fogeltávolítás' })]], { nyelv: 'de' });
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER);

    expect(diag.nevProblemak.nincsForditas).toEqual(['Fogeltávolítás']);
    expect(diag.alkalmazhato['de-fallback-names']).toBe(true);
  });

  it('névvel ellátott, 0 összegű sor a "zero-price-rows" lépést teszi alkalmazhatóvá', () => {
    const plan = makePlan([
      [sor({ nevSnapshot: 'Ingyenes kontroll', listaEgysegar: 0, tenylegesEgysegar: 0 })],
    ]);
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER);

    expect(diag.nullaSorok).toEqual(['Ingyenes kontroll']);
    expect(diag.alkalmazhato['zero-price-rows']).toBe(true);
  });

  it('hiányzó csomag-leírás a "missing-leiras" lépést teszi alkalmazhatóvá, ha a leírások mutatása be van kapcsolva', () => {
    const plan = makePlan([[sor({ tetelId: 't-csomag', nevSnapshot: 'All-on-4 csomag' })]]);

    const bekapcsolva = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER);
    expect(bekapcsolva.hianyzoLeirasok).toHaveLength(1);
    expect(bekapcsolva.alkalmazhato['missing-leiras']).toBe(true);

    // Kikapcsolt leirasokMutatasa mellett a hiány nem érinti a nyomtatványt
    // -- docs/02-domain-modell.md § Tétel-leírás.
    const kikapcsolva = veglegesitesDiagnozis(plan, priceList, false, NO_MASTER);
    expect(kikapcsolva.hianyzoLeirasok).toEqual([]);
    expect(kikapcsolva.alkalmazhato['missing-leiras']).toBe(false);
  });

  it('egyszerre fennálló kemény ÉS puha jelzések egymástól függetlenül jelennek meg a diagnózisban', () => {
    const plan = makePlan(
      [
        [sor({ tetelId: '', nevSnapshot: '', fogak: '16' })], // kemény: uresSorok
        [sor({ nevSnapshot: 'Ingyenes kontroll', listaEgysegar: 0, tenylegesEgysegar: 0 })], // puha: zero-price-rows
      ],
      { paciens: paciens({ nev: '' }) }, // kemény: nameMissing
    );
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER);

    expect(diag.nameMissing).toBe(true);
    expect(diag.uresSorok).toHaveLength(1);
    expect(diag.alkalmazhato['zero-price-rows']).toBe(true);
  });

  // backlog-40: a master↔snapshot eltérés INFO-szintű, nem PUHA lánc-tag --
  // lásd a `masterElteresek` doc-kommentjét (D162).
  describe('masterElteresek (backlog-40)', () => {
    it('master nélkül üres listát ad', () => {
      const diag = veglegesitesDiagnozis(makePlan([[sor()]]), priceList, true, null);
      expect(diag.masterElteresek).toEqual([]);
    });

    it('eltérő masternél felsorolja az eltérő mezőket', () => {
      const plan = makePlan([[sor()]], { paciens: paciens({ telefon: '+36 20 123 4567' }) });
      const master = paciens({ telefon: '+36 70 999 8888' });
      const diag = veglegesitesDiagnozis(plan, priceList, true, master);
      expect(diag.masterElteresek.map((m) => m.kulcs)).toEqual(['telefon']);
    });

    it('a master-eltérés NEM befolyásolja az alkalmazhato mapet -- nem tagja a PUHA láncnak', () => {
      const plan = makePlan([[sor()]], { paciens: paciens({ telefon: '+36 20 123 4567' }) });
      const master = paciens({ telefon: '+36 70 999 8888' });
      const diag = veglegesitesDiagnozis(plan, priceList, true, master);
      expect(diag.masterElteresek.length).toBeGreaterThan(0);
      expect(diag.alkalmazhato).toEqual({
        'missing-fields': false,
        'de-fallback-names': false,
        'zero-price-rows': false,
        'missing-leiras': false,
      });
      expect(kovetkezoLepes(diag.alkalmazhato, 0)).toBeNull();
    });
  });
});

// D64: az előleg túllépése KEMÉNY blokk, nem a puha lánc tagja.
describe('elolegTullep (D64)', () => {
  it('nincs bekapcsolt előleg -- hamis', () => {
    const plan = makePlan([[sor()]]);
    expect(veglegesitesDiagnozis(plan, priceList, true, NO_MASTER).elolegTullep).toBe(false);
  });

  it('az előleg a fizetendő alatt -- hamis', () => {
    const plan = makePlan([[sor()]], { elolegOsszeg: 5000 }); // fizetendő 10000
    expect(veglegesitesDiagnozis(plan, priceList, true, NO_MASTER).elolegTullep).toBe(false);
  });

  it('az előleg pontosan egyenlő a fizetendővel -- hamis, ez legitim (D327)', () => {
    const plan = makePlan([[sor()]], { elolegOsszeg: 10000 });
    expect(veglegesitesDiagnozis(plan, priceList, true, NO_MASTER).elolegTullep).toBe(false);
  });

  it('az előleg meghaladja a fizetendőt -- igaz', () => {
    const plan = makePlan([[sor()]], { elolegOsszeg: 15000 });
    expect(veglegesitesDiagnozis(plan, priceList, true, NO_MASTER).elolegTullep).toBe(true);
  });

  it('a terv-szintű kedvezmény miatt csökkent fizetendőhöz képest is túllépést jelez', () => {
    // Sorok összege 10000, kedvezménnyel a fizetendő 4000 -- az előleg ehhez
    // képest, nem a nyers sorösszeghez képest lépi túl a határt.
    const plan = makePlan([[sor()]], { elolegOsszeg: 5000, kedvezmenyOsszeg: 6000 });
    expect(veglegesitesDiagnozis(plan, priceList, true, NO_MASTER).elolegTullep).toBe(true);
  });
});

describe('kovetkezoLepes', () => {
  function alkalmazhato(igazak: VeglegesitesLepes[]): Record<VeglegesitesLepes, boolean> {
    const eredmeny = {} as Record<VeglegesitesLepes, boolean>;
    for (const lepes of VEGLEGESITES_LEPESEK) eredmeny[lepes] = igazak.includes(lepes);
    return eredmeny;
  }

  it('nincs alkalmazható lépés esetén null-t ad', () => {
    expect(kovetkezoLepes(alkalmazhato([]), 0)).toBeNull();
  });

  it('a lánc SORRENDJÉBEN adja az első alkalmazható lépést, akkor is, ha egy KÉSŐBBI lépés is alkalmazható', () => {
    // A sorrend implementációs döntés (docs/03-funkcionalis-spec.md § 4.):
    // a páciensadat/nyelvi/pénzügyi probléma megelőzi a leírás-hiányt.
    const eredmeny = kovetkezoLepes(alkalmazhato(['zero-price-rows', 'missing-leiras']), 0);
    expect(eredmeny).toBe('zero-price-rows');
  });

  it('átugrik egy nem alkalmazható lépés fölött a lánc közepén', () => {
    // 'de-fallback-names' NEM alkalmazható, 'zero-price-rows' igen -- a
    // fromIndex=0-tól induló keresésnek át kell ugrania a köztes, hamis
    // lépésen.
    const eredmeny = kovetkezoLepes(alkalmazhato(['zero-price-rows']), 0);
    expect(eredmeny).toBe('zero-price-rows');
  });

  it('fromIndex-től keres, a korábbi (már megerősített) lépéseket nem adja vissza újra', () => {
    const alk = alkalmazhato(['missing-fields', 'missing-leiras']);
    const elsoLepesUtan = VEGLEGESITES_LEPESEK.indexOf('missing-fields') + 1;
    expect(kovetkezoLepes(alk, elsoLepesUtan)).toBe('missing-leiras');
  });

  it('az utolsó lépés után induló keresés null-t ad, még ha az utolsó lépés maga alkalmazható is', () => {
    const alk = alkalmazhato(['missing-leiras']);
    expect(kovetkezoLepes(alk, VEGLEGESITES_LEPESEK.length)).toBeNull();
  });
});
