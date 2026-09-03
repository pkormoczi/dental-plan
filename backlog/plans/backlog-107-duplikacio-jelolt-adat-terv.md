# Backlog 107. tétel — Duplikáció-jelölt chip megkülönböztető adattal — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 107. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A `pages/paciensek/DuplikacioJavaslatok.tsx` javaslat-sora ma kizárólag
MINŐSÉGI indoklást ír ki (`azonos név, egyező születési dátum`), a
tényleges születési dátumot/telefonszámot sosem. Több hasonló nevű
jelöltnél — apa/fiú, gyakori vezetéknév, „-né" nélküli házaspár — a
chipek egymástól megkülönböztethetetlenek, tehát a doki nem tud dönteni
a listáról: ki kell lépnie a dialógusból és be kell néznie a
pácienslistába.

Az adat rendelkezésre áll: a duplikáció-detektálás 2. fázisa
(`components/usePaciensDuplikacio.ts` → `domain/torzsadatBetoltes.ts`
`loadTorzsadatok`) a szűk jelölt-körre már betölti a születési dátumot és
a telefont, csak a `duplikaciosJeloltek()` viszony-osztályozás után
eldobja az értéket. A tétel tehát nem új adatforrás, hanem egy már
megfizetett betöltés eredményének felszínre hozása.

## Döntések

### 1. A chip a tényleges értéket írja ki, a minőségi indoklás helyett

A javaslat-soron a jelölt saját, nyilvántartott születési dátuma és
telefonszáma jelenik meg. A mai `(azonos név, egyező születési dátum,
eltérő telefon)` zárójeles indoklás megszűnik; az „egyezik" tényt a doki
onnan látja, hogy a chipen álló érték megegyezik azzal, amit épp begépelt
— a mező pár sorral feljebb, ugyanabban a dialógusban látszik.

**Miért:** a minőségi indoklás pontosan azt a kérdést hagyja nyitva,
amiért a doki a listát nézi („melyikük az?"). Két megfontolt alternatíva
esett ki:

- *Indoklás + érték egymás mellett* (`azonos név, eltérő születési dátum
  (1965.01.02.)`) — visszafelé a legkíméletesebb, de a 440 px-es
  dialógusban három jelöltnél átfuthatatlanul hosszú sorokat ad, és
  kétszer mondja ugyanazt.
- *Csak érték, mindenféle jelölés nélkül* — elveszítené az
  ELLENTMONDÁS jelzését, ami a `duplikaciosJeloltek()` rendezésének
  (`jeloltRang`) és a `nev-pontos` ág megerősítő dialógusának a
  szemantikai alapja.

### 2. Az ellentmondás MEZŐSZINTEN jelölődik, nem a sor végén

Ha egy jelölt nyilvántartott értéke ellentmond a most begépeltnek,
KIZÁRÓLAG az az egy érték kap `⚠` prefixet és `t.warn` színt; a másik
(egyező vagy hiányzó) érték szürke marad.

A jelölés soha nem csak szín (`docs/07-felulet-rendszer.md`): a `⚠`
karakter maga a nem-színes jel, és az érintett érték szöveges,
képernyőolvasónak szóló megnevezést is kap („eltérő születési dátum:
1965.01.02.") — így a mai `indoklas()` információtartalma
akadálymentesen nem vész el, csak lekerül a vizuális felületről.

**Miért:** a sorvégi, mezőt meg nem nevező `(eltérő adat)` jelzés a
dokira hagyná az összevetést — pont azt a munkát, amit a tétel meg akar
szüntetni. A „mezőszintű szín ÉS sorvégi szöveg" kombináció redundáns
lenne, mert a `⚠` prefix már önmagában nem-színes jel.

### 3. A névegyezés minőségéből csak a „hasonló" marad jelölve

`nev-pontos` jelölt semmilyen névre vonatkozó jelölést nem kap — a név
maga látszik, és a doki épp azt gépelte be. `nev-hasonlo` jelölt kap egy
halvány `hasonló név` jelzést.

**Miért:** a hasonló-név ág az egyetlen, ahol a „miért van ez egyáltalán
a listán?" kérdés nem válaszolja meg magát (a token-alapú egyezés — pl.
felcserélt szórend, becenév-prefix — nem nyilvánvaló ránézésre). A
`nev-pontos` jelölés viszont tiszta zaj lenne. A jelölés teljes
elhagyása azért esett ki, mert a hasonló-név ágon indokolatlan
találatnak látszana a sor.

### 4. Adat nélküli jelölt explicit „nincs rögzített adat" jelzést kap

Ha a jelöltnek sem születési dátuma, sem telefonja nincs rögzítve (a
quick-create-tel, csak névvel felvitt páciens gyakori esete), a chip
halvány, szürke `nincs rögzített adat` szöveget mutat.

**Miért:** a puszta név ránézésre megkülönböztethetetlen lenne a még be
nem töltött állapottól (5. döntés) és két adat nélküli jelölt egymástól
is. Az explicit szöveg kimondja, hogy nem a betöltés hiányzik, hanem
tényleg nincs mihez hasonlítani — a dokinak be kell néznie a pácienshez.

Ha csak az EGYIK mező hiányzik, a meglévő önmagában áll (nincs „—"
kitöltő) — ez a `components/PatientListRow.tsx` mai viselkedése.

### 5. Betöltés előtt „adatok betöltése…" helykitöltő

A `nev-pontos` jelölt ma AZONNAL, a 2. fázis I/O-ja előtt megjelenik
(nulla késleltetésű figyelmeztetés) — ez megmarad. Az érték helyén addig
halvány `adatok betöltése…` áll.

Ehhez a jelöltnek meg kell tudnia különböztetni a „még nem töltődött be"
és a „betöltve, de üres" állapotot, amit a mai alak nem tud (mindkettő
`'hianyzik'`). A jelölt-objektumnak tehát hordoznia kell (a) a
betöltöttség tényét és (b) a jelölt tényleges DOB/telefon értékét — a
`duplikaciosJeloltek()` mindkettőt megkapja a `torzsadatByDir`-ből, ma
csak eldobja. A viszony-mezők (`szuletesiIdo`/`telefon`
`AdatViszony`-ai) és az `ellentmondas` VÁLTOZATLANUL megmaradnak: a
rendezés (`jeloltRang`), a `nev-hasonlo` kiszűrése és a hívók megerősítő
ágai ezekre épülnek.

