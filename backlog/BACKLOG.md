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

### 57. tétel — Kezelésszerkesztő oldal alaplayout és fogtérkép
  (a `backlog/redesign/` redesign-döntéssorozat DP-040 tétele) — a
  `docs/03` § 3 már ma is részletesen dokumentálja a kezelésszerkesztőt
  (D70 „AS-IS"); a feltárás szerint a fogtérkép-csukottság és az
  összegzés-elhelyezés már megfelel a redesignnak, egyedül a friss
  piszkozat kereső-autofókusza hiányzik. A fázis-szintű mechanikák
  (összecsukás/sorrend/törlés/átnevezés/megjegyzés) a 58. tételbe
  tartoznak. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-57-kezelesszerkeszto-alaplayout-terv.md`

### 58. tétel — Kezelési fázisok kezelése
  (a `backlog/redesign/` redesign-döntéssorozat DP-041 tétele) — ma
  nincs fázis-szintű összecsukás és sorrendezés (nulla infra), a
  sor-törlésnek nincs Undo-ja, a fázismegjegyzés mindig látszik
  (nincs progresszív elrejtés). Ez a tétel bevezeti mindezt, megtartva
  a mai, dokumentált üres-fázis gyors-törlési kivételt és az always-on
  fázisnév-mezőt (D86 pencil-mintája helyett, indoklással). A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-58-fazisok-kezelese-terv.md`

### 59. tétel — Kezelés keresés, quick items és hozzáadás
  (a `backlog/redesign/` redesign-döntéssorozat DP-042 tétele) — a
  kereső/gyorsgombok/hozzáadás nagyrészt már megfelel a redesignnak.
  A D99/D100 (fókusz a Fog mezőre tételhozzáadás után) EXPLICIT
  ELVETVE, mert ütközik a `docs/07`/`CLAUDE.md` „a kereső-ciklus nem
  törhet el" kötelező szabályával — a user ezt megkérdezve a mai
  ciklus megtartása mellett döntött. D101 (új fázis kereső-autofókusza)
  változatlanul bekerül. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-59-kezeles-kereses-terv.md`

### 60. tétel — Kezeléssor szerkesztése
  (a `backlog/redesign/` redesign-döntéssorozat DP-043 tétele) — az
  egyedi név/ár-eltérés jelzés ma csak német terven működik (magyaron
  sosem), és sehol nincs reset a névre/árra/leírásra. Ez a tétel
  nyelvfüggetlenné teszi a markereket és reset-vezérlőket ad
  mindháromhoz; a becsült ár `≈` widget marad (docs/07 nevesített
  kivétele), csak pozíciót vált. A javaslat „sorrend/mozgatás" és
  „accordion" scope-bulletjei explicit kizárva (nincs döntés mögöttük,
  előbbi ellentmond D102-nek). A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-60-kezelessor-szerkesztes-terv.md`

### 61. tétel — Árlista-snapshot és explicit refresh
  (a `backlog/redesign/` redesign-döntéssorozat DP-044 tétele) — a
  soron ma nincs ár-követési komparátor és semmi nem diffel egy sort
  az aktuális árlistához. Ez a tétel egy `nevKoveti()` mintájú,
  derived ár-komparátort és mező-/sor-szintű explicit refresh UI-t
  vezet be, megerősítő előnézettel. Feloldja a 49. tétel 2./6.
  VÁRAKOZÓ döntését. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-61-arlista-snapshot-refresh-terv.md`

### 62. tétel — Többpénznemes listaár / ajánlati ár state
  (a `backlog/redesign/` redesign-döntéssorozat DP-045 tétele) — a
  `Sor` ma egyetlen implicit-pénznemű árpárt tart, a pénznemváltás
  DESTRUKTÍV (törli a sorokat), miközben az árlistai `Tetel.ar` már ma
  is mindkét pénznemet tartja. Ez a tétel additív „másik pénznem"
  stash-mezőt ad a sorhoz, nem-destruktívvá téve a váltást, séma-
  bővítés nélkül. A 63./64. tétel erre épül. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-62-tobbpenznemes-ar-terv.md`

### 63. tétel — Egyedi végösszeg
  (a `backlog/redesign/` redesign-döntéssorozat DP-046 tétele) — a
  „Kerek végösszeg" ma abszolút összeg (D25 szerint helyesen), de
  csak kedvezményre korlátozva, felár nélkül. Ez a tétel átnevezi
  „Egyedi végösszeg"-re, felár-irányt enged (önállóan eldöntve, mert a
  mai korlát hatókör-döntés volt, nem adatvédelem), és 0-összeg
  megerősítést + üres/autofókuszált bekapcsolást ad. A döntéseket lásd
  a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-63-egyedi-vegosszeg-terv.md`

### 64. tétel — Előleg és fennmaradó összeg
  (a `backlog/redesign/` redesign-döntéssorozat DP-047 tétele) — az
  Előleg ma SZÁZALÉK-alapú, tudatos drift-mentes indoklással; a
  redesign abszolút összeget kér, ami a mai automatikus 0-100%-os
  védelmet megszünteti. A user a redesign mellett döntött — ez a
  tétel a teljes deposit≤final validációs láncot nulláról építi fel.
  A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-64-eloleg-terv.md`

