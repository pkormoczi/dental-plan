import { promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { buildPatientDirName, generateId, VersionConflictError } from '../src/storage/paths';
import { sha256Hex } from '../src/storage/sha256';
import { FelulirasUtkozesError, HianyosMappaError, HianyosVerzioError, IdegenMappaError, IoError } from '../src/storage/taroloHibak';
import { uresTorzsadat } from '../src/domain/paciensAdatok';
import { makeBlankPlan, taroloSzerzodesTesztek, type SzerzodesKornyezet } from '../src/storage/szerzodesTesztek';
import { FileSystemStorage } from './fileSystemStorage';
import { FsPrimitivek, type FsMuveletek } from './fsPrimitivek';

vi.mock('../src/storage/paths', async (eredeti) => {
  const m = await eredeti<typeof import('../src/storage/paths')>();
  return { ...m, generateId: vi.fn(m.generateId) };
});

const gyokerek: string[] = [];
afterAll(async () => {
  await Promise.all(gyokerek.map((g) => fsp.rm(g, { recursive: true, force: true })));
});

async function ujGyoker(): Promise<string> {
  const g = await fsp.mkdtemp(path.join(tmpdir(), 'mandoki-fs-'));
  gyokerek.push(g);
  return g;
}

const azonnal = async () => {};

async function listazRekurziv(gyoker: string): Promise<string[]> {
  const bejegyzesek = await fsp.readdir(gyoker, { recursive: true, withFileTypes: true });
  return bejegyzesek
    .filter((d) => d.isFile())
    .map((d) => path.relative(gyoker, path.join(d.parentPath, d.name)).split(path.sep).join('/'))
    .sort();
}

async function nyersIr(gyoker: string, ut: string, tartalom: string): Promise<void> {
  const cel = path.join(gyoker, ...ut.split('/'));
  await fsp.mkdir(path.dirname(cel), { recursive: true });
  await fsp.writeFile(cel, tartalom);
}

const errnoHiba = (code: string) => Object.assign(new Error(code), { code });

describe('FileSystemStorage szerződés', () => {
  taroloSzerzodesTesztek(async (): Promise<SzerzodesKornyezet> => {
    const gyoker = await ujGyoker();
    const prim = new FsPrimitivek(gyoker, { kesleltet: azonnal });
    const storage = new FileSystemStorage(prim);
    await storage.init();
    return {
      storage,
      nyersOlvas: (ut) => fsp.readFile(path.join(gyoker, ...ut.split('/')), 'utf8').catch(() => null),
      nyersIr: (ut, tartalom) => nyersIr(gyoker, ut, tartalom),
      osszesFajl: () => listazRekurziv(gyoker),
      irasFigyelo: (fn) => {
        const { irSzoveg, irBajt } = prim;
        prim.irSzoveg = async (ut, tartalom) => {
          fn(ut);
          return irSzoveg.call(prim, ut, tartalom);
        };
        prim.irBajt = async (ut, tartalom) => {
          fn(ut);
          return irBajt.call(prim, ut, tartalom);
        };
        return () => {
          prim.irSzoveg = irSzoveg;
          prim.irBajt = irBajt;
        };
      },
    };
  });
});

describe('FsPrimitivek atomi írás és újrapróba', () => {
  it('ha az fsync előtt elhasal az írás, a célfájl érintetlen, és nem marad temp fájl', async () => {
    const gyoker = await ujGyoker();
    await nyersIr(gyoker, 'arlista.json', 'EREDETI');
    const fs: FsMuveletek = {
      ...fsp,
      open: (async (...args: Parameters<typeof fsp.open>) => {
        const fh = await fsp.open(...args);
        return Object.assign(Object.create(fh), {
          writeFile: fh.writeFile.bind(fh),
          close: fh.close.bind(fh),
          sync: async () => {
            throw errnoHiba('EIO');
          },
        });
      }) as typeof fsp.open,
    };
    const prim = new FsPrimitivek(gyoker, { fs, kesleltet: azonnal });

    await expect(prim.irSzoveg('arlista.json', 'UJ')).rejects.toBeInstanceOf(IoError);

    expect(await fsp.readFile(path.join(gyoker, 'arlista.json'), 'utf8')).toBe('EREDETI');
    expect(await fsp.readdir(gyoker)).toEqual(['arlista.json']);
  });

  it('két EBUSY után a harmadik próbálkozás sikerül', async () => {
    const gyoker = await ujGyoker();
    let hivas = 0;
    const fs: FsMuveletek = {
      ...fsp,
      rename: async (...args: Parameters<typeof fsp.rename>) => {
        if (hivas++ < 2) throw errnoHiba('EBUSY');
        return fsp.rename(...args);
      },
    };
    const kesleltetesek: number[] = [];
    const prim = new FsPrimitivek(gyoker, { fs, kesleltet: async (ms) => void kesleltetesek.push(ms) });

    await prim.irSzoveg('arlista.json', 'UJ');

    expect(await fsp.readFile(path.join(gyoker, 'arlista.json'), 'utf8')).toBe('UJ');
    expect(kesleltetesek).toEqual([100, 200]);
  });

  it('tartós EACCES az újrapróbák után IO-hibaként jön ki, az errno-val és az útvonallal', async () => {
    const gyoker = await ujGyoker();
    const fs: FsMuveletek = {
      ...fsp,
      open: (async () => {
        throw errnoHiba('EACCES');
      }) as typeof fsp.open,
    };
    const kesleltetesek: number[] = [];
    const prim = new FsPrimitivek(gyoker, { fs, kesleltet: async (ms) => void kesleltetesek.push(ms) });

    const hiba = await prim.irSzoveg('arlista.json', 'UJ').catch((e: unknown) => e);

    expect(hiba).toBeInstanceOf(IoError);
    expect((hiba as IoError).errno).toBe('EACCES');
    expect((hiba as IoError).utvonal).toBe(path.join(gyoker, 'arlista.json'));
    expect(kesleltetesek).toEqual([100, 200, 400, 800, 1600]);
  });
});

describe('FileSystemStorage init', () => {
  it('üres gyökeret az alapkészlettel épít fel, demó-páciens nélkül', async () => {
    const gyoker = await ujGyoker();
    const storage = new FileSystemStorage(new FsPrimitivek(gyoker));

    await storage.init();

    expect((await fsp.readdir(gyoker)).sort()).toEqual(['arlista.json', 'beallitasok.json', 'paciensek', 'sablonok']);
    expect(await fsp.readdir(path.join(gyoker, 'sablonok'))).toHaveLength(6);
    expect(await fsp.readdir(path.join(gyoker, 'paciensek'))).toEqual([]);
    expect(await storage.listPatients()).toEqual([]);
  });

  it('a rendszer-szemét (.DS_Store, desktop.ini) nem teszi idegenné az üres gyökeret', async () => {
    const gyoker = await ujGyoker();
    await nyersIr(gyoker, '.DS_Store', 'x');
    await nyersIr(gyoker, 'desktop.ini', 'x');
    const storage = new FileSystemStorage(new FsPrimitivek(gyoker));

    expect((await storage.osztalyoz()).allapot).toBe('ures');
  });

  it('hiányos gyökérbe nem ír, és megnevezi, mi hiányzik', async () => {
    const gyoker = await ujGyoker();
    await nyersIr(gyoker, 'arlista.json', '{}');
    await fsp.mkdir(path.join(gyoker, 'paciensek'));
    const elotte = await listazRekurziv(gyoker);
    const storage = new FileSystemStorage(new FsPrimitivek(gyoker));

    const hiba = await storage.init().catch((e: unknown) => e);

    expect(hiba).toBeInstanceOf(HianyosMappaError);
    expect((hiba as HianyosMappaError).hianyzik).toEqual(['beallitasok.json', 'sablonok']);
    expect(await listazRekurziv(gyoker)).toEqual(elotte);
  });

  it('idegen mappát elutasít, és nem ír bele', async () => {
    const gyoker = await ujGyoker();
    await nyersIr(gyoker, 'Dokumentum.docx', 'x');
    const storage = new FileSystemStorage(new FsPrimitivek(gyoker));

    await expect(storage.init()).rejects.toBeInstanceOf(IdegenMappaError);

    expect(await fsp.readdir(gyoker)).toEqual(['Dokumentum.docx']);
  });

  it('hiányzó gyökérmappát nem hoz létre, ENOENT IO-hibát ad', async () => {
    const gyoker = path.join(await ujGyoker(), 'nincs-ilyen');
    const storage = new FileSystemStorage(new FsPrimitivek(gyoker));

    const hiba = await storage.init().catch((e: unknown) => e);

    expect(hiba).toBeInstanceOf(IoError);
    expect((hiba as IoError).errno).toBe('ENOENT');
    await expect(fsp.stat(gyoker)).rejects.toThrow();
  });

  it('a miénk gyökérben egy újabb schemaVersion-ű árlistát nem tölt be', async () => {
    const gyoker = await ujGyoker();
    await new FileSystemStorage(new FsPrimitivek(gyoker)).init();
    const arlista = JSON.parse(await fsp.readFile(path.join(gyoker, 'arlista.json'), 'utf8'));
    await nyersIr(gyoker, 'arlista.json', JSON.stringify({ ...arlista, schemaVersion: 2 }));

    await expect(new FileSystemStorage(new FsPrimitivek(gyoker)).init()).rejects.toThrow(/újabb verziójával/);
  });

  it('hosszú gyökérútvonalra figyelmeztet', async () => {
    const gyoker = path.join(await ujGyoker(), 'a'.repeat(130));
    await fsp.mkdir(gyoker);
    const storage = new FileSystemStorage(new FsPrimitivek(gyoker));

    expect((await storage.osztalyoz()).figyelmeztetesek).toEqual(['HOSSZU_UTVONAL']);
  });
});

describe('FileSystemStorage platformközi buktatók', () => {
  it('NFD-nevű páciensmappa beolvasható, NFC-ben látszik, és a mentés ugyanabba a mappába ír', async () => {
    const gyoker = await ujGyoker();
    const storage = new FileSystemStorage(new FsPrimitivek(gyoker));
    await storage.init();
    const nfc = 'Kovács-Éva_abc123';
    const nfd = nfc.normalize('NFD');
    expect(nfd).not.toBe(nfc);
    await nyersIr(gyoker, `paciensek/${nfd}/paciens.json`, JSON.stringify({ schemaVersion: 1, paciensId: 'abc123', nev: 'Kovács Éva' }));

    const paciensek = await storage.listPatients();

    expect(paciensek.map((p) => p.dirName)).toEqual([nfc]);
    expect(paciensek[0].nev).toBe('Kovács Éva');
    const ref = await storage.savePlan(makeBlankPlan({ paciensId: 'abc123' }), new Uint8Array([1]));
    expect(ref.patientDir).toBe(nfc);
    expect(await fsp.readdir(path.join(gyoker, 'paciensek'))).toHaveLength(1);
    expect((await storage.loadPlan(ref)).paciensId).toBe('abc123');
  });

  it('createPatient nem kap olyan mappanevet, ami csak kis-/nagybetűben tér el egy meglévőtől', async () => {
    const gyoker = await ujGyoker();
    const storage = new FileSystemStorage(new FsPrimitivek(gyoker));
    await storage.init();
    const utkozo = buildPatientDirName('Kis Béla', 'abc123').toLocaleLowerCase('hu');
    await nyersIr(gyoker, `paciensek/${utkozo}/paciens.json`, '{"meglevo":true}');
    vi.mocked(generateId).mockReturnValueOnce('abc123').mockReturnValueOnce('zzz999');

    const folder = await storage.createPatient('Kis Béla');

    expect(folder.dirName).toBe(buildPatientDirName('Kis Béla', 'zzz999'));
    expect(await fsp.readFile(path.join(gyoker, 'paciensek', utkozo, 'paciens.json'), 'utf8')).toBe('{"meglevo":true}');
  });
});

/** A verziómappák egy láncon belül, a nyers fájlrendszerből -- a rejtett temp-mappákkal együtt. */
async function lancTartalma(gyoker: string, ref: { patientDir: string; planDir: string }): Promise<string[]> {
  return (await fsp.readdir(path.join(gyoker, 'paciensek', ref.patientDir, ref.planDir))).sort();
}

const verzioUt = (gyoker: string, ref: { patientDir: string; planDir: string; versionDir: string }, fajl: string) =>
  path.join(gyoker, 'paciensek', ref.patientDir, ref.planDir, ref.versionDir, fajl);

async function ujTarolo(fs?: FsMuveletek): Promise<{ gyoker: string; storage: FileSystemStorage }> {
  const gyoker = await ujGyoker();
  const storage = new FileSystemStorage(new FsPrimitivek(gyoker, { fs, kesleltet: azonnal }));
  await storage.init();
  return { gyoker, storage };
}

/** Egy `open`, ami a temp-írás előtt meghívja `fn`-t a célfájl útvonalával. */
function openFigyelo(fn: (cel: string) => Promise<void>): FsMuveletek {
  return {
    ...fsp,
    open: (async (...args: Parameters<typeof fsp.open>) => {
      await fn(String(args[0]));
      return fsp.open(...args);
    }) as typeof fsp.open,
  };
}

describe('FileSystemStorage verzió-teljesség', () => {
  it('a manifest a két fájl sha256-át és méretét rögzíti, és utoljára íródik', async () => {
    const irasok: string[] = [];
    const { gyoker, storage } = await ujTarolo(
      openFigyelo(async (cel) => {
        if (cel.includes(`${path.sep}.tmp-`)) irasok.push(path.basename(cel).replace(/\.tmp-[0-9a-f]+$/, ''));
      }),
    );
    const pdf = new Uint8Array([7, 8, 9, 10]);

    const ref = await storage.savePlan(makeBlankPlan(), pdf);

    expect(irasok).toEqual(['terv.json', 'kezelesi-terv.pdf', 'manifest.json']);
    const manifest = JSON.parse(await fsp.readFile(verzioUt(gyoker, ref, 'manifest.json'), 'utf8'));
    const terv = await fsp.readFile(verzioUt(gyoker, ref, 'terv.json'));
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.mentesId).toMatch(/^[0-9a-f-]{36}$/);
    expect(manifest.fajlok['terv.json']).toEqual({ sha256: await sha256Hex(new Uint8Array(terv)), meret: terv.length });
    expect(manifest.fajlok['kezelesi-terv.pdf']).toEqual({ sha256: await sha256Hex(pdf), meret: 4 });
    expect(await lancTartalma(gyoker, ref)).toEqual(['2026-08-05_v1']);
  });

  it('manifest nélküli verzió hiányos: sem a terv, sem a PDF nem tölthető be, és a sorszámát a következő mentés nem kapja meg', async () => {
    const { gyoker, storage } = await ujTarolo();
    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref);
    await fsp.rm(verzioUt(gyoker, ref, 'manifest.json'));

    const [v] = await storage.listVersions(ref.patientDir, ref.planDir);

    expect(v).toMatchObject({ allapot: 'hianyos', hianyzik: ['manifest.json'] });
    await expect(storage.loadPlan(ref)).rejects.toBeInstanceOf(HianyosVerzioError);
    await expect(storage.loadPlanPdf(ref)).rejects.toBeInstanceOf(HianyosVerzioError);
    const ref2 = await storage.savePlan({ ...v1, verzio: 0, keltezes: '2026-08-19' }, new Uint8Array([2]));
    expect(ref2.versionDir).toBe('2026-08-19_v2');
  });

  it('a még meg nem érkezett PDF-ű verzió hiányos, a hiányzó fájl nevével', async () => {
    const { gyoker, storage } = await ujTarolo();
    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
    await fsp.rm(verzioUt(gyoker, ref, 'kezelesi-terv.pdf'));

    const [v] = await storage.listVersions(ref.patientDir, ref.planDir);

    expect(v).toMatchObject({ allapot: 'hianyos', hianyzik: ['kezelesi-terv.pdf'] });
  });

  it('azonos méretű, de eltérő tartalmú PDF-nél a verzió hiányos', async () => {
    const { gyoker, storage } = await ujTarolo();
    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1, 2, 3]));
    await fsp.writeFile(verzioUt(gyoker, ref, 'kezelesi-terv.pdf'), new Uint8Array([3, 2, 1]));

    const [v] = await storage.listVersions(ref.patientDir, ref.planDir);

    expect(v).toMatchObject({ allapot: 'hianyos', hianyzik: ['kezelesi-terv.pdf: eltérő tartalom'] });
  });

  it('újraellenőrzéskor a közben megérkezett fájllal a hiányos verzió teljessé válik', async () => {
    const { gyoker, storage } = await ujTarolo();
    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1, 2, 3]));
    const pdfUt = verzioUt(gyoker, ref, 'kezelesi-terv.pdf');
    await fsp.rm(pdfUt);
    expect((await storage.listVersions(ref.patientDir, ref.planDir))[0].allapot).toBe('hianyos');

    await fsp.writeFile(pdfUt, new Uint8Array([1, 2, 3]));

    expect((await storage.listVersions(ref.patientDir, ref.planDir))[0].allapot).toBe('teljes');
    expect(await storage.loadPlanPdf(ref)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('ha az átnevezés előtt a másik gépen ugyanez a sorszám más dátummal elkészült, VERZIO_UTKOZES a meglévő adataival, a temp eldobva', async () => {
    let masik: (() => Promise<void>) | null = null;
    const { gyoker, storage } = await ujTarolo(
      openFigyelo(async (cel) => {
        if (masik && path.basename(cel).startsWith('manifest.json.tmp-')) {
          const fut = masik;
          masik = null;
          await fut();
        }
      }),
    );
    const ref1 = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref1);
    const masikGep = new FileSystemStorage(new FsPrimitivek(gyoker, { kesleltet: azonnal }));
    masik = async () => {
      await masikGep.savePlan({ ...v1, verzio: 0, keltezes: '2026-08-18', orvos: 'Dr. Másik Gép' }, new Uint8Array([9]));
    };

    const hiba = await storage
      .savePlan({ ...v1, verzio: 0, keltezes: '2026-08-19' }, new Uint8Array([2]))
      .catch((e: unknown) => e);

    expect(hiba).toBeInstanceOf(VersionConflictError);
    expect((hiba as VersionConflictError).dirName).toBe('2026-08-18_v2');
    expect((hiba as VersionConflictError).letezo).toEqual({
      datum: '2026-08-18',
      orvos: 'Dr. Másik Gép',
      vegosszeg: 0,
      penznem: 'HUF',
    });
    expect((hiba as Error).message).toMatch(/v2 sorszámmal \(2026\.08\.18\., Dr\. Másik Gép\)/);
    expect(await lancTartalma(gyoker, ref1)).toEqual(['2026-08-05_v1', '2026-08-18_v2']);
    expect(
      (await storage.loadPlan({ ...ref1, versionDir: '2026-08-18_v2' })).orvos,
    ).toBe('Dr. Másik Gép');
  });

  it('ha a verziómappa pont az átnevezés pillanatában jelenik meg, VersionConflictError, és a meglévő érintetlen', async () => {
    let elfog = false;
    let masikTerv = '';
    const fs: FsMuveletek = {
      ...fsp,
      rename: (async (honnan: string, hova: string) => {
        if (elfog && String(honnan).includes(`${path.sep}.tmp-`) && String(hova).endsWith('_v2')) {
          elfog = false;
          await fsp.mkdir(hova);
          masikTerv = path.join(String(hova), 'terv.json');
          await fsp.writeFile(masikTerv, 'MASIK');
        }
        return fsp.rename(honnan, hova);
      }) as typeof fsp.rename,
    };
    const { gyoker, storage } = await ujTarolo(fs);
    const ref1 = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref1);

    elfog = true;
    const hiba = await storage
      .savePlan({ ...v1, verzio: 0, keltezes: '2026-08-19' }, new Uint8Array([2]))
      .catch((e: unknown) => e);

    expect(hiba).toBeInstanceOf(VersionConflictError);
    expect((hiba as VersionConflictError).letezo).toBeNull();
    expect(await fsp.readFile(masikTerv, 'utf8')).toBe('MASIK');
    expect(await lancTartalma(gyoker, ref1)).toEqual(['2026-08-05_v1', '2026-08-19_v2']);
    expect((await storage.loadPlan(ref1)).verzio).toBe(1);
  });

  it('egy elszáradt .tmp-* mappa nem listázódik verzióként, és nem foglal sorszámot', async () => {
    const { gyoker, storage } = await ujTarolo();
    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref);
    await nyersIr(gyoker, `paciensek/${ref.patientDir}/${ref.planDir}/.tmp-2026-08-06_v2-abc123/terv.json`, '{}');

    expect((await storage.listVersions(ref.patientDir, ref.planDir)).map((v) => v.dirName)).toEqual(['2026-08-05_v1']);
    const ref2 = await storage.savePlan({ ...v1, verzio: 0, keltezes: '2026-08-19' }, new Uint8Array([2]));
    expect(ref2.versionDir).toBe('2026-08-19_v2');
  });

  it('ha a manifest írása elhasal, sem a temp, sem az új páciens mappája nem marad meg', async () => {
    const { gyoker, storage } = await ujTarolo(
      openFigyelo(async (cel) => {
        if (path.basename(cel).startsWith('manifest.json.tmp-')) throw errnoHiba('EIO');
      }),
    );

    await expect(storage.savePlan(makeBlankPlan(), new Uint8Array([1]))).rejects.toThrow(/nem sikerült elmenteni/);

    expect(await fsp.readdir(path.join(gyoker, 'paciensek'))).toEqual([]);
  });

  it('a visszagörgetés nem törli az új lánc mappáját, ha közben a másik gép verziója került bele', async () => {
    let masikVerzio = '';
    const { storage } = await ujTarolo(
      openFigyelo(async (cel) => {
        if (!path.basename(cel).startsWith('manifest.json.tmp-')) return;
        const lanc = path.dirname(path.dirname(cel));
        masikVerzio = path.join(lanc, '2026-08-04_v1', 'terv.json');
        await fsp.mkdir(path.dirname(masikVerzio));
        await fsp.writeFile(masikVerzio, 'MASIK');
        throw errnoHiba('EIO');
      }),
    );

    await expect(storage.savePlan(makeBlankPlan(), new Uint8Array([1]))).rejects.toThrow(/nem sikerült elmenteni/);

    expect(await fsp.readFile(masikVerzio, 'utf8')).toBe('MASIK');
    expect(await fsp.readdir(path.dirname(path.dirname(masikVerzio)))).toEqual(['2026-08-04_v1']);
  });
});

