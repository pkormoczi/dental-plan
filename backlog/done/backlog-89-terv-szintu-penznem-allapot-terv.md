# Backlog 89. tétel — Egyedi végösszeg és előleg pénznemenkénti állapota — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 89. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** a `backlog/redesign/` redesign-döntéssorozat § 8.6 „Egyedi
végösszeg és előleg” szakaszának `D487`/`D488`/`D489`/`D524`–`D527`
szelete. Ez a 63. tétel (Egyedi végösszeg, D69) 6. döntésének és a 64.
tétel (Előleg, D66) 8. döntésének VÁRAKOZÓ maradéka — mindkettő a 62.
tétel (Többpénznemes listaár, D71) elkészültére várt; a 62. tétel azóta
KÉSZ, az előfeltétel teljesült. A redesign `D<szám>`-jai NEM azonosak a
`docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

- A 62. tétel (D71) a pénznemváltást soronként nem-destruktívvá tette
  (`Sor.masikPenznemAr` stash, `app/src/domain/penznemValtas.ts`), de a
  `PatientPage.tsx` `applyPenznem()` (`:103-116`) KIZÁRÓLAG a sorokat
  járja be — a terv-szintű `Plan.kedvezmenyOsszeg` (D69) és
  `Plan.elolegOsszeg` (D66) érintetlenül marad.
- Mindkét mező pénznem-címke nélküli nyers egész (`domain/types.ts:187,
  199`), a pénznem alapegységében (HUF: forint, EUR: cent). A
  domain-logika (`domain/totals.ts` `tervVegosszeg()`/`elolegOsszegek()`)
  szándékosan pénznem-független — a pénznem csak a bevitel/formázás
  rétegében él (`NumberField unit`, `formatMoney`).
- Ennek következménye: HUF→EUR váltás után egy `50 000` Ft-os
  kedvezményből némán `500,00 €` lesz, egy `100 000` Ft-os előlegből
  `1 000,00 €` — nem kényelmi hiány, hanem néma mértékegység-hiba egy
  aláírandó dokumentum bemenetén. A rossz értelmezés jellemzően a
  meglévő `tulLog` figyelmeztetést vagy a `'eloleg-tullep'` kemény
  blokkot váltja ki, de szerencsés számoknál CSENDBEN marad.
- A `docs/03-funkcionalis-spec.md` § „Dokumentum nyelve / Pénznem”
  ismerteti a soronkénti stash-mechanizmust (D71), de egy szót sem szól
  arról, mi történik pénznemváltáskor a terv-szintű értékekkel.

## Döntések

### 1. A két terv-szintű összeg EGY közös stash-slotban mozog

Egy új, opcionális `Plan`-mező (javasolt név `masikPenznemOsszegek?: {
kedvezmenyOsszeg: number | null; elolegOsszeg: number | null } | null`)
tartja a NEM aktív pénznem terv-szintű állapotát, pontosan a
`Sor.masikPenznemAr` mintájára. Váltáskor: a JELENLEGI pár a stashbe
kerül, a stashben talált pár (ha van) előlép a fő mezőkbe.

**Miért:** a két érték mindig ugyanahhoz a pénznemhez tartozik, egy
slotban soha nem csúszhatnak szét egymástól; egy későbbi harmadik
terv-szintű összeg is befér ide új mező nélkül.

**Elvetett alternatíva A — két külön stash-mező**
(`masikPenznemKedvezmeny`/`masikPenznemEloleg`): olvashatóbb mezőnevek,
de két dolgot kellene szinkronban tartani ugyanarra az egyetlen
eseményre (pénznemváltás), feleslegesen.

**Elvetett alternatíva B — `Partial<Record<Penznem, …>>`** (az
`arlista.json` `Tetel.ar` mintájára): a 62. tétel ezt az irányt a
sor-szintű árra már explicit elvetette (breaking változás, migrációt
igényelne) — ez a tétel a MEGLÉVŐ, bevált stash-mintát követi, nem egy
másikat vezet be mellé.

### 2. A stash a `terv.json`-be kerül, additív mezőként

`schemaVersion` nem emelkedik, a `mennyisegKezi`/`masikPenznemAr`/
`kedvezmenyOsszeg`/`elolegOsszeg`/`paciensId` konvencióját követve.
Hiányzó/`null` mező = a másik pénznemben még sosem volt állapot.

**Miért:** egy félbehagyott, autosave-elt, majd újranyitott piszkozaton
a pénznemváltás ugyanúgy nem-destruktív kell maradjon, mint a soroknál
— a két réteg (sor-szintű, terv-szintű) viselkedése nem térhet el
egymástól.

### 3. Stash hiányában a blokk KIKAPCSOL, nem tart meg semmit

Ha a belépő pénznemre nincs mentett állapot, `kedvezmenyOsszeg` és
`elolegOsszeg` egyaránt `null` lesz — a két kapcsoló kikapcsolt
állapotban jelenik meg, a mai `0` végösszeg/összeg-átvitel helyett.

**Miért:** ez D488/D489 („a TELJES state: enabled + amount,
pénznemenként”) egyenes következménye, és a sor-szintű „hiányzó ár”
állapot terv-szintű analógja (`nincsListaar()`, `araztalanSorok()`). Egy
átvitt szám a másik pénznem alapegységében nem „adat”, hanem rossz
mértékegység — a doki tudatosan gépeli be újra.

**Elvetett alternatíva A — megtartás + amber figyelmeztetés:** egy
figyelmen kívül hagyott jelzés mellett rossz mértékegységű összeg
kerülhetne aláírt PDF-re — ugyanaz a kockázat, amit a tétel javítani
próbál, csak egy jelvénnyel álcázva.

**Elvetett alternatíva B — a mai néma megtartás:** ez maga a javítandó
hiba, nem alternatíva.

**Kizárva (nem mérlegelt, rögzítésre kerül):** bármilyen automatikus
HUF↔EUR átváltás — D11/D71 és a redesign D487 („nincs FX”) explicit
tiltja.

### 4. Nincs drift-korrekció a visszatérésnél

A `kedvezmenyOsszeg` fix, előjeles ELTÉRÉS (D69). Ha a doki a másik
pénznemben időközben sorokat vett fel/törölt, a stashből visszaálló
eltérés más cél-végösszeget ad, mint amit a doki eredetileg begépelt.
Ez NEM külön kezelendő eset ebben a tételben: pontosan az a viselkedés,
amit a `docs/02-domain-modell.md` § Terv-szintű egyedi végösszeg már ma
is leír egy sima, egy-pénznemen belüli sormódosításra. A meglévő
`tulLog` figyelmeztetés és az újra beírható mező a doki rendezési útja,
változatlanul.

**Miért:** egy „visszaszámolt” korrekció a fix-összeg elvet (D25) törné
meg, és a tárolt igazságot tenné élővé — ugyanaz az indok, ami miatt a
`kedvezmenyOsszeg` eredetileg fix összegként (nem élő %-ként) tárolódik.

### 5. A 0-végösszeg megerősítése lokális state marad

Nem kerül új mező a `Plan`-re a 0-megerősítéshez. A redesign D524
(„zero-confirmation pénznemenként külön state”) STRUKTURÁLISAN
teljesül anélkül, hogy tárolt flag kellene: a pénznem KIZÁRÓLAG a Terv
adatai lapon váltható (`PatientPage.tsx`), a `PlanEditorPage.tsx`
`EgyediVegosszegBlokk` a szerkesztőben él, tehát minden pénznemváltás
a szerkesztő komponensfát (és vele a `nullaMegerositve` lokális
state-et) is újramountolja a `plan.penznem` propon át. Mivel a 3.
döntés szerint stash hiányában az összeg `null`-ról indul, egy friss
`0` az új pénznemben ÚJRA kérdez; egy stashből visszatérő, korábban már
megerősített `0` viszont NEM kérdez újra — pontosan ezt írja le a
redesign D523 („0→más→0 újra kérdez, egyébként nem”).

**Miért:** egy tranziens UI-tudomásulvétel nem a dokumentum-séma
része — a PDF-nek és a Terv részletei nézetnek is figyelmen kívül
kellene hagynia egy ilyen mezőt, feleslegesen bonyolítva mindkettőt.

### 6. A véglegesítés-őr érintetlen (D527)

A stash láthatatlan marad a `veglegesitesOr.ts` `veglegesitesDiagnozis()`
számára — nem lesz belőle sem kemény blokk, sem puha, sem INFO
checklist-tétel. A meglévő `'eloleg-tullep'` kemény blokk (D66)
változatlanul él, és a redesign D525-ös esete (`0` végösszeg pozitív
előleg mellett) MA IS helyesen blokkol, mert az előleg nem törlődik
automatikusan a végösszeg nullázásakor.

**Miért:** a redesign D527 explicit kimondja, hogy véglegesítéskor
kizárólag az AKTUÁLIS dokumentum-pénznem állapotának kell validnak
lennie — a másik pénznem stashelt állapota sem nem blokkol, sem nem ad
figyelmeztetést.

### 7. A pénznemváltás-dialógus kimondja a terv-szintű hatást is

A `penznemvaltasHatasa()` (`domain/penznemValtas.ts`) a mai három
soronkénti számláló (`visszaall`/`arlistabol`/`arNelkul`) mellé
megkapja a terv-szintű információt: visszaáll-e mentett érték, vagy
kikapcsol-e egy éppen beállított egyedi végösszeg/előleg. A
`PatientPage.tsx` meglévő pénznemváltás-dialógusának szövege — CSAK ha
érintett — egy mondattal bővül a sorokról szóló mondat után. A
dialógus AKKOR IS megjelenik, ha nincs egyetlen kezelési sor sem
(`sorokSzama === 0`), de van beállított egyedi végösszeg vagy előleg —
a mai `sorokSzama > 0` feltétel bővül ezzel az esettel.

**Miért:** a 62. tétel vezette be az elvet, hogy a dialógus az ELŐRE
KISZÁMOLT tényleges hatást írja ki, nem egy általános figyelmeztető
mondatot — egy eltűnő kedvezmény vagy előleg ugyanolyan súlyú hatás,
mint egy sor árváltozása, és ma némán, dialógus nélkül veszne el, ha
nincs sor a tervben.

### 8. A piszkozat-tartalmasság a stasht is számolja

A `piszkozatTartalmas()` (`domain/piszkozat.ts`) a mai
`kedvezmenyOsszeg != null` / `elolegOsszeg != null` feltételek mellett
a stash tartalmát is figyelembe veszi.

**Miért:** enélkül egy olyan piszkozat, aminek az egyetlen tartalma egy
MÁSIK pénznemben elmentett kedvezmény/előleg, „üresnek” számítana — a
felülírás-védő `AlertDialog` (Kezdőlap, `OsszesTervSection`) nélkül
veszne el egy pénznemet visszaváltó doki alatt. Elméleti eset, de a
javítás egysoros, és a hiba osztálya pontosan az, amit ez a tétel
egyébként is javít.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Bármilyen automatikus HUF↔EUR árfolyam-átváltás — a 3. döntésben
  explicit kizárva, konzisztensen D11/D71-gyel.
- A `Plan.penznem` „nézett vs. dokumentum-pénznem” szétválasztása — a
  redesign D531 szerint ilyen szétválasztás nincs, az 52. tétel ezt már
  lezárta.
- A `Sor.masikPenznemAr` sor-szintű mechanizmus bármilyen módosítása —
  ez a tétel csak a terv-szintű PÁRJÁT építi meg mellé, a meglévőt nem
  bántja.
- Az Egyedi végösszeg százalékos bevitele — a 91. tétel „Kapcsolódó, de
  NEM” listája is kizárja, önálló tétel tárgya lehet, ha felmerül.
- A D66-os drift LÁTHATÓVÁ tétele a szerkesztőben („ez most a végösszeg
  34%-a”) — a 91. tétel 2. döntésében már elvetett irány, ez a tétel
  sem hozza vissza.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` `Plan` — az új, opcionális stash-mező, a
  `masikPenznemAr` séma-kommentjének mintájában megírt magyarázattal
  (1–3. döntés).
