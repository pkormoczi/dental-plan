// A telepített app adatmappája (migrációs terv §6.1–§6.4): a gépenkénti configból olvasva,
// minden induláskor írás nélkül megvizsgálva. A tároló csak a miénknek talált mappán fut; új
// adatmappa és a hiányzó alapfájlok csak a doki explicit akciójára íródnak.

import { randomUUID } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { parseJson } from '../src/storage/json';
import { ErvenytelenParameterError, IoError, ioErrno } from '../src/storage/taroloHibak';
import type { AdatmappaAllapot, MappaVizsgalat } from '../src/storage/taroloIpc';
import { FileSystemStorage } from './fileSystemStorage';
import { FsPrimitivek } from './fsPrimitivek';

export const CONFIG_FAJL = 'config.json';
const CONFIG_SEMA = 1;

/** `userData/config.json`: a gyökér útja gépenként más, ezért nem a gyökérmappában él. */
export interface GepConfig {
  schemaVersion: number;
  gyokerMappa: string;
  /** Egyszer generált, véletlen azonosító -- nem gépnév, nem személyes adat. */
  gepId: string;
}

/** A config fájlműveletei -- a teszt hibát injektálhat. */
export interface ConfigFs {
  readFile: typeof fsp.readFile;
  writeFile: typeof fsp.writeFile;
  rename: typeof fsp.rename;
  mkdir: typeof fsp.mkdir;
  stat: typeof fsp.stat;
}

export interface AdatmappaOpciok {
  userData: string;
  /** A natív mappaválasztó; `null`, ha a doki bezárta. */
  mappatValaszt: () => Promise<string | null>;
  fs?: ConfigFs;
  /** A gyökér primitívjei -- a teszt késleltetés nélküli újrapróbát ad. */
  primetNyit?: (gyoker: string) => FsPrimitivek;
  /** Minden aktiváláskor, az új gyökérrel (a napló fejléce). */
  aktivalva?: (gyoker: string) => void;
  ujGepId?: () => string;
}

export class Adatmappa {
  private readonly o: AdatmappaOpciok;
  private readonly fs: ConfigFs;
  private gepId_ = '';
  private allapotErtek: AdatmappaAllapot = { allapot: 'nincs' };
  private aktivPrim: FsPrimitivek | null = null;
  private aktivTarolo: FileSystemStorage | null = null;
  /** A vizsgált mappa: induláskor a beállított, választás után a választott. */
  private jelolt: string | null = null;

  constructor(opciok: AdatmappaOpciok) {
    this.o = opciok;
    this.fs = opciok.fs ?? fsp;
  }

  get configFajl(): string {
    return path.join(this.o.userData, CONFIG_FAJL);
  }

  /** A renderer betöltésekor érvényes állapot. */
  get allapot(): AdatmappaAllapot {
    return this.allapotErtek;
  }

  get tarolo(): FileSystemStorage | null {
    return this.aktivTarolo;
  }

  get prim(): FsPrimitivek | null {
    return this.aktivPrim;
  }

  /** A configból, vagy az első indításkor generált; a renderer nem kapja meg. */
  get gepId(): string {
    return this.gepId_;
  }

  async indul(): Promise<AdatmappaAllapot> {
    const config = await this.configOlvas();
    this.gepId_ = config.gepId;
    if (!config.gyokerMappa) return this.allapotErtek;
    this.jelolt = config.gyokerMappa;
    const v = await this.vizsgal(config.gyokerMappa);
    if (v.allapot === 'rendben') this.aktival(v.ut);
    this.allapotErtek = v;
    return v;
  }

  async valaszt(): Promise<MappaVizsgalat | null> {
    const ut = await this.o.mappatValaszt();
    if (ut == null) return null;
    if (typeof ut !== 'string' || !path.isAbsolute(ut)) throw new ErvenytelenParameterError('mappa');
    this.jelolt = path.resolve(ut);
    return this.vizsgal(this.jelolt);
  }

  async ujraellenoriz(): Promise<AdatmappaAllapot> {
    return this.jelolt ? this.vizsgal(this.jelolt) : { allapot: 'nincs' };
  }

