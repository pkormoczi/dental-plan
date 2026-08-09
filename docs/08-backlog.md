# 8. Backlog — még fejlesztendő

Ez a fejezet a jövőbeli munka gyűjtőhelye: a 2026-08-06-i kódreview
(P0/P1 minden tétele javítva, lásd git history — a nyers review-passzok
nem élnek tovább a repóban) nyitva maradt P2-jei, és az azt követő
termékreview (`06-doktor-harom-nap` munkanév alatt készült anyag)
felvetései, szoftverarchitekt-triázzsal együtt. A `docs/01`
sérthetetlen keretei (D1–D21) egyik tételt sem sértik — ahol ez nem
nyilvánvaló, a tétel maga jelzi, melyik döntéssel fut össze.

**Sorrend, ha priorizálni kell:** ~~1 (piszkozat-perzisztencia)~~ → 5
(EUR-mező) → 2 (friss dátum) → 3 (sornév + egyedi sor) → 6
(placeholder-őr) → 8 (árlista-nap) → 4, 9 → a többi.
(Az eredeti triázs-sorrend tévesen kihagyta az 1. tételt és duplán
hivatkozott a 3.-ra — itt javítva. Az 1. tétel a doktor-nap narratívában
háromszor is felmerül ugyanazon a délelőttön, és fél nap a mérete —
ez indokolta az élen; 2026-08-09-én elkészült, lásd alább.)

---

## MOST (kb. 6–7 fejlesztői nap + fél nap közös munka a dokival)

Mindegyik kicsi, és egy konkrét, a `06-doktor-harom-nap` munkanapjain
ténylegesen felmerült fájdalmat szüntet meg (lásd a Függelékben). Egyik
sem sérti a D1–D21 kereteket, egyik sem visz adatot szerverre.

### 1. Piszkozat-perzisztencia (frissítés/összeomlás ne törölje a félkész tervet) — KÉSZ (2026-08-09)

- **Méret:** fél nap. Mockupban egy `dp:piszkozat` localStorage-kulcs, a
  véglegesben IndexedDB — pontosan az, amit a `docs/03` már úgyis a 2.
  fázisra ütemezett, csak korábbra hozva.
- **Kereteket sért?** Nem — a `DraftStorage` itt is csak piszkozat-cache
  marad, nem lesz system of record, mert véglegesítéskor törlődik és csak
  `PISZKOZAT` (vagy újranyitott `VEGLEGES`) státuszú tervet tölt vissza.
- **Valódi haszon:** hibacsökkentés és időmegtakarítás közvetlenül mérhető —
  a Függelék A) napján ez háromszori újragépelést jelentett volna megspórolva.
