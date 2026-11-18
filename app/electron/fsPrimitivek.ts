// A közös storage-mag fájlprimitívjei a valódi gyökérmappán (migrációs terv §4.2, §4.8).

import { randomBytes } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { MarLetezikError, type FajlPrimitivek } from '../src/storage/fajlPrimitivek';
import { IoError, ioErrno } from '../src/storage/taroloHibak';

/** A `node:fs/promises` használt része -- a hibainjektálásos tesztek ezt cserélik. */
export interface FsMuveletek {
  open: typeof fsp.open;
  rename: typeof fsp.rename;
  readFile: typeof fsp.readFile;
  readdir: typeof fsp.readdir;
  mkdir: typeof fsp.mkdir;
  rm: typeof fsp.rm;
  unlink: typeof fsp.unlink;
  stat: typeof fsp.stat;
  realpath: typeof fsp.realpath;
}

export interface FsPrimitivekOpciok {
  fs?: FsMuveletek;
  kesleltet?: (ms: number) => Promise<void>;
}

// A Drive-kliens és a víruskereső rövid ideig zárolhat: ennyi nem lehet látható hiba.
const UJRAPROBA_ERRNO = new Set(['EBUSY', 'EPERM', 'EACCES']);
const UJRAPROBA_MS = [100, 200, 400, 800, 1600];

// Rendszer- és szinkron-szemét, valamint a saját félbemaradt írások: egyik sem páciens, terv
// vagy sablon, a listázásban nem jelenhet meg.
const REJTETT_NEV = /^\.|^desktop\.ini$|^thumbs\.db$|\.tmp-[0-9a-f]+$/i;

/** Rendszer- és szinkron-szemét vagy félbemaradt saját írás -- sem a listában, sem a mentésben nincs helye. */
export const rejtettNev = (nev: string): boolean => REJTETT_NEV.test(nev);

const errnoKod = (err: unknown) => (err as NodeJS.ErrnoException | null)?.code;

function ioHiba(err: unknown, utvonal: string): IoError {
  if (err instanceof IoError) return err;
  return new IoError(ioErrno(errnoKod(err)), utvonal, (err as NodeJS.ErrnoException | null)?.syscall);
}

export class FsPrimitivek implements FajlPrimitivek {
  readonly gyoker: string;
  private readonly fs: FsMuveletek;
  private readonly kesleltet: (ms: number) => Promise<void>;

