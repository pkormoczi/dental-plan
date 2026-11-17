# electron-hej-ablak
Type: feature
Source: desktop-app-migration-plan-final.md §10.1, §3.1, §3.5, §3.6

A doki ma csak böngészőben, a Pages-demón éri el az appot; az első lépés egy Electron-ablak, amelyben
a mai `app/` változatlanul, `DemoStorage`-zal fut. `app/electron/` alá kerül a main és a preload,
saját `tsconfig.electron.json`-nal (Node target, DOM lib nélkül), `electron:dev` (Vite dev szerver +
ablak) és `electron:build` scripttel. A renderer `contextIsolation`, `sandbox` és `nodeIntegration:
false` mellett fut, `plugins: true`-val a PDF-előnézetért; a main első sora az egy-példány zár, a
második indítás a meglévő ablakot hozza előre. Productionben saját, privilegizált `app://` protokoll
tölt (nem `file://`); a protokollnév és a hoszt egyetlen konstans, mert a renderer
`localStorage`-partíciójának kulcsa — átnevezése csendben kiürítené a piszkozatot. A Vite `base`
környezeti változóból `/dental-plan/` (Pages) vagy `./` (Electron), a `HashRouter` marad. A main
process nem esik a CSP alá, ezért az oxlint hálózati tiltása `app/electron/`-ra a Node- és
Electron-hálózati modulokkal bővül, és az Electron saját forgalma (pl. helyesírási szótár letöltése)
kikapcsolandó. Kész, ha `app://` alatt az `/elonezet` nulla CSP-sértéssel fut, a generált PDF-en a
beágyazott font és a logó látszik, és a Pages-build változatlan.