- **20%-os verzió:** `beforeunload` figyelmeztetés („nem mentett
  módosítások vannak") localStorage-írás nélkül — fél óra, de csak a
  szándékos bezárást védi, az összeomlást nem. Nem javasolt helyette, mert
  pont az összeomlás ellen kell a védelem, és a teljes megoldás is csak fél
  nap.
- **Megvalósítás:** a döntési részletek `docs/backlog-1-piszkozat-terv.md`-ben
  (grill-me munkamenet, 8 döntés). Új `DraftStorage` interfész + mockup
  `DemoDraftStorage` (`app/src/storage/`), `piszkozatTartalmas()`
  (`app/src/domain/piszkozat.ts`), `AppState.tsx` restore/írás/törlés
  logika, Home „Piszkozat folytatása” kártya + felülírás elleni
  AlertDialog-ok (Home, PlanHistoryPage), piszkozat törlése sikeres
  véglegesítéskor (`PreviewPage.tsx`). Lásd git history a részletes
  commitokért.

### 2. Visszatöltött terv új verziója friss dátummal induljon

- **Méret:** 3 óra — egy függvény (`loadPlanIntoDraft` kiegészítése) plusz
  egy tájékoztató sáv a szerkesztőben.
- **Kereteket sért?** Nem, sőt: a D7 (pillanatkép) épp ezt kívánja meg — a
  korábbi sorok ára változatlan marad, csak a terv kelte és érvényessége
  igazodik a mához, amikor ténylegesen kinyomtatásra kerül.
- **Valódi haszon:** hibacsökkentés — ez konkrétan egy hibás, lejárt
  dátumú, aláírásra alkalmatlan dokumentum kiküszöbölése, nem kényelmi
  funkció.
- **20%-os verzió:** nincs kisebb, a hiba maga is kicsi — ez már a
  minimális javítás.

### 3. Sornév szerkeszthetővé tétele + szabad („egyedi") sor

- **Méret:** ~1 nap — mező típusváltás, `assertPlanShape` és
  `fallbackSorok` ellenőrzése üres `tetelId`-re, teszt.
- **Kereteket sért?** Nem — a `nevSnapshot` már ma is szabad string a
  sémában, csak a UI nem engedi szerkeszteni. A D7 pont azt kívánja, hogy a
  snapshot legyen az igazság; ha a doki pontosít a soron, az erősíti, nem
  gyengíti a döntést.
- **Valódi haszon:** pácienskommunikáció és hibacsökkentés — az elgépelt,
  rövidített árlistai nevek ne kerüljenek szó szerint az aláírandó
  dokumentumra, és felvehető legyen olyan tétel is, ami nincs az
  árlistában (pl. egyedi anyagköltség).
- **20%-os verzió:** csak a sornév szerkeszthetősége, egyedi sor nélkül —
  fél nap. A teljes verzió javasolt, mert az egyedi sor ugyanazt a
  mechanizmust használja, és a Függelék B) napi „nincs tétel az
  érzéstelenítésre" problémája enélkül megmarad.

### 4. Sor-szintű „becsült ár" (csillag) kapcsoló

- **Méret:** ~2 óra — a `Sor.savos` mező már létezik és már vezérli a PDF
  csillagot/lábjegyzetet, csak UI-kapcsoló kell rá minden sorhoz, nem csak
  az árlista SAVOS tételeihez.
- **Kereteket sért?** Nem — épp a D15 jogi védelmét viszi oda, ahol
  ténylegesen bizonytalan a mennyiség (csontpótlás, membrán), nem csak ott,
  ahol az árlista véletlenül SAVOS típusú.
- **Valódi haszon:** jogi védelem és pácienskommunikáció — ez direkt a
  Függelék B) napi kockázatot csökkenti (fix számként nyomtatott, valójában
  bizonytalan ár).
- **20%-os verzió:** ez már maga a 20%-os verzió egy nagyobb „tételenkénti
  megjegyzés" funkcióhoz képest — nincs nála egyszerűbb, ami ugyanezt a
  kockázatot kezelné.

### 5. `unit="EUR"` a szerkesztő „Tényleges ár" mezőjén

- **Méret:** 15 perc — egy prop átadása, ami az árlista adminban már megvan.
- **Kereteket sért?** Nem.
- **Valódi haszon:** hibacsökkentés, közvetlenül — ez egy majdnem 100×-os
  beviteli hiba lehetősége éles pénzügyi dokumentumon (cent vs. euró
  tévesztés, lásd Függelék C).
- **20%-os verzió:** nincs kisebb egység, ez már a legkisebb javítás.

### 6. Sablonszerkesztő bekötése + placeholder-őr a véglegesítésnél

- **Méret:** ~1 nap — a `saveTemplate` már implementált és tesztelt a
  storage rétegben, csak UI és a `StorageContext` exportja hiányzik, plusz
  egy megerősítő lépés a véglegesítés-láncba.
- **Kereteket sért?** Nem — ugyanazt a verziófájl-mechanizmust használja,
  amit a D4 már megkövetel (`nyilatkozat-hu-v2.md`, a régi megmarad).
- **Valódi haszon:** ez nem funkció, hanem egy éles hiba elhárítása — ma
  egy `[PLATZHALTER]` szöveg mehet ki egy aláírandó szerződésre, és az app
  erről nem szól semmit (lásd Függelék C, a legrosszabb pillanat). Jogi
  kockázat, nem csak UX.
