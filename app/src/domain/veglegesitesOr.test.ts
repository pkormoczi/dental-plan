import { describe, expect, it } from 'vitest';
import { vanKemenyBlokk, veglegesitesDiagnozis, type CsekklistaTetel } from './veglegesitesOr';
import type { Paciens, Plan, PriceList, Sor } from './types';

/** A legtöbb teszt a master-eltérést nem vizsgálja -- lásd külön describe lent. */
const NO_MASTER = null;

/** Egyezik a lenti `makePlan()` `orvos: 'Dr. Teszt'` alapértékével -- a
 * legtöbb teszt a kezelőorvos-blokkot nem vizsgálja, lásd külön describe lent. */
const AKTIV_ORVOSOK = ['Dr. Teszt'];

/** A legtöbb teszt a sablon-jelzéseket nem vizsgálja. */
const NO_SABLON = { sablonFallback: false, nyilatkozatPlaceholder: false, kihagyottSzekciok: [] };

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
      nev: { hu: 'Fogeltávolítás', de: null }, // nincs DE név -> nincsArlistaiNev
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
    {
      id: 't-inaktiv',
      kategoriaId: 'k1',
      sorrend: 3,
      aktiv: false,
      gyakori: false,
      nev: { hu: 'Kivont tétel', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 5000 }, EUR: null },
    },
  ],
};

function tetel(csekklista: { tetelek: CsekklistaTetel[] }, id: string): CsekklistaTetel | undefined {
  return csekklista.tetelek.find((t) => t.id === id);
}

