import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DemoBanner from './DemoBanner';
import { TestProviders } from '../testUtils';

describe('DemoBanner', () => {
  it('a böngészős demóban a tároló kiürítéséhez a Beállítások Adatkezelés fülére utal, nem a DEMO oldalra', async () => {
    render(
      <TestProviders>
        <DemoBanner />
      </TestProviders>,
    );

    const sav = await screen.findByText(/csak ebben a böngészőben/);
    expect(sav).toHaveTextContent('a Beállítások Adatkezelés fülén a „Minden adat törlése” gombbal');
    expect(sav).not.toHaveTextContent('DEMO oldal');
  });
});