- `app/src/domain/penznemValtas.ts` — a `sorPenznemValtassal()` MELLÉ
  egy terv-szintű párja, ugyanabban a modulban, a „stash > nincs”
  kétágú logikával (a sor-szintű háromágú `stash > árlista > 0/0`
  árlista-ága itt nem értelmezhető); a `PenznemvaltasHatas` interfész
  bővítése a terv-szintű mezővel (7. döntés).
- `app/src/pages/PatientPage.tsx` `applyPenznem()` / `changePenznem()`
  / a megerősítő `AlertDialog` szövege és megjelenési feltétele — a
  bekötés (2–3. döntés) és a dialógus bővítése (7. döntés).
- `app/src/domain/piszkozat.ts` `piszkozatTartalmas()` — 8. döntés.
- `app/src/pages/PlanEditorPage.tsx` `EgyediVegosszegBlokk` /
  `ElolegBlokk` — VÁLTOZATLAN marad. A kikapcsolt állapot a `null`
  propból magától adódik; a `nullaMegerositve` lokális state marad, a
  komponens szerkezete nem változik (5. döntés).
- `app/src/domain/veglegesitesOr.ts`, `app/src/pdf/`,
  `app/src/pages/tervReszletei/` — VÁLTOZATLAN (6. döntés).
