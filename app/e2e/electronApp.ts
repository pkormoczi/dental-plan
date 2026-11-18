import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const APP_KONYVTAR = path.resolve(import.meta.dirname, '..');

// A teszt a kicsomagolt csomagot (`electron:package:dir`) indítja, nem a csupasz buildet: az
// asar-ba csomagolás és a csomagolt protokoll-kiszolgálás hibája csak így jön elő. macOS-en a
// `.app` és a bináris is a `productName`-et viseli: egy ottani `executableName` a Finderben
// látszó csomagnevet is átírná. macOS-en a kiadott alakú universal csomag fut -- a helyi
// `electron:package:dir` és a release-ben az `electron:package` is ezt építi --, a gép a saját
// architektúrájú szeletét indítja.
export function inditasiParancs(): { exe: string; args: string[] } {
  const exe =
    process.platform === 'darwin'
      ? path.join(APP_KONYVTAR, 'release', 'mac-universal', 'Mandoki Dental.app', 'Contents', 'MacOS', 'Mandoki Dental')
      : path.join(APP_KONYVTAR, 'release', 'win-unpacked', 'mandoki-dental.exe');
  if (!existsSync(exe)) throw new Error(`Nincs kicsomagolt app: ${exe} -- futtasd: npm run test:electron`);
  return { exe, args: [] };
}

export type FutoApp = {
  app: ElectronApplication;
  page: Page;
  userData: string;
  // CSP-sértés és elkapatlan renderer-hiba; a teszt végén üresnek kell lennie.
  hibak: string[];
  leallitas: () => Promise<void>;
};

export function ujUserData(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'mandoki-fust-'));
}

/** Egy korábbi futás configja: az app ezzel a mappával indul, varázsló nélkül. */
export function configIr(userData: string, gyokerMappa: string): void {
  writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ schemaVersion: 1, gyokerMappa, gepId: 'e2e' }));
}

// Minden futás ideiglenes userData-t kap: a teszt sosem a fejlesztő vagy egy telepített app
// piszkozatán és beállításán dolgozik (root CLAUDE.md § Böngésző-automatizálás). `demo`: a héj
// tesztjei a demó-tárolón, adatmappa nélkül futnak. `mappaValasztas` és `mentesCel`: a natív
// mappaválasztó és mentés-dialógus helyett ezt kapja az app. Egy átadott `userData`
// (újraindításhoz) a leállításkor megmarad, a hívó takarít.
export async function inditas(
  opciok: { demo?: boolean; mappaValasztas?: string; mentesCel?: string; userData?: string } = {},
): Promise<FutoApp> {
  const sajatUserData = opciok.userData == null;
  const userData = opciok.userData ?? ujUserData();
  const { exe, args } = inditasiParancs();
  const app = await electron.launch({
    executablePath: exe,
    args,
    cwd: APP_KONYVTAR,
    env: {
      ...process.env,
      DENTAL_PLAN_TESZT_USER_DATA: userData,
      ...(opciok.demo ? { DENTAL_PLAN_TESZT_DEMO: '1' } : {}),
      ...(opciok.mappaValasztas ? { DENTAL_PLAN_TESZT_MAPPAVALASZTAS: opciok.mappaValasztas } : {}),
      ...(opciok.mentesCel ? { DENTAL_PLAN_TESZT_MENTES_CEL: opciok.mentesCel } : {}),
    },
  });
  const page = await app.firstWindow();
  const hibak: string[] = [];
  page.on('console', (uzenet) => {
    if (/Content Security Policy/i.test(uzenet.text())) hibak.push(`CSP: ${uzenet.text()}`);
  });
  page.on('pageerror', (hiba) => hibak.push(`pageerror: ${hiba.message}`));
  // A figyelők az első ablak létrejötte után kapcsolódnak; az újratöltés a teljes betöltést
  // már megfigyelve futtatja le.
  await page.reload();
  return {
    app,
    page,
    userData,
    hibak,
    leallitas: async () => {
      // A főablak bezárása maga is kilépés; a már leállt appon a close() nem dob.
      await app.close().catch(() => {});
      if (sajatUserData) rmSync(userData, { recursive: true, force: true });
    },
  };
}
