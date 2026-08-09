// A csillag-kapcsoló (backlog-4) egyetlen olyan tesztje, ami a hatást a
// nyomtatványig bizonyítja, nem csak a szerkesztő UI-ját (a döntési
// összefoglaló -- docs/backlog-4-becsult-ar-kapcsolo-terv.md -- 6. döntése
// ezt kifejezetten megköveteli). A sor itt SZÁNDÉKOSAN egyedi (tetelId: '',
// nem árlistai SAVOS eredetű) -- ez igazolja, hogy a csillag a `Sor.savos`
// mezőt olvassa, nem az árlistai ártípust.
//
// A @react-pdf/renderer primitíveket (Document/Page/View/Text/Image) nem
// lehet közvetlenül ReactDOM-mal renderelni -- a könyvtár saját, PDF-célú
// react-reconcilerét várják (lásd App.test.tsx/PreviewPage.test.tsx, amik
// helyette csak a `usePDF` hookot mockolják). Itt viszont közvetlenül a
// `TervDocument` komponenst rendereljük, ezért a react-pdf primitíveket
// egyszerű DOM-elemekre képezzük le, minden propot eldobva a `children`
// kivételével -- a `style` tömb-alak és a react-pdf-specifikus
// `render`/`fixed`/`wrap` propok másképp React-hibát/figyelmeztetést
// adnának egy sima <div>-en.

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createBlankPlan } from '../domain/blankPlan';
import type { Nyelv, Plan, Sor } from '../domain/types';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';

vi.mock('@react-pdf/renderer', () => {
  const dom = (tag: string) =>
    function Mock({ children }: { children?: ReactNode }) {
      return <div data-mock-tag={tag}>{children}</div>;
    };
  return {
    Document: dom('document'),
    Page: dom('page'),
    View: dom('view'),
    Text: (props: { children?: ReactNode }) => <span>{props.children}</span>,
    Image: () => null,
    Font: { register: () => {} },
  };
});

// A vi.mock hívás hoistolódik a fájl tetejére, tehát az itt importált
// TervDocument már a fenti mockot látja.
import { TervDocument } from './TervDocument';

interface Arak {
  lista: number;
  tenyleges: number;
}

const AZONOS_AR: Arak = { lista: 45000, tenyleges: 45000 };

function buildPlan(savos: boolean, nyelv: Nyelv = 'hu', arak: Arak = AZONOS_AR): Plan {
  const plan = createBlankPlan(seedSettings, seedPriceList);
  plan.nyelv = nyelv;
  const sor: Sor = {
    tetelId: '',
    nevSnapshot: 'Csontpótló anyag',
    savos,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: arak.lista,
    tenylegesEgysegar: arak.tenyleges,
  };
  plan.fazisok[0].sorok.push(sor);
  return plan;
}

function renderDoc(savos: boolean, nyelv: Nyelv = 'hu', arak: Arak = AZONOS_AR) {
  return render(
    <TervDocument
      plan={buildPlan(savos, nyelv, arak)}
      settings={seedSettings}
      priceList={seedPriceList}
      offerOnly
      nyilatkozatMd=""
      fizetesiFeltetelekMd=""
      toothChartPng={null}
    />,
  );
}

describe('TervDocument -- backlog-4: kézzel bekapcsolt "becsült ár" csillag a nyomtatványon', () => {
  it('bekapcsolt csillag: "*" a sor neve után és lábjegyzet a táblázat alatt', () => {
    renderDoc(true);
    expect(screen.getByText('Csontpótló anyag *')).toBeInTheDocument();
    expect(
      screen.getByText(/A csillaggal jelölt tételek ára a kezelés során derül ki véglegesen/),
    ).toBeInTheDocument();
  });

  it('kikapcsolt csillag: nincs "*" a névnél, nincs lábjegyzet', () => {
    renderDoc(false);
    expect(screen.getByText('Csontpótló anyag')).toBeInTheDocument();
    expect(screen.queryByText('Csontpótló anyag *')).not.toBeInTheDocument();
    expect(screen.queryByText(/A csillaggal jelölt tételek ára/)).not.toBeInTheDocument();
  });

  it('német nyelvű tervnél a lábjegyzet is németül jelenik meg', () => {
    renderDoc(true, 'de');
    expect(screen.getByText('Csontpótló anyag *')).toBeInTheDocument();
    expect(screen.getByText(/mit einem Sternchen markierten Leistungen/)).toBeInTheDocument();
  });
});

describe('TervDocument -- backlog-12: feltételes összegsor', () => {
  it('nincs eltérés: csak a "Fizetendő" sor jelenik meg, referenciasor nélkül', () => {
    renderDoc(false, 'hu', { lista: 45000, tenyleges: 45000 });
    expect(screen.getByText('Fizetendő')).toBeInTheDocument();
    expect(screen.queryByText('Kezelések összesen')).not.toBeInTheDocument();
    // A 45 000 Ft pontosan egyszer szerepel az összegzésben (a fázistáblázat
    // sorösszege és egységára külön elemek) -- a lényeg, hogy a "Fizetendő"
    // fölött ne álljon ugyanaz a szám még egyszer.
  });

  // A tényleges ár a fázistáblázatban is szerepel (egységár + sorösszeg),
  // ezért arra getAllByText kell; a listaár viszont KIZÁRÓLAG az összegzés
  // referenciasorában jelenik meg -- ott a getByText egyetlen találata
  // önmagában bizonyítja, hogy a sor kirendereltetett.
  it('kedvezmény: mindkét sor megjelenik, a referenciaár a magasabb listaárral', () => {
    renderDoc(false, 'hu', { lista: 45000, tenyleges: 40000 });
    expect(screen.getByText('Kezelések összesen')).toBeInTheDocument();
    expect(screen.getByText('Fizetendő')).toBeInTheDocument();
    expect(screen.getByText('45 000 Ft')).toBeInTheDocument();
    expect(screen.getAllByText('40 000 Ft').length).toBeGreaterThan(0);
  });

  it('felár: ugyanúgy mindkét sor megjelenik (az eltérés iránya nem számít)', () => {
    renderDoc(false, 'hu', { lista: 45000, tenyleges: 50000 });
    expect(screen.getByText('Kezelések összesen')).toBeInTheDocument();
    expect(screen.getByText('Fizetendő')).toBeInTheDocument();
    expect(screen.getByText('45 000 Ft')).toBeInTheDocument();
    expect(screen.getAllByText('50 000 Ft').length).toBeGreaterThan(0);
  });

  it('német terv, eltérés nélkül: a "Behandlungen gesamt" sor is elmarad', () => {
    renderDoc(false, 'de', { lista: 45000, tenyleges: 45000 });
    expect(screen.getByText('Zu zahlen')).toBeInTheDocument();
    expect(screen.queryByText('Behandlungen gesamt')).not.toBeInTheDocument();
  });
});
