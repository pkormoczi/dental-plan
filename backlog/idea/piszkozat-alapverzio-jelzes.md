# piszkozat-alapverzio-jelzes
Type: feature
Source: desktop-app-migration-plan-final.md 5. döntés és §10.0

Ha a doki egy mentett verzióból (pl. v2) indít piszkozatot, és azóta ugyanabban a láncban újabb
verzió (v3) készült, a véglegesítés ma szó nélkül a következő szabad sorszámra (v4) ment, és nem
jelzi, hogy a piszkozat elavult alapból indult. Két gépnél ez a jellemző eset: a Windowson
félbehagyott piszkozat mellett a Macen elkészül egy újabb verzió. A piszkozat (`DraftMeta`)
megjegyzi a forrásverzióját, és az Előnézet véglegesítési checklistje amber, nem blokkoló tételt
mutat, ha a lánc legutolsó verziója azóta újabb. A piszkozat szinkronizálása nem része ennek.
