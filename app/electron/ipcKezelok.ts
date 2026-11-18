// A tároló IPC-csatornái a main oldalon (migrációs terv §3.2–§3.3): minden hívás előbb a
// küldőt, majd a paramétereket ellenőrzi, és kivétel helyett hibaeredményt ad vissza.

import path from 'node:path';
import type { PlanStorage } from '../src/storage/PlanStorage';
import {
  ErvenytelenParameterError,
  IoError,
  ioErrno,
  TiltottKuldoError,
  TorlesAkadalyError,
} from '../src/storage/taroloHibak';
import {
  ADATMAPPA_HASZNAL_CSATORNA,
  ADATMAPPA_MEGNYIT_CSATORNA,
  ADATMAPPA_POTOL_CSATORNA,
  ADATMAPPA_UJRA_CSATORNA,
  ADATMAPPA_VALASZT_CSATORNA,
  ALAPSABLONOK_POTOL_CSATORNA,
  hibaBolStorageHiba,
  KILEPES_CSATORNA,
  MEGMUTAT_CSATORNA,
  NAPLO_MEGMUTAT_CSATORNA,
  PDF_MASOL_CSATORNA,
  PDF_MEGNYIT_CSATORNA,
  TAROLO_METODUSOK,
  taroloCsatorna,
  type AdatmappaAllapot,
  type IpcEredmeny,
  type MappaVizsgalat,
  type TaroloMetodus,
} from '../src/storage/taroloIpc';
import { ervenyesArgumentumok, gyokerRelativUtvonal, pdfFajlnev, pdfForras, planRef } from './ipcValidate';
import type { Naplozo } from './naplo';
import { sajatOrigin } from './navigacio';

export interface KuldoEsemeny {
  senderFrame: { url: string } | null;
}

/** A hívás csak a főablak top-frame-jéből, a saját originről érvényes -- a PDF-ablakból sem. */
export function kuldoEllenor(
  foablak: () => { webContents: { mainFrame: unknown } } | null,
  origin: string,
): (e: KuldoEsemeny) => boolean {
  return (e) => {
    const frame = e.senderFrame;
    const ablak = foablak();
    if (!frame || !ablak || frame !== ablak.webContents.mainFrame) return false;
    try {
      return sajatOrigin(frame.url) === origin;
    } catch {
      return false;
    }
  };
}

export interface IpcRegisztralo {
  handle(csatorna: string, kezelo: (e: KuldoEsemeny, ...args: unknown[]) => Promise<unknown>): void;
}

/**
 * A renderer a törlés előtt ellenőrzi az akadályt, de Drive mellett azóta a másik gépről terv
 * érkezhetett: a main közvetlenül a törlés előtt újra megnézi. A piszkozatos akadályt nem látja
 * -- a piszkozat a renderer localStorage-ában él.
 */
async function torlesElott(tarolo: PlanStorage, patientDir: string): Promise<void> {
  for (const lanc of await tarolo.listPlans(patientDir)) {
    if ((await tarolo.listVersions(patientDir, lanc.dirName)).length > 0) {
      throw new TorlesAkadalyError('veglegesitett-terv');
    }
  }
}

/** A napló saját hibája sosem írhatja felül a hívás eredményét. */
function naploz(naplozo: Naplozo | undefined, muvelet: string, err: unknown, hivasUtvonal?: string): void {
  try {
    naplozo?.(muvelet, err, hivasUtvonal);
  } catch {
    // lásd a függvény kommentjét
  }
}

