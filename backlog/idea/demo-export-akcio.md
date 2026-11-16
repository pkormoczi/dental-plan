# demo-export-akcio
Type: feature
Source: desktop-app-migration-plan-final.md 6. döntés és §7.1

A Pages-demó nyugdíjazása előtt a doki árlistája, beállításai és sablonjai nem veszhetnek el. Az
Adatkezelés fülön egy „Adatok exportálása az asztali alkalmazáshoz” gomb egyetlen JSON-fájlt tölt
le (`formatum: 'dental-plan-export'`, `schemaVersion`, árlista, beállítások, sablonok név
szerint), páciensadat nélkül. A beolvasás a `PlanStorage` interfészen át történik, kiírás előtt
alak-ellenőrzéssel, hogy egy sérült demó-állapot már exportáláskor hangosan bukjon. A `DemoBanner`
is jelzi, hogy ez a lépés a demó megszűnése előtt kötelező. Az import a telepített app tétele, nem
ez. Függ a `plan-storage-interfesz-bovites` `listTemplates()`-étől.
