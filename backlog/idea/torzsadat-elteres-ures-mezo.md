# torzsadat-elteres-ures-mezo
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 5. megállapítás
Kerdes: Az elmúlt héten hányszor írtál be páciensnek telefonszámot vagy születési dátumot utólag, a terv írása közben — és hányszor a kartonra külön?

A javasolt irány szűkíti a `docs/PRODUCT.md` kimondott szándékát („nincs automatikus szinkron a
terv paciens pillanatképe és a törzsadat között egyik irányban sem”) — a doki dönt, hogy az ÜRES
törzsadat-mező kivétel lehet-e. A helyzet: egy csak névvel felvett páciensnek a Terv adatai lapon
beírt telefonszám azonnal „1 mező eltér a páciens törzsadatától” jelzést kap, két
tükörszimmetrikus, egyforma súlyú gombbal („Frissítés a törzsadatból” / „Törzsadat frissítése a
tervből”, `TorzsadatDiffDialog.tsx`). A doki egyiktől azt féli, törli, amit most írt be — egyiket
sem nyomja meg, és a szám csak a tervben marad: a páciens kartonján és a Kezdőlap „Legutóbbi
páciensek” sorában nincs telefonszám, a következő tervnél újra be kell írni. Repro: „+ Új páciens”
csak névvel (Enter) → Terv adatai → Telefon kitöltése. Elvárt: ha a törzsadat mezője üres, nincs
mit felülírni — az érték kérdés nélkül (vagy egy egyértelműen elsődleges, a hatását kimondó
gombbal) a kartonra is felkerül; az eltérés-dialógus csak valódi ütközésnél jöjjön. Nem ide
tartozik a kétirányú automatikus szinkron.
