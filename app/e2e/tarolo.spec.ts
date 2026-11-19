import { expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP_KONYVTAR, configIr, inditas, ujUserData } from './electronApp.js';

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
    const mentesCel = path.join(ujMappa('mandoki-kulso-lemez-'), 'mandoki-dental-mentes.zip');
    const userData = ujUserData();
    ideiglenes.push(userData);

    let futo = await inditas({ userData, mappaValasztas: gyoker, mentesCel });
    try {
      await expect(futo.page.getByRole('heading', { name: 'Válaszd ki az adatmappát' })).toBeVisible();
      expect(readdirSync(gyoker)).toEqual([]);
      await futo.page.getByRole('button', { name: 'Adatmappa kiválasztása…' }).click();
      await expect(futo.page.getByText(/Ha a másik gépeden már van adatmappa/)).toBeVisible();
      await futo.page.getByRole('button', { name: 'Új adatmappa létrehozása' }).click();

      await expect(futo.page.getByText('Legutóbbi páciensek')).toBeVisible();
      await expect(futo.page.getByText('PRÓBAÜZEM')).toBeVisible();
      await expect(futo.page.getByText(/Még nem készült biztonsági mentés/)).toBeVisible();
      expect(readdirSync(gyoker).sort()).toEqual(['arlista.json', 'beallitasok.json', 'paciensek', 'sablonok']);
      expect(JSON.parse(readFileSync(path.join(userData, 'config.json'), 'utf8'))).toMatchObject({ gyokerMappa: gyoker });

      await futo.page.getByRole('link', { name: 'Páciensek' }).click();
      await futo.page.getByRole('button', { name: '+ Új páciens' }).click();
      await futo.page.getByLabel('Név *').fill('Próba Páciens');
      await futo.page.getByRole('button', { name: 'Mentés' }).click();
      await expect.poll(() => readdirSync(path.join(gyoker, 'paciensek'))).toHaveLength(1);
      expect(readdirSync(path.join(gyoker, 'paciensek'))[0]).toMatch(/^Próba-Páciens_[a-z0-9]{6}$/);

      await futo.page.getByRole('link', { name: 'Beállítások' }).click();
      await futo.page.getByRole('tab', { name: /Adattárolás/ }).click();
      await futo.page.getByRole('button', { name: 'Biztonsági mentés ZIP-be' }).click();
      await expect(futo.page.getByText('mandoki-dental-mentes.zip', { exact: true })).toBeVisible();
      expect(statSync(mentesCel).size).toBeGreaterThan(0);
      await expect(futo.page.getByText(/Utolsó mentés: .* \(ezen a gépen\)/)).toBeVisible();

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

  test('üres mappába a demóból exportált fájlból épül az adatmappa: az összegzés megerősítése után az export árlistája, beállításai és szövege kerül a mappába', async () => {
    const gyoker = ujMappa('mandoki-import-');
    const exportUt = path.join(ujMappa('mandoki-letoltesek-'), 'kezelesi-terv-export-2026-11-16.json');
    const arlista = {
      ...JSON.parse(readFileSync(path.join(APP_KONYVTAR, '..', 'data', 'arlista.seed.json'), 'utf8')),
      arlistaVerzio: '2026-11-10',
    };
    const beallitasok = {
      schemaVersion: 1,
      rendelo: { nev: 'E2E Export Rendelő', cim: '1111 Budapest, Próba utca 1.', telefon: '', email: '', adoszam: '', cegjegyzekszam: '' },
      orvosok: ['Dr. Próba Péter'],
      ervenyessegNap: 90,
      alapertelmezettNyelv: 'hu',
      alapertelmezettPenznem: 'HUF',
    };
    const garancia = '# Garancia\n\nAz exportból jött garancia.\n';
    writeFileSync(
      exportUt,
      JSON.stringify({
        formatum: 'dental-plan-export',
        schemaVersion: 1,
        keszult: '2026-11-16T10:00:00.000Z',
        arlista,
        beallitasok,
        sablonok: { 'garancia-hu-v1.md': garancia },
      }),
    );
    const userData = ujUserData();
    ideiglenes.push(userData);

    const futo = await inditas({ userData, mappaValasztas: gyoker, importFajl: exportUt });
    try {
      await futo.page.getByRole('button', { name: 'Adatmappa kiválasztása…' }).click();
      await futo.page.getByRole('button', { name: 'Van egy exportált fájlom a demóból' }).click();
      const ablak = futo.page.getByRole('alertdialog', { name: 'Átvitel a demóból' });
      await expect(ablak.getByText('Rendelő: E2E Export Rendelő')).toBeVisible();
      await expect(ablak.getByText('Nyomtatvány-szövegek: 1 az exportból, 5 a beépítettből')).toBeVisible();
      expect(readdirSync(gyoker)).toEqual([]);
      await ablak.getByRole('button', { name: 'Adatmappa létrehozása az exportból' }).click();

      await expect(futo.page.getByText('Legutóbbi páciensek')).toBeVisible();
      expect(JSON.parse(readFileSync(path.join(gyoker, 'arlista.json'), 'utf8'))).toEqual(arlista);
      expect(JSON.parse(readFileSync(path.join(gyoker, 'beallitasok.json'), 'utf8'))).toEqual(beallitasok);
      expect(readFileSync(path.join(gyoker, 'sablonok', 'garancia-hu-v1.md'), 'utf8')).toBe(garancia);
      expect(readdirSync(path.join(gyoker, 'sablonok'))).toHaveLength(6);
      expect(JSON.parse(readFileSync(path.join(userData, 'config.json'), 'utf8'))).toMatchObject({ gyokerMappa: gyoker });

      const kilepett = futo.app.waitForEvent('close');
      await futo.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
      await expect(futo.page.getByText(DRIVE_EMLEKEZTETO)).toBeVisible();
      await futo.page.getByRole('button', { name: 'Bezárás most' }).click();
      await kilepett;
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
