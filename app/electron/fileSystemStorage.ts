// A `PlanStorage` a valódi gyökérmappán: a közös mag (`FajlTarolo`) fs-primitíveken
// (migrációs terv §4).

import {
  ARLISTA_FAJL,
  BEALLITASOK_FAJL,
  DEFAULT_TEMPLATES,
  FajlTarolo,
  PACIENSEK_MAPPA,
  SABLONOK_MAPPA,
} from '../src/storage/fajlTarolo';
import { utvonal } from '../src/storage/fajlPrimitivek';
import { seedPriceList } from '../src/storage/seed/priceList';
import { seedSettings } from '../src/storage/seed/settings';
import { HianyosMappaError, IdegenMappaError, IoError } from '../src/storage/taroloHibak';
import type { FsPrimitivek } from './fsPrimitivek';

/** A gyökér akkor a miénk, ha mind a négy megvan; ha csak egy része, hiányos. */
const SAJAT_ELEMEK = [ARLISTA_FAJL, BEALLITASOK_FAJL, PACIENSEK_MAPPA, SABLONOK_MAPPA];

// Windowson a teljes útvonal 260 karakterig biztos; a mappanév-részek már korlátozottak, de egy
// mélyen fekvő gyökér a mélyebb verziómappákat a korlát fölé tolhatja.
const HOSSZU_GYOKER = 120;

/** A verziómappa PDF-jének neve -- a „Megnyitás” is ezt a fájlt adja a rendszer olvasójának. */
export const PDF_FAJLNEV = 'kezelesi-terv.pdf';

export type GyokerAllapot = 'ures' | 'mienk' | 'hianyos' | 'idegen';

export interface GyokerOsztaly {
  allapot: GyokerAllapot;
  /** `hianyos`-nál a hiányzó saját elemek. */
  hianyzik: string[];
  figyelmeztetesek: Array<'HOSSZU_UTVONAL'>;
}

export class FileSystemStorage extends FajlTarolo {
  readonly gyoker: string;

  constructor(prim: FsPrimitivek, opciok: { gepId?: string } = {}) {
    super(prim, {
      pdfFajlnev: PDF_FAJLNEV,
      mentesHibaUzenet: 'A tervet nem sikerült elmenteni. Semmi nem íródott félkészen.',
      verzioManifest: true,
      utkozesOr: true,
      gepId: opciok.gepId,
    });
    this.gyoker = prim.gyoker;
  }

  /** A gyökérmappa osztályozása írás nélkül -- az `init()` és a mappaválasztás is erre épül. */
  async osztalyoz(): Promise<GyokerOsztaly> {
    // A listázás egy hiányzó mappára üres listát adna, és az „üres” ágon az app a Drive
    // helyére saját struktúrát építene: a hiányzó gyökér hiba, nem üres mappa.
    if (!(await this.prim.letezik(''))) throw new IoError('ENOENT', this.gyoker);
    const nevek = new Set(await this.prim.listaz(''));
    const megvan = SAJAT_ELEMEK.filter((n) => nevek.has(n));
    const figyelmeztetesek: GyokerOsztaly['figyelmeztetesek'] =
      this.gyoker.length > HOSSZU_GYOKER ? ['HOSSZU_UTVONAL'] : [];
    const hianyzik = SAJAT_ELEMEK.filter((n) => !nevek.has(n));
    const allapot: GyokerAllapot =
      nevek.size === 0 ? 'ures' : megvan.length === 0 ? 'idegen' : hianyzik.length > 0 ? 'hianyos' : 'mienk';
    return { allapot, hianyzik: allapot === 'hianyos' ? hianyzik : [], figyelmeztetesek };
  }

  /**
   * A miénket validálja, máshova nem ír -- üresbe sem: egy korábban kiválasztott, de most üres
   * gyökér a Drive még le nem töltött állapota is lehet (migrációs terv §6.4). Új adatmappa csak
   * az `adatmappatLetrehoz`-zal, a hiány pótlása csak az `alapfajlokatPotol`-lal keletkezik.
   */
  override async init(): Promise<void> {
    const { allapot, hianyzik } = await this.osztalyoz();
    if (allapot === 'idegen') throw new IdegenMappaError();
    if (allapot === 'ures') throw new HianyosMappaError(SAJAT_ELEMEK);
    if (allapot === 'hianyos') throw new HianyosMappaError(hianyzik);
    await this.loadPriceList();
    await this.loadSettings();
  }

  /** Üres gyökérbe az alapkészlet (demó-páciens nélkül); nem üres mappába nem ír. */
  async adatmappatLetrehoz(): Promise<void> {
    const { allapot } = await this.osztalyoz();
    if (allapot !== 'ures') throw new IdegenMappaError();
    await this.hianyzotIr();
  }

  /**
   * Hiányos gyökérben csak a hiányzó saját elemeket írja meg, a meglévőkhöz nem nyúl. A hívó
   * dönti el, hogy a hiány nem félbemaradt szinkron.
   */
  async alapfajlokatPotol(): Promise<void> {
    const { allapot, hianyzik } = await this.osztalyoz();
    if (allapot === 'idegen' || allapot === 'ures') throw new IdegenMappaError();
    if (hianyzik.length) await this.hianyzotIr();
  }

  // Elemenként a létezés közvetlenül írás előtt: a listázás óta a Drive is lehozhatta.
  private async hianyzotIr(): Promise<void> {
    if (!(await this.prim.letezik(ARLISTA_FAJL))) await this.prim.irSzoveg(ARLISTA_FAJL, JSON.stringify(seedPriceList));
    if (!(await this.prim.letezik(BEALLITASOK_FAJL))) {
      await this.prim.irSzoveg(BEALLITASOK_FAJL, JSON.stringify(seedSettings));
    }
    if (!(await this.prim.letezik(SABLONOK_MAPPA))) {
      for (const [name, body] of DEFAULT_TEMPLATES) await this.prim.irSzoveg(utvonal(SABLONOK_MAPPA, name), body);
    }
    if (!(await this.prim.letezik(PACIENSEK_MAPPA))) await this.prim.mappaLetrehoz(PACIENSEK_MAPPA);
  }
}
