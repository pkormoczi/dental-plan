import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session, shell } from 'electron';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ADATMAPPA_ALLAPOT_CSATORNA, ZARAS_CSATORNA } from '../src/storage/taroloIpc';
import { Adatmappa } from './adatmappa.js';
import { buildFajlUtvonal, mimeTipus } from './buildKiszolgalas.js';
import { PDF_FAJLNEV } from './fileSystemStorage.js';
import {
  adatmappaKezelok,
  kilepesKezelo,
  kuldoEllenor,
  megmutatKezelo,
  naploKezelo,
  pdfKezelok,
  taroloKezelok,
} from './ipcKezelok.js';
import { gyokerNaplozo, Naplo, type Naplozo } from './naplo.js';
import { zarasOr, type ZarasOr } from './zaras.js';
import { menuSablon } from './menu.js';
import { foablakNavigacioEngedett, pdfAblakNavigacioEngedett, sajatOrigin, ujAblakEngedett } from './navigacio.js';
import { APP_ID, APP_ORIGIN, APP_PROTOKOLL, USER_DATA_MAPPA } from './protocol.js';

const RENDERER_GYOKER = path.join(import.meta.dirname, '..', 'renderer');
const PRELOAD = path.join(import.meta.dirname, '..', 'preload', 'preload.cjs');

// Csak csomagolatlan futásban: egy telepített app parancssori kapcsolóval nem irányítható
// idegen URL-re.
const DEV_SZERVER_KAPCSOLO = '--dev-server=';
const devSzerver = app.isPackaged
  ? undefined
  : process.argv.find((a) => a.startsWith(DEV_SZERVER_KAPCSOLO))?.slice(DEV_SZERVER_KAPCSOLO.length);
const betoltendo = devSzerver ?? `${APP_ORIGIN}/index.html`;

// A csomagolatlan futás (fejlesztés, kézi production-próba) sosem nyúl egy ugyanazon a gépen
// telepített app piszkozatához; a füst-teszt (`app/e2e/`) pedig minden futásra friss, ideiglenes
// mappát ad -- kizárólag erre szolgál ez a változó. Az egy-példány zár is a userData-ban él,
// ezért ez előtte áll.
const TESZT_USER_DATA = process.env.DENTAL_PLAN_TESZT_USER_DATA;
// Csak ideiglenes userData mellett, hogy egy telepített app beállításához ne érjen: a héj
// tesztjei (CSP, PDF, navigáció) a demó-tárolón, adatmappa nélkül futnak, a fájlrendszeres
// tesztben pedig a natív mappaválasztó helyett a teszt adja a választott mappát.
const TESZT_DEMO = TESZT_USER_DATA != null && process.env.DENTAL_PLAN_TESZT_DEMO === '1';
const TESZT_MAPPAVALASZTAS = TESZT_USER_DATA != null ? process.env.DENTAL_PLAN_TESZT_MAPPAVALASZTAS : undefined;

app.setPath(
  'userData',
  TESZT_USER_DATA ??
    path.join(app.getPath('appData'), app.isPackaged ? USER_DATA_MAPPA : `${USER_DATA_MAPPA}-dev`),
);

