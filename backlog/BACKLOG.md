# Backlog

A `docs/01` lezárt, történeti `D<szám>` döntéstáblája és a `CLAUDE.md`
„Sérthetetlen szabályok" táblája egyik tételt sem sértik — ahol ez nem
nyilvánvaló, a tétel maga jelzi, melyik korábbi döntéssel fut össze. Új
tétel nem hoz létre és nem hivatkozik új D-számra.

**Számozás:** a tételek sorszáma stabil azonosító, nem prioritás. Lezárt
tétel száma véglegesen nyugdíjazva, soha nem osztható ki újra — az új tételek a sorozatot onnan folytatják,
ahol a legutóbb kiosztott szám állt.

**Sorrend:** a listákon belül hasznosság szerint — a napi fájdalom
mérete × gyakorisága, holtversenynél a kisebb munka előre. 

---
## KIDOLGOZOTT

### 104. tétel: Terv-lánc listán jelzés a törzsadat ↔ pillanatkép eltérésről

  A `components/PatientPlanChains.tsx` sehol nem hívja a
  `domain/masterSnapshotDiff.ts`-t, így egy elavult kontaktadatú verzió
  csak a saját részletoldalán derül ki. Kért: apró, nem tolakodó jelzés a
  lánc/verzió soron is — a törzsadat betöltésére a
  `domain/torzsadatBetoltes.ts` `loadMegjelenitettTorzsadat()` már megvan.
  A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-104-torzsadat-elteres-lanc-listan-terv.md`

### 105. tétel: Sikerképernyő — mit fogadott el a doki véglegesítéskor

  A `pages/PreviewPage.tsx` mentés utáni ága csak a sikerüzenetet, a
  fájl-útvonalat és két gombot mutat; a véglegesítés-őr checklistje ebben
  az ágban egyáltalán nem szerepel. Így a tudatosan elfogadott puha
  figyelmeztetések (kézi ár, kimaradó szakasz, 0 Ft-os sor) ténye a
  sikerképernyőn nyomtalanul elvész.
  A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-105-sikerkepernyo-visszatekintes-terv.md`

### 106. tétel: Mentés-visszajelzés az árlista tétel-soroknál

  A Beállítások és a Kategóriák panel időközben megkapta a "Mentve"
  visszajelzést, de a `pages/PriceListAdminPage.tsx` mezőnkénti azonnali
  mentése csak hibát jelez, sikert nem, és az `ItemEditor` egyetlen
  mentés-jelzést sem rendereli — minden név-, leírás-, kategória- és
  árírás némán történik.
  **Terv:** `backlog/plans/backlog-106-mentes-visszajelzes-arlista-sorokon-terv.md`