**Miért:** a jelzés nélküli pop-in átmeneti állapota vizuálisan azonos
lenne a „nincs rögzített adat" esettel (4. döntés), tehát ~300 ms-ig
hazudna. A másik irány — hogy a `nev-pontos` jelölt is várja meg a 2.
fázist — visszabontaná a `duplikaciosJeloltek()` explicit,
kommentben rögzített döntését a nulla késleltetésű figyelmeztetésről.

### 6. Elrendezés: név + gomb egy sorban, adat behúzva alatta

A javaslat-sor kétsorossá válik: felül a páciensnév és az „Ezt a
pácienst választom" gomb (a mai szerkezet), alatta behúzva, kisebb
mérettel az adat-sor.

**Miért:** a mai egysoros `Flex wrap` a 440 px-es dialógusban a
névhossztól függő, kiszámíthatatlan töréspontot adna — a gomb hol a sor
végén, hol alácsúszva jelenne meg. A `JAVASLAT_LATHATO = 3` korlát mellett
a kétsoros forma még kényelmesen átfutható.

### 7. A „Mégis új páciens létrehozása?" megerősítő is megkapja az adatot

Az `UjPaciensDialog.tsx` `'megis-uj'` ága ma egyetlen, vesszővel fűzött
névsort ír. Helyette jelöltenként egy sor, ugyanazzal a név + adat
formátummal és ugyanazzal az ellentmondás-jelöléssel, mint a chipen —
KÖZÖS formázóból, hogy a két felület ne térhessen el egymástól.

„Ezt a pácienst választom" gomb ebbe a dialógusba NEM kerül: a
megerősítő feladata a létrehozás jóváhagyása, a választásé a mögötte
látható chip. Három versengő akció egy `AlertDialog`-ban ezt
elmosná, és duplikálná a chipet.

A `'eltero-adat'` ág szövege VÁLTOZATLAN — az már ma is megnevezi, melyik
mező tér el.

### 8. A `PatientEditorPanel` save-time megerősítője nem változik

Ott a doki egy konkrét, MÁR NYITOTT páciens adatlapján áll, és
átnevezésről dönt, nem választásról — a megerősítő puszta névfelsorolása
ott a helyes felbontás, javaslat-lista és „választom" akció nélkül (ez a
felület mai, tudatos eltérése a quick-create-től).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `PatientEditorPanel` megerősítő dialógusa** (8. döntés).
- **A 2. fázis betöltési stratégiája** — a `DUPLIKACIO_DEBOUNCE_MS`, a
  `JELOLT_MAX` korlát, a kulcsolt merge-cache és a verseny-kezelés
  érintetlen; a tétel nem indít új I/O-t.
- **A jelölt-szűrés és -rendezés szabályai** — `nevJeloltek()`
  token-hasonlósága, a `-né` kivétel, a `nev-hasonlo` + ellentmondás
  kiszűrése, a `jeloltRang` rendezés és a `JAVASLAT_LATHATO = 3`
  megjelenítési korlát mind változatlan.
