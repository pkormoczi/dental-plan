// beallitasok.json seed -- docs/02-domain-modell.md példája szerint.
// adoszam/cegjegyzekszam üresen: a doki tölti ki (lásd README "Nyitott kérdések").

import type { Settings } from '../../domain/types';

export const seedSettings: Settings = {
  schemaVersion: 1,
  rendelo: {
    nev: 'Mándoki Dental Kft.',
    cim: '1114 Budapest, Móricz Zsigmond körtér 15. 3/8',
    telefon: '+36 1 234 5678',
    email: 'rendelo@mandokidental.hu',
    adoszam: '',
    cegjegyzekszam: '',
  },
  orvosok: ['Dr. Mándoki István'],
  logoFajl: 'logo.png',
  ervenyessegNap: 90,
  alapertelmezettNyelv: 'hu',
  nemetEngedelyezve: false,
};
