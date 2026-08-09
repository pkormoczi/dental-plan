# Szoftverarchitekt-triázs — 2. kör (2026-08-09)

A `review/doktor-harom-nap-2.md` második körös igényeinek értékelése a
projekt keretei szerint: nincs backend/adatbázis/szerveroldali
páciensadat (D2), a fájlrendszer a system of record Drive-szinkronnal
(D3), egy felhasználó, egy gép, GDPR 9. cikk szerinti adat, egy
fejlesztő munka mellett.

A már megtervezett, nyitott backlog-tételeket (8. kategóriakezelés +
adattisztítás, 10. tétel-leírás, 13. garancia) nem tervezem újra — a
doki-nap megerősítette mindhármat, a hivatkozás a listákban szerepel.

---

## Az igények értékelése

### 1. Gyorsgombok + elgépelések + hiányzó tételek (az „árlista-nap" embermunka-fele)

- **Méret:** 0 óra kód. A kódrész (kategória-CRUD) már tervezett
  (`backlog-8`, 1.5–2 nap), de a doki-nap fájdalmainak többségét — a
  gyakori-csillagok, a „Neodetn"/„felépítmány"/„Ideigenes" javítása, az
  érzéstelenítés/kontroll/varratszedés tételek felvétele, a
  garanciaszöveg begyűjtése — a **meglévő** admin már ma tudja. Ami
  hiányzik: egy kitűzött, fél napos közös ülés.
- **Keretsértés:** nincs.
- **Valódi haszon:** időmegtakarítás (napi szinten) + hibacsökkentés
  (elgépelt név aláírt dokumentumon) + pácienskommunikáció. A lista
  legmagasabb haszon/befektetés arányú tétele — másodszor.
- **20%-os változat:** ez maga a 20% — kód nélkül. Konkrét javaslat: az
  ülés napirendjébe kerüljön be a 13. tétel magyar garanciaszövegének
  diktálása és a sáv-alsóhatárok visszaigazolása is (`docs/06` nyitott
  kérdése), hogy egyetlen ülés adja az összes embermunka-inputot.

### 2. Fázis törlése megerősítés nélkül (öt sor egy kattintással, visszavonás nincs)

- **Méret:** 1–2 óra. A meglévő `AlertDialog`-minta (Home,
  PlanHistoryPage) újrahasznosítása a `PlanEditorPage` „Fázis törlése"
  gombján — csak akkor, ha a fázisban van sor (üres fázis törlése
  maradjon egy kattintás).
- **Keretsértés:** nincs.
- **Valódi haszon:** hibacsökkentés — az egyetlen egy-kattintásos,
  többsoros, helyreállíthatatlan adatvesztés a szerkesztőben, és az
  azonnali piszkozat-autosave még rögzíti is.
- **20%-os változat:** nincs kisebb; ez már a minimális védelem. Az
  általános undo szándékosan nem ez a tétel (lásd SOHA).

### 3. 0 Ft-os sorok puha figyelmeztetése véglegesítéskor (fantom egyedi sor)

