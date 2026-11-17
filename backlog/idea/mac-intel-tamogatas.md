# mac-intel-tamogatas
Type: feature
Source: fejlesztő felvetése a v0.1.0-teszt.1 után (2026-11-17)
Kerdes: Milyen Intel Macen fog futni az app, és milyen macOS-verzió van rajta?

Ma csak Apple Silicon Macre készül telepítő (`app/electron-builder.json` mac `dmg` `arm64`), mert a
tervezéskor a doki gépe ilyen volt. A felvetés szerint Intel processzoros Macen is futnia kell. Ehhez
x64-es macOS-build kell: vagy külön x64-es dmg, vagy egyetlen, mindkét processzoron futó
(universal) dmg. Az utóbbinál a doki nem választhat rossz fájlt, cserébe kb. kétszer nagyobb a
letöltés; ez a `/plan` termékkérdése. A release workflow-nak (`.github/workflows/release.yml`) és a
füst-tesztnek az x64-es csomagot is el kell indítania; hogy ez arm64-runneren Rosettával vagy Intel
runneren megy, azt a `/plan` dönti el. A `docs/TELEPITES.md` és a migrációs terv §9.2 „csak arm64”
állítása ezzel együtt változik. A régi Intel Mac lehet, hogy nem futtatja a friss Electront (ehhez
újabb macOS kell), ezért a tétel sorsa a gép macOS-verzióján múlik.
