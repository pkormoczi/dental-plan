# electron-release-workflow
Type: chore
Source: desktop-app-migration-plan-final.md §10.1 és §9.3

A két telepítő nem építhető megbízhatóan egy gépről (macOS-re nincs keresztfordítás), ezért egy új
`.github/workflows/release.yml` `v*` tagre indul, `windows-latest` + `macos-latest` mátrixszal: `npm
ci`, `npm test`, a füst-teszt, `electron:package`, majd a telepítők, a macOS-script és a README
feltöltése a GitHub Release-be. A `ci.yml` és a Pages-deploy változatlan. Az első futás egy
teszt-tagre megy (pre-release), hogy a doki próbatelepítése valódi csomagból történjen. Függ az
`electron-csomagolas`-tól és az `electron-fust-teszt`-től.
