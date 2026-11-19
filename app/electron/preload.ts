// A renderer egyetlen híd-objektumot kap: a tároló-metódusok szűk `invoke`-ját. Más Node- vagy
// Electron-API nem jut át (migrációs terv §3.2).

import { contextBridge, ipcRenderer } from 'electron';
import {
  ADATMAPPA_ALLAPOT_CSATORNA,
  ADATMAPPA_HASZNAL_CSATORNA,
  ADATMAPPA_MEGNYIT_CSATORNA,
  ADATMAPPA_POTOL_CSATORNA,
  ADATMAPPA_UJRA_CSATORNA,
  ADATMAPPA_VALASZT_CSATORNA,
  ALAPSABLONOK_POTOL_CSATORNA,
  IMPORT_ELONEZET_CSATORNA,
  IMPORT_IR_CSATORNA,
  KILEPES_CSATORNA,
  MEGMUTAT_CSATORNA,
  MENTES_ALLAPOT_CSATORNA,
  MENTES_KESZIT_CSATORNA,
  NAPLO_MEGMUTAT_CSATORNA,
  PDF_MASOL_CSATORNA,
  PDF_MEGNYIT_CSATORNA,
  TAROLO_METODUSOK,
  taroloCsatorna,
  ZARAS_CSATORNA,
  type TaroloHid,
} from '../src/storage/taroloIpc';

const engedett = new Set<string>(TAROLO_METODUSOK);

const hid: TaroloHid = {
  // Szinkron, mert a renderer a tárolót az első renderkor választja ki.
  adatmappa: ipcRenderer.sendSync(ADATMAPPA_ALLAPOT_CSATORNA) ?? null,
  hiv: (metodus, ...args) =>
    engedett.has(metodus)
      ? ipcRenderer.invoke(taroloCsatorna(metodus), ...args)
      : Promise.reject(new Error(`Ismeretlen tároló-metódus: ${String(metodus)}`)),
  megmutat: (relUtvonal) => ipcRenderer.invoke(MEGMUTAT_CSATORNA, relUtvonal),
  pdfMegnyit: (ref) => ipcRenderer.invoke(PDF_MEGNYIT_CSATORNA, ref),
  pdfMasol: (forras, javasoltNev) => ipcRenderer.invoke(PDF_MASOL_CSATORNA, forras, javasoltNev),
  naploMegmutat: () => ipcRenderer.invoke(NAPLO_MEGMUTAT_CSATORNA),
  adatmappaValaszt: () => ipcRenderer.invoke(ADATMAPPA_VALASZT_CSATORNA),
  adatmappaUjra: () => ipcRenderer.invoke(ADATMAPPA_UJRA_CSATORNA),
  adatmappaPotol: () => ipcRenderer.invoke(ADATMAPPA_POTOL_CSATORNA),
  adatmappaHasznal: (letrehoz) => ipcRenderer.invoke(ADATMAPPA_HASZNAL_CSATORNA, letrehoz),
  adatmappaMegnyit: () => ipcRenderer.invoke(ADATMAPPA_MEGNYIT_CSATORNA),
  alapsablonokPotol: () => ipcRenderer.invoke(ALAPSABLONOK_POTOL_CSATORNA),
  mentesAllapot: () => ipcRenderer.invoke(MENTES_ALLAPOT_CSATORNA),
  mentesKeszit: () => ipcRenderer.invoke(MENTES_KESZIT_CSATORNA),
  importElonezet: (mod) => ipcRenderer.invoke(IMPORT_ELONEZET_CSATORNA, mod),
  importIr: () => ipcRenderer.invoke(IMPORT_IR_CSATORNA),
  zarasra: (fn) => {
    // Az eseményobjektum nem jut át a rendererbe: a `sender` a teljes webContents volna.
    const figyelo = () => fn();
    ipcRenderer.on(ZARAS_CSATORNA, figyelo);
    return () => void ipcRenderer.off(ZARAS_CSATORNA, figyelo);
  },
  kilepes: () => ipcRenderer.invoke(KILEPES_CSATORNA),
};

contextBridge.exposeInMainWorld('mandokiTarolo', hid);
