import { describe, expect, it } from 'vitest';
import {
  buildToothVisualStates,
  isMaradoFog,
  isTejfog,
  resolveToothVisual,
} from './toothVisual';
import type { Plan, PriceList, Sor, Tetel } from './types';
import { KATEGORIA_VIZUAL, KEZELES_VIZUALOK, vizualKategoriaFor } from '../design/treatmentVisuals';

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

function makePriceList(tetelek: Tetel[]): PriceList {
  return {
    schemaVersion: 1,
    arlistaVerzio: '2026-01-01',
    modositva: '2026-01-01',
    kategoriak: [],
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

describe('vizualKategoriaFor', () => {
  it('minden k01..k12 kategóriának van vizuális leképezése egy ismert színnel', () => {
    for (let i = 1; i <= 12; i++) {
      const id = `k${String(i).padStart(2, '0')}`;
      const vizual = vizualKategoriaFor(id);
      expect(KATEGORIA_VIZUAL[id]).toBe(vizual);
      expect(KEZELES_VIZUALOK[vizual].szin).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('ismeretlen vagy hiányzó kategória semleges EGYEB-et kap', () => {
    expect(vizualKategoriaFor('k99')).toBe('EGYEB');
    expect(vizualKategoriaFor(null)).toBe('EGYEB');
    expect(vizualKategoriaFor(undefined)).toBe('EGYEB');
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
  it('üres kezeléslistára semleges EGYEB-et ad', () => {
    expect(resolveToothVisual([])).toBe('EGYEB');
  });

  it('a prioritási tábla szerinti legmagasabb kategóriát választja', () => {
    const v = resolveToothVisual([
      { fdi: '16', sor: sor({}), vizual: 'GYOKERKEZELES', fazisIndex: 0, sorIndex: 0 },
      { fdi: '16', sor: sor({}), vizual: 'KORONA', fazisIndex: 0, sorIndex: 1 },
    ]);
    // KORONA a GYOKERKEZELES előtt áll a KEZELES_VIZUAL_PRIORITAS táblában.
    expect(v).toBe('KORONA');
  });
});

describe('buildToothVisualStates', () => {
  const pl = makePriceList([
    tetel('t-tomes', 'k02'), // TOMES
    tetel('t-gyoker', 'k03'), // GYOKERKEZELES
    tetel('t-korona', 'k10'), // KORONA
  ]);

  it('egy kezelés egy fogon', () => {
    const plan = makePlan([sor({ tetelId: 't-tomes', fogak: '16' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect(allapot.fogak.size).toBe(1);
    const fog16 = allapot.fogak.get('16');
    expect(fog16?.vizual).toBe('TOMES');
    expect(fog16?.kezelesek).toHaveLength(1);
  });

  it('több érintett fog egy soron', () => {
    const plan = makePlan([sor({ tetelId: 't-tomes', fogak: '16, 17, 26' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect([...allapot.fogak.keys()].sort()).toEqual(['16', '17', '26']);
  });

  it('több kezelés ugyanazon a fogon -- mindkettő megmarad, a szín a prioritás szerinti', () => {
    const plan = makePlan([
      sor({ tetelId: 't-gyoker', fogak: '16' }),
      sor({ tetelId: 't-korona', fogak: '16' }),
    ]);
    const allapot = buildToothVisualStates(plan, pl);
    const fog16 = allapot.fogak.get('16');
    expect(fog16?.kezelesek).toHaveLength(2);
    expect(fog16?.vizual).toBe('KORONA'); // KORONA megelőzi a GYOKERKEZELES-t
  });

  it('kezeletlen fog nincs a fogak Mapben (a rajzon fehér marad)', () => {
    const plan = makePlan([sor({ tetelId: 't-tomes', fogak: '16' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect(allapot.fogak.has('11')).toBe(false);
  });

  it('ismeretlen tetelId esetén a fog EGYEB színt kap és hianyzoTetel jelez', () => {
    const plan = makePlan([sor({ tetelId: 't-nincs-ilyen', fogak: '21' })]);
    const allapot = buildToothVisualStates(plan, pl);
    expect(allapot.fogak.get('21')?.vizual).toBe('EGYEB');
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

  it('a jelmagyarázat csak az előforduló kategóriákat tartalmazza, prioritási sorrendben', () => {
    const plan = makePlan([
      sor({ tetelId: 't-tomes', fogak: '16' }),
      sor({ tetelId: 't-korona', fogak: '21' }),
    ]);
    const allapot = buildToothVisualStates(plan, pl);
    // KORONA megelőzi a TOMES-t a prioritási táblában.
    expect(allapot.jelmagyarazat).toEqual(['KORONA', 'TOMES']);
  });

  it('a FogKezeles helyes fazisIndex/sorIndex-et hordoz, több fázison és soron át', () => {
    const plan = makeMultiPhasePlan([
      [sor({ tetelId: 't-tomes', fogak: '16' }), sor({ tetelId: 't-gyoker', fogak: '16' })],
      [sor({ tetelId: 't-korona', fogak: '16' })],
    ]);
    const allapot = buildToothVisualStates(plan, pl);
    const kezelesek = allapot.fogak.get('16')?.kezelesek ?? [];
    expect(kezelesek).toEqual([
      expect.objectContaining({ fazisIndex: 0, sorIndex: 0, vizual: 'TOMES' }),
      expect.objectContaining({ fazisIndex: 0, sorIndex: 1, vizual: 'GYOKERKEZELES' }),
      expect.objectContaining({ fazisIndex: 1, sorIndex: 0, vizual: 'KORONA' }),
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
