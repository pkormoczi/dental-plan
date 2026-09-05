# kereso-talalat-rangsor
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 11. megállapítás

A „koron” keresésre a doki első képernyőjén az „Impl. ideiglenes korona” (Szájsebészet), a
teleszkóp- és az ideiglenes koronák állnak, a fémkerámia és a cirkon korona csak görgetve — pedig
a napi munkában azok a gyakoriak. Ok: a névtalálatok rangsor nélkül, az árlista sorrendjében
jönnek (`available.filter(nevEgyezik)`, `app/src/pages/planEditor/ItemPicker.tsx`), és a 12-es
találat-limit ebből a sorrendből vág. Elvárt: a részszó-találatok rangsorolása a találat helye
szerint — a tétel nevének elejére vagy szóhatárra eső egyezés előrébb, mint a szó belsejébe eső
(„Korona…” előbb, mint „Impl. ideiglenes korona”) —, és a `gyakori` jelölésű tételek a lista
elejére. A `gyakori` fele csak az `arlista-nap` adatmunkája után hoz látható változást: ma mind a
118 tétel `gyakori: false`. Változatlan marad a kétnyelvű egyezés szabálya
(`app/src/domain/search.ts` `nevEgyezik`) és a kétszintű szerkezet (névtalálat, alatta a
„Kategória: …” fejléc) — a rangsor csak az 1. szinten belül rendez. A doki másik felvetése
(magasabb találati lista) nyitva marad. A `kereso-fogszam-egyedi-tetel` ugyanezt a listát érinti
más okból — a két tétel implementálási sorrendje számít.
