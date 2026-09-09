# egy-terv-nelkuli-paciens-uj
Type: bug
Source: review:2026-08-25-doctor-review-zsufolt-reggel#1

Egy terv nélküli páciens saját adatlapján a "Kezelési tervek" tab üres-állapotának "+ Új terv"
gombja megerősítés nélkül, csendben felülírja bármely másik páciensnél aktív, mentetlen
piszkozatot. Ugyanez a gomb felirat máshol (Kezdőlap "+ Új kezelési terv", már meglévő
tervlánccal rendelkező páciens "+ Új terv" gombja) helyesen felugrasztja a "Piszkozat
felülírása" figyelmeztetést.

Repró: legyen egy aktív, mentetlen piszkozat (bármely páciensnél); nyiss egy másik, még terv
nélküli pácienst, és a saját adatlapján kattints a "+ Új terv" gombra. Elvárt: "Piszkozat
felülírása" AlertDialog, Mégse/Folytatás választással. Tényleges: azonnal betöltődik egy
vadonatúj, üres piszkozat a másik páciens nevére, a korábbi piszkozat nyomtalanul elvész.

Ok: `PatientDetailPage.tsx` `startFirstPlan()` közvetlenül hívja a
`copyPlanIntoDraft(next, patient.dirName)`-t, a `kellMegerosites`/`vanMentetlenPiszkozat`
ellenőrzés nélkül — szemben a `PlanVersionActionDialog.tsx` `usePlanVersionActions().inditas()`
függvényével, amit a másik három hívóhely használ.