- Tesztek: `app/src/domain/penznemValtas.test.ts` — a terv-szintű
  stash-ágak; `app/src/pages/PatientPage.test.tsx` — a dialógusszöveg
  és a bővült megjelenési feltétel.
- Lezáráskor bővítendő dokumentáció: `docs/02-domain-modell.md` §
  Pénznemváltás, § Terv-szintű egyedi végösszeg, § Előleg;
  `docs/03-funkcionalis-spec.md` § 2. „Dokumentum nyelve / Pénznem” (ma
  nem szól a terv-szintű értékek pénznemváltási sorsáról); a
  `CLAUDE.md` „Sérthetetlen szabályok” `masikPenznemAr`-sora
  kiterjesztendő a terv-szintű stashre.

## Tesztelés (irányadó, nem kimerítő)

- HUF terven `50 000` Ft egyedi végösszeg-kedvezmény és `100 000` Ft
  előleg beállítása után EUR-ra váltás: mindkét kapcsoló KIKAPCSOLVA
  jelenik meg, sehol nincs `500,00 €`/`1 000,00 €`.
- EUR-ban új értékek megadása, majd vissza HUF-ra váltás: az eredeti
  forintos értékek térnek vissza, mindkét kapcsoló bekapcsolva.
- Újabb EUR-ra váltás: a korábban EUR-ban megadott értékek jönnek
  vissza (nem az árlistából, nem újra üresen).
- A pénznemváltás-dialógus a sorok melletti mondaton túl kimondja a
  terv-szintű hatást is; egy sor nélküli, de beállított egyedi
  végösszegű/előlegű terven a dialógus akkor is megjelenik.
- Autosave → oldal-újratöltés → pénznemváltás: a stash túléli az
  újratöltést (mentett `Plan`-mező).
- HUF-ban `0` egyedi végösszeg megerősítése → EUR-ra váltás → EUR-ban
  friss `0` beírása ÚJRA kér megerősítést; vissza HUF-ra váltva a
  korábban már megerősített `0` NEM kér újra.
- `0` egyedi végösszeg pozitív előleg mellett: a véglegesítés ma is
  blokkol, változatlanul (D525 nem sérül).
- A mentett `terv.json` diffje: csak az új, opcionális stash-mező
  jelenik meg vagy változik; `schemaVersion` változatlan; a generált
  PDF a nem érintett terveken bájtra ugyanaz marad.
- `npm run build`, `npm run lint`, `npm test` zölden fut az `app/`
  alatt.