protocol.registerSchemesAsPrivileged([
  { scheme: APP_PROTOKOLL, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  inditas();
}

function inditas(): void {
  let foablak: BrowserWindow | null = null;
  // Helyi diagnosztikai napló a `userData` alatt; csak a fájlrendszeres tároló ír bele, mindig
  // az aktuális adatmappához redaktálva.
  const naplo = new Naplo(path.join(app.getPath('userData'), 'naplo'));
  let gyokerNaplo: Naplozo | undefined;
  const naplozo: Naplozo = (muvelet, err, ut) => gyokerNaplo?.(muvelet, err, ut);
  const adatmappa = TESZT_DEMO
    ? null
    : new Adatmappa({
        userData: app.getPath('userData'),
        mappatValaszt: async () => {
          if (TESZT_MAPPAVALASZTAS) return TESZT_MAPPAVALASZTAS;
          const opciok: Electron.OpenDialogOptions = {
            title: 'Adatmappa kiválasztása',
            properties: ['openDirectory', 'createDirectory'],
          };
          const valasz = foablak ? await dialog.showOpenDialog(foablak, opciok) : await dialog.showOpenDialog(opciok);
          return valasz.canceled ? null : (valasz.filePaths[0] ?? null);
        },
        aktivalva: (gyoker) => {
          gyokerNaplo = gyokerNaplozo(naplo, gyoker);
          void naplo.fejlec({ verzio: app.getVersion(), os: `${process.platform} ${os.release()}`, gyoker });
        },
      });
  const kuldoEngedett = kuldoEllenor(() => foablak, sajatOrigin(betoltendo));
  const zaras = zarasOr({
    kepernyotKer: () => foablak?.webContents.send(ZARAS_CSATORNA),
    bezar: () => foablak?.close(),
  });
  const irasTortent = () => zaras.irasTortent();
  ipcMain.on(ADATMAPPA_ALLAPOT_CSATORNA, (e) => {
    e.returnValue = adatmappa && kuldoEngedett(e) ? adatmappa.allapot : null;
  });
  kilepesKezelo(ipcMain, kuldoEngedett, () => zaras.kilep());
  if (adatmappa) {
    const aktivPrim = () => {
      if (!adatmappa.prim) throw new Error('Nincs megnyitott adatmappa.');
      return adatmappa.prim;
    };
    const prim = { abszolut: async (ut: string) => aktivPrim().abszolut(ut) };
    taroloKezelok(ipcMain, () => adatmappa.tarolo, kuldoEngedett, naplozo, irasTortent);
    // Csak a gyökér maga nyílik meg (`openPath`): mappa, nem futtatható fájl.
    adatmappaKezelok(ipcMain, adatmappa, kuldoEngedett, { mappatMegnyit: (abs) => shell.openPath(abs) }, irasTortent);
    naploKezelo(ipcMain, kuldoEngedett, async () => {
      await mkdir(naplo.mappa, { recursive: true });
      const vanFajl = await stat(naplo.fajl).then(() => true, () => false);
      shell.showItemInFolder(vanFajl ? naplo.fajl : naplo.mappa);
    });
    // Csak kijelölés a fájlkezelőben: megnyitás vagy futtatás (`openPath`, `openExternal`) nincs.
    megmutatKezelo(ipcMain, prim, kuldoEngedett, (abs) => shell.showItemInFolder(abs), naplozo);
    const pdfTarolo = {
      loadPlanPdf: async (ref: Parameters<NonNullable<typeof adatmappa.tarolo>['loadPlanPdf']>[0]) => {
        if (!adatmappa.tarolo) throw new Error('Nincs megnyitott adatmappa.');
        return adatmappa.tarolo.loadPlanPdf(ref);
      },
    };
    pdfKezelok(ipcMain, pdfTarolo, prim, PDF_FAJLNEV, kuldoEngedett, {
      megnyit: (abs) => shell.openPath(abs),
      // A Letöltések OneDrive-ra szinkronizálhat, a gyökérmappa a Drive-é: az alapmappa a
      // Dokumentumok (PRODUCT.md § Adat- és deployment-korlátok).
      helyetValaszt: async (nev) => {
        const opciok = {
          defaultPath: path.join(app.getPath('documents'), nev),
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        };
        const valasz = foablak ? await dialog.showSaveDialog(foablak, opciok) : await dialog.showSaveDialog(opciok);
        return valasz.canceled || !valasz.filePath ? null : valasz.filePath;
      },
      ir: (ut, bajtok) => writeFile(ut, bajtok),
    }, naplozo);
  }

  app.on('second-instance', () => {
    if (!foablak) return;
    if (foablak.isMinimized()) foablak.restore();
    foablak.focus();
  });

  app.on('window-all-closed', () => app.quit());

  void app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
    // Windowson az Electron a helyesírási szótárat a Google CDN-ről töltené le -- kimenő
    // kapcsolat lenne (PRODUCT.md § Adat- és deployment-korlátok).
    session.defaultSession.setSpellCheckerEnabled(false);
    protocol.handle(APP_PROTOKOLL, kiszolgal);
    Menu.setApplicationMenu(
      Menu.buildFromTemplate(menuSablon({ platform: process.platform, appNev: app.name, fejlesztoi: !app.isPackaged })),
    );
    // A renderer a preloadban, szinkron kérdezi az állapotot: az ablak csak a vizsgálat után nyílik.
    await adatmappa?.indul().catch(() => {});
    foablak = ablakNyitas(zaras);
  });
}