/** A hívás saját, gyökérhez relatív útja a már ellenőrzött paraméterekből -- a hibának nem mindig van sajátja. */
function hivasUtvonal(metodus: TaroloMetodus, args: unknown[]): string | undefined {
  const [a, b, c] = args;
  switch (metodus) {
    case 'loadPlan':
    case 'loadPlanPdf': {
      const ref = a as { patientDir: string; planDir: string; versionDir: string };
      return `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}`;
    }
    case 'listPlans':
    case 'loadPatientData':
    case 'savePatientData':
    case 'deletePatient':
      return `paciensek/${String(a)}`;
    case 'listVersions':
    case 'savePlanLabel':
      return `paciensek/${String(a)}/${String(b)}`;
    case 'savePlanErvenytelenites':
      return `paciensek/${String(a)}/${String(b)}/${String(c)}`;
    default:
      return undefined;
  }
}

export async function taroloHivas(
  tarolo: PlanStorage,
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
  metodus: TaroloMetodus,
  e: KuldoEsemeny,
  args: unknown[],
  naplozo?: Naplozo,
): Promise<IpcEredmeny<unknown>> {
  let ervenyes: unknown[] | null = null;
  try {
    if (!kuldoEngedett(e)) throw new TiltottKuldoError();
    ervenyes = ervenyesArgumentumok(metodus, args);
    if (metodus === 'deletePatient') await torlesElott(tarolo, ervenyes[0] as string);
    const fn = tarolo[metodus] as (...a: unknown[]) => Promise<unknown>;
    return { ok: true, ertek: await fn.apply(tarolo, ervenyes) };
  } catch (err) {
    naploz(naplozo, metodus, err, ervenyes ? hivasUtvonal(metodus, ervenyes) : undefined);
    return { ok: false, hiba: hibaBolStorageHiba(err) };
  }
}

/** A gyökérmappába író metódusok: sikerük után a kilépés a Drive-feltöltésre emlékeztet. */
export const IRO_METODUSOK: ReadonlySet<TaroloMetodus> = new Set([
  'savePlan',
  'savePlanLabel',
  'savePlanErvenytelenites',
  'savePriceList',
  'saveSettings',
  'saveTemplate',
  'savePatientData',
  'createPatient',
  'deletePatient',
]);

/**
 * A tároló az aktuális adatmappáé: mappaváltáskor cserélődik, a csatornák egyszer regisztráltak.
 * Adatmappa nélkül (varázsló, blokkoló képernyő) minden hívás hibát ad.
 */
export function taroloKezelok(
  ipc: IpcRegisztralo,
  tarolo: () => PlanStorage | null,
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
  naplozo?: Naplozo,
  irasTortent?: () => void,
): void {
  for (const metodus of TAROLO_METODUSOK) {
    ipc.handle(taroloCsatorna(metodus), async (e, ...args) => {
      const aktiv = tarolo();
      if (!aktiv) return { ok: false, hiba: hibaBolStorageHiba(new Error('Nincs megnyitott adatmappa.')) };
      const eredmeny = await taroloHivas(aktiv, kuldoEngedett, metodus, e, args, naplozo);
      if (eredmeny.ok && IRO_METODUSOK.has(metodus)) irasTortent?.();
      return eredmeny;
    });
  }
}

/**
 * A „Mappa megnyitása” csatornája: csak a főablakból, csak a gyökérmappán belüli elemre. A
 * renderer útvonalat ad, nem abszolút utat -- a feloldás és a gyökérbe zárás a main dolga.
 */
export function megmutatKezelo(
  ipc: IpcRegisztralo,
  prim: { abszolut(ut: string): Promise<string> },
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
  megmutat: (abszolut: string) => void,
  naplozo?: Naplozo,
): void {
  ipc.handle(MEGMUTAT_CSATORNA, async (e, relUtvonal): Promise<IpcEredmeny<void>> => {
    try {
      if (!kuldoEngedett(e)) throw new TiltottKuldoError();
      megmutat(await prim.abszolut(gyokerRelativUtvonal(relUtvonal)));
      return { ok: true, ertek: undefined };
    } catch (err) {
      naploz(naplozo, MEGMUTAT_CSATORNA, err);
      return { ok: false, hiba: hibaBolStorageHiba(err) };
    }
  });
}

