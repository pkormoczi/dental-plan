# demo-import
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a

A telepített app be tudja olvasni a demóból exportált fájlt (`kezelesi-terv-export-<ISO>.json`), így a doki a demóban rendbe tett árlistát, beállításokat és nyomtatvány-szövegeket nem veszíti el. Elérhető a varázsló „üres mappa” ágán („Van egy exportált fájlom a demóból”) és a Beállításokból is. Validálás sorrendben: `formatum` → `schemaVersion` → árlista- és beállítás-alak → sablonkulcsok (`<név>-v<szám>.md`, string értékek); bármelyik bukásánál semmi nem íródik. Sablonoknál egyesítés: az export győz, a hiányzókat a beépített készlet pótolja. Írás előtt megerősítő összegzés. Páciensadat az exportban nincs. A Pages-demó csak azután kapcsolható le, hogy a doki megerősítette a sikeres export-importot. Függ a `gyokermappa-varazslo` varázslójától. Migrációs terv §7.2.
