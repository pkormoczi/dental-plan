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
// `wrap` prop másképp React-hibát/figyelmeztetést adnának egy sima <div>-en.
//
// A `render` propot (dinamikus fejléc/cím, lásd TervDocument.tsx A/C blokk)
// a mock TÉNYLEGESEN meghívja, a `pageState`-tel -- a valódi react-pdf
// pagination szimulálása nélkül csak így tesztelhető, hogy egy adott
// (pageNumber, subPageNumber) kombinációra mi jelenne meg. `pageState`
// egy `vi.hoisted` mutálható objektum (a PreviewPage.pdfHiba.test.tsx
// mintája), mert a `vi.mock` factory a fájl tetejére hoistolódik.

import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankPlan, ELSO_FAZIS_NEV } from '../domain/blankPlan';
import type { Nyelv, Plan, Sor } from '../domain/types';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';

const pageState = vi.hoisted(() => ({
  pageNumber: 1,
  totalPages: 1,
  subPageNumber: 1,
  subPageTotalPages: 1,
}));

type RenderProp = (props: typeof pageState) => ReactNode;

vi.mock('@react-pdf/renderer', () => {
  const dom = (tag: string) =>
    function Mock({ children, render }: { children?: ReactNode; render?: RenderProp }) {
      return <div data-mock-tag={tag}>{render ? render(pageState) : children}</div>;
    };
  return {
    Document: dom('document'),
    Page: dom('page'),
    // A `minPresenceAhead` propot -- ellentétben a többi react-pdf-specifikus
    // proppal -- egy data-attribútumra képezzük le, hogy az árva-védelem
    // wrapperei (TervDocument.tsx) szerkezetileg tesztelhetők legyenek.
    View: ({ children, render, minPresenceAhead }: { children?: ReactNode; render?: RenderProp; minPresenceAhead?: number }) => (
      <div data-mock-tag="view" data-min-presence-ahead={minPresenceAhead}>
        {render ? render(pageState) : children}
      </div>
    ),
    Text: (props: { children?: ReactNode; render?: RenderProp }) => (
      <span>{props.render ? props.render(pageState) : props.children}</span>
    ),
    Image: () => null,
    Font: { register: () => {} },
  };
});

// A vi.mock hívás hoistolódik a fájl tetejére, tehát az itt importált
// TervDocument már a fenti mockot látja.
import { TervDocument } from './TervDocument';

// A `pageState` a fájl összes tesztje között megosztott, mutálható mock-
// állapot -- teszt előtt mindig alapállapotra (1/1/1/1) reset, hogy egy
// korábbi teszt oldalszám-módosítása ne szivárogjon át a következőbe.
beforeEach(() => {
  pageState.pageNumber = 1;
  pageState.totalPages = 1;
  pageState.subPageNumber = 1;
  pageState.subPageTotalPages = 1;
});

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
      tervCim=""
      toothChartPng={null}
    />,
  );
}

describe('TervDocument -- backlog-4: kézzel bekapcsolt "becsült ár" csillag a nyomtatványon', () => {
  it('bekapcsolt csillag: "*" az Egységár mellett (nem a névnél), lábjegyzet a táblázat alatt', () => {
    renderDoc(true);
    expect(screen.getByText('Csontpótló anyag')).toBeInTheDocument();
    expect(screen.queryByText('Csontpótló anyag *')).not.toBeInTheDocument();
    // A csillag az egységár-cella testvéreként áll, ugyanabban a cellában.
    const csillag = screen.getByText('*');
    expect(within(csillag.parentElement!).getByText('45 000 Ft')).toBeInTheDocument();
    expect(
      screen.getByText(/A csillaggal jelölt tételek ára és a belőlük számított összegek becsültek/),
    ).toBeInTheDocument();
  });

  it('kikapcsolt csillag: nincs "*" sehol, nincs lábjegyzet', () => {
    renderDoc(false);
    expect(screen.getByText('Csontpótló anyag')).toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();
    expect(screen.queryByText(/A csillaggal jelölt tételek ára/)).not.toBeInTheDocument();
  });

  it('német nyelvű tervnél a lábjegyzet is németül jelenik meg', () => {
    renderDoc(true, 'de');
    expect(screen.getByText('Csontpótló anyag')).toBeInTheDocument();
    expect(screen.getByText(/Der Preis der mit einem Sternchen markierten Leistungen/)).toBeInTheDocument();
  });
});