describe('veglegesitesDiagnozis', () => {
  it('teljesen kitöltött magyar terven üres a csekklista', () => {
    const plan = makePlan([[sor()]]);
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    expect(diag.tetelek).toEqual([]);
    expect(vanKemenyBlokk(diag)).toBe(false);
  });

  it('üres páciensnév a "nev-hianyzik" hard tételt adja', () => {
    const plan = makePlan([[sor()]], { paciens: paciens({ nev: '  ' }) });
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    expect(tetel(diag, 'nev-hianyzik')?.sulyossag).toBe('hard');
    expect(vanKemenyBlokk(diag)).toBe(true);
    // a NÉV külön tétel, a "hianyzo-paciensadat" puha tételt nem érinti
    expect(tetel(diag, 'hianyzo-paciensadat')).toBeUndefined();
  });

  it('meg nem nevezett sor a "kitoltetlen-sor" hard tételben jelenik meg, a nullaOsszeguSorok puhájában NEM', () => {
    const plan = makePlan([[sor({ tetelId: '', nevSnapshot: '', fogak: '16' })]]);
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    const t = tetel(diag, 'kitoltetlen-sor');
    expect(t?.sulyossag).toBe('hard');
    expect(t?.reszletek).toEqual([{ cim: 'Érintett sorok', nevek: ['1. kezelés — 16'] }]);
    // egy névtelen sor összege is 0, de a "nulla-osszegu-sor" tétel CSAK a
    // megnevezett sorokat listázza -- lásd domain/kitoltetlen.ts.
    expect(tetel(diag, 'nulla-osszegu-sor')).toBeUndefined();
  });

  it('üres fázis a "ures-fazis" hard tételt adja (D103)', () => {
    const plan = makePlan([[sor()], []]);
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    const t = tetel(diag, 'ures-fazis');
    expect(t?.sulyossag).toBe('hard');
    expect(t?.reszletek).toEqual([{ cim: 'Érintett fázisok', nevek: ['2. kezelés'] }]);
  });

  it('hiányzó egyéb páciensadat a "hianyzo-paciensadat" soft tételt adja', () => {
    const plan = makePlan([[sor()]], { paciens: paciens({ telefon: '' }) });
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
    expect(tetel(diag, 'hianyzo-paciensadat')?.sulyossag).toBe('soft');
  });

  describe('nemet-nev (D74/D133)', () => {
    it('fordítás nélküli tétel érintetlen sorral a "nincsArlistaiNev" csoportba kerül, hard tétel', () => {
      const plan = makePlan([[sor({ tetelId: 't1', nevSnapshot: 'Fogeltávolítás' })]], { nyelv: 'de' });
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

      const t = tetel(diag, 'nemet-nev');
      expect(t?.sulyossag).toBe('hard');
      expect(t?.reszletek).toEqual([
        { cim: 'Nincs német nevük az árlistában', nevek: ['Fogeltávolítás'] },
      ]);
      expect(vanKemenyBlokk(diag)).toBe(true);
    });

    it('fordítás nélküli tételhez kézzel beírt, németre igazolt sornév NEM blokkol', () => {
      const plan = makePlan(
        [[sor({ tetelId: 't1', nevSnapshot: 'Zahnextraktion', nevNyelv: { authoredInLanguage: 'de' } })]],
        { nyelv: 'de' },
      );
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'nemet-nev')).toBeUndefined();
    });

    it('egyedi (árlistán kívüli) sor de terven NEM blokkol, ha igazoltan németül írt', () => {
      const plan = makePlan(
        [[sor({ tetelId: '', nevSnapshot: 'Egyedi anyagköltség', nevNyelv: { authoredInLanguage: 'de' } })]],
        { nyelv: 'de' },
      );
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'nemet-nev')).toBeUndefined();
    });

    it('magyar terven átírt, majd németre váltott (nem review-olt) sor "ellenorizetlenKeziNev"-be kerül', () => {
      const plan = makePlan(
        [[sor({ tetelId: 't-csomag', nevSnapshot: 'Kézzel átírt', nevNyelv: { authoredInLanguage: 'hu' } })]],
        { nyelv: 'de' },
      );
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

      const t = tetel(diag, 'nemet-nev');
      expect(t?.reszletek).toEqual([
        { cim: 'Kézzel írt/átírt, nyelvileg nem ellenőrzött', nevek: ['Kézzel átírt'] },
      ]);
    });

    it('törölt tételre mutató sor nem blokkol', () => {
      const plan = makePlan([[sor({ tetelId: 'torolve', nevSnapshot: 'Régi tétel' })]], { nyelv: 'de' });
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'nemet-nev')).toBeUndefined();
    });

    it('magyar terven a check nem fut', () => {
      const plan = makePlan([[sor({ tetelId: 't1', nevSnapshot: 'Fogeltávolítás' })]], { nyelv: 'hu' });
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'nemet-nev')).toBeUndefined();
    });
  });

  describe('nemet-kategoria-nev (D404)', () => {
    const priceListKategoriaval: PriceList = {
      ...priceList,
      kategoriak: [
        { id: 'k1', nev: { hu: 'Sebészet', de: null }, sorrend: 1, szin: '#ff6b6b' },
      ],
    };

    it('a fogtérképen ténylegesen látszó, DE név nélküli kategória hard tételt ad', () => {
      const plan = makePlan(
        [[sor({ tetelId: 't1', nevSnapshot: 'Fogeltávolítás', fogak: '16' })]],
        { nyelv: 'de' },
      );
      const diag = veglegesitesDiagnozis(plan, priceListKategoriaval, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

      const t = tetel(diag, 'nemet-kategoria-nev');
      expect(t?.sulyossag).toBe('hard');
      expect(t?.reszletek).toEqual([{ cim: 'Érintett kategóriák', nevek: ['Sebészet'] }]);
    });

    it('a tervben NEM használt kategória hiányzó DE neve nem blokkol', () => {
      const plan = makePlan([[sor({ tetelId: '', nevSnapshot: 'Egyedi', nevNyelv: { authoredInLanguage: 'de' } })]], {
        nyelv: 'de',
      });
      const diag = veglegesitesDiagnozis(plan, priceListKategoriaval, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'nemet-kategoria-nev')).toBeUndefined();
    });

    it('magyar terven a check nem fut', () => {
      const plan = makePlan([[sor({ tetelId: 't1', nevSnapshot: 'Fogeltávolítás', fogak: '16' })]]);
      const diag = veglegesitesDiagnozis(plan, priceListKategoriaval, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'nemet-kategoria-nev')).toBeUndefined();
    });
  });

  it('névvel ellátott, 0 összegű sor a "nulla-osszegu-sor" soft tételt adja', () => {
    const plan = makePlan([
      [sor({ nevSnapshot: 'Ingyenes kontroll', listaEgysegar: 0, tenylegesEgysegar: 0 })],
    ]);
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    const t = tetel(diag, 'nulla-osszegu-sor');
    expect(t?.sulyossag).toBe('soft');
    expect(t?.reszletek).toEqual([{ cim: 'Érintett sorok', nevek: ['Ingyenes kontroll'] }]);
  });

  it('hiányzó csomag-leírás a "hianyzo-leiras" soft tételt adja, ha a leírások mutatása be van kapcsolva', () => {
    const plan = makePlan([[sor({ tetelId: 't-csomag', nevSnapshot: 'All-on-4 csomag' })]]);

    const bekapcsolva = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
    expect(tetel(bekapcsolva, 'hianyzo-leiras')?.sulyossag).toBe('soft');

    // Kikapcsolt leirasokMutatasa mellett a hiány nem érinti a nyomtatványt
    // -- docs/02-domain-modell.md § Tétel-leírás.
    const kikapcsolva = veglegesitesDiagnozis(plan, priceList, false, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
    expect(tetel(kikapcsolva, 'hianyzo-leiras')).toBeUndefined();
  });

  it('backlog-61: elavult árlistai pillanatkép az "ar-elteres" soft tételt adja', () => {
    const plan = makePlan([[sor({ listaEgysegar: 9000, tenylegesEgysegar: 9000 })]]); // priceList t1 mai ára 10000
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    const t = tetel(diag, 'ar-elteres');
    expect(t?.reszletek).toEqual([{ cim: 'Elavult árlistai pillanatkép', nevek: ['Fogeltávolítás'] }]);
  });

  it('backlog-61: kézzel felülírt ajánlati ár is az "ar-elteres" soft tételt adja', () => {
    const plan = makePlan([[sor({ tenylegesEgysegar: 8000 })]]); // listaEgysegar követi, de az ajánlati ár eltér
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    const t = tetel(diag, 'ar-elteres');
    expect(t?.reszletek).toEqual([{ cim: 'Kézzel felülírt ajánlati ár', nevek: ['Fogeltávolítás'] }]);
  });

  it('inaktivált tételre hivatkozó sor az "inaktiv-tetel-hivatkozas" soft tételt adja, nem blokkol', () => {
    const plan = makePlan([[sor({ tetelId: 't-inaktiv', nevSnapshot: 'Kivont tétel' })]]);
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    const t = tetel(diag, 'inaktiv-tetel-hivatkozas');
    expect(t?.sulyossag).toBe('soft');
    expect(t?.szamlalo).toBe(1);
    expect(t?.reszletek).toEqual([{ cim: 'Érintett sorok', nevek: ['Kivont tétel'] }]);
    expect(vanKemenyBlokk(diag)).toBe(false);
  });

  it('aktív tételre hivatkozó sor nem ad "inaktiv-tetel-hivatkozas" tételt', () => {
    const plan = makePlan([[sor()]]); // t1 aktív
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
    expect(tetel(diag, 'inaktiv-tetel-hivatkozas')).toBeUndefined();
  });

  // 65. tétel (D72): a doki kézzel írt szövegeinek nyelvi review-ja --
  // SZÁNDÉKOSAN külön a "nemet-nev" tételtől (az az ÁRLISTAI fordítás/
  // igazolás hiányát jelzi), lásd `domain/nyelviReview.ts`.
  describe('nyelvi-review (65. tétel, D72)', () => {
    it('kézzel átírt sornév, ami nem a terv nyelvén íródott, a "nyelvi-review" soft tételt adja', () => {
      const plan = makePlan([[sor({ nevNyelv: { authoredInLanguage: 'de' } })]]);
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

      const t = tetel(diag, 'nyelvi-review');
      expect(t?.sulyossag).toBe('soft');
      expect(t?.reszletek).toEqual([{ cim: 'Ellenőrzésre vár', nevek: ['Sor neve: Fogeltávolítás'] }]);
    });

    it('feloldott (reviewedForLanguage a terv nyelvére) szöveg nem ad tételt', () => {
      const plan = makePlan([
        [sor({ nevNyelv: { authoredInLanguage: 'de', reviewedForLanguage: 'hu' } })],
      ]);
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'nyelvi-review')).toBeUndefined();
    });

    it('a "nemet-nev"-től FÜGGETLENÜL él -- egy magyar terven is jelez, ahol a nemet-nev sosem alkalmazható', () => {
      const plan = makePlan([[sor({ nevNyelv: { authoredInLanguage: 'de' } })]], { nyelv: 'hu' });
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

      expect(tetel(diag, 'nemet-nev')).toBeUndefined();
      expect(tetel(diag, 'nyelvi-review')?.sulyossag).toBe('soft');
    });
  });

  it('62. tétel (D71): a terv pénznemében beárazatlan, 0 Ft-os sor az "araztalan-sor" hard tételben jelenik meg -- a "nulla-osszegu-sor" puha tétel ettől függetlenül, a 0 összeg miatt szintén jelez', () => {
    const plan = makePlan(
      [[sor({ tetelId: 't1', nevSnapshot: 'Fogeltávolítás', listaEgysegar: 0, tenylegesEgysegar: 0 })]],
      { penznem: 'EUR' },
    );
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    const t = tetel(diag, 'araztalan-sor');
    expect(t?.sulyossag).toBe('hard');
    expect(t?.reszletek).toEqual([{ cim: 'Érintett sorok', nevek: ['Fogeltávolítás'] }]);
    expect(tetel(diag, 'nulla-osszegu-sor')?.sulyossag).toBe('soft');
  });

  it('kézi ajánlati árat kapott, beárazatlan sor nem kerül az "araztalan-sor" tételbe', () => {
    const plan = makePlan(
      [[sor({ tetelId: 't1', nevSnapshot: 'Fogeltávolítás', listaEgysegar: 0, tenylegesEgysegar: 12000 })]],
      { penznem: 'EUR' },
    );
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
    expect(tetel(diag, 'araztalan-sor')).toBeUndefined();
  });

  it('egyszerre fennálló kemény ÉS puha tételek egymástól függetlenül jelennek meg a listában', () => {
    const plan = makePlan(
      [
        [sor({ tetelId: '', nevSnapshot: '', fogak: '16' })], // kemény: kitoltetlen-sor
        [sor({ nevSnapshot: 'Ingyenes kontroll', listaEgysegar: 0, tenylegesEgysegar: 0 })], // puha: nulla-osszegu-sor
      ],
      { paciens: paciens({ nev: '' }) }, // kemény: nev-hianyzik
    );
    const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);

    expect(tetel(diag, 'nev-hianyzik')).toBeDefined();
    expect(tetel(diag, 'kitoltetlen-sor')).toBeDefined();
    expect(tetel(diag, 'nulla-osszegu-sor')).toBeDefined();
  });

  // sablon-fallback / nyilatkozat-placeholder -- a hívó (PreviewPage) MÁR
  // feloldott TÉNYként adja át, ez a modul sosem tölt be sablont maga.
  describe('sablon (D576+/C8)', () => {
    it('sablonFallback igaz esetén "sablon-fallback" soft tételt ad', () => {
      const plan = makePlan([[sor()]]);
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, {
        ...NO_SABLON,
        sablonFallback: true,
      });
      expect(tetel(diag, 'sablon-fallback')?.sulyossag).toBe('soft');
    });

    it('nyilatkozatPlaceholder igaz esetén "nyilatkozat-placeholder" info tételt ad, nem blokkol', () => {
      const plan = makePlan([[sor()]]);
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, {
        ...NO_SABLON,
        nyilatkozatPlaceholder: true,
      });
      expect(tetel(diag, 'nyilatkozat-placeholder')?.sulyossag).toBe('info');
      expect(vanKemenyBlokk(diag)).toBe(false);
    });

    // A fizetési feltételek/garancia placeholder- vagy üres szövege a hívó
    // (PreviewPage) MÁR feloldott TÉNYként adja át -- a nyomtatványon
    // (TervDocument.tsx) a szakasz a címével együtt kimarad, itt csak PUHA
    // jelzés a dokinak.
    it('kihagyottSzekciok nem üres esetén "sablon-kihagyott-szekcio" soft tételt ad, nem blokkol', () => {
      const plan = makePlan([[sor()]]);
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, {
        ...NO_SABLON,
        kihagyottSzekciok: ['Garancia'],
      });
      const t = tetel(diag, 'sablon-kihagyott-szekcio');
      expect(t?.sulyossag).toBe('soft');
      expect(t?.szamlalo).toBe(1);
      expect(t?.reszletek?.[0].nevek).toEqual(['Garancia']);
      expect(vanKemenyBlokk(diag)).toBe(false);
    });

    it('kihagyottSzekciok üres esetén nem ad tételt', () => {
      const diag = veglegesitesDiagnozis(makePlan([[sor()]]), priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'sablon-kihagyott-szekcio')).toBeUndefined();
    });
  });

  // backlog-40: a master↔snapshot eltérés INFO-szintű tétel -- lásd a
  // `masterSnapshotDiff` doc-kommentjét (D162).
  describe('torzsadat-elteres (backlog-40)', () => {
    it('master nélkül nem ad tételt', () => {
      const diag = veglegesitesDiagnozis(makePlan([[sor()]]), priceList, true, null, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'torzsadat-elteres')).toBeUndefined();
    });

    it('eltérő masternél info tételt ad, nem blokkol', () => {
      const plan = makePlan([[sor()]], { paciens: paciens({ telefon: '+36 20 123 4567' }) });
      const master = paciens({ telefon: '+36 70 999 8888' });
      const diag = veglegesitesDiagnozis(plan, priceList, true, master, AKTIV_ORVOSOK, NO_SABLON);

      const t = tetel(diag, 'torzsadat-elteres');
      expect(t?.sulyossag).toBe('info');
      expect(t?.szamlalo).toBe(1);
      expect(vanKemenyBlokk(diag)).toBe(false);
    });
  });

  // D68: a kezelőorvos-blokk KEMÉNY tétel.
  describe('orvos (D68)', () => {
    it('üres orvos esetén hard tételt ad, "hianyzik" szöveggel', () => {
      const plan = makePlan([[sor()]], { orvos: '' });
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'orvos')?.cim).toContain('nincs kezelőorvos');
    });

    it('nem aktív orvosnál hard tételt ad', () => {
      const plan = makePlan([[sor()]], { orvos: 'Dr. Törölt' });
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'orvos')?.cim).toContain('Dr. Törölt');
    });

    it('aktív orvosnál nem ad tételt', () => {
      const plan = makePlan([[sor()]]);
      const diag = veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON);
      expect(tetel(diag, 'orvos')).toBeUndefined();
    });
  });
});

