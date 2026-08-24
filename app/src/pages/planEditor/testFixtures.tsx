// Közös render/seed segédfüggvények a terv szerkesztő tesztjeihez -- a
// `PlanEditorPage.test.tsx` és a `PlanEditorPage.sorok.test.tsx` közös
// fixtúrái, hogy ne másolódjanak.

import { render } from '@testing-library/react';
import { createBlankPlan } from '../../domain/blankPlan';
import { seedPriceList } from '../../storage/seed/priceList';
import { seedSettings } from '../../storage/seed/settings';
import { TestProviders } from '../../testUtils';
import PlanEditorPage from '../PlanEditorPage';

export function renderEditor() {
  return render(
    <TestProviders>
      <PlanEditorPage />
    </TestProviders>,
  );
}

/**
 * Egy német tervhez szükséges beállítás + egy árlista, amiben pontosan egy
 * tételnek ("Fogeltávolítás") van német neve -- a többi 117-nek nincs. Ezt a
 * localStorage-ot MIELŐTT a StorageProvider renderelne kell beírni, mert a
 * DemoStorage.init() az árlista hiányában resetDemoData()-t futtatna, ami
 * felülírná ezt az egyedi seedet.
 */
export function seedGermanPlanWithOneTranslatedItem() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) =>
      x.nev.hu === 'Fogeltávolítás'
        ? { ...x, nev: { ...x.nev, de: 'Zahnextraktion' } }
        : { ...x, nev: { ...x.nev, de: null } },
    ),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem(
    'dp:beallitasok.json',
    JSON.stringify({ ...seedSettings, alapertelmezettNyelv: 'de' }),
  );
}

/** Egy árlista, amiben egyetlen tételnek sincs EUR ára. */
export function seedWithNoEurPrices() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) => ({ ...x, ar: { ...x.ar, EUR: null } })),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
}

/**
 * ÉRINTETLEN árlista -- a `seedWithNoEurPrices`-tól eltérően itt minden
 * tételnek megvan az EUR ára, hogy egy EUR pénznemű terv szerkesztőjében
 * ténylegesen fel lehessen venni beárazott tételt (backlog-5).
 */
export function seedWithIntactPriceList() {
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
}

/**
 * Egy piszkozat, aminek van egy "Fogeltávolítás" (t041, mai HUF ára 25000)
 * sora, elavult listaárral (20000) -- a backlog-61 ár-frissítés tesztjeihez.
 * Az érintetlen árlista/beállítás mellé, a DraftStorage `dp:piszkozat`
 * rekord-alakjában (DemoDraftStorage.ts `save()` mintája), MIELŐTT a
 * StorageProvider renderelne.
 */
export function seedWithStalePriceRow() {
  localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
  const plan = createBlankPlan(seedSettings, seedPriceList);
  plan.paciens.nev = 'Teszt Elek';
  plan.fazisok[0].sorok.push({
    tetelId: 't041',
    nevSnapshot: 'Fogeltávolítás',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 20000,
    tenylegesEgysegar: 20000,
  });
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({ schemaVersion: 1, mentve: new Date().toISOString(), plan }),
  );
}
