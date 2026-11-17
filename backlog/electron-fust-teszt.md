# electron-fust-teszt
Type: chore
Source: desktop-app-migration-plan-final.md §10.1 (Playwright füst-teszt)
Target: master
Baseline: d73be74f1eee5e7e62825ac096fa0dec94e92d54

## Goal
Automatikus teszt bukik, ha az Electron-build nem indul, nem tölti be az assetjeit, `app://` alatt
CSP-t sért, vagy a generált PDF-ből hiányzik a font vagy a logó.

## Current state
- A vitest jsdom-ban fut (`app/vite.config.ts` `test`), a `usePDF` mockolt, canvas nincs
  (`app/src/test-setup.ts`; `app/src/CLAUDE.md` § jsdom-vakfoltok) — valódi PDF-render és CSP sehol
  nincs ellenőrizve.
- `app/electron/main.ts` és `electron:build` (az `electron-hej-ablak`-ból); Playwright nincs.
- Root `CLAUDE.md` § Böngésző-automatizálás: „TILOS … remote debuggingot bekapcsolni bármilyen
  böngészőben”; a Playwright `_electron` CDP-n csatlakozik a saját maga indította Electronhoz.

## Approach
- `@playwright/test` devDependency, specek `app/e2e/` alatt saját configgal; a vitest `exclude`-ja
  kizárja (a `*.spec.ts`-t alapból felszedné). Script: `test:electron` = `electron:build` + Playwright;
  nem része az `npm test`-nek.
- A teszt a production-módú buildet indítja (`app://`, nem dev szerver); a csomagolt alakra az
  `electron-csomagolas` állítja át.
- Izolált userData: minden futás friss, ideiglenes mappát kap és a végén törli; sosem a fejlesztő vagy
  egy telepített app userData-ját. A main ezt egy kizárólag erre szolgáló, kikommentezett környezeti
  változóból veszi át.
- Esetek: (1) a főablak megnyílik, a Kezdőlap látszik; (2) egy seed-terv `/elonezet` oldalán a
  PDF-előnézet iframe-je saját `blob:` URL-lel betölt; (3) a teljes út alatt nincs
  `securitypolicyviolation` és nincs elkapatlan page error; (4) a generált PDF bájtjaiban beágyazott
  NotoSans font és kép-objektum (a logó) van; (5) azonos userData-val indított második példány magától
  kilép, az ablakszám 1 marad.
- Root `CLAUDE.md` § Böngésző-automatizálás egy mondattal bővül: a Playwright `_electron` füst-teszt az
  egyetlen kivétel — csak az app saját, általa indított Electronját hajtja, ideiglenes userData-val;
  Chrome-ot és valós profilt nem érint.
- A `release.yml` mindkét runneren futtatja (`electron-release-workflow`); a `ci.yml`-be nem kerül.
- **Nem tartozik ide:** a navigációs esetek (az `electron-navigacio-tiltas` adja hozzá), vizuális
  összehasonlítás, a csomagolt app indítása (`electron-csomagolas`), Linux-runner.

## Decisions
- Playwright `_electron` engedett (fejlesztő): saját indítású Electron, ideiglenes userData,
  CLAUDE.md-kivétellel; nem csak-CI, mert az Electron-tételek az /implement alatt is ellenőrizhetők
  legyenek; nem app-beli önellenőrzés, mert az teszt-kódot vinne a production-appba.
- Előbb a production-buildre, a csomagolás előtt — így a `navigacio-tiltas` és a `csomagolas` már ezzel
  ellenőrizhető; a csomagolt alakra váltás egy célútvonal-csere.
- PDF-font és -logó bájtszinten — a beágyazott font neve és a kép-objektum a tömörített PDF-ben is
  olvasható, így a mérföldkő „font és logó látszik” pontja automatikus.
- `ci.yml`-be nem — ubuntu-n virtuális kijelző kellene, és pushonként lassítaná a kaput; a main
  típusellenőrzése a `build`-ben minden pushon fut.

## Verification
- [ ] tests — `npm run test:electron` zöld Windowson; egy szándékos hibával (inline `<script>` az
      `index.html`-ben, vagy hibás `base`) piros, a hiba visszavonva
- [ ] a vitest-készlet nem futtatja az `e2e/` speceket
- [ ] typecheck/lint
- [ ] docs-check — a root `CLAUDE.md` bővítése a budgeten belül