- **20%-os verzió:** csak a placeholder-őr (fél nap), a szerkesztő nélkül —
  de akkor a doki jogásza sehol nem tudja feltölteni a végleges szöveget az
  appon belül, csak fájlrendszeri kerülővel a végleges verzióban. Mivel a
  szerkesztő maga is csak fél nap plusz, együtt javasolt.

### 7. Kereső: néma találat-csonkítás jelzése + admin kereső kiegészítése némettel

- **Méret:** ~1 óra összesen.
- **Kereteket sért?** Nem.
- **Valódi haszon:** kicsi, de valós hibacsökkentés — a Függelék C napi
  „nem találom a Neodent implantátumot" probléma gyökere nem ez (az az
  elgépelés az adatban), de a csonkítás-jelzés és a némettel bővített
  admin-keresés segít, amíg az adat nincs kitakarítva.
- **20%-os verzió:** ez maga a 20%-os verzió egy „fuzzy" kereséshez
  képest — elgépelés-tűrő keresés (Levenshtein-távolság) külön eszköz
  lenne, nem javasolt, mert az adattisztítás (8. tétel) olcsóbban old meg
  ugyanannyi problémát.

### 8. Árlista-nap: kategóriakezelés kódban + adattisztítás a dokival

- **Méret:** fél nap kód (kategória létrehozás/átnevezés/sorrendezés az
  adminban — ma csak áthelyezés van) + fél nap közös munka a dokival az
  adatra (gyakori-csillagok, elgépelések, duplikátumok, hiányzó tételek).
- **Kereteket sért?** Nem — a D16 kifejezetten az adminra bízza a
  takarítást, csak ma az admin nem tudja megcsinálni, mert nincs
  kategória-CRUD.
- **Valódi haszon:** ez a legmagasabb haszon/befektetés arányú tétel a
  listán — egyetlen fél napos ülés kiváltja mind a hat, A/B/C napban
  felmerült keresési és hiányzó-tétel problémát: gyorsgombok, elgépelések,
  „Komplett fogsor" félrevezető találata, hiányzó
  érzéstelenítés/kontroll/műtéti díj tételek.
- **20%-os verzió:** csak a gyakori-csillagozás és a legdurvább öt
  elgépelés javítása, kategóriakezelés nélkül — ez menne akár most azonnal,
  kód nélkül, de a `k01 Besorolatlan` és a francia maradványtételek
  rendbetétele blokkolva marad kategória-CRUD nélkül (lásd `docs/06`). Mivel
  a kód-rész is csak fél nap, a teljes verzió javasolt.

### 9. Előleg-sor a nyomtatványon

- **Méret:** fél nap — opcionális mező a `Plan`-en (visszafelé
  kompatibilis, `schemaVersion` nem változik), szerkesztő mező, PDF-sor.
- **Kereteket sért?** Nem.
- **Valódi haszon:** pácienskommunikáció, közvetlenül a Függelék B) napi
  jelenetre — a fizetési feltételek szövege ma kimondja az 50%-ot, de
  sosem számolja ki, ezt ma fejben teszi a doki.
- **20%-os verzió:** ez már maga a 20%-os verzió — egy teljes fizetési
  ütemterv (részletekre bontás, dátumokkal) sokkal nagyobb munka lenne, és
  nem is merült fel igényként.

### 10. Tétel-leírás a csomagtételekhez

- **Méret:** ~1 nap — opcionális mező az árlistában és a soron (D7 szerint
  ez is pillanatkép), admin-mező, PDF-megjelenítés.
- **Kereteket sért?** Nem.
- **Valódi haszon:** pácienskommunikáció — közvetlenül a Függelék B) napi
  „mi van ebben az egy sorban" kérdésre válaszol.
- **20%-os verzió:** ez maga a 20%-os verzió egy valódi „csomag = tételek
  listája" struktúrához képest, amit direkt nem javasolt (lásd KÉSŐBB) — a
  szabad szöveges leírás ugyanazt a problémát olcsóbban oldja meg,
  séma-törés nélkül.

### 11. Verziónkénti végösszeg a Korábbi tervek listában

- **Méret:** ~1 óra — a lista már betölti a legfrissebb `terv.json`-t
  páciensenként, csak minden verziót kell betöltenie (a
  `Promise.allSettled` már megvan) és kiírnia az összeget.
