# electron-navigacio-tiltas
Type: feature
Source: desktop-app-migration-plan-final.md §10.1 és §3.2 (navigáció)
Target: master
Baseline: d73be74f1eee5e7e62825ac096fa0dec94e92d54

## Goal
Az Electron-ablak sosem navigál az appon kívülre és nem nyit idegen ablakot; a mentett PDF
„megnyitás új lapon” gombja egy saját, ugyanúgy zárt app-ablakban mutatja a PDF-et.

## Current state
- `app/src/storage/openPlanPdfInNewTab.ts` `openPlanPdfInNewTab`: `window.open('', '_blank')` a gesztus
  alatt, utána `win.location.href` a blob-URL-re; `null` ablaknál böngészőnek szóló hibaüzenet. Hívók:
  `app/src/pages/Home.tsx`, `app/src/pages/PreviewPage.tsx`, `app/src/pages/TervReszleteiPage.tsx`.
- `app/src/pages/demo/fileTree/FileContentPanel.tsx`: `target="_blank"` blob-link (demó-only).
- `app/src/components/ErrorBoundary.tsx`: `location.hash` és `reload()` — dokumentumon belüli, nem
  navigáció. Külső `http…` link az appban és a `docs/CHANGELOG.md`/`FEATURES.md` kártyákban nincs.
- `app/electron/main.ts` (`electron-hej-ablak`): ablak, protokoll, navigációs őr nélkül;
  `app/e2e/` füst-teszt (`electron-fust-teszt`).

## Approach
- Tiszta, Electron-független döntő modul `app/electron/`-ban (URL + kontextus → engedett/tiltott); a
  main a `will-navigate`, `will-redirect`, `setWindowOpenHandler` és a gyerekablak eseményeire köti.
- Főablak: top-frame navigáció csak a saját originen belül (production `app://<hoszt>`, fejlesztésben a
  dev szerver originje).
- Új ablak: kizárólag az `about:blank`-ből induló PDF-megnyitás engedett, `overrideBrowserWindowOptions`
  ugyanazokkal a webPreferences-szel (sandbox, contextIsolation, `nodeIntegration: false`,
  `plugins: true`, helyesírás ki); a gyerekablak csak a saját origin `blob:` URL-jére navigálhat, és
  maga nem nyithat újabb ablakot. Minden más `window.open` és `target="_blank"` → `deny`.
- `shell.openExternal` sehol nem hívódik.
- A renderer-kód nem változik: Electron alatt a `window.open` nem `null`, a Pages-ágon minden marad.
- A füst-teszt az alábbi esetekkel bővül.
- **Nem tartozik ide:** a rendszer-PDF-olvasós „Megnyitás” és a „Másolás máshová” (a
  FileSystemStorage-mérföldkő), a letöltések (`will-download`) kezelése, IPC-küldő-ellenőrzés, a
  `FileContentPanel` linkje (a demóval megy).

## Decisions
- Saját PDF-ablak (doki) a rendszer-PDF-olvasós „Megnyitás” érkezéséig; nem hibaüzenet, mert a
  próbatelepítésen minden gomb működjön. Átmeneti kód, a „Megnyitás”-sal törlendő.
- Gyerekablak csak `about:blank` → saját `blob:`; nem általános saját-origin engedély, mert az az
  app-route-ok második példányát nyitná meg.
- A döntés tiszta függvényben, vitest-tel; a bekötést a füst-teszt fedi — Electron-esemény jsdom-ban
  nem futtatható.

## Verification
- [ ] tests (vitest) — saját origin engedett; idegen `https:`, `file:`, `data:`, `javascript:` és idegen
      origin `blob:` tiltott; új ablak csak `about:blank`-ből; a gyerekablak csak saját `blob:`-ra
      navigálhat
- [ ] tests (`test:electron`) — `window.open('https://example.org')` nem nyit ablakot; idegen URL-re
      állított `location` után a főablak URL-je változatlan; a Terv részletei „megnyitás új lapon”
      gombjára második ablak nyílik saját `blob:` URL-lel; a főablak bezárásával a PDF-ablak is bezárul
- [ ] typecheck/lint
- [ ] docs-check
