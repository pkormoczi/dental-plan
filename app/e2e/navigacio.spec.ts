import { expect, test, type Page } from '@playwright/test';
import { inditas, type FutoApp } from './electronApp.js';

test.describe.serial('Electron navigációs és új-ablak tiltás', () => {
  let futo: FutoApp;
  let pdfOldal: Page;

  test.beforeAll(async () => {
    futo = await inditas({ demo: true });
  });

  test.afterAll(async () => {
    await futo?.leallitas();
  });

  test('window.open idegen URL-re nem nyit ablakot', async () => {
    const { app, page } = futo;
    const megnyilt = await page.evaluate(() => window.open('https://example.org/', '_blank') !== null);
    expect(megnyilt).toBe(false);
    expect(app.windows()).toHaveLength(1);
  });

  test('idegen URL-re állított location után a főablak URL-je változatlan', async () => {
    const { page } = futo;
    const elotte = await page.evaluate(() => location.href);
    for (const idegen of ['https://example.org/', 'file:///C:/Windows/win.ini']) {
      await page.evaluate((url) => {
        window.location.href = url;
      }, idegen);
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => location.href)).toBe(elotte);
    }
    // A main által megszakított navigációt a Playwright függőben lévőnek látja, és a
    // következő lokátor-várakozás erre futna rá; az újratöltés lezárja.
    await page.reload();
    await expect(page.getByText('Legutóbbi páciensek')).toBeVisible();
  });

  test('a Terv részletei „Megnyitás külön” gombjára második ablak nyílik a saját blob: PDF-fel', async () => {
    const { app, page } = futo;
    // A seed-verziókhoz nincs mentett PDF: előbb egy véglegesített v2 kell.
    await page.getByRole('link', { name: /Kovács János/ }).click();
    await page.getByRole('button', { name: 'Új verzió' }).first().click();
    await page.getByRole('button', { name: 'Előnézet' }).first().click();
    await page.locator('iframe[title="Kezelési terv előnézet"]').waitFor();
    await page.getByRole('button', { name: 'Véglegesítés és mentés' }).click();
    // A mentés a végleges PDF-et újra legenerálja; a macOS-runneren ez az alap 5 s-nál tovább tart.
    await expect(page.getByText('A terv elmentve ✓')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Korábbi tervek' }).click();
    await page.getByRole('button', { name: 'Megnézés' }).first().click();
    await expect(page.getByText('v2', { exact: true }).first()).toBeVisible();
    const ujAblak = app.waitForEvent('window');
    await page.getByRole('button', { name: 'Megnyitás külön' }).click();
    pdfOldal = await ujAblak;
    await pdfOldal.waitForURL(/^blob:app:\/\/mandoki-dental\//);
    expect(app.windows()).toHaveLength(2);
  });

  test('a főablak bezárásával a PDF-ablak is bezárul és az app kilép', async () => {
    const { app } = futo;
    const kilepes = app.waitForEvent('close');
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().startsWith('app://'))
        ?.close();
    });
    await kilepes;
    expect(pdfOldal.isClosed()).toBe(true);
    expect(futo.hibak).toEqual([]);
  });
});
