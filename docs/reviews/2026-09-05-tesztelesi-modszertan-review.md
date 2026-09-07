# Tesztkészlet és tesztelési módszertan — teljes körű review

Dátum: 2026-09-05  
Vizsgált HEAD: `f090b198e125dd9b5bf942d41d329bb97d084de2`  
Hatókör: az alkalmazás teljes tesztleltára, teszt-infrastruktúrája, CI-ja, workflow-tesztjei és a tesztírást irányító dokumentumok.  
Jelleg: értékelés és javaslat; nem elfogadott tesztelési szabályzat, nem implementációs terv. A súlyosságok a review megállapításai, nem backlog-`Prio` értékek.  
Kiegészítés: a 9. szakasz egy független második vélemény (2026-09-06), amely az F01–F12 állításait a kódon újraellenőrzi, és ahol eltér, azt kimondja.

## 1. Vezetői értékelés

**Igen, szükség van közös tesztelési koncepcióra. A fő probléma nem a tesztek száma, hanem a bizonyítási felelősség rendezetlensége.** Sok jó, olcsó domain-teszt mellett jelentős a teljes alkalmazást újra és újra felépítő UI-tesztek költsége. Eközben néhány fontos szerződés — különösen a tényleges PDF és a mentett terv egyezése — két külön tesztelt réteg közé esik.

A „nincs semmilyen utasítás” állítást pontosítanám: a gyökér `CLAUDE.md` konkrét tesztnevet kér és tiltja a `.skip`/`.only` használatát; a `/plan` megfigyelhető viselkedést kér a `Verification` részben; a `/implement` ezt teszttel teljesítteti; a nested context és a `/manual-checks` ismeri a jsdom vakfoltjait. **Ami hiányzik: a tesztelési szint kiválasztásának szabálya, a meglévő bizonyíték keresése, a redundancia elbírálása és az assertion minőségi követelménye.**

A készlet összességében értékes regressziós védelem. Nem indokolt nagy részét törölni, új keretrendszerre cserélni vagy kötelező darabszámmal korlátozni. A legjobb következő lépés:

1. A nagy kockázatú, hiányos bizonyítékokat megerősíteni, elsősorban a PDF–JSON és a betöltési határokon.
2. Minden üzleti szabály részletes esetmátrixának kijelölni egy elsődleges helyet; a magasabb szinteken az összekötést ellenőrizni.
3. A drága UI-tesztek fixture-jeit és előkészítését egyszerűsíteni; az olcsó domain-tesztek darabszámát nem sebességproblémaként kezelni.
4. Az agentek számára rövid, ellenőrizhető tesztírási döntési rendet bevezetni.

**A „teszt az élő működésleírás” modell megtartható. Ehhez a tesztnek a saját nevében vállalt állítást ténylegesen bizonyítania kell. A zöld futás önmagában sem teljességet, sem termékszándéknak való megfelelést nem jelent.**

## 2. Módszer, bizonyíték és korlátok

Az áttekintés alapja:

- a 101 alkalmazásteszt-fájl teljes leltára, importjai, tesztesetei és futási eredménye;
- statikus keresések a mockokra, assertionökre, tesztnevekre, globális állapotra, tesztpárokra és a production hívási helyekre;
- részletes forrásolvasás a pénzügyi, pillanatkép-, verzió-, validációs, véglegesítési, PDF-, állapotkezelési és nagy UI-tesztcsaládokban;
- a 10 workflow-integrációs teszt és a minőségi kapuk vizsgálata;
- két helyi, kizárólag memóriában végzett validációs próba a változatlan `validate.ts` függvényeivel;
- a korábbi review-k és a kapcsolódó nyitott backlog-tételek ellenőrzése.

Ez a teljes tesztrendszerre kiterjedő, kockázatalapú review; a függelék minden jelenlegi tesztfájlt felsorol. Nem állítom, hogy mind az 1870 paraméterezett eset külön kézi szimulációt kapott. Nem készült instrumentált sor-/áglefedettségi vagy mutációs mérés, ismételt flakiness-mérés, illetve új böngészős/PDF-vizuális ellenőrzés. A leírt hiányok ezért konkrét assertion- és forgatókönyvhiányok, nem becsült coverage-százalékok. A lehetséges optimalizálások várható haszna nincs előre megmért gyorsulásként feltüntetve.

Az alkalmazáskódot, teszteket és szabályzatokat a review nem módosítja. A már meglévő, a feladathoz nem tartozó untracked fájlokat nem használja változtatási alapként.

### Futtatási eredmény

Windows, Node `v26.4.0`, npm `11.17.0`; az alkalmazás csomagdeklarációja Vitest `^4.1.10`, React `^19.2.8`. Az alkalmazástesztek futtatása: `npm.cmd run test -- --reporter=json --outputFile=…`.

| Ellenőrzés | Eredmény |
|---|---|
| Alkalmazástesztek | **101 fájl, 1870 sikeres eset**, 0 hibás, 0 kihagyott |
| Workflow-tesztek | **10/10 sikeres**, kb. 17,7 s |
| Build/typecheck | Sikeres; a Vite nagy chunkokra figyelmeztet |
| Lint | 0-s kilépés, 13 `react/only-export-components` figyelmeztetés |
| Docs-check | 322 fájl, 0 hiba |

A futás során ismételt, hiányzó canvas-implementációról szóló üzenetek jelentek meg. Ez összhangban áll a dokumentált környezeti korláttal; nem valódi PDF-renderelési bizonyíték. A lint „zöld” itt sikeres kilépést jelent, nem figyelmeztetésmentességet.

### Méret és megoszlás

Az alábbi csoportok **könyvtárak, nem automatikusan tesztelési szintek**. Például a `domain/torzsadatBetoltes.test.ts` valódi `DemoStorage`-ot használ, míg a `pages/` alatt tiszta prezentációs komponens tesztje is van.

| Hely | Fájl | Futó eset | Forrássor* | Fájlon belüli futási idő összege** |
|---|---:|---:|---:|---:|
| `domain/` | 45 | 713 | 6958 | 0,51 s |
| `storage/`, seeddel együtt | 7 | 406 | 1580 | 0,23 s |
| `state/` | 2 | 26 | 774 | 2,53 s |
| `components/` | 11 | 87 | 1570 | 17,82 s |
| `pages/` | 28 | 528 | 13360 | 512,74 s |
| `pdf/` | 6 | 86 | 1159 | 0,83 s |
| `design/` | 1 | 19 | 180 | 0,03 s |
| `App.test.tsx` | 1 | 5 | 298 | 14,00 s |
| **Összesen** | **101** | **1870** | **25879** | **548,69 s** |

\* Üres sorokkal és kommentekkel, újsor szerinti felosztással. Nem végrehajtható kódsorok száma.  
\** A JSON-riport fájlonkénti `endTime − startTime` értékeinek összege; az import-/környezetindítás nincs külön kimérve. Párhuzamos futások összeadva, ezért ez **nem a felhasználó várakozási ideje**. A riport indulásától az utolsó tesztfájl befejezéséig kb. **117,35 s** telt el.

Az 1870 sem 1870 külön termékszabály: a `storage/seed/plans.test.ts` egymaga **292 futó esetet** hoz létre a seed sorain és rekordjain végzett paraméterezett ellenőrzésekből. Ez önmagában rendben van; a tesztdarabszámot azonban nem szabad a funkcionális teljesség mérőszámaként kezelni.

## 3. Amit érdemes megőrizni

- **Domain-szabályok jól olvasható ellenpéldákkal.** A `penznemValtas`, `nyelviReview`, `orokoltJelzesek`, `nemetNev`, `paciensDuplikacio` és `tomegesAr` tesztcsaládok több valódi üzleti különbséget választanak szét: hiányzó ár/0, kézi/örökölt érték, igazolt/igazolatlan nyelv, eltérő kerekítési esetek.
- **Hibainjektálás valódi tárolóútvonalon.** A `DemoStorage` részleges írást és párhuzamos mentést is vizsgál; több UI-teszt ellenőrzi, hogy íráshibánál megmarad a bevitt adat és nem jelenik meg sikerjelzés.
- **Érdemi integrációs esetek.** Az `App.test.tsx` létrehozás–véglegesítés–új verzió és unmount–újramount piszkozat-visszaállítás útjai valódi összekötési hibákat fognak meg a helyettesített PDF-határig.
- **Jó szintválasztásra már van minta.** A `VeglegesitesChecklist.test.tsx` a megkapott diagnózis megjelenítését ellenőrzi, a domain-teszt a diagnózis képzését. A `NumberField.test.tsx` a bevitel saját interakcióit teszteli. Ezekből érdemes szabályt csinálni.
- **Független elvárt értékekre is van tudatos példa.** A `planCopy.test.ts` szándékosan eltérő forrás-orvost és alapértelmezett orvost, illetve hamis mentett összesítőt használ. A `PenzugyiOsszesites.test.tsx` eltérő mentett és újraszámolható összegekkel bizonyítja, melyik jelenik meg.
- **Nincs nagyméretű snapshot-fájlokra épített vak jóváhagyási rutin.** A vizsgált készlet túlnyomórészt konkrét értékeket és viselkedést állít. A „snapshot” a domainben mentett pillanatképet jelent, nem Jest/Vitest snapshotot.
- **A workflow-tesztek valódi ideiglenes Git-repókkal dolgoznak.** A kapu helyettesítése itt helyes határválasztás: a teszt a commit/push koreográfiáját vizsgálja, nem akar minden esetben újra alkalmazást buildelni.

## 4. Megállapítások

### F01 — Súlyos: a PDF és a mentett JSON közös szerződését nem bizonyítja az automatikus készlet

