import { app, BrowserWindow, Menu, protocol, session } from 'electron';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildFajlUtvonal, mimeTipus } from './buildKiszolgalas.js';
import { menuSablon } from './menu.js';
import { APP_ORIGIN, APP_PROTOKOLL, USER_DATA_MAPPA } from './protocol.js';

const RENDERER_GYOKER = path.join(import.meta.dirname, '..', 'renderer');

// Csak csomagolatlan futásban: egy telepített app parancssori kapcsolóval nem irányítható
// idegen URL-re.
const DEV_SZERVER_KAPCSOLO = '--dev-server=';
const devSzerver = app.isPackaged
  ? undefined
  : process.argv.find((a) => a.startsWith(DEV_SZERVER_KAPCSOLO))?.slice(DEV_SZERVER_KAPCSOLO.length);

// A csomagolatlan futás (fejlesztés, kézi production-próba) sosem nyúl egy ugyanazon a gépen
// telepített app piszkozatához; a füst-teszt (`app/e2e/`) pedig minden futásra friss, ideiglenes
// mappát ad -- kizárólag erre szolgál ez a változó. Az egy-példány zár is a userData-ban él,
// ezért ez előtte áll.
const TESZT_USER_DATA = process.env.DENTAL_PLAN_TESZT_USER_DATA;
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

  app.on('second-instance', () => {
    if (!foablak) return;
    if (foablak.isMinimized()) foablak.restore();
    foablak.focus();
  });

  app.on('window-all-closed', () => app.quit());

  void app.whenReady().then(() => {
    // Windowson az Electron a helyesírási szótárat a Google CDN-ről töltené le -- kimenő
    // kapcsolat lenne (PRODUCT.md § Adat- és deployment-korlátok).
    session.defaultSession.setSpellCheckerEnabled(false);
    protocol.handle(APP_PROTOKOLL, kiszolgal);
    Menu.setApplicationMenu(
      Menu.buildFromTemplate(menuSablon({ platform: process.platform, appNev: app.name, fejlesztoi: !app.isPackaged })),
    );
    foablak = ablakNyitas();
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

function ablakNyitas(): BrowserWindow {
  const ablak = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // A PDF-előnézet iframe-je a Chromium beépített PDF-nézegetőjét használja.
      plugins: true,
      spellcheck: false,
    },
  });
  ablak.once('ready-to-show', () => {
    ablak.maximize();
    ablak.show();
  });
  // A főablak bezárása macOS-en is kilépés: a gépváltási szabály egyértelmű „app bezárva”
  // állapotot kér (PRODUCT.md § Adat- és deployment-korlátok).
  ablak.on('closed', () => app.quit());
  // A Ctrl/Cmd+görgő csak eseményt ad, a nagyítást az appnak kell elvégeznie.
  ablak.webContents.on('zoom-changed', (_e, irany) => {
    const szint = ablak.webContents.getZoomLevel() + (irany === 'in' ? 0.5 : -0.5);
    ablak.webContents.setZoomLevel(Math.min(5, Math.max(-3, szint)));
  });
  betoltes(ablak);
  return ablak;
}

function betoltes(ablak: BrowserWindow): void {
  if (!devSzerver) {
    void ablak.loadURL(`${APP_ORIGIN}/index.html`);
    return;
  }
  const url = devSzerver;
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
