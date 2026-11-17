import { promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { buildPatientDirName, generateId, VersionConflictError } from '../src/storage/paths';
import { HianyosMappaError, IdegenMappaError, IoError } from '../src/storage/taroloHibak';
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

  it('ha a verziómappa a listázás után jelenik meg, VersionConflictError, és a meglévő érintetlen', async () => {
    const gyoker = await ujGyoker();
    let elfog = false;
    let masikTerv = '';
    const fs: FsMuveletek = {
      ...fsp,
      mkdir: (async (cel: string, opciok?: Parameters<typeof fsp.mkdir>[1]) => {
        if (elfog && !opciok && cel.endsWith('_v2')) {
          // Egy másik gép közben ugyanezt a sorszámot mentette.
          await fsp.mkdir(cel);
          masikTerv = path.join(cel, 'terv.json');
          await fsp.writeFile(masikTerv, 'MASIK');
        }
        return fsp.mkdir(cel, opciok);
      }) as typeof fsp.mkdir,
    };
    const storage = new FileSystemStorage(new FsPrimitivek(gyoker, { fs, kesleltet: azonnal }));
    await storage.init();
    const ref1 = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref1);

    elfog = true;
    await expect(
      storage.savePlan({ ...v1, verzio: 0, keltezes: '2026-08-19' }, new Uint8Array([2])),
    ).rejects.toBeInstanceOf(VersionConflictError);

    expect(await fsp.readFile(masikTerv, 'utf8')).toBe('MASIK');
    expect((await storage.loadPlan(ref1)).verzio).toBe(1);
  });
});
