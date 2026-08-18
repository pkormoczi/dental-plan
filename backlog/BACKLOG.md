# Backlog

A `docs/01` sérthetetlen keretei (D1–D32) egyik tételt sem sértik —
ahol ez nem nyilvánvaló, a tétel maga jelzi, melyik döntéssel fut össze.

**Számozás:** a tételek sorszáma stabil azonosító, nem prioritás. Lezárt
tétel száma véglegesen nyugdíjazva, soha nem osztható ki újra — az új tételek a sorozatot onnan folytatják,
ahol a legutóbb kiosztott szám állt.

**Sorrend:** a listákon belül hasznosság szerint — a napi fájdalom
mérete × gyakorisága, holtversenynél a kisebb munka előre. 

---
## KIDOLGOZOTT

### 30. tétel — Páciens detail shell és tab-navigáció
  (a `backlog/redesign/` redesign-döntéssorozat DP-002 tétele) — új,
  URL-lel címezhető páciens-részletoldal két tabbal (`Páciens adatai |
  Kezelési tervek`), sticky compact fejléc, alapértelmezett tab-szabály,
  first-plan CTA üres tervlistánál. A mai `PaciensekPage`/`PlanHistoryPage`
  tartalma átköltözik (nem újratervezve) a két tabba, a mai kereszt-linkek
  (ma `location.state`-alapú, duplikált boilerplate) az új oldalra
  mutatnak át. A `PatientEditor` mélyebb viselkedése (valódi
  read-only/Edit-mód), a master↔snapshot szinkron és a chain/version lista
  finomítása szándékosan KÍVÜL marad — külön tételek (DP-015/DP-016/DP-020)
  dolga. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-30-paciens-detail-shell-terv.md`

### 31. tétel — Terv workflow shell, breadcrumb és stepper
  (a `backlog/redesign/` redesign-döntéssorozat DP-003 tétele) — állandó,
  kattintható breadcrumb (`Páciensek > [páciens neve]`) + 3-lépéses,
  szabadon kattintható stepper (`Terv adatai → Kezelések → Előnézet és
  véglegesítés`) a három workflow-oldal köré. A véglegesítés utáni
  sikerpanel változatlan marad (a `Terv részletei` nézet még nem létezik,
  DP-060 dolga), csak a "Korábbi tervek" gomb célja frissül a 30. tétel
  páciens-részletoldalára. Utolsó lépésként eltávolítja a 29. tételben
  (DP-001) átmenetileg megtartott négy NavBar-linket
  (`Páciens`/`Terv szerkesztő`/`Előnézet`/`Korábbi tervek`), lezárva azt a
  függőséget. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-31-terv-workflow-shell-terv.md`

### 32. tétel — Aktív draft lifecycle és autosave
  (a `backlog/redesign/` redesign-döntéssorozat DP-004 tétele) — feltárás
  szerint a hatókör nagy része (egy aktív draft, felülírás-guard, szabad
  kilépés, quick-páciens túlélése, atomikus véglegesítés) MÁR MEGVAN;
  a valódi hiányzó rész: a "Piszkozat folytatása" az utolsó tényleges
  workflow-lépésre navigáljon (ma csak találgat, sosem céloz Előnézetre),
  pozitív ("mentve HH:MM") jelzés a szerkesztőben (ma csak hiba látszik),
  trash-ikon a szerkesztőben a teljes draft eldobására megerősítéssel, és
  ugyanez a Home egészséges piszkozat-kártyáján (ma csak a sérült
  piszkozat kártyáján van eldobás, megerősítés nélkül). A döntéseket lásd
  a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-32-aktiv-draft-lifecycle-terv.md`

### 33. tétel — Közös Save/Cancel és dirty-navigation guard
  (a `backlog/redesign/` redesign-döntéssorozat DP-005 tétele) — feltárás
  szerint MA három egymástól független dirty-detektálás és ötszörösen
  másolt `AlertDialog`-minta él egymás mellett (Árlista admin és a
  Beállítások legtöbb szekciója tisztán autosave, csak a Páciens-
  szerkesztő és a Beállítások "Nyomtatvány szövegei" szekció közelít a
  cél-mintához). Ez a tétel egy közös dirty-tracking hookot és egy közös
  "elvetnéd a módosításokat?" dialógus-komponenst épít, a Páciens-
  szerkesztőt (bájtra változatlan viselkedéssel) és a Sablonok szekció
  hiányzó Cancel gombját/guardját ráállítja. Az Árlista admin és a
  Beállítások többi szekciójának autosave→explicit átállítása
  SZÁNDÉKOSAN kívül marad — a saját tételeik (DP-080/081, DP-082–087)
  dolga. A "piszkozat felülírása" (aktív draft) guardok a 32. tétel
  (DP-004) már lezárt területe, ehhez nem nyúl. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-33-save-cancel-dirty-guard-terv.md`

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

