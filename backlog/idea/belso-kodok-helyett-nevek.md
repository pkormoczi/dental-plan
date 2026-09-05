# belso-kodok-helyett-nevek
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 9. megállapítás

A doki három helyen lát belső azonosítót, és attól fél, hogy ez a nyomtatványra és a letöltött fájl
nevére is rákerül: a Terv adatai lapon „Teszt Elek (Teszt-Elek_dqyezl)”
(`app/src/pages/PatientPage.tsx`, a páciensmappa-kötés `ReadOnlyField`-je), a sikerképernyőn a
monospace „<páciensmappa> / <tervmappa> / <verziómappa>” sor (`app/src/pages/PreviewPage.tsx`
`savedRef` ág), és a „Megnyitás külön” új lapjának címe egy blob-UUID
(`app/src/pages/TervReszleteiPage.tsx` `megnyitasKulon`). Elvárt: a doki nyelvén álljon ott, mi
hova került — „A terv a Teszt Elek nevű mappába kerül”, a sikerképernyőn „Teszt Elek · Korona és
hídpótlások · 1. verzió”, a külön lap címe a páciens neve. A kötés-jelző célja megmarad: akkor is
egyértelműen mutatnia kell, MELYIK pácienshez kötött a terv, ha a Név mező mást tartalmaz — a hat
karakteres utótag elrejtése ezt nem teheti kétértelművé. A letöltött fájl nevét a persona nem
tudta ellenőrizni; az ma `kezelesi-terv-<névrész>-<tervId>.pdf` (`app/src/storage/paths.ts`),
tehát olvasható névvel indul. Nem ide tartozik a mappastruktúra és az azonosítók
megváltoztatása — csak a megjelenítés.
