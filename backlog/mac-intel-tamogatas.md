# mac-intel-tamogatas
Type: feature
Source: fejlesztő felvetése a v0.1.0-teszt.1 után (2026-11-17)
Target: master
Baseline: 70dc2d6e0dac4d8d5eaffd4d584133c58df6e1a4

## Goal
A Mac-telepítő egyetlen közös (universal) dmg, ami Apple Silicon és Intel Macen (macOS 13 vagy
újabb) egyaránt elindul; a doki nem tud rossz fájlt letölteni.

## Current state
- `app/electron-builder.json`: `mac.target` = `dmg`, `arch: ["arm64"]`; `dmg.artifactName`
  `Mandoki-Dental-${version}-${arch}.${ext}`; ad-hoc aláírás, `hardenedRuntime: false`.
- `app/e2e/electronApp.ts` `inditasiParancs`: macOS-en `release/mac-${process.arch}/Mandoki
  Dental.app/…` útvonalat indít.
- `.github/workflows/release.yml`: build-mátrix `windows-latest` + `macos-latest` (arm64), mindkettő
  feltölti a telepítőjét; a publikáló job `merge-multiple`-lel gyűjti őket.
- `docs/TELEPITES.md` Mac-szakasza a `…-arm64.dmg` fájlt nevezi meg; a macOS-verzió-igény nincs
  benne. `docs/desktop-app-migration-plan-final.md` §9.2: „csak `arm64`”.
- Az Electron 45 macOS 13 (Ventura) vagy újabb rendszeren fut (`node_modules/electron/README.md`).
- A GitHubon az Intel macOS-runner címkéje `macos-26-intel` (actions/runner-images README).

## Approach
- `electron-builder.json`: a Mac-target `dmg` `universal` architektúrával; a fájlnév így
  `…-universal.dmg`. Más platform nem változik.
- `e2e/electronApp.ts`: macOS-en a `release/mac-universal/…` csomagot indítja.
- `release.yml`: a mátrix kiegészül a `macos-26-intel` runnerrel, ami ugyanúgy universal csomagot
  épít és azon futtatja a tesztet és a füst-tesztet (az x64-es rész natívan); telepítőt csak a
  `windows-latest` és a `macos-latest` tölt fel, hogy a publikáló job egy dmg-t kapjon. A mac
  build ellenőrzi, hogy a bináris mindkét architektúrát tartalmazza (`lipo -archs`).
- `docs/TELEPITES.md`: a Mac-fájl neve `…-universal.dmg`, Apple Silicon és Intel Macre egyaránt;
  kimondja, hogy macOS 13 (Ventura) vagy újabb kell. A migrációs terv §9.2 ehhez igazodik.
- `docs/CHANGELOG.md`: bejegyzés, hogy a Mac-telepítő Intel Macen is fut.
- **Nem tartozik ide:** új teszt-tag kiadása, a Windows-telepítő, a név kérdése
  (`egyseges-ekezet-nelkuli-appnev`), macOS 12 vagy régebbi támogatása.

## Decisions
- Egy universal dmg (doki/fejlesztő) — mert a doki nem tud rossz fájlt választani; nem két külön
  dmg, cserébe a letöltés kb. kétszer nagyobb.
- Az x64-es részt natív Intel runner (`macos-26-intel`) füst-teszteli — mert az arm64-runneren a
  universal bináris az arm64-es részt futtatná; nem Rosetta-trükk, mert a Playwright indítását
  egy `arch` csomagolóval kellene megkerülni.
- Az Intel runner nem tölt fel telepítőt — mert ugyanazt a fájlnevet adná, és a publikáló job
  `merge-multiple`-je ütközne.
- macOS 13+ (doki: az Intel Mac ezt futtatja) — régebbi rendszer támogatása nem cél, a friss
  Electron nem fut rajta.

## Verification
- [ ] tests — a vitest-készlet zöld; `npm run test:electron` Windowson változatlanul zöld
- [ ] a release workflow `workflow_dispatch` próbafutása zöld mindhárom runneren (Windows, arm64
      Mac, Intel Mac); a run artifactjai közt egy `.exe` és egyetlen `…-universal.dmg`; a mac
      buildben a `lipo -archs` `x86_64 arm64`-et mutat
- [ ] typecheck/lint
- [ ] test:workflow
- [ ] docs-check
