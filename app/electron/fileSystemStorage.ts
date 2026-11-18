// A `PlanStorage` a valódi gyökérmappán: a közös mag (`FajlTarolo`) fs-primitíveken
// (migrációs terv §4).

import { alapKeszletetIr, FajlTarolo, PACIENSEK_MAPPA } from '../src/storage/fajlTarolo';
import { HianyosMappaError, IdegenMappaError, IoError } from '../src/storage/taroloHibak';
import type { FsPrimitivek } from './fsPrimitivek';

/** A gyökér akkor a miénk, ha mind a négy megvan; ha csak egy része, hiányos. */
const SAJAT_ELEMEK = ['arlista.json', 'beallitasok.json', PACIENSEK_MAPPA, 'sablonok'];

// Windowson a teljes útvonal 260 karakterig biztos; a mappanév-részek már korlátozottak, de egy
// mélyen fekvő gyökér a mélyebb verziómappákat a korlát fölé tolhatja.
const HOSSZU_GYOKER = 120;

export type GyokerAllapot = 'ures' | 'mienk' | 'hianyos' | 'idegen';

export interface GyokerOsztaly {
  allapot: GyokerAllapot;
  /** `hianyos`-nál a hiányzó saját elemek. */
  hianyzik: string[];
  figyelmeztetesek: Array<'HOSSZU_UTVONAL'>;
}

export class FileSystemStorage extends FajlTarolo {
  readonly gyoker: string;

  constructor(prim: FsPrimitivek) {
    super(prim, {
      pdfFajlnev: 'kezelesi-terv.pdf',
      mentesHibaUzenet: 'A tervet nem sikerült elmenteni. Semmi nem íródott félkészen.',
      verzioManifest: true,
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
   * Üres gyökérbe az alapkészlet kerül (demó-páciens nélkül); a miénket csak validálja. Hiányos
   * vagy idegen mappába nem ír: a hiány félbemaradt szinkron is lehet, a pótlás csak explicit
   * akcióra történhet.
   */
  override async init(): Promise<void> {
    const { allapot, hianyzik } = await this.osztalyoz();
    if (allapot === 'idegen') throw new IdegenMappaError();
    if (allapot === 'hianyos') throw new HianyosMappaError(hianyzik);
    if (allapot === 'ures') {
      await alapKeszletetIr(this.prim);
      await this.prim.mappaLetrehoz(PACIENSEK_MAPPA);
      return;
    }
    await this.loadPriceList();
    await this.loadSettings();
  }
}
