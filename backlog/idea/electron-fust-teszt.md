# electron-fust-teszt
Type: chore
Source: desktop-app-migration-plan-final.md §10.1 (Playwright füst-teszt)

A vitest jsdom-ban fut, így az „el sem indul a csomagolt app” hibaosztályt (rossz `base` miatt hiányzó
asset, protokoll-regisztráció, CSP-sértés `app://` alatt) semmi nem fogja meg. Egy Playwright
`_electron` füst-teszt a csomagolt appot indítja: a Kezdőlap megjelenik, egy demó-terv `/elonezet`
oldalán a PDF-előnézet betölt, és a konzolon nincs CSP-sértés. A Playwright saját Electron-példányt
indít — a fejlesztő Chrome-profilját és futó böngészőjét nem érinti, a böngésző-automatizálási
tilalommal összhangban. Lokálisan külön scripttel fut, nem a vitest-kapu része; CI-ben a release
workflow mindkét runnerén. Függ az `electron-hej-ablak`-tól és az `electron-csomagolas`-tól.