### 107. tétel: Duplikáció-jelölt chip megkülönböztető adattal

  A `pages/paciensek/DuplikacioJavaslatok.tsx` chipje kizárólag minőségi
  indoklást ír ki (pl. „azonos név"), a tényleges születési dátumot/
  telefonszámot sosem — több hasonló nevű jelöltnél (apa/fiú, gyakori
  vezetéknév) így nem lehet a chipről dönteni. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-107-duplikacio-jelolt-adat-terv.md`

### 108. tétel: Élő Összeg oszlop gépelés közben

  A `pages/planEditor/LineRow.tsx` Összeg cellája a committált propokból
  számol, az ár mező pedig — a darabszámmal ellentétben — nem ad át élő
  piszkozat-értéket, így gépelés közben az Összeg a régi értéken marad, a
  mező pedig átmenetileg vezető nullát mutathat. A commit-on-blur maga
  szándékos, nem ezt kell visszabontani.
  A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-108-elo-osszeg-oszlop-terv.md`

### 109. tétel: Új páciens gyorsfelvétel — elvetés-megerősítés

  A `pages/paciensek/UjPaciensDialog.tsx` tisztán helyi állapotot tart,
  navigációra a begépelt adat szótlanul elvész. A piszkozat-visszaírás
  tudatosan nem éri meg egy ilyen rövid űrlapnál — a kérés csak egy
  elvetés-megerősítés a meglévő `components/DiscardChangesDialog.tsx`
  `useDiscardGuard` primitívjével. A testvér
  `pages/priceListAdmin/UjTetelDialog.tsx` szándékosan nem tartozik bele.
  **Terv:** `backlog/plans/backlog-109-uj-paciens-elvetes-megerosites-terv.md`

### 110. tétel: Apró szövegezési csiszolások (gyűjtőtétel)

  Három egymondatos javítás: (a) a `pages/planEditor/LineRow.tsx` ár-
  frissítő gombjának tooltipje visszavonhatatlannak hangzik, pedig a
  művelet valójában egy előnézetes megerősítő dialógust nyit; (b) ugyanott
  a Fog mező placeholdere valós FDI-számokat mutat „pl." előtag nélkül;
  (c) a tétel-inaktiválás megerősítő dialógusának szövegében szimpla
  dupla kötőjel szerepel gondolatjel helyett.
  A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-110-szovegezesi-csiszolasok-terv.md`

---
## NEM FEJLESZTÉS

### 24. tétel: Árlista-nap: közös ülés a dokival (adattisztítás és hiányzó szövegek)

**Nem kódtétel — tisztán adattisztítás és információkérés a dokitól.**
Fél nap, egyetlen ülésen begyűjthető, nincs hozzá tervdokumentum:

- a `gyakori` csillagozás (ma mind a 118 tétel `false`) — 8–12 tételt kell
  megjelölni, ezek lesznek a szerkesztő gyorsgombjai
- a két `SAVOS` tétel (`t014` Fogbél megnyitás + gyógyszeres zárás, `t016`
  Gyökértömés csatornaszámtól függően) alsó-határának visszaigazolása —
  az eredeti Excelben `"35-55000"` alakban szerepelt, a sáv alsó határa
  rövidítve; jelenleg a felső határ nagyságrendjéhez igazítva egészült ki
  (`35 000`/`38 000`), ez a doki jóváhagyására vár
- valódi ár-/kategorizálási döntést igénylő tételek: `t072`/`t073`
  „Fémkerámia implantátumra" azonos 95 000 Ft ára (csak a zárójeles
  kiegészítésben térnek el, az egyik valószínűleg felesleges), `t078`
  „Sín" jelenlegi `k10 Korona és hídpótlások` besorolása (valószínűleg
  `k12`-be való), `t064`/`t066` „Zárt/nyitott küret foganként" azonos
  10 000 Ft ára a kvadránsos változatuk eltérése (60 000 vs 85 000 Ft)
  mellett, és a `t054`/`t055`/`t056` (BLX/Straumann implantátumok) eltérő
  névforma (szórend) a három sor közt
- a `k04`/`k05`/`k06`/`k12` fogtérkép-színe (ma mind alap szürke,
  `#adb5bd`) — a kategória-karbantartó panelben egy kattintással
  átszínezhető
- a nyomtatvány garancia-szakaszának magyar szövege — kezeléstípusonkénti
  garanciaidők, kivételek; a `GARANCIA_HU_V1` seed egyelőre
  `[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]`, a doki a
  Beállítások → Nyomtatvány szövegei alatt adja meg (a német verzió eddig
  is placeholder maradt volna, most már azért is, mert nincs mit
  AI-fordítani, amíg a magyar forrás maga is helykitöltő) — amíg a szöveg
  placeholder marad, a generált PDF egyik oldala emiatt csaknem üresen
  marad; a szöveg pótlása után érdemes visszanézni, marad-e feltűnően
  üres oldal
- a tétel-leírás (docs/02-domain-modell.md § Tétel-leírás) `csomag`-jelöléseinek
  és leírás-szövegeinek begyűjtése — ma egyik 118 tételen sincs kitöltve

### 111. tétel: Kezdőlapi páciens-keresés — elvetve

  A Kezdőlap „Legutóbbi páciensek" listája kereső nélküli, max 5 elemű
  (`RECENT_PACIENS_LIMIT`); egy régebbi páciensért menüt kell váltani. A
  tétel a felvetéskor maga kapuzta magát egy doki-kérdéssel: mekkora
  páciensállományra számít éles használatban. A `/planning` munkamenetben
  megkérdezve a válasz „néhány tucat–pár száz páciens" — csak azok
  kerülnek be, akiknek ténylegesen készül kezelési terv/árajánlat, nem a
  teljes rendelői kartonállomány. Ekkora állománynál:
  - a **Páciensek** menüpont mindig egy kattintásra van
    (`app/src/components/NavBar.tsx` `FO_LINKS`), és a
    `pages/PaciensekPage.tsx` már ma is teljes értékű keresőt futtat
    névre, születési dátumra és telefonra (`domain/paciensKereses.ts`
    `keresoKulcs`/`torzsadatEgyezik`), a keresőszöveget böngésző-„vissza"-
    navigációnál megőrizve;
  - az „új terv indítása" útvonalnak (`pages/NewPlanPage.tsx`) külön,
    relevancia-rendezett keresője van (`paciensTalalatok()`) — egy
    harmadik kereső-felület a Kezdőlapon ezt a kettőt duplikálná;
  - az 5-ös recent-limit a napi eseteket lefedi, a ritkább visszakeresés
    megéri az egy menüváltást.
  **Mi hozná vissza:** ha az állomány ezres nagyságrendre nőne (pl. teljes
  kartonállomány átvétele) — de akkor nemcsak a kezdőlapi kereső kérdés
  nyílna újra, hanem a `pages/PaciensekPage.tsx` betöltési módja is (ma
  MINDEN páciens `paciens-adatok.json`-ját egyszerre tölti be a
  `loadTorzsadatok()`-kal).

---

## KIDOLGOZÁSRA VÁR

1. **Ajánlat-állapot és visszahívás-jelzés.** A páciens kezelési
   terveinek dokumentuméletciklusától (`PISZKOZAT`/`VEGLEGES`)
   függetlenül követhető legyen, hogy egy ajánlat üzletileg hol tart, és
   kit kell visszahívni. A kidolgozásnak kell meghatároznia az állapotokat,
   a lejárat/visszahívás működését és a tárolási modellt; az `allapot.json`
   csak lehetséges megoldás, nem előre rögzített követelmény.

2. **Betegdokumentáció és EESZT-integráció lehetőségének feltárása.** A
   doktor által jelzett, más fogászati szoftverekben elérhető integráció
   távlati termékbővítés lehet, de a megvalósítás előtt fel kell tárni a
   kívánt rendelői munkafolyamatot, a szükséges adatokat, a hozzáférési és
   megfelelőségi feltételeket, valamint a reális fejlesztési költséget. A
   feltárás eredménye alapján dönthető el, hogy milyen konkrét fejlesztési
   tételekre érdemes bontani.

3. **Kezelési terv egyszeri elküldése e-mailben.** A már elkészült PDF-et
   a tervben rögzített e-mail-cím felhasználásával, kevés lépésben lehessen
   elküldeni a páciensnek. A kidolgozásnak össze kell hasonlítania az
   alapértelmezett levelező előkészítését, a rendszermegosztást és a saját
   levélküldést; utóbbi csak a hitelesítési, adatvédelmi és kézbesítési
   felelősség tisztázásával választható.

4. **Tömeges e-mailes emlékeztetők és automatikus utánkövetés
   feltárása.** A felhasználói visszajelzésben felmerült az esedékes
   kontrollok — például fogkő-eltávolítás — és a közelgő időpontok
   automatikus jelzése. Először az emlékeztetőtípusokat és a szükséges,
   jelenleg hiányzó adatforrásokat kell meghatározni; a későbbi megoldásnak
   az ütemezést, hozzájárulást, leiratkozást, kézbesítési hibákat és a
   küldési infrastruktúrát is kezelnie kell.

5. **Több félretett, később folytatható kezelési terv.** Az egyetlen aktív
   böngészős piszkozat mellett a doktor tartósan is félretehessen több
   megszakított munkát, a meglévő append-only mentési útvonalon,
   `PISZKOZAT` státuszú verzióként. A kidolgozásnak tisztáznia kell a
   listázást és folytatást, a törlést/takarítást, a hiányos sorok
   menthetőségét, valamint azt, hogy a félretett verzióhoz készüljön-e PDF.

6. **Sémamigrációs stratégia és keretrendszer kidolgozása.** Meg kell
   határozni, hogyan alakulnak át a rendelő meglévő JSON-fájljai, amikor az
   alkalmazás valamelyik adatsémája megváltozik. A kidolgozás térjen ki a
   fájltípusonkénti, egymásra épülő verziólépésekre, a mentés előtti
   biztonsági másolatra, a validációra és részleges hiba esetén a
   visszaállásra, valamint a régi adatokon futó migrációs tesztekre; az
   első `schemaVersion: 2` bevezetése már ezt a módszert kövesse.