// D66: az előleg túllépése KEMÉNY tétel.
describe('eloleg-tullep (D66)', () => {
  function tetelEloleg(plan: Plan) {
    return tetel(
      veglegesitesDiagnozis(plan, priceList, true, NO_MASTER, AKTIV_ORVOSOK, NO_SABLON),
      'eloleg-tullep',
    );
  }

  it('nincs bekapcsolt előleg -- nincs tétel', () => {
    expect(tetelEloleg(makePlan([[sor()]]))).toBeUndefined();
  });

  it('az előleg a fizetendő alatt -- nincs tétel', () => {
    expect(tetelEloleg(makePlan([[sor()]], { elolegOsszeg: 5000 }))).toBeUndefined(); // fizetendő 10000
  });

  it('az előleg pontosan egyenlő a fizetendővel -- nincs tétel, ez legitim (D327)', () => {
    expect(tetelEloleg(makePlan([[sor()]], { elolegOsszeg: 10000 }))).toBeUndefined();
  });

  it('az előleg meghaladja a fizetendőt -- hard tétel', () => {
    expect(tetelEloleg(makePlan([[sor()]], { elolegOsszeg: 15000 }))?.sulyossag).toBe('hard');
  });

  it('a terv-szintű kedvezmény miatt csökkent fizetendőhöz képest is túllépést jelez', () => {
    // Sorok összege 10000, kedvezménnyel a fizetendő 4000 -- az előleg ehhez
    // képest, nem a nyers sorösszeghez képest lépi túl a határt.
    const plan = makePlan([[sor()]], { elolegOsszeg: 5000, kedvezmenyOsszeg: 6000 });
    expect(tetelEloleg(plan)?.sulyossag).toBe('hard');
  });
});
