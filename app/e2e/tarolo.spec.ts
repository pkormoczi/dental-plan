import { expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configIr, inditas, ujUserData } from './electronApp.js';

const DRIVE_EMLEKEZTETO = 'Mielőtt a másik gépen folytatod, várd meg, hogy a Drive ikon a feltöltés végét jelezze.';

test.describe.serial('Electron fájlrendszeres tároló', () => {
  const ideiglenes: string[] = [];
  const ujMappa = (elotag: string) => {
    const m = mkdtempSync(path.join(os.tmpdir(), elotag));
    ideiglenes.push(m);
    return m;
  };

  test.afterAll(() => {
    for (const m of ideiglenes) rmSync(m, { recursive: true, force: true });
  });

  test('első indításkor a varázsló az üres mappába adatmappát épít; a páciens újraindítás után, varázsló nélkül is látszik', async () => {
    const gyoker = ujMappa('mandoki-gyoker-');
    const userData = ujUserData();
    ideiglenes.push(userData);

    let futo = await inditas({ userData, mappaValasztas: gyoker });
    try {
      await expect(futo.page.getByRole('heading', { name: 'Válaszd ki az adatmappát' })).toBeVisible();
      expect(readdirSync(gyoker)).toEqual([]);
      await futo.page.getByRole('button', { name: 'Adatmappa kiválasztása…' }).click();
      await expect(futo.page.getByText(/Ha a másik gépeden már van adatmappa/)).toBeVisible();
      await futo.page.getByRole('button', { name: 'Új adatmappa létrehozása' }).click();

      await expect(futo.page.getByText('Legutóbbi páciensek')).toBeVisible();
      await expect(futo.page.getByText('PRÓBAÜZEM')).toBeVisible();
      expect(readdirSync(gyoker).sort()).toEqual(['arlista.json', 'beallitasok.json', 'paciensek', 'sablonok']);
      expect(JSON.parse(readFileSync(path.join(userData, 'config.json'), 'utf8'))).toMatchObject({ gyokerMappa: gyoker });

      await futo.page.getByRole('link', { name: 'Páciensek' }).click();
      await futo.page.getByRole('button', { name: '+ Új páciens' }).click();
      await futo.page.getByLabel('Név *').fill('Próba Páciens');
      await futo.page.getByRole('button', { name: 'Mentés' }).click();
      await expect.poll(() => readdirSync(path.join(gyoker, 'paciensek'))).toHaveLength(1);
      expect(readdirSync(path.join(gyoker, 'paciensek'))[0]).toMatch(/^Próba-Páciens_[a-z0-9]{6}$/);

      // Írás után a bezárás a záró képernyőn át megy.
      const kilepett = futo.app.waitForEvent('close');
      await futo.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
      await expect(futo.page.getByText(DRIVE_EMLEKEZTETO)).toBeVisible();
      await futo.page.getByRole('button', { name: 'Bezárás most' }).click();
      await kilepett;
      expect(futo.hibak).toEqual([]);
    } finally {
      await futo.leallitas();
    }

    futo = await inditas({ userData });
    try {
      await expect(futo.page.getByText('Legutóbbi páciensek')).toBeVisible();
      await futo.page.getByRole('link', { name: 'Páciensek' }).click();
      await expect(futo.page.getByText('Próba Páciens').first()).toBeVisible();
      expect(futo.hibak).toEqual([]);
    } finally {
      await futo.leallitas();
    }
  });

  test('nem létező mappára mutató configgal blokkoló képernyő jelenik meg, és a mappa nem jön létre', async () => {
    const gyoker = path.join(ujMappa('mandoki-hianyzo-'), 'nincs-ilyen');
    const userData = ujUserData();
    ideiglenes.push(userData);
    configIr(userData, gyoker);

    const futo = await inditas({ userData });
    try {
      await expect(futo.page.getByRole('heading', { name: 'Az adatmappa nem érhető el' })).toBeVisible();
      await expect(futo.page.getByRole('button', { name: 'Újrapróba' })).toBeVisible();
      await expect(futo.page.getByRole('button', { name: 'Másik mappa kiválasztása' })).toBeVisible();
      await expect(futo.page.getByText('Legutóbbi páciensek')).toHaveCount(0);
      expect(existsSync(gyoker)).toBe(false);
      expect(futo.hibak).toEqual([]);
    } finally {
      await futo.leallitas();
    }
  });
});