### 65. tétel — Manuális szövegek nyelvi review-ja
  (a `backlog/redesign/` redesign-döntéssorozat DP-048 tétele) —
  nyelvi review-metaadat (`authoredInLanguage`/`reviewedForLanguage`)
  sehol nem létezik; a meglévő `sorFallback` egy MÁSIK problémát old
  meg (árlistai fordítás-hiány, magyar terven nem is fut). Ez a tétel
  a doki saját, szabad szövegeinek nyelv-ellenőrzését építi ki,
  guided review-val, a meglévő mechanizmus mellett, nem helyette. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-65-nyelvi-review-terv.md`

### 51. tétel — Terv adatai oldal layout + cím + dátumok
  (a `backlog/redesign/` redesign-döntéssorozat DP-030 tétele) — a mai
  "Páciens adatlap" (a workflow-stepper már "Terv adatai"-nak hívja)
  nem stacked-section szerkezetű, nincs cím mezője (a cím kizárólag a
  `terv-cimke.json`-ban, csak már mentett lánchoz szerkeszthető), és
  nincs szerkeszthető érvényességi dátuma. Ez a tétel a D68 szerinti
  hat szekcióra tagolja a lapot, bevezet egy cím mezőt (meglévő
  lánchoz azonnal, vadonatújhoz véglegesítéskor íródik ki), és
  szerkeszthetővé teszi az "Érvényes eddig" dátumot. A döntéseket lásd
  a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-51-terv-adatai-oldal-terv.md`

### 52. tétel — Dokumentumnyelv és pénznem kiválasztása / öröklése
  (a `backlog/redesign/` redesign-döntéssorozat DP-031 tétele) — a
  nyelv/pénznem-kártya ma az első véglegesítés után véglegesen
  zárolva marad ("Új verzió" drafton), a `nemetEngedelyezve`
  funkciókapcsoló elrejti a kártyát, és a pénzformátum (`formatMoney`)
  csak a pénznemtől függ, a nyelvtől nem (DE+HUF ma tévesen `1 234 567
  Ft`-ot ír, nem `1.234.567 Ft`-ot). Ez a tétel feloldja a zárolást a
  teljes piszkozat-életciklusra, teljesen eltávolítja a funkciókapcsolót,
  és `formatMoney`/`formatPrice`-t nyelvfüggővé teszi (utóbbi kettő
  explicit user-döntés, mert ellentmond a ma dokumentált D21-nek). Az
  öröklési szabály (D534) feloldja a 47. tétel VÁRAKOZÓ döntését. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-52-nyelv-penznem-terv.md`

### 53. tétel — Kezelőorvos kiválasztása és öröklési szabályai
  (a `backlog/redesign/` redesign-döntéssorozat DP-032 tétele) —
  `Settings.orvosok` ma sima névlista, aktív/inaktív jelölés és
  per-terv választó UI nélkül; az egyetlen írás `orvosok[0]`. Ez a
  tétel additív módon (séma-bővítés nélkül) bevezeti az aktív/inaktív
  és alapértelmezett-orvos fogalmát, egy választó UI-t a Terv adatai
  lépésen, és a hozzá tartozó öröklési szabályokat (új lánc: mindig
  default; új verzió: örökli, ha aktív; másolás: mindig default) —
  ezzel feloldja a 47./48./49. tétel VÁRAKOZÓ orvos-döntéseit, plusz
  egy új finalizációs hard blockot ad hiányzó/inaktív orvosra. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-53-kezeloorvos-terv.md`

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

