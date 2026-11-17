// A tároló IPC-csatornái a main oldalon (migrációs terv §3.2–§3.3): minden hívás előbb a
// küldőt, majd a paramétereket ellenőrzi, és kivétel helyett hibaeredményt ad vissza.

import type { PlanStorage } from '../src/storage/PlanStorage';
import { TiltottKuldoError, TorlesAkadalyError } from '../src/storage/taroloHibak';
import {
  hibaBolStorageHiba,
  TAROLO_METODUSOK,
  taroloCsatorna,
  type IpcEredmeny,
  type TaroloMetodus,
} from '../src/storage/taroloIpc';
import { ervenyesArgumentumok } from './ipcValidate';
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