**Bizonyíték:** [App.test.tsx:20](../../app/src/App.test.tsx#L20), [PreviewPage.test.tsx:16](../../app/src/pages/PreviewPage.test.tsx#L16) és [PreviewPage.pdfHiba.test.tsx:28](../../app/src/pages/PreviewPage.pdfHiba.test.tsx#L28) állandó vagy kézzel vezérelt `usePDF`-választ adnak, `%PDF-fake` tartalommal. A mock nem rendereli a neki átadott dokumentumot. A [TervDocument.test.tsx:41](../../app/src/pdf/TervDocument.test.tsx#L41) külön teszteli a dokumentumot, de a PDF-primitíveket DOM-elemekre cseréli, az `Image` pedig `null`.

Ennek **már megfigyelt termékhibához kapcsolódó bizonyítéka** a [pdf-verzioszam-mentett-verzio](../../backlog/idea/pdf-verzioszam-mentett-verzio.md) nyitott tétel: a mentett JSON v1, a hozzá tartozó PDF v0 lehet. A jelenlegi forrás alátámasztja a leírt mechanizmust: [PreviewPage.tsx:355](../../app/src/pages/PreviewPage.tsx#L355) a meglévő blob bájtjait menti, [DemoStorage.ts:518](../../app/src/storage/DemoStorage.ts#L518) ezután oszt verziót, a [PDF-fejléc](../../app/src/pdf/tervDocument/Chrome.tsx#L38) a kapott terv verzióját írja ki. A review ezt nem reprodukálta új böngészős futással; a meglévő hibajelentést és a változatlan kódutat ellenőrizte.

**Miért módszertani hiba:** külön-külön jól tesztelt rétegek együtt továbbra is hibás eredményt adhatnak. Az `App.test.tsx` „végponttól végpontig” megnevezése így túl tág: alkalmazás-integrációs teszt helyettesített PDF-határral.

**Javaslat:** néhány valódi rendereléses, mentés utáni PDF–JSON szerződésteszt. Ellenőrizze ugyanazon archivált verzió tervazonosítóját, verzióját, páciensnevét, pénznemét és fizetendőjét. V1 létrehozása és V2 hozzáfűzése is szerepeljen. Ne csak a PDF-fejléc létezését vagy a fájl `%PDF` kezdetét vizsgálja. A részletes szövegfeltételek maradhatnak a gyors DOM-tesztekben.

**Dedup:** a termékhiba már backlogban van; nem új ötletként felvenni. Az összehasonlító teszt a javítás elfogadási bizonyítéka legyen.

### F02 — Súlyos: a betöltési validáció esetmátrixa lényegesen gyengébb a határ fontosságánál

**Bizonyíték:** nincs közvetlen `validate.test.ts`. A [DemoStorage.test.ts:323](../../app/src/storage/DemoStorage.test.ts#L323) és [DemoDraftStorage.test.ts:94](../../app/src/storage/DemoDraftStorage.test.ts#L94) ugyanazzal a többszörösen hibás sorral tesztel: `mennyiseg: 'sok'`, miközben mindkét ármező hiányzik. Ha a mennyiség ellenőrzése véletlenül eltűnne, az ármező hiánya miatt a teszt továbbra is hibát kapna. Nem derül ki, melyik guard él.

A [DemoStorage.test.ts:449](../../app/src/storage/DemoStorage.test.ts#L449) neve szerkezetileg hibás törzsadatot ígér, de a bemenet `not valid json {{{`. Ez a JSON-parsert ellenőrzi, nem a törzsadat szerkezeti validálását. A sémaverzió-elutasításnak van jó terv-, draft- és törzsadattesztje; az árlista/beállítás betöltési mátrixa nincs ugyanilyen részletességgel védve.

**További helyi bizonyíték:** a változatlan [validate.ts](../../app/src/domain/validate.ts) `assertPlanShape` és `assertPriceListShape` függvénye egyaránt elfogadott `10.5` pénzértéket a memóriában futtatott próbában. A guard véges számot ellenőriz, nem egészet. Ez nem hipotetikus coverage-hiány; a „pénz egész” invariáns ezen a határon ténylegesen nincs kikényszerítve. A próba nem vizsgálta végig az ilyen adat teljes UI/PDF útját.

**Javaslat:** érvényes minimális fixture-ből induló, egyetlen mezőt elrontó táblázatos tesztek. Külön: `null`, hibás típus, hiányzó tömb/mező, ismeretlen ártípus, nem véges szám a közvetlen guardon, tört pénzérték a JSON-betöltési határon. Minden fájltípushoz egy-egy storage-integráció igazolja, hogy tényleg meghívja a validátort. A szándékosan megengedett régi/opcionális mezőhiányok pozitív kontrollt kapjanak; ne legyen automatikus sémaszigorítás termékdöntés nélkül.

**Korábbi review pontosítása:** a [2026-08-25-i architektúra-review](2026-08-25-arch-react-review.md) teljes közvetett lefedetlenséget is állított. Ezt a jelenlegi készletre nem lehet kijelenteni: közvetett negatív tesztek vannak, csak szűkek és részben rosszul izoláltak. A `branded-minor-penztipus` és `sema-migracios-keret` már létező ötletek; a futásidejű bemenetvédelem nem helyettesíthető pusztán TypeScript-branded típussal.

### F03 — Súlyos: több invariáns tesztneve erősebb, mint a tényleges assertion

| Konkrét teszt | Mit bizonyít ma? | Hogyan kellene erősíteni? |
|---|---|---|
| [DemoStorage.test.ts:88](../../app/src/storage/DemoStorage.test.ts#L88), „appends v2 without touching v1” | A korábbi tervben `verzio === 1`, és két verzió listázható | V1 teljes JSON-tartalma és PDF-bájtjai mentés előtt/után azonosak; V2 tartalma szándékosan eltér |
| [planCopy.test.ts:101](../../app/src/domain/planCopy.test.ts#L101), „nem mutálja a forrás tervet” | A páciensobjektum referenciája változatlan | Mély másolattal összevetés vagy fagyasztott bemenet; azonos referencia mellett a mezői még módosulhatnak |
| [ItemPicker.test.tsx:234](../../app/src/pages/planEditor/ItemPicker.test.tsx#L234), név-/kategóriatalálat nem duplikálódik | Olyan esetet használ, amelyben a kategórianév nem is illeszkedik | Ugyanaz a tétel egyszerre legyen név- és kategóriatalálat; a felkínált ID egyszer szerepeljen |
| [useMentesJelzo.test.tsx:147](../../app/src/components/useMentesJelzo.test.tsx#L147), unmount-takarítás | Nem történik `console.error` | Az időzítő megszűnését ellenőrizni, pl. kontrollált timer-darabszámmal |
| [TervDocument.test.tsx:757](../../app/src/pdf/TervDocument.test.tsx#L757), „teljes szélességben” | Két szöveg sorrendjét ellenőrzi | A névből kivenni a geometriai ígéretet; a szélességet renderelt PDF-en bizonyítani |
| [seed/plans.test.ts:48](../../app/src/storage/seed/plans.test.ts#L48), „minden demó sor hivatkozik…” | Az előzetesen szűrt összes sor száma nagyobb nullánál | Pontos név, vagy valóban minden releváns sor ellenőrzése; az egyedi sor jogszerű kivétel |

A timer-példa különösen félrevezető: a React 18 óta nincs általános figyelmeztetés unmount utáni `setState`-re, tehát a konzol csendje nem bizonyít takarítást. [React hivatalos változásleírás](https://react.dev/blog/2022/03/08/react-18-upgrade-guide#other-notable-changes).

Ezeknél nem új, a régi mellé tett teszt az első lépés. **A meglévő bizonyítékot kell megjavítani.** A „milyen hibás implementáció mellett maradna ez zöld?” kérdés legyen kötelező önellenőrzés az invariánsokat védő teszteknél. Az itt felsorolt ellenpéldák assertion-elemzésből származnak; nem futtatott mutációs kampány eredményei.

### F04 — Súlyos: a tárolási hibatesztek nem fedik a teljes műveleti szerződést

A [savePlan implementáció](../../app/src/storage/DemoStorage.ts#L539) három kulcsot ír: terv, PDF, páciensindex. A részleges írás tesztje csak a második írás hibáját injektálja, új pácienssel. Ez jó kezdés, de nem bizonyítja a harmadik írás hibájánál a rollbacket, meglévő páciens indexének megmaradását, korábbi verziók épségét vagy azt, hogy a hibás művelet után a sorosító lánc tovább használható.

A `createPatient` és `savePatientData` szintén több írást végez; a jelenlegi tesztek elsősorban a sikeres kimenetet és UI-hibajelzést vizsgálják. A [PlanStorage](../../app/src/storage/PlanStorage.ts) jövőbeli implementációváltásához nincs újrafuttatható, implementációfüggetlen szerződésteszt-csomag. A `DemoStorage` belső kulcsainak vizsgálata a demóadapter tesztjében helyes, de nem lehet a leendő fájlrendszer-tároló teljes elfogadási bizonyítéka.

**Javaslat:** a mentés szerződése mondja ki a hibánként elvárt megmaradó állapotot. Kevés, célzott eset: első/második/harmadik írás hibája; meglévő páciens; sikeres újrapróbálás; párhuzamos mentés; régi verziók teljes megőrzése. A közös szerződés adapterfüggetlen viselkedést vizsgáljon, a kvóta-/fájlrendszer-specifikus hibainjektálás külön adaptertesztben maradjon. Az Electron valós fájlrendszer-, jogosultság- és megszakítási eseteit a 2. fázis előtt kell hozzáadni, nem most minden leendő platformra előre implementálni.

### F05 — Közepes: a költség néhány túl nagy UI-tesztcsaládba koncentrálódik

| Tesztfájl | Eset | Mért fájlfutási idő |
|---|---:|---:|
| `PriceListAdminPage.test.tsx` | 52 | 113,12 s |
| `PreviewPage.test.tsx` | 32 | 75,09 s |
| `PatientPage.test.tsx` | 49 | 44,94 s |
| `PlanEditorPage.sorok.test.tsx` | 41 | 42,68 s |
| `demo/OsszesTervSection.test.tsx` | 43 | 40,24 s |
| `SettingsPage.test.tsx` | 36 | 32,34 s |

Az árlista-admin fájl 52 esetéhez jellemzően teljes, 118 tételes árlista és teljes provider-lánc épül fel. A [fixture](../../app/src/pages/PriceListAdminPage.test.tsx#L83) minden tétel EUR-árát törli, majd a tesztek sokszor az összes sort renderelik egyetlen mező vagy megerősítés vizsgálatához. A `PreviewPage.test.tsx` 1956 sorban sokszor az `App` első képernyőjéről indul ugyanazon véglegesítési szabály előkészítéséhez.

**Javaslat:** normál UI-teszthez 2–4 tételes, célzott árlista; teljes seed csak adat-integritásra és néhány smoke/nagyadat-esetre. A véglegesítés legtöbb tesztje célállapotból induljon, a szükséges valódi providerekkel; a páciens létrehozását és a tételfelvitelt csak azok a flow-tesztek járják végig, amelyek ezt az összekötést vállalják.

A fájlok puszta szétvágása javíthatja a párhuzamos ütemezést, de változatlanul sok munkát végez, és több memóriát kérhet. Először a fölösleges előkészítést kell csökkenteni, majd ugyanazon környezetben újramérni. A pénzmező billentyűzet-/blur-/Enter-viselkedését vizsgáló teszteket nem szabad általánosan `fireEvent.change`-re cserélni a gyorsulásért.

### F06 — Közepes: van valódi redundancia, de nem minden átfedés törlendő

**Konkrét összevonási/törlési jelöltek:**

| Hely | Értékelés |
|---|---|
| [money.test.ts:12](../../app/src/domain/money.test.ts#L12) és [50](../../app/src/domain/money.test.ts#L50) | Ugyanaz a bemenet, ugyanaz a hívás, ugyanaz az elvárt kimenet. Tényleges duplikáció; a HU/DE × HUF/EUR mátrixban elég egyszer |
| [penznemValtas.test.ts:95](../../app/src/domain/penznemValtas.test.ts#L95) FIX árlista-visszatöltés és a „nincs automatikus FX” eset | Ugyanazt a 45000→15000 útvonalat ismétli; a külön invariánsnevet megőrizve összevonható, az anchor frissítésével |
| [planCopy.test.ts](../../app/src/domain/planCopy.test.ts), „az orvos mindig a globális default…” és „a default akkor is érvényesül, ha … MÉG AKTÍV” | Mindkét fixture-ben aktív a forrás-orvos, ugyanazok az adatok. Összevonható vagy a másodiknak ténylegesen eltérő eset kell |
| [DemoStorage.test.ts:753](../../app/src/storage/DemoStorage.test.ts#L753), `paths re-export sanity` | Csak az importált osztály `.name`-jét ellenőrzi. A storage ütközési útját nem hívja. Önálló viselkedésvédelemként elhagyható |
| [TervReszleteiPage.test.tsx:432](../../app/src/pages/TervReszleteiPage.test.tsx#L432) | A teszt-helper regexének kényelmét védi egy másik oldalon. A helper lekérdezését kell jól szűkíteni; ez önmagában nem termékkövetelmény |

**Áthelyezendő lefedettség:** a `PatientPlanChains` közös megjelenítési szabályainak nagy része a `demo/OsszesTervSection.test.tsx` alatt él, miközben a `PatientDetailPage.test.tsx` is vizsgálja a láncok alapnyitottságát. Érdemes a részletes közös viselkedést a komponens saját tesztjébe szervezni; a két oldalon a megfelelő páciens, beágyazási mód, navigáció és állapot-visszaállítás összekötését megtartani.

**Ami jogos átfedés:** a domain előleg-túllépése, a checklist hard besorolása, az UI véglegesítésgombjának tiltása és a PDF „—” megjelenítése külön hibamódot fed. Ugyanígy a `NavGuardContext`, a tab-váltás és a workflow-lépéselhagyás nem azonos belépési út. Ezek összevonása védelemvesztés lenne.

A deduplikáció egysége: **azonos előfeltétel + művelet + megfigyelt eredmény + réteghatár**. Azonos tesztnév, függvénynév vagy hasonló setup nem elég a törléshez. Whitespace-normalizálás is adhat téves találatot, ha épp a string eleji/végi szóköz a vizsgált eset.

### F07 — Közepes: a fixture-ek egyszerre túl nagyok és túl erősen kötődnek a production seedhez

A `TestProviders` teljes alkalmazásállapotot és `DemoStorage`-ot ad, a [StorageProvider](../../app/src/storage/StorageContext.tsx#L52) pedig maga hozza létre a tárolót. Emiatt a célzott lapteszt is seedelésre, konkrét localStorage-kulcsokra és több, az adott esethez nem tartozó providerre támaszkodik. A test-wrapperben a lépésőr viszont **mindig továbbengedő helyettesítés** — így a wrapper használata önmagában nem jelent valódi workflow-integrációt. Ez dokumentált, de a helper neve nem teszi láthatóvá.

Konkrét kötődések: `118 / 118` számlálók az adminban; `t041` és konkrét ár a [szerkesztő-fixture-ben](../../app/src/pages/planEditor/testFixtures.tsx#L72); `Nagy Éva` konkrét láncszerkezete sok listatesztben. Egy demóadat-módosítás emiatt üzleti szabálytól független teszteket is elronthat.

Másik végletként a `Plan`, `Sor`, `Paciens` literáljai sok fájlban ismétlődnek. Szükség van néhány kis fixture-builderre, **de nem minden adatot elrejtő univerzális factoryra**. A teszt lényegét adó pénz, státusz, nyelv, verzió és ID maradjon a tesztben látható. Hibás bemenet vizsgálatánál a builder legyen alapból érvényes; a hibát helyben kell hozzáadni.

Production helper használható előkészítésre, ha nem éppen azt teszteljük. Elvárt számot azonban ne ugyanazzal a számolófüggvénnyel állítsunk elő, amelyet a teszt bizonyítani akar. A roundtrip-teszt hasznos, de önmagában két egymással összhangban hibás átalakítást is elfogadhat; maradjon mellette konkrét, független példa.

### F08 — Közepes: az aszinkron sorrend és a takarítás védelme egyenetlen

**Erős részek:** `AppState.test.tsx` két, egy tickben indított updater hatását ellenőrzi; a tárolóteszt párhuzamos mentést vizsgál; a `useMentesJelzo` kontrollált promise-t és fake timert is használ.

**Gyenge részek:** a három PDF-hook mockban nincs tesztelt `loading: true` átmenet. A PDF-hibateszt két külön induló állapotot vizsgál, nem a siker → új render → hiba → újrapróbálás → friss siker teljes állapotváltását. Az `updatePdf` hívásszámának növekedése nem bizonyítja, hogy az újrapróbálás után friss PDF készült. A [usePlanPdfObjectUrl](../../app/src/storage/usePlanPdfObjectUrl.ts) későn visszaérkező betöltést kezel, de a laptesztek nem kényszerítik ki azt, hogy A verzió kérése B után fejeződjön be.

Sok hibainjektálás végén kézzel fut `vi.restoreAllMocks()`. Ha az előtte álló assertion elbukik, a helyreállítás kimarad; a következő teszt másodlagos hibája elrejtheti az első okot. A `useListStateMemory.test.tsx` `Object.defineProperty`-vel változtat `scrollY`-t, amelyre a spy-helyreállítás önmagában nem megoldás.

**Javaslat:** célzott, kézzel feloldható promise-okkal tesztelni a betöltési sorrendet, elnavigálást és retry-t; a tisztítást `afterEach`/`finally` garantálja. Óraérzékeny esetekben rögzített idő, dátumlogikánál néhány helyi éjfél-/DST-/szökőnap-határeset. Ne kerüljön minden UI-teszt fake timer alá: a billentyűzetes teszteknek ez külön integrációs költség lehet.

Egy sikeres futás alapján nem állítok általános flakiness-problémát. Ezek konkrét determinisztikussági és diagnosztikai kockázatok.

### F09 — Közepes: az élő működésleírás részben történeti naplóvá vált

A tesztnevekben és `describe` blokkokban sok `backlog-…`, „N. tétel”, „korábbi viselkedés”, „ma” és „változatlan” fordulat maradt. Például a `totals.test.ts` több csoportja így szerveződik. A törölt terv nélkül ezek egyre kevésbé mondják meg, **mi a jelenlegi szabály és mikor alkalmazható**.

A [root CLAUDE.md](../../CLAUDE.md) mentett pillanatképre mutató anchorja a `totals.test.ts` nem-mutáló összehasonlítási tesztjére mutat. Az a teszt hasznos, de nincs benne élő árlista-változtatás vagy mentett dokumentum újranyitása; a teljes, hivatkozott termékinvariánsnak csak egy részét bizonyítja.

**Javaslat:** viselkedés szerint szervezett csoportok, rövid előfeltétel–akció–eredmény nevű esetek. A változás története a Gitben maradjon. A kötelező invariáns-anchor a valóban megfelelő réteghatárra mutasson. Ne legyen minden teszt átnevezéséből külön takarítási projekt; az érintett tesztcsalád refaktorakor rendezhető.

A teszt nem teszi automatikusan helyessé a leírt működést. Ha egy regresszió elrontja a kimenetet, az agent nem írhatja át pusztán a tényleges új értékre az elvárást. Előbb el kell dönteni, hogy szándékos termékváltozás, hibás teszt vagy hibás kód történt.

### F10 — Közepes: a coverage és a tesztminőség jelenleg nem mérhető rendszeresen

A [vite.config.ts](../../app/vite.config.ts) nem határoz meg coverage-beállítást, az [app/package.json](../../app/package.json) nem ad coverage-parancsot vagy coverage-provider csomagot. A zöld suite és a nagy esetszám ezért nem mondja meg, mely production ágak maradnak ki.

Nem javaslok teljes projektet kötelező 100%-ra hajtó küszöböt. Először egy diagnosztikai mérés kell, amely a **nem importált production fájlokat is tartalmazza**. A Vitest alapértelmezett coverage-listája csak a futásban importált fájlokat mutatja, ezért explicit `include` szükséges. [Vitest coverage-dokumentáció](https://vitest.dev/guide/coverage.html).

Javasolt követés: kritikus modulok ágai, leglassabb fájlok, elsőre bukó/újrafutásra zöld esetek, és a fontos tesztek által megfogott szándékos hibák. A mutációs ellenőrzés később kis körben — `totals`, validáció, verzióőrzés, véglegesítési besorolás — lehet hasznos. Ne induljon egész repós mutációs CI vagy tesztdarabszám-cél.

Az F03 példái mutatják, miért nem elég önmagában a coverage: egy sor lefuthat úgy is, hogy a teszt rossz tulajdonságot ellenőriz.

### F11 — Közepes: a helyi és CI-kapu, illetve a tesztőrök szerződése eltér

A CI futtatja a `test:workflow` parancsot, de a [workflow/lib.mjs `gate()`](../../scripts/workflow/lib.mjs#L53) és a `/implement` négyes kapuja csak build/lint/test/docs-check. Így a workflow-scriptek saját regressziója a helyi „teljes kapu” után csak a push CI-jában derülhet ki. **A kapulisták tulajdonosát és azonosságát rendezni kell.**

A [docs-check tesztfelismerése](../../scripts/docs-check.mjs#L84) csak `app/src/**/*.test.ts(x)` fájlokra vonatkozik; a skip/only regex az egyszerű `.skip(` és `.only(` alakot ismeri. A `.skip.each`, `.only.each`, a hívás előtti whitespace és a `scripts/*.test.mjs` nincs azonos védelem alatt. A jelenlegi keresés nem talált aktív skip/only használatot; ez az őr hiánya, nem jelenlegi kihagyott tesztek állítása.

A docs-check saját negatív fixture-tesztje hiányzik, a workflow-tesztek pedig szándékosan helyettesítik a kaput, így azt nem vizsgálják. Egy jól működő szabályzat gépi védelmét is minimális elfogadott/elutasított példákkal kell tesztelni. Ha új tesztfájlnév kerül bevezetésre, pl. `*.integration.test.tsx` vagy `e2e/*.spec.ts`, a felismerés és az őr hatókörét együtt kell hozzáigazítani.

A CI Node-verziója `lts/*`, a helyi futás most v26.4.0 volt. A [test-setup](../../app/src/test-setup.ts) maga is dokumentál korábbi Node/localStorage-különbséget. Célszerű egy reprodukálható alapverziót megadni; több verzió csak tudatos kompatibilitási ellenőrzésként fusson.

### F12 — Közepes: a vizuális és böngészős szint létezik, de kézi eljárásként, részben elavult hívási renddel

A `/manual-checks` jó és konkrét eljárás. Nem helyes azt állítani, hogy a PDF/canvas/CSS réteget soha nem ellenőrzik: a [2026-08-10-i böngészős jelentés](2026-08-10-browser-validation.md) valódi PDF-bájtokat és vizuális hibát is tárgyal, többek között a SemiBold-font problémáját.

Viszont ez nem CI-ban ismétlődő védelem. A [manual-checks skill](../../.claude/skills/manual-checks/SKILL.md) több helyen még a `/finish` alatti futásról beszél, miközben a [jelenlegi implement skill](../../.claude/skills/implement/SKILL.md) 5b lépése már az átadás előtt futtatja. A „mielőtt megmutatod: all” és a tervhez kötött szeletválasztás viszonyát is egyértelműsíteni kell.

**Javaslat:** a kézi szakmai/olvashatósági ellenőrzés megmarad, néhány ismételhető, kritikus technikai állítást pedig automatizált böngészős/PDF-smoke teszt vegyen át. Ez jövőbeli módszertani változtatás, nem a jelenlegi „csak kézzel indítva” szabály csendes felülírása. Az izolált Chrome-profil és a kizárólag szintetikus adat változatlan követelmény.

## 5. Javasolt tesztelési koncepció

### Alapelv: egy részletes szabálymátrix, több célzott összekötési bizonyíték

Egy szabály összes értékkombinációját azon a **legkisebb határon** teszteljük, ahol az üzleti jelentése megmarad. Magasabb szinten azt vizsgáljuk, hogy a komponensek tényleg ezt a szabályt használják, a helyes adatot adják át, és a felhasználó helyes kimenetet kap.

Ez nem kötelező unit/integráció/E2E százalékarány. A projekt sok tiszta domain-logikája indokolja az olcsó unit-tesztek nagy számát; a kliensoldali tárolás és a szerződéses PDF indokol néhány erős integrációs és valódi rendereléses tesztet. A Testing Library felhasználóhoz közeli interakciókra építő elve ehhez jól illeszkedik. [Testing Library alapelvek](https://testing-library.com/docs/guiding-principles/).

| Szint | Mit bizonyítson? | Elsődleges hely / környezet | Mi nem tartozik ide? |
|---|---|---|---|
| Statikus kapu | Típushelyesség, tiltott import/API, dokumentációs hivatkozás, tesztfuttatás szabálya | TypeScript, oxlint, docs-check; saját kis őrtesztek | Típussal már kizárt alakok újraellenőrzése minden UI-tesztben |
| Domain-egység | Számolás, döntési táblák, transzformációk, invariánsok és határesetek | Production modul melletti `.test.ts`; tiszta moduloknál Node | DOM, navigáció, teljes demóseed |
| Adapter-/szerződés-integráció | Írás/olvasás, verziók, snapshot, hibánál megmaradó állapot | `storage/`; közös szerződés + adapterenkénti hibatesztek | A domain teljes kombinációs mátrixa |
| Komponens-/hook-viselkedés | Bevitel, fókuszátadás, állapotváltás, callback, megjelenítés | Komponens melletti `.test.tsx`, RTL/jsdom; kis fixture | Valódi geometria, fontbeágyazás, letöltött PDF minősége |
| Alkalmazás-integráció | Valódi providerek/router/tároló összekötése; guard, autosave, véglegesítés | Néhány célzott út, egyértelmű nevű tesztcsalád | Minden variáns megismétlése a kezdőlaptól |
| Valódi böngésző és PDF | Production build, CSS/asset/CSP, valódi PDF és mentés egyezése, billentyűzetes fő ciklus | Kevés izolált Chromium-smoke; külön PDF-artefaktumvizsgálat | Minden validációs input E2E-ben |
| Kézi szakmai/UX | Olvashatóság, nyomtatvány elrendezése, fogorvosi munkafolyamat, szakmai/jogi tartalom megítélése | Doki ellenőrzése + kijelölt manual-check szelet | Automatizálható számtani állítások kézi ismételgetése |

A Node/jsdom szétválasztás ne vak könyvtárglob legyen: `torzsadatBetoltes.test.ts` például tároló-integráció. A könyvtárstruktúra nem helyettesíti a függőségek vizsgálatát.

### Konkrét lefedettségi felelősség a jelenlegi alkalmazásban

| Szabály / flow | Részletes esetek tulajdonosa | Magasabb szinten megtartandó bizonyíték |
|---|---|---|
| Ár, darabszám, sor-/fázis-/tervösszeg | `domain/totals.test.ts` | Egy többfázisos, többdarabos UI–mentés–PDF példa, kézzel kiszámított elvárással |
| EUR-cent, HU/DE megjelenítés | `money.test.ts`; bevitelhez `NumberField.test.tsx` | Egy valós pénzmező bekötése; PDF-ben a keresztezett nyelv/pénznem kombináció |
| Pénznemváltás, nincs FX | `penznemValtas.test.ts` | Egy oda-vissza UI-váltás és mentés; ne minden numerikus variáns |
| Német név, kézi nyelvi review | `nemetNev`, `nyelviReview`, majd `veglegesitesOr` besorolása | Egy valódi blokkolás–kézi feloldás flow; a fordítás szakmai minőségét gépi regex nem igazolja |
| Hiányzó adat, hard/soft/info | Az elemi feltételek domain-tesztjei; a besorolás `veglegesitesOr` | Checklist megjelenítés; tiltott gombnál nincs mentés; javítás után folytatható |
| Append-only, sérült/újabb JSON | Storage-szerződés + külön validátor-mátrix | Egy V1→V2 flow, visszaolvasott JSON és PDF teljes V1-megőrzésével |
| Mentett vs. újraszámolt összesítő | `totals`, `PenzugyiOsszesites` | Mentett verzió megnyitása megváltozott élő árlista mellett |
| Placeholder és kedvezmény a PDF-en | `templates` + `TervDocument` tartalomteszt | Valódi PDF-ben is hiányzik a tiltott szöveg/oldal; a kiadott mód a JSON-ban egyezik |
| Keresés | `search`, `arlistaSzures`, `paciensKereses`, `paciensDuplikacio` | Az egyes eltérő keresőkomponensek input/eredmény/kiválasztás összekötése |
| Fogtérkép | `teeth`, `toothVisual`, `toothChartSvg`; interakció a `DentalChart`-ban | Egy alkalmazásbeli sorfelvitel; valódi canvas→PNG→PDF kép és billentyűzetes fókusz |
| Piszkozat, elvetés, visszatérés | `piszkozat`, `AppState`, guardok és draft-storage | Újramount/reload, külön navigációs belépési utak, megerősítés és elutasítás |
| Demóadat | `storage/seed/*.test.ts` | Egy friss indulási smoke; ne minden domain- és komponens-fixture innen származzon |

**Példa a pénzügyi bővítésre:** a `totals.test.ts` mai közös fixture-je egy fázis egy sorát, `mennyiseg: 1`-gyel használja. A részletes összesítési mátrixhoz kell eltérő mennyiségű több sor, több fázis, üres aggregátum, sor- és tervszintű eltérés együtt. Ez nem teszt minden szorzó helperhez külön: a nyilvános összesítő függvényeken néhány független, kézzel számolt eset elég.

### Minimális böngészős/PDF-csomag

Kezdésnek 3–5 kis forgatókönyv indokolt, nem a teljes RTL-készlet átemelése:

1. Új terv → tényleges PDF → archivált V1 → új V2; PDF–JSON metaadat- és összegazonosság, V1 érintetlen.
2. Három egymást követő tételfelvitel kizárólag billentyűzettel, valódi CSS mellett; az input ürül és a fókusz megmarad.
3. Placeholder-nyilatkozat és sávos ár: a valódi PDF-ből hiányzik az aláírásoldal, a csillag és lábjegyzet megvan; a kedvezmény nem jelenik meg.
4. Hosszú, többoldalas terv magyar ékezetekkel és fogtérképpel; szövegkivonat/metaadat + néhány renderelt oldal vizuális ellenőrzése.
5. Mentetlen piszkozat tényleges böngésző-reload után folytatható.

Rögzített, szintetikus adatok, kontrollált idő és assetek, saját böngészőkörnyezet szükséges. A production buildet kell kiszolgálni, hogy a base path, CSP és betöltött fontok is bekerüljenek a vizsgálatba. A Playwright izolációs és felhasználó által megfigyelhető kimeneteket előnyben részesítő elvei alkalmazhatók. [Playwright best practices](https://playwright.dev/docs/best-practices).

PDF-nél ne a teljes bináris fájl hash-e legyen az alapelvárás: a renderelő metaadatai ezt törékennyé tehetik. Tartalmi/metaadat-ellenőrzés és célzott vizuális összehasonlítás kell. **Már mentett V1 változatlanságánál viszont a mentés előtti/utáni azonos bájtok ellenőrzése helyes**, mert ott nem két új render determinisztikusságát kérjük számon.

## 6. Agenteknek szánt döntési rend — javaslat

Ez rövid, tartós módszertani szabály legyen, ne új funkcionális specifikáció. Egyetlen helyen éljen — például `docs/TESTING.md` —, a gyökér `CLAUDE.md` rövid pointerével. Ne másolódjon minden nested contextbe és skillbe. A 101 fájlos leltár és a változó tesztszám maradjon review-artefaktum.

### Új teszt írása előtt

1. Mondd ki az egyetlen védeni kívánt megfigyelhető állítást és a kockázatát.
2. Keresd meg a már létező, ugyanazt vagy az összekötését bizonyító tesztet.
3. Válassz: meglévő teszt módosítása, új eset ugyanabba a családba, új réteghatár-teszt, vagy indokoltan nincs új automatikus teszt.
4. Válaszd ki a legkisebb megfelelő szintet. Ne legyen alapértelmezett elvárás „új kódhoz új tesztfájl”.
5. Határozd meg a független elvárt eredményt. Negatív tesztben egyetlen releváns feltétel legyen hibás.

### Írás és önellenőrzés

- Bugfixnél a regressziós eset a javítás nélkül a megfelelő okból bukjon, majd a javítással menjen át.
- A név minden állításához legyen megfigyelés. „Nem mutál” → állapotazonosság; „nem ment” → tárolási mellékhatás hiánya; „elmentve” → visszaolvasott adat; „PDF” → tisztázott tartalomteszt vagy valódi dokumentum.
- Az értékmátrix legyen rövid és névvel ellátott `it.each`, ha ugyanazt a szabályt vizsgálja. Több külön történetet ne rejtsünk egy több száz soros tesztbe.
- Saját üzleti függvényt ne mockoljunk azon a szinten, amelyiknek annak bekötését kell bizonyítania. Mock a világos külső/technikai határon legyen, leírt korláttal.
- Szemantikus lekérdezések és megfelelően szűkített `within` legyen az alap; DOM-osztályt csak akkor állítsunk, ha maga a strukturális szerződés a tárgy. A szerkezet megléte nem a pixelek helyessége.
- Takarítás a sikertelen teszt után is történjen meg. Időzítésre ne önkényes sleep vagy ismételt timeout-emelés legyen az első megoldás.
- Törlés/összevonás előtt írd le, melyik megmaradó teszt őrzi az eredeti esetet és réteghatárt. Kötelező doc-anchor átnevezésekor a pointer is frissüljön.
- Ha kis, tisztán megjelenítési változásra a meglévő védelem és a megfelelő kézi/vizuális ellenőrzés elegendő, ne készüljön csak darabszámot növelő teszt. Szerződéses PDF-szövegnél viszont a konkrét szó szerinti elvárás indokolt.

### Beillesztés a meglévő workflow-ba

A `/plan` `Verification` része a viselkedés mellé csak röviden nevezze meg a szintet és a meglévő tesztcsaládot. Ez nem függvényszignatúra-tervezés, nem külön működési specifikáció. Példa:

> Tároló-integráció — V2 mentése után V1 JSON-ja és PDF-je azonos marad; a meglévő DemoStorage verzióteszt erősítése. Valódi PDF — a kiadott V2 fejléce egyezik a tárolt verzióval.

A `/implement` diff-önellenőrzésében jelenjen meg: milyen új hibamódot fog a változtatott teszt, és mely meglévő esetet váltotta ki. Refaktornál alapból a meglévő viselkedési teszteket futtassa; új belső helperhez ne kérjen automatikusan új, a production szerkezetét másoló tesztet.

A `/finish` a meglévő teljes kaput kérje számon, a teszttörlések lefedettségi indokával. Ne nyíljon új, külön jóváhagyási kör minden tesztre. A módszertan technikai rutindöntéseket ad az agentnek; a termékszándék megváltoztatása továbbra is a doki döntése.

## 7. Javasolt rendezési sorrend és készfeltételek

Az alábbi sorrend technikai ajánlás, nem backlog-prioritások átírása. Ne induljon egyszerre minden teszt átnevezése és a teljes fixture-rendszer cseréje.

| Lépés | Konkrét eredmény | Akkor kész, ha… |
|---|---|---|
| 1. Tesztelési döntési rend | Rövid szabályzat, egy pointer, a plan/implement ellenőrzőpontjai | Új munka esetén látható a szintválasztás és a meglévő teszt keresése; a „nincs új teszt” is indokolható |
| 2. Gyenge nagy kockázatú bizonyítékok javítása | F01–F04: PDF–JSON, validáció, V1-megőrzés, részleges írás | A célzott hibás változat vagy hibás bemenet a megfelelő okból elbukik; a kontrolleset zöld |
| 3. Kicsi pilot az árlista-adminon | Minimális fixture, rövidebb setup, releváns komponenshatár | Ugyanazok a vállalt viselkedések védettek; előtte/utána futásidő mért; nincs gyengített assertion |
| 4. Tesztcsaládok felelősségének rendezése | Közös láncmegjelenítés, véglegesítési mátrix, ismert duplikációk | Minden törölt esetnek megnevezett megmaradó bizonyítéka van, a valódi összekötési tesztek megmaradnak |
| 5. Kapu és környezet egységesítése | Workflow-tesztek helyi kapuja, skip/only-őr, reprodukálható Node | Ugyanaz a kötelező csomag fut helyben és CI-ban; negatív őr-fixture is bukik |
| 6. Tartós mérések | Diagnosztikai coverage, lassúteszt-lista; később célzott mutáció | A mérés konkrét hiányt vagy költséget tesz láthatóvá, nem új tesztdarabszám-kvótát gyárt |

Már felvett kapcsolódó tételek: [PDF-verziószám](../../backlog/idea/pdf-verzioszam-mentett-verzio.md), [Minor pénztípus](../../backlog/idea/branded-minor-penztipus.md), [sémamigrációs keret](../../backlog/idea/sema-migracios-keret.md). A módszertan rendezése ezekkel egyeztetendő, de nem szükséges minden tesztjavítást az Electron-migrációig halasztani. A review nem hozott létre backlog-tételt.

Ha a doki külön tételként szeretné továbbvinni a tesztminőség javítását, az F02–F04 súlyos megállapításaihoz használható bemenet:

```text
/idea kritikus-tesztek-bizonyitoereje docs/reviews/2026-09-05-tesztelesi-modszertan-review.md
```

Dedup: F01 termékhibája már felvett tétel; az új ötlet a tesztek bizonyítóerejére és a tárolási hibamátrixra korlátozódjon. F02-nél a pénztípus és sémamigráció meglévő ötleteivel kell egyeztetni a hatókört. A módszertani szabályzat a 6. szakasz alapján ettől külön döntésként is bevezethető.

## 9. Második vélemény — kritikai átnézés (2026-09-06)

Szerző: Claude Fable 5.1, a doki kérésére, a fenti review független ellenőrzéseként.  
Vizsgált HEAD: `2fa4b8a` (31 commit a review HEAD-je után).  
Módszer: az F01–F12 minden hivatkozott tesztjét és forráshelyét újraolvastam; a teljes készletet újra lefuttattam JSON-riporterrel; a skilleket, a `docs-check`-et, a workflow-kaput, a nested `CLAUDE.md`-ket és a lint-konfigot a review állításai ellen ellenőriztem. Coverage-t, mutációt, böngészős futást én sem mértem.

Saját futtatás (Windows, Node v26.4.0):

| Mérés | Érték |
|---|---:|
| Tesztfájl / futó eset | 102 / 1882 (a review óta egy új fájl: `pdf/bufferShim.test.ts`) |
| Falidő az első fájl indulásától az utolsó befejezéséig | 95,4 s |
| Fájlon belüli futásidők összege (párhuzamos, nem várakozási idő) | 525 s |
| A 45 `domain/` fájl összege | 0,64 s |
| Leglassabb fájl: `PriceListAdminPage.test.tsx` | 95,1 s, 53 eset |
| A három `PriceListAdminPage*` fájl együtt | 146 s CPU, 68 eset |

A számok a review mérését visszaigazolják. A lényeges következtetést viszont másképp vonom le: a leglassabb egyetlen fájl 95 s, ami gyakorlatilag egyenlő a teljes falidővel — a készlet futásideje ma **ennek az egy fájlnak a kritikus útja**, nem az 1882 eset összege. Ez a fájlfelosztás vagy worker-szám helyett a fixture-csökkentést jelöli ki egyetlen hatásos karnak, és pontosan ennél a családnál.

### 9.1 Megerősített állítások

| Megállapítás | Ellenőrzés | Eredmény |
|---|---|---|
| F01 — a `usePDF` mock nem renderel | `App.test.tsx`, `PreviewPage.test.tsx`, `PreviewPage.pdfHiba.test.tsx` mockja; `PreviewPage.tsx` `doFinalize` | Igaz. A véglegesítés a már kész blob bájtjait menti, a `tervId`/`verzio` a `savePlan` után, `loadPlan`-nal jön vissza. A termékhiba tétele közben terv lett (`backlog/pdf-verzioszam-mentett-verzio.md`); a `Verification` szakasza pont a PDF-fejléc és a mentett `terv.json` egyezését kéri — az F01 szerződésteszt ennek természetes elfogadási bizonyítéka. |
| F02 — tört pénzérték átmegy a guardon | `validate.ts` `isFiniteNumber` | Igaz. A „pénz egész" invariáns a betöltési határon nincs kikényszerítve. Lásd 9.3/2 a további hézagokról. |
| F02 — a `mennyiseg: 'sok'` eset nem izolált | `DemoStorage.test.ts` „rejects a structurally invalid (but syntactically valid) terv.json", `DemoDraftStorage.test.ts` ugyanez | Igaz: a hibás sorból mindkét ármező is hiányzik, három guard bármelyike elbuktatja. |
| F03 — „appends v2 without touching v1" | `DemoStorage.test.ts` | Igaz: `verzio === 1` és a verziólista; a V1 tartalma és PDF-bájtjai nincsenek összevetve. |
| F03 — `planCopy` „nem mutálja a forrás tervet" | `planCopy.test.ts` | Igaz: csak a `paciens` objektum referenciáját nézi. |
| F03 — `ItemPicker` név-/kategóriatalálat | `ItemPicker.test.tsx` „egyetlen tétel sem szerepel mindkét szinten…" | Igaz. A teszt saját kommentje mondja ki, hogy a kategória nem illeszkedik, tehát kategória-blokk nem is keletkezik. A név ígéretét a teszt nem bizonyítja. |
| F03 — „teljes szélességben" | `TervDocument.test.tsx` | Igaz, csak szövegsorrend. |
| F03 — unmount-takarítás `console.error`-ral | `useMentesJelzo.test.tsx` | Igaz; React 19 alatt sincs ilyen figyelmeztetés, az assertion vákuumban zöld. |
| F04 — részleges írás | `DemoStorage.ts` `doSavePlan` `try/catch` | Pontosítva: a rollback ág **létezik** (terv- és PDF-kulcs törlése, `paciens.json` szándékosan marad, a komment a harmadik írás esetét külön indokolja). Teszt viszont csak a második írás hibájára, új pácienssel van. A kód kommentje ma az egyetlen „bizonyíték" a harmadik írás esetére. |
| F06 — `money.test.ts` duplikáció | „formats HUF as thousands-separated…" és „HU + HUF: szóköz elválasztó…" | Igaz, azonos hívás és elvárás. |
| F07 — `StorageProvider` maga példányosít | `StorageContext.tsx` | Igaz, és ennél fontosabb, mint a review súlyozza — lásd 9.3/1. |
| F07 — a lépésőr a wrapperben néma stub | `testUtils.tsx` `TestLepesGuardProvider` | Igaz, dokumentált. |
| F09 — történeti tesztnevek | grep a tesztnevekre | 95 `backlog-NN` / `NN. tétel` alakú `it`/`describe` név. A gyökér szabály és a `docs-check` `D_PATTERN`-je ezt az alakot nem fogja. |
| F11 — a helyi kapu és a CI eltér | `scripts/workflow/lib.mjs` `gate()`, `.github/workflows/deploy.yml` | Igaz: a `test:workflow` csak a CI-ban fut. A `SKIP_ONLY_PATTERN` a `.skip.each`/`.only.each`, `.skipIf`, `.todo` alakot és a `scripts/*.test.mjs` fájlokat nem fedi. |
| F11 — Node-verzió | CI `lts/*`, helyi v26 | Igaz. |

### 9.2 Ahol nem értek egyet, vagy pontosítok

1. **`seed/plans.test.ts` — „minden demó sor hivatkozik…" (F03 táblázat).** A review szerint a teszt csak `length > 0`-t ellenőriz és „valóban minden releváns sort ellenőrizni" kellene. A közvetlenül utána álló két `it.each` viszont **minden** sorra lefut és a tétel létezését, illetve az ár egyezését állítja. A kifogásolt teszt a paraméterezett lista üresség-őre: üres tömbbel az `it.each` nulla esetet ad és csendben zöld marad. A lefedettség megvan, a **név** rossz. Teendő: átnevezés (pl. „a seed sorlistája nem üres — az alábbi it.each nem fut vákuumban"), nem erősítés. Tanulság, amit szabályba tennék: minden `it.each` mellé kötelező vákuum-őr.

2. **Sorszám-hivatkozások.** A review sorra hivatkozik; 31 commit alatt ezek elcsúsztak (a `'sok'` eset ma a 374. sornál van, nem a 323.-nál). Review-ban és tervben a tesztre a nevével hivatkozzunk — ez a `docs-check` `test:` anchorjának alakja is —, sorra soha.

3. **„Valódi PDF" nem jelent böngészőt.** A `@react-pdf/renderer` Node-buildje exportálja a `renderToBuffer`-t. Egy `// @vitest-environment node` pragmás tesztfájlban a `TervDocument` ténylegesen renderelhető, a NotoSans abszolút fájlútvonalról regisztrálva. Az F01 szerződésteszt (mentett `terv.json` ↔ PDF-fejléc `tervId`, `verzio`, páciensnév, pénznem, fizetendő) így a meglévő vitest-készletben, CI-ban futhat, Playwright és izolált Chrome nélkül. Ára: egy PDF-szövegkinyerő dev-függőség (`pdfjs-dist` vagy `pdf-parse`), mert a subset-beágyazott NotoSans miatt a nyers bájtokban a szöveg nem grep-elhető — a 2026-09-06-i manual-checks jelentés is csak a fontneveket találta meg regex-szel, a tartalmat nem. Ami Node-ban továbbra sem megy, és marad a `/manual-checks` pdf szeletén: a fogtérkép canvas→PNG útja, a CSP/asset-betöltés, a blob-URL-es iframe-előnézet.

4. **A Playwright-javaslat a „Böngésző-automatizálás — nem tárgyalható" szabály szövegébe ütközik.** A szabály szó szerint tiltja, hogy „remote debuggingot bekapcsolni bármilyen böngészőben"; a Playwright saját, izolált Chromiumot indít, CDP-n vezérelve. A szabály **szellemével** (valós profil, bejelentkezett munkamenet védelme) nem ütközik, a betűjével igen. Sorrend: előbb a doki dönt a szabály bővítéséről (izolált, saját indítású, szintetikus adatú böngésző kifejezett engedélye CI-ban), csak utána jöhet szerszám. Addig a 3. pont szerinti Node-render adja a valódi PDF-bizonyítékot; a böngészős smoke külön döntés, nem a módszertan része.

5. **A `/plan` `Verification`-be tett szintválasztás a sablon ellen megy.** A review azt javasolja, hogy a `Verification` nevezze meg a tesztelési szintet és a tesztcsaládot. A sablon viszont kifejezetten ezt mondja: „milyen megfigyelhető viselkedést kell látni (nem hogyan tesztelni)". A szint és a tesztcsalád „hogyan". Javaslat: a `Verification` marad tisztán viselkedés (a doki-interjú ne terhelődjön teszttechnikával); a szintválasztás és a meglévő teszt keresése az `/implement` 4. lépésébe kerül egy sorral, és a 5c diff-önellenőrzés negyedik kérdése lesz: „melyik meglévő teszt bizonyítja, melyik szinten, és mely esetet váltotta ki". A `/plan` `Current state` már ma is kéri a meglévő teszt megnevezését — ez elég a tervezési oldalon.

6. **Az 548 s-os „költség" félrevezető viszonyítási alap.** A review jelzi, hogy nem várakozási idő, a költségtáblát mégis erre építi. Döntéshez a falidő (95 s) és a fejlesztői iteráció (egy fájl újrafuttatása) számít. A `PriceListAdminPage.test.tsx` 95 s-a egyben a készlet kritikus útja: a párhuzamos ütemezés ez alá nem megy, bármennyi worker. A fájlok szétvágása csak akkor gyorsít, ha vele a fixture is csökken — ebben egyetértünk, de a mérőszámot a falidőre cserélném.

7. **A sorrend első lépése ne szabályzat legyen.** A review 7. szakasza a döntési rend leírásával indít. Az agentek megfigyelhetően a meglévő kódmintát másolják, nem a prózát: a 29 tesztfájl, ami seed-páciensnevekre épül, és a 18, ami a seedet importálja, így szaporodott el a `TestProviders` mintájából. Előbb a **helyes mintának kell léteznie kódban** (fake tároló, kis builder, egy mintateszt), utána mutathat rá a szabály. A szabályzat önmagában a mai mintát nem töri meg.

### 9.3 Amit a review nem lát, vagy alulsúlyoz

1. **Nincs injektálási varrat a `StorageProvider`-en.** A `new DemoStorage()` és `new DemoDraftStorage()` a provider `useMemo`-jában áll, se prop, se factory. Ez az F04, F05 és F07 közös gyökere: (a) minden lapteszt `dp:`-kulcsokat seedel `localStorage`-ba, mert máshogy nem tud adatot adni; (b) a `PlanStorage`-szerződés nem futtatható második implementáción; (c) az Electron `FileSystemStorage`-váltás ezt a providert amúgy is felnyitja. A legkisebb változás: opcionális `storage`/`drafts` prop (vagy `createStorage` factory) a `StorageProvider`-en, plusz egy `InMemoryPlanStorage` a `storage/` alatt tesztcélra. A lint tiltása a tesztfájlokra már ma is ki van kapcsolva, tehát a tesztek beadhatják. Ez az egy varrat teszi lehetővé a review 4. és 5. szakaszának nagy részét.

2. **`validate.ts` további hézagai.** A tört pénzérték mellett átmegy: negatív ár és összesítő, `0`/negatív/tört `mennyiseg`, duplikált tétel-`id`, nem létező `kategoriaId`-hivatkozás, `NaN`-mentes de értelmetlen `ervenyessegNap` (negatív), az `alapertelmezettNyelv`/pénznem enum-értéke. Ezek egy része termékdöntés (tört mennyiség? negatív kedvezmény mint felár?), ezért a mátrix megírása előtt egy rövid doki-kérdés kell — különben a teszt a mai elfogadó viselkedést betonozza, és a „szándékosan megengedett" eseteket nem lehet megkülönböztetni a „még nem védett" esetektől. A pozitív kontrollok első listája már adott: az `assertSettingsShape` kommentje két engedményt mond ki (`inaktivOrvosok` opcionális, hibás `alapertelmezettOrvos` némán visszaesik).

3. **Meglévő jó mechanizmus, amire építeni lehet.** A `test-setup.ts` a DOM-beágyazási `console.error`-t teszthibává emeli. Ez a „figyelmeztetés nem lehet zöld" elv gépi alakja, és ugyanezzel a mintával bővíthető (React `key`-figyelmeztetés, `act()`-figyelmeztetés). Előbb mérni, hány mai tesztet buktatna.

4. **Semmi nem védi az assertion gyengítését.** A `docs-check` `test:` anchorja az anchorolt tesztek **nevét** védi az átnevezéstől, a tartalmát nem. Mutációs mérés nélkül ez csak eljárással védhető: az `/implement`-ben a „javítás visszavonásával a teszt piros" lépés, amit a review a 6. szakaszban javasol. Én ezt **csak** az invariáns-anchoros teszteknél tenném kötelezővé és jelentendővé, nem általánosan — így nem lassítja a rutinmunkát, de a hét hard invariánst őrző tesztnél nem maradhat el.

5. **Ratchet-őr a történeti tesztnevekre.** A 95 `backlog-NN` / `NN. tétel` név takarítása nem indokol projektet, de új ilyen név ne kerülhessen be. A `docs-check` számolja a találatokat, és a rögzített felső korlát csak csökkenhet. Olcsó, nem indít refaktort, és a review F09 javaslatát („érintett tesztcsalád refaktorakor rendezhető") kényszerpályára teszi.

6. **A globális `testTimeout: 15000` elrejti a lassulást.** A Vitest `slowTestThreshold` beállítása és a JSON-riport lassúlistája a CI-ban (jelentés, nem kapu) az F10 „tartós mérés" olcsó első lépése — a fenti táblázat egyetlen `node -e` sorral készült a riportból.

7. **Reprodukálható Node.** `.nvmrc` + `package.json` `engines` + a CI-ban `node-version-file`. Egyoldalas, F11-hez tartozik, a review csak a célt mondja ki.

8. **jsdom minden fájlra.** A 45 `domain/` fájl DOM nélkül fut, mégis jsdom-környezetet kap. Vitest `projects` (node: `domain`, `storage`, tiszta `pdf`; jsdom: a többi) — a nyereség a környezetindítás, nem a tesztidő; előbb mérni, valószínűleg 5–15 s CPU. Nem prioritás, de a review 5. szakaszának „Node/jsdom szétválasztás" sora ezzel válik konkréttá.

9. **A `paths re-export sanity` teszt (F06) egy másik hiányra mutat.** A teszt a `VersionConflictError` nevét ellenőrzi; a valódi állítás az lenne, hogy `savePlan` ütközéskor ezt az osztályt dobja. Törlés helyett ezt az egy esetet írnám meg helyette — az ütközési út ma sincs közvetlenül tesztelve.

### 9.4 Javasolt szabálykészlet — a `docs/TESTING.md` magja

Rövid, részben gépileg őrizhető lista. Nem specifikáció; egy állítás egy sor.

1. **Szint:** a legkisebb határ, ahol az üzleti jelentés megmarad (a review 5. szakaszának táblázata). Új kódhoz nem jár automatikusan új tesztfájl.
2. **Egy szabály, egy mátrix:** az értékkombinációk `it.each`-ben, egy helyen, vákuum-őrrel; magasabb szinten egy összekötő eset.
3. **Független elvárás:** az elvárt értéket nem a bizonyítandó függvény számolja.
4. **Negatív teszt:** érvényes builderből indul, pontosan egy mező hibás; a hibaüzenetre is állítás.
5. **A név minden állításához assertion:** „nem mutál" → mély egyenlőség fagyasztott bemenettel; „nem ment" → tárolóállapot; „megmarad" → visszaolvasott tartalom; „PDF" → Node-render vagy kimondottan DOM-tartalomteszt.
6. **Laptesztben fake tároló és kis fixture;** a seed csak seed-integritásra és induló smoke-ra. Seed-páciensnév új tesztbe nem kerül.
7. **Mock csak technikai határon** (`usePDF`, timer, `window.open`, `scrollTo`); saját domain-függvény azon a szinten sosem, amelynek a bekötését bizonyítja.
8. **Takarítás `afterEach`-ben** vagy a Vitest `restoreMocks: true` kapcsolójával; kézi `vi.restoreAllMocks()` assertion előtt nem állhat.
9. **Tesztnév:** előfeltétel–akció–eredmény, jelen idő, tétel-/backlog-hivatkozás nélkül (ratchet-őr).
10. **Invariáns-anchoros tesztnél** az `/implement` jelentése kimondja, milyen hibás implementáció mellett bukna.

Elhelyezés: `docs/TESTING.md` — a `docs-check` a `docs/` mappát nem-rekurzívan szkenneli, tehát az anchorok feloldódnak és a szabályzat nem hivatkozhat elavult tesztnévre. A gyökér `CLAUDE.md` Tesztek szakasza egy sorral mutat rá; a budget 4000 karakter, és a fájl ma pontosan 4000 karakter — a pointer csak akkor fér be, ha a Tesztek szakasz két mondata a TESTING.md-be költözik, és a helyén egyetlen pointer-sor marad. Az `/implement` 4. lépése hivatkozik rá. Sem a nested `CLAUDE.md`-kbe, sem más skillbe nem másolódik.

### 9.5 Javasolt sorrend — eltérés a 7. szakasztól

| Lépés | Konkrét eredmény | Miért ebben a sorrendben |
|---|---|---|
| 1. Varrat + minta | `StorageProvider` opcionális `storage`/`drafts` prop; `InMemoryPlanStorage`; egy `PriceListAdminPage`-eset átírva 3 tételes fake-re; egy `Plan`/`Sor` builder | Kódminta, amit az agentek másolni fognak; az Electron-váltásnak amúgy is kell; falidőt csak ez hoz |
| 2. Éles hézagok | `validate.test.ts` mátrix a doki válaszai után; F03 hat assertion-javítása; a harmadik-írás-hiba és az ütközési út tesztje | Kicsi, konkrét, a hard invariánsokat érinti |
| 3. PDF–JSON szerződésteszt Node-renderrel | A `pdf-verzioszam-mentett-verzio` tétel elfogadási bizonyítéka; `pdfjs-dist` dev-függőség döntéssel | A tétel már tervezett; a teszt a javítás része, nem külön projekt |
| 4. Szabályzat és őrök | `docs/TESTING.md`; `/implement` egy sora; ratchet a tesztnevekre; `SKIP_ONLY_PATTERN` bővítése és a `scripts/*.test.mjs` bevonása; `gate()` = CI-lista; `.nvmrc` | Most már van mire mutatni |
| 5. Pilot mérés | A három `PriceListAdminPage*` fájl a fake tárolóra; falidő előtte/utána | A kritikus út rövidül, nem a CPU-összeg |
| 6. Tartós mérés | `slowTestThreshold` + lassúlista a CI-ban; diagnosztikai coverage explicit `include`-dal | Csak jelentés, nem kapu |

A Playwright/böngészős smoke nem szerepel: a doki külön döntése a böngésző-automatizálási szabály bővítéséről, a módszertantól függetlenül.

**Összegzés:** a review megállapításai a tényeken állnak, egy kivétellel (9.2/1), és a javasolt koncepció megtartható. Két helyen mást javaslok: a „valódi PDF" bizonyíték Node-renderrel a meglévő készletbe kerüljön, ne böngészős keretrendszerbe; és a rendezés kóddal (tároló-varrat, fake, builder) induljon, ne szabályzattal, mert az agentek a mintát követik.

## 8. Függelék — a vizsgált tesztkészlet teljes leltára

A futó esetek száma paraméterezés utáni érték; minden felsorolt fájl zöld volt. A leltár a felülvizsgálat hatókörét rögzíti, nem fájlonkénti automatikus „jó minőség” minősítés. Az egyes családok értékelését és a változtatások indokát a fenti megállapítások és felelősségi mátrix tartalmazza.

| Tesztfájl | Futó eset |
|---|---:|
| [app/src/App.test.tsx](../../app/src/App.test.tsx) | 5 |
| [app/src/components/DentalChart.test.tsx](../../app/src/components/DentalChart.test.tsx) | 13 |
| [app/src/components/FeatureOverviewCard.test.tsx](../../app/src/components/FeatureOverviewCard.test.tsx) | 2 |
| [app/src/components/NavBar.test.tsx](../../app/src/components/NavBar.test.tsx) | 2 |
| [app/src/components/NavGuardContext.test.tsx](../../app/src/components/NavGuardContext.test.tsx) | 3 |
| [app/src/components/NumberField.test.tsx](../../app/src/components/NumberField.test.tsx) | 22 |
| [app/src/components/TervWorkflowShell.test.tsx](../../app/src/components/TervWorkflowShell.test.tsx) | 13 |
| [app/src/components/ToothPickerPopover.test.tsx](../../app/src/components/ToothPickerPopover.test.tsx) | 5 |
| [app/src/components/TorzsadatDiffDialog.test.tsx](../../app/src/components/TorzsadatDiffDialog.test.tsx) | 9 |
| [app/src/components/useDirtyDraft.test.ts](../../app/src/components/useDirtyDraft.test.ts) | 4 |
| [app/src/components/useListStateMemory.test.tsx](../../app/src/components/useListStateMemory.test.tsx) | 6 |
| [app/src/components/useMentesJelzo.test.tsx](../../app/src/components/useMentesJelzo.test.tsx) | 8 |
| [app/src/design/toothChartSvg.test.ts](../../app/src/design/toothChartSvg.test.ts) | 19 |
| [app/src/domain/arElgepeles.test.ts](../../app/src/domain/arElgepeles.test.ts) | 15 |
| [app/src/domain/arKoveti.test.ts](../../app/src/domain/arKoveti.test.ts) | 19 |
| [app/src/domain/arlistaSzures.test.ts](../../app/src/domain/arlistaSzures.test.ts) | 9 |
| [app/src/domain/beallitasok.test.ts](../../app/src/domain/beallitasok.test.ts) | 2 |
| [app/src/domain/blankPlan.test.ts](../../app/src/domain/blankPlan.test.ts) | 9 |
| [app/src/domain/date.test.ts](../../app/src/domain/date.test.ts) | 16 |
| [app/src/domain/fazisSorrend.test.ts](../../app/src/domain/fazisSorrend.test.ts) | 8 |
| [app/src/domain/kitoltetlen.test.ts](../../app/src/domain/kitoltetlen.test.ts) | 30 |
| [app/src/domain/leirasHossz.test.ts](../../app/src/domain/leirasHossz.test.ts) | 3 |
| [app/src/domain/markdownSections.test.ts](../../app/src/domain/markdownSections.test.ts) | 7 |
| [app/src/domain/masterSnapshotDiff.test.ts](../../app/src/domain/masterSnapshotDiff.test.ts) | 19 |
| [app/src/domain/mennyiseg.test.ts](../../app/src/domain/mennyiseg.test.ts) | 14 |
| [app/src/domain/money.test.ts](../../app/src/domain/money.test.ts) | 24 |
| [app/src/domain/nemetNev.test.ts](../../app/src/domain/nemetNev.test.ts) | 17 |
| [app/src/domain/nev.test.ts](../../app/src/domain/nev.test.ts) | 28 |
| [app/src/domain/nyelviReview.test.ts](../../app/src/domain/nyelviReview.test.ts) | 23 |
| [app/src/domain/orokoltJelzesek.test.ts](../../app/src/domain/orokoltJelzesek.test.ts) | 16 |
| [app/src/domain/orvosok.test.ts](../../app/src/domain/orvosok.test.ts) | 17 |
| [app/src/domain/paciensAdatok.test.ts](../../app/src/domain/paciensAdatok.test.ts) | 9 |
| [app/src/domain/paciensAktivitas.test.ts](../../app/src/domain/paciensAktivitas.test.ts) | 20 |
| [app/src/domain/paciensDuplikacio.test.ts](../../app/src/domain/paciensDuplikacio.test.ts) | 30 |
| [app/src/domain/paciensKereses.test.ts](../../app/src/domain/paciensKereses.test.ts) | 16 |
| [app/src/domain/paciensKotes.test.ts](../../app/src/domain/paciensKotes.test.ts) | 9 |
| [app/src/domain/paciensTorles.test.ts](../../app/src/domain/paciensTorles.test.ts) | 8 |
| [app/src/domain/paciensValidacio.test.ts](../../app/src/domain/paciensValidacio.test.ts) | 7 |
| [app/src/domain/penznemValtas.test.ts](../../app/src/domain/penznemValtas.test.ts) | 23 |
| [app/src/domain/piszkozat.test.ts](../../app/src/domain/piszkozat.test.ts) | 19 |
| [app/src/domain/planChainData.test.ts](../../app/src/domain/planChainData.test.ts) | 9 |
| [app/src/domain/planCopy.test.ts](../../app/src/domain/planCopy.test.ts) | 25 |
| [app/src/domain/planFolders.test.ts](../../app/src/domain/planFolders.test.ts) | 11 |
| [app/src/domain/planVersionActions.test.ts](../../app/src/domain/planVersionActions.test.ts) | 11 |
| [app/src/domain/priceListIds.test.ts](../../app/src/domain/priceListIds.test.ts) | 9 |
| [app/src/domain/schema.test.ts](../../app/src/domain/schema.test.ts) | 3 |
| [app/src/domain/search.test.ts](../../app/src/domain/search.test.ts) | 11 |
| [app/src/domain/sorElteres.test.ts](../../app/src/domain/sorElteres.test.ts) | 13 |
| [app/src/domain/sorMezok.test.ts](../../app/src/domain/sorMezok.test.ts) | 7 |
| [app/src/domain/teeth.test.ts](../../app/src/domain/teeth.test.ts) | 26 |
| [app/src/domain/templates.test.ts](../../app/src/domain/templates.test.ts) | 14 |
| [app/src/domain/tervCim.test.ts](../../app/src/domain/tervCim.test.ts) | 7 |
| [app/src/domain/tomegesAr.test.ts](../../app/src/domain/tomegesAr.test.ts) | 22 |
| [app/src/domain/toothVisual.test.ts](../../app/src/domain/toothVisual.test.ts) | 22 |
| [app/src/domain/torzsadatBetoltes.test.ts](../../app/src/domain/torzsadatBetoltes.test.ts) | 19 |
| [app/src/domain/totals.test.ts](../../app/src/domain/totals.test.ts) | 25 |
| [app/src/domain/ujVerzioDatum.test.ts](../../app/src/domain/ujVerzioDatum.test.ts) | 7 |
| [app/src/domain/veglegesitesOr.test.ts](../../app/src/domain/veglegesitesOr.test.ts) | 55 |
| [app/src/pages/DemoPage.test.tsx](../../app/src/pages/DemoPage.test.tsx) | 9 |
| [app/src/pages/Home.test.tsx](../../app/src/pages/Home.test.tsx) | 13 |
| [app/src/pages/NewPlanPage.test.tsx](../../app/src/pages/NewPlanPage.test.tsx) | 24 |
| [app/src/pages/PaciensekPage.test.tsx](../../app/src/pages/PaciensekPage.test.tsx) | 16 |
| [app/src/pages/PatientDetailPage.test.tsx](../../app/src/pages/PatientDetailPage.test.tsx) | 25 |
| [app/src/pages/PatientPage.test.tsx](../../app/src/pages/PatientPage.test.tsx) | 49 |
| [app/src/pages/PlanEditorPage.sorok.test.tsx](../../app/src/pages/PlanEditorPage.sorok.test.tsx) | 41 |
| [app/src/pages/PlanEditorPage.test.tsx](../../app/src/pages/PlanEditorPage.test.tsx) | 21 |
| [app/src/pages/PreviewPage.pdfHiba.test.tsx](../../app/src/pages/PreviewPage.pdfHiba.test.tsx) | 2 |
| [app/src/pages/PreviewPage.test.tsx](../../app/src/pages/PreviewPage.test.tsx) | 32 |
| [app/src/pages/PriceListAdminPage.arElgepeles.test.tsx](../../app/src/pages/PriceListAdminPage.arElgepeles.test.tsx) | 7 |
| [app/src/pages/PriceListAdminPage.leiras.test.tsx](../../app/src/pages/PriceListAdminPage.leiras.test.tsx) | 2 |
| [app/src/pages/PriceListAdminPage.test.tsx](../../app/src/pages/PriceListAdminPage.test.tsx) | 52 |
| [app/src/pages/PriceListAdminPage.tomegesAr.test.tsx](../../app/src/pages/PriceListAdminPage.tomegesAr.test.tsx) | 8 |
| [app/src/pages/SettingsPage.test.tsx](../../app/src/pages/SettingsPage.test.tsx) | 36 |
| [app/src/pages/TervReszleteiPage.test.tsx](../../app/src/pages/TervReszleteiPage.test.tsx) | 34 |
| [app/src/pages/demo/AdatkezelesSection.test.tsx](../../app/src/pages/demo/AdatkezelesSection.test.tsx) | 4 |
| [app/src/pages/demo/FileTreeSection.test.tsx](../../app/src/pages/demo/FileTreeSection.test.tsx) | 8 |
| [app/src/pages/demo/OsszesTervSection.test.tsx](../../app/src/pages/demo/OsszesTervSection.test.tsx) | 42 |
| [app/src/pages/paciensek/UjPaciensDialog.test.tsx](../../app/src/pages/paciensek/UjPaciensDialog.test.tsx) | 18 |
| [app/src/pages/planEditor/EgyediVegosszegBlokk.test.tsx](../../app/src/pages/planEditor/EgyediVegosszegBlokk.test.tsx) | 6 |
| [app/src/pages/planEditor/ElolegBlokk.test.tsx](../../app/src/pages/planEditor/ElolegBlokk.test.tsx) | 10 |
| [app/src/pages/planEditor/ItemPicker.test.tsx](../../app/src/pages/planEditor/ItemPicker.test.tsx) | 18 |
| [app/src/pages/planEditor/PlanEditorHeader.test.tsx](../../app/src/pages/planEditor/PlanEditorHeader.test.tsx) | 4 |
| [app/src/pages/planEditor/Summary.test.tsx](../../app/src/pages/planEditor/Summary.test.tsx) | 4 |
| [app/src/pages/previewPage/VeglegesitesChecklist.test.tsx](../../app/src/pages/previewPage/VeglegesitesChecklist.test.tsx) | 8 |
| [app/src/pages/tervReszletei/FazisokBlokk.test.tsx](../../app/src/pages/tervReszletei/FazisokBlokk.test.tsx) | 24 |
| [app/src/pages/tervReszletei/PenzugyiOsszesites.test.tsx](../../app/src/pages/tervReszletei/PenzugyiOsszesites.test.tsx) | 11 |
| [app/src/pdf/TervDocument.test.tsx](../../app/src/pdf/TervDocument.test.tsx) | 50 |
| [app/src/pdf/fonts.test.ts](../../app/src/pdf/fonts.test.ts) | 2 |
| [app/src/pdf/footerLayout.test.ts](../../app/src/pdf/footerLayout.test.ts) | 3 |
| [app/src/pdf/labels.test.ts](../../app/src/pdf/labels.test.ts) | 5 |
| [app/src/pdf/markdownLite.test.ts](../../app/src/pdf/markdownLite.test.ts) | 17 |
| [app/src/pdf/pdfCimLokalizacio.test.ts](../../app/src/pdf/pdfCimLokalizacio.test.ts) | 9 |
| [app/src/state/AppState.test.tsx](../../app/src/state/AppState.test.tsx) | 20 |
| [app/src/state/planIndulas.test.ts](../../app/src/state/planIndulas.test.ts) | 6 |
| [app/src/storage/DemoDraftStorage.test.ts](../../app/src/storage/DemoDraftStorage.test.ts) | 16 |
| [app/src/storage/DemoStorage.test.ts](../../app/src/storage/DemoStorage.test.ts) | 47 |
| [app/src/storage/demoFileTree.test.ts](../../app/src/storage/demoFileTree.test.ts) | 9 |
| [app/src/storage/paths.test.ts](../../app/src/storage/paths.test.ts) | 31 |
| [app/src/storage/seed/plans.test.ts](../../app/src/storage/seed/plans.test.ts) | 292 |
| [app/src/storage/seed/priceList.test.ts](../../app/src/storage/seed/priceList.test.ts) | 1 |
| [app/src/storage/seed/templates.test.ts](../../app/src/storage/seed/templates.test.ts) | 10 |
| **Alkalmazás összesen** | **1870** |
| [scripts/workflow/workflow.test.mjs](../../scripts/workflow/workflow.test.mjs) | 10 |

## 10. Playwright E2E — érv a bevezetés mellett és javasolt bekötés

Dátum: 2026-09-07. A dokival folytatott megbeszélés kiegészítése. **Javaslat, nem elfogadott implementációs terv vagy a böngésző-automatizálási szabály módosítása.** A dokumentumba emelés önmagában nem engedélyezi a Playwright telepítését vagy futtatását.

### 10.1 Miért lenne hasznos ennél az alkalmazásnál?

Egy kis, célzott Playwright-készletet érdemes bevezetni, helyben és CI-ban is. A fő értéke a böngészős fő folyamatok rendszeres ellenőrzése: billentyűzetes tervkészítés, valódi PDF, mentés és újranyitás. A `/manual-checks` ismétlődő részét jelentősen csökkentheti, teljesen azonban nem váltja ki.

- **Már volt böngészőspecifikus hiba.** A [2026-09-06-i manual-check jelentés](2026-09-06-manual-checks-all.md) a `Buffer is not defined` javítását valódi böngészőben igazolta. Egy production builden PDF-et készítő teszt ennek visszatérését automatikusan észlelhetné.
- **A billentyűzetes ciklus termékérték.** A gépelés → nyilak → Enter → keresőürítés → visszakapott fókusz dönti el, gyorsabb-e az app az Excelnél. Ezt valódi böngészőben is érdemes őrizni.
- **Az ismételt böngészős ellenőrzés költsége már ma is létezik.** A reset, navigáció, instrumentálás, mérés és eredményértelmezés stabil része egyszer megírható, utána agent nélkül futtatható.
- **Erősebb letöltési bizonyíték.** A jelenlegi skill anchor/blob hívásokat figyel; a Playwright a tényleges letöltött fájl nevét és tartalmát is elérhetővé teszi. [Playwright: Downloads](https://playwright.dev/docs/downloads).

A korábbi kizárás értelmezésénél két külön használatot kell megkülönböztetni: a régi technológiai dokumentum a szerveroldali PDF-generálást zárta ki az adatvédelmi korlát miatt; a szintetikus adatokkal végzett helyi vagy CI-teszt más felhasználás. Az aktuális gyökér `CLAUDE.md` böngészőszabályának szövegét ugyanakkor előbb pontosítani kellene saját indítású, izolált tesztböngészőre, a valós profilok és valódi páciensadatok védelmét megtartva. Az [Electron-terv](../desktop-app-migration-plan.md) már tartalmaz Playwright-indulástesztet, így a dokumentált irányokat is össze kell hangolni. A Playwright Electron-támogatása jelenleg kísérleti; a webes teszt nem bizonyítja önmagában a csomagolt Electron-app indulását vagy fájlrendszer-kezelését. [Playwright: Electron](https://playwright.dev/docs/api/class-electron).

### 10.2 Node PDF-render és böngészős véglegesítés: két bizonyítási felelősség

A 9.2/3 javaslata helyes: valódi PDF Node-ban, `renderToBuffer`-rel is előállítható. Ez jó hely a dokumentum tartalmi és renderelési szerződésének célzott vizsgálatára. [React-pdf: Node API](https://react-pdf.org/docs/v4/node).

**A dokumentum helyes renderelése és a véglegesítéskor ténylegesen elmentett dokumentum helyessége azonban két külön állítás.** Ha a teszt maga készít helyes verziószámú tervet, abból PDF-et renderel és összehasonlítja őket, a felület közben még menthet egy korábbi, elavult blobot. A Node-teszt akkor védi ezt is, ha a valódi véglegesítési folyamatot hajtja meg; önmagában a renderer meghívása nem elég.

A Playwright a felhasználó kattintásától ellenőrizhetné a teljes böngészős utat. A véglegesítés után **ugyanannak az archivált verziónak a ténylegesen eltárolt PDF-jét és JSON-ját** kell összevetni: tervazonosító, verzió, páciensnév, pénznem, fizetendő. Az elvárt üzleti értékekhez független assertion is kell, mert két egyformán hibás kimenet egyezése nem elég. V2 létrehozásakor V1 teljes JSON-tartalma és PDF-bájtjai maradjanak változatlanok.

A PDF feldolgozásához külön szövegkinyerő szükséges; ezt a Playwright önmagában nem adja. A böngészőben előállított és letöltött fájlt kell feldolgozni, nem a tesztben újrarenderelt helyettesítő dokumentumot. A canvas→PNG fogtérkép, a production asset-betöltés és a CSP további böngészős bizonyítékot igényel. A PDF-szöveg helyessége nem bizonyítja a glyphek vizuális helyességét vagy a tördelés minőségét.

### 10.3 Javasolt technikai bekötés

1. **Külön készlet:** `app/e2e/*.spec.ts`, `app/playwright.config.ts`, `@playwright/test` fejlesztői függőség, `test:e2e` npm-parancs. A Vitest ne gyűjtse be az E2E-fájlokat; a lint, a TypeScript-ellenőrzés és a tesztszabályokat ellenőrző őr hatóköre viszont terjedjen ki rájuk. A függőségeket lockfile, a Node-verziót egységes helyi/CI-beállítás rögzítse.
2. **Kezdetben csak Chromium:** a jelenlegi és tervezett használathoz ez indokolt. Több böngésző és platform teljes mátrixa most aránytalan karbantartás lenne.
3. **Production build helyi kiszolgálása:** build után `vite preview`, rögzített porttal, `strictPort`-tal és kizárólag helyi eléréssel. Példa: `http://127.0.0.1:4173/dental-plan/#/`. Így a base path, a csomagolt kód, a fontok és a production CSP is a vizsgálat része. A Playwright `webServer` indítsa és állítsa le a preview-szervert; a kapu ne használjon újra véletlenül másik vagy elavult szervert. [Playwright: Web server](https://playwright.dev/docs/test-webserver).
4. **Tesztenként friss környezet:** kizárólag szintetikus adatok, kontrollált idő és kezdeti állapot, saját indítású böngésző. A Playwright tesztenként külön böngészőkörnyezetet ad saját localStorage-dzsal, így a tesztek közötti kézi reset-koreográfia kiváltható. A piszkozat-visszaállítás tesztjén belül természetesen ugyanaz a tároló marad az újratöltéshez. [Playwright: Isolation](https://playwright.dev/docs/browser-contexts).
5. **Valódi fő folyamat:** a mentési E2E a production `DemoStorage`-ot és PDF-renderelést használja. A kis fixture és injektálható fake tároló továbbra is jó a laptesztekhez; az E2E mentési útjából ne helyettesítsük ki azt, amit bizonyítani akarunk. Az adat-előkészítés és visszaolvasás a tárolóhatárokat tiszteletben tartó tesztsegéden át történjen; ne kerüljön tesztcélú kerülőút a production felhasználói folyamatba.
6. **Megfigyelhető eredmények:** felirat, fókusz, visszatöltött adat, letöltött fájl és releváns alkalmazás-/CSP-hibák. Rögzített várakozások helyett konkrét állapotokra várjunk. Hibánál maradjon trace és screenshot; a tesztadat és minden feltöltött diagnosztikai artefaktum szintetikus legyen. A véletlenszerű hibákat ismételt futással mérjük, ne korlátlan újrapróbálással fedjük el.

### 10.4 CI és helyi kapu

**A kis, stabil készlet a deploy előtt kötelező CI-lépés legyen.** A jelenlegi `.github/workflows/deploy.yml` build-jobjában, a build után és a Pages-artifact feltöltése előtt:

```text
npm ci
meglévő ellenőrzések és build
npx playwright install --with-deps chromium
npm run test:e2e
Pages-artifact feltöltése
deploy
```

Így PR-en és master-pushon is ellenőriz, hibánál nem élesül az új build. Ugyanazt a tesztelt `dist` tartalmat kell feltölteni, közben új build nélkül. Ha később külön E2E-job készül, a deploy annak sikerétől is függjön. A Playwright támogatja a GitHub Actions-futtatást és a hibakeresési riportok megőrzését. [Playwright: CI](https://playwright.dev/docs/ci-intro).

A helyi teljes kapuba is ugyanaz a kis készlet kerüljön, hogy a hiba a doki munkafán végzett ellenőrzése és a push előtt kiderüljön. Az `npm test` maradhat a Vitest parancsa; a workflow-kapu külön hívja a `test:e2e`-t a friss build után. A böngésző telepítése helyben egyszeri környezet-előkészítés, nem minden futás része. A `gate()` és az érintett workflow-hívók kapulistáját együtt kell módosítani, hogy a helyi és CI-bizonyíték ne térjen el.

### 10.5 Mit lehet migrálni?

| Jelenlegi ellenőrzés | Javasolt hely |
|---|---|
| `App.test.tsx`: létrehozás → véglegesítés → V2 | Playwright valódi PDF-fel; az azonos felelősségű jsdom-flow az egyenértékű vagy erősebb bizonyíték után kiváltható |
| „F5” unmount–remount szimuláció | Playwright valódi oldalfrissítéssel |
| Manual-check: tételfelvitel ×3, Escape, Tab, fókusz | Playwright |
| Manual-check: popover levágása két felbontáson | Playwright geometriai ellenőrzéssel |
| Manual-check: fájlnév, letöltés, fontbetöltés, CSP-hiba | Playwright |
| PDF-szövegfeltételek részletes mátrixa | Gyors tartalomtesztek és célzott Node PDF-render |
| Pénz, validáció, verziózás, tárolási hibainjektálás | Domain-/storage-tesztekben marad |
| Használhatóság, szakmai helyesség, nyomtatvány összhatása | Emberi/agent által végzett felülvizsgálat |

A migráció után az átfedő tesztet valóban ki kell venni vagy szűkíteni; az E2E ne pusztán újabb ismétlése legyen ugyanannak a mátrixnak. Minden átvitt esetnél nevezzük meg, milyen bizonyítási felelősséget vesz át és melyik korábbi ellenőrzést váltja ki.

Az árlista-admin több tucat esetét nem indokolt böngészőbe költöztetni. A lassú fixture-problémát a jelenlegi szinten kell megoldani, kis adatokkal és megfelelő tárolóinjektálással. A Playwright önmagában nem ígér gyorsulást; a teljes futásidőt és a megspórolt kézi munkát külön kell mérni.

### 10.6 Mi marad a manual-checks feladata?

A `/manual-checks` megmarad a feltáró vizsgálatra, az új interakciók áttekintésére és az értelmezést igénylő vizuális ellenőrzésre. A doki kézi elfogadása külön termékdöntés: az automatikus teszt nem dönti el, hogy egy új flow használhatóbb lett-e vagy a nyomtatvány szakmailag megfelelő-e.

A screenshot-összehasonlítás változást jelez, de nem bizonyítja, hogy a referencia jó volt vagy az új kép jobb lett. A referenciaképekhez azonos renderelési környezet kell; Windows és Linux között ne legyen közös pixelpontos elvárás. Csak kevés, stabil és előzetesen ellenőrzött nézet kapjon ilyen tesztet; a baseline-frissítés ne váljon automatikus hibafeloldássá. [Playwright: Visual comparisons](https://playwright.dev/docs/test-snapshots).

A skill checklistjéből az automatizált, egyenértékűen bizonyított pontok kikerülhetnek, helyükön a tesztre utalással. A megmaradó pontok kadenciáját a változás jellege határozza meg. A jelenlegi skill futtatási korlátai nem módosulnak e javaslat dokumentálásától.

### 10.7 Első pilot és értékelés

Első körben három forgatókönyv:

1. **Billentyűzetes tételfelvitel:** három egymást követő felvétel egér nélkül; a megfelelő sorok létrejönnek, a kereső ürül és visszakapja a fókuszt.
2. **Piszkozat-visszaállítás:** a bevitt adatok valódi oldalfrissítés után megmaradnak.
3. **Véglegesítés és V2:** a ténylegesen archivált PDF és JSON releváns mezői egyeznek a független elvárással; az új verzió létrejön, V1 teljes tartalma változatlan.

Ezeken kell mérni a helyi és CI-futásidőt, az ismételt futások bizonytalan hibáit, a hibadiagnózis használhatóságát és a kiváltható kézi munkát. A pilot eredménye alapján érdemes a további manual-check pontokat átemelni. Ez már érdemi böngészős védelmet adhat kezelhető karbantartási költséggel, a meglévő domain-/storage-/komponenstesztek célzott javítása mellett.