describe('TervDocument -- 78. tétel: üres Fog cella', () => {
  it('üres fogak mező esetén a Fog cella "—"-t mutat', () => {
    renderDoc(false);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('kitöltött fogak mező esetén a Fog cella a fogszámokat mutatja', () => {
    const plan = buildPlan(false, 'hu', AZONOS_AR);
    plan.fazisok[0].sorok[0].fogak = '16,17';
    render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly
        nyilatkozatMd=""
        fizetesiFeltetelekMd=""
        garanciaMd=""
        tervCim=""
        toothChartPng={null}
      />,
    );
    expect(screen.getByText('16, 17')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });
});

describe('TervDocument -- backlog-12: feltételes összegsor', () => {
  it('nincs eltérés: csak a "Végösszeg" sor jelenik meg, referenciasor nélkül', () => {
    renderDoc(false, 'hu', { lista: 45000, tenyleges: 45000 });
    expect(screen.getByText('Végösszeg')).toBeInTheDocument();
    expect(screen.queryByText('Kezelések összege')).not.toBeInTheDocument();
    // A 45 000 Ft pontosan egyszer szerepel az összegzésben (a fázistáblázat
    // sorösszege és egységára külön elemek) -- a lényeg, hogy a "Végösszeg"
    // fölött ne álljon ugyanaz a szám még egyszer.
  });

  // A tényleges ár a fázistáblázatban is szerepel (egységár + sorösszeg),
  // ezért arra getAllByText kell; a listaár viszont KIZÁRÓLAG az összegzés
  // referenciasorában jelenik meg -- ott a getByText egyetlen találata
  // önmagában bizonyítja, hogy a sor kirendereltetett.
  it('kedvezmény: mindkét sor megjelenik, a referenciaár a magasabb listaárral', () => {
    renderDoc(false, 'hu', { lista: 45000, tenyleges: 40000 });
    expect(screen.getByText('Kezelések összege')).toBeInTheDocument();
    expect(screen.getByText('Végösszeg')).toBeInTheDocument();
    expect(screen.getByText('45 000 Ft')).toBeInTheDocument();
    expect(screen.getAllByText('40 000 Ft').length).toBeGreaterThan(0);
  });

  it('felár: ugyanúgy mindkét sor megjelenik (az eltérés iránya nem számít)', () => {
    renderDoc(false, 'hu', { lista: 45000, tenyleges: 50000 });
    expect(screen.getByText('Kezelések összege')).toBeInTheDocument();
    expect(screen.getByText('Végösszeg')).toBeInTheDocument();
    expect(screen.getByText('45 000 Ft')).toBeInTheDocument();
    expect(screen.getAllByText('50 000 Ft').length).toBeGreaterThan(0);
  });

  it('német terv, eltérés nélkül: a "Behandlungen gesamt" sor is elmarad', () => {
    renderDoc(false, 'de', { lista: 45000, tenyleges: 45000 });
    expect(screen.getByText('Gesamtbetrag')).toBeInTheDocument();
    expect(screen.queryByText('Behandlungen gesamt')).not.toBeInTheDocument();
  });
});

describe('TervDocument -- 79. tétel: az Összesítés blokk saját címe', () => {
  it('magyar terven az "Összesítés" cím jelenik meg', () => {
    renderDoc(false, 'hu', { lista: 45000, tenyleges: 45000 });
    expect(screen.getByText('Összesítés')).toBeInTheDocument();
  });

  it('német terven a "Zusammenfassung" cím jelenik meg', () => {
    renderDoc(false, 'de', { lista: 45000, tenyleges: 45000 });
    expect(screen.getByText('Zusammenfassung')).toBeInTheDocument();
  });
});

// 52. tétel: a pénzösszeg ezres/tizedes elválasztója a terv NYELVÉTŐL
// függ (formatMoney/formatPrice), nem csak a pénznemétől -- egy német
// nyelvű, forintos terven a PDF-en is pont az elválasztó, nem szóköz.
describe('TervDocument -- 52. tétel: nyelvfüggő pénzformátum', () => {
  it('német nyelvű, HUF pénznemű terv: pont ezres elválasztó, nem szóköz', () => {
    renderDoc(false, 'de', { lista: 45000, tenyleges: 45000 });
    // A testing-library normalizálja a nem törhető szóközt (U+00A0) sima
    // szóközre -- a query-stringben ezért sima szóköz kell, ahogy a fájl
    // többi (HU) queryje is teszi. Az összeg a fázistáblázatban (egységár +
    // sorösszeg) ÉS a "Gesamtbetrag" végösszegben is megjelenik -- getAllByText,
    // nem getByText (ami az egyértelműséget várná el).
    expect(screen.getAllByText('45.000 Ft').length).toBeGreaterThan(0);
    expect(screen.queryByText('45 000 Ft')).not.toBeInTheDocument();
  });
});

describe('TervDocument -- backlog-9/D66: előleg-sor', () => {
  function renderEloleg(elolegOsszeg: number | null, savos = false, nyelv: Nyelv = 'hu') {
    const plan = buildPlan(savos, nyelv, { lista: 45000, tenyleges: 45000 });
    plan.elolegOsszeg = elolegOsszeg;
    return render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly
        nyilatkozatMd=""
        fizetesiFeltetelekMd="- Fogtechnikai munkát tartalmazó kezelés esetén {{eloleg}} fizetendő a munka megkezdésekor."
        garanciaMd=""
        tervCim=""
        toothChartPng={null}
      />,
    );
  }

  it('kikapcsolva: nincs Előleg/Fennmaradó sor, a sablonszöveg a "megállapított előleg" megfogalmazásra esik vissza', () => {
    renderEloleg(null);
    expect(screen.queryByText(/Előleg/)).not.toBeInTheDocument();
    expect(screen.queryByText('Fennmaradó rész')).not.toBeInTheDocument();
    expect(screen.getByText(/a megállapított előleg fizetendő/)).toBeInTheDocument();
  });

  it('bekapcsolva: két új sor a Végösszegből számolva, a sablonszöveg ugyanazt az összeget mondja', () => {
    renderEloleg(22500);
    expect(screen.getByText('Előleg')).toBeInTheDocument();
    expect(screen.getByText('Fennmaradó rész')).toBeInTheDocument();
    // 45 000 Ft fizetendő, 22 500 Ft előleg -> 22 500 Ft fennmaradó.
    expect(screen.getAllByText('22 500 Ft')).toHaveLength(2);
    expect(screen.getByText(/22 500 Ft előleg fizetendő/)).toBeInTheDocument();
  });

  it('eltérő összegnél a nyomtatvány és a fizetési feltételek szövege ugyanazt az összeget mondja', () => {
    renderEloleg(13500);
    expect(screen.getByText('Előleg')).toBeInTheDocument();
    expect(screen.getByText('13 500 Ft')).toBeInTheDocument(); // előleg
    expect(screen.getByText('31 500 Ft')).toBeInTheDocument(); // fennmaradó
    expect(screen.getByText(/13 500 Ft előleg fizetendő/)).toBeInTheDocument();
  });

  it('becsült (savos) tétel esetén MINDKÉT új sor csillagot kap', () => {
    renderEloleg(22500, true);
    expect(screen.getByText('Előleg *')).toBeInTheDocument();
    expect(screen.getByText('Fennmaradó rész *')).toBeInTheDocument();
    // Egy lábjegyzet fedi le a tételeket és a belőlük számolt összegeket is.
    expect(
      screen.getByText(/A csillaggal jelölt tételek ára és a belőlük számított összegek becsültek/),
    ).toBeInTheDocument();
  });

  it('savos tétel NÉLKÜL nincs csillag az új sorokon', () => {
    renderEloleg(22500, false);
    expect(screen.getByText('Előleg')).toBeInTheDocument();
    expect(screen.queryByText('Előleg *')).not.toBeInTheDocument();
  });

  it('német terv: az új sorok németül jelennek meg', () => {
    renderEloleg(22500, false, 'de');
    expect(screen.getByText('Anzahlung')).toBeInTheDocument();
    expect(screen.getByText('Restbetrag')).toBeInTheDocument();
  });

  it('az előleg meghaladja a fizetendőt: a fennmaradó rész "—", nem negatív szám', () => {
    renderEloleg(60000); // > 45 000 Ft fizetendő
    expect(screen.getByText('Előleg')).toBeInTheDocument();
    expect(screen.getByText('60 000 Ft')).toBeInTheDocument();
    // A "Fennmaradó rész" sor ÉRTÉKE a mellette (a Text-testvéreként) álló
    // "—" -- a fejléc "Cégjegyzékszám: —" is "—"-t rendereli, ezért a
    // fennmaradó rész szülőjén belül kell keresni, nem az egész dokumentumban.
    const fennmaradoLabel = screen.getByText('Fennmaradó rész');
    expect(within(fennmaradoLabel.parentElement!).getByText('—')).toBeInTheDocument();
  });
});

describe('TervDocument -- backlog-16: terv-szintű "kerek végösszeg" kedvezmény', () => {
  function renderKerekVegosszeg(kedvezmenyOsszeg: number | null, elolegOsszeg: number | null = null) {
    // AZONOS_AR: nincs sorszintű eltérés -- a "Kezelések összege" sor
    // megjelenése kizárólag a terv-szintű kedvezménynek tulajdonítható.
    const plan = buildPlan(false, 'hu', AZONOS_AR);
    plan.kedvezmenyOsszeg = kedvezmenyOsszeg;
    plan.elolegOsszeg = elolegOsszeg;
    return render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly
        nyilatkozatMd=""
        fizetesiFeltetelekMd=""
        garanciaMd=""
        tervCim=""
        toothChartPng={null}
      />,
    );
  }

  it('terv-szintű kedvezmény önmagában (sorszintű eltérés nélkül) is megnyitja a kétsoros összegzést', () => {
    renderKerekVegosszeg(5000);
    expect(screen.getByText('Kezelések összege')).toBeInTheDocument();
    // A listaár (45 000 Ft) a soron, a fázisösszegzőn ÉS a referenciasoron is
    // megjelenik (a sorszintű ár változatlan, csak a terv-szintű Végösszeg
    // csökken) -- ezért getAllByText, a "Végösszeg" 40 000 Ft-ja viszont
    // egyedi, csak azon az egy soron jelenik meg.
    expect(screen.getAllByText('45 000 Ft').length).toBeGreaterThan(0);
    expect(screen.getByText('40 000 Ft')).toBeInTheDocument();
  });

  it('kedvezmény nélkül (null) a viselkedés változatlan', () => {
    renderKerekVegosszeg(null);
    expect(screen.queryByText('Kezelések összege')).not.toBeInTheDocument();
    expect(screen.getAllByText('45 000 Ft').length).toBeGreaterThan(0);
  });

  it('a terv-szintű kedvezmény összege, aránya és a "kedvezmény" szó SOHA nem jelenik meg a nyomtatványon -- csak a két összeg', () => {
    // A kedvezmény jogilag csak a szerkesztő belső segédlete: a páciens által
    // aláírt dokumentumon egyedül a listaár-referencia és a fizetendő állhat.
    const { container } = renderKerekVegosszeg(5000);
    const szoveg = container.textContent ?? '';
    expect(szoveg).not.toMatch(/kedvezm/i);
    expect(szoveg).not.toMatch(/rabatt/i);
    expect(szoveg).not.toContain('5 000 Ft');
    expect(szoveg).not.toMatch(/[−-]\s?\d+\s?%/);
    expect(screen.getByText('40 000 Ft')).toBeInTheDocument();
  });

  it('a sor-szintű ár-eltérés (listaár > ajánlati ár) sem kap kedvezmény-jelvényt vagy százalékot a nyomtatványon', () => {
    const { container } = renderDoc(false, 'hu', { lista: 45000, tenyleges: 40000 });
    const szoveg = container.textContent ?? '';
    expect(szoveg).not.toMatch(/kedvezm/i);
    expect(szoveg).not.toMatch(/[−-]\s?\d+\s?%/);
    expect(szoveg).not.toContain('5 000 Ft');
    expect(screen.getByText('Kezelések összege')).toBeInTheDocument();
  });

  it('az előleg a CSÖKKENTETT végösszeghez képest dől el, hogy túllépi-e a határt', () => {
    renderKerekVegosszeg(5000, 20000);
    // 40 000 Ft fizetendő, 20 000 Ft előleg -> 20 000 Ft fennmaradó (nem a
    // 45 000-höz képest túllépő állapot).
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
        tervCim=""
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
          tervCim=""
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
      fizetesiFeltetelekMd?: string;
      garanciaMd?: string;
      nyilatkozatMd?: string;
    } = {},
  ) {
    const {
      nyelv = 'hu',
      offerOnly = true,
      fizetesiFeltetelekMd = '',
      garanciaMd = 'Fogpótlásra 3 év garancia.',
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
        fizetesiFeltetelekMd={fizetesiFeltetelekMd}
        garanciaMd={garanciaMd}
        tervCim=""
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

  // A Sablon-placeholder őr (docs/03-funkcionalis-spec.md § Sablon-
  // placeholder őr, D23) ezt kifejezetten megköveteli: a Garancia -- a
  // nyilatkozattal ellentétben -- NEM esik a "csak ajánlat" kapcsoló alá.
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

  // A puszta szöveg-jelenlét nem bizonyítja a POZÍCIÓT (a fizetési
  // feltételek UTÁN, a nyilatkozat ELŐTT) -- egy az oldal végére fűzött
  // Garancia is átmenne a fenti tesztéken. A mock minden <Page>-et
  // data-mock-tag="page" <div>-re képez le (lásd a fájl tetején); a
  // fizetési feltételek és a garancia EGY blokkban (a B blokk, a mai
  // 2. `<Page>`) van, a nyilatkozat egy külön, harmadik blokk.
  it('a Garancia a B blokkban van: a fizetési feltételek után, a nyilatkozat blokk előtt', () => {
    const { container } = renderWithGarancia({
      offerOnly: false,
      fizetesiFeltetelekMd: 'Fizetési feltételek szövege.',
      nyilatkozatMd: 'Nyilatkozat szövege.',
    });
    const pages = container.querySelectorAll('[data-mock-tag="page"]');
    expect(pages).toHaveLength(3);
    expect(pages[1].textContent).toContain('Garancia');
    expect(pages[1].textContent).not.toContain('Nyilatkozat szövege.');
    expect(pages[1].textContent!.indexOf('Fizetési feltételek')).toBeLessThan(
      pages[1].textContent!.indexOf('Garancia'),
    );
    expect(pages[2].textContent).toContain('Nyilatkozat');
  });

  it('"csak ajánlat" módban 2 blokk marad, a Garancia akkor is a másodikban', () => {
    const { container } = renderWithGarancia({ offerOnly: true });
    const pages = container.querySelectorAll('[data-mock-tag="page"]');
    expect(pages).toHaveLength(2);
    expect(pages[1].textContent).toContain('Garancia');
  });
});

// A hiányzó/placeholder-jelölésű fizetési feltételek/garancia szöveg a
// címével együtt kimarad a nyomtatványból -- a
// `TervDocument` a MÁR feloldott (HU-visszaesés utáni) szöveget kapja,
// tehát ez a saját nyelvi ÉS a "mindkét nyelven placeholder" esetet is
// lefedi, nem csak a cross-language HU-visszaesést (ami a PreviewPage.tsx
// betöltési logikájának hatásköre, itt nem tesztelt).
describe('TervDocument -- 81. tétel: hiányzó/placeholder szekció kihagyása', () => {
  function renderPlaceholder(fizetesiFeltetelekMd: string, garanciaMd: string) {
    const plan = buildPlan(false, 'hu', AZONOS_AR);
    return render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly
        nyilatkozatMd=""
        fizetesiFeltetelekMd={fizetesiFeltetelekMd}
        garanciaMd={garanciaMd}
        tervCim=""
        toothChartPng={null}
      />
    );
  }

  it('placeholder garancia mellett valódi fizetési feltételekkel: nincs Garancia cím, a fizetési feltételek megvan', () => {
    renderPlaceholder(
      'Fizetési feltételek szövege.',
      '[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]',
    );
    expect(screen.getByText('Fizetési feltételek')).toBeInTheDocument();
    expect(screen.getByText('Fizetési feltételek szövege.')).toBeInTheDocument();
    expect(screen.queryByText('Garancia')).not.toBeInTheDocument();
    expect(screen.queryByText(/PLACEHOLDER/)).not.toBeInTheDocument();
  });

  it('üres garancia szöveg ugyanúgy kihagyja a szekciót, mint a placeholder', () => {
    renderPlaceholder('Fizetési feltételek szövege.', '');
    expect(screen.queryByText('Garancia')).not.toBeInTheDocument();
  });

  it('placeholder fizetési feltételek mellett: nincs Fizetési feltételek cím, a Garancia megvan', () => {
    renderPlaceholder('[PLACEHOLDER -- még nincs kész]', 'Fogpótlásra 3 év garancia.');
    expect(screen.queryByText('Fizetési feltételek')).not.toBeInTheDocument();
    expect(screen.getByText('Garancia')).toBeInTheDocument();
  });

  it('mindkét szekció kimarad: a teljes B blokk (Page) nem kerül a dokumentumba', () => {
    const { container } = renderPlaceholder(
      '',
      '[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]',
    );
    const pages = container.querySelectorAll('[data-mock-tag="page"]');
    // A blokk (terv és ár) + a C blokk (offerOnly esetén kimarad) -- csak az
    // A blokk marad, a B blokk teljesen hiányzik.
    expect(pages).toHaveLength(1);
    expect(screen.queryByText('Fizetési feltételek')).not.toBeInTheDocument();
    expect(screen.queryByText('Garancia')).not.toBeInTheDocument();
  });
});

describe('TervDocument -- 76. tétel: kompakt fejléc és folytatólagos cím', () => {
  function renderPlan(offerOnly = false) {
    const plan = buildPlan(false, 'hu', AZONOS_AR);
    plan.paciens.nev = 'Teszt Páciens';
    return render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly={offerOnly}
        nyilatkozatMd="Nyilatkozat szövege."
        fizetesiFeltetelekMd=""
        garanciaMd=""
        tervCim=""
        toothChartPng={null}
      />,
    );
  }

  // A B és C blokk MiniHeaderje a mockban FÜGGETLENÜL a `pageState`-től
  // mindig megjelenik (a valódi react-pdf-ben ezek külön `<Page>`
  // elemek, saját pagination-nel) -- ezért az A blokk fejlécének
  // ellenőrzését az első `page` div-re kell szűkíteni, különben a B/C
  // blokk saját, feltétel nélküli minifejléce ál-pozitív/ál-negatív
  // találatot adna.
  it('az A blokk első fizikai oldalán a nagy fejléc látszik, a kompakt fejléc nem', () => {
    pageState.pageNumber = 1;
    const { container } = renderPlan();
    const aBlokk = container.querySelectorAll<HTMLElement>('[data-mock-tag="page"]')[0];
    expect(within(aBlokk).getByText(seedSettings.rendelo.cim)).toBeInTheDocument();
    expect(within(aBlokk).queryByText('Kezelési terv · Teszt Páciens')).not.toBeInTheDocument();
  });

  it('az A blokk folytatólagos fizikai oldalán a kompakt fejléc jelenik meg', () => {
    pageState.pageNumber = 2;
    const { container } = renderPlan();
    const aBlokk = container.querySelectorAll<HTMLElement>('[data-mock-tag="page"]')[0];
    expect(within(aBlokk).getByText('Kezelési terv · Teszt Páciens')).toBeInTheDocument();
  });

  it('a Nyilatkozat első fizikai oldalán a sima cím áll', () => {
    pageState.subPageNumber = 1;
    renderPlan();
    expect(screen.getByText('Nyilatkozat')).toBeInTheDocument();
    expect(screen.queryByText('Nyilatkozat – folytatás')).not.toBeInTheDocument();
  });

  it('a Nyilatkozat folytatólagos fizikai oldalán a "– folytatás" cím áll', () => {
    pageState.subPageNumber = 2;
    renderPlan();
    expect(screen.getByText('Nyilatkozat – folytatás')).toBeInTheDocument();
    expect(screen.queryByText('Nyilatkozat')).not.toBeInTheDocument();
  });

  it('német terven a folytatólagos cím is németül jelenik meg', () => {
    pageState.subPageNumber = 2;
    const plan = buildPlan(false, 'de', AZONOS_AR);
    render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly={false}
        nyilatkozatMd="Erklärungstext."
        fizetesiFeltetelekMd=""
        garanciaMd=""
        tervCim=""
        toothChartPng={null}
      />,
    );
    expect(screen.getByText('Erklärung – Fortsetzung')).toBeInTheDocument();
  });
});

