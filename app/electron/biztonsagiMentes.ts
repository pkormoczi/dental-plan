// Biztonsági mentés ZIP-be (migrációs terv §6.5): a teljes adatmappa egyetlen, független
// másolatba, amit a doki külső lemezre tesz. A renderer célt nem ad: a helyet a doki a natív
// dialógusban választja, és az adatmappa sosem lehet a cél.

import { randomBytes } from 'node:crypto';
import { createWriteStream, promises as fsp } from 'node:fs';
import path from 'node:path';
import { ZipFile } from 'yazl';
import { mentesFajlnev } from '../src/domain/biztonsagiMentes';
import { parseJson } from '../src/storage/json';
import { ErvenytelenParameterError, IoError, ioErrno, TiltottKuldoError } from '../src/storage/taroloHibak';
import {
  hibaBolStorageHiba,
  MENTES_ALLAPOT_CSATORNA,
  MENTES_KESZIT_CSATORNA,
  type IpcEredmeny,
  type MentesAllapot,
} from '../src/storage/taroloIpc';
import { rejtettNev } from './fsPrimitivek';
import type { IpcRegisztralo, KuldoEsemeny } from './ipcKezelok';
import type { Naplozo } from './naplo';

/** Az utolsó mentés indexe a gyökérben: last-write-wins, a két gép közösen látja. */
export const MENTES_INDEX_FAJL = 'biztonsagi-mentes.json';
const INDEX_SEMA = 1;

export class AdatmappabaMentesError extends Error {
  constructor() {
    super(
      'A mentés nem kerülhet az adatmappába: ott nem független másolat, a Google Drive felszinkronizálná, és a következő mentés magát is belecsomagolná. Válassz másik helyet, például egy titkosított külső lemezt.',
    );
    this.name = 'AdatmappabaMentesError';
  }
}

const errnoKod = (err: unknown) => (err as NodeJS.ErrnoException | null)?.code;

interface MentendoFajl {
  abs: string;
  /** A gyökérhez relatív, `/`-es út -- a ZIP-ben így áll. */
  rel: string;
  mtime: Date;
}

/**
 * A gyökér minden fájlja, a lemezen álló névvel. A rejtett és a félbemaradt elemek kimaradnak,
 * a symlinket nem követi: a mentés sem vezethet ki a gyökérből.
 */
export async function mentendoFajlok(gyoker: string): Promise<MentendoFajl[]> {
  const fajlok: MentendoFajl[] = [];
  async function bejar(abs: string, rel: string): Promise<void> {
    for (const d of await fsp.readdir(abs, { withFileTypes: true })) {
      if (rejtettNev(d.name) || d.isSymbolicLink()) continue;
      const dAbs = path.join(abs, d.name);
      const dRel = rel ? `${rel}/${d.name}` : d.name;
      if (d.isDirectory()) await bejar(dAbs, dRel);
      else if (d.isFile()) fajlok.push({ abs: dAbs, rel: dRel, mtime: (await fsp.stat(dAbs)).mtime });
    }
  }
  try {
    await bejar(gyoker, '');
  } catch (err) {
    throw new IoError(ioErrno(errnoKod(err)), (err as NodeJS.ErrnoException | null)?.path ?? gyoker);
  }
  return fajlok.sort((a, b) => a.rel.localeCompare(b.rel));
}

/** A ZIP-írás fájlműveletei -- a teszt hibát injektálhat. */
export interface MentesFs {
  rename: typeof fsp.rename;
}

