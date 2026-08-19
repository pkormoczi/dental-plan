# Backlog

A `docs/01` sérthetetlen keretei (`D<szám>` formátumban) egyik tételt sem sértik —
ahol ez nem nyilvánvaló, a tétel maga jelzi, melyik döntéssel fut össze.

**Számozás:** a tételek sorszáma stabil azonosító, nem prioritás. Lezárt
tétel száma véglegesen nyugdíjazva, soha nem osztható ki újra — az új tételek a sorozatot onnan folytatják,
ahol a legutóbb kiosztott szám állt.

**Sorrend:** a listákon belül hasznosság szerint — a napi fájdalom
mérete × gyakorisága, holtversenynél a kisebb munka előre. 

---
## KIDOLGOZOTT

### 35. tétel — Új terv páciensválasztó
  (a `backlog/redesign/` redesign-döntéssorozat DP-011 tétele) — a mai
  `/uj-terv` kereső nem autofókuszos, 0 karakternél a TELJES listát
  mutatja (nem recenst), mindig alfabetikus (nem relevancia szerinti),
  és nincs billentyűzet-navigáció. Ez a tétel autofókuszt, a 34. tétel
  megosztott recent-helperét, relevancia-rendezést és az `ItemPicker.tsx`
  bevált gépel→nyíl→Enter/Esc mintáját vezeti be. Függ a 34. tételtől.
  A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-35-uj-terv-paciensvalaszto-terv.md`

### 36. tétel — Quick Patient létrehozás
  (a `backlog/redesign/` redesign-döntéssorozat DP-012 tétele) — feltárás
  szerint az `/uj-terv` "Vadonatúj páciens" ága MA NEM hoz létre valódi
  Patient-rekordot a terv előtt (csak mentéskor materializálódik) — ez
  direkt ellentmond a cél-viselkedésnek. Ez a tétel a MEGLÉVŐ
  `UjPaciensDialog.tsx`-et (ami a Páciensek listáról már ezt csinálja)
  DOB+telefon mezővel bővíti és mindkét belépési ponton futtatja, plusz
  bekötteti a friss `patientDir`-t a 32. tétel `DraftRecord`-jába. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-36-quick-patient-terv.md`

### 37. tétel — Páciens-duplikáció felismerés és feloldás
  (a `backlog/redesign/` redesign-döntéssorozat DP-013 tétele) — a mai
  duplikáció-jelzés egyetlen helyen, tisztán név-egyezésen alapul,
  cselekvés nélkül; a DOB/telefon NEM elérhető olcsón minden páciensre
  (`listPatients()` csak nevet ad). Ez a tétel egy kétfázisú (olcsó
  név-szűrés, majd szűk körű DOB/telefon-megerősítés) detektálást épít,
  max 3 javaslattal, save-time ellenőrzéssel és "Mégis új páciens"
  explicit megerősítéssel, a 36. tétel dialógusába kötve. A döntéseket
  lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-37-paciens-duplikacio-terv.md`

### 38. tétel — Pácienslista és keresés
  (a `backlog/redesign/` redesign-döntéssorozat DP-014 tétele) — a lista
  ma már alfabetikus és névre keres (ez már megfelel), de a sorok
  helyben nyílnak ki (nem navigálnak), nincs DOB/telefon a sorban, és
  nincs search/scroll-state megőrzés. Ez a tétel a sorokat a 30. tétel
  páciens-részletoldalára navigáló linkekre váltja, DOB/telefont ad a
  kompakt sorhoz (eager betöltéssel, a `PlanHistoryPage` végösszeg-
  mintájára), és általános state-megőrzést épít. Függ a 30. tételtől.
  A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-38-pacienslista-terv.md`