describe('TervDocument -- 82. tétel: nyilatkozat árva-védelem', () => {
  it('a nyilatkozat utolsó bekezdése az aláírásblokkal együtt árva-védett wrapperben van, a korábbiak nem', () => {
    const plan = buildPlan(false, 'hu', AZONOS_AR);
    const { container } = render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly={false}
        nyilatkozatMd={'Első bekezdés.\n\nMásodik, utolsó bekezdés.'}
        fizetesiFeltetelekMd=""
        garanciaMd=""
        tervCim=""
        toothChartPng={null}
      />,
    );
    const cBlokk = container.querySelectorAll<HTMLElement>('[data-mock-tag="page"]')[1];
    const elso = within(cBlokk).getByText('Első bekezdés.');
    const utolso = within(cBlokk).getByText('Második, utolsó bekezdés.');
    expect(elso.closest('[data-min-presence-ahead]')).toBeNull();
    expect(utolso.closest('[data-min-presence-ahead]')).not.toBeNull();
  });
});

describe('TervDocument -- 77. tétel: cím + páciensadatok + fogtérkép', () => {
  function renderElsoBlokk(opts: {
    tervCim?: string;
    taj?: string;
    fogak?: string;
    toothChartPng?: string | null;
  } = {}) {
    const { tervCim = '', taj = '1234567890', fogak = '', toothChartPng = null } = opts;
    const plan = buildPlan(false, 'hu', AZONOS_AR);
    plan.paciens.nev = 'Teszt Páciens';
    plan.paciens.szuletesiIdo = '1990-01-01';
    plan.paciens.lakcim = '1114 Budapest, Móricz Zsigmond körtér 1.';
    plan.paciens.telefon = '+36 30 123 4567';
    plan.paciens.email = 'teszt@pelda.hu';
    plan.paciens.taj = taj;
    plan.fazisok[0].sorok[0].fogak = fogak;
    const { container } = render(
      <TervDocument
        plan={plan}
        settings={seedSettings}
        priceList={seedPriceList}
        offerOnly
        nyilatkozatMd=""
        fizetesiFeltetelekMd=""
        garanciaMd=""
        tervCim={tervCim}
        toothChartPng={toothChartPng}
      />,
    );
    return container.querySelectorAll<HTMLElement>('[data-mock-tag="page"]')[0];
  }

  it('a terv címe megjelenik az 1. blokkban', () => {
    const aBlokk = renderElsoBlokk({ tervCim: 'Fogpótlás terve' });
    expect(within(aBlokk).getByText('Fogpótlás terve')).toBeInTheDocument();
  });

  it('üres TAJ esetén a TAJ sor teljesen kimarad, a bal oszlop többi mezője megjelenik', () => {
    const aBlokk = renderElsoBlokk({ taj: '' });
    expect(within(aBlokk).queryByText('TAJ')).not.toBeInTheDocument();
    expect(within(aBlokk).getByText('Név')).toBeInTheDocument();
    expect(within(aBlokk).getByText('Született')).toBeInTheDocument();
    expect(within(aBlokk).getByText('Lakcím')).toBeInTheDocument();
  });

  it('a páciensmezők a bal, majd a jobb oszlop sorrendjében jelennek meg', () => {
    const aBlokk = renderElsoBlokk();
    const text = aBlokk.textContent!;
    const idx = (label: string) => text.indexOf(label);
    expect(idx('Név')).toBeLessThan(idx('Született'));
    expect(idx('Született')).toBeLessThan(idx('TAJ'));
    expect(idx('TAJ')).toBeLessThan(idx('Lakcím'));
    expect(idx('Lakcím')).toBeLessThan(idx('Telefon'));
    expect(idx('Telefon')).toBeLessThan(idx('E-mail'));
  });

  it('a fogtérkép a páciensadatok után, az első fázis címe előtt jelenik meg', () => {
    const aBlokk = renderElsoBlokk({ fogak: '11', toothChartPng: 'data:image/png;base64,xx' });
    const text = aBlokk.textContent!;
    expect(text.indexOf('Lakcím')).toBeLessThan(text.indexOf('Érintett fogak'));
    expect(text.indexOf('Érintett fogak')).toBeLessThan(text.indexOf(ELSO_FAZIS_NEV));
  });

  it('nincs fogszám a tervben: a fogtérkép-blokk kimarad', () => {
    const aBlokk = renderElsoBlokk({ fogak: '', toothChartPng: 'data:image/png;base64,xx' });
    expect(within(aBlokk).queryByText('Érintett fogak')).not.toBeInTheDocument();
  });

  it('az összesítés az utolsó fázis után áll, teljes szélességben', () => {
    const aBlokk = renderElsoBlokk();
    const text = aBlokk.textContent!;
    expect(text.indexOf(ELSO_FAZIS_NEV)).toBeLessThan(text.indexOf('Végösszeg'));
  });
});
