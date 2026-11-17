import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

export const APP_KONYVTAR = path.resolve(import.meta.dirname, '..');

// FUST_TESZT_CSOMAG: a csomagolt app futtatható fájlja; nélküle a production-módú build indul
// a node_modules Electronjával.
export function inditasiParancs(): { exe: string; args: string[] } {
  const csomag = process.env.FUST_TESZT_CSOMAG;
  if (csomag) return { exe: path.resolve(APP_KONYVTAR, csomag), args: [] };
  return { exe: createRequire(import.meta.url)('electron') as string, args: ['.'] };
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
// app piszkozatán dolgozik (root CLAUDE.md § Böngésző-automatizálás).
export async function inditas(): Promise<FutoApp> {
  const userData = mkdtempSync(path.join(os.tmpdir(), 'mandoki-fust-'));
  const { exe, args } = inditasiParancs();
  const app = await electron.launch({
    executablePath: exe,
    args,
    cwd: APP_KONYVTAR,
    env: { ...process.env, DENTAL_PLAN_TESZT_USER_DATA: userData },
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
