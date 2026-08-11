# Backlog 28. tétel — Páciens-szintű, terveken átívelő kontaktnyilvántartó — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 28. tételének megbeszélt megvalósítási döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

A `terv.json` `paciens` blokkja (docs/02-domain-modell.md) tervenkénti pillanatkép (D7) — egy visszatérő páciens minden terv-láncában külön-külön tárolódik `nev`/`szuletesiIdo`/`lakcim`/`telefon`/`email`/`taj`/`kiskoru`/`torvenyesKepviselo`, egymástól függetlenül szerkeszthetően. A páciens-entitás tétel (backlog-25, 2026-08-11) tudatosan ennyi nélkül zárult: a `paciens.json` ma csak `paciensId` + `nev`, kizárólag keresési index, és a tétel explicit kimondta, hogy egy önálló, terveken átívelő, élő kontaktnyilvántartó külön backlog-tétel — ez az.

## Döntések

### 1. D29-ütközés feloldása: új, önálló fájl, nem a `paciens.json` bővítése

`CLAUDE.md` "Sérthetetlen szabályok": *"A `paciens.json` és a `terv-cimke.json` kizárólag azonosító-/kereső-index és szervezési metaadat — soha nem system of record"* (D29). A `paciens.json` VÁLTOZATLAN marad — D29 betűre nem sérül. Egy ÚJ fájl (`paciens-adatok.json`, lásd 2. döntés) a páciens-mappa gyökerén EXPLICITEN, tudatosan valódi system of record a saját mezőire nézve, függetlenül bármely `terv.json` `paciens` blokkjától. A `terv.json` `paciens` blokkja változatlanul pillanatkép marad (D7): soha nem íródik felül a `paciens-adatok.json` alapján, és fordítva sem (lásd 3. döntés).

**Miért:** ez NEM D29 pontosítása, hanem egy önálló, ÚJ D-döntés lesz zárláskor — D29 szövege és a `paciens.json` szerepe nem változik. Elvetett alternatíva: a `paciens.json` bővítése telefon/email mezőkkel, D29 szűkítésével — elvetve, mert ez pont azt a garanciát törné meg, amiért D29 megszületett (a `paciens.json` provably tiszta index marad). Elvetett alternatíva: csak aggregált olvasási nézet, önálló írás nélkül — elvetve, mert nem adja meg, amit a doki kért (élő, terv-mentéstől független szerkesztés).

### 2. Mezők köre: a teljes `Paciens` interfész, a `nev` kivételével

`szuletesiIdo`, `lakcim`, `telefon`, `email`, `taj`, `kiskoru`, `torvenyesKepviselo` — mind bekerül a `paciens-adatok.json` hatókörébe. `nev` NEM duplikálódik ide, a `paciens.json` marad az egyetlen forrás rá.

**Miért:** a backlog-szöveg csak telefont/emailt említett, de a teljes törzsadat (a TAJ-számot és a kiskorú/törvényes képviselő párt is beleértve) ugyanúgy cross-plan, élő adat — egy szűkebb hatókör mesterséges határt húzott volna azonos jellegű mezők közé.

### 3. Nincs automatikus szinkron egyik irányban sem

Egy KONKRÉT terv Páciens adatlapján tett módosítás soha nem írja át a `paciens-adatok.json`-t; és fordítva, a `paciens-adatok.json` szerkesztése soha nem nyúl vissza egy már mentett `terv.json`-hoz.

**Miért:** két világosan elkülönült fogalom marad — "mit tartalmazott ez a konkrét ajánlat" (D7) és "mi a páciens jelenleg ismert adata" (ez a tétel). Elvetett alternatíva: terv-mentéskor automatikus szinkron a `paciens-adatok.json`-ba — elvetve, mert elmosná ezt a határt.

### 4. Üres állapot: élő fallback, mentéskor a teljes fájl egyszerre zár

Amíg nincs saját `paciens-adatok.json`, a Páciensek képernyő a páciens legutóbb módosított terv-láncának legfrissebb verziójából mutatja élőben a mezőket (a terv-cimke.json "élő auto-javaslat, kézi átírásig" mintája, backlog-25 4. döntés). Első mentéskor az ÖSSZES mező (nem csak a ténylegesen módosított) bekerül a fájlba a pillanatnyi értékén — onnantól a teljes fájl a forrás, egyetlen mező sem néz vissza többé a terv-pillanatképre.

**Miért:** mezőnkénti külön követés (mint a 27. tétel `mennyisegKezi`-je soronként) itt 7 mezőre egyszerre bonyolult adatmodellt igényelne kevés hozadékért; a fájl-szintű "egyszeri zárás" egyszerű és semmit nem veszít induláskor, hiszen minden mező a fallbackből induló, legjobb ismert értéket mutatja.