- **Kereteket sért?** Nem.
- **Valódi haszon:** kicsi, de valós időmegtakarítás — anélkül is látszik,
  mennyi volt a korábbi ajánlat, hogy meg kelljen nyitni.
- **20%-os verzió:** ez már maga a 20%-os verzió egy teljes
  verzió-diffhez (mi változott sorszinten) képest, amit a KÉSŐBB listára
  tettünk.

### 12. Döntés: kettős összegsor (Kezelések összesen / Fizetendő) marad-e

- **Méret:** fél óra kód, bármelyik irányban.
- **Kereteket sért?** A jelenlegi állapot feszíti a D9 szándékát (kedvezmény
  ne látsszon a nyomtatványon) — kedvezmény nélkül két azonos szám áll
  egymás alatt, ami inkább zavaró, mint informatív.
- **Valódi haszon:** ez nem funkció, hanem egy döntés, amit a dokinak kell
  meghoznia: eladási eszköznek szánja-e a két sort (mutatja, hogy van
  listaár, amiből dolgozik), vagy inkább zavarná a duplikáció.
- **20%-os verzió:** nincs — ez egy bináris döntés, a kód mindkét irányban
  egyformán olcsó.

### 13. Garancia szakasz a nyomtatványon

- **Méret:** fél nap kód (ugyanaz a sablon-mechanizmus, mint a fizetési
  feltételeknél), a szöveg tartalma a dokitól kell.
- **Kereteket sért?** Nem.
- **Valódi haszon:** pácienskommunikáció — ez volt a Függelék C) napi „mit
  kérdezne, amire ma nem tud jól válaszolni" egyik konkrét pontja.
- **20%-os verzió:** ez már maga a 20%-os verzió.

### 14. Demó tervek hibás `tetelId`-jainak javítása

- **Méret:** 15 perc.
- **Kereteket sért?** Nem — ez csak a demó adat belső hibája (a
  `nevSnapshot` miatt a UI-n nem látszik), de mivel a `tetelId`-hivatkozás
  integritása (D6/D7 lényege) a projekt egyik alapköve, a demónak magának
  is hitelesnek kell lennie.
- **Valódi haszon:** nem pácienst érintő, hanem fejlesztői minőségi tétel.
- **20%-os verzió:** nincs kisebb.

---

## Technikai adósság (a 2026-08-06-i kódreview nyitva maradt tételei)

A review P0-jai (8/8) és P1-jei (9/9) mind javítva lettek — lásd git
history a `4aed289`, `65f8f91`, `a0d4a08` commitok környékén. Az alábbi
tételek maradtak nyitva:

**Storage-írási minta nincs kikényszerítve** (méret: **L**, architektúra-
szintű). A `PlanStorage` interfész csak a *hogyan*-t rögzíti (D5), a
*mikor*-t minden oldal maga dönti el: a tervszerkesztő pufferelt,
egyszeri mentést használ, az Árlista admin és a Beállítások azonnali,
mezőnkénti mentést. Ma ártalmatlan (`localStorage`), de a tervezett
`FileSystemStorage`-váltásnál (`docs/05` 2. fázis) teljesítmény- és
megbízhatósági kockázattá válik — pont ott, ahol a D16 takarítás miatt a
legtöbb jövőbeli admin-szerkesztés várható. Helyszín: architektúra-szintű,
nem egy file:line.

**`storage/seed/priceList.ts:6` határsértés** (méret: **S**). Négy
`../`-vel importál a repo gyökerén lévő `data/`-ból, át a CLAUDE.md
szerint „csak referencia" mappaként leírt határon — ha valaki
átmozgatja/átnevezi a fájlt, a build csendben eltörik. Nincs
másolási/validációs lépés a határon.

**`commit()`/`patch()` functional updater nélkül** (méret: **M**, félig
kész). `PriceListAdminPage.tsx` és `SettingsPage.tsx` render-idejű
closure-t zár be egy async mentéshez — gyors egymás utáni módosítás
versenyben felülírhatja egymást. A vizuális visszajelzés fele elkészült a
mentési-siker jelzéssel; a functional-updater átírás maradt nyitva. A
`NumberField` blur-commitja után a versenyablak a gyakorlatban minimálisra
szűkült, de nincs strukturálisan kizárva.

