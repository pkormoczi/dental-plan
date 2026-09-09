# veglegesitett-terv-ervenytelenitese
Type: feature
Source: review:2026-09-08-doctor-review-hiba-javitas#3

Ha egy már véglegesített és kiadott terv utólag tévesnek bizonyul (pl. páciens-összekeverés —
a papír Varga Zsófia nevén ment ki, valójában Farkas Katalinnak szólt volna), nincs hivatalos
mód a rendszerben ezt jelölni: a verzió „…további műveletek" menüje csak Letöltést és
„Másolás új tervbe"-t kínál, a „Páciens törlése" pedig pontosan emiatt van letiltva
(`domain/paciensTorles.ts` `paciensTorlesAkadaly`: `'veglegesitett-terv'`). A doki
kényszerűségből a terv címét írta át figyelmeztető szövegre („TÉVES kiadás — helyette lásd
Farkas Katalin") — ez csak egy index-fájlban (`terv-cimke.json`) látszó, felismerhetőségi
trükk, az eredeti `terv.json` összege és `VEGLEGES` státusza változatlan marad, mintha érvényes
ügylet lenne. Elvárt viselkedés: egy explicit „Érvénytelenítés" művelet a véglegesített terv
menüjében, ami látható, nem törölhető jelölést tesz a tervre (pl. „ÉRVÉNYTELEN" címke,
áthúzott összeg), és kizárja az esetleges jövőbeli összesítésekből — a `_v<n+1>` elv és a
„véglegesített verzió sosem íródik felül" invariáns sérelme nélkül, tehát a jelölés egy új
verzió vagy külön mező, nem az eredeti fájl módosítása.
