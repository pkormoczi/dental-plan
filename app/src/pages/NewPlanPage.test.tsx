// D29: a Home "+ Új kezelési terv" gombja utáni köztes kereső/választó lépés
// (docs/03-funkcionalis-spec.md § Új terv indítása). Lásd
// OsszesTervSection.test.tsx a `DraftProbe`/`seedPersistedDraft` mintáért --
// ugyanaz a piszkozat-felülírás-őr fut itt is.
//
// A találati/recents sorok (D40) a név mellett egy halvány
// aktivitás-segédszöveget is renderelnek (`aktivitasSzoveg()`) -- ezért a
// recents állapotban lévő gombok accessible name-je NEM pontosan a
// páciensnév, hanem "<név><aktivitás-szöveg>" konkatenáció (a Tabs
// teszt-gotcha mintájára, docs/07-felulet-rendszer.md "Komponensek"):
// ilyenkor `{ name: /Kovács János/ }` regexet kell adni, nem pontos stringet.
// A 2+ karakteres KERESÉSI találatok sora egysoros (nincs aktivitás-szöveg),
// ott a pontos név is működik.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import NewPlanPage from './NewPlanPage';
import { TestProviders } from '../testUtils';
import { DemoStorage } from '../storage/DemoStorage';
import { useAppState } from '../state/AppState';
import { legutobbAktivPaciensek, UJ_TERV_RECENT_LIMIT } from '../domain/paciensAktivitas';
import type { Plan } from '../domain/types';

function DraftProbe() {
  const { plan } = useAppState();
  const sorCount = plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
  return (
    <div>
      <div data-testid="draft-oldal">PACIENS-OLDAL</div>
      <div data-testid="draft-nev">{plan.paciens.nev}</div>
      <div data-testid="draft-telefon">{plan.paciens.telefon}</div>
      <div data-testid="draft-tervid">„{plan.tervId}”</div>
      <div data-testid="draft-sorcount">{sorCount}</div>
    </div>
  );
}

function seedPersistedDraft(overrides: Partial<Plan> = {}) {
  const plan: Plan = {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Piszkozat Panni',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [{ sorszam: 1, megnevezes: '1. kezelés', megjegyzes: '', sorok: [] }],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:00:00.000Z', plan }),
  );
}

/** Csak a `paciensek/` alatti kulcsokat törli -- az árlista/beállítások megmaradnak,
 * ezért a StorageProvider saját (belső) `DemoStorage.init()`-je nem seedel újra. */
function removeAllPatients() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('dp:paciensek/')) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

/** A `dp:paciensek/<dir>/<fajl>` alakú seed-kulcsok közül az elsőt adja, aminek a mappaneve tartalmazza a keresett részletet. */
function findSeedKey(dirReszlet: string, fajlnev: string): string {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith('dp:paciensek/') && key.includes(dirReszlet) && key.endsWith(`/${fajlnev}`)) {
      return key;
    }
  }
  throw new Error(`nincs "${fajlnev}" kulcs "${dirReszlet}"-hez`);
}

function renderNewPlan() {
  return render(
    <TestProviders>
      <Routes>
        <Route path="/" element={<NewPlanPage />} />
        <Route path="/paciens" element={<DraftProbe />} />
      </Routes>
    </TestProviders>,
  );
}