/** A diagnosztikai napló mappája a rendszer fájlkezelőjében -- a „Napló megnyitása” csatornája. */
export function naploKezelo(
  ipc: IpcRegisztralo,
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
  megmutat: () => Promise<void>,
): void {
  ipc.handle(NAPLO_MEGMUTAT_CSATORNA, async (e): Promise<IpcEredmeny<void>> => {
    try {
      if (!kuldoEngedett(e)) throw new TiltottKuldoError();
      await megmutat();
      return { ok: true, ertek: undefined };
    } catch (err) {
      return { ok: false, hiba: hibaBolStorageHiba(err) };
    }
  });
}

/** Az operációs rendszer felé eső PDF-műveletek -- a tesztben cserélhetők. */
export interface PdfRendszer {
  /** A rendszer PDF-olvasója; sikernél üres szöveg, hibánál a hiba szövege (`shell.openPath`). */
  megnyit(abszolut: string): Promise<string>;
  /** Natív mentés-dialógus a javasolt névvel; a választott út, vagy `null`, ha a doki bezárta. */
  helyetValaszt(javasoltNev: string): Promise<string | null>;
  ir(ut: string, bajtok: Uint8Array): Promise<void>;
}

/**
 * „Megnyitás” és „Másolás máshová” (migrációs terv §5.3). A renderer verzió-hivatkozást vagy
 * bájtokat ad, célútvonalat soha: a hova-t a doki a natív dialógusban választja, így egy
 * kompromittált renderer sem írhat tetszőleges helyre. A verzió PDF-jét a tároló adja, ezért
 * hiányos verzió sem nem nyílik, sem nem másolódik.
 */
export function pdfKezelok(
  ipc: IpcRegisztralo,
  tarolo: Pick<PlanStorage, 'loadPlanPdf'>,
  prim: { abszolut(ut: string): Promise<string> },
  pdfNev: string,
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
  rendszer: PdfRendszer,
  naplozo?: Naplozo,
): void {
  const mentettPdf = async (ref: ReturnType<typeof planRef>): Promise<Uint8Array> => {
    const bajtok = await tarolo.loadPlanPdf(ref);
    if (!bajtok) throw new Error('Ehhez a verzióhoz nincs mentett PDF.');
    return bajtok;
  };
  const verzioUt = (ref: ReturnType<typeof planRef>) => `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}`;
  const kezel = <T>(csatorna: string, fn: (...args: unknown[]) => Promise<T>) =>
    async (e: KuldoEsemeny, ...args: unknown[]): Promise<IpcEredmeny<T>> => {
      try {
        if (!kuldoEngedett(e)) throw new TiltottKuldoError();
        return { ok: true, ertek: await fn(...args) };
      } catch (err) {
        let ut: string | undefined;
        try {
          const forras = csatorna === PDF_MEGNYIT_CSATORNA ? { ref: planRef(args[0]) } : pdfForras(args[0]);
          ut = 'ref' in forras ? verzioUt(forras.ref) : undefined;
        } catch {
          ut = undefined;
        }
        naploz(naplozo, csatorna, err, ut);
        return { ok: false, hiba: hibaBolStorageHiba(err) };
      }
    };

  ipc.handle(
    PDF_MEGNYIT_CSATORNA,
    kezel(PDF_MEGNYIT_CSATORNA, async (x) => {
      const ref = planRef(x);
      await mentettPdf(ref);
      const abs = await prim.abszolut(`${verzioUt(ref)}/${pdfNev}`);
      const hiba = await rendszer.megnyit(abs);
      if (hiba) throw new Error(`A PDF nem nyitható meg: ${hiba}`);
    }),
  );

  ipc.handle(
    PDF_MASOL_CSATORNA,
    kezel(PDF_MASOL_CSATORNA, async (x, nev): Promise<string | null> => {
      const forras = pdfForras(x);
      const javasolt = pdfFajlnev(nev);
      const bajtok = 'ref' in forras ? await mentettPdf(forras.ref) : forras.bajtok;
      const cel = await rendszer.helyetValaszt(javasolt);
      if (!cel) return null;
      try {
        await rendszer.ir(cel, bajtok);
      } catch (err) {
        throw new IoError(ioErrno((err as NodeJS.ErrnoException | null)?.code), cel);
      }
      return path.basename(cel);
    }),
  );
}

