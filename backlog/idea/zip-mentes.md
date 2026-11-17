# zip-mentes
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a

A telepített appban a Beállítások Adattárolás szekciójából „Biztonsági mentés ZIP-be” készíthető: a main process a teljes gyökérmappát (`.tmp-*` nélkül) ZIP-be írja natív mentés-dialógussal, `mandoki-dental-mentes-<ISO dátum>.zip` alapértelmezett névvel; az alapértelmezett cél nem a gyökérmappa és nem a Letöltések. A renderer nem kap fájlrendszer-hozzáférést; a ZIP-író kis, karbantartott függőség a main bundle-ben. A gyökérmappában egy `biztonsagi-mentes.json` (`utolso`, `gepId`) jegyzi az utolsó mentést: a szekció mutatja a dátumát, a Kezdőlapon pedig amber emlékeztető jelenik meg, ha 30 napnál régebbi vagy nincs. A visszaállítás kézi és dokumentált (kibontás üres mappába, majd a varázslóban „Másik mappa kiválasztása”); a telepítési útmutatóba kerül, és a 10.2a kész-definíciója egy fiktív adatos végigpróbát kér. Függ a `gyokermappa-varazslo` Adattárolás szekciójától. Migrációs terv §6.5.
