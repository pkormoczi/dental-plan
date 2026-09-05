# kereso-talalat-rangsor
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 11.; nagy-terv (2026-09-05), 1.; papirrol (2026-09-05), 2. megállapítás

A tételkereső névtalálatai rangsor nélkül, az árlista sorrendjében jönnek
(`available.filter(nevEgyezik)`, `app/src/pages/planEditor/ItemPicker.tsx`), és a 12-es limit ebből
vág — így a kiemelt első találat gyakran nem a keresett tétel. A nagy-terv menetben ez háromból
háromszor fordult elő, és egyszer Enterrel egy rossz sor („Gyökértömés eltávolítása”, 20 000 Ft)
be is került a tervbe; utána a doki minden találatot végigolvasott és egérrel kattintott — a
billentyűzetes ciklus előnye elveszett. Repro: „gyökértömés”, „neodent”, „implantátumfej” — a papirrol futás
ugyanezt a két utóbbit egy második, független personán is megerősítette. Elvárt: a
névtalálatok rangsorolása — szó eleji vagy szóhatárra eső egyezés előrébb a szó belsejébe esőnél,
a `gyakori` tételek előre, a csomag-kategóriák („All-on-X csomagok”) hátrébb. A `gyakori` fele
csak az `arlista-nap` adatmunkája után látszik: ma mind a 118 tétel `gyakori: false`. Alternatíva,
ha a rangsor önmagában nem elég: eltérő kategóriájú 1. és 2. találatnál az Enter ne válasszon
magától. Változatlan a kétnyelvű `nevEgyezik` (`app/src/domain/search.ts`) és a kétszintű szerkezet
(névtalálat, alatta „Kategória: …”). A `kereso-fogszam-egyedi-tetel` ugyanezt a listát érinti más
okból.