/** Az adatmappa main-oldali kezelője, ahogy a csatornák látják. */
export interface AdatmappaMuveletek {
  valaszt(): Promise<MappaVizsgalat | null>;
  ujraellenoriz(): Promise<AdatmappaAllapot>;
  potol(): Promise<MappaVizsgalat>;
  hasznal(letrehoz: boolean): Promise<MappaVizsgalat>;
  readonly tarolo: { gyoker: string; alapsablonokatPotol(): Promise<string[]> } | null;
}

/**
 * A varázsló, a blokkoló képernyő és az Adattárolás fül csatornái. A renderer útvonalat sosem
 * küld: a mappát a doki a natív dialógusban választja, a main jegyzi meg.
 */
export function adatmappaKezelok(
  ipc: IpcRegisztralo,
  adatmappa: AdatmappaMuveletek,
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
  rendszer: { mappatMegnyit(abszolut: string): Promise<string> },
  irasTortent: () => void,
): void {
  const kezel =
    <T>(fn: (...args: unknown[]) => Promise<T>) =>
    async (e: KuldoEsemeny, ...args: unknown[]): Promise<IpcEredmeny<T>> => {
      try {
        if (!kuldoEngedett(e)) throw new TiltottKuldoError();
        return { ok: true, ertek: await fn(...args) };
      } catch (err) {
        return { ok: false, hiba: hibaBolStorageHiba(err) };
      }
    };
  const aktivTarolo = () => {
    if (!adatmappa.tarolo) throw new Error('Nincs megnyitott adatmappa.');
    return adatmappa.tarolo;
  };

  ipc.handle(ADATMAPPA_VALASZT_CSATORNA, kezel(() => adatmappa.valaszt()));
  ipc.handle(ADATMAPPA_UJRA_CSATORNA, kezel(() => adatmappa.ujraellenoriz()));
  ipc.handle(
    ADATMAPPA_POTOL_CSATORNA,
    kezel(async () => {
      const v = await adatmappa.potol();
      irasTortent();
      return v;
    }),
  );
  ipc.handle(
    ADATMAPPA_HASZNAL_CSATORNA,
    kezel(async (letrehoz) => {
      if (typeof letrehoz !== 'boolean') throw new ErvenytelenParameterError('letrehoz');
      const v = await adatmappa.hasznal(letrehoz);
      if (letrehoz) irasTortent();
      return v;
    }),
  );
  ipc.handle(
    ADATMAPPA_MEGNYIT_CSATORNA,
    kezel(async () => {
      const hiba = await rendszer.mappatMegnyit(aktivTarolo().gyoker);
      if (hiba) throw new Error(`A mappa nem nyitható meg: ${hiba}`);
    }),
  );
  ipc.handle(
    ALAPSABLONOK_POTOL_CSATORNA,
    kezel(async () => {
      const irt = await aktivTarolo().alapsablonokatPotol();
      if (irt.length) irasTortent();
      return irt;
    }),
  );
}

/** A záró képernyő vége: a renderer jelzi, hogy a főablak bezárható. */
export function kilepesKezelo(ipc: IpcRegisztralo, kuldoEngedett: (e: KuldoEsemeny) => boolean, kilep: () => void): void {
  ipc.handle(KILEPES_CSATORNA, async (e): Promise<IpcEredmeny<void>> => {
    if (!kuldoEngedett(e)) return { ok: false, hiba: hibaBolStorageHiba(new TiltottKuldoError()) };
    kilep();
    return { ok: true, ertek: undefined };
  });
}
