import { describe, expect, it } from 'vitest';
import {
  buildToothVisualStates,
  isMaradoFog,
  isTejfog,
  resolveToothVisual,
} from './toothVisual';
import type { Kategoria, Plan, PriceList, Sor, Tetel } from './types';
import {
  ALAP_KATEGORIA_SZIN,
  ISMERETLEN_KATEGORIA,
  kategoriaVizual,
  vizualKategoriaFor,
} from '../design/treatmentVisuals';

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

function kategoria(id: string, sorrend: number, szin: string): Kategoria {
  return { id, nev: { hu: `Kategória ${id}`, de: null }, sorrend, szin };
}

// A régi vödör-alapú prioritási tábla (SEBESZET, IMPLANTATUM, FOGSOR, KORONA,
// GYOKERKEZELES, PARODONTOLOGIA, TOMES, EGYEB) precedenciáját utánozzuk itt:
// minél kisebb a `sorrend`, annál előrébb áll ütközésnél (D28,
// `docs/01-attekintes-es-dontesek.md`). A `KAT_*` a nyers `Kategoria` (a
// `priceList.kategoriak`-ba való), a `K_*` a belőle számított
// `KategoriaVizual` (a `FogKezeles.vizual`/`jelmagyarazat` alakja).
const KAT_KORONA = kategoria('k10', 1, '#4dabf7');
const KAT_GYOKER = kategoria('k03', 2, '#fcc419');
const KAT_TOMES = kategoria('k02', 3, '#51cf66');
const K_KORONA = kategoriaVizual(KAT_KORONA);
const K_GYOKER = kategoriaVizual(KAT_GYOKER);
const K_TOMES = kategoriaVizual(KAT_TOMES);

