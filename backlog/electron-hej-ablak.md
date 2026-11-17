# electron-hej-ablak
Type: feature
Source: desktop-app-migration-plan-final.md §10.1, §3.1, §3.5, §3.6
Target: master
Baseline: d73be74f1eee5e7e62825ac096fa0dec94e92d54

## Goal
A mai app változatlanul, `DemoStorage`-zal fut egy „Mándoki Dental” nevű Electron-ablakban (fejlesztői
és production-módú indítással); a Pages-demó viselkedése érintetlen.

## Current state
- `app/vite.config.ts` `cspPlugin` (a szigorú CSP minden buildbe), `base: '/dental-plan/'` beégetve.
- `app/package.json`: `"name": "app"`, `"type": "module"`, nincs Electron; `app/tsconfig.json` csak a
  `tsconfig.app.json` + `tsconfig.node.json` referenciát tartja, a `build` (`tsc -b`) ezeket ellenőrzi.
- `app/.oxlintrc.json` `no-restricted-globals`: a hálózati tiltás csak renderer-globálisokra szól
  (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`), Node-modulra semmi.
- `app/src/App.tsx` `HashRouter`; `app/src/pdf/fonts.ts` `registerPdfFonts` és
  `app/src/pdf/tervDocument/Chrome.tsx` `logoUrl`: Vite-asset URL, a react-pdf render-időben fetch-eli.
- `app/index.html` címe „… — Mándoki Dental (DEMÓ)” — ez lesz az ablakcím.
- `.gitignore`, `app/.gitignore`: `dist` ignorált, Electron-kimenet még nincs.

## Approach
- `app/electron/main.ts` és a tartós nevek modulja (`app/electron/protocol.ts`): protokoll-séma, hoszt
  és userData-mappanév egy helyen, kikommentezve, hogy a renderer `localStorage`-partíciójának kulcsa —
  átnevezésük csendben kiüríti a piszkozatot. Saját `tsconfig.electron.json` (Node target, DOM lib
  nélkül) a `tsconfig.json` referenciái közt, így a `npm run build` minden pushon típusellenőrzi a maint.
- A main első lépése az egy-példány zár; a második indítás a meglévő ablakot hozza előre és kilép.
- userData = `appData/<package.json name>`, a `name` tartós ASCII azonosító (`app` helyett); fejlesztői
  indításnál `-dev` utótaggal. A megjelenített név a `productName`: „Mándoki Dental”.
- Ablak: `contextIsolation`, `sandbox`, `nodeIntegration: false`, `plugins: true` (PDF-előnézet);
  helyesírás-ellenőrzés ablak- és session-szinten is ki; preload nincs; maximalizálva indul; a főablak
  bezárása mindkét platformon kilépés.
- Production: privilegizált `app://` séma (`standard`, `secure`, `supportFetchAPI`); a `protocol.handle`
  a renderer-build mappájából `fs`-sel szolgál ki, kiterjesztés→MIME térképpel; a mappán kívülre
  feloldó útvonal (`..`, kódolt `..`, abszolút) 404. Fejlesztésben a Vite dev szerver, DevTools-szal.
- `vite.config.ts`: `base` környezeti változóból — alapértelmezés `/dental-plan/`, Electronnál `./`; az
  Electron-build külön, gitignore-olt mappába ír, a Pages `dist/` érintetlen. Scriptek: `electron:dev`,
  `electron:build`.
- Menü, magyarul, minimális: macOS-en app-menü (Névjegy, Elrejtés, Kilépés) és Szerkesztés (visszavonás,
  ismét, kivágás, másolás, beillesztés, összes kijelölése); mindkét platformon Nézet: nagyítás,
  kicsinyítés, eredeti méret, teljes képernyő; Windowson a menüsor rejtett, Alt-ra jelenik meg. Nincs
  újratöltés, DevTools, súgó-link a production-appban. Ctrl/Cmd+görgő is nagyít.
- `.oxlintrc.json`: `app/electron/**`-ra `no-restricted-imports` a Node-hálózati modulokra (`http`,
  `https`, `http2`, `net`, `tls`, `dgram`, `node:` előtaggal is) és az Electron `net`, `autoUpdater`,
  `crashReporter` exportjára. A `docs/PRODUCT.md` § Adat- és deployment-korlátok „Gépi őr” mondata
  ezzel bővül.
- **Nem tartozik ide:** navigációs és új-ablak tiltás (`electron-navigacio-tiltas`), csomagolás és ikon
  (`electron-csomagolas`), Playwright (`electron-fust-teszt`), preload/IPC, `FileSystemStorage`, a
  `DemoBanner` szövege, a letöltések kezelése.

## Decisions
- Név „Mándoki Dental” (doki); a userData-mappa és a protokoll ettől független, tartós ASCII konstans,
  így a név később szabadon átnevezhető.
- userData = `package.json` `name` — mert az NSIS-eltávolító `deleteAppDataOnUninstall` mellett a
  `$APPDATA\<package name>` mappát törli; nem a `productName`, mert az ékezetes és átnevezhető.
- Minimális magyar menü (doki); nem az Electron angol alapmenüje, és nem menü nélkül, mert macOS-en a
  vágólap-gyorsbillentyű menüszerep nélkül nem működik.
- Helyesírás-ellenőrzés ki (doki) — Windowson az Electron a szótárat Google-CDN-ről töltené le, ami
  kimenő kapcsolat; szakszó- és név-szövegen csak zaj.
- Preload nincs — nincs mit kitenni; az IPC-vel együtt érkezik.
- `fs`-alapú protokoll-handler, nem `net.fetch` — így az Electron `net` kivétel nélkül tiltható. A
  handler csak az app saját buildjét olvassa, a `PlanStorage`-határ invariánsát nem érinti.
- Maximalizálva indul, nem mentett ablakméret — az a tároló-határon kívüli fájlírás lenne.
- Főablak bezárása = kilépés macOS-en is — a gépváltási szabály egyértelmű „app bezárva” állapotot kér.

## Verification
- [ ] tests — protokoll-útvonalfeloldás: build-mappán belüli fájl kiszolgálva, `..`, kódolt `..` és
      abszolút út elutasítva; a userData-név konstans egyezik a `package.json` `name`-mel; a meglévő
      vitest-készlet változatlanul zöld
- [ ] typecheck/lint — `tsc -b` a maint is ellenőrzi; egy `app/electron/`-beli `node:https` import
      lint-hibát ad
- [ ] `npm run build` kimenete továbbra is `/dental-plan/` alatti assetekre hivatkozik
- [ ] docs-check
- [ ] kézi (fejlesztő, Windows; a záró jelentés kézi blokkjába): `electron:dev` és production-módú
      indítás — Kezdőlap; demó-terv `/elonezet`: a konzolon nulla CSP-sértés, a PDF-előnézet betölt, a
      letöltött PDF-en ő/ű és logó; második indítás az elsőt hozza előre; Alt-ra magyar menü, nagyítás
