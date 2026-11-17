# electron-csomagolas
Type: chore
Source: desktop-app-migration-plan-final.md §10.1 és §9.2
Target: master
Baseline: d73be74f1eee5e7e62825ac096fa0dec94e92d54

## Goal
Windowsra telepítő, Apple Silicon Macre dmg készül a „Mándoki Dental” appból, a márka fog-jelével mint
ikonnal, és egy magyar telepítési útmutatóval.

## Current state
- `app/package.json`: nincs `electron-builder`; a `name` (tartós ASCII azonosító) és a `productName`
  („Mándoki Dental”) az `electron-hej-ablak` óta adott.
- Ikonforrás: `app/public/apple-touch-icon-180x180.jpg` (fog-jel, 180 px — ikonhoz kicsi);
  `app/src/assets/logo.png` (2662×666, bal oldalán a fog-jel márkaszínekkel).
- `app/e2e/` füst-teszt (`electron-fust-teszt`) a csomagolatlan production-buildet indítja.
- `docs/desktop-app-migration-plan-final.md` §2 macOS-sora, §9.2 és §10.4: `.command` script,
  jobbklikk → Megnyitás, arm64 + x64 dmg.
- electron-builder: a `deleteAppDataOnUninstall` csak one-click NSIS-sel hat, és a
  `$APPDATA\<package name>` mappát is törli; macOS ad-hoc aláírás `identity: "-"`, alapértelmezett
  hardened runtime mellett entitlement nélkül indítási hibát ad.

## Approach
- `electron-builder` devDependency, config az `app/`-ban; `appId` tartós, fordított domain alakú ASCII,
  és Windowson a main `setAppUserModelId`-ja ugyanezt használja. Scriptek: `electron:package` (az
  aktuális platformra) és egy kicsomagolt (`--dir`) változat. A kimenet gitignore-olt mappába kerül.
- Windows: NSIS one-click, felhasználónkénti telepítés (nincs admin-kérdés), x64, aláíratlan,
  `deleteAppDataOnUninstall: true`.
- macOS: csak `dmg` `arm64`, ad-hoc aláírás (`identity: "-"`), `hardenedRuntime: false`; nincs
  `.command` script.
- Ikon: 512×512-es PNG, a `logo.png` fog-jeléből kivágva (a favicon is ez a jel), a builder
  erőforrás-mappájába commitolva.
- `docs/TELEPITES.md` magyarul, a doki számára: Windows — SmartScreen „További információ” → futtatás;
  macOS — áthúzás az Alkalmazások mappába, az első indítás elutasítása után Rendszerbeállítások →
  Adatvédelem és biztonság → megnyitás-engedély, minden frissítés után egyszer újra; vésztartalékként
  egy Terminálba másolható `xattr -dr com.apple.quarantine "/Applications/Mándoki Dental.app"` sor;
  kézi frissítés; eltávolítás macOS-en az app és a `~/Library/Application Support/<package name>`
  törlésével, mert a piszkozat valódi adatot tartalmazhat. A gombfeliratokat a próbatelepítés igazolja.
- A füst-teszt a kicsomagolt csomagot (`win-unpacked`, illetve `mac-arm64`) indítja a csupasz build
  helyett.
- A migrációs terv §2 macOS-sora, §9.2 és §10.4 az új útra igazodik: arm64, Rendszerbeállítás-út,
  script nélkül.
- **Nem tartozik ide:** release workflow és GitHub Release (`electron-release-workflow`), auto-updater,
  fizetős aláírás és notarizáció, x64 dmg, Drive- és gyökérmappa-lépések az útmutatóban (a
  FileSystemStorage-mérföldkő).

## Decisions
- Csak arm64 dmg (doki: a Mac Apple Silicon); nem universal és nem x64 — felesleges méret és a doki
  választási hibája.
- Rendszerbeállítás-út, nincs `.command` script (doki/fejlesztő): macOS 15 óta a jobbklikkes megkerülés
  nincs, a letöltött script maga is karanténba kerül és futási jog nélkül érkezik; a Terminál-sor csak
  vésztartalék.
- One-click NSIS — mert a `deleteAppDataOnUninstall` csak így hat; nem assisted telepítő.
- `hardenedRuntime: false` — notarizáció nélkül nincs haszna, ad-hoc aláírással pedig entitlement nélkül
  indítási hibát okoz.
- Ikon a márka fog-jele a logóból — azonos a mai faviconnal; nem a 180 px-es favicon felnagyítása.

## Verification
- [ ] tests — az `appId` a builder-configban és a mainben azonos (egy forrás vagy egyezés-teszt)
- [ ] `npm run test:electron` zöld a kicsomagolt Windows-csomagon
- [ ] typecheck/lint
- [ ] docs-check
- [ ] kézi (fejlesztő, Windows; a záró jelentés kézi blokkjába): a telepítő admin-kérdés nélkül telepít,
      a Start menüben „Mándoki Dental” az ikonnal; eltávolítás után a `%APPDATA%\<package name>` mappa
      nincs meg. A dmg a release workflow-ban készül.
