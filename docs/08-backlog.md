# 8. Backlog — még fejlesztendő (2. kör, 2026-08-09)

Ez a fájl az első kör backlogjának **nyitott** tételeit és a második
termékreview-kör (`review/doktor-harom-nap-2.md` +
`review/architekt-triazs-2.md`) architekt-triázsának tételeit fésüli
össze. Az első kör teljes anyaga — a 12 kész tétel megvalósítási
jegyzeteivel és az első doktor-nap Függelékkel együtt — archiválva:
`docs/archive/08-backlog-2026-08-09.md`. A `docs/backlog-N-*.md`
tervdokumentumok Függelék-hivatkozásai az archivált fájlra értendők.

A `docs/01` sérthetetlen keretei (D1–D21) egyik tételt sem sértik —
ahol ez nem nyilvánvaló, a tétel maga jelzi, melyik döntéssel fut össze.

**Számozás:** a tételek sorszáma stabil azonosító, nem prioritás. A
korábbi nyitott tételek (8., 10., 13.) megtartják a régi számukat, az új
tételek a régi sorozatot folytatják (16–23), hogy egy jövőbeli
tervdokumentum fájlneve (`backlog-N-*.md`) ne ütközzön a már létező,
kész tételekhez tartozókkal.

**Sorrend:** a listákon belül hasznosság szerint — a napi fájdalom
mérete × gyakorisága, holtversenynél a kisebb munka előre. Tervdokumentuma
a 8., 10. és 13. tételnek van (grill-me munkamenetek döntési
összefoglalói); a 16. és 17. tételhez implementáció előtt grill-me
ajánlott; a 18–23. apró tételek terv nélkül is indíthatók.

---

## MOST (kb. 5,5–7 fejlesztői nap + fél nap közös munka a dokival)

### 1. hely — 8. tétel: Árlista-nap: kategóriakezelés kódban + adattisztítás a dokival

*(korábbi 8. tétel — mindkét review-kör ezt hozta ki a legnagyobb
haszon/befektetés arányú tételnek)*

- **Méret:** a kódrész 1.5–2 fejlesztői nap (kategória-CRUD +
  szín-architektúra átírás, lásd a tervet) + fél nap közös munka a
  dokival az adatra.
- **Kereteket sért?** Nem — a D16 kifejezetten az adminra bízza a
  takarítást, csak ma az admin nem tud kategóriát létrehozni/átnevezni.
- **Valódi haszon:** időmegtakarítás (a gyorsgomb-hiány minden betegnél
  fizetett ár), hibacsökkentés (a k07 All-on-X kategória elgépelései —
  „Neodetn", „felépítmány", „Ideigenes" — ma minden ajánlaton kézi
  javítást igényelnek), pácienskommunikáció.
- **20%-os verzió:** a gyakori-csillagozás + a legdurvább elgépelések
  javítása **ma, kód nélkül** menne — a valódi blokkoló két review-kör
  óta az, hogy a fél napos közös ülés nincs kitűzve. **A második kör
  javaslata: az ülés napirendjére kerüljön a 13. tétel magyar
  garanciaszövegének begyűjtése és a sáv-alsóhatárok visszaigazolása
  (`docs/06`) is** — egyetlen ülés adja az összes embermunka-inputot.
- **Terv:** `docs/backlog-8-kategoriakezeles-terv.md` (15 döntés, csak a
  kódrészre).

### 2. hely — 16. tétel: Terv-szintű „kerek végösszeg" kedvezmény

- **Méret:** ~1 nap, grill-me kötelező. Additív, opcionális `Plan`-mező
  (az `elolegSzazalek` precedense szerint, `schemaVersion` marad 1): a
  végösszegből levont kedvezmény. A `Fizetendő` ebből számol; a
  nyomtatványon a meglévő feltételes kétsoros összegzés jelenik meg, a
  kedvezmény összege továbbra sem (D9). Az előleg a csökkentett
  fizetendőből számol.
- **Kereteket sért?** Nem — a D8 (kedvezmény külön tárolva, mérhetően)
  kifejezetten támogatja, az `osszesitok.kedvezmeny` ma is létező mező.
  Grill-me kérdések: soronkénti és terv-szintű kedvezmény együttélése,
  sávos/becsült sorok kölcsönhatása, összeg vs. cél-végösszeg tárolása.