describe('FileSystemStorage ütközésőr', () => {
  interface Fajta {
    nev: string;
    /** Előkészít, betölt, és visszaadja a fájl gyökérhez relatív útját és a mentést. */
    elokeszit: (storage: FileSystemStorage) => Promise<{ ut: string; ment: (felulir?: boolean) => Promise<unknown> }>;
    /** A másik gép változata nyersen. */
    masik: (eredeti: string) => string;
    /** A `lemezenLevo` elvárt, felismerhető része. */
    lemezen: (l: unknown) => void;
  }

  const fajtak: Fajta[] = [
    {
      nev: 'árlista',
      elokeszit: async (storage) => {
        const pl = await storage.loadPriceList();
        return { ut: 'arlista.json', ment: (felulir) => storage.savePriceList({ ...pl, arlistaVerzio: 'sajat' }, { felulir }) };
      },
      masik: (eredeti) => JSON.stringify({ ...JSON.parse(eredeti), arlistaVerzio: 'masik' }),
      lemezen: (l) => expect((l as { arlistaVerzio: string }).arlistaVerzio).toBe('masik'),
    },
    {
      nev: 'beállítások',
      elokeszit: async (storage) => {
        const s = await storage.loadSettings();
        return { ut: 'beallitasok.json', ment: (felulir) => storage.saveSettings({ ...s, ervenyessegNap: 11 }, { felulir }) };
      },
      masik: (eredeti) => JSON.stringify({ ...JSON.parse(eredeti), ervenyessegNap: 99 }),
      lemezen: (l) => expect((l as { ervenyessegNap: number }).ervenyessegNap).toBe(99),
    },
    {
      nev: 'törzsadat',
      elokeszit: async (storage) => {
        const p = await storage.createPatient('Ütköző Ödön');
        const adat = (await storage.loadPatientData(p.dirName))!;
        return {
          ut: `paciensek/${p.dirName}/paciens-adatok.json`,
          ment: (felulir) => storage.savePatientData(p.dirName, { ...adat, telefon: 'sajat' }, { felulir }),
        };
      },
      masik: (eredeti) => JSON.stringify({ ...JSON.parse(eredeti), telefon: 'masik' }),
      lemezen: (l) => expect((l as { telefon: string }).telefon).toBe('masik'),
    },
    {
      nev: 'sablon',
      elokeszit: async (storage) => {
        await storage.loadLatestTemplateByBase('garancia-hu');
        return { ut: 'sablonok/garancia-hu-v1.md', ment: (felulir) => storage.saveTemplate('garancia-hu', 'SAJAT', { felulir }) };
      },
      masik: () => 'MASIK',
      lemezen: (l) => expect(l).toBe('MASIK'),
    },
  ];

  const nyersOlvas = (gyoker: string, ut: string) => fsp.readFile(path.join(gyoker, ...ut.split('/')), 'utf8');

  it.each(fajtak)('$nev: a betöltés óta a másik gépen módosult fájlra a mentés nem ír, FELULIRAS_UTKOZES a lemezen lévővel', async (f) => {
    const { gyoker, storage } = await ujTarolo();
    const { ut, ment } = await f.elokeszit(storage);
    const masik = f.masik(await nyersOlvas(gyoker, ut));
    await nyersIr(gyoker, ut, masik);

    const hiba = await ment().catch((e: unknown) => e);

    expect(hiba).toBeInstanceOf(FelulirasUtkozesError);
    expect((hiba as FelulirasUtkozesError).fajl).toBe(ut);
    f.lemezen((hiba as FelulirasUtkozesError).lemezenLevo);
    expect(await nyersOlvas(gyoker, ut)).toBe(masik);
    await expect(fsp.readdir(path.join(gyoker, '_utkozesek'))).rejects.toThrow();
  });

  it.each(fajtak)('$nev: felülírás-jelzővel a másik gép változata az _utkozesek/ alá kerül, a saját a helyére', async (f) => {
    const { gyoker, storage } = await ujTarolo();
    const { ut, ment } = await f.elokeszit(storage);
    const masik = f.masik(await nyersOlvas(gyoker, ut));
    await nyersIr(gyoker, ut, masik);

    await ment(true);

    const mentesek = await fsp.readdir(path.join(gyoker, '_utkozesek'));
    expect(mentesek).toHaveLength(1);
    expect(await nyersOlvas(gyoker, `_utkozesek/${mentesek[0]}`)).toBe(masik);
    expect(await nyersOlvas(gyoker, ut)).not.toBe(masik);
    expect(mentesek[0]).not.toContain(':');
  });

  it.each(fajtak)('$nev: a saját sikeres mentése után a következő mentés nem ütközik', async (f) => {
    const { gyoker, storage } = await ujTarolo();
    const { ment } = await f.elokeszit(storage);

    await ment();
    await ment();

    await expect(fsp.readdir(path.join(gyoker, '_utkozesek'))).rejects.toThrow();
  });

  it('a törzsadat másolata a páciensmappa nevével előtagolva, a gyökér _utkozesek/ mappájába kerül', async () => {
    const { gyoker, storage } = await ujTarolo();
    const p = await storage.createPatient('Ütköző Ödön');
    const adat = (await storage.loadPatientData(p.dirName))!;
    await nyersIr(gyoker, `paciensek/${p.dirName}/paciens-adatok.json`, JSON.stringify({ ...adat, telefon: 'masik' }));

    await storage.savePatientData(p.dirName, adat, { felulir: true });

    const [mentes] = await fsp.readdir(path.join(gyoker, '_utkozesek'));
    expect(mentes.startsWith(`${p.dirName}.paciens-adatok.`)).toBe(true);
    expect(mentes.endsWith('.json')).toBe(true);
    expect(await fsp.readdir(path.join(gyoker, 'paciensek', p.dirName))).toEqual(['paciens-adatok.json', 'paciens.json']);
  });

  it('egy ebben a futásban nem látott, de a lemezen létező törzsadatra a mentés ütközés; nem létezőre szabad írás', async () => {
    const { gyoker, storage } = await ujTarolo();
    const vanDir = buildPatientDirName('Masik Gep', 'abc123');
    await nyersIr(gyoker, `paciensek/${vanDir}/paciens.json`, JSON.stringify({ schemaVersion: 1, paciensId: 'abc123', nev: 'Masik Gep' }));
    await nyersIr(gyoker, `paciensek/${vanDir}/paciens-adatok.json`, JSON.stringify(uresTorzsadat('Masik Gep', 'abc123')));
    const nincsDir = buildPatientDirName('Uj Elek', 'def456');
    await nyersIr(gyoker, `paciensek/${nincsDir}/paciens.json`, JSON.stringify({ schemaVersion: 1, paciensId: 'def456', nev: 'Uj Elek' }));

    await expect(storage.savePatientData(vanDir, uresTorzsadat('Masik Gep', 'abc123'))).rejects.toBeInstanceOf(
      FelulirasUtkozesError,
    );
    await storage.savePatientData(nincsDir, uresTorzsadat('Uj Elek', 'def456'));
    expect(JSON.parse(await nyersOlvas(gyoker, `paciensek/${nincsDir}/paciens-adatok.json`)).nev).toBe('Uj Elek');
  });

  it('nem értelmezhető lemezváltozatnál is ütközés jön, a lemezen lévő tartalom helyén null', async () => {
    const { gyoker, storage } = await ujTarolo();
    const pl = await storage.loadPriceList();
    await nyersIr(gyoker, 'arlista.json', '{ sérült');

    const hiba = await storage.savePriceList(pl).catch((e: unknown) => e);

    expect(hiba).toBeInstanceOf(FelulirasUtkozesError);
    expect((hiba as FelulirasUtkozesError).lemezenLevo).toBeNull();
  });
});
