// beallitasok.json seed -- docs/02-domain-modell.md példája szerint.
// adoszam/cegjegyzekszam üresen: a doki tölti ki (lásd README "Nyitott kérdések").

import type { Settings } from '../../domain/types';

export const seedSettings: Settings = {
  schemaVersion: 1,
  rendelo: {
    nev: 'Dr. Mándoki István Fogászati és Szájsebészeti Rendelő',
    cim: '1117 Budapest, Móricz Zsigmond körtér 15. 3/8',
    telefon: '+36 70 617 3172',
    email: 'istvan@drmandoki.hu',
    adoszam: '',
    cegjegyzekszam: '',
  },
  orvosok: ['Dr. Mándoki István'],
  ervenyessegNap: 90,
  alapertelmezettNyelv: 'hu',
};