  constructor(gyoker: string, opciok: FsPrimitivekOpciok = {}) {
    this.gyoker = gyoker;
    this.fs = opciok.fs ?? fsp;
    this.kesleltet = opciok.kesleltet ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  private async ujraprobal<T>(muvelet: () => Promise<T>): Promise<T> {
    for (let i = 0; ; i++) {
      try {
        return await muvelet();
      } catch (err) {
        const kod = errnoKod(err);
        if (i < UJRAPROBA_MS.length && kod && UJRAPROBA_ERRNO.has(kod)) {
          await this.kesleltet(UJRAPROBA_MS[i]);
          continue;
        }
        throw err;
      }
    }
  }

  private async letezikAbs(abs: string): Promise<boolean> {
    try {
      await this.fs.stat(abs);
      return true;
    } catch (err) {
      const kod = errnoKod(err);
      // Más hibánál a tényleges művelet adja a pontos hibát.
      return !(kod === 'ENOENT' || kod === 'ENOTDIR');
    }
  }

  /**
   * Az útvonal legmélyebb létező őse `realpath` után is a gyökérmappán belül van: egy
   * symlink vagy junction nem vezethet ki a gyökérből (migrációs terv §3.2).
   */
  private async bezart(abs: string): Promise<void> {
    let gyoker: string;
    try {
      gyoker = await this.fs.realpath(this.gyoker);
    } catch (err) {
      // Hiányzó gyökér alól nincs mit kivezetni; a művelet maga adja az ENOENT-et.
      if (errnoKod(err) === 'ENOENT') return;
      throw ioHiba(err, this.gyoker);
    }
    for (let vizsgalt = abs; ; vizsgalt = path.dirname(vizsgalt)) {
      try {
        const rel = path.relative(gyoker, await this.fs.realpath(vizsgalt));
        if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new IoError('EACCES', abs);
        return;
      } catch (err) {
        const kod = errnoKod(err);
        if ((kod !== 'ENOENT' && kod !== 'ENOTDIR') || path.dirname(vizsgalt) === vizsgalt) throw ioHiba(err, abs);
      }
    }
  }

  /**
   * A relatív útvonal a lemezen ténylegesen létező alakra feloldva. A saját nevek NFC-alakúak,
   * de egy Drive-ról érkezett mappa neve NFD is lehet, és az NTFS a kettőt külön névnek látja:
   * ahol a közvetlen alak nem létezik, a szülő listájában NFC-ben egyező nevet keresünk.
   */
  private async abs(ut: string): Promise<string> {
    const reszek = ut.split('/').filter(Boolean);
    const kozvetlen = path.join(this.gyoker, ...reszek);
    if (await this.letezikAbs(kozvetlen)) return kozvetlen;
    let jelenlegi = this.gyoker;
    for (const resz of reszek) {
      const nfc = resz.normalize('NFC');
      let talalt: string | undefined;
      try {
        talalt = (await this.fs.readdir(jelenlegi)).find((n) => n.normalize('NFC') === nfc);
      } catch {
        talalt = undefined;
      }
      jelenlegi = path.join(jelenlegi, talalt ?? resz);
    }
    return jelenlegi;
  }

  /** A feloldott és a gyökérbe zárt abszolút útvonal -- minden művelet ezen megy át. */
  private async celUt(ut: string): Promise<string> {
    const abs = await this.abs(ut);
    await this.bezart(abs);
    return abs;
  }

  async olvasSzoveg(ut: string): Promise<string | null> {
    const bajt = await this.olvasBajt(ut);
    return bajt == null ? null : new TextDecoder().decode(bajt);
  }

  async olvasBajt(ut: string): Promise<Uint8Array | null> {
    const abs = await this.celUt(ut);
    try {
      return new Uint8Array(await this.ujraprobal(() => this.fs.readFile(abs)));
    } catch (err) {
      if (errnoKod(err) === 'ENOENT') return null;
      throw ioHiba(err, abs);
    }
  }

  async meret(ut: string): Promise<number | null> {
    const abs = await this.celUt(ut);
    try {
      return (await this.ujraprobal(() => this.fs.stat(abs))).size;
    } catch (err) {
      if (errnoKod(err) === 'ENOENT') return null;
      throw ioHiba(err, abs);
    }
  }

  async irSzoveg(ut: string, tartalom: string): Promise<void> {
    await this.irAtomi(ut, new TextEncoder().encode(tartalom));
  }

  async irBajt(ut: string, tartalom: Uint8Array): Promise<void> {
    await this.irAtomi(ut, tartalom);
  }

  /** temp fájl → `fsync` → `rename`: hibánál a célfájl korábbi tartalma érintetlen. */
  private async irAtomi(ut: string, adat: Uint8Array): Promise<void> {
    const cel = await this.celUt(ut);
    const tmp = `${cel}.tmp-${randomBytes(4).toString('hex')}`;
    try {
      await this.ujraprobal(() => this.fs.mkdir(path.dirname(cel), { recursive: true }));
      const fh = await this.ujraprobal(() => this.fs.open(tmp, 'w'));
      try {
        await fh.writeFile(adat);
        await fh.sync();
      } finally {
        await fh.close();
      }
      await this.ujraprobal(() => this.fs.rename(tmp, cel));
    } catch (err) {
      await this.fs.unlink(tmp).catch(() => {});
      throw ioHiba(err, cel);
    }
  }

  async torol(ut: string): Promise<void> {
    const abs = await this.celUt(ut);
    try {
      await this.ujraprobal(() => this.fs.unlink(abs));
    } catch (err) {
      if (errnoKod(err) === 'ENOENT') return;
      throw ioHiba(err, abs);
    }
  }

  async listaz(ut: string, opciok?: { rejtettekkel?: boolean }): Promise<string[]> {
    const abs = await this.celUt(ut);
    try {
      const nevek = await this.ujraprobal(() => this.fs.readdir(abs));
      return nevek.filter((n) => opciok?.rejtettekkel || !REJTETT_NEV.test(n)).map((n) => n.normalize('NFC'));
    } catch (err) {
      const kod = errnoKod(err);
      if (kod === 'ENOENT' || kod === 'ENOTDIR') return [];
      throw ioHiba(err, abs);
    }
  }

  async letezik(ut: string): Promise<boolean> {
    return this.letezikAbs(await this.celUt(ut));
  }

  async modositva(ut: string): Promise<number | null> {
    const abs = await this.celUt(ut);
    try {
      return (await this.ujraprobal(() => this.fs.stat(abs))).mtimeMs;
    } catch (err) {
      if (errnoKod(err) === 'ENOENT') return null;
      throw ioHiba(err, abs);
    }
  }

  /** A gyökérhez relatív útvonal a lemezen, a gyökérbe zárva -- a rendszer fájlkezelőjének. */
  async abszolut(ut: string): Promise<string> {
    return this.celUt(ut);
  }

  async mappaLetrehoz(ut: string, opciok?: { kizarolagos?: boolean }): Promise<void> {
    const abs = await this.celUt(ut);
    try {
      if (!opciok?.kizarolagos) {
        await this.ujraprobal(() => this.fs.mkdir(abs, { recursive: true }));
        return;
      }
      await this.ujraprobal(() => this.fs.mkdir(path.dirname(abs), { recursive: true }));
      await this.ujraprobal(() => this.fs.mkdir(abs));
    } catch (err) {
      if (errnoKod(err) === 'EEXIST') throw new MarLetezikError(ut);
      throw ioHiba(err, abs);
    }
  }

  async torolMappa(ut: string): Promise<void> {
    const abs = await this.celUt(ut);
    try {
      await this.ujraprobal(() => this.fs.rm(abs, { recursive: true, force: true }));
    } catch (err) {
      throw ioHiba(err, abs);
    }
  }

  async atnevez(regi: string, uj: string): Promise<void> {
    // POSIX-on egy üres célmappa csendben felülíródna: a cél létezését külön nézzük.
    if (await this.letezik(uj)) throw new MarLetezikError(uj);
    const honnan = await this.celUt(regi);
    const hova = await this.celUt(uj);
    try {
      await this.ujraprobal(() => this.fs.rename(honnan, hova));
    } catch (err) {
      // A fenti ellenőrzés és az átnevezés között egy szinkronizált mappa is megjelenhet; az OS
      // ezt platformonként más errno-val jelzi (EEXIST, ENOTEMPTY, Windowson EPERM).
      if (await this.letezikAbs(hova)) throw new MarLetezikError(uj);
      throw ioHiba(err, hova);
    }
  }
}
