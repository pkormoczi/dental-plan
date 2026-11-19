// Tesztminta: egy demó-export átírt rendelőnévvel és árlista-verzióval, a nyilatkozatból két
// változattal -- így látszik, hogy az import az exportét írja, nem a beépítettet.

import type { AdatExport } from '../src/storage/adatExport';
import { seedPriceList } from '../src/storage/seed/priceList';
import { seedSettings } from '../src/storage/seed/settings';

export function tesztExport(): AdatExport {
  return {
    formatum: 'dental-plan-export',
    schemaVersion: 1,
    keszult: '2026-11-16T10:00:00.000Z',
    arlista: { ...seedPriceList, arlistaVerzio: '2026-11-10' },
    beallitasok: { ...seedSettings, rendelo: { ...seedSettings.rendelo, nev: 'Export Rendelő' } },
    sablonok: {
      'garancia-hu-v1.md': '# Garancia\n\nA demóban átírt garancia.\n',
      'nyilatkozat-hu-v1.md': '# Nyilatkozat\n\nRégi nyilatkozat.\n',
      'nyilatkozat-hu-v2.md': '# Nyilatkozat\n\nÚj nyilatkozat.\n',
    },
  };
}
