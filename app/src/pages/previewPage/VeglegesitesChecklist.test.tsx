// 101. tétel: a `szamlalo`-jelvény renderelése, KIEMELVE a `veglegesitesOr`
// tesztjétől -- ott csak a diagnózis adatszerkezete, itt a MEGJELENÍTÉS.
// A mai integrációs lefedettség (`PreviewPage.test.tsx`) egyik esete sem
// állít elő két nem üres `reszletek`-bucketet egyszerre, ezért az
// alcsoportonkénti jelvény csak kézzel összeállított `VeglegesitesCsekklista`
// bemenettel igazolható.

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import { VeglegesitesChecklist } from './VeglegesitesChecklist';
import type { VeglegesitesCsekklista } from '../../domain/veglegesitesOr';

function renderChecklist(csekklista: VeglegesitesCsekklista) {
  return render(
    <Theme>
      <VeglegesitesChecklist csekklista={csekklista} onNavigate={vi.fn()} />
    </Theme>,
  );
}

describe('VeglegesitesChecklist -- szamlalo-jelvény', () => {
  it('két nem üres reszletek-bucketnél két külön jelvény, saját címmel és számmal', () => {
    renderChecklist({
      tetelek: [
        {
          id: 'ar-elteres',
          sulyossag: 'soft',
          cim: 'Néhány sor ára eltér a mai árlistától.',
          szamlalo: 3,
          reszletek: [
            { cim: 'Elavult árlistai pillanatkép', nevek: ['Fogeltávolítás', 'Tömés'] },
            { cim: 'Kézzel felülírt ajánlati ár', nevek: ['Korona'] },
          ],
        },
      ],
    });

    expect(screen.getByText('Elavult árlistai pillanatkép: 2')).toBeInTheDocument();
    expect(screen.getByText('Kézzel felülírt ajánlati ár: 1')).toBeInTheDocument();
    // az összegzett "3" (a szamlalo nyers értéke) NEM jelenik meg jelvényként
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('egy sorra eső átfedés a két bucket között sem torzítja egyik jelvény darabszámát sem', () => {
    renderChecklist({
      tetelek: [
        {
          id: 'nemet-nev',
          sulyossag: 'hard',
          cim: 'Ez egy német nyelvű ajánlat, de néhány sor neve nem igazoltan németül kerül a nyomtatványra.',
          szamlalo: 2,
          reszletek: [
            { cim: 'Nincs német nevük az árlistában', nevek: ['Fogeltávolítás'] },
            { cim: 'Kézzel írt/átírt, nyelvileg nem ellenőrzött', nevek: ['Fogeltávolítás'] },
          ],
        },
      ],
    });

    expect(screen.getByText('Nincs német nevük az árlistában: 1')).toBeInTheDocument();
    expect(screen.getByText('Kézzel írt/átírt, nyelvileg nem ellenőrzött: 1')).toBeInTheDocument();
  });

  it('legfeljebb egy reszletek-bucketnél a szamlalo értéke egyetlen jelvény, mindhárom súlyossági szinten', () => {
    renderChecklist({
      tetelek: [
        {
          id: 'kitoltetlen-sor',
          sulyossag: 'hard',
          cim: 'A terv 2 kitöltetlen sort tartalmaz.',
          szamlalo: 2,
          reszletek: [{ cim: 'Érintett sorok', nevek: ['1. kezelés — 16', '1. kezelés — 26'] }],
        },
        {
          id: 'nulla-osszegu-sor',
          sulyossag: 'soft',
          cim: 'A terv 1 0 Ft-os tételt tartalmaz.',
          szamlalo: 1,
        },
        {
          id: 'torzsadat-elteres',
          sulyossag: 'info',
          cim: 'A páciens törzsadata 2 mezőben eltér a terv adataitól.',
          szamlalo: 2,
        },
      ],
    });

    expect(screen.getAllByText('2', { selector: '.rt-Badge' })).toHaveLength(2);
    expect(screen.getByText('1', { selector: '.rt-Badge' })).toBeInTheDocument();
  });

  it('szamlalo nélküli tételnél nincs jelvény', () => {
    renderChecklist({
      tetelek: [
        {
          id: 'sablon-fallback',
          sulyossag: 'soft',
          cim: 'A tervhez tartozó sablon nem érhető el a megfelelő nyelven.',
        },
      ],
    });

    expect(document.querySelector('.rt-Badge')).toBeNull();
  });

  it('a reszletek szöveges sora nem tartalmazza az inline (N) előtagot', () => {
    renderChecklist({
      tetelek: [
        {
          id: 'ar-elteres',
          sulyossag: 'soft',
          cim: 'Néhány sor ára eltér a mai árlistától.',
          szamlalo: 1,
          reszletek: [{ cim: 'Elavult árlistai pillanatkép', nevek: ['Fogeltávolítás'] }],
        },
      ],
    });

    expect(screen.getByText('Elavult árlistai pillanatkép: Fogeltávolítás')).toBeInTheDocument();
    expect(screen.queryByText(/Elavult árlistai pillanatkép \(1\)/)).not.toBeInTheDocument();
  });
});
