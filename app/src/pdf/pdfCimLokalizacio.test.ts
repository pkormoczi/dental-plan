import { describe, expect, it } from 'vitest';
import { pdfFazisNev, pdfTervCim } from './pdfCimLokalizacio';
import { ALAPERTELMEZETT_TERV_CIM } from '../domain/tervCim';
import type { Kategoria, Plan, PriceList, Sor, Tetel } from '../domain/types';

function kategoria(id: string, sorrend: number, nevHu: string, nevDe: string | null): Kategoria {
  return { id, nev: { hu: nevHu, de: nevDe }, sorrend };
}

function tetel(id: string, kategoriaId: string): Tetel {
  return {
    id,
    kategoriaId,
    sorrend: 1,
    aktiv: true,
    gyakori: false,
    nev: { hu: id, de: null },
    ar: { HUF: { tipus: 'FIX', ertek: 1000 }, EUR: null },
  };
}

function makePriceList(tetelek: Tetel[], kategoriak: Kategoria[]): PriceList {
  return {
    schemaVersion: 1,
    arlistaVerzio: '2026-01-01',
    modositva: '2026-01-01',
    kategoriak,
    tetelek,
  };
}

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

function makePlan(nyelv: Plan['nyelv'], sorok: Sor[]): Plan {
  return {
    schemaVersion: 1,
    tervId: 't',
    verzio: 1,
    statusz: 'PISZKOZAT',
    nyelv,
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
    fazisok: [{ sorszam: 1, megnevezes: '1. kezelés', megjegyzes: '', sorok }],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

const KAT_IMPLANT = kategoria('k05', 5, 'Implantológia', 'Implantologie');
const KAT_TOMES_HU_ONLY = kategoria('k02', 2, 'Tömés', null);

describe('pdfTervCim', () => {
  it('DE terven, soha át nem írt címmel a domináns kategória német nevét adja', () => {
    const priceList = makePriceList([tetel('t05', 'k05')], [KAT_IMPLANT]);
    const plan = makePlan('de', [sor({ tetelId: 't05', tenylegesEgysegar: 300000 })]);
    expect(pdfTervCim('Implantológia', plan, priceList)).toBe('Implantologie');
  });

  it('DE terven, hiányzó német kategórianévnél a HU-visszaesésre esik (resolveNev)', () => {
    const priceList = makePriceList([tetel('t02', 'k02')], [KAT_TOMES_HU_ONLY]);
    const plan = makePlan('de', [sor({ tetelId: 't02', tenylegesEgysegar: 10000 })]);
    expect(pdfTervCim('Tömés', plan, priceList)).toBe('Tömés');
  });

  it('DE terven, kézzel átírt címmel a beírt szöveg változatlan marad', () => {
    const priceList = makePriceList([tetel('t05', 'k05')], [KAT_IMPLANT]);
    const plan = makePlan('de', [sor({ tetelId: 't05', tenylegesEgysegar: 300000 })]);
    expect(pdfTervCim('Fogpótlás terve', plan, priceList)).toBe('Fogpótlás terve');
  });

  it('HU terven a cím változatlan marad (no-op), akkor is, ha van német fordítás', () => {
    const priceList = makePriceList([tetel('t05', 'k05')], [KAT_IMPLANT]);
    const plan = makePlan('hu', [sor({ tetelId: 't05', tenylegesEgysegar: 300000 })]);
    expect(pdfTervCim('Implantológia', plan, priceList)).toBe('Implantológia');
  });

  it('DE terven, domináns kategória nélkül (üres terv) az alapértelmezett cím változatlan marad', () => {
    const priceList = makePriceList([], []);
    const plan = makePlan('de', []);
    expect(pdfTervCim(ALAPERTELMEZETT_TERV_CIM, plan, priceList)).toBe(ALAPERTELMEZETT_TERV_CIM);
  });
});

describe('pdfFazisNev', () => {
  it('DE nyelven, generált fázisnévnél a német mintát adja', () => {
    expect(pdfFazisNev('2. kezelés', 2, 'de')).toBe('2. Behandlung');
  });

  it('DE nyelven, kézzel átnevezett fázisnál a tárolt nevet adja változatlanul', () => {
    expect(pdfFazisNev('Fogpótlás', 2, 'de')).toBe('Fogpótlás');
  });

  it('DE nyelven, más pozícióhoz tartozó generált mintánál nem cseréli (nem egyezik pontosan)', () => {
    expect(pdfFazisNev('2. kezelés', 3, 'de')).toBe('2. kezelés');
  });

  it('HU nyelven a fázisnév mindig változatlan (no-op)', () => {
    expect(pdfFazisNev('2. kezelés', 2, 'hu')).toBe('2. kezelés');
  });
});