**Titkosítatlan `localStorage` páciensadattal** (méret: **L**, tervezési
döntés a mockup-fázisban — a CLAUDE.md szerint szándékos, a mockup a
system of record helyett demonstráció). A véglegesített `Plan` (név,
születési dátum, lakcím, telefon, email, TAJ, kiskorú esetén törvényes
képviselő) titkosítás és lejárat nélkül landol a publikus origin
`localStorage`-ában. Kockázatcsökkentve: `DemoBanner` figyelmeztet, „Minden
adat törlése" gomb elérhető a Kezdőlapon. Az architekturális megoldás a
`FileSystemStorage`-váltás (2. fázis), nem a mockup feladata.

**Cím szintű, kisebb tételek** (nem vitt tovább külön leírással, ha később
kellenének):
- `basePrice()` újraírva a `PlanEditorPage`-ben a `domain/money.ts` export
  helyett, holott a CLAUDE.md ezt név szerint a „használd, ne írd újra"
  listában sorolja fel.
- `SAVOS` min/max mezők függetlenül szerkeszthetők, `min > max`-ra nincs
  validáció.
- `parseTeeth` nem dedupol — egy elgépelt duplikált fogszám átmegy a
  validáción.
- Három legnagyobb/legvalószínűbben ütköző fájl: `PlanEditorPage.tsx`
  (628 sor — page shell, `PhaseCard`, `LineRow`, `ItemPicker` mind egy
  fájlban), `PriceListAdminPage.tsx` (441 sor — saját, driftelt
  stílus-másolatot cipel a `design/ui.ts` helyett), `pdf/TervDocument.tsx`
  (422 sor — közös `s` style-objektum, saját kommentje szerint már most
  „német layout-törés" kockázatot jelez).
- Háromféle gombstílus (`design/ui.ts` `btn()`, `PriceListAdminPage`
  helyi `btn()`, `Home.tsx` `btnPrimary`/`btnSecondary`) — vizuálisan
  eltérő gombméret képernyőnként.
- `PreviewPage.finalize()` tesztelhetetlen — a véglegesítés teljes
  őrlogikája (kötelező mező, hiányzó fordítás megerősítése, jogi
  fallback-ellenőrzés) egyetlen komponens-függvényben van, nincs belőle
  kiszedhető pure function.

---

## KÉSŐBB — valódi érték, de nagy vagy kockázatos

- **Ajánlat-állapot és visszahívás-jelzés** (pl. `allapot.json` a
  páciensmappában, a verziómappákon kívül) — valódi haszon
  (időmegtakarítás, hogy tudni lehessen, kit kell visszahívni), de új
  fájltípus és állapotgép, ami a D4 append-only szemléletéhez képest más
  jellegű adat; alaposabb tervezést igényel, hogy ne csússzon system of
  recorddá olyasmi, ami nem terv.
- **Teljes verzió-diff nézet** (mi változott sorszinten v1 és v2 között) —
  a 11. tétel egyszerű összeg-kiírása után derül ki, mennyire hiányzik ez
  ténylegesen; ha igen, külön kör.
- **Valódi összetett csomag-tétel** (csomag = tételek listája, nem szabad
  szöveg) — a 10. tétel (leírás-sor) valószínűleg kiváltja a szükségletet;
  csak akkor térjünk vissza rá, ha a leírás-sor nem elég.
- **Tömeges árváltoztatás az adminban** (pl. „minden implantátum ára +5%")
  — valódi időmegtakarítás egy árlistafrissítéskor, de nem sürgős, évente
  egyszer kell.
- **Fogtechnikusi munkalap generálása** — más célközönség (a technikus, nem
  a páciens), más adattartalom; külön funkció, nem ennek a nyomtatványnak a
  bővítése.
- **Séma-migrációs út** — ma a `schemaVersion` csak felfelé véd (magasabb
  verziót elutasít), lefelé nem migrál; amíg `schemaVersion` marad 1 (a
  fenti 14 tétel egyike sem emeli), nem sürgős, de a D18 előbb-utóbb
  megköveteli.
- **`terv.json` beágyazása a PDF-be** (D5) — a `docs/05` explicit a 2.
  fázisra (fájlrendszeres verzió, `pdf-lib`) ütemezi; a mockupban nincs
  értelme siettetni.
- **A német jogi szövegek tényleges lektorálása** — ez nem fejlesztési
  feladat, hanem jogászi munka; a 6. tétel (placeholder-őr) csak addig
  védi ki a kockázatot, amíg ez meg nem történik.
- **Automatikus darabszám a fogszámokból (D14 újranyitása)** — a `docs/01`
  szerint ez hetekre elakasztotta volna az eredeti projektet; a mai
  figyelmeztető sáv elég, amíg nincs konkrét panasz rá.

## SOHA — hangzatos, de nem éri meg, vagy sérti a kereteket

- **Számlázás, egészségpénztári igazolás, NAV-integráció** — külön
  szoftver dolga, nem ennek az eszköznek a felelőssége; összekötésük
  fölöslegesen bonyolítaná és kockáztatná a jelenlegi tiszta határt (nincs
  szerveroldali adat).
- **Betegdokumentáció, EESZT-kapcsolat** — teljesen más adatkezelési és
  jogi kategória, más szoftver.
- **E-mail küldés az appból** — akárhogy nézzük, ez páciensadatot mozgatna
  a rendelő gépén kívülre egy harmadik fél (levelezőszerver)
  szolgáltatásán át; ez ütközik a D2–D3 kerettel.
- **Páciensportál, online elfogadás, e-aláírás** — szerveroldali
  komponenst és páciensadat-tárolást igényelne a rendelőn kívül; kizárt a
  D2 miatt.
- **Statisztika-dashboard** — nem merült fel a doktor-napokból, és
  bármilyen fogászati szoftverre igaz lenne, nem erre a valós munkanapra
  épül.
- **Bármilyen AI ebben az appban** — nincs olyan konkrét munkalépés, amit
  egy AI kiváltana úgy, hogy a hibázás következménye elfogadható lenne egy
  aláírandó, szerződéses dokumentumon. (A meglévő gépi fordítás is épp
  azért van jelölve és lektorálásra várva, mert ez a kockázat már most is
  fennáll — nem szabad növelni.)
- **Automatikus árfolyam-lekérés** — a D11 kifejezetten kizárja, és
  jogosan: egy külső API-hívás egy szerződéses árat tenne függővé egy
  harmadik féltől.
- **Kedvezmény külön soron a nyomtatványon** — a D9 direkt ellenkezőjét
  mondja ki, jó okkal (a kedvezmény ne váljon a papíron vitatható ténnyé).
- **Többfelhasználós jogosultságkezelés** — a D1 szerint egy rendelő,
  belső eszköz; ez sosem lesz több felhasználós termék.
- **Mobilapp, felhőszinkron** — a Google Drive-tükrözés már megoldja a
  hozzáférést a doki gépéről; egy natív mobilapp új adatvédelmi felületet
  nyitna a GDPR 9. cikk szerinti adaton, feleslegesen.
- **Ártétel-ár historizálás az árlistában** — a D7 (soronkénti pillanatkép)
  már megoldja, amire ez kellene; egy párhuzamos történeti napló csak
  duplikálná ugyanazt az információt.
- **Sor-szintű megjegyzés-oszlop külön mezőként** — a D13 ezt kifejezetten
  kizárja, és a fenti 3. tétel (szerkeszthető sornév) + 10. tétel
  (leírás-sor) együtt lefedi, amire ténylegesen szükség volt.
- **Kategória-böngésző a keresőben** — a D19 kifejezetten kizárja; a
  doktor-napok egyike sem mutatott rá valós igényt a böngészésre, csak a
  keresés pontosságára.

---

## Függelék: honnan jönnek az igények (Dr. Mándoki István három munkanapja)

Termékreview a doki szemszögéből, a valódi kódra és a valódi árlistára
építve (`data/arlista.seed.json`, 118 tétel) — ebből fakad a fenti MOST
lista minden tétele.

**A) Egy hétköznap délelőtt.** Az első három beteg rutin, de nincs
gyorsgomb egyetlen tételen sem (senki nem jelölte be a `gyakori`
csillagot), így minden alkalommal karakterről karakterre gépelni kell
konzultáció/panoráma/CBCT-t. Egy sornevet (`"Bölcsességfog mütéti
eljárással (seb.gond.,varrat szedés)"`) nem lehet a soron javítani, csak
elfogadni ékezethibásan. Egy visszatérő páciens (Nagy Éva) új verziója a
régi, júniusi keltezéssel nyomtat — csak este derül ki a PDF-et
ellenőrizve, hogy egy lejárt ajánlatot nyomtatott ki, amit majdnem
aláírattak volna. Egy sürgős hívás közben elveszik a piszkozat, mert csak
memóriában él — harmadszori újragépelés aznap.

**B) Egy nagy All-on-X konzultáció.** Az „All-on-4 Anax csomag" egyetlen
sorként megy be 1 950 000 forinttal — a páciens megkérdezi, mi van benne,
nincs mit mutatni, csak amit a doki szóban mond. Nincs tétel az
érzéstelenítésre, kontrollvizsgálatra, hagyományos implantáció sebészi
díjára. A csontpótló anyagot fix áron viszi fel, pedig a mennyiség csak a
műtőben derül ki — a csillagos „becslés" jelölés ma csak két
gyökérkezelési tételen működik, itt nem. Az 50%-os fogtechnikai előleget
fejben osztja ki és kézzel írja a papír aljára. A „Kezelések összesen" és
a „Fizetendő" sor kedvezmény nélkül pontosan ugyanazt a számot mutatja,
amire nincs jó válasza, ha a páciens rákérdez.

