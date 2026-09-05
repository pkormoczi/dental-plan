# keltezes-datum-szerkesztheto
Type: feature
Source: doctor-review papirrol (2026-09-05), 5. megállapítás
Kerdes: Amikor egy múlt heti, kézzel írt tervet utólag viszel be: a nyomtatványon az eredeti (augusztusi) dátumot várod, vagy a bevitel napját? Volt már ebből vita a pácienssel?

A tétel a `PRODUCT.md` § Napi flow kimondott viselkedését kérdőjelezi meg („a keltezés a
betöltés pillanatában frissül”). A papírról bevitt, augusztusi terv nyomtatványára „2026.
szeptember 5.” kerül, és a Kiadás dátuma mező `ReadOnlyField` (`app/src/pages/PatientPage.tsx`) —
magyarázat nélkül, miközben az „Érvényes eddig” mellette szerkeszthető (és nem mondja, hogy
három hónap az alap). A doki elvárása: „vagy írhassam át augusztusra, vagy mondja meg, miért
nem.” Napi hatás: a páciens kezében két különböző dátumú dokumentum ugyanarról a tervről. Két
lehetséges kimenet: ha jogi ok miatt fix, egy rövid felirat a mező alatt („a nyomtatvány a mai
dátummal készül”); ha nem, múltbeli dátumra szerkeszthető keltezés. A
`datummezo-formatum-inkonzisztens` a dátumok alakjáról szól, nem a szerkeszthetőségről.
