import { describe, expect, it } from 'vitest';
import { SchemaVersionError } from '../domain/schema';
import { ElectronStorage } from './ElectronStorage';
import { VersionConflictError } from './paths';
import {
  ErvenytelenParameterError,
  FelulirasUtkozesError,
  HianyosMappaError,
  HianyosVerzioError,
  IdegenMappaError,
  IoError,
  SerultJsonError,
  TiltottKuldoError,
  TorlesAkadalyError,
} from './taroloHibak';
import { hibaBolStorageHiba, storageHibaBolHiba, type StorageHiba, type TaroloHid } from './taroloIpc';

function hidAmi(valasz: Awaited<ReturnType<TaroloHid['hiv']>>, hivasok: unknown[][] = []): TaroloHid {
  return {
    adatmappa: { ut: 'C:/Mandoki', allapot: 'rendben', hianyzik: [], hosszuUtvonal: false },
    hiv: async (...args) => {
      hivasok.push(args);
      return valasz;
    },
    megmutat: async () => ({ ok: true, ertek: undefined }),
    pdfMegnyit: async () => ({ ok: true, ertek: undefined }),
    pdfMasol: async () => ({ ok: true, ertek: null }),
    naploMegmutat: async () => ({ ok: true, ertek: undefined }),
    adatmappaValaszt: async () => ({ ok: true, ertek: null }),
    adatmappaUjra: async () => ({ ok: true, ertek: { allapot: 'nincs' } }),
    adatmappaPotol: async () => ({ ok: false, hiba: { kod: 'EGYEB', uzenet: 'nem hívott' } }),
    adatmappaHasznal: async () => ({ ok: false, hiba: { kod: 'EGYEB', uzenet: 'nem hívott' } }),
    adatmappaMegnyit: async () => ({ ok: true, ertek: undefined }),
    alapsablonokPotol: async () => ({ ok: true, ertek: [] }),
    mentesAllapot: async () => ({ ok: true, ertek: { utolso: null, ezenAGepen: false } }),
    mentesKeszit: async () => ({ ok: true, ertek: null }),
    importElonezet: async () => ({ ok: true, ertek: null }),
    importIr: async () => ({ ok: false, hiba: { kod: 'EGYEB', uzenet: 'nem hívott' } }),
    zarasra: () => () => {},
    kilepes: async () => ({ ok: true, ertek: undefined }),
  };
}

const esetek: Array<[StorageHiba, new (...args: never[]) => Error, Record<string, unknown>]> = [
  [{ kod: 'VERZIO_UTKOZES', versionDir: '2026-08-05_v2', letezo: null }, VersionConflictError, { dirName: '2026-08-05_v2', letezo: null }],
  [
    {
      kod: 'VERZIO_UTKOZES',
      versionDir: '2026-08-05_v2',
      letezo: { datum: '2026-08-05', orvos: 'Dr. Másik', vegosszeg: 120000, penznem: 'HUF' },
    },
    VersionConflictError,
    { dirName: '2026-08-05_v2', letezo: { datum: '2026-08-05', orvos: 'Dr. Másik', vegosszeg: 120000, penznem: 'HUF' } },
  ],
  [
    { kod: 'FELULIRAS_UTKOZES', fajl: 'arlista.json', lemezenLevo: { x: 1 } },
    FelulirasUtkozesError,
    { fajl: 'arlista.json', lemezenLevo: { x: 1 } },
  ],
  [{ kod: 'TORLES_AKADALY', ok: 'veglegesitett-terv' }, TorlesAkadalyError, { ok: 'veglegesitett-terv' }],
  [{ kod: 'IO', errno: 'ENOSPC', utvonal: 'C:/adat/arlista.json' }, IoError, { errno: 'ENOSPC', utvonal: 'C:/adat/arlista.json' }],
  [{ kod: 'SERULT_JSON', fajl: 'terv.json', uzenet: 'sérült' }, SerultJsonError, { fajl: 'terv.json', message: 'sérült' }],
  [{ kod: 'SEMA_VERZIO', fajl: 'arlista.json', talalt: 2, ismert: 1 }, SchemaVersionError, { fileKind: 'arlista.json', foundVersion: 2 }],
  [{ kod: 'HIANYOS_VERZIO', versionDir: '2026-08-05_v1', hianyzik: ['manifest.json'] }, HianyosVerzioError, { versionDir: '2026-08-05_v1', hianyzik: ['manifest.json'] }],
  [{ kod: 'HIANYOS_MAPPA', hianyzik: ['sablonok'] }, HianyosMappaError, { hianyzik: ['sablonok'] }],
  [{ kod: 'IDEGEN_MAPPA' }, IdegenMappaError, {}],
  [{ kod: 'TILTOTT_KULDO' }, TiltottKuldoError, {}],
  [{ kod: 'ERVENYTELEN_PARAMETER', uzenet: 'Érvénytelen tároló-paraméter: PDF' }, ErvenytelenParameterError, { message: 'Érvénytelen tároló-paraméter: PDF' }],
  [{ kod: 'EGYEB', uzenet: 'Nincs terv itt' }, Error, { message: 'Nincs terv itt' }],
];