/** temp fájl → `fsync` → átnevezés: hibánál a célhelyen nem marad félkész ZIP. */
export async function zipbeIr(gyoker: string, cel: string, fs: MentesFs = fsp): Promise<number> {
  const fajlok = await mentendoFajlok(gyoker);
  const tmp = `${cel}.tmp-${randomBytes(4).toString('hex')}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const zip = new ZipFile();
      zip.on('error', reject);
      const ki = createWriteStream(tmp);
      ki.on('error', reject);
      ki.on('close', () => resolve());
      zip.outputStream.on('error', reject).pipe(ki);
      for (const f of fajlok) zip.addFile(f.abs, f.rel, { mtime: f.mtime });
      zip.end();
    });
    const fh = await fsp.open(tmp, 'r+');
    try {
      await fh.sync();
    } finally {
      await fh.close();
    }
    await fs.rename(tmp, cel);
  } catch (err) {
    await fsp.unlink(tmp).catch(() => {});
    if (err instanceof IoError) throw err;
    const ut = (err as NodeJS.ErrnoException | null)?.path;
    // A forrásfájl hibája a gyökéren belüli úttal, minden más a céllal jelentkezik.
    throw new IoError(ioErrno(errnoKod(err)), ut && !ut.startsWith(tmp) ? ut : cel);
  }
  return fajlok.length;
}

/** Igaz, ha a cél az adatmappában vagy alatta van -- a mappanevek a lemezen álló alakjukban. */
export async function adatmappabanVan(gyoker: string, cel: string): Promise<boolean> {
  const valos = async (ut: string) => fsp.realpath(ut).catch(() => path.resolve(ut));
  const rel = path.relative(await valos(gyoker), await valos(path.dirname(cel)));
  return rel === '' || !(rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel));
}

/** Az aktív adatmappa, ahogy a mentés látja. */
export interface MentesForras {
  gyoker(): string | null;
  gepId(): string;
  olvas(rel: string): Promise<string | null>;
  ir(rel: string, tartalom: string): Promise<void>;
}

/** Sérült vagy ismeretlen index: mintha nem volna mentés -- az emlékeztető inkább szóljon. */
export async function mentesAllapot(forras: MentesForras): Promise<MentesAllapot> {
  const raw = await forras.olvas(MENTES_INDEX_FAJL);
  if (raw == null) return { utolso: null, ezenAGepen: false };
  try {
    const index = parseJson<{ utolso?: unknown; gepId?: unknown }>(raw, MENTES_INDEX_FAJL);
    if (typeof index.utolso === 'string' && !Number.isNaN(Date.parse(index.utolso))) {
      return { utolso: index.utolso, ezenAGepen: index.gepId === forras.gepId() };
    }
  } catch {
    // lásd a függvény kommentjét
  }
  return { utolso: null, ezenAGepen: false };
}

export interface MentesRendszer {
  /** Natív mentés-dialógus a javasolt névvel; a választott út, vagy `null`, ha a doki bezárta. */
  helyetValaszt(javasoltNev: string): Promise<string | null>;
  most?: () => Date;
  fs?: MentesFs;
}

export function mentesKezelok(
  ipc: IpcRegisztralo,
  forras: MentesForras,
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
  rendszer: MentesRendszer,
  irasTortent: () => void,
  naplozo?: Naplozo,
): void {
  const kezel =
    <T>(csatorna: string, fn: () => Promise<T>) =>
    async (e: KuldoEsemeny): Promise<IpcEredmeny<T>> => {
      try {
        if (!kuldoEngedett(e)) throw new TiltottKuldoError();
        return { ok: true, ertek: await fn() };
      } catch (err) {
        try {
          naplozo?.(csatorna, err);
        } catch {
          // a napló hibája nem írhatja felül a hívás eredményét
        }
        return { ok: false, hiba: hibaBolStorageHiba(err) };
      }
    };
  const aktivGyoker = () => {
    const g = forras.gyoker();
    if (!g) throw new Error('Nincs megnyitott adatmappa.');
    return g;
  };

  ipc.handle(
    MENTES_ALLAPOT_CSATORNA,
    kezel(MENTES_ALLAPOT_CSATORNA, async () => {
      aktivGyoker();
      return mentesAllapot(forras);
    }),
  );

  ipc.handle(
    MENTES_KESZIT_CSATORNA,
    kezel(MENTES_KESZIT_CSATORNA, async (): Promise<string | null> => {
      const gyoker = aktivGyoker();
      const most = rendszer.most?.() ?? new Date();
      const cel = await rendszer.helyetValaszt(mentesFajlnev(most));
      if (!cel) return null;
      if (!path.isAbsolute(cel)) throw new ErvenytelenParameterError('mentés helye');
      if (await adatmappabanVan(gyoker, cel)) throw new AdatmappabaMentesError();
      await zipbeIr(gyoker, cel, rendszer.fs);
      await forras.ir(
        MENTES_INDEX_FAJL,
        JSON.stringify({ schemaVersion: INDEX_SEMA, utolso: most.toISOString(), gepId: forras.gepId() }),
      );
      irasTortent();
      return path.basename(cel);
    }),
  );
}