function makePriceList(tetelek: Tetel[], kategoriak: Kategoria[] = []): PriceList {
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

function makePlan(sorok: Sor[]): Plan {
  return makeMultiPhasePlan([sorok]);
}

function makeMultiPhasePlan(fazisok: Sor[][]): Plan {
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
    fazisok: fazisok.map((sorok, i) => ({
      sorszam: i + 1,
      megnevezes: `${i + 1}. kezelés`,
      megjegyzes: '',
      sorok,
    })),
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

describe('kategoriaVizual', () => {
  it('érvényes hex `szin` esetén azt adja vissza', () => {
    const v = kategoriaVizual(KAT_TOMES);
    expect(v).toEqual({ id: 'k02', nev: KAT_TOMES.nev, szin: '#51cf66', sorrend: 3 });
  });

  it('hiányzó vagy érvénytelen `szin` esetén ALAP_KATEGORIA_SZIN-re esik vissza', () => {
    expect(kategoriaVizual({ ...KAT_TOMES, szin: undefined }).szin).toBe(ALAP_KATEGORIA_SZIN);
    expect(kategoriaVizual({ ...KAT_TOMES, szin: 'nem-hex' }).szin).toBe(ALAP_KATEGORIA_SZIN);
  });
});

describe('vizualKategoriaFor', () => {
  const kategoriak = [KAT_KORONA, KAT_GYOKER, KAT_TOMES];

  it('ismert kategoriaId a listából oldódik fel', () => {
    const v = vizualKategoriaFor('k02', kategoriak);
    expect(v.szin).toBe('#51cf66');
  });

  it('ismeretlen vagy hiányzó kategoriaId a fix tartalékot adja', () => {
    expect(vizualKategoriaFor('k99', kategoriak)).toBe(ISMERETLEN_KATEGORIA);
    expect(vizualKategoriaFor(null, kategoriak)).toBe(ISMERETLEN_KATEGORIA);
    expect(vizualKategoriaFor(undefined, kategoriak)).toBe(ISMERETLEN_KATEGORIA);
  });
});

describe('isMaradoFog / isTejfog', () => {
  it('elfogadja az érvényes maradó fogszámokat', () => {
    expect(isMaradoFog('18')).toBe(true);
    expect(isMaradoFog('11')).toBe(true);
    expect(isMaradoFog('48')).toBe(true);
  });

  it('elfogadja az érvényes tejfog-számokat', () => {
    expect(isTejfog('55')).toBe(true);
    expect(isTejfog('85')).toBe(true);
  });

  it('elutasítja az érvénytelen kombinációkat', () => {
    expect(isMaradoFog('19')).toBe(false);
    expect(isTejfog('19')).toBe(false);
    expect(isMaradoFog('00')).toBe(false);
    expect(isTejfog('00')).toBe(false);
  });
});

describe('resolveToothVisual', () => {
  it('üres kezeléslistára a fix tartalékot adja', () => {
    expect(resolveToothVisual([])).toBe(ISMERETLEN_KATEGORIA);
  });

  it('a legkisebb sorrendű kategóriát választja', () => {
    const v = resolveToothVisual([
      { fdi: '16', sor: sor({}), vizual: K_GYOKER, fazisIndex: 0, sorIndex: 0 },
      { fdi: '16', sor: sor({}), vizual: K_KORONA, fazisIndex: 0, sorIndex: 1 },
    ]);
    expect(v).toBe(K_KORONA);
  });

  it('azonos sorrend esetén az id dönt (determinizmus)', () => {
    const a = { ...K_TOMES, id: 'k02', sorrend: 5 };
    const b = { ...K_TOMES, id: 'k01', sorrend: 5 };
    const v = resolveToothVisual([
      { fdi: '16', sor: sor({}), vizual: a, fazisIndex: 0, sorIndex: 0 },
      { fdi: '16', sor: sor({}), vizual: b, fazisIndex: 0, sorIndex: 1 },
    ]);
    expect(v).toBe(b);
  });

  it('az ismeretlen tartalék (sorrend: Infinity) sosem nyer valódi kategóriával szemben', () => {
    const v = resolveToothVisual([
      { fdi: '16', sor: sor({}), vizual: ISMERETLEN_KATEGORIA, fazisIndex: 0, sorIndex: 0 },
      { fdi: '16', sor: sor({}), vizual: K_TOMES, fazisIndex: 0, sorIndex: 1 },
    ]);
    expect(v).toBe(K_TOMES);
  });
});

describe('buildToothVisualStates', () => {
  const pl = makePriceList(
    [
      tetel('t-tomes', 'k02'), // TOMES
      tetel('t-gyoker', 'k03'), // GYOKERKEZELES
      tetel('t-korona', 'k10'), // KORONA
    ],
    [KAT_KORONA, KAT_GYOKER, KAT_TOMES],
  );

  it('egy kezelés egy fogon', () => {
    const plan = makePlan([sor({ tetelId: 't-tomes', fogak: '16' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect(allapot.fogak.size).toBe(1);
    const fog16 = allapot.fogak.get('16');
    // buildToothVisualStates a priceList.kategoriak-ból saját (a fenti K_*-
    // fixtúráktól eltérő objektum-azonosságú) KategoriaVizual-t épít --
    // toEqual (szerkezeti), nem toBe (referencia).
    expect(fog16?.vizual).toEqual(K_TOMES);
    expect(fog16?.kezelesek).toHaveLength(1);
  });

  it('több érintett fog egy soron', () => {
    const plan = makePlan([sor({ tetelId: 't-tomes', fogak: '16, 17, 26' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect([...allapot.fogak.keys()].sort()).toEqual(['16', '17', '26']);
  });

  it('több kezelés ugyanazon a fogon -- mindkettő megmarad, a szín a sorrend szerinti', () => {
    const plan = makePlan([
      sor({ tetelId: 't-gyoker', fogak: '16' }),
      sor({ tetelId: 't-korona', fogak: '16' }),
    ]);
    const allapot = buildToothVisualStates(plan, pl);
    const fog16 = allapot.fogak.get('16');
    expect(fog16?.kezelesek).toHaveLength(2);
    expect(fog16?.vizual).toEqual(K_KORONA); // KORONA (sorrend 1) megelőzi a GYOKERKEZELES-t (sorrend 2)
  });

  it('ismételt FDI kód egyetlen sor `fogak` mezőjében egyetlen FogKezelest ad (parseTeeth dedup)', () => {
    const plan = makePlan([sor({ tetelId: 't-tomes', fogak: '16, 17, 16' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect(allapot.fogak.get('16')?.kezelesek).toHaveLength(1);
  });

  it('kezeletlen fog nincs a fogak Mapben (a rajzon fehér marad)', () => {
    const plan = makePlan([sor({ tetelId: 't-tomes', fogak: '16' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect(allapot.fogak.has('11')).toBe(false);
  });

  it('ismeretlen tetelId esetén a fog a fix tartalékot kapja és hianyzoTetel jelez', () => {
    const plan = makePlan([sor({ tetelId: 't-nincs-ilyen', fogak: '21' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect(allapot.fogak.get('21')?.vizual).toBe(ISMERETLEN_KATEGORIA);
    expect(allapot.hianyzoTetel).toBe(true);
  });

  it('tejfog a tejfogak listába kerül, nem a fogak Mapbe, és nem képződik le másik fogra', () => {
    const plan = makePlan([sor({ tetelId: 't-tomes', fogak: '55, 65' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect(allapot.fogak.size).toBe(0);
    expect(allapot.tejfogak).toEqual(['55', '65']);
  });

  it('szabadszöveges/érvénytelen fogak mező nem térképez ki fogat (mindent-vagy-semmit, mint a parseTeeth-nél)', () => {
    const plan = makePlan([sor({ tetelId: 't-tomes', fogak: 'jobb felső' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect(allapot.fogak.size).toBe(0);
    expect(allapot.tejfogak).toEqual([]);
    expect(allapot.ismeretlen).toEqual([]);
  });

  it('a jelmagyarázat csak az előforduló kategóriákat tartalmazza, sorrend szerint, dedupolva', () => {
    const plan = makePlan([
      sor({ tetelId: 't-tomes', fogak: '16' }),
      sor({ tetelId: 't-korona', fogak: '21' }),
      sor({ tetelId: 't-korona', fogak: '22' }), // ugyanaz a kategória, ne duplikálódjon
    ]);
    const allapot = buildToothVisualStates(plan, pl);
    // KORONA (sorrend 1) megelőzi a TOMES-t (sorrend 3).
    expect(allapot.jelmagyarazat).toEqual([K_KORONA, K_TOMES]);
  });

  it('a FogKezeles helyes fazisIndex/sorIndex-et hordoz, több fázison és soron át', () => {
    const plan = makeMultiPhasePlan([
      [sor({ tetelId: 't-tomes', fogak: '16' }), sor({ tetelId: 't-gyoker', fogak: '16' })],
      [sor({ tetelId: 't-korona', fogak: '16' })],
    ]);
    const allapot = buildToothVisualStates(plan, pl);
    const kezelesek = allapot.fogak.get('16')?.kezelesek ?? [];
    expect(kezelesek).toEqual([
      expect.objectContaining({ fazisIndex: 0, sorIndex: 0, vizual: K_TOMES }),
      expect.objectContaining({ fazisIndex: 0, sorIndex: 1, vizual: K_GYOKER }),
      expect.objectContaining({ fazisIndex: 1, sorIndex: 0, vizual: K_KORONA }),
    ]);
  });

  it('üres terv üres állapotot ad, hiba nélkül', () => {
    const allapot = buildToothVisualStates(makePlan([]), pl);
    expect(allapot.fogak.size).toBe(0);
    expect(allapot.tejfogak).toEqual([]);
    expect(allapot.hianyzoTetel).toBe(false);
    expect(allapot.jelmagyarazat).toEqual([]);
  });
});