### 5. UI: önálló "Páciensek" képernyő, külön a Korábbi tervektől, keresztlinkkel

Új navigációs pont, ahol a doki páciensre keres (a meglévő `paciens.json`-index alapján) és szerkeszti a `paciens-adatok.json` mezőit. A Korábbi tervek (backlog-25) páciens-blokkja és a Páciensek képernyő kölcsönösen linkel egymásra ugyanahhoz a pácienshez, de funkcionálisan külön marad: Korábbi tervek = kezelési előzmény/verziók, Páciensek = élő törzsadat.

**Miért:** a törzsadat-szerkesztés más gyakoriságú/célú művelet, mint a tervek böngészése; egy önálló belépési pont tisztábban kommunikálja ezt, és lehetővé teszi a terv nélküli páciens felvitelét is (6. döntés).

### 6. Páciens felvihető terv nélkül is

A Páciensek képernyő önálló létrehozási utat ad: új páciens-mappa (`paciens.json` + `paciens-adatok.json`) jöhet létre 0 terv-lánccal, minimálisan a `nev` kötelező mezővel. A Korábbi tervek lista változatlanul csak a legalább 1 terv-lánccal rendelkező pácienseket listázza. "Meglévő páciens keresése" (backlog-25) ezentúl elsőként a `paciens-adatok.json`-ból tölt elő, ha létezik; ha nem, marad a mai, terv-pillanatkép-alapú előtöltés.

**Miért:** ez valósítja meg legteljesebben a "terv-mentéstől független" szellemet (pl. egy érdeklődő adatai rögzíthetők terv nélkül is). Tudatosan vállalt kockázat: két páciens-entitás duplikálása — ez MÁR MA IS nyitott kérdés (backlog-25 "Kapcsolódó, de NEM tartozó" szakasza), ez a tétel csak egy újabb belépési pontot ad hozzá, nem old meg és nem súlyosbít alapvetően.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Két páciens-entitás utólagos összevonása (duplikáció-kezelés) — backlog-25-ben is nyitva maradt, ez a tétel nem oldja meg.
- A nyomtatvány (PDF) nem változik — a `paciens-adatok.json` SOHA nem forrása a PDF-nek, kizárólag a `terv.json` saját `paciens` blokkja kerül nyomtatásra (D7).
- Duplikáció-előrejelzés/névegyezés-figyelmeztetés új páciens felvitelekor — nem volt szó róla.
- A `Paciens` interfész (terv.json-beli, tervenkénti blokk) bármilyen mezőszintű módosítása — változatlan, ez a tétel egy PÁRHUZAMOS, önálló adatforrást vezet be mellé.
- Titkosítás/hozzáférés-korlátozás a `paciens-adatok.json`-on — a mockup-fázis már ma is titkosítatlan localStorage-ot használ szándékosan, ez a tétel nem vezet be új szigorítást.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` — új típus (a `Paciens` `nev` nélküli részhalmaza), `schemaVersion: 1`-gyel, a `PatientRecord`/`PlanLabel` mintájára.
- `app/src/storage/paths.ts` — a `paciens-adatok.json` fájlnév és olvasó/író segédfüggvények, a `paciens.json`/`terv-cimke.json` mintájára.
- `docs/05-technologia.md` § `PlanStorage` interface — új metódusok: törzsadat olvasás/írás, és önálló páciens-létrehozás terv nélkül.
- `app/src/domain/` — új segédfüggvény az "élő fallback vs. lezárt fájl" eldöntésére; a `planUjPaciensselTervhez`/`ujTervPaciensAdataival` (backlog-25) kiegészítése, hogy a `paciens-adatok.json`-t preferálja forrásként.
- `app/src/pages/` — új képernyő (lista/keresés + szerkesztő), új route, új nav-pont.
- `app/src/pages/PlanHistoryPage.tsx` — kereszt-link a páciens-blokkból.
- `app/src/storage/DemoStorage.ts`, `app/src/storage/seed/` — demó-bővítés.
- `docs/02-domain-modell.md` § Páciens- és terv-mappa — séma-dokumentáció.
- `docs/01-attekintes-es-dontesek.md` — új D-szám lezáráskor (nem D29 módosítása).

## Tesztelés (irányadó, nem kimerítő)

- Fájl nélküli páciens → élő fallback a legutóbbi terv-pillanatképből.
- Első mentés → minden mező rögzül, egy utólagos terv-módosítás nem írja át a fájlt.
- Terv-szintű módosítás nem szivárog át a `paciens-adatok.json`-ba, és fordítva.
- "Meglévő páciens keresése": fájl esetén onnan, egyébként a régi módon tölt elő.
- Terv nélküli páciens felvihető, nem jelenik meg a Korábbi tervek listán terv nélkül.
- Kereszt-link mindkét irányban működik.
- PDF-tartalom változatlan marad.