describe('NewPlanPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    const seeder = new DemoStorage();
    await seeder.init();
  });

  it('a keresőmezőnek és a "+ Új páciens" gombnak van elérhető neve', async () => {
    renderNewPlan();
    expect(
      await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Új páciens' })).toBeInTheDocument();
  });

  it('a keresőmező automatikusan fókuszban van', async () => {
    renderNewPlan();
    const input = await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' });
    expect(input).toHaveFocus();
  });

  // Adatvezérelt: a várt top-15-öt magából a seedből (`legutobbAktivPaciensek`)
  // számolja ki, nem konkrét neveket hardkódol -- így a demó-készlet
  // bővítése (backlog-35 utáni, 22 páciensre bővített seed) nem töri meg.
  it('kezdetben a legutóbbi pácienseket sorolja fel, keresésre szűkíti a találatokat', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    const patients = await seeder.listPatients();
    const top15 = legutobbAktivPaciensek(patients, UJ_TERV_RECENT_LIMIT);
    const nemTop = patients.find((p) => !top15.some((t) => t.dirName === p.dirName));
    if (!nemTop) throw new Error('a teszthez legalább egy, a recentsből kimaradó páciens kell');

    const user = userEvent.setup();
    renderNewPlan();

    for (const p of top15) {
      expect(await screen.findByRole('button', { name: new RegExp(p.nev) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: new RegExp(nemTop.nev) })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Meglévő páciens keresése' }), nemTop.nev);
    expect(await screen.findByRole('button', { name: nemTop.nev })).toBeInTheDocument();
  });

  it('0 karakternél a recents recency-sorrendben áll, nem alfabetikusan', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    // Friss aktivitás -- alfabetikusan utolsó, recency szerint minden
    // meglévő seed-pácienst megelőz.
    await seeder.createPatient('Zsolt Zoltán');
    const patients = await seeder.listPatients();
    const vartSorrend = legutobbAktivPaciensek(patients, UJ_TERV_RECENT_LIMIT).map((p) => p.nev);
    expect(vartSorrend[0]).toBe('Zsolt Zoltán');

    renderNewPlan();

    await screen.findByRole('button', { name: new RegExp(vartSorrend[vartSorrend.length - 1]) });
    const gombok = screen.getAllByRole('button');
    const sorrend = gombok
      .map((b) => vartSorrend.find((n) => b.textContent?.includes(n)))
      .filter((n): n is string => n != null);
    expect(sorrend).toEqual(vartSorrend);
  });

  it('utolsoAktivitas nélküli páciens kimarad a recentsből, de kereséssel megtalálható', async () => {
    const key = findSeedKey('Kovács', 'paciens.json');
    const raw = JSON.parse(localStorage.getItem(key)!);
    delete raw.utolsoAktivitas;
    localStorage.setItem(key, JSON.stringify(raw));

    const user = userEvent.setup();
    renderNewPlan();

    await screen.findByRole('button', { name: /Nagy Éva/ });
    expect(screen.queryByRole('button', { name: /Kovács János/ })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Meglévő páciens keresése' }), 'Kovács');
    expect(await screen.findByRole('button', { name: 'Kovács János' })).toBeInTheDocument();
  });

  it('1 karakternél még a recents lista látszik, a "legalább 2 karakter" jegyzettel', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    await user.type(await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' }), 'k');
    expect(await screen.findByText('Legalább 2 karakter a kereséshez.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kovács János/ })).toBeInTheDocument();
  });

  it('2+ karakternél a prefix- és szó-eleji egyezés megelőzi a belső egyezést', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    await seeder.createPatient('Éva Kis');
    await seeder.createPatient('Kovács Evelin');
    await seeder.createPatient('Szevér Tamás');

    const user = userEvent.setup();
    renderNewPlan();

    await user.type(await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' }), 'ev');

    const nevek = ['Éva Kis', 'Kovács Evelin', 'Nagy Éva', 'Szevér Tamás'];
    await screen.findByRole('button', { name: 'Szevér Tamás' });
    const gombok = screen.getAllByRole('button');
    const sorrend = gombok
      .map((b) => nevek.find((n) => b.textContent === n))
      .filter((n): n is string => n != null);
    expect(sorrend).toEqual(nevek);
  });

  it('nyíl le majd Enter a második találatot választja', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    // "Xilofon" előtag -- egy valós Hungarian keresztnévvel (pl. "Anna")
    // ütközne a seedben lévő "Szabó Anna"/"Gál Hanna" pácienssel.
    await seeder.createPatient('Xilofon Teszt');
    await seeder.createPatient('Xilofon Vizsga');
    await seeder.createPatient('Xilofon Zoltán');

    const user = userEvent.setup();
    renderNewPlan();

    const input = await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' });
    await user.type(input, 'xilofon');
    await screen.findByRole('button', { name: 'Xilofon Teszt' });

    await user.keyboard('{ArrowDown}{Enter}');

    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Xilofon Vizsga');
  });

  it('nyíl fel a lista elejéről az utolsó találatra ugrik (körbeér)', async () => {
    const seeder = new DemoStorage();
    await seeder.init();
    await seeder.createPatient('Xilofon Teszt');
    await seeder.createPatient('Xilofon Vizsga');
    await seeder.createPatient('Xilofon Zoltán');

    const user = userEvent.setup();
    renderNewPlan();

    const input = await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' });
    await user.type(input, 'xilofon');
    await screen.findByRole('button', { name: 'Xilofon Teszt' });

    await user.keyboard('{ArrowUp}{Enter}');

    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Xilofon Zoltán');
  });

  it('Escape kiüríti a keresőt és visszahozza a recents listát', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    const input = await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' });
    await user.type(input, 'nagy');
    expect(screen.queryByRole('button', { name: /Kovács János/ })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
    expect(await screen.findByText('Legutóbbi páciensek')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kovács János/ })).toBeInTheDocument();
  });

  // D14/backlog-36: a no-match "Új páciens" opció mostantól a quick-create
  // dialógust nyitja meg (a begépelt névvel előtöltve), nem navigál
  // egyenesen -- a Mentés hozza létre a valódi Patient-rekordot.
  it('nulla találatnál egy "Új páciens" opció jelenik meg a begépelt névvel, a dialógust előtöltve nyitja', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    const input = await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' });
    await user.type(input, 'Teljesen Ismeretlen Név');

    expect(
      await screen.findByRole('button', { name: 'Új páciens: „Teljesen Ismeretlen Név”' }),
    ).toBeInTheDocument();

    await user.keyboard('{Enter}');

    const nameInput = await screen.findByRole('textbox', { name: 'Név *' });
    expect(nameInput).toHaveValue('Teljesen Ismeretlen Név');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Teljesen Ismeretlen Név');
  });

  it('az "Új páciens" opció is megerősítést kér mentetlen piszkozatnál', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderNewPlan();

    const input = await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' });
    await user.type(input, 'Teljesen Ismeretlen Név');
    await user.click(
      await screen.findByRole('button', { name: 'Új páciens: „Teljesen Ismeretlen Név”' }),
    );

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Elvetés és új terv' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    const nameInput = await screen.findByRole('textbox', { name: 'Név *' });
    expect(nameInput).toHaveValue('Teljesen Ismeretlen Név');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    expect(await screen.findByTestId('draft-nev')).toHaveTextContent('Teljesen Ismeretlen Név');
  });

  it('nulla meglévő páciensnél csak a "+ Új páciens" ág látszik', async () => {
    removeAllPatients();
    renderNewPlan();

    expect(
      await screen.findByText('Még nincs mentett terv, akihez visszatérhetnél.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Új páciens' })).toBeInTheDocument();
  });

  // D14: a "+ Új páciens" ág mostantól a quick-create dialóguson át hoz
  // létre valódi Patient-rekordot MÉG A TERV ELŐTT -- csak sikeres mentés
  // után navigál a Terv adatai lapra.
  it('"+ Új páciens" a quick-create dialógust nyitja azonnal, megerősítés nélkül -- csak sikeres mentés után navigál', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('draft-oldal')).not.toBeInTheDocument();

    const dialog = await screen.findByRole('dialog', { name: 'Új páciens' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Név *' }), 'Teszt Vadonatúj');
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Teszt Vadonatúj');
  });

  it('"+ Új páciens" Mégse/Escape a selectoron marad, a keresőszöveg megmarad (D205)', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    const input = await screen.findByRole('textbox', { name: 'Meglévő páciens keresése' });
    await user.type(input, 'xyz');

    await user.click(screen.getByRole('button', { name: '+ Új páciens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Új páciens' });
    await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByTestId('draft-oldal')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Meglévő páciens keresése' })).toHaveValue('xyz');
  });

  it('"+ Új páciens" -- a dialógusban megadott születési dátum és telefon a draftba kerül', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Új páciens' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Név *' }), 'Teszt Adatokkal');
    await user.type(within(dialog).getByLabelText('Született'), '1990-05-12');
    await user.type(within(dialog).getByLabelText('Telefon'), '+36 20 111 2222');
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Teszt Adatokkal');
    expect(screen.getByTestId('draft-telefon')).toHaveTextContent('+36 20 111 2222');
  });

  it('"+ Új páciens" -- névegyezésnél az "Ezt a pácienst választom" a meglévő páciensre folytat (D203/D204)', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Új páciens' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Név *' }), 'Kovács János');
    await user.click(
      await within(dialog).findByRole('button', { name: 'Ezt a pácienst választom: Kovács János' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Kovács János');
    expect(screen.getByTestId('draft-tervid')).toHaveTextContent('„”'); // üres tervId -- új tervlánc
  });

  it('meglévő páciens kiválasztása a legutóbb módosított láncának legfrissebb verziójából előtölti a páciensadatot, sorok nélkül', async () => {
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: /Kovács János/ }));

    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
    expect(screen.getByTestId('draft-nev')).toHaveTextContent('Kovács János');
    expect(screen.getByTestId('draft-tervid')).toHaveTextContent('„”'); // üres tervId -- új tervlánc
    expect(screen.getByTestId('draft-sorcount')).toHaveTextContent('0');
  });

  it('"+ Új páciens" megerősítést kér mentetlen piszkozatnál -- Mégse megtartja', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('draft-oldal')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Új páciens' }));
    await user.click(await screen.findByRole('button', { name: 'Elvetés és új terv' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    const dialog = await screen.findByRole('dialog', { name: 'Új páciens' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Név *' }), 'Teszt Elvetes');
    await user.click(within(dialog).getByRole('button', { name: 'Mentés' }));

    expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
  });

  it('meglévő páciens kiválasztása is megerősítést kér mentetlen piszkozatnál', async () => {
    seedPersistedDraft();
    const user = userEvent.setup();
    renderNewPlan();

    await user.click(await screen.findByRole('button', { name: /Kovács János/ }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByTestId('draft-oldal')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Kovács János/ }));
    await user.click(
      await screen.findByRole('button', { name: 'Folytatás, piszkozat elvetésével' }),
    );
    expect(await screen.findByTestId('draft-nev')).toHaveTextContent('Kovács János');
  });

  // backlog-28 (D33): a törzsadat előnyben részesül a legutóbbi terv
  // pillanatképéhez képest, ha van lezárt paciens-adatok.json.
  describe('paciens-adatok.json (D33) hatása', () => {
    it('lezárt törzsadat esetén onnan tölt elő, nem a legutóbbi terv paciens pillanatképéből', async () => {
      const seeder = new DemoStorage();
      await seeder.init();
      const patients = await seeder.listPatients();
      const kovacs = patients.find((p) => p.nev === 'Kovács János')!;
      await seeder.savePatientData(kovacs.dirName, {
        schemaVersion: 1,
        paciensId: kovacs.paciensId,
        nev: 'Kovács János',
        szuletesiIdo: '',
        lakcim: '',
        telefon: '+36 99 999 9999', // eltér a seed terv telefonjától
        email: '',
        taj: '',
        kiskoru: false,
        torvenyesKepviselo: null,
      });

      const user = userEvent.setup();
      renderNewPlan();

      await user.click(await screen.findByRole('button', { name: /Kovács János/ }));

      expect(await screen.findByTestId('draft-nev')).toHaveTextContent('Kovács János');
      expect(screen.getByTestId('draft-telefon')).toHaveTextContent('+36 99 999 9999');
    });

    it('egy terv nélküli, csak törzsadattal rendelkező páciens is kereshető és előtölthető', async () => {
      const seeder = new DemoStorage();
      await seeder.init();
      await seeder.createPatient('Terv Nélküli Panni');

      const user = userEvent.setup();
      renderNewPlan();

      await user.click(await screen.findByRole('button', { name: /Terv Nélküli Panni/ }));

      expect(await screen.findByTestId('draft-oldal')).toBeInTheDocument();
      expect(screen.getByTestId('draft-nev')).toHaveTextContent('Terv Nélküli Panni');
      expect(screen.queryByText(/Ehhez a pácienshez nincs/)).not.toBeInTheDocument();
    });
  });
});
