# vite-biztonsagi-frissites
Type: chore
Source: electron-hej-ablak implementálása közben talált (npm audit, 2026-11-17)

Az `npm audit` az `app/`-ban 12 sebezhetőséget jelez (8 közepes, 4 magas), mind fejlesztői vagy
build-eszközben: `vite` 8.2.0–8.2.2 (dev szerver), `vitest` és `@vitest/mocker`, a `jsdom` alatti
`undici`, `nanoid`, `source-map-js`, valamint az `electron-builder` alatti `minimatch`. A termékbe
egyik sem kerül (`npm ls --omit=dev` üres), tehát sem a Pages-build, sem a telepített app nem
hordozza őket; a kockázat a fejlesztői gépen futó dev szerver és a build. Elvárt: `npm audit fix`
(`--force` nélkül) a semver-tartományon belül frissít, a teljes kapu és a `test:electron` zöld marad.
Nem tartozik ide a `minimatch` miatti `--force`, mert az az `electron-builder`-t a 25.1.0-ra
léptetné vissza; az megvárja az `electron-builder` saját javítását.
