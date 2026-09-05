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

### 115. tétel: Nyelv-/pénznemváltás megerősítő dialógusának gombszín-inkonzisztenciája

  A `pages/PatientPage.tsx` megerősítő `AlertDialog`-jának "Folytatás"
  gombja kizárólag nyelvváltásnál kap piros színt
  (`color={pending?.kind === 'nyelv' ? 'red' : undefined}`), a
  funkcionálisan azonos jellegű (nem-destruktív, csak neveket/árakat
  frissítő) pénznemváltásnál nem — a piros szín itt nem tükröz valódi
  extra kockázatot. Forrás:
  `docs/reviews/2026-09-05-doctor-review-nemet-euro.md` 3. megállapítás.
  **Terv:** `backlog/plans/backlog-115-nyelv-penznem-gombszin-terv.md`

### 116. tétel: "Nyomtatvány szövegei" fül mindig magyarra nyit, függetlenül a hívó terv nyelvétől

  A `pages/settings/NyomtatvanyokTab.tsx` belső nyelv-váltója
  (`templateLang`) mindig `'hu'`-val inicializálódik — egy nem-magyar terv
  Előnézetéről a checklist "Nyomtatvány szövegei" gombjával navigálva a
  doki mindig egy plusz kattintással vált a terv tényleges nyelvére.
  Forrás: `docs/reviews/2026-09-05-doctor-review-nemet-euro.md`
  5. megállapítás.
  **Terv:** `backlog/plans/backlog-116-nyomtatvanyok-tab-nyelv-elovalasztas-terv.md`

### 117. tétel: Új terv-lánc nyelv-/pénznem-öröklésének jelzése

  Egy vadonatúj terv-lánc a páciens legutóbbi véglegesített tervének
  nyelvét/pénznemét örökli (szándékos, `docs/02-domain-modell.md` § „Nyelv és
  pénznem”), de erről a Terv adatai lap semmilyen jelzést nem ad — a doki csak
  akkor veszi észre, ha kifejezetten másikat szeretne. A tétel az öröklést nem
  bontja vissza, csak egy semleges, dimenziónkénti jelzést tesz a „Dokumentum
  nyelve” és a „Pénznem” szekcióba, kizárólag ott, ahol az örökölt érték eltér
  az adott dimenzió globális alapértelmezésétől. Kizárva: a „Másolás új
  tervbe” és az „Új verzió” útvonal, a véglegesítés-őr bővítése, és bármilyen
  akciógomb a jelzésben. Forrás:
  `docs/reviews/2026-09-05-doctor-review-nemet-euro.md` 4. megállapítás.
  **Terv:** `backlog/plans/backlog-117-orokolt-nyelv-penznem-jelzes-terv.md`

### 118. tétel: A NumberField pénz-mezőinek megerősítése

  A `components/NumberField.tsx` EUR beviteli módja `de-DE` szerint,
  ezres jellel formáz (`"9.000,00"`), a `parseEuroInput` viszont ezt nem
  tudja visszaolvasni — 1000 € fölött a mező olyan szöveget mutat, amit a
  saját parsere `null`-ként ért, ezért egy kurzoros szerkesztés némán
  visszaugrik a régi értékre. Emellett a ~14 px-es ▲/▼ léptető ráúszik az
  input jobb szélére, fókusz nélkül, azonnal commitál ±1 alapegységet, és
  az Escape nem vonja vissza — egy elkattintás hang nélkül átír egy
  szerződéses összeget. A tétel ezért kivizsgálásból javítássá alakult: az
  EUR beviteli megjelenítés csoportosítás nélkülivé válik, a néma
  visszaállás jelzést kap, a léptetés (gomb és nyíl egyaránt) elmarad a
  pénz-mezőkről, a darabszám/százalék mezőkön változatlanul megmarad. A
  `formatMoney` képernyős/PDF-es számformátuma nem változik, a
  commit-on-blur elv nem kerül visszabontásra. Az eredetileg kért, kézi
  böngészős újrateszt záró verifikációként marad benne. Forrás:
  `docs/reviews/2026-09-05-doctor-review-nemet-euro.md` 6. megállapítás.
  A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-118-numberfield-penzmezo-megerosites-terv.md`

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