- **A 94. tétel** (Terv adatai Név mezőjének identitás-védőhálója) szintén
  a `usePaciensDuplikacio`-ra épül majd, de saját felülettel — nem ez a
  tétel dönt a megjelenéséről.
- **Adatvédelem:** nincs új adat a képernyőn. A születési dátum és a
  telefon ma is látszik a Kezdőlap „Legutóbbi páciensek" sorain
  (`PatientListRow`), a Pácienslistán és a páciens sticky fejlécén —
  ugyanazon a gépen, ugyanannak a dokinak.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/paciensDuplikacio.ts` — a `DuplikaciosJelolt` a
  viszony-mezők MELLETT hordozza a betöltöttséget és a tényleges
  DOB/telefon értéket; a `duplikaciosJeloltek()` átengedi őket a
  `torzsadatByDir`-ből.
- `app/src/pages/paciensek/DuplikacioJavaslatok.tsx` — az `indoklas()`
  helyén az adat-sor renderelése (2–6. döntés).
- `app/src/pages/paciensek/UjPaciensDialog.tsx` — a `megerositesLeiras()`
  `'megis-uj'` ága sima stringről soronkénti tartalomra vált (7. döntés).
- A név + adat sor közös formázója — a projekt „második hívóra emel"
  szabálya szerint a két hívó (`DuplikacioJavaslatok`, `UjPaciensDialog`)
  közös helyre kerül; a tiszta, formázó rész `domain/` alá is
  illeszkedhet, a `⚠`/szín/behúzás viszont prezentáció.
- `app/src/domain/date.ts` `formatShortDate(iso, 'hu')` — ÚJRAHASZNÁLANDÓ,
  ugyanaz a formátum, mint a `components/PatientListRow.tsx`-en; a telefon
  ott is nyersen jelenik meg, ne normalizáljuk kiírásra (a
  `telefonKulcs()` kizárólag összehasonlításra való).
- `app/src/design/tokens.ts` `t.warn` — a komponens már importálja.
- `app/src/components/usePaciensDuplikacio.ts` — várhatóan érintetlen: a
  cache már ma is a teljes DOB/telefon párost tartja.

## Tesztelés (irányadó, nem kimerítő)

Automatizált:

- `app/src/domain/paciensDuplikacio.test.ts` — a meglévő
  `duplikaciosJeloltek` blokk bővítése: a jelölt hordozza a betöltött
  értékeket; a be nem töltött `nev-pontos` jelölt megkülönböztethető a
  betöltött-de-üres jelölttől; a rendezés és a `nev-hasonlo` kiszűrése
  nem regresszál; a bemenet nem mutálódik.
- `app/src/pages/paciensek/UjPaciensDialog.test.tsx` — a chip kiírja a
  születési dátumot és a telefont; ellentmondó születési dátumnál csak az
  a mező jelölt (és szövegesen is megnevezett); adat nélküli jelöltnél
  „nincs rögzített adat"; a `'megis-uj'` megerősítő jelöltenként egy sort
  mutat.

Kézi végigjátszás:

1. Vegyél fel két pácienst azonos néven (pl. „Kovács János"), eltérő
   születési dátummal és telefonnal.
2. `Páciensek` → `+ Új páciens`, gépeld be ugyanazt a nevet — mindkét
   jelölt megjelenik, mindkettőn látszik a saját születési dátuma és
   telefonja, tehát a listáról meg lehet őket különböztetni.
3. Töltsd ki a Született mezőt az EGYIK jelölt dátumával — a másik
   jelöltnél a dátum `⚠`-vel, ambernek jelölve jelenik meg, a telefon
   szürke marad.
4. Vegyél fel egy harmadik, hasonló nevű pácienst adat NÉLKÜL — a chipje
   `nincs rögzített adat`-ot mutat, és `hasonló név` jelzést kap.
5. Nyomj `Mentés`-t — a „Mégis új páciens létrehozása?" megerősítő
   jelöltenként egy sorban, ugyanazzal a formátummal és jelöléssel sorolja
   fel a találatokat.
6. Egy jelölt „Ezt a pácienst választom" gombja változatlanul működik;
   ellentmondó adatnál továbbra is az „A megadott adatok eltérnek"
   megerősítő nyílik.
7. Nyisd meg egy meglévő páciens adatlapját, `Páciens adatai` →
   `Szerkesztés`, írd át a nevét egy másik páciensére, `Mentés` — az ottani
   megerősítő VÁLTOZATLANUL csak neveket sorol fel.
