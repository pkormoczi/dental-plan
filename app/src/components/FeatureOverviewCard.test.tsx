import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FeatureOverviewCard from './FeatureOverviewCard';

describe('FeatureOverviewCard', () => {
  it('a FEATURES.md szakaszcímeit a fájlban szereplő sorrendben jeleníti meg', () => {
    // Nincs szükség TestProviders-re: a komponens sem AppState-et, sem
    // Radix portált nem használ, csak a fájlból parsolt szöveget rendereli
    // -- egy AppStateProvider-be ágyazás a betöltési képernyőt (Betöltés…)
    // renderelné a valódi tartalom helyett, findBy* nélkül.
    const { container } = render(<FeatureOverviewCard />);

    // Csak a szakaszcímek megléte és sorrendje számít -- a pontok szövege a
    // /update-features skill dolga, futásonként szabadon változhat.
    const headings = ['Páciensek', 'Kezelések és árak', 'Beállítások', 'DEMO'];
    const text = container.textContent ?? '';
    const indices = headings.map((cim) => text.indexOf(cim));

    expect(indices).not.toContain(-1);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it('a Páciensek szekció "### " alcímeit is megjeleníti, a szekción belül', () => {
    const { container } = render(<FeatureOverviewCard />);
    const text = container.textContent ?? '';

    const paciensek = text.indexOf('Páciensek');
    const kezelesekEsArak = text.indexOf('Kezelések és árak');
    const alcim = text.indexOf('Pácienskezelés');

    expect(alcim).toBeGreaterThan(paciensek);
    expect(alcim).toBeLessThan(kezelesekEsArak);
  });
});
