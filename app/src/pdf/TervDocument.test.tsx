// A csillag-kapcsoló egyetlen olyan tesztje, ami a hatást a
// nyomtatványig bizonyítja, nem csak a szerkesztő UI-ját (docs/01
// D15 és docs/03-funkcionalis-spec.md § Sor mezői ezt kifejezetten
// megköveteli). A sor itt SZÁNDÉKOSAN egyedi (tetelId: '',
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
      garanciaMd=""
      toothChartPng={null}
    />,
  );
}

describe('TervDocument -- backlog-4: kézzel bekapcsolt "becsült ár" csillag a nyomtatványon', () => {
  it('bekapcsolt csillag: "*" a sor neve után és lábjegyzet a táblázat alatt', () => {
    renderDoc(true);
    expect(screen.getByText('Csontpótló anyag *')).toBeInTheDocument();
    expect(
      screen.getByText(/A csillaggal jelölt tételek ára .* a kezelés során derül ki véglegesen/),
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

describe('TervDocument -- backlog-9: előleg-sor', () => {
  function renderEloleg(elolegSzazalek: number | null, savos = false, nyelv: Nyelv = 'hu') {
    const plan = buildPlan(savos, nyelv, { lista: 45000, tenyleges: 45000 });
    plan.elolegSzazalek = elolegSzazalek;
    return render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly
        nyilatkozatMd=""
        fizetesiFeltetelekMd="- A kezelési összeg {{elolegSzazalek}}%-a fizetendő a munka megkezdésekor."
        garanciaMd=""
        toothChartPng={null}
      />,
    );
  }

  it('kikapcsolva: nincs Előleg/Fennmaradó sor, a sablonszöveg az 50%-os alapértékre esik vissza', () => {
    renderEloleg(null);
    expect(screen.queryByText(/Előleg/)).not.toBeInTheDocument();
    expect(screen.queryByText('Fennmaradó rész')).not.toBeInTheDocument();
    // A mai, aláírt szöveggel szó szerint azonos mondat.
    expect(screen.getByText(/A kezelési összeg 50%-a fizetendő/)).toBeInTheDocument();
  });

  it('bekapcsolva: két új sor a Fizetendőből számolva, a sablonszöveg ugyanazt a százalékot mondja', () => {
    renderEloleg(50);
    expect(screen.getByText('Előleg (50%)')).toBeInTheDocument();
    expect(screen.getByText('Fennmaradó rész')).toBeInTheDocument();
    // 45 000 Ft fizetendő -> 22 500 / 22 500.
    expect(screen.getAllByText('22 500 Ft')).toHaveLength(2);
    expect(screen.getByText(/A kezelési összeg 50%-a fizetendő/)).toBeInTheDocument();
  });

  it('50-től eltérő százaléknál a nyomtatvány és a fizetési feltételek szövege nem mond ellent', () => {
    renderEloleg(30);
    expect(screen.getByText('Előleg (30%)')).toBeInTheDocument();
    expect(screen.getByText('13 500 Ft')).toBeInTheDocument(); // előleg
    expect(screen.getByText('31 500 Ft')).toBeInTheDocument(); // fennmaradó
    expect(screen.getByText(/A kezelési összeg 30%-a fizetendő/)).toBeInTheDocument();
  });

  it('becsült (savos) tétel esetén MINDKÉT új sor csillagot kap', () => {
    renderEloleg(50, true);
    expect(screen.getByText('Előleg (50%) *')).toBeInTheDocument();
    expect(screen.getByText('Fennmaradó rész *')).toBeInTheDocument();
    // Egy lábjegyzet fedi le a tételeket és a belőlük számolt összegeket is.
    expect(screen.getByText(/fizetendő, előleg, fennmaradó rész/)).toBeInTheDocument();
  });

  it('savos tétel NÉLKÜL nincs csillag az új sorokon', () => {
    renderEloleg(50, false);
    expect(screen.getByText('Előleg (50%)')).toBeInTheDocument();
    expect(screen.queryByText('Előleg (50%) *')).not.toBeInTheDocument();
  });

  it('német terv: az új sorok németül jelennek meg', () => {
    renderEloleg(50, false, 'de');
    expect(screen.getByText('Anzahlung (50%)')).toBeInTheDocument();
    expect(screen.getByText('Restbetrag')).toBeInTheDocument();
  });
});

describe('TervDocument -- backlog-16: terv-szintű "kerek végösszeg" kedvezmény', () => {
  function renderKerekVegosszeg(kedvezmenyOsszeg: number | null, elolegSzazalek: number | null = null) {
    // AZONOS_AR: nincs sorszintű eltérés -- a "Kezelések összesen" sor
    // megjelenése kizárólag a terv-szintű kedvezménynek tulajdonítható.
    const plan = buildPlan(false, 'hu', AZONOS_AR);
    plan.kedvezmenyOsszeg = kedvezmenyOsszeg;
    plan.elolegSzazalek = elolegSzazalek;
    return render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly
        nyilatkozatMd=""
        fizetesiFeltetelekMd=""
        garanciaMd=""
        toothChartPng={null}
      />,
    );
  }

  it('terv-szintű kedvezmény önmagában (sorszintű eltérés nélkül) is megnyitja a kétsoros összegzést', () => {
    renderKerekVegosszeg(5000);
    expect(screen.getByText('Kezelések összesen')).toBeInTheDocument();
    // A listaár (45 000 Ft) a soron, a fázisösszegzőn ÉS a referenciasoron is
    // megjelenik (a sorszintű ár változatlan, csak a terv-szintű Fizetendő
    // csökken) -- ezért getAllByText, a "Fizetendő" 40 000 Ft-ja viszont
    // egyedi, csak azon az egy soron jelenik meg.
    expect(screen.getAllByText('45 000 Ft').length).toBeGreaterThan(0);
    expect(screen.getByText('40 000 Ft')).toBeInTheDocument();
  });

  it('kedvezmény nélkül (null) a viselkedés változatlan', () => {
    renderKerekVegosszeg(null);
    expect(screen.queryByText('Kezelések összesen')).not.toBeInTheDocument();
    expect(screen.getAllByText('45 000 Ft').length).toBeGreaterThan(0);
  });

  it('az előleg a CSÖKKENTETT végösszegből számol', () => {
    renderKerekVegosszeg(5000, 50);
    // 40 000 Ft fizetendő -> 20 000 / 20 000, nem a 45 000-ből számolt 22 500.
    expect(screen.getAllByText('20 000 Ft')).toHaveLength(2);
  });
});

describe('TervDocument -- backlog-10: tétel-leírás a tételsor alatt', () => {
  function renderWithLeiras(leirasSnapshot: string, leirasokMutatasa?: boolean) {
    const plan = buildPlan(false, 'hu', AZONOS_AR);
    plan.fazisok[0].sorok[0].leirasSnapshot = leirasSnapshot;
    if (leirasokMutatasa !== undefined) plan.leirasokMutatasa = leirasokMutatasa;
    return render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly
        nyilatkozatMd=""
        fizetesiFeltetelekMd=""
        garanciaMd=""
        toothChartPng={null}
      />,
    );
  }

  it('többsoros leírás külön sorokként jelenik meg a tételsor alatt', () => {
    renderWithLeiras('Implantátum\nFelépítmény\nKorona');
    expect(screen.getByText('Implantátum')).toBeInTheDocument();
    expect(screen.getByText('Felépítmény')).toBeInTheDocument();
    expect(screen.getByText('Korona')).toBeInTheDocument();
  });

  it('leirasokMutatasa: false esetén semmi nem jelenik meg, akkor sem, ha van tartalom', () => {
    renderWithLeiras('Implantátum\nFelépítmény', false);
    expect(screen.queryByText('Implantátum')).not.toBeInTheDocument();
  });

  it('üres leírás nem jelenít meg semmit, a tételsor neve változatlanul renderelődik', () => {
    renderWithLeiras('');
    expect(screen.getByText('Csontpótló anyag')).toBeInTheDocument();
  });

  it('hiányzó (undefined) leirasSnapshot -- egy a mező bevezetése előtti sor -- nem dob hibát', () => {
    const plan = buildPlan(false, 'hu', AZONOS_AR); // a Sor literál nem állít leirasSnapshot-ot
    expect(() =>
      render(
        <TervDocument
          plan={plan}
          settings={seedSettings}
          priceList={seedPriceList}
          offerOnly
          nyilatkozatMd=""
          fizetesiFeltetelekMd=""
          garanciaMd=""
          toothChartPng={null}
        />,
      ),
    ).not.toThrow();
  });
});

describe('TervDocument -- backlog-13: garancia oldal', () => {
  function renderWithGarancia(
    opts: {
      nyelv?: Nyelv;
      offerOnly?: boolean;
      garanciaMd?: string;
      nyilatkozatMd?: string;
    } = {},
  ) {
    const {
      nyelv = 'hu',
      offerOnly = true,
      garanciaMd = '[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]',
      nyilatkozatMd = '',
    } = opts;
    const plan = buildPlan(false, nyelv, AZONOS_AR);
    return render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly={offerOnly}
        nyilatkozatMd={nyilatkozatMd}
        fizetesiFeltetelekMd=""
        garanciaMd={garanciaMd}
        toothChartPng={null}
      />,
    );
  }

  it('magyar terven a Garancia cím és a szöveg megjelenik', () => {
    renderWithGarancia({ garanciaMd: 'Fogpótlásra 3 év garancia.' });
    expect(screen.getByText('Garancia')).toBeInTheDocument();
    expect(screen.getByText('Fogpótlásra 3 év garancia.')).toBeInTheDocument();
  });

  it('német terven a cím és a szöveg is németül jelenik meg', () => {
    renderWithGarancia({ nyelv: 'de', garanciaMd: 'Garantie: 3 Jahre auf Zahnersatz.' });
    expect(screen.getByText('Garantie')).toBeInTheDocument();
    expect(screen.getByText('Garantie: 3 Jahre auf Zahnersatz.')).toBeInTheDocument();
  });

  // A tervdokumentum (docs/08-backlog.md korábbi 13. tétel) 3. döntése
  // ezt kifejezetten megköveteli: a Garancia -- a nyilatkozattal
  // ellentétben -- NEM esik a "csak ajánlat" kapcsoló alá.
  it('"csak ajánlat" (offerOnly) módban a Garancia oldal MARAD, a nyilatkozat és aláírás oldal eltűnik', () => {
    renderWithGarancia({ offerOnly: true, nyilatkozatMd: 'Nyilatkozat szövege.' });
    expect(screen.getByText('Garancia')).toBeInTheDocument();
    expect(screen.queryByText('Nyilatkozat')).not.toBeInTheDocument();
    expect(screen.queryByText('Nyilatkozat szövege.')).not.toBeInTheDocument();
  });

  it('teljes (nem "csak ajánlat") módban mindkét oldal jelen van', () => {
    renderWithGarancia({ offerOnly: false, nyilatkozatMd: 'Nyilatkozat szövege.' });
    expect(screen.getByText('Garancia')).toBeInTheDocument();
    expect(screen.getByText('Nyilatkozat')).toBeInTheDocument();
    expect(screen.getByText('Nyilatkozat szövege.')).toBeInTheDocument();
  });

  // A puszta szöveg-jelenlét nem bizonyítja a POZÍCIÓT (2. döntés: a
  // fizetési feltételek UTÁN, a nyilatkozat ELŐTT) -- egy az oldal
  // végére fűzött Garancia is átmenne a fenti tesztéken. A mock minden
  // <Page>-et data-mock-tag="page" <div>-re képez le (lásd a fájl tetején),
  // ez adja a tényleges renderelési sorrendet.
  it('a Garancia a harmadik oldal: a fizetési feltételek után, a nyilatkozat előtt', () => {
    const { container } = renderWithGarancia({
      offerOnly: false,
      nyilatkozatMd: 'Nyilatkozat szövege.',
    });
    const pages = container.querySelectorAll('[data-mock-tag="page"]');
    expect(pages).toHaveLength(4);
    expect(pages[2].textContent).toContain('Garancia');
    expect(pages[2].textContent).not.toContain('Nyilatkozat szövege.');
    expect(pages[3].textContent).toContain('Nyilatkozat');
  });

  it('"csak ajánlat" módban 3 oldal marad, a Garancia akkor is a harmadik', () => {
    const { container } = renderWithGarancia({ offerOnly: true });
    const pages = container.querySelectorAll('[data-mock-tag="page"]');
    expect(pages).toHaveLength(3);
    expect(pages[2].textContent).toContain('Garancia');
  });
});
