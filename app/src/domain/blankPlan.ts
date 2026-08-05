// Egy üres terv kiinduló állapota -- új terv indításakor ebből dolgozik a
// szerkesztő. `tervId`/`verzio` üresen marad, a storage.savePlan() tölti ki
// első mentéskor (lásd storage/DemoStorage.ts).

import { addDaysIso } from './date';
import type { Penznem, Plan, PriceList, Settings } from './types';

export function createBlankPlan(settings: Settings, priceList: PriceList): Plan {
  const today = new Date().toISOString().slice(0, 10);
  // D10: a nyelv határozza meg a pénznemet is.
  const penznem: Penznem = settings.alapertelmezettNyelv === 'de' ? 'EUR' : 'HUF';

  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: settings.alapertelmezettNyelv,
    penznem,
    keltezes: today,
    ervenyesIg: addDaysIso(today, settings.ervenyessegNap),
    arlistaVerzio: priceList.arlistaVerzio,
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: settings.orvosok[0] ?? '',
    paciens: {
      nev: '',
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
  };
}
