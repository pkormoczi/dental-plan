// A tároló IPC-csatornái a main oldalon (migrációs terv §3.2–§3.3): minden hívás előbb a
// küldőt, majd a paramétereket ellenőrzi, és kivétel helyett hibaeredményt ad vissza.

import path from 'node:path';
import type { PlanStorage } from '../src/storage/PlanStorage';
import { IoError, ioErrno, TiltottKuldoError, TorlesAkadalyError } from '../src/storage/taroloHibak';
import {
  hibaBolStorageHiba,
  MEGMUTAT_CSATORNA,
  PDF_MASOL_CSATORNA,
  PDF_MEGNYIT_CSATORNA,
  TAROLO_METODUSOK,
  taroloCsatorna,
  type IpcEredmeny,
  type TaroloMetodus,
} from '../src/storage/taroloIpc';
import { ervenyesArgumentumok, gyokerRelativUtvonal, pdfFajlnev, pdfForras, planRef } from './ipcValidate';
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

export async function taroloHivas(
  tarolo: PlanStorage,
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
  metodus: TaroloMetodus,
  e: KuldoEsemeny,
  args: unknown[],
): Promise<IpcEredmeny<unknown>> {
  try {
    if (!kuldoEngedett(e)) throw new TiltottKuldoError();
    const ervenyes = ervenyesArgumentumok(metodus, args);
    if (metodus === 'deletePatient') await torlesElott(tarolo, ervenyes[0] as string);
    const fn = tarolo[metodus] as (...a: unknown[]) => Promise<unknown>;
    return { ok: true, ertek: await fn.apply(tarolo, ervenyes) };
  } catch (err) {
    return { ok: false, hiba: hibaBolStorageHiba(err) };
  }
}

export function taroloKezelok(
  ipc: IpcRegisztralo,
  tarolo: PlanStorage,
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
): void {
  for (const metodus of TAROLO_METODUSOK) {
    ipc.handle(taroloCsatorna(metodus), (e, ...args) => taroloHivas(tarolo, kuldoEngedett, metodus, e, args));
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
): void {
  ipc.handle(MEGMUTAT_CSATORNA, async (e, relUtvonal): Promise<IpcEredmeny<void>> => {
    try {
      if (!kuldoEngedett(e)) throw new TiltottKuldoError();
      megmutat(await prim.abszolut(gyokerRelativUtvonal(relUtvonal)));
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
): void {
  const mentettPdf = async (ref: ReturnType<typeof planRef>): Promise<Uint8Array> => {
    const bajtok = await tarolo.loadPlanPdf(ref);
    if (!bajtok) throw new Error('Ehhez a verzióhoz nincs mentett PDF.');
    return bajtok;
  };
  const kezel = <T>(fn: (...args: unknown[]) => Promise<T>) =>
    async (e: KuldoEsemeny, ...args: unknown[]): Promise<IpcEredmeny<T>> => {
      try {
        if (!kuldoEngedett(e)) throw new TiltottKuldoError();
        return { ok: true, ertek: await fn(...args) };
      } catch (err) {
        return { ok: false, hiba: hibaBolStorageHiba(err) };
      }
    };

  ipc.handle(
    PDF_MEGNYIT_CSATORNA,
    kezel(async (x) => {
      const ref = planRef(x);
      await mentettPdf(ref);
      const abs = await prim.abszolut(`paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/${pdfNev}`);
      const hiba = await rendszer.megnyit(abs);
      if (hiba) throw new Error(`A PDF nem nyitható meg: ${hiba}`);
    }),
  );

  ipc.handle(
    PDF_MASOL_CSATORNA,
    kezel(async (x, nev): Promise<string | null> => {
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