// `fs`-ből és nem `net.fetch`-csel, így az Electron `net` modulja kivétel nélkül tiltható (oxlint).
async function kiszolgal(keres: Request): Promise<Response> {
  const fajl = buildFajlUtvonal(RENDERER_GYOKER, keres.url);
  if (!fajl) return new Response(null, { status: 404 });
  try {
    const tartalom = await readFile(fajl);
    return new Response(new Uint8Array(tartalom), { headers: { 'content-type': mimeTipus(fajl) } });
  } catch {
    return new Response(null, { status: 404 });
  }
}

const WEB_BEALLITASOK = {
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  // A PDF-előnézet iframe-je és a PDF-ablak a Chromium beépített PDF-nézegetőjét használja.
  plugins: true,
  spellcheck: false,
} as const;

function ablakNyitas(zaras: ZarasOr): BrowserWindow {
  // A preload csak a főablakba kerül; a PDF-ablak a tárolót nem éri el.
  const ablak = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    webPreferences: { ...WEB_BEALLITASOK, preload: PRELOAD },
  });
  ablak.once('ready-to-show', () => {
    ablak.maximize();
    ablak.show();
  });
  ablak.on('close', (e) => {
    if (!zaras.bezarhato()) e.preventDefault();
  });
  // A főablak bezárása macOS-en is kilépés: a gépváltási szabály egyértelmű „app bezárva”
  // állapotot kér (PRODUCT.md § Adat- és deployment-korlátok).
  ablak.on('closed', () => app.quit());
  // A Ctrl/Cmd+görgő csak eseményt ad, a nagyítást az appnak kell elvégeznie.
  ablak.webContents.on('zoom-changed', (_e, irany) => {
    const szint = ablak.webContents.getZoomLevel() + (irany === 'in' ? 0.5 : -0.5);
    ablak.webContents.setZoomLevel(Math.min(5, Math.max(-3, szint)));
  });
  navigacioOr(ablak, sajatOrigin(betoltendo));
  betoltes(ablak, betoltendo);
  return ablak;
}

function navigacioOr(ablak: BrowserWindow, origin: string): void {
  const wc = ablak.webContents;
  const tilt = (e: Electron.Event, url: string) => {
    if (!foablakNavigacioEngedett(url, origin)) e.preventDefault();
  };
  wc.on('will-navigate', tilt);
  wc.on('will-redirect', tilt);
  wc.setWindowOpenHandler(({ url }) =>
    ujAblakEngedett(url)
      ? { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: WEB_BEALLITASOK } }
      : { action: 'deny' },
  );
  wc.on('did-create-window', (pdfAblak) => {
    const pdfTilt = (e: Electron.Event, url: string) => {
      if (!pdfAblakNavigacioEngedett(url, origin)) e.preventDefault();
    };
    pdfAblak.webContents.on('will-navigate', pdfTilt);
    pdfAblak.webContents.on('will-redirect', pdfTilt);
    pdfAblak.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}

function betoltes(ablak: BrowserWindow, url: string): void {
  if (!devSzerver) {
    void ablak.loadURL(url);
    return;
  }
  // Az `electron:dev` a Vite-tal párhuzamosan indul, a dev szerver az első betöltéskor még
  // nem feltétlen fogad kérést.
  let probalkozas = 0;
  const ABORTED = -3;
  ablak.webContents.on('did-fail-load', (_e, kod, _leiras, _url, foKeret) => {
    if (!foKeret || kod === ABORTED || probalkozas++ >= 40) return;
    setTimeout(() => void ablak.loadURL(url).catch(() => {}), 250);
  });
  void ablak.loadURL(url).catch(() => {});
}