### 39. tétel — Páciens adatok read-only / edit / full create
  (a `backlog/redesign/` redesign-döntéssorozat DP-015 tétele) — a
  `PatientEditor` ma kinyitáskor rögtön szerkeszthető, nincs read-only
  alapállapot/Edit-gomb, nincs "Nincs megadva" szöveg, nincs email-/DOB-
  validáció. A Save/Cancel, a dirty-guard és a mentési-hiba-megőrzés MÁR
  MA IS jól működik (a 33. tétel/DP-005 feltárása szerint), ez a tétel
  csak a hiányzó read-only/Edit módot és validációkat adja hozzá. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-39-paciens-adatok-terv.md`

### 40. tétel — Páciens master ↔ terv snapshot compare/sync
  (a `backlog/redesign/` redesign-döntéssorozat DP-016 tétele) — a D33
  (backlog-28) már kimondta, hogy a `paciens-adatok.json` és a
  `terv.json` `paciens` blokkja között nincs automatikus szinkron, de
  SEMMILYEN UI nem létezik, ami ezt az eltérést megmutatná vagy
  kezelhetővé tenné — ez teljesen új felület. Két külön irányú (master→
  draft, draft→master) explicit művelet, mezőszintű diff alapból
  kijelöletlen checkboxokkal, fallback-állapot infó-blokk, író-hiba
  Retry/Continue. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-40-master-snapshot-sync-terv.md`

