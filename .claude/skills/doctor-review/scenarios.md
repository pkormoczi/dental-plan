# Doctor-review forgatókönyvek

Hét forgatókönyv, együtt lefedve a `persona.md`-ben felsorolt 21 folyamatot.
Egy futás egy forgatókönyvet jár be. Minden forgatókönyv négy mezőt kap —
**kattintási útvonal szándékosan nincs köztük**, azt a naiv bejárónak kell
megtalálnia.

A `Belépő állapot` a `reset` (lásd `SKILL.md` § 0. fázis) UTÁNI, friss
seed-adatra épül (`app/src/storage/seed/plans.ts`). A konkrét páciensnevek a
seed jelenlegi tartalmát tükrözik — ha a seed időközben változott, a fő
ügynöknek a felkínálás előtt egy gyors ellenőrzéssel (a Pácienslistán) kell
megbizonyosodnia, hogy a névre még illik a leírás, és ha nem, a legközelebbi
hasonló seed-pácienst kell ajánlania helyette, nem hibáznia a futást.

---

## `zsufolt-reggel`

- **Cél:** Hétfő reggel, első páciens előtt pár perccel érkezel. Tegnap
  délután félbehagytál egy tervet — folytasd, aztán vegyél fel egy vadonatúj
  pácienst, akiről egyelőre csak a nevét tudod. Menet közben megcsörren a
  telefon, és amikor visszatérsz, nem emlékszel pontosan, hol tartottál.
- **Belépő állapot:** Reset után a Kezdőlapon állsz. Mivel a reset törli a
  piszkozatot is, a „félbehagyott piszkozat" részt magadnak kell
  előidézned: kezdj el egy új tervet, gépelj be pár sort, majd — mielőtt
  véglegesítenél — navigálj el máshova (pl. Pácienslista), mintha
  csörrent volna a telefon, és térj vissza a Kezdőlapra.
- **Lefedett folyamatok:** 1 (nap indítása, piszkozat felismerése/
  folytatása), 2 (új páciens gyors felvétele, csak névvel), 21 (visszatérés
  megszakítás után).
- **Ismert korlát:** a demó `localStorage`-alapú, nincs valódi
  „telefonhívás" esemény — a megszakítást navigációval kell szimulálni.

## `uj-terv`

- **Cél:** Egy meglévő páciens (pl. Nagy Éva) új kezelési tervet kér: több
  fázisra bontva, vegyesen keresővel és a fogtérképről felvitt tételekkel,
  plusz egy olyan kezeléssel, ami nincs az árlistában. Menet közben
  rájössz, hogy egy tételt rossz fogra vittél fel, és a fázisok sorrendjét
  is meg kell cserélned.
- **Belépő állapot:** Reset után a Kezdőlapról indulva keresd meg Nagy Évát,
  és indíts az ő nevén egy új tervet.
- **Lefedett folyamatok:** 5 (több fázis, több sor), 6 (kereső + fogtérkép),
  7 (egyedi kezelés), 8 (fogak/mennyiség/ár/kedvezmény/leírás/becsült ár),
  9 (javítás, törlés, visszavonás, átrendezés).
- **Ismert korlát:** nincs.

## `nevutkozes`

- **Cél:** Egy páciens jelentkezik be, akinek a neve megegyezik egy már
  meglévő pácienssel (Nagy Éva — a seedben már két terv-lánca is van).
  Közben egy másik, valóban meglévő páciens adatában javítanod kell egy
  elgépelt telefonszámot, és észreveszed, hogy a törzsadat és egy korábbi
  terv pillanatképe nem egyezik.
- **Belépő állapot:** Reset után indíts egy „Új páciens" felvitelt Nagy Éva
  nevével, majd külön lépésként keresd meg egy másik, tetszőleges meglévő
  pácienst (pl. Kovács János) az adatjavításhoz.
- **Lefedett folyamatok:** 3 (hasonló nevű/már létező páciens), 4 (meglévő
  páciens keresése és adatjavítás), 19 (törzsadat ↔ pillanatkép eltérés).
- **Ismert korlát:** a seedben nincs két EGYMÁSHOZ HASONLÓ (de nem azonos)
  nevű páciens — ha ez a részág fontos, a fő ügynöknek egy hasonló nevet
  kell begépeltetnie (pl. „Nagy É.") a duplikáció-felismerés próbájához.

## `nemet-euro`

- **Cél:** Egy külföldi páciens (pl. Horváth Péter, akinek már van
  német/eurós terve a seedben) számára egy MEGKEZDETT terven kell nyelvet
  és pénznemet váltanod, majd előleget és egy kerek egyedi végösszeget is
  megadnod.
- **Belépő állapot:** Reset után keresd meg Horváth Pétert, nyiss egy új
  verziót vagy tervet a nevén, és a szerkesztőben válts nyelvet/pénznemet.
- **Lefedett folyamatok:** 10 (nyelv/pénznem/orvos/dátum módosítás
  megkezdett tervnél), 12 (magyar/német, forint/euró terv), 13 (előleg és
  egyedi végösszeg).
- **Ismert korlát:** nincs.

## `veglegesites`

- **Cél:** Egy tervet előnézetbe viszel, értelmezed a figyelmeztetéseket
  (van köztük hiányos ár, elavult árlistai adat és kézzel átírt tartalom
  is), véglegesíted, majd egy másik páciensnek „csak ajánlat" formában
  készítesz dokumentumot.
- **Belépő állapot:** Reset után folytasd az `uj-terv` vagy `zsufolt-reggel`
  forgatókönyvben létrehozott tervet, VAGY indíts egy gyors új tervet egy
  tetszőleges seed-páciensen, és vidd el az Előnézetig.
- **Lefedett folyamatok:** 11 (hiányos/elavult/inaktív/kézzel átírt tartalom
  kezelése az őr-checklistán), 14 (előnézet, figyelmeztetések,
  véglegesítés), 15 („csak ajánlat" dokumentum).
- **Ismert korlát:** a PDF-iframe belseje nem ellenőrizhető képernyőképpel
  (lásd `SKILL.md` § Nem ellenőrizhető) — a persona csak a külső
  megjelenést és a letöltési felajánlást tudja értékelni.

## `visszatero-paciens`

- **Cél:** Egy már véglegesített tervű, visszatérő páciens (Nagy Éva —
  két verziója is van a seedben) újra jelentkezik: meg kell találnod a
  korábbi tervét, letöltened a PDF-jét, majd vagy új verziót nyitnod rá,
  vagy önálló új tervként lemásolnod egy másik páciensnek.
- **Belépő állapot:** Reset után indulj a Kezdőlapról vagy a
  Pácienslistáról, keresd meg Nagy Évát.
- **Lefedett folyamatok:** 16 (korábbi terv megkeresése, megtekintése, PDF
  letöltése), 17 (új verzió), 18 (másolás új tervként).
- **Ismert korlát:** a letöltött fájl tényleges lemezre kerülése nem
  ellenőrizhető (izolált profil).

## `admin`

- **Cél:** Rendelés előtti fél óra: az árlistában egy kezelés ára
  elavult, egy másikat inaktiválni kell, és a rendelői beállításokban
  módosítanod kell valamit (pl. egy orvos elérhetőségét vagy az
  alapértelmezett pénznemet).
- **Belépő állapot:** Reset után indulj a Kezdőlapról, navigálj az
  Árlista adminba, majd a Beállításokba.
- **Lefedett folyamatok:** 11 (hiányos ár, elavult árlistai adat, inaktív
  kezelés — az admin oldaláról), 20 (árlista/rendelői beállítás
  módosítása reális helyzetben).
- **Ismert korlát:** nincs.