  /** Csak hiányos mappában ír; minden más állapotnál a vizsgálatot adja, változtatás nélkül. */
  async potol(): Promise<MappaVizsgalat> {
    const ut = this.jeloltKell();
    if ((await this.vizsgal(ut)).allapot === 'hianyos') await this.vizsgalo(ut).alapfajlokatPotol();
    return this.vizsgal(ut);
  }

  /**
   * A vizsgált mappa lesz az adatmappa, ha a miénk; üresbe csak `letrehoz`-zal épül új. A config
   * csak sikeres váltás után íródik, így egy félbemaradt választás a régi beállítást hagyja.
   */
  async hasznal(letrehoz: boolean): Promise<MappaVizsgalat> {
    const ut = this.jeloltKell();
    let v = await this.vizsgal(ut);
    if (v.allapot === 'ures' && letrehoz) {
      await this.vizsgalo(ut).adatmappatLetrehoz();
      v = await this.vizsgal(ut);
    }
    if (v.allapot !== 'rendben') return v;
    await this.configIr({ schemaVersion: CONFIG_SEMA, gyokerMappa: ut, gepId: this.gepId_ });
    this.aktival(ut);
    this.allapotErtek = v;
    return v;
  }

  private jeloltKell(): string {
    if (!this.jelolt) throw new ErvenytelenParameterError('nincs kiválasztott mappa');
    return this.jelolt;
  }

  private nyitPrim(gyoker: string): FsPrimitivek {
    return this.o.primetNyit ? this.o.primetNyit(gyoker) : new FsPrimitivek(gyoker);
  }

  private vizsgalo(gyoker: string): FileSystemStorage {
    return new FileSystemStorage(this.nyitPrim(gyoker), { gepId: this.gepId_ });
  }

  private aktival(gyoker: string): void {
    this.aktivPrim = this.nyitPrim(gyoker);
    this.aktivTarolo = new FileSystemStorage(this.aktivPrim, { gepId: this.gepId_ });
    this.o.aktivalva?.(gyoker);
  }

  private async vizsgal(ut: string): Promise<MappaVizsgalat> {
    const elerhetetlen = (errno: MappaVizsgalat['errno']): MappaVizsgalat => ({
      ut,
      allapot: 'elerhetetlen',
      hianyzik: [],
      errno,
      hosszuUtvonal: false,
    });
    try {
      // Egy fájlra a listázás üres listát adna, és üres mappának látszana.
      if (!(await this.fs.stat(ut)).isDirectory()) return elerhetetlen('ENOTDIR');
      const o = await this.vizsgalo(ut).osztalyoz();
      return {
        ut,
        allapot: o.allapot === 'mienk' ? 'rendben' : o.allapot,
        hianyzik: o.hianyzik,
        hosszuUtvonal: o.figyelmeztetesek.includes('HOSSZU_UTVONAL'),
      };
    } catch (err) {
      return elerhetetlen(err instanceof IoError ? err.errno : ioErrno((err as NodeJS.ErrnoException | null)?.code));
    }
  }

  /** Olvashatatlan vagy ismeretlen config: mintha nem volna -- a varázsló jön, a fájl csak sikerkor íródik felül. */
  private async configOlvas(): Promise<{ gyokerMappa: string | null; gepId: string }> {
    const ujGepId = this.o.ujGepId ?? randomUUID;
    let c: Partial<GepConfig> | null;
    try {
      c = parseJson<Partial<GepConfig> | null>(await this.fs.readFile(this.configFajl, 'utf8'), CONFIG_FAJL);
    } catch {
      return { gyokerMappa: null, gepId: ujGepId() };
    }
    const gepId = typeof c?.gepId === 'string' && c.gepId ? c.gepId : ujGepId();
    const ervenyes =
      c?.schemaVersion === CONFIG_SEMA && typeof c.gyokerMappa === 'string' && path.isAbsolute(c.gyokerMappa);
    return { gyokerMappa: ervenyes ? c!.gyokerMappa! : null, gepId };
  }

  private async configIr(config: GepConfig): Promise<void> {
    await this.fs.mkdir(this.o.userData, { recursive: true });
    const tmp = `${this.configFajl}.tmp-${randomUUID().slice(0, 8)}`;
    await this.fs.writeFile(tmp, JSON.stringify(config, null, 2));
    await this.fs.rename(tmp, this.configFajl);
  }
}