### 41. tétel — Páciens törlése
  (a `backlog/redesign/` redesign-döntéssorozat DP-017 tétele) — törlési
  képesség SEHOL nem létezik ma (a `PlanStorage` interfésznek nincs
  törlő metódusa). Ez a tétel egy `deletePatient` storage-metódust, egy
  "van véglegesített terve" ellenőrzést és egy `Plan.paciensId`-alapú
  "van rá mutató aktív draft" ellenőrzést épít, a törlést kizárólag a
  30. tétel páciens-részletoldalának overflow menüjébe kötve, megerősítő
  dialóggal, merge nélkül. Függ a 30. tételtől. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-41-paciens-torles-terv.md`

---
## KIDOLGOZÁSRA VÁR

- **Ajánlat-állapot és visszahívás-jelzés** (pl. `allapot.json` a
  páciensmappában, a verziómappákon kívül) — valódi haszon (kit kell
  visszahívni, melyik ajánlat jár le), de új fájltípus és állapotgép;
  alaposabb tervezést igényel, hogy ne csússzon system of recorddá.

- **Storage-írási minta nincs kikényszerítve** (méret: **L**,
architektúra-szintű). A `PlanStorage` interfész csak a *hogyan*-t rögzíti
(D5), a *mikor*-t minden oldal maga dönti el: a tervszerkesztő pufferelt,
egyszeri mentést használ, az Árlista admin és a Beállítások azonnali,
mezőnkénti mentést. Ma ártalmatlan (`localStorage`), de a tervezett
`FileSystemStorage`-váltásnál (`docs/05` 2. fázis) teljesítmény- és
megbízhatósági kockázattá válik — pont ott, ahol a D16 takarítás miatt a
legtöbb jövőbeli admin-szerkesztés várható.

- **`storage/seed/priceList.ts:7` határsértés** (méret: **S**). Négy
`../`-vel importál a repo gyökerén lévő `data/`-ból, át a CLAUDE.md
szerint „csak referencia" mappaként leírt határon. A kockázat kisebb, mint
korábban itt szerepelt: az elmozdítás/átnevezés nem csendben törik el,
hanem `tsc -b`/Vite resolve hibaként azonnal jelentkezik build- és
dev-időben egyaránt — a valódi ár az olvashatóság (négy `../` nehezen
követhető) és az, hogy a `vite.config.ts` `server.fs.allow: ['..']`
kommentje ma csak a `CHANGELOG.md`/`FEATURES.md` `?raw` importokat
nevezi meg indoklásként, nem ezt.

- **Titkosítatlan `localStorage` páciensadattal** (méret: **L**, tervezési
döntés a mockup-fázisban — szándékos, lásd CLAUDE.md). Az architekturális
megoldás a `FileSystemStorage`-váltás (2. fázis), nem a mockup feladata.

**Cím szintű, kisebb tételek:** 
- a három legnagyobb fájl (`PlanEditorPage.tsx`, `PriceListAdminPage.tsx`, `pdf/TervDocument.tsx`)
bontása; 
- háromféle gombstílus; 
- `SettingsPage.tsx:28` közvetlenül
importálja a `DemoStorage.ts` `PREFIX` konstansát a sablon-piszkozat
cache kulcsához — tudatos, a fájl saját kommentje indokolja (hogy a
"Minden adat törlése" prefix-seprése ezt is elvigye), de ez a
cache-mechanizmus explicit localStorage-specifikus, a
`FileSystemStorage`-váltás (2. fázis) tervezésekor újragondolandó, nem a
mockup feladata most.
---

## NEM FEJLESZTÉS

### 24. tétel: Árlista-nap: közös ülés a dokival (adattisztítás és hiányzó szövegek)

**Nem kódtétel — tisztán adattisztítás és információkérés a dokitól.**
Fél nap, egyetlen ülésen begyűjthető, nincs hozzá tervdokumentum:

- a `gyakori` csillagozás (ma mind a 118 tétel `false`)
- a két `SAVOS` tétel alsó-határának visszaigazolása
- a `docs/06-arlista-import.md` „Ismert szennyeződés" táblázatában maradt,
  valódi ár-/kategorizálási döntést igénylő tételek (pl. `t072`/`t073`
  azonos ára, `t078` „Sín" kategóriája)
- a `k04`/`k05`/`k06`/`k12` fogtérkép-színe (ma mind alap szürke,
  `docs/06-arlista-import.md`)
- a nyomtatvány garancia-szakaszának magyar szövege — kezeléstípusonkénti
  garanciaidők, kivételek; a `GARANCIA_HU_V1` seed egyelőre
  `[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]`, a doki a
  Beállítások → Nyomtatvány szövegei alatt adja meg (a német verzió eddig
  is placeholder maradt volna, most már azért is, mert nincs mit
  AI-fordítani, amíg a magyar forrás maga is helykitöltő)
- a tétel-leírás (docs/02-domain-modell.md § Tétel-leírás) `csomag`-jelöléseinek
  és leírás-szövegeinek begyűjtése (docs/06-arlista-import.md)

---
## EGYÉB ötletek

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
  mondja ki, jó okkal. (A terv-szintű „kerek végösszeg" kedvezmény ezzel
  összefér, D25: az összeg ott sem kerül a papírra.)
- **Többfelhasználós jogosultságkezelés** — D1: egy rendelő, belső
  eszköz.
- **Mobilapp, felhőszinkron** — a Drive-tükrözés megoldja a hozzáférést;
  natív mobilapp új adatvédelmi felületet nyitna a GDPR 9. cikk szerinti
  adaton.
- **Ártétel-ár historizálás az árlistában** — a D7 (soronkénti
  pillanatkép) már megoldja.
- **Sor-szintű megjegyzés-oszlop külön mezőként** — a D13 kizárja; a
  szerkeszthető sornév (kész) + a tétel-leírás mező
  (docs/02-domain-modell.md § Tétel-leírás) lefedi a valós igényt.
- **Kategória-böngésző a keresőben** — a D19 kizárja; a doktor-napok a
  keresés pontosságára mutattak igényt, nem a böngészésre.
- **Több félretett terv (parkolópálya), `PISZKOZAT`-státuszú
  verziómappaként** *(2. kör)* — a megszakításos délelőtt valós, a
  doki-nap szerint Excelhez visszaűző fájdalma (ma egyetlen
  piszkozat-slot van, a többi munka telefonfotóra kerül). A helyes út
  **nem** a `DraftStorage` többrekeszessé tétele (az a „nem válhat system
  of recorddá" szabályt sértené — lásd EGYÉB ötletek), hanem „Mentés
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

- **Teljes verzió-diff nézet** (mi változott sorszinten v1 és v2 között)
  — a 11. tétel összeg-kiírása után derül ki, mennyire hiányzik.
- **Fogtechnikusi munkalap generálása** — más célközönség (a technikus),
  más adattartalom; külön funkció.
- **Tömeges árváltoztatás az adminban** (pl. „minden implantátum +5%") —
  valódi időmegtakarítás árlistafrissítéskor, de évente egyszer kell.
- **Valódi összetett csomag-tétel** (csomag = tételek listája) — a
  tétel-leírás mező (docs/02-domain-modell.md § Tétel-leírás) valószínűleg
  kiváltja; csak akkor, ha nem elég.
- **Séma-migrációs út** — a `schemaVersion` ma csak felfelé véd; amíg 1
  marad (a fenti tételek egyike sem emeli), nem sürgős, de a D18
  előbb-utóbb megköveteli.
- **`terv.json` beágyazása a PDF-be** (D5) — a `docs/05` explicit a 2.
  fázisra (fájlrendszeres verzió, `pdf-lib`) ütemezi.


---

