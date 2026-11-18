import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { APP_KONYVTAR, inditas, inditasiParancs, type FutoApp } from './electronApp.js';

test.describe.serial('Electron füst-teszt', () => {
  let futo: FutoApp;

  test.beforeAll(async () => {
    futo = await inditas({ demo: true });
  });

  test.afterAll(async () => {
    await futo?.leallitas();
  });

  test('a főablak megnyílik az app:// originen, a Kezdőlap látszik', async () => {
    const { page } = futo;
    expect(page.url()).toMatch(/^app:\/\/mandoki-dental\//);
    await expect(page.getByText('Legutóbbi páciensek')).toBeVisible();
    expect(await page.title()).toContain('Mándoki Dental');
  });

  test('egy seed-terv előnézetén a PDF saját blob: URL-ről betölt, beágyazott NotoSans fonttal és a logóval', async () => {
    const { app, page, userData } = futo;
    await page.getByRole('link', { name: /Kovács János/ }).click();
    await page.getByRole('button', { name: 'Új verzió' }).first().click();
    await expect(page).toHaveURL(/#\/terv$/);
    await page.getByRole('button', { name: 'Előnézet' }).first().click();
    const iframe = page.locator('iframe[title="Kezelési terv előnézet"]');
    await expect(iframe).toBeVisible({ timeout: 30_000 });

    // A `usePDF` minden újrarenderelés után új blob-URL-t ad, és a régit visszavonja; a késve
    // érkező bemenetek (sablonok, foglalás, a canvason készülő fogtérkép-PNG) a „Letöltés”
    // megjelenése után is indíthatnak újrarenderelést. Egy közben lecserélt URL letöltése
    // `interrupted` lesz, ezért csak a nyugalmi állapot URL-je jó: látszik a „Letöltés”, és az
    // iframe URL-je egy ideig nem változik.
    const letoltes = page.getByRole('link', { name: 'Letöltés' });
    let src = '';
    await expect(async () => {
      await expect(letoltes).toBeVisible();
      const elotte = await iframe.getAttribute('src');
      await page.waitForTimeout(1500);
      await expect(letoltes).toBeVisible();
      expect(await iframe.getAttribute('src')).toBe(elotte);
      src = elotte ?? '';
    }).toPass({ timeout: 30_000 });
    expect(src).toMatch(/^blob:app:\/\/mandoki-dental\//);

    // A PDF bájtjait a main process tölti le: a renderer `fetch`-e a blob:-ra maga is
    // CSP-sértés lenne (`connect-src`), ami épp a figyelt hibát okozná.
    const pdfUt = path.join(userData, 'elonezet.pdf');
    const allapot = await app.evaluate(
      ({ BrowserWindow }: typeof import('electron'), { url, ut }: { url: string; ut: string }) =>
        new Promise<string>((resolve) => {
          const wc = BrowserWindow.getAllWindows()[0].webContents;
          wc.session.once('will-download', (_e, item) => {
            item.setSavePath(ut);
            item.once('done', (_e2, state) => resolve(state));
          });
          wc.downloadURL(url);
        }),
      { url: src, ut: pdfUt },
    );
    expect(allapot).toBe('completed');
    const pdf = readFileSync(pdfUt).toString('latin1');
    expect(pdf).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSans/);
    expect(pdf).toContain('/FontFile2');
    // A logó (`app/src/assets/logo.png`) 2662×666-os kép-objektumként ágyazódik be.
    expect(pdf).toMatch(/\/Width 2662\b/);
    expect(pdf).toMatch(/\/Height 666\b/);
  });

  test('a teljes út alatt nincs CSP-sértés és elkapatlan renderer-hiba', () => {
    expect(futo.hibak).toEqual([]);
  });

  test('azonos userData-val indított második példány magától kilép, az ablakszám 1 marad', async () => {
    const { exe, args } = inditasiParancs();
    const masodik = spawn(exe, args, {
      cwd: APP_KONYVTAR,
      env: { ...process.env, DENTAL_PLAN_TESZT_USER_DATA: futo.userData },
      stdio: 'ignore',
    });
    const kilepesiKod = await new Promise<number | null>((resolve, reject) => {
      const idozito = setTimeout(() => reject(new Error('a második példány 20 s alatt sem lépett ki')), 20_000);
      masodik.once('exit', (kod) => {
        clearTimeout(idozito);
        resolve(kod);
      });
    });
    expect(kilepesiKod).toBe(0);
    expect(futo.app.windows()).toHaveLength(1);
  });
});
