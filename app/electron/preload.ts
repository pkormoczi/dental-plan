// A renderer egyetlen híd-objektumot kap: a tároló-metódusok szűk `invoke`-ját. Más Node- vagy
// Electron-API nem jut át (migrációs terv §3.2).

import { contextBridge, ipcRenderer } from 'electron';
import {
  AKTIV_CSATORNA,
  MEGMUTAT_CSATORNA,
  NAPLO_MEGMUTAT_CSATORNA,
  PDF_MASOL_CSATORNA,
  PDF_MEGNYIT_CSATORNA,
  TAROLO_METODUSOK,
  taroloCsatorna,
  type TaroloHid,
} from '../src/storage/taroloIpc';

const engedett = new Set<string>(TAROLO_METODUSOK);

const hid: TaroloHid = {
  // Szinkron, mert a renderer a tárolót az első renderkor választja ki.
  aktiv: ipcRenderer.sendSync(AKTIV_CSATORNA) === true,
  hiv: (metodus, ...args) =>
    engedett.has(metodus)
      ? ipcRenderer.invoke(taroloCsatorna(metodus), ...args)
      : Promise.reject(new Error(`Ismeretlen tároló-metódus: ${String(metodus)}`)),
  megmutat: (relUtvonal) => ipcRenderer.invoke(MEGMUTAT_CSATORNA, relUtvonal),
  pdfMegnyit: (ref) => ipcRenderer.invoke(PDF_MEGNYIT_CSATORNA, ref),
  pdfMasol: (forras, javasoltNev) => ipcRenderer.invoke(PDF_MASOL_CSATORNA, forras, javasoltNev),
  naploMegmutat: () => ipcRenderer.invoke(NAPLO_MEGMUTAT_CSATORNA),
};

contextBridge.exposeInMainWorld('mandokiTarolo', hid);
