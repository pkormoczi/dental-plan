import { expect, test } from '@playwright/test';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inditas } from './electronApp.js';

test.describe.serial('Electron fájlrendszeres tároló', () => {
  const gyoker = mkdtempSync(path.join(os.tmpdir(), 'mandoki-gyoker-'));

  test.afterAll(() => {
    rmSync(gyoker, { recursive: true, force: true });
  });

  test('teszt-gyökérmappával a páciens felvitele mappát hoz létre, és újraindítás után is látszik', async () => {
    let futo = await inditas({ gyoker });
    try {
      // Üres gyökérbe az alapkészlet kerül, demó-páciens nélkül.
      await expect
        .poll(() => readdirSync(gyoker).sort())
        .toEqual(['arlista.json', 'beallitasok.json', 'paciensek', 'sablonok']);
      await futo.page.getByRole('link', { name: 'Páciensek' }).click();
      await futo.page.getByRole('button', { name: '+ Új páciens' }).click();
      await futo.page.getByLabel('Név *').fill('Próba Páciens');
      await futo.page.getByRole('button', { name: 'Mentés' }).click();

      await expect.poll(() => readdirSync(path.join(gyoker, 'paciensek'))).toHaveLength(1);
      expect(readdirSync(path.join(gyoker, 'paciensek'))[0]).toMatch(/^Próba-Páciens_[a-z0-9]{6}$/);
      expect(futo.hibak).toEqual([]);
    } finally {
      await futo.leallitas();
    }

    futo = await inditas({ gyoker });
    try {
      await futo.page.getByRole('link', { name: 'Páciensek' }).click();
      await expect(futo.page.getByText('Próba Páciens').first()).toBeVisible();
      expect(futo.hibak).toEqual([]);
    } finally {
      await futo.leallitas();
    }
  });
});