- **Méret:** 2–3 óra. Új, nem blokkoló lépés a `PreviewPage` meglévő
  `confirmStep`-láncában: a 0 Ft-os `tenylegesEgysegar`-ú, kitöltött nevű
  sorok felsorolása („szándékos?"). A `kitoltetlenSorok` kemény blokkja
  változatlan marad — a 0 ár legitim (ingyenes kontroll), ezért ez nem
  lehet kemény blokk.
- **Keretsértés:** nincs.
- **Valódi haszon:** hibacsökkentés — a gépel→Enter ciklus nulla
  találatnál egyedi sort vesz fel, tehát egy elgépelés + reflexes Enter
  ma némán tesz egy „gyokerkezx — 0 Ft" sort az aláírandó dokumentum
  felé. Ugyanez véd az egyedi soron elfelejtett ár ellen.
- **20%-os változat:** ez maga a 20% (a kemény blokk vagy az
  egyedi-sor-felvétel megerősítése rosszabb: az utóbbi eltörné a
  billentyűzetes ciklust, ami az app fő versenyelőnye).

### 4. Letöltési fájlnév: páciensnév + „PISZKOZAT" előtag nem véglegesített letöltésnél

- **Méret:** 1–2 óra. A `PreviewPage` és `PlanHistoryPage` letöltési
  fájlneveiben a páciensnév (a `paths.ts` meglévő tiltottkarakter-cseréjével),
  és `PISZKOZAT-` előtag, ha a letöltés nem véglegesített tervről készül.
- **Keretsértés:** nincs — a név a páciensmappa nevében ma is szerepel, a
  fájl a doki gépén marad; ez nem új adatfelület.
- **Valódi haszon:** hibacsökkentés (rossz PDF csatolása e-mailhez) +
  időmegtakarítás (a Letöltések mappában keresgélés). Az előtag a 6.
  igény (audit-lyuk) olcsó első védvonala is.
- **20%-os változat:** ez maga a 20%.

### 5. Kézbe adott, de nem archivált PDF (a B-nap „nincs meg a második ajánlat" esete)

- **Méret:** a teljes megoldás (vizuális „NEM VÉGLEGES" jelzés a nem
  véglegesített renderen) fél–1 nap, és van benne egy csapda: a
  véglegesítéskor archivált PDF bájtjai ma a *piszkozat állapotú* tervből
  renderelt `pdfInstance`-ból jönnek — egy státusz-alapú vízjel az
  archivált példányra is rákerülne, tehát a `doFinalize`-nak külön,
  végleges státuszú újra-renderelés kellene.
- **Keretsértés:** nincs.
- **Valódi haszon:** hibacsökkentés + jogi: a D4/D7 audit-ígéret („minden
  kiadott dokumentum visszakereshető") ma a Letöltés gombon át
  megkerülhető, és a doki meg is kerüli, jóhiszeműen.
- **20%-os változat:** a 4. tétel `PISZKOZAT-` fájlnév-előtagja (már
  benne van annak órájában) + egy sor a letöltés gomb alá: „ez a példány
  nincs mentve — a mentéshez véglegesíts". A vízjeles teljes megoldás
  akkor éri meg, ha az előtag után is előfordul az eset.

### 6. Régi terv megnézése szerkesztésre nyitás nélkül

- **Méret:** 1–2 óra. A PlanHistoryPage „Letöltés" gombja mellé/helyére
  „Megnyitás új lapon" — a már betöltött PDF-bájtokból blob-URL, új fül.
  Nincs új nézet, nincs új útvonal.
- **Keretsértés:** nincs.
- **Valódi haszon:** időmegtakarítás + kockázatcsökkentés — ma a
  „csak ránézek" út a szerkesztésre nyitáson át vezet, ami a piszkozatot
  fenyegeti és egy véletlen új verzió felé visz.
- **20%-os változat:** ez maga a 20% (a teljes verzió egy beépített
  olvasó nézet lenne — felesleges, a böngésző PDF-nézője elég).

### 7. „Új terv ennek a páciensnek" + terv másolása új tervként (változatok)

- **Méret:** fél–1 nap, grill-me javasolt. Egy `loadPlanIntoDraft`-variáns,
  ami a betöltött tervből **új tervet** csinál: `tervId: ''`, `verzio: 0`,
  `statusz: 'PISZKOZAT'`, friss dátumok — a mentéskor a meglévő `savePlan`
  automatikusan új páciensmappát/azonosítót ad, semmi nem íródik felül.
  Két belépési pont ugyanarra: „Új terv a páciens adataival" (sorok
  nélkül) és „Másolás új tervként" (sorokkal — ez a változat-eset).
- **Keretsértés:** nincs — D4 érintetlen, a verziólánc tisztább is lesz,
  mert a változatok nem verzióként csúsznak be. A grill-me fő kérdése a
  címkézés: a „verzió" (felülírja a régit ugyanabban a láncban) és a
  „változat" (párhuzamos ajánlat) fogalmát a felületnek élesen szét kell
  tartania, különben a doki verziónak hiszi a másolatot.
- **Valódi haszon:** időmegtakarítás (visszatérő páciens adatai, közös
  sorok) + pácienskommunikáció (A/B ajánlat a legnagyobb értékű
  konzultáción) + adatminőség (nem gépel újra TAJ-t hibalehetőséggel).
- **20%-os változat:** csak a páciensadat-átvétel (2–3 óra). A B-napi
  változat-fájdalmat viszont csak a sorokkal együtt másolás oldja, és a
  mechanizmus ugyanaz — együtt javasolt.

### 8. Terv-szintű „kerek végösszeg" kedvezmény

- **Méret:** ~1 nap, grill-me kötelező. Egy additív, opcionális mező a
  terven (a `elolegSzazalek` precedense szerint, `schemaVersion` marad
  1): a végösszegből levont kedvezmény. A `Fizetendő` ebből számol; a
  nyomtatványon a meglévő feltételes kétsoros összegzés jelenik meg
  (Kezelések összesen / Fizetendő), a kedvezmény összege továbbra sem —
  D9 betű szerint tartva. Az előlegnek a csökkentett fizetendőből kell
  számolnia (a `elolegOsszegek` hívási helye változik, a függvény nem).
- **Keretsértés:** nem sérti — D8 (kedvezmény mérhetően, külön tárolva)
  kifejezetten támogatja, az `osszesitok.kedvezmeny` mező ma is létezik;
  D9 (nem jelenik meg a nyomtatványon) érintetlen. A grill-me kérdései:
  soronkénti és terv-szintű kedvezmény együttélése (összeadódnak?), a
  sávos/becsült sorok kölcsönhatása, és hogy a mező összeg vagy
  „cél-végösszeg" legyen.
- **Valódi haszon:** bevétel + időmegtakarítás a legnagyobb tétű
  pillanatban — az alku zárása ma számológépezés a páciens előtt, az
  Excelben egy cella átírása volt. Ez az egyetlen pont, ahol az app ma
  érdemben rosszabb az Excelnél egy pénzt hozó munkalépésben.
- **20%-os változat:** egy „cél végösszeg" segédmező a szerkesztő
  Summary-jában, ami csak kiírja a szükséges kedvezményt, de nem tárol
  semmit (2 óra) — nem javasolt önállóan, mert a visszaosztás kézi
  munkája megmarad, csak a számológép esik ki.

### 9. Több félretett terv (parkolópálya a megszakításos délelőtthöz)

- **Méret:** 1–1.5 nap + előzetes tervezés (grill-me). A helyes út
  **nem** a `DraftStorage` többrekeszessé tétele — az a „piszkozat-cache
  nem válhat system of recorddá" szabályt sértené, mert napokig élő,
  egyetlen példányban létező munka kerülne a böngészőtárba. A keretbe
  illő megoldás: „Mentés piszkozatként" gomb, ami a **meglévő**
  `savePlan` append-only útján ír egy `statusz: 'PISZKOZAT'` verziómappát
  (a mező pont erre létezik, ma soha nem íródik), a Korábbi tervek pedig
  „piszkozat" jelvénnyel listázza és visszanyitja.
- **Keretsértés:** így nem sért semmit (D3/D4 szerint működik); a
  DraftStorage-os változat sértene.
- **Valódi haszon:** időmegtakarítás + hibacsökkentés — az A-nap
  telefonfotós újragépelése; a megszakítás a rendelői munka
  alapállapota, nem kivétel.
- **20%-os változat:** nincs jó 20% — a mai felülírás-elleni dialógus már
  a minimum. Azért KÉSŐBB és nem MOST: a nyitott kérdések (mi látszódjon
  a listában, hogyan nem gyűlik szemét, lazul-e a kitöltetlen-sor blokk
  piszkozat-mentésnél, kell-e PDF egy piszkozat-mappába) valódi
  tervezést igényelnek, és tévedésnek nagyobb az ára, mint a többi MOST
  tételnek együtt.

### 10. Sávos tétel felső határa a nyomtatványon („legrosszabb esetben mennyi?")

- **Méret:** fél nap kód (a sor `savos` jelölése mellé a sáv
  megjelenítése, ha a sor árlistai SAVOS tételből jött — a kézzel
  becsültre billentett sornak nincs sávja, ott nem is jelenhet meg).
- **Keretsértés:** D15-tel összefér, sőt erősítheti (a becslés jellege
  még explicitebb). De ez elsősorban nem mérnöki, hanem kommunikációs
  döntés: a felső határ kiírása horgonyt és ijedtséget is adhat — pont az
  a fajta kérdés, amit a 12. tétel mintájára a dokinak kell eldöntenie.
- **Valódi haszon:** pácienskommunikáció.
- **20%-os változat:** a doki szóban mondja, ahogy ma — nulla kód. Ezért
  KÉSŐBB, döntéssel a doki kezében.

### 11. `arlistaVerzio` sosem lép admin-mentéskor (a lábléc hamis ígérete)

- **Méret:** 1 óra + teszt. A `savePriceList` a `modositva` mellett az
  `arlistaVerzio`-t is a mentés napjára állítja tartalmi változásnál. A
  terveken lévő `arlistaVerzio` pillanatkép (D7) érintetlen.
- **Keretsértés:** nincs — épp a keret (a lábléc „melyik árlistából
  készült" audit-ígérete, `docs/04`) betartását javítja: ma az első
  admin-árszerkesztés után minden nyomtatvány a 2026-07-01-es verziót
  hazudja a láblécben.
- **Valódi haszon:** hibacsökkentés/jogi — vitánál a lábléc a hivatkozási
  pont.
- **20%-os változat:** ez maga a 20% (a teljes verzió egy kézi
  „árlista-verzió kiadása" fogalom lenne — felesleges szertartás egy
  egyszemélyes rendelőben).

### 12. Egyedi sor német terven mindig a „nincs német neve" listába kerül

- **Méret:** fél óra. A véglegesítés-dialógus és a szerkesztő jelvénye az
  egyedi (`tetelId === ''`) sorokat külön, pontosabb szöveggel sorolja
  („Egyedi, szabad szöveges sor — a nyelvét te írtad"), ne a „nincs német
  nevük az árlistában" cím alatt.
- **Keretsértés:** nincs; a D21-őr szigora (soha nem néma) marad.
- **Valódi haszon:** kicsi, de valós hibacsökkentés — a hamis riasztás a
  riasztás hitelét koptatja, és pont ott, ahol a valódi találatot komolyan
  kell venni.
- **20%-os változat:** ez maga a 20%.

### 13. Kétnyelvű dupla-dokumentum egy tervből (német ajánlat + magyar aláírható)

- **Méret:** 1–2 nap lenne — de nem ez a lényeg.
- **Keretsértés:** a szellemét sérti: két eltérő nyelvű, eltérő tartalmú
  dokumentum ugyanazzal a tervazonosítóval szétzilálná a D4/D5
  verziómodellt (egy verziómappa = egy PDF + egy JSON), és jogi zavarba
  vinne (melyiket írta alá?).
- **Valódi haszon:** a felszínen pácienskommunikáció — valójában a német
  jogi fordítás hiányát kerülné meg, amit nem megkerülni kell, hanem
  elvégeztetni (nem fejlesztői munka, a KÉSŐBB-listán rögzítve). A mentés
  előtti nyelvváltás mint kerülőút ma is létezik.
- **20%-os változat:** nincs — SOHA.

### 14. EUR tájékoztató átváltás a forintos terven

- D11 kifejezetten kizárja, jó okkal: bármi, ami a papírra kerül,
  kötelezettségként olvasható, az árfolyam pedig külső függés lenne egy
  szerződéses dokumentumban. A doki telefonos számológépe a helyes
  eszköz. SOHA.

### 15. Általános visszavonás (undo)

- Hetes nagyságrendű munka (állapot-történet a teljes szerkesztőre), és a
  valós esetek 90%-át a 2. tétel (fázistörlés-megerősítés) + a meglévő
  piszkozat-autosave fedi töredékáron. Nem éri meg. SOHA.

---

## MOST — kicsi és fájdalmat szüntet meg

1. **Árlista-nap kitűzése** (1. igény) — nulla kód, a lista többi
   tételénél nagyobb napi haszon; napirendjén a gyakori-csillagok, az
   elgépelések (k07!), a hiányzó tételek, a 13. tétel garanciaszövege és
   a sáv-minimumok visszaigazolása. A kódrésze a már tervezett
   `backlog-8` (1.5–2 nap).
2. **Fázis törlése megerősítéssel** (2. igény, 1–2 óra).
3. **0 Ft-os sorok puha őre véglegesítéskor** (3. igény, 2–3 óra).
4. **Letöltési fájlnév: páciensnév + PISZKOZAT-előtag** (4. igény,
   1–2 óra) — egyben az 5. igény első védvonala.
5. **Régi terv megnyitása új lapon** (6. igény, 1–2 óra).
6. **`arlistaVerzio` léptetése admin-mentéskor** (11. igény, 1 óra).
7. **Egyedi sor pontosabb megnevezése a német őrben** (12. igény, fél óra).
8. **Terv másolása új tervként / új terv a páciens adataival** (7. igény,
   fél–1 nap, grill-me a verzió/változat címkézésre).
9. **Terv-szintű kerek-összeg kedvezmény** (8. igény, ~1 nap, grill-me
   után) — a legnagyobb új tétel a MOST-on, mert az egyetlen hely, ahol
   az app ma pénzt hozó munkalépésben rosszabb az Excelnél.
10. A már tervezett **10. (tétel-leírás)** és **13. (garancia)** tétel
    változatlanul itt — a doki-nap mindkettőt másodszor is megerősítette;
    a 13. szövege az árlista-napon gyűjtendő be.

## KÉSŐBB — valódi érték, de nagy vagy kockázatos

- **Több félretett terv, `PISZKOZAT`-státuszú verziómappaként** (9.
  igény) — a megszakításos munkanap valós fájdalma, de állapotmodell-
  kérdések (listázás, szemét, kitöltetlen-blokk, PDF-e a piszkozatnak)
  grill-me-t igényelnek; a DraftStorage-os olcsó változat szabályt
  sértene, ezért az nem opció (lásd SOHA).
- **„NEM VÉGLEGES" vizuális jelzés a nem véglegesített PDF-en** (5.
  igény) — csak ha a fájlnév-előtag után is előfordul a nyomtalan kiadott
  dokumentum; a véglegesítéskori újra-renderelés csapdája miatt nem
  filléres.
- **Sáv felső határa a nyomtatványon** (10. igény) — fél nap kód, de
  előbb a doki kommunikációs döntése kell (horgony vs. átláthatóság), a
  12. backlog-tétel döntési mintája szerint.
- A meglévő KÉSŐBB-tételek változatlanul: ajánlat-állapot és
  visszahívás-jelzés (`allapot.json`), verzió-diff, fogtechnikusi
  munkalap, tömeges árváltoztatás, séma-migrációs út, `terv.json`
  PDF-be ágyazása (2. fázis) — és a **német jogi fordítás**, ami nem
  fejlesztői munka, de a C-nap teljes zárját egyedül ez oldja fel.

## SOHA — hangzatos, de nem éri meg, vagy sérti a kereteket

- **Kétnyelvű dupla-dokumentum egy tervből** (13. igény) — azonos
  azonosítójú, eltérő tartalmú dokumentumpár audit- és jogi zavart okoz;
  a valódi megoldás a jogi fordítás elvégeztetése, a kerülőút (nyelvváltás
  mentés előtt) ma is létezik.
- **Több piszkozat a `DraftStorage`-ban** — a böngészőtár napokig élő,
  egyetlen példányú munkát tartana, azaz system of recorddá válna; a
  szabály nem tárgyalható, a fájlrendszeres piszkozat-mentés (KÉSŐBB) a
  helyes út ugyanarra az igényre.
- **EUR tájékoztató átváltás a forintos terven** (14. igény) — D11, és a
  papíron minden szám kötelezettségként olvasható.
- **Általános undo** (15. igény) — hetes munka, a fázistörlés-megerősítés
  + piszkozat-autosave töredékáron fedi a valós esetet.
- **Elgépelés-tűrő (fuzzy) keresés** — másodszor is elvetve: a „Neodetn"
  problémát az adatjavítás szünteti meg, nem egy kereső, ami az elgépelt
  adatot is megtalálja, és ezzel konzerválja.
- **Automatikus gyakori-jelölés használati statisztikából** — D20 direkt
  ellene döntött: kiszámítható, nem ugráló UI kell; a csillagozás fél óra
  az árlista-napon.
- **Anamnézis lap digitalizálása, röntgen/fotó csatolása a tervhez** —
  más adatkezelési kategória (egészségügyi dokumentáció, EESZT-közelség),
  új GDPR-felületet nyitna; a nyilatkozat hivatkozhat a papírra, ahogy ma.
- **Fogtechnikus-árlista beemelése az appba** — a technikus ára beszerzési
  adat, nem páciensnek szóló ajánlati tétel; külön Excel-ben a helye, az
  app határa a páciens felé mutatott dokumentum.
- A meglévő SOHA-lista (számlázás/NAV, EESZT, e-mail küldés az appból,
  páciensportál/e-aláírás, statisztika-dashboard, AI, automatikus
  árfolyam, kedvezmény-sor a nyomtatványon, többfelhasználós jogosultság,
  mobilapp) — változatlanul érvényes, a második kör sem hozott olyan
  igényt, ami bármelyiket újranyitná.
