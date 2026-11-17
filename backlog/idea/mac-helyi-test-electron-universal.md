# mac-helyi-test-electron-universal
Type: bug
Source: mac-intel-tamogatas implementálása közben talált (2026-11-17)

Macen helyben a `npm run test:electron` nem tud lefutni: az `electron:package:dir` (`electron-builder
--dir`) cél-architektúra nélkül csak a gép saját architektúrájára csomagol (`release/mac-arm64/`,
Intel gépen `release/mac/`), az `app/e2e/electronApp.ts` `inditasiParancs` viszont macOS-en a
`release/mac-universal/` csomagot indítja, így a teszt „Nincs kicsomagolt app” hibával áll meg (a
hibaüzenet a kerülőutat írja ki: `npm run electron:package`, aztán `npx playwright test -c e2e`).
A kódból levezetve (az electron-builder `--dir` ága a `process.arch`-ot veszi), Macen nem
futtatva. A CI-t nem érinti: a `release.yml` a teljes `electron:package`-et építi. Elvárt: Macen
is egy paranccsal fut a csomagolt app füst-tesztje, a Windows-út változatlan marad.
