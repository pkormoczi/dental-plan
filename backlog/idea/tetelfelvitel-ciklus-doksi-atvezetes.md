# tetelfelvitel-ciklus-doksi-atvezetes
Type: chore
Source: /implement-batch futás (2026-09-08), a tetelfelvitel-fokusz-fog-mezore lezárása után

A `tetelfelvitel-fokusz-fog-mezore` tudatosan átírta a billentyűzetes tételfelvitel
ciklusát: fogszámot kívánó tétel felvétele után a fókusz a sor Fog mezőjébe megy, és onnan
az Enter visz vissza a fázis keresőjébe. A terv a doksi-átvezetést a `/finish` 4. lépésére
bízta, az `/implement-batch` viszont `/finish`-t nem futtat — így három helyen a régi
ciklus áll, és ellentmond a kódnak: `app/src/CLAUDE.md` § Amit soha („kereső ürül, fókusz
marad”), `docs/PRODUCT.md` § Napi flow 2. pontja, valamint a
`.claude/skills/manual-checks/keyboard-a11y.md` „A kritikus ciklus” szakasza. Az utolsó a
legkárosabb: a szelet a régi elvárást ellenőrizteti, tehát a következő böngészős menet
hamis találatot adna a helyes viselkedésre. A három szöveg az új ciklust írja le, a
„fogszámot nem kívánó tételnél a fókusz a keresőben marad” kivétellel együtt; az invariáns
szándéka (egérmentes, megszakítás nélküli felvitel) változatlan. Nem tartozik ide a
`CHANGELOG.md`/`FEATURES.md` (külön, kézi hívás).
