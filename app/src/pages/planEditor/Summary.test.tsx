// A `Summary` ("Mindösszesen") blokk izolált komponensteszte -- a
// `tervReszletei/PenzugyiOsszesites.test.tsx` mintáján: a komponens tisztán
// prezentációs (nincs storage-/router-függősége), ezért önállóan
// renderelhető `<Theme>` alatt, primitív propokkal.

import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it } from 'vitest';
import Summary from './Summary';

describe('Summary', () => {
  it('kedvezmény/felár nélkül csak a végösszeget mutatja', () => {
    render(
      <Theme>
        <Summary grand={25000} kedvezmeny={0} felar={0} fazisOsszegek={[]} currency="HUF" nyelv="hu" />
      </Theme>,
    );

    expect(screen.getByText('25 000 Ft')).toBeInTheDocument();
    expect(screen.queryByText(/Kedvezmény:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Felár:/)).not.toBeInTheDocument();
  });

  it('csak kedvezmény esetén egyetlen "Kedvezmény" sort mutat -- csak a szerkesztőben, a nyomtatványon nem', () => {
    render(
      <Theme>
        <Summary grand={20000} kedvezmeny={5000} felar={0} fazisOsszegek={[]} currency="HUF" nyelv="hu" />
      </Theme>,
    );

    expect(screen.getByText('20 000 Ft')).toBeInTheDocument();
    expect(screen.getByText(/Kedvezmény: 5 000 Ft/)).toBeInTheDocument();
    expect(screen.queryByText(/Felár:/)).not.toBeInTheDocument();
  });

  it('csak felár esetén egyetlen "Eltérés a listaártól" sort mutat', () => {
    render(
      <Theme>
        <Summary grand={30000} kedvezmeny={0} felar={5000} fazisOsszegek={[]} currency="HUF" nyelv="hu" />
      </Theme>,
    );

    expect(screen.getByText('30 000 Ft')).toBeInTheDocument();
    expect(screen.getByText(/Eltérés a listaártól: \+5 000 Ft/)).toBeInTheDocument();
    expect(screen.queryByText(/Kedvezmény:/)).not.toBeInTheDocument();
    // A „felár" szó félreérthető -- a semleges megfogalmazás váltotta ki.
    expect(screen.queryByText(/Felár:/)).not.toBeInTheDocument();
  });

  it('mindkét irányú eltérés esetén a kedvezmény és a felár KÜLÖN sorban áll, nem nettózva', () => {
    render(
      <Theme>
        <Summary grand={272000} kedvezmeny={23000} felar={27000} fazisOsszegek={[]} currency="HUF" nyelv="hu" />
      </Theme>,
    );

    expect(screen.getByText(/Kedvezmény: 23 000 Ft/)).toBeInTheDocument();
    expect(screen.getByText(/Eltérés a listaártól: \+27 000 Ft/)).toBeInTheDocument();
    expect(screen.queryByText(/4 000 Ft/)).not.toBeInTheDocument();
  });

  it('fázis-részösszegeket a Mindösszesen FÖLÖTT sorolja fel, névvel és összeggel', () => {
    render(
      <Theme>
        <Summary
          grand={30000}
          kedvezmeny={0}
          felar={0}
          fazisOsszegek={[
            { nev: '1. fázis', osszeg: 12000 },
            { nev: 'Fogpótlás', osszeg: 18000 },
          ]}
          currency="HUF"
          nyelv="hu"
        />
      </Theme>,
    );

    expect(screen.getByText('1. fázis')).toBeInTheDocument();
    expect(screen.getByText('12 000 Ft')).toBeInTheDocument();
    expect(screen.getByText('Fogpótlás')).toBeInTheDocument();
    expect(screen.getByText('18 000 Ft')).toBeInTheDocument();

    const szoveg = document.body.textContent ?? '';
    expect(szoveg.indexOf('1. fázis')).toBeLessThan(szoveg.indexOf('Mindösszesen'));
  });

  it('üres fázislistánál egyetlen részösszeg-sor sincs -- a Mindösszesen áll magában', () => {
    render(
      <Theme>
        <Summary grand={30000} kedvezmeny={0} felar={0} fazisOsszegek={[]} currency="HUF" nyelv="hu" />
      </Theme>,
    );

    expect(screen.getByText('Mindösszesen')).toBeInTheDocument();
    expect(screen.getAllByText('30 000 Ft')).toHaveLength(1);
  });

  it('a pénzösszegek a terv nyelvét/pénznemét követik (52. tétel)', () => {
    render(
      <Theme>
        <Summary grand={2500} kedvezmeny={0} felar={0} fazisOsszegek={[]} currency="EUR" nyelv="de" />
      </Theme>,
    );

    // de nyelv + EUR: ezres/tizedes elválasztó és pénznemjel a
    // `formatMoney()`-t követi, nem `toLocaleString()`-özött ad-hoc formázás.
    expect(screen.getByText('25,00 €')).toBeInTheDocument();
  });
});
