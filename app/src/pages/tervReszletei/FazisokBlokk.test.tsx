// A Terv részletei nézet fázisok/kezelési sorok blokkjának tesztje -- lásd
// docs/03-funkcionalis-spec.md § 11. "Terv részletei (véglegesített
// verzió)". A komponens tisztán prezentációs (nincs storage-/router-
// függősége), ezért önállóan renderelhető `<Theme>` alatt, a
// `TervReszleteiPage.test.tsx` `makePlan()` mintáján épített fixtúrákkal.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FazisokBlokk from './FazisokBlokk';
import { sorElemId } from './SorReszlet';
import { t } from '../../design/tokens';
import type { Fazis, Plan, PriceList, Sor } from '../../domain/types';

function makeSor(overrides: Partial<Sor> = {}): Sor {
  return {
    tetelId: 't001',
    nevSnapshot: 'Tömés',
    savos: false,
    fogak: '11, 12',
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

function makePlan(fazisok: Fazis[]): Plan {
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
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

// Üres árlista is elég -- `buildToothVisualStates` a fog->sor
// visszahivatkozást a sor `fogak` mezőjéből építi, a `tetelId` egy
// hiányzó tételre `ISMERETLEN_KATEGORIA`-ra esik vissza, de a fog
// továbbra is a `fogak` Map-be kerül (lásd domain/toothVisual.ts).
function makePriceList(): PriceList {
  return { schemaVersion: 1, arlistaVerzio: '2026-01-01', modositva: '2026-01-01', kategoriak: [], tetelek: [] };
}

function renderFazisok(fazisok: Fazis[]) {
  const plan = makePlan(fazisok);
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <FazisokBlokk plan={plan} priceList={makePriceList()} />
    </Theme>,
  );
}

describe('FazisokBlokk', () => {
  it('minden fázis alapból nyitva', () => {
    renderFazisok([makeFazis()]);
    const trigger = screen.getByRole('button', { name: 'Fázis összecsukása' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Tömés')).toBeInTheDocument();
  });

  it('összecsukás után a sorok eltűnnek, a fejléc N tétel · összeget mutat', async () => {
    const user = userEvent.setup();
    renderFazisok([
      makeFazis({ sorok: [makeSor({ nevSnapshot: 'Tömés' }), makeSor({ nevSnapshot: 'Korona' })] }),
    ]);
    expect(screen.getByText('2 tétel · 20 000 Ft')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fázis összecsukása' }));
    expect(screen.queryByText('Tömés')).not.toBeInTheDocument();
    expect(screen.getByText('2 tétel · 20 000 Ft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fázis kinyitása' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('a leírás-nyitottság túléli a fázis összecsukását/kinyitását', async () => {
    const user = userEvent.setup();
    renderFazisok([makeFazis({ sorok: [makeSor({ leirasSnapshot: 'Részletes leírás' })] })]);

    await user.click(screen.getByRole('button', { name: 'Leírás' }));
    expect(screen.getByText('Részletes leírás')).toBeInTheDocument();

    const fazisToggle = screen.getByRole('button', { name: 'Fázis összecsukása' });
    await user.click(fazisToggle);
    expect(screen.queryByText('Részletes leírás')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fázis kinyitása' }));
    expect(screen.getByText('Részletes leírás')).toBeInTheDocument();
  });

  it('kibontott leírásnál a sor saját alsó elválasztója eltűnik, hogy a két sor egy blokknak tűnjön', async () => {
    const user = userEvent.setup();
    renderFazisok([makeFazis({ sorok: [makeSor({ nevSnapshot: 'Tömés', leirasSnapshot: 'Részletes leírás' })] })]);

    const sorTr = screen.getByText('Tömés').closest('tr')!;
    expect(sorTr.style.getPropertyValue('--table-row-box-shadow')).toBe('');

    await user.click(screen.getByRole('button', { name: 'Leírás' }));
    expect(sorTr.style.getPropertyValue('--table-row-box-shadow')).toBe('none');

    await user.click(screen.getByRole('button', { name: 'Leírás' }));
    expect(sorTr.style.getPropertyValue('--table-row-box-shadow')).toBe('');
  });

  it('egyező listaár/ajánlati ár esetén egy árat mutat, eltérésnél mindkettőt, az ajánlati elsődleges', () => {
    renderFazisok([
      makeFazis({
        sorok: [
          makeSor({
            nevSnapshot: 'Egyező árú',
            listaEgysegar: 10000,
            tenylegesEgysegar: 10000,
            mennyiseg: 2,
          }),
          makeSor({
            nevSnapshot: 'Eltérő árú',
            listaEgysegar: 15000,
            tenylegesEgysegar: 12000,
            mennyiseg: 2,
          }),
        ],
      }),
    ]);

    const egyezoRow = screen.getByText('Egyező árú').closest('tr')!;
    expect(within(egyezoRow).getAllByText('10 000 Ft')).toHaveLength(1);

    const elteroRow = screen.getByText('Eltérő árú').closest('tr')!;
    expect(within(elteroRow).getByText('12 000 Ft')).toBeInTheDocument();
    expect(within(elteroRow).getByText('15 000 Ft')).toBeInTheDocument();
    expect(within(elteroRow).getByText('24 000 Ft')).toBeInTheDocument();
  });

  it('üres fogak mezőnél „—” látszik', () => {
    renderFazisok([makeFazis({ sorok: [makeSor({ fogak: '' })] })]);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('a darabszám mindig ×N alakban jelenik meg, N=1-nél is', () => {
    renderFazisok([makeFazis({ sorok: [makeSor({ mennyiseg: 1 })] })]);
    expect(screen.getByText('×1')).toBeInTheDocument();
  });

  it('minden sor gyökéreleme egyedi, sorElemId szerinti DOM id-t kap', () => {
    renderFazisok([
      makeFazis({
        sorok: [makeSor({ nevSnapshot: 'Első' }), makeSor({ nevSnapshot: 'Második' })],
      }),
    ]);
    expect(document.getElementById(sorElemId(0, 0))).toHaveTextContent('Első');
    expect(document.getElementById(sorElemId(0, 1))).toHaveTextContent('Második');
  });

  it('savos:true sorhoz „Becsült ár” jelvény jár, savos:false-hoz nem', () => {
    renderFazisok([
      makeFazis({
        sorok: [
          makeSor({ nevSnapshot: 'Becsült', savos: true }),
          makeSor({ nevSnapshot: 'Fix árú', savos: false }),
        ],
      }),
    ]);
    const becsultRow = screen.getByText('Becsült').closest('tr')!;
    expect(within(becsultRow).getByText('Becsült ár')).toBeInTheDocument();
    const fixRow = screen.getByText('Fix árú').closest('tr')!;
    expect(within(fixRow).queryByText('Becsült ár')).not.toBeInTheDocument();
  });

  it('a fázismegjegyzés nyitva látszik, csukva jelvény jelzi', async () => {
    const user = userEvent.setup();
    renderFazisok([makeFazis({ megjegyzes: 'Teszt megjegyzés' })]);
    expect(screen.getByText('Megjegyzés: Teszt megjegyzés')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fázis összecsukása' }));
    expect(screen.queryByText('Megjegyzés: Teszt megjegyzés')).not.toBeInTheDocument();
    expect(screen.getByText('Megjegyzés')).toBeInTheDocument();
  });

  it('3 fázisnál nincs fázis-ugró Select, 4 fázisnál van', () => {
    const harom = [makeFazis(), makeFazis({ sorszam: 2 }), makeFazis({ sorszam: 3 })];
    const { unmount } = renderFazisok(harom);
    expect(screen.queryByRole('combobox', { name: 'Ugrás fázisra' })).not.toBeInTheDocument();
    unmount();

    const negy = [...harom, makeFazis({ sorszam: 4 })];
    renderFazisok(negy);
    expect(screen.getByRole('combobox', { name: 'Ugrás fázisra' })).toBeInTheDocument();
  });

  it('ugrás egy csukott fázisra kinyitja és a chevron gombra fókuszál', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    const fazisok = [
      makeFazis({ megnevezes: 'Első fázis', sorszam: 1 }),
      makeFazis({ megnevezes: 'Második fázis', sorszam: 2 }),
      makeFazis({ megnevezes: 'Harmadik fázis', sorszam: 3 }),
      makeFazis({ megnevezes: 'Negyedik fázis', sorszam: 4 }),
    ];
    renderFazisok(fazisok);

    // jsdom nem ad valódi layoutot -- a `getBoundingClientRect()` mindenhol
    // 0-t ad, ezért a scrollspy csatolásakor rögtön az UTOLSÓ fázisra áll
    // (lásd FazisokBlokk.tsx scrollspy-effektje: "top <= küszöb" minden
    // fázisra igaz, a ciklus a legutolsóval zár). Emiatt az 1. (nem az
    // utolsó) fázisra ugrunk -- ez garantáltan ELTÉR az induló `aktivFazis`-
    // tól, tehát a Select `onValueChange`-je biztosan tüzel.
    const toggles = screen.getAllByRole('button', { name: 'Fázis összecsukása' });
    await user.click(toggles[0]);
    expect(screen.getByRole('button', { name: 'Fázis kinyitása' })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Ugrás fázisra' }));
    await user.click(await screen.findByRole('option', { name: '1. Első fázis' }));

    expect(scrollSpy).toHaveBeenCalled();
    const elsoToggle = document.getElementById('fazis-reszlet-toggle-0')!;
    await waitFor(() => expect(elsoToggle).toHaveAttribute('aria-expanded', 'true'));
    // `ugras()` a fókuszt egy MÁSODIK, beágyazott requestAnimationFrame-ben
    // állítja be (a scrollIntoView UTÁN) -- az `aria-expanded` szinkron
    // state-frissítésből jön, tehát a fenti waitFor ezt jóval a fókusz
    // előtt teljesítheti. Egy szinkron activeElement-ellenőrzés emiatt
    // versenyhelyzetes (CI-n el is bukott) -- ez is waitFor-t kap.
    await waitFor(() => expect(document.activeElement).toBe(elsoToggle));
  });

  it('0 fázisnál üres-állapot szöveg jelenik meg', () => {
    renderFazisok([]);
    expect(screen.getByText('Ez a verzió nem tartalmaz kezelési fázist.')).toBeInTheDocument();
  });

  it('a gyökér `fazisok-blokk` osztálya megvan -- ez a CSS-horgony a kártya overflow-jának feloldásához (index.css), hogy a sticky elemek a lapgörgetéshez, ne a kártyához tapadjanak', () => {
    const { container } = renderFazisok([makeFazis()]);
    expect(container.querySelector('.fazisok-blokk')).toBeInTheDocument();
  });
});

// 74. tétel: a `domain/sorElteres.ts` classifier semleges (gray) jelvénye a
// lezárt terven -- NEM a szerkesztő zöld/amber jelvénye (PlanEditorPage.test.tsx
// fedi azt).
describe('FazisokBlokk -- sor-szintű ár-eltérés jelvény (74. tétel)', () => {
  it('felárazott sor semleges "+N%" jelvényt kap', () => {
    renderFazisok([
      makeFazis({ sorok: [makeSor({ listaEgysegar: 10000, tenylegesEgysegar: 12000 })] }),
    ]);
    expect(screen.getByText('+20%')).toBeInTheDocument();
  });

  it('0 listaár mellett pozitív ajánlati ár "Felár" jelvényt kap, százalék nélkül', () => {
    renderFazisok([makeFazis({ sorok: [makeSor({ listaEgysegar: 0, tenylegesEgysegar: 15000 })] })]);
    expect(screen.getByText('Felár')).toBeInTheDocument();
  });

  it('0 ajánlati ár pozitív listaár mellett −100% jelvényt kap', () => {
    renderFazisok([makeFazis({ sorok: [makeSor({ listaEgysegar: 10000, tenylegesEgysegar: 0 })] })]);
    expect(screen.getByText('−100%')).toBeInTheDocument();
  });

  it('egyező árú soron nincs eltérés-jelvény', () => {
    renderFazisok([makeFazis({ sorok: [makeSor({ listaEgysegar: 10000, tenylegesEgysegar: 10000 })] })]);
    expect(screen.queryByText(/^[−+]\d/)).not.toBeInTheDocument();
    expect(screen.queryByText('Felár')).not.toBeInTheDocument();
  });
});

// A doki explicit kikötése az implementáció indításakor: ez a panel
// KIZÁRÓLAG a nagy, "Érintett fogak" gomb alatti fogtérkép -- a soronkénti,
// célkeresztes ikonnal nyíló kis fogtérkép (ToothPickerPopover) ettől
// függetlenül, változatlanul a sor fogainak kijelölésére való (lásd
// ToothPickerPopover.test.tsx, változtatás nélkül).
describe('FazisokBlokk -- fogtérkép-panel (Terv részletei)', () => {
  // A `vi.spyOn(Element.prototype, 'scrollIntoView')` teszttől tesztig
  // felhalmozódna (a repo nem állít be globális `restoreMocks`-ot) --
  // enélkül egy korábbi teszt kései rAF-hívása false positive-ot adna.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function nyisdKiFogterkepet(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: /Érintett fogak/ }));
  }

  function ketFazisosTerv() {
    return [
      makeFazis({
        sorszam: 1,
        megnevezes: 'Első fázis',
        sorok: [
          makeSor({ nevSnapshot: 'Első sor', fogak: '11' }),
          makeSor({ nevSnapshot: 'Második sor', fogak: '21' }),
        ],
      }),
      makeFazis({
        sorszam: 2,
        megnevezes: 'Második fázis',
        sorok: [makeSor({ nevSnapshot: 'Harmadik sor', fogak: '31' })],
      }),
    ];
  }

  it('a panel alapból csukva, a kinyitás előtt nincs `toolbar`', async () => {
    const user = userEvent.setup();
    renderFazisok(ketFazisosTerv());
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();

    await nyisdKiFogterkepet(user);
    expect(await screen.findByRole('toolbar')).toBeInTheDocument();
  });

  it('kezelt fogra kattintás kiemeli a hozzá tartozó sort és odagörget, egy második kijelölés NEM görget újra', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    renderFazisok(ketFazisosTerv());
    await nyisdKiFogterkepet(user);

    const chart = screen.getByRole('toolbar');
    await user.click(chart.querySelector('[data-tooth="11"]') as Element);

    const elsoRow = document.getElementById(sorElemId(0, 0))!;
    await waitFor(() => expect(elsoRow).toHaveStyle({ background: t.accentWash }));
    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));

    const masodikRow = document.getElementById(sorElemId(0, 1))!;
    expect(masodikRow).not.toHaveStyle({ background: t.accentWash });

    await user.click(chart.querySelector('[data-tooth="21"]') as Element);
    await waitFor(() => expect(masodikRow).toHaveStyle({ background: t.accentWash }));
    // A második kijelölés NEM görget újra -- a hívásszám a fentivel egyezik.
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    // Az elsőként kijelölt fog sora továbbra is kiemelve marad (additív).
    expect(elsoRow).toHaveStyle({ background: t.accentWash });
  });

  it('kezeletlen fogra kattintás nem csinál semmit', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    renderFazisok(ketFazisosTerv());
    await nyisdKiFogterkepet(user);

    const chart = screen.getByRole('toolbar');
    await user.click(chart.querySelector('[data-tooth="12"]') as Element);

    expect(screen.queryByText(/fog kijelölve/)).not.toBeInTheDocument();
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('Escape és a „Kijelölés törlése” gomb is törli a teljes kijelölést', async () => {
    const user = userEvent.setup();
    renderFazisok(ketFazisosTerv());
    await nyisdKiFogterkepet(user);

    const chart = screen.getByRole('toolbar');
    await user.click(chart.querySelector('[data-tooth="11"]') as Element);
    expect(await screen.findByText('1 fog kijelölve')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByText(/fog kijelölve/)).not.toBeInTheDocument();

    await user.click(chart.querySelector('[data-tooth="11"]') as Element);
    await user.click(await screen.findByRole('button', { name: 'Kijelölés törlése' }));
    expect(screen.queryByText(/fog kijelölve/)).not.toBeInTheDocument();
  });

  it('a panel összecsukása/újranyitása megtartja a kijelölést, csukva is látszik a számláló', async () => {
    const user = userEvent.setup();
    renderFazisok(ketFazisosTerv());
    await nyisdKiFogterkepet(user);

    const chart = screen.getByRole('toolbar');
    await user.click(chart.querySelector('[data-tooth="11"]') as Element);
    expect(await screen.findByText('1 fog kijelölve')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Érintett fogak/ }));
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(screen.getByText('1 fog kijelölve')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Érintett fogak/ }));
    expect(screen.getByRole('toolbar').querySelector('[data-tooth="11"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('csukott fázisba eső fog kijelölése kinyitja azt a fázist', async () => {
    const user = userEvent.setup();
    renderFazisok(ketFazisosTerv());

    const [, masodikToggle] = screen.getAllByRole('button', { name: 'Fázis összecsukása' });
    await user.click(masodikToggle);
    expect(screen.getByRole('button', { name: 'Fázis kinyitása' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await nyisdKiFogterkepet(user);
    const chart = screen.getByRole('toolbar');
    await user.click(chart.querySelector('[data-tooth="31"]') as Element);

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Fázis összecsukása' })).toHaveLength(2),
    );
  });
});
