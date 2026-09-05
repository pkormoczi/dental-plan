# sema-migracios-keret
Type: chore
Source: doki felvetés

Hogyan alakulnak át a rendelő meglévő JSON-fájljai, amikor egy adatséma megváltozik. Fájltípusonkénti,
egymásra épülő verziólépések, mentés előtti biztonsági másolat, validáció, részleges hiba esetén
visszaállás, a régi adatokon futó migrációs tesztek. Az első `schemaVersion: 2` bevezetése már ezt
a módszert kövesse; a magasabb `schemaVersion` elutasítása (hard invariáns) változatlan.
