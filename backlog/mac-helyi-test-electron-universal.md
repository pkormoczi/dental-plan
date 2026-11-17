# mac-helyi-test-electron-universal
Type: bug
Source: mac-intel-tamogatas implementálása közben talált (2026-11-17)
Target: master
Baseline: 1e206d44dc0ed59707aba5d7068ae76b71059ca8

## Goal
Repro: Macen `npm run test:electron` → az `electron:package:dir` a gép architektúrájára csomagol
(`release/mac-arm64/` vagy `release/mac/`), az indító a `release/mac-universal/`-t keresi, a teszt
„Nincs kicsomagolt app” hibával áll meg. Elvárt: Macen is egy paranccsal lefut a füst-teszt a
kiadott (universal) csomag alakján; Windowson változatlan; a doki számára nincs látható változás.

## Current state
- `app/package.json` `electron:package:dir`: `electron-builder --dir --publish never`; a
  `test:electron` erre épít.
- Az electron-builder `--dir` CLI-ága cél-architektúra nélkül a `process.arch`-ot veszi
  (`app/node_modules/electron-builder/out/builder.js` `commonArch`) — a builder-config `mac.target`
  (`dmg`, `universal`) itt nem hat. A `dir` target a builder-configban is megadható
  (`app-builder-lib` `targetFactory` `DIR_TARGET`).
- `app/e2e/electronApp.ts` `inditasiParancs`: macOS-en `release/mac-universal/…`; a fejléc-komment a
  `--dir` build ezen korlátját írja le, a hibaüzenet macOS-en a kerülőutat
  (`npm run electron:package`, aztán `npx playwright test -c e2e`).
- `app/electron-builder.json`: `mac.target` `dmg`/`universal`, `win.target` `nsis`/`x64`.
- `.github/workflows/release.yml`: `electron:package` + `npx playwright test -c e2e` — a `--dir`
  scriptet nem használja.
- Tesztek: `app/electron/protocol.test.ts` (a builder-configot olvasó őrök).

## Approach
Az `electron:package:dir` macOS-en a kiadott dmg-vel azonos (universal) architektúrájú kicsomagolt
appot adja a `release/mac-universal/`-ba, Windowson változatlanul `release/win-unpacked/`-ot (x64);
így a `test:electron` Macen is egy parancs. Az `inditasiParancs` kommentje és hibaüzenete ehhez
igazodik. Nem változik: a release workflow, a kiadott dmg/nsis targetek, az indító útvonalai. Nem
tartozik ide: a release workflow Mac-jobjainak átállítása a `test:electron`-ra.

## Decisions
- A helyi Mac-csomag universal — mert a füst-teszt azt az alakot ellenőrizze, ami kiadásra
  kerül; nem az indító visszaesése a gép-architektúrájú mappára, mert egy korábbi buildből
  ottmaradt mappa elavult csomagot indíthatna; cserébe a helyi Mac-csomagolás kb. kétszer tovább
  tart (két szelet + összefésülés).

## Verification
- [ ] tests — teszt őrzi, hogy a helyi csomagolás macOS-en ugyanazt az architektúrát kéri, mint a
      kiadott Mac-target; `npm run test:electron` Windowson zöld (`win-unpacked`)
- [ ] typecheck/lint
- [ ] docs-check
- [ ] kézi (fejlesztő, Macen; a záró jelentés kézi blokkjába): `npm run test:electron` egy
      paranccsal lefut, és a `release/mac-universal/` csomagot indítja
