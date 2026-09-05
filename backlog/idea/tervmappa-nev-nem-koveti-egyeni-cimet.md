# tervmappa-nev-nem-koveti-egyeni-cimet
Type: chore
Source: doctor-review nagy-terv (2026-09-05), 16. megállapítás (Megjegyzés)

A mentett terv mappaneve a domináns kategóriából képződik
(`app/src/storage/DemoStorage.ts` `buildPlanDirName(javasoltTervCim(plan, priceList), …)`,
`app/src/domain/tervCim.ts` `javasoltTervCim`) — FÜGGETLENÜL attól, hogy a doki a Terv adatai lapon
saját címet adott-e a tervnek (ami külön, `terv-cimke.json`-ban él). Megfigyelve: egy „Teljes
szanálás” címen mentett terv mappaneve mégis „Korona és hídpótlások_pvc528” lett. A felületen ez ma
nem látszik (a DEMO Fájlok fülön igen), de az Electron-fázis natív fájlböngészőjében a doki a saját
címét keresné a mappák között, és nem találná. Elvárt: a mappanév-javaslat elsőbbséget adjon a
kézzel megadott `terv-cimke.json` címnek, ha van, és csak ennek hiányában essen vissza a domináns
kategóriára — ugyanaz az elsőbbségi sorrend, mint a `megjelenitettTervCim()`-ben már megvan
(`app/src/domain/tervCim.ts`). Nem ide tartozik a mappanév UTÓLAGOS átnevezése egy már mentett
verziónál (a `_v<n>` invariáns és a meglévő mappák nem változnak).