**C) Egy német páciens.** A nyelvet bekapcsolja, a pénznemet forinton
hagyja — ezt az app jól kezeli. A keresőben nem találja a Neodent
implantátumot, mert az árlistában elgépelve szerepel („Neodetn"). Az
euró/cent tévesztés majdnem megtörténik nála is (606 helyett 60600
kellett volna) — az admin felületen ez már jól működik, a szerkesztőben
még nem (5. tétel). Véglegesítéskor a nyilatkozat helyén ott áll: „ez a
szöveg jogilag még nincs lezárva" — ezt a páciens elé nem lehet tenni, a
doki csak a „csak ajánlat" változatot tudja kinyomtatni, aláírás nélkül
(6. tétel).

**A négy kérdés, amit a review feltett:**

1. *Mi az a három dolog, ami miatt egy hét után visszatérne az
   Excelhez?* A piszkozat elvesztése minden frissítésnél (1. tétel), egy
   visszatérő páciens régi dátummal nyomtató új verziója (2. tétel), és
   hogy senki nem jelölte be a gyakori tételeket (8. tétel).
2. *Mit csinál a mai munkájában, amit az app egyáltalán nem érint?*
   Visszahívás/emlékeztető (Zsófi vezeti füzetben), fogtechnikussal való
   egyeztetés, garancia-nyilvántartás (fejben), egészségpénztári
   igazolás/számlázás (külön szoftver, szándékosan nem itt), utánkövetés.
   Ezekhez az app szándékosan nem nyúl.
3. *Mit kérdezne a páciens, amire ma nem tud jól válaszolni?* „Mi van
   benne ebben az egy sorban?" (10. tétel), „Miért van két összeg, ha
   ugyanaz a szám?" (12. tétel), „Mennyi az előleg?" (9. tétel), „Van rá
   garancia?" (13. tétel).
4. *Hol tévedtünk abban, ahogy elképzeltük a munkáját?* A billentyűzetes
   felviteli ciklus, a verziózás elve, a kétnyelvűség váza jó irányban
   vannak. De alábecsültük, hogy egy All-on-X ajánlat nem egy tömés-lista,
   hanem tárgyalási eszköz — a sorokat tökéletesre csiszoltuk, a sorok
   mögötti tartalmat (mi van benne, mennyi bizonytalan, mennyit kell most
   letenni) kihagytuk.