describe('ElectronStorage', () => {
  it.each(esetek)('a(z) %o hibaeredmény a megfelelő hibaosztályként, payloaddal dobódik', async (hiba, osztaly, payload) => {
    const storage = new ElectronStorage(hidAmi({ ok: false, hiba }));

    const dobott = await storage.loadPriceList().catch((e: unknown) => e);

    expect(dobott).toBeInstanceOf(osztaly);
    expect(dobott).toMatchObject(payload);
  });

  it.each(esetek)('a(z) %o oda-vissza alakítva változatlan: a main a hibaosztályból ugyanezt az eredményt képzi', (hiba) => {
    expect(hibaBolStorageHiba(storageHibaBolHiba(hiba))).toEqual(hiba);
  });

  it('az IPC-n érkező újabb sémájú fájl hibája kimondja, hogy valószínűleg a másik gépen újabb az alkalmazás', async () => {
    const storage = new ElectronStorage(hidAmi({ ok: false, hiba: { kod: 'SEMA_VERZIO', fajl: 'arlista.json', talalt: 2, ismert: 1 } }));

    const hiba = await storage.loadPriceList().catch((e: unknown) => e);

    expect((hiba as Error).message).toMatch(/újabb verziójával készült.*Valószínűleg a másik gépen újabb az alkalmazás\.$/);
  });

  it('a helyben keletkező sémahiba (demó) a mai szöveget adja, a másik gép említése nélkül', () => {
    expect(new SchemaVersionError('arlista.json', 2).message).not.toMatch(/másik gépen/);
  });

  it('a sikeres eredmény értékét adja vissza, és a metódust a paramétereivel hívja', async () => {
    const hivasok: unknown[][] = [];
    const storage = new ElectronStorage(hidAmi({ ok: true, ertek: [{ dirName: 'A_abc123', tervId: 'abc123', tervCim: null }] }, hivasok));

    expect(await storage.listPlans('Kis-Bela_abc123')).toEqual([{ dirName: 'A_abc123', tervId: 'abc123', tervCim: null }]);
    expect(hivasok).toEqual([['listPlans', 'Kis-Bela_abc123']]);
  });

  it('a PDF bájtjai base64 nélkül, Uint8Array-ként mennek át', async () => {
    const hivasok: unknown[][] = [];
    const storage = new ElectronStorage(hidAmi({ ok: true, ertek: { patientDir: 'p', planDir: 't', versionDir: 'v' } }, hivasok));
    const pdf = new Uint8Array([37, 80, 68, 70]);

    await storage.savePlan({} as never, pdf);

    expect(hivasok[0][2]).toBe(pdf);
  });
});
