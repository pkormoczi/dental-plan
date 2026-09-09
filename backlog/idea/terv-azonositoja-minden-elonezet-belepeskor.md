# terv-azonositoja-minden-elonezet-belepeskor
Type: bug
Source: review:2026-09-09-doctor-review-elso-megnyitas#3

Egy vadonatúj tervlánc terv-azonosítója minden Előnézetre lépéskor újragenerálódik, ha a doki
közben visszamegy szerkeszteni: az első Előnézet-belépéskor kiosztott azonosító (pl. „3187kd”)
egy „Vissza a szerkesztőbe” → újra Előnézet kör után lecserélődik (pl. „87094x”), és ez a
végleges azonosító kerül a mentett verzió mappanevébe és a letöltött PDF fájlnevébe is. Ok:
`app/src/pages/PreviewPage.tsx` a friss lánc `tervId`-jét egy `useRef`-ben
(`ujLancTervIdRef`) stabilizálja — ez csak egyetlen komponens-mountra érvényes, a lapelhagyás
után a `feloldKovetkezoAzonosito()` új azonosítót foglal, mert a `plan.tervId` a piszkozatban
végig üres marad (`blankPlan.ts`), amíg a storage a mentéskor ki nem tölti. Elvárt viselkedés: a
friss lánc `tervId`-je a piszkozathoz kötődjön — az első Előnézet-belépéskori foglaláskor íródjon
be a `plan.tervId` mezőbe —, ne a PreviewPage-komponens élettartamához, hogy tetszőleges számú
Előnézet-be-és-kilépés után is ugyanazt az azonosítót találja. Kizárt: a foglalási mechanizmus
(`feloldKovetkezoAzonosito`) egyéb viselkedése — csak az eredmény korábbi, tartós rögzítése a
piszkozatba.