- **Valódi haszon:** bevétel + időmegtakarítás — az alku zárása („legyen
  kereken 2 050 000") ma soronkénti visszaosztás számológéppel a páciens
  előtt; az Excelben egy cella átírása volt. Ez az egyetlen pont, ahol az
  app ma érdemben rosszabb az Excelnél egy pénzt hozó munkalépésben.
- **20%-os verzió:** „cél végösszeg" segédmező a Summary-ban, ami csak
  kiírja a szükséges kedvezményt (2 óra) — nem javasolt önállóan, mert a
  kézi visszaosztás megmarad, csak a számológép esik ki.

### 3. hely — 17. tétel: Terv másolása új tervként / új terv a páciens adataival

- **Méret:** fél–1 nap, grill-me ajánlott. Egy `loadPlanIntoDraft`-variáns,
  ami a betöltött tervből **új tervet** csinál (`tervId: ''`,
  `verzio: 0`, `statusz: 'PISZKOZAT'`, friss dátumok) — mentéskor a
  meglévő `savePlan` automatikusan új páciensmappát ad, semmi nem íródik
  felül. Két belépési pont: „Új terv a páciens adataival" (sorok nélkül)
  és „Másolás új tervként" (sorokkal — a változat-eset).
- **Kereteket sért?** Nem — D4 érintetlen, a verziólánc tisztább is
  lesz, mert az A/B változatok nem verzióként csúsznak be. A grill-me fő
  kérdése a címkézés: a „verzió" (felülír a láncban) és a „változat"
  (párhuzamos ajánlat) fogalmát a felületnek élesen szét kell tartania.
- **Valódi haszon:** időmegtakarítás (visszatérő páciens adatai és a
  közös sorok újragépelése esik ki), pácienskommunikáció (A/B ajánlat a
  legnagyobb értékű konzultáción), hibacsökkentés (TAJ/cím újragépelése).
- **20%-os verzió:** csak a páciensadat-átvétel (2–3 óra) — de a B-napi
  változat-fájdalmat csak a sorokkal együtt másolás oldja, és a
  mechanizmus ugyanaz; együtt javasolt.

### 4. hely — 10. tétel: Tétel-leírás a csomagtételekhez

*(korábbi 10. tétel — mindkét review-kör megerősítette: „mi van ebben az
egy sorban?" a leggyakoribb megválaszolatlan pácienskérdés)*

- **Méret:** ~1 nap — kétnyelvű `Tetel.leiras` az árlistán + sor-szintű
  pillanatkép a `nevSnapshot` mintájára, admin-mező, PDF-megjelenítés.
- **Kereteket sért?** Nem — a D13-határ védelme a UI címkézésén múlik
  („Leírás (mi van benne?)"), lásd a tervet.
- **Valódi haszon:** pácienskommunikáció — a hazavitt egysoros
  1 950 000-es ajánlat helyett a páciens otthon is el tudja mondani, mit
  tartalmaz a csomag.
- **20%-os verzió:** ez maga a 20%-os verzió egy valódi „csomag =
  tételek listája" struktúrához képest (az a KÉSŐBB listán).
- **Terv:** `docs/backlog-10-tetel-leiras-terv.md` (17 döntés).

### 5. hely — 13. tétel: Garancia szakasz a nyomtatványon

*(korábbi 13. tétel)*

- **Méret:** fél nap kód (a meglévő sablon-mechanizmus harmadik
  szakasza), **a magyar szöveg a dokitól kell** — a második kör javaslata
  szerint az árlista-napon (1. hely) gyűjtendő be, különben ez a tétel
  határozatlan ideig áll.
- **Kereteket sért?** Nem.
- **Valódi haszon:** pácienskommunikáció — a „van rá írásos garancia?"
  kérdésre ma csak szóbeli válasz van.
- **20%-os verzió:** ez már maga a 20%-os verzió (a kategóriánkénti
  garanciaidő-adatmodell tudatosan kizárva, lásd a tervet).
- **Terv:** `docs/backlog-13-garancia-terv.md` (9 döntés; a német szöveg
  placeholder marad, a 6. tétel placeholder-őre kezeli).

### 6. hely — 18. tétel: Fázis törlése megerősítéssel

- **Méret:** 1–2 óra — a meglévő `AlertDialog`-minta a „Fázis törlése"
  gombon, csak akkor, ha a fázisban van sor (üres fázis törlése maradjon
  egy kattintás).
- **Kereteket sért?** Nem.
- **Valódi haszon:** hibacsökkentés — ez az egyetlen egy-kattintásos,
  többsoros, helyreállíthatatlan adatvesztés a szerkesztőben, és a
  piszkozat-autosave azonnal rögzíti is. Az általános undo tudatosan nem
  ez a tétel (lásd SOHA).
- **20%-os verzió:** nincs kisebb — ez már a minimális védelem.

### 7. hely — 19. tétel: 0 Ft-os sorok puha figyelmeztetése véglegesítéskor

- **Méret:** 2–3 óra — új, nem blokkoló lépés a `PreviewPage` meglévő
  `confirmStep`-láncában: a 0 Ft-os, kitöltött nevű sorok felsorolása. A
  `kitoltetlenSorok` kemény blokkja változatlan (a 0 ár legitim —
  ingyenes kontroll —, ezért nem lehet kemény blokk).
- **Kereteket sért?** Nem.
- **Valódi haszon:** hibacsökkentés — a gépel→Enter ciklus nulla
  találatnál egyedi sort vesz fel, tehát egy elgépelés + reflexes Enter
  ma némán tehet egy „gyokerkezx — 0 Ft" fantomsort az aláírandó
  dokumentumra; ugyanez véd az egyedi soron elfelejtett ár ellen.
- **20%-os verzió:** ez maga a 20% — az egyedi-sor-felvétel megerősítése
  rosszabb lenne, mert eltörné a billentyűzetes ciklust.

### 8. hely — 20. tétel: Letöltési fájlnév: páciensnév + „PISZKOZAT" előtag

- **Méret:** 1–2 óra — a `PreviewPage` és `PlanHistoryPage` letöltési
  fájlneveiben a páciensnév (a `paths.ts` meglévő
  tiltottkarakter-cseréjével), és `PISZKOZAT-` előtag, ha a letöltés nem
  véglegesített tervről készül.
- **Kereteket sért?** Nem — a név a páciensmappa nevében ma is szerepel,
  a fájl a doki gépén marad, nem új adatfelület.
- **Valódi haszon:** hibacsökkentés (rossz PDF csatolása e-mailhez a
  négy egyforma `kezelesi-terv-*.pdf` közül) + időmegtakarítás; az
  előtag egyben a „kiadott, de nem archivált PDF" audit-lyuk (KÉSŐBB:
  vízjel) olcsó első védvonala.
- **20%-os verzió:** ez maga a 20%.

### 9. hely — 21. tétel: `arlistaVerzio` léptetése admin-mentéskor

- **Méret:** 1 óra + teszt — a `savePriceList` a `modositva` mellett az
  `arlistaVerzio`-t is a mentés napjára állítja tartalmi változásnál. A
  terveken lévő `arlistaVerzio` pillanatkép (D7) érintetlen.
- **Kereteket sért?** Nem — épp a keret betartását javítja: a lábléc
  „melyik árlistából készült" audit-ígérete (`docs/04`) ma az első
  admin-árszerkesztés után hamis, minden nyomtatvány a 2026-07-01-es
  verziót mondja.
- **Valódi haszon:** hibacsökkentés/jogi — vitánál a lábléc a
  hivatkozási pont.
- **20%-os verzió:** ez maga a 20% (egy kézi „árlista-verzió kiadása"
  fogalom felesleges szertartás lenne egy egyszemélyes rendelőben).

### 10. hely — 22. tétel: Régi terv megnyitása új lapon (csak megnézés)

- **Méret:** 1–2 óra — a PlanHistoryPage-en a már betöltött
  PDF-bájtokból blob-URL, új fül; nincs új nézet, nincs új útvonal.
- **Kereteket sért?** Nem.
- **Valódi haszon:** időmegtakarítás + kockázatcsökkentés — a „csak
  ránézek" út ma a szerkesztésre nyitáson át vezet, ami a piszkozatot
  fenyegeti és egy véletlen új verzió felé visz, vagy a Letöltések
  mappán át.
- **20%-os verzió:** ez maga a 20% (beépített olvasó nézet felesleges, a
  böngésző PDF-nézője elég).

### 11. hely — 23. tétel: Egyedi sor pontosabb megnevezése a német véglegesítés-őrben

- **Méret:** fél óra — a véglegesítés-dialógus (és a szerkesztő
  jelvénye) az egyedi (`tetelId === ''`) sorokat külön, pontosabb
  szöveggel sorolja („Egyedi, szabad szöveges sor — a nyelvét te
  írtad"), ne a „nincs német nevük az árlistában" cím alatt.
- **Kereteket sért?** Nem — a D21-őr szigora (soha nem néma) marad.
- **Valódi haszon:** kicsi, de valós hibacsökkentés — a németül beírt
  egyedi sorra ma az őr „farkast kiált", és a hamis riasztás pont ott
  koptatja a riasztás hitelét, ahol a valódi találat komoly.
- **20%-os verzió:** ez maga a 20%.

---

## Technikai adósság (a 2026-08-06-i kódreview nyitva maradt tételei)

A review P0-jai (8/8) és P1-jei (9/9) mind javítva — lásd git history.
Az alábbiak maradtak nyitva (változatlanul az első körből):

**Storage-írási minta nincs kikényszerítve** (méret: **L**,
architektúra-szintű). A `PlanStorage` interfész csak a *hogyan*-t rögzíti
(D5), a *mikor*-t minden oldal maga dönti el: a tervszerkesztő pufferelt,
egyszeri mentést használ, az Árlista admin és a Beállítások azonnali,
mezőnkénti mentést. Ma ártalmatlan (`localStorage`), de a tervezett
`FileSystemStorage`-váltásnál (`docs/05` 2. fázis) teljesítmény- és
megbízhatósági kockázattá válik — pont ott, ahol a D16 takarítás miatt a
legtöbb jövőbeli admin-szerkesztés várható.

**`storage/seed/priceList.ts:6` határsértés** (méret: **S**). Négy
`../`-vel importál a repo gyökerén lévő `data/`-ból, át a CLAUDE.md
szerint „csak referencia" mappaként leírt határon — ha valaki
átmozgatja/átnevezi a fájlt, a build csendben eltörik.

**`commit()`/`patch()` functional updater nélkül** (méret: **M**, félig
kész). `PriceListAdminPage.tsx` és `SettingsPage.tsx` render-idejű
closure-t zár be egy async mentéshez — gyors egymás utáni módosítás
versenyben felülírhatja egymást. A `NumberField` blur-commitja után a
versenyablak a gyakorlatban minimálisra szűkült, de nincs strukturálisan
kizárva.

**Titkosítatlan `localStorage` páciensadattal** (méret: **L**, tervezési
döntés a mockup-fázisban — szándékos, lásd CLAUDE.md). Az architekturális
megoldás a `FileSystemStorage`-váltás (2. fázis), nem a mockup feladata.

**Cím szintű, kisebb tételek:** `basePrice()` újraírva a
`PlanEditorPage`-ben a `domain/money.ts` export helyett; `SAVOS` min/max
mezőkre nincs `min > max` validáció; `parseTeeth` nem dedupol; a három
legnagyobb fájl (`PlanEditorPage.tsx`, `PriceListAdminPage.tsx`,
`pdf/TervDocument.tsx`) bontása; háromféle gombstílus;
`PreviewPage.finalize()` őrlogikája nem tesztelhető pure functionként.

---

## KÉSŐBB — valódi érték, de nagy vagy kockázatos

Hasznosság szerint sorrendezve:

- **Több félretett terv (parkolópálya), `PISZKOZAT`-státuszú
  verziómappaként** *(2. kör)* — a megszakításos délelőtt valós, a
  doki-nap szerint Excelhez visszaűző fájdalma (ma egyetlen
  piszkozat-slot van, a többi munka telefonfotóra kerül). A helyes út
  **nem** a `DraftStorage` többrekeszessé tétele (az a „nem válhat system
  of recorddá" szabályt sértené — lásd SOHA), hanem „Mentés
  piszkozatként" a meglévő `savePlan` append-only útján (`statusz:
  'PISZKOZAT'` verziómappa — a mező pont erre létezik, ma soha nem
  íródik), „piszkozat" jelvénnyel a Korábbi terveknél. 1–1.5 nap +
  grill-me: listázás, szemét-felhalmozódás, a kitöltetlen-sor blokk
  lazítása piszkozat-mentésnél, kell-e PDF a piszkozat-mappába.
- **A német jogi szövegek tényleges lektorálása/fordítása** — nem
  fejlesztési feladat, hanem jogászi munka, de a C-nap teljes zárját
  (német páciens nem tud aláírni) egyedül ez oldja fel; a 6. tétel
  placeholder-őre csak addig védi ki a kockázatot.
- **„NEM VÉGLEGES" vizuális jelzés a nem véglegesített PDF-en** *(2.
  kör)* — csak ha a 20. tétel fájlnév-előtagja után is előfordul a
  nyomtalanul kiadott dokumentum. Fél–1 nap, és van benne egy csapda: az
  archivált PDF ma a piszkozat-státuszú tervből renderelt
  `pdfInstance`-ból jön, tehát a véglegesítésnek külön, végleges státuszú
  újra-renderelés kellene.
- **Sávos tétel felső határa a nyomtatványon** *(2. kör)* — fél nap kód,
  de előbb a doki kommunikációs döntése kell (átláthatóság a
  „legrosszabb esetben mennyi?" kérdésre vs. horgony-/ijesztés-hatás), a
  12. tétel döntési mintája szerint. Csak árlistai SAVOS eredetű soron értelmes, a
  kézzel becsültre billentett sornak nincs sávja.
- **Ajánlat-állapot és visszahívás-jelzés** (pl. `allapot.json` a
  páciensmappában, a verziómappákon kívül) — valódi haszon (kit kell
  visszahívni, melyik ajánlat jár le), de új fájltípus és állapotgép;
  alaposabb tervezést igényel, hogy ne csússzon system of recorddá.
- **Teljes verzió-diff nézet** (mi változott sorszinten v1 és v2 között)
  — a 11. tétel összeg-kiírása után derül ki, mennyire hiányzik.
- **Fogtechnikusi munkalap generálása** — más célközönség (a technikus),
  más adattartalom; külön funkció.
- **Tömeges árváltoztatás az adminban** (pl. „minden implantátum +5%") —
  valódi időmegtakarítás árlistafrissítéskor, de évente egyszer kell.
- **Valódi összetett csomag-tétel** (csomag = tételek listája) — a 10.
  tétel leírás-mezője valószínűleg kiváltja; csak akkor, ha nem elég.
- **Séma-migrációs út** — a `schemaVersion` ma csak felfelé véd; amíg 1
  marad (a fenti tételek egyike sem emeli), nem sürgős, de a D18
  előbb-utóbb megköveteli.
- **`terv.json` beágyazása a PDF-be** (D5) — a `docs/05` explicit a 2.
  fázisra (fájlrendszeres verzió, `pdf-lib`) ütemezi.
- **Automatikus darabszám a fogszámokból (D14 újranyitása)** — a mai
  figyelmeztető sáv elég, amíg nincs konkrét panasz.

---

## SOHA — hangzatos, de nem éri meg, vagy sérti a kereteket

- **Kétnyelvű dupla-dokumentum egy tervből** (német ajánlat + magyar
  aláírható) *(2. kör)* — azonos tervazonosítójú, eltérő tartalmú
  dokumentumpár szétzilálná a D4/D5 verziómodellt és jogi zavart okozna
  (melyiket írta alá?); a valódi megoldás a jogi fordítás elvégeztetése,
  a kerülőút (nyelvváltás mentés előtt) ma is létezik.
- **Több piszkozat a `DraftStorage`-ban** *(2. kör)* — a böngészőtár
  napokig élő, egyetlen példányú munkát tartana, azaz system of recorddá
  válna; a szabály nem tárgyalható. Ugyanarra az igényre a fájlrendszeres
  piszkozat-mentés (KÉSŐBB) a helyes út.
- **EUR tájékoztató átváltás a forintos terven** *(2. kör)* — D11, jó
  okkal: a papíron minden szám kötelezettségként olvasható, az árfolyam
  külső függés lenne egy szerződéses dokumentumban.
- **Általános undo/visszavonás** *(2. kör)* — hetes nagyságrendű munka;
  a 18. tétel (fázistörlés-megerősítés) + a piszkozat-autosave töredékáron
  fedi a valós esetet.
- **Elgépelés-tűrő (fuzzy) keresés** — mindkét kör elvetette: a
  „Neodetn" problémát az adatjavítás szünteti meg, nem egy kereső, ami az
  elgépelt adatot is megtalálja, és ezzel konzerválja.
- **Automatikus gyakori-jelölés használati statisztikából** *(2. kör)* —
  a D20 direkt ellene döntött: kiszámítható, nem ugráló UI kell; a
  csillagozás fél óra az árlista-napon.
- **Anamnézis lap digitalizálása, röntgen/fotó csatolása a tervhez**
  *(2. kör)* — más adatkezelési kategória (egészségügyi dokumentáció,
  EESZT-közelség), új GDPR-felületet nyitna; a nyilatkozat hivatkozhat a
  papírra, ahogy ma.
- **Fogtechnikus-árlista beemelése az appba** *(2. kör)* — a technikus
  ára beszerzési adat, nem páciensnek szóló ajánlati tétel; az app határa
  a páciens felé mutatott dokumentum.
- **Számlázás, egészségpénztári igazolás, NAV-integráció** — külön
  szoftver dolga; összekötésük kockáztatná a tiszta határt (nincs
  szerveroldali adat).
- **Betegdokumentáció, EESZT-kapcsolat** — teljesen más adatkezelési és
  jogi kategória, más szoftver.
- **E-mail küldés az appból** — páciensadatot mozgatna a rendelő gépén
  kívülre egy harmadik fél szolgáltatásán át; ütközik a D2–D3 kerettel.
- **Páciensportál, online elfogadás, e-aláírás** — szerveroldali
  komponenst és páciensadat-tárolást igényelne; kizárt a D2 miatt.
- **Statisztika-dashboard** — egyik doktor-nap sem mutatott rá igényt;
  bármilyen fogászati szoftverre igaz lenne.
- **Bármilyen AI ebben az appban** — nincs olyan munkalépés, amit úgy
  váltana ki, hogy a hibázás következménye elfogadható lenne egy
  aláírandó, szerződéses dokumentumon.
- **Automatikus árfolyam-lekérés** — a D11 kifejezetten kizárja.
- **Kedvezmény külön soron a nyomtatványon** — a D9 direkt ellenkezőjét
  mondja ki, jó okkal. (A 16. tétel terv-szintű kedvezménye ezzel
  összefér: az összeg ott sem kerül a papírra.)
- **Többfelhasználós jogosultságkezelés** — D1: egy rendelő, belső
  eszköz.
- **Mobilapp, felhőszinkron** — a Drive-tükrözés megoldja a hozzáférést;
  natív mobilapp új adatvédelmi felületet nyitna a GDPR 9. cikk szerinti
  adaton.
- **Ártétel-ár historizálás az árlistában** — a D7 (soronkénti
  pillanatkép) már megoldja.
- **Sor-szintű megjegyzés-oszlop külön mezőként** — a D13 kizárja; a
  szerkeszthető sornév (kész) + a 10. tétel leírás-mezője lefedi a valós
  igényt.
- **Kategória-böngésző a keresőben** — a D19 kizárja; a doktor-napok a
  keresés pontosságára mutattak igényt, nem a böngészésre.

---

## Honnan jönnek az igények

- **1. kör:** doktor-nap narratíva + triázs, a teljes anyag (a kész
  tételek megvalósítási jegyzeteivel) az archivált backlogban:
  `docs/archive/08-backlog-2026-08-09.md` (Függelék).
- **2. kör (2026-08-09, a 12 kész tétel utáni állapotra):**
  `review/doktor-harom-nap-2.md` (elbeszélés) és
  `review/architekt-triazs-2.md` (a 15 igény teljes értékelése —
  méret, keretsértés, haszon, 20%-os változat tételenként).
