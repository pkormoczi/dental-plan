import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
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

// Minden futás friss, ideiglenes userData-t kap: a teszt sosem a fejlesztő vagy egy telepített
// app piszkozatán dolgozik (root CLAUDE.md § Böngésző-automatizálás). A `gyoker` megadásával az
// app a fájlrendszeres tárolón fut, abban az ideiglenes mappában.
export async function inditas(opciok: { gyoker?: string } = {}): Promise<FutoApp> {
  const userData = mkdtempSync(path.join(os.tmpdir(), 'mandoki-fust-'));
  const { exe, args } = inditasiParancs();
  const app = await electron.launch({
    executablePath: exe,
    args,
    cwd: APP_KONYVTAR,
    env: {
      ...process.env,
      DENTAL_PLAN_TESZT_USER_DATA: userData,
      ...(opciok.gyoker ? { DENTAL_PLAN_TESZT_GYOKER: opciok.gyoker } : {}),
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
      rmSync(userData, { recursive: true, force: true });
    },
  };
}
