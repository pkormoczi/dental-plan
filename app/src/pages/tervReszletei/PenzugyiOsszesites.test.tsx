// A Terv részletei nézet pénzügyi összesítő blokkjának tesztje -- lásd
// docs/03-funkcionalis-spec.md § 11. A komponens tisztán prezentációs
// (nincs storage-/router-függősége), a `FazisokBlokk.test.tsx` `makePlan()`
// mintáján épített fixtúrákkal.

import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it } from 'vitest';
import PenzugyiOsszesites from './PenzugyiOsszesites';
import type { Fazis, Plan, Sor } from '../../domain/types';

function makeSor(overrides: Partial<Sor> = {}): Sor {
  return {
    tetelId: 't001',
    nevSnapshot: 'Tömés',
    savos: false,
    fogak: '11',
    mennyiseg: 1,
    listaEgysegar: 10000,
    tenylegesEgysegar: 10000,
    ...overrides,
  };
}

function makeFazis(overrides: Partial<Fazis> = {}): Fazis {
  return {
    sorszam: 1,
    megnevezes: '1. kezelés — teszt',
    megjegyzes: '',
    sorok: [makeSor()],
    ...overrides,
  };
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  const fazisok = overrides.fazisok ?? [makeFazis()];
  return {
    schemaVersion: 1,
    tervId: 'terv1',
    verzio: 1,
    statusz: 'VEGLEGES',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Teszt Elek',
      szuletesiIdo: '1985-04-12',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok,
    osszesitok: { kezelesekOsszesen: 10000, kedvezmeny: 0, fizetendo: 10000 },
    ...overrides,
  };
}

function renderOsszesites(plan: Plan) {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <PenzugyiOsszesites plan={plan} />
    </Theme>,
  );
}

describe('PenzugyiOsszesites', () => {
  it('a Fizetendő a MENTETT osszesitok.fizetendo-t mutatja, nem az újraszámolt értéket', () => {
    // A `fazisok` szerint 100 000 lenne az összeg, de a mentett `osszesitok`
    // szerint 80 000 -- a mentett érték az igazság.
    const plan = makePlan({
      fazisok: [makeFazis({ sorok: [makeSor({ listaEgysegar: 100000, tenylegesEgysegar: 100000 })] })],
      osszesitok: { kezelesekOsszesen: 100000, kedvezmeny: 20000, fizetendo: 80000 },
    });
    renderOsszesites(plan);
    expect(screen.getByText('80 000 Ft')).toBeInTheDocument();
    expect(screen.queryByText('100 000 Ft', { selector: 'div' })).not.toBeInTheDocument();
  });

  it('egy mesterségesen eltérített osszesitok info-szintű figyelmeztetést kap', () => {
    const plan = makePlan({
      fazisok: [makeFazis({ sorok: [makeSor({ listaEgysegar: 100000, tenylegesEgysegar: 100000 })] })],
      osszesitok: { kezelesekOsszesen: 100000, kedvezmeny: 0, fizetendo: 250000 },
    });
    renderOsszesites(plan);
    expect(
      screen.getByText(/A mentett összesítő nem egyezik a mentett sorokból újraszámolt értékkel/),
    ).toBeInTheDocument();
    expect(screen.getByText('100 000 Ft')).toBeInTheDocument();
  });

  it('egyező osszesitok mellett nincs figyelmeztetés', () => {
    const plan = makePlan({
      fazisok: [makeFazis({ sorok: [makeSor({ listaEgysegar: 100000, tenylegesEgysegar: 100000 })] })],
      osszesitok: { kezelesekOsszesen: 100000, kedvezmeny: 0, fizetendo: 100000 },
    });
    renderOsszesites(plan);
    expect(screen.queryByText(/nem egyezik/)).not.toBeInTheDocument();
  });

  it('a "Kezelések összesen" sor csak akkor jelenik meg, ha osszesitok.kedvezmeny ≠ 0 (kedvezmény)', () => {
    const plan = makePlan({ osszesitok: { kezelesekOsszesen: 100000, kedvezmeny: 20000, fizetendo: 80000 } });
    renderOsszesites(plan);
    expect(screen.getByText('Kezelések összesen')).toBeInTheDocument();
  });

  it('a "Kezelések összesen" sor negatív kedvezmény (felár) esetén is megjelenik', () => {
    const plan = makePlan({ osszesitok: { kezelesekOsszesen: 100000, kedvezmeny: -20000, fizetendo: 120000 } });
    renderOsszesites(plan);
    expect(screen.getByText('Kezelések összesen')).toBeInTheDocument();
  });

  it('nulla kedvezmény esetén nincs "Kezelések összesen" referenciasor', () => {
    const plan = makePlan({ osszesitok: { kezelesekOsszesen: 100000, kedvezmeny: 0, fizetendo: 100000 } });
    renderOsszesites(plan);
    expect(screen.queryByText('Kezelések összesen')).not.toBeInTheDocument();
  });

  it('előleg nélkül nincs "Fizetés" alcsoport és nincs Előleg/Fennmaradó sor', () => {
    const plan = makePlan({ elolegOsszeg: null });
    renderOsszesites(plan);
    expect(screen.queryByText('Fizetés')).not.toBeInTheDocument();
    expect(screen.queryByText('Előleg')).not.toBeInTheDocument();
    expect(screen.queryByText('Fennmaradó rész')).not.toBeInTheDocument();
  });

  it('az Előleg és a Fennmaradó rész a STORED fizetendő-ből számol, nem a sorok összegéből', () => {
    const plan = makePlan({
      fazisok: [makeFazis({ sorok: [makeSor({ listaEgysegar: 1000000, tenylegesEgysegar: 1000000 })] })],
      osszesitok: { kezelesekOsszesen: 800000, kedvezmeny: 0, fizetendo: 800000 },
      elolegOsszeg: 300000,
    });
    renderOsszesites(plan);
    expect(screen.getByText('Fizetés')).toBeInTheDocument();
    expect(screen.getByText('300 000 Ft')).toBeInTheDocument();
    expect(screen.getByText('500 000 Ft')).toBeInTheDocument();
  });

  it('a fizetendőt meghaladó előlegnél a Fennmaradó rész "—"', () => {
    const plan = makePlan({
      osszesitok: { kezelesekOsszesen: 100000, kedvezmeny: 0, fizetendo: 100000 },
      elolegOsszeg: 150000,
    });
    renderOsszesites(plan);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('a becsült tételek számát a mentett fázisok savos sorai adják, több fázison át', () => {
    const plan = makePlan({
      fazisok: [
        makeFazis({ sorok: [makeSor({ savos: true }), makeSor({ savos: false })] }),
        makeFazis({ sorszam: 2, sorok: [makeSor({ savos: true }), makeSor({ savos: true })] }),
      ],
    });
    renderOsszesites(plan);
    expect(screen.getByText(/3 tétel ára becsült/)).toBeInTheDocument();
  });

  it('savos sor nélkül nincs becsült info-sor', () => {
    const plan = makePlan({ fazisok: [makeFazis({ sorok: [makeSor({ savos: false })] })] });
    renderOsszesites(plan);
    expect(screen.queryByText(/tétel ára becsült/)).not.toBeInTheDocument();
  });
});
