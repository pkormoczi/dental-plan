# Tesztelési módszertan — egységesített review és véglegesítendő koncepció

Egységesítés: **2026-09-08**. Állapot: **döntés-előkészítő javaslat**. A konszenzus a review-k közös álláspontját jelenti, nem a doki által már elfogadott szabályzatot. A súlyosság nem backlog-`Prio`.

**Cél:** egyetlen koncepcióból lehessen megválaszolni a nyitott kérdéseket, majd önálló, ellenőrizhető lépésekre bontani a megvalósítást. Az E2E ennek része; nem külön utólagos melléklet.

Olvasási út: az **5–6. szakasz a közös koncepció**, a **7. szakasz a döntési lista**, a **8. szakasz a feladatokra bontás alapja**. A 4. szakasz megőrzi az F01–F12 azonosítókat és a bizonyítékokat; a 9. szakasz történeti leltár.

### Források és az összevonás szabálya

| Jel | Forrás | Bizonyíték időpontja |
|---|---|---|
| R1 | Eredeti teljes review, korábbi 1–8. szakasz | 2026-09-05, `f090b198e125dd9b5bf942d41d329bb97d084de2` |
| R2 | Claude Fable 5.1 független második véleménye, korábbi 9. szakasz | 2026-09-06, `2fa4b8a`; hivatkozott források újraolvasása és új tesztfutás |
| E | A dokival egyeztetett Playwright-javaslat, korábbi 10. szakasz | 2026-09-07; koncepció, nincs pilotmérés |
| S | Jelen szerkesztői összevonás és célzott forrásellenőrzés | 2026-09-08, `f400b7a75c9baa9b26022369419b57d06d5819e4` |

Az egyező állítások egyszer szerepelnek. A bizonyítékkal feloldható eltérések a megfelelő findingba kerültek; a valódi választási helyzetek a 7. szakaszban maradtak, ajánlással és kitölthető válaszhellyel. Az eredeti szövegek a fájl Git-történetében visszakereshetők. A korábbi 9. és 10. szakasz nem marad párhuzamos szabályforrás.

Az S ellenőrzés célzottan a vitatott seed-tesztet, a provider/validáció/PDF-mentés határait, az ütközésteszteket, a kaput és a workflow-sablont nézte át. **Nem új teljes audit:** az R1/R2 futásideje és leltára történeti adat; azóta megváltozott tesztkészletre nem vetítjük ki. A dokumentum szerkesztése nem módosít alkalmazáskódot, aktív szabályzatot vagy backlog-státuszt.

## 1. Közös értékelés

**A fő probléma a bizonyítási felelősség rendezetlensége.** Sok értékes, olcsó domain-teszt mellett drága, teljes alkalmazásindításra épülő UI-tesztek ismétlik az előkészítést. Eközben a valóban archivált PDF és JSON közös szerződése, egyes betöltési határok és néhány erős nevű assertion hiányosan védett.

A tesztkészlet megtartandó. Nincs indok tömeges törlésre, keretrendszercserére, kötelező tesztdarabszámra vagy teljes projektet 100%-os coverage-re kényszerítő kapura. A meglévő tesztírási utasítások mellől a szintválasztás, az előzetes keresés, a redundancia és az assertion minőségének közös rendje hiányzik.

A közös irány:

1. Egy üzleti szabály részletes mátrixa a legkisebb megfelelő szinten éljen; magasabban az összekötést bizonyítsuk.
2. A gyenge invariáns-teszteket javítsuk, és a hiányzó validációs/tárolási eseteket célzottan pótoljuk.
3. Kis fixture és injektálható tároló adjon követhető laptesztmintát; a teljes seed maradjon az adat-integritás és néhány valódi integrációs eset eszköze.
4. A PDF-tartalomvizsgálat, a böngészős véglegesítés és a kézi szakmai elfogadás kapjon külön felelősséget.
5. A falidőt, a célzott fejlesztői iteráció idejét és a kézi ellenőrzésből kiváltott munkát külön mérjük.

Az E2E bevonása az R1 és E irányát követő **egységesített ajánlás**. R2 korábban külön döntésre halasztotta; ezt a fenntartást a K1 őrzi. Az E2E nem gyorsítási ígéret, és nem viszi böngészőbe a teljes árlista-admin mátrixát.

## 2. Bizonyítékok és történeti mérések

R1 teljes, kockázatalapú tesztleltárt, import-/assertion-/mock-keresést, a kritikus családok részletes olvasását és futtatást végzett. Két memóriabeli validációs próba is készült; R2 a hivatkozásokat újraellenőrizte és újrafuttatta a készletet. Egyik sem végzett instrumentált coverage-, mutációs vagy ismételt flakiness-mérést. Nem állítjuk, hogy minden paraméterezett eset külön kézi szimulációt kapott.

### R1 futtatási eredménye (2026-09-05)

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

### R2 ismételt mérése (2026-09-06)

Windows, Node v26.4.0; 102 fájl / 1882 eset; első fájl indulásától az utolsó végéig **95,4 s**, fájlfutási idők összege 525 s, a 45 domain-fájlé 0,64 s. A `PriceListAdminPage.test.tsx` 53 esete 95,1 s-ot vitt el: ebben a futásban ez uralta a kritikus utat.

**Mérési pontosítás:** a fájlfutási idők összege nem CPU-idő. R2 „három PriceListAdminPage-fájl / 68 eset / 146 s CPU” részösszege nem teljes családleltár: R1 függelékében négy ilyen fájl szerepel. Az R1 F05 táblázatában az `OsszesTervSection` 43 esete is eltér a leltár 42 esetétől. Ezeket nem használjuk kapuküszöb vagy gyorsulásigény alapjául; a pilot friss, azonos hatókörű méréssel indul.

A fixture-csökkentés jól indokolt első beavatkozás, de az „egyetlen hatásos kar” túl erős következtetés. Fájlfelosztás önmagában is rövidítheti a kritikus utat, ha van szabad worker, miközben a teljes munkát és memóriaigényt nem feltétlenül csökkenti. A 117,35 → 95,4 s különbség eltérő HEAD-ek és futások között nem optimalizálási bizonyíték.

## 3. Amit érdemes megőrizni

- **Domain-szabályok jól olvasható ellenpéldákkal.** A `penznemValtas`, `nyelviReview`, `orokoltJelzesek`, `nemetNev`, `paciensDuplikacio` és `tomegesAr` tesztcsaládok több valódi üzleti különbséget választanak szét: hiányzó ár/0, kézi/örökölt érték, igazolt/igazolatlan nyelv, eltérő kerekítési esetek.
- **Hibainjektálás valódi tárolóútvonalon.** A `DemoStorage` részleges írást és párhuzamos mentést is vizsgál; több UI-teszt ellenőrzi, hogy íráshibánál megmarad a bevitt adat és nem jelenik meg sikerjelzés.
- **Érdemi integrációs esetek.** Az `App.test.tsx` létrehozás–véglegesítés–új verzió és unmount–újramount piszkozat-visszaállítás útjai valódi összekötési hibákat fognak meg a helyettesített PDF-határig.
- **Jó szintválasztásra már van minta.** A `VeglegesitesChecklist.test.tsx` a megkapott diagnózis megjelenítését ellenőrzi, a domain-teszt a diagnózis képzését. A `NumberField.test.tsx` a bevitel saját interakcióit teszteli. Ezekből érdemes szabályt csinálni.
- **Független elvárt értékekre is van tudatos példa.** A `planCopy.test.ts` szándékosan eltérő forrás-orvost és alapértelmezett orvost, illetve hamis mentett összesítőt használ. A `PenzugyiOsszesites.test.tsx` eltérő mentett és újraszámolható összegekkel bizonyítja, melyik jelenik meg.
- **Nincs nagyméretű snapshot-fájlokra épített vak jóváhagyási rutin.** A vizsgált készlet túlnyomórészt konkrét értékeket és viselkedést állít. A „snapshot” a domainben mentett pillanatképet jelent, nem Jest/Vitest snapshotot.
- **A workflow-tesztek valódi ideiglenes Git-repókkal dolgoznak.** A kapu helyettesítése itt helyes határválasztás: a teszt a commit/push koreográfiáját vizsgálja, nem akar minden esetben újra alkalmazást buildelni.

## 4. Egységesített megállapítások

Az F01–F12 alapja R1; R2 ezeket nagyrészt megerősítette. Az alábbi szöveg már tartalmazza a pontosításokat. Az időérzékeny leltár- és méretadatok az R1/R2 állapotára vonatkoznak; az S által észlelt változások külön szerepelnek. Új tétel tervezésekor a megmaradt hiányt ismét a kódon kell ellenőrizni.

### F01 — Súlyos: a PDF és a mentett JSON közös szerződését nem bizonyítja az automatikus készlet

**Bizonyíték:** [App.test.tsx](../../app/src/App.test.tsx), [PreviewPage.test.tsx](../../app/src/pages/PreviewPage.test.tsx) és [PreviewPage.pdfHiba.test.tsx](../../app/src/pages/PreviewPage.pdfHiba.test.tsx) állandó vagy kézzel vezérelt `usePDF`-választ adnak, `%PDF-fake` tartalommal. A mock nem rendereli a neki átadott dokumentumot. A [TervDocument.test.tsx](../../app/src/pdf/TervDocument.test.tsx) külön teszteli a dokumentumot, de a PDF-primitíveket DOM-elemekre cseréli, az `Image` pedig `null`.

**Történeti termékhiba, azóta javítva:** R1 idején a JSON v1, a PDF v0 lehetett, mert a tároló a már elkészült PDF mentésekor osztott verziót. A `pdf-verzioszam-mentett-verzio` tétel javítása a `8f4d285` commitban, a tesztvárakozás korrekciója az `aebe32a` commitban szerepel; a tételfájl már nincs a backlogban. S ellenőrzésekor a `PreviewPage` előre foglalt azonosítót/verziót renderel, a `DemoStorage.doSavePlan` pedig elutasítja az eltérő, nem nulla verziót. Erre már célzott storage-tesztek is vannak.

**Megmaradt módszertani hiány:** a helyettesített PDF-hookból nem következik a tényleges archivált PDF és JSON azonossága. A javított termékhibát nem nyitjuk újra reprodukció nélkül; az E2E-pilot a közös szerződés tartós regressziós védelmét adná.

**Miért módszertani hiba:** külön-külön jól tesztelt rétegek együtt továbbra is hibás eredményt adhatnak. Az `App.test.tsx` „végponttól végpontig” megnevezése így túl tág: alkalmazás-integrációs teszt helyettesített PDF-határral.

**Javaslat:** néhány valódi rendereléses, mentés utáni PDF–JSON szerződésteszt. Ellenőrizze ugyanazon archivált verzió tervazonosítóját, verzióját, páciensnevét, pénznemét és fizetendőjét. V1 létrehozása és V2 hozzáfűzése is szerepeljen. Ne csak a PDF-fejléc létezését vagy a fájl `%PDF` kezdetét vizsgálja. A részletes szövegfeltételek maradhatnak a gyors DOM-tesztekben.

**Dedup:** a lezárt termékhiba története a fenti commitokban él. Új munka csak a még hiányzó bizonyítékra szóljon; Node-render és böngészős mentés felelőssége az 5.3-ban külön szerepel.

### F02 — Súlyos: a betöltési validáció esetmátrixa lényegesen gyengébb a határ fontosságánál

**Bizonyíték:** nincs közvetlen `validate.test.ts`. A [DemoStorage.test.ts](../../app/src/storage/DemoStorage.test.ts) és [DemoDraftStorage.test.ts](../../app/src/storage/DemoDraftStorage.test.ts) ugyanazzal a többszörösen hibás sorral tesztel: `mennyiseg: 'sok'`, miközben mindkét ármező hiányzik. Ha a mennyiség ellenőrzése véletlenül eltűnne, az ármező hiánya miatt a teszt továbbra is hibát kapna. Nem derül ki, melyik guard él.

A [DemoStorage.test.ts](../../app/src/storage/DemoStorage.test.ts) neve szerkezetileg hibás törzsadatot ígér, de a bemenet `not valid json {{{`. Ez a JSON-parsert ellenőrzi, nem a törzsadat szerkezeti validálását. A sémaverzió-elutasításnak van jó terv-, draft- és törzsadattesztje; az árlista/beállítás betöltési mátrixa nincs ugyanilyen részletességgel védve.

**További helyi bizonyíték:** a változatlan [validate.ts](../../app/src/domain/validate.ts) `assertPlanShape` és `assertPriceListShape` függvénye egyaránt elfogadott `10.5` pénzértéket a memóriában futtatott próbában. A guard véges számot ellenőriz, nem egészet. Ez nem hipotetikus coverage-hiány; a „pénz egész” invariáns ezen a határon ténylegesen nincs kikényszerítve. A próba nem vizsgálta végig az ilyen adat teljes UI/PDF útját.

**Javaslat:** érvényes minimális fixture-ből induló, egyetlen mezőt elrontó táblázatos tesztek. Külön: `null`, hibás típus, hiányzó tömb/mező, ismeretlen ártípus, nem véges szám a közvetlen guardon, tört pénzérték a JSON-betöltési határon. Minden fájltípushoz egy-egy storage-integráció igazolja, hogy tényleg meghívja a validátort. A szándékosan megengedett régi/opcionális mezőhiányok pozitív kontrollt kapjanak; ne legyen automatikus sémaszigorítás termékdöntés nélkül.

**R2 kiegészítése, S pontosításával:** a guardok nem ellenőrzik teljeskörűen az előjelet, a mennyiség értéktartományát, az ID-egyediséget, kategóriahivatkozást vagy a beállítások enumjait. Ez nem jelenti azt, hogy minden elfogadott negatív érték hibás: a `kedvezmenyOsszeg` szándékosan előjeles, negatívként felár, és az `osszesitok.kedvezmeny` is lehet negatív (`totals.ts`). A „minden pénz nemnegatív” szigorítás ezért hibás lenne. Az egész pénzérték követelménye már invariáns; az új értéktartományok, betöltéskori elutasítás és kompatibilitás részletei K9-ben döntendők el. Pozitív kontroll kell az opcionális `inaktivOrvosok` mezőre és az érvénytelen alapértelmezett orvos dokumentált visszaesésére is.

**Korábbi review pontosítása:** a [2026-08-25-i architektúra-review](2026-08-25-arch-react-review.md) teljes közvetett lefedetlenséget is állított. Ezt a jelenlegi készletre nem lehet kijelenteni: közvetett negatív tesztek vannak, csak szűkek és részben rosszul izoláltak. A `branded-minor-penztipus` és `sema-migracios-keret` már létező ötletek; a futásidejű bemenetvédelem nem helyettesíthető pusztán TypeScript-branded típussal.

### F03 — Súlyos: több invariáns tesztneve erősebb, mint a tényleges assertion

| Konkrét teszt | Mit bizonyít ma? | Hogyan kellene erősíteni? |
|---|---|---|
| [DemoStorage.test.ts](../../app/src/storage/DemoStorage.test.ts), „appends v2 without touching v1” | A korábbi tervben `verzio === 1`, és két verzió listázható | V1 teljes JSON-tartalma és PDF-bájtjai mentés előtt/után azonosak; V2 tartalma szándékosan eltér |
| [planCopy.test.ts](../../app/src/domain/planCopy.test.ts), „nem mutálja a forrás tervet” | A páciensobjektum referenciája változatlan | Mély másolattal összevetés vagy fagyasztott bemenet; azonos referencia mellett a mezői még módosulhatnak |
| [ItemPicker.test.tsx](../../app/src/pages/planEditor/ItemPicker.test.tsx), név-/kategóriatalálat nem duplikálódik | Olyan esetet használ, amelyben a kategórianév nem is illeszkedik | Ugyanaz a tétel egyszerre legyen név- és kategóriatalálat; a felkínált ID egyszer szerepeljen |
| [useMentesJelzo.test.tsx](../../app/src/components/useMentesJelzo.test.tsx), unmount-takarítás | Nem történik `console.error` | Az időzítő megszűnését ellenőrizni, pl. kontrollált timer-darabszámmal |
| [TervDocument.test.tsx](../../app/src/pdf/TervDocument.test.tsx), „teljes szélességben” | Két szöveg sorrendjét ellenőrzi | A névből kivenni a geometriai ígéretet; a szélességet renderelt PDF-en bizonyítani |
| [seed/plans.test.ts](../../app/src/storage/seed/plans.test.ts), „minden demó sor hivatkozik…” | A paraméterezett sorlista nem üres; az utána álló két `it.each` minden releváns sor hivatkozását és árát ellenőrzi | **R2 helyesbítése, S ellenőrizte:** csak a név javítandó. Az üresség-őrt meg kell tartani; nincs itt hiányzó soronkénti lefedettség |

A timer-példa különösen félrevezető: a React 18 óta nincs általános figyelmeztetés unmount utáni `setState`-re, tehát a konzol csendje nem bizonyít takarítást. [React hivatalos változásleírás](https://react.dev/blog/2022/03/08/react-18-upgrade-guide#other-notable-changes).

Ezeknél nem új, a régi mellé tett teszt az első lépés. **A meglévő bizonyítékot kell megjavítani.** A „milyen hibás implementáció mellett maradna ez zöld?” kérdés legyen kötelező önellenőrzés az invariánsokat védő teszteknél. Az itt felsorolt ellenpéldák assertion-elemzésből származnak; nem futtatott mutációs kampány eredményei.

### F04 — Súlyos: a tárolási hibatesztek nem fedik a teljes műveleti szerződést

**A rollback implementálva van; a hibamátrix bizonyítéka hiányos.** A [savePlan implementáció](../../app/src/storage/DemoStorage.ts) három kulcsot ír: terv, PDF, páciensindex. A részleges írás tesztje csak a második írás hibáját injektálja, új pácienssel. Ez jó kezdés, de nem bizonyítja a harmadik írás hibájánál a rollbacket, meglévő páciens indexének megmaradását, korábbi verziók épségét vagy azt, hogy a hibás művelet után a sorosító lánc tovább használható.

A `createPatient` és `savePatientData` szintén több írást végez; a jelenlegi tesztek elsősorban a sikeres kimenetet és UI-hibajelzést vizsgálják. A [PlanStorage](../../app/src/storage/PlanStorage.ts) jövőbeli implementációváltásához nincs újrafuttatható, implementációfüggetlen szerződésteszt-csomag. A `DemoStorage` belső kulcsainak vizsgálata a demóadapter tesztjében helyes, de nem lehet a leendő fájlrendszer-tároló teljes elfogadási bizonyítéka.

**Javaslat:** a mentés szerződése mondja ki a hibánként elvárt megmaradó állapotot. Kevés, célzott eset: első/második/harmadik írás hibája; meglévő páciens; sikeres újrapróbálás; párhuzamos mentés; régi verziók teljes megőrzése. A közös szerződés adapterfüggetlen viselkedést vizsgáljon, a kvóta-/fájlrendszer-specifikus hibainjektálás külön adaptertesztben maradjon. Az Electron valós fájlrendszer-, jogosultság- és megszakítási eseteit a 2. fázis előtt kell hozzáadni, nem most minden leendő platformra előre implementálni.

### F05 — Közepes: a költség néhány túl nagy UI-tesztcsaládba koncentrálódik

| Tesztfájl | Eset | Mért fájlfutási idő |
|---|---:|---:|
| `PriceListAdminPage.test.tsx` | 52 | 113,12 s |
| `PreviewPage.test.tsx` | 32 | 75,09 s |
| `PatientPage.test.tsx` | 49 | 44,94 s |
| `PlanEditorPage.sorok.test.tsx` | 41 | 42,68 s |
| `demo/OsszesTervSection.test.tsx` | 42 a leltárban; R1 táblája 43-at írt | 40,24 s |
| `SettingsPage.test.tsx` | 36 | 32,34 s |

Az árlista-admin fájl 52 esetéhez jellemzően teljes, 118 tételes árlista és teljes provider-lánc épül fel. A [fixture](../../app/src/pages/PriceListAdminPage.test.tsx) minden tétel EUR-árát törli, majd a tesztek sokszor az összes sort renderelik egyetlen mező vagy megerősítés vizsgálatához. A `PreviewPage.test.tsx` 1956 sorban sokszor az `App` első képernyőjéről indul ugyanazon véglegesítési szabály előkészítéséhez.

**Mérési cél:** a teljes falidő és a célzott fájl újrafuttatásának ideje; az összeadott fájlfutási idő csak másodlagos diagnosztika (2. szakasz).

**Javaslat:** normál UI-teszthez 2–4 tételes, célzott árlista; teljes seed csak adat-integritásra és néhány smoke/nagyadat-esetre. A véglegesítés legtöbb tesztje célállapotból induljon, a szükséges valódi providerekkel; a páciens létrehozását és a tételfelvitelt csak azok a flow-tesztek járják végig, amelyek ezt az összekötést vállalják.

A fájlok puszta szétvágása javíthatja a párhuzamos ütemezést, de változatlanul sok munkát végez, és több memóriát kérhet. Először a fölösleges előkészítést kell csökkenteni, majd ugyanazon környezetben újramérni. A pénzmező billentyűzet-/blur-/Enter-viselkedését vizsgáló teszteket nem szabad általánosan `fireEvent.change`-re cserélni a gyorsulásért.

### F06 — Közepes: van valódi redundancia, de nem minden átfedés törlendő

**Konkrét összevonási/törlési jelöltek:**

| Hely | Értékelés |
|---|---|
| [money.test.ts](../../app/src/domain/money.test.ts) és [másik eset](../../app/src/domain/money.test.ts) | Ugyanaz a bemenet, ugyanaz a hívás, ugyanaz az elvárt kimenet. Tényleges duplikáció; a HU/DE × HUF/EUR mátrixban elég egyszer |
| [penznemValtas.test.ts](../../app/src/domain/penznemValtas.test.ts) FIX árlista-visszatöltés és a „nincs automatikus FX” eset | Ugyanazt a 45000→15000 útvonalat ismétli; a külön invariánsnevet megőrizve összevonható, az anchor frissítésével |
| [planCopy.test.ts](../../app/src/domain/planCopy.test.ts), „az orvos mindig a globális default…” és „a default akkor is érvényesül, ha … MÉG AKTÍV” | Mindkét fixture-ben aktív a forrás-orvos, ugyanazok az adatok. Összevonható vagy a másodiknak ténylegesen eltérő eset kell |
| [DemoStorage.test.ts](../../app/src/storage/DemoStorage.test.ts), `paths re-export sanity` | Csak az importált osztály `.name`-jét ellenőrzi. A storage ütközési útját nem hívja. Önálló viselkedésvédelemként elhagyható |
| [TervReszleteiPage.test.tsx](../../app/src/pages/TervReszleteiPage.test.tsx) | A teszt-helper regexének kényelmét védi egy másik oldalon. A helper lekérdezését kell jól szűkíteni; ez önmagában nem termékkövetelmény |

**Az ütközésteszt vitájának feloldása (R2 + S):** a `.name` assertion nem véd érdemi viselkedést. A `paths.test.ts` „throws VersionConflictError for an existing directory name” esete viszont már védi a helper kivételosztályát; a `DemoStorage.test.ts` a foglalt verzió eltérését és az egyező verzió elfogadását is teszteli. A `savePlan` ma eltérő foglalásnál sima `Error`-t dob, nem `VersionConflictError`-t. Nem írunk mesterséges belső ütközést vagy új kivételszerződést pusztán a gyenge teszt pótlására. Előbb az elérhető adapterhibamódot és megmaradó állapotot azonosítjuk; a gyenge teszt törölhető, illetve tényleges hiány esetén viselkedéstesztre cserélhető.

**Áthelyezendő lefedettség:** a `PatientPlanChains` közös megjelenítési szabályainak nagy része a `demo/OsszesTervSection.test.tsx` alatt él, miközben a `PatientDetailPage.test.tsx` is vizsgálja a láncok alapnyitottságát. Érdemes a részletes közös viselkedést a komponens saját tesztjébe szervezni; a két oldalon a megfelelő páciens, beágyazási mód, navigáció és állapot-visszaállítás összekötését megtartani.

**Ami jogos átfedés:** a domain előleg-túllépése, a checklist hard besorolása, az UI véglegesítésgombjának tiltása és a PDF „—” megjelenítése külön hibamódot fed. Ugyanígy a `NavGuardContext`, a tab-váltás és a workflow-lépéselhagyás nem azonos belépési út. Ezek összevonása védelemvesztés lenne.

A deduplikáció egysége: **azonos előfeltétel + művelet + megfigyelt eredmény + réteghatár**. Azonos tesztnév, függvénynév vagy hasonló setup nem elég a törléshez. Whitespace-normalizálás is adhat téves találatot, ha épp a string eleji/végi szóköz a vizsgált eset.

### F07 — Közepes: a fixture-ek egyszerre túl nagyok és túl erősen kötődnek a production seedhez

A `TestProviders` teljes alkalmazásállapotot és `DemoStorage`-ot ad, a [StorageProvider](../../app/src/storage/StorageContext.tsx) pedig maga hozza létre a tárolót. Emiatt a célzott lapteszt is seedelésre, konkrét localStorage-kulcsokra és több, az adott esethez nem tartozó providerre támaszkodik. A test-wrapperben a lépésőr viszont **mindig továbbengedő helyettesítés** — így a wrapper használata önmagában nem jelent valódi workflow-integrációt. Ez dokumentált, de a helper neve nem teszi láthatóvá.

Konkrét kötődések: `118 / 118` számlálók az adminban; `t041` és konkrét ár a [szerkesztő-fixture-ben](../../app/src/pages/planEditor/testFixtures.tsx); `Nagy Éva` konkrét láncszerkezete sok listatesztben. Egy demóadat-módosítás emiatt üzleti szabálytól független teszteket is elronthat.

**R2 központi javaslata:** explicit tárolóinjektálási lehetőség és kis memóriabeli tesztadapter/builder kell a laptesztekhez. Ez F05/F07 közös előfeltétele, de az adapterfüggetlen storage-szerződést React-provider nélkül is lehet vizsgálni. A provider teljes `StorageContextValue` szerződését kell végiggondolni (`ready`, PDF-visszaolvasás, demó-only metódusok is), nem elég két propot bevezetni, miközben a többi metódus rejtetten másik `DemoStorage`-ra mutat. A pontos prop/factory megoldás technikai tervezési feladat. A valódi adaptert bizonyító integrációs és E2E-tesztek továbbra is a valódi adaptert használják.

Másik végletként a `Plan`, `Sor`, `Paciens` literáljai sok fájlban ismétlődnek. Szükség van néhány kis fixture-builderre, **de nem minden adatot elrejtő univerzális factoryra**. A teszt lényegét adó pénz, státusz, nyelv, verzió és ID maradjon a tesztben látható. Hibás bemenet vizsgálatánál a builder legyen alapból érvényes; a hibát helyben kell hozzáadni.

Production helper használható előkészítésre, ha nem éppen azt teszteljük. Elvárt számot azonban ne ugyanazzal a számolófüggvénnyel állítsunk elő, amelyet a teszt bizonyítani akar. A roundtrip-teszt hasznos, de önmagában két egymással összhangban hibás átalakítást is elfogadhat; maradjon mellette konkrét, független példa.

### F08 — Közepes: az aszinkron sorrend és a takarítás védelme egyenetlen

**Erős részek:** `AppState.test.tsx` két, egy tickben indított updater hatását ellenőrzi; a tárolóteszt párhuzamos mentést vizsgál; a `useMentesJelzo` kontrollált promise-t és fake timert is használ.

**Gyenge részek:** a három PDF-hook mockban nincs tesztelt `loading: true` átmenet. A PDF-hibateszt két külön induló állapotot vizsgál, nem a siker → új render → hiba → újrapróbálás → friss siker teljes állapotváltását. Az `updatePdf` hívásszámának növekedése nem bizonyítja, hogy az újrapróbálás után friss PDF készült. A [usePlanPdfObjectUrl](../../app/src/storage/usePlanPdfObjectUrl.ts) későn visszaérkező betöltést kezel, de a laptesztek nem kényszerítik ki azt, hogy A verzió kérése B után fejeződjön be.

Sok hibainjektálás végén kézzel fut `vi.restoreAllMocks()`. Ha az előtte álló assertion elbukik, a helyreállítás kimarad; a következő teszt másodlagos hibája elrejtheti az első okot. A `useListStateMemory.test.tsx` `Object.defineProperty`-vel változtat `scrollY`-t, amelyre a spy-helyreállítás önmagában nem megoldás.

**Javaslat:** célzott, kézzel feloldható promise-okkal tesztelni a betöltési sorrendet, elnavigálást és retry-t; a tisztítást `afterEach`/`finally` garantálja. Óraérzékeny esetekben rögzített idő, dátumlogikánál néhány helyi éjfél-/DST-/szökőnap-határeset. Ne kerüljön minden UI-teszt fake timer alá: a billentyűzetes teszteknek ez külön integrációs költség lehet.

R2 kiegészítése: a `test-setup.ts` már teszthibává emel DOM-beágyazási konzolhibákat. A `key`/`act()` figyelmeztetések hasonló kezelése csak a jelenlegi zaj felmérése után javasolt (K8). A `restoreMocks` nem állít helyre minden globális módosítást: a kézzel átírt property-descriptorokat, fake timereket és tárolóállapotot saját takarításuk kezeli.

Egy sikeres futás alapján nem állítok általános flakiness-problémát. Ezek konkrét determinisztikussági és diagnosztikai kockázatok.

### F09 — Közepes: az élő működésleírás részben történeti naplóvá vált

A tesztnevekben és `describe` blokkokban sok `backlog-…`, „N. tétel”, „korábbi viselkedés”, „ma” és „változatlan” fordulat maradt. Például a `totals.test.ts` több csoportja így szerveződik. A törölt terv nélkül ezek egyre kevésbé mondják meg, **mi a jelenlegi szabály és mikor alkalmazható**.

A [root CLAUDE.md](../../CLAUDE.md) mentett pillanatképre mutató anchorja a `totals.test.ts` nem-mutáló összehasonlítási tesztjére mutat. Az a teszt hasznos, de nincs benne élő árlista-változtatás vagy mentett dokumentum újranyitása; a teljes, hivatkozott termékinvariánsnak csak egy részét bizonyítja.

**Javaslat:** viselkedés szerint szervezett csoportok, rövid előfeltétel–akció–eredmény nevű esetek. A változás története a Gitben maradjon. A kötelező invariáns-anchor a valóban megfelelő réteghatárra mutasson. Ne legyen minden teszt átnevezéséből külön takarítási projekt; az érintett tesztcsalád refaktorakor rendezhető.

R2 csökkenő történetinév-korlátot (ratchet) javasolt. Ez a jelenlegi „allowlist nincs” elvvel egyeztetendő, és a puszta darabszám nem tilt minden új nevet: egy törlés mellé egy új rossz név még beleférne. A módszer külön döntés (K6).

A teszt nem teszi automatikusan helyessé a leírt működést. Ha egy regresszió elrontja a kimenetet, az agent nem írhatja át pusztán a tényleges új értékre az elvárást. Előbb el kell dönteni, hogy szándékos termékváltozás, hibás teszt vagy hibás kód történt.

### F10 — Közepes: a coverage és a tesztminőség jelenleg nem mérhető rendszeresen

A [vite.config.ts](../../app/vite.config.ts) nem határoz meg coverage-beállítást, az [app/package.json](../../app/package.json) nem ad coverage-parancsot vagy coverage-provider csomagot. A zöld suite és a nagy esetszám ezért nem mondja meg, mely production ágak maradnak ki.

Nem javaslok teljes projektet kötelező 100%-ra hajtó küszöböt. Először egy diagnosztikai mérés kell, amely a **nem importált production fájlokat is tartalmazza**. A Vitest alapértelmezett coverage-listája csak a futásban importált fájlokat mutatja, ezért explicit `include` szükséges. [Vitest coverage-dokumentáció](https://vitest.dev/guide/coverage.html).

Javasolt követés: kritikus modulok ágai, leglassabb fájlok, elsőre bukó/újrafutásra zöld esetek, és a fontos tesztek által megfogott szándékos hibák. A mutációs ellenőrzés később kis körben — `totals`, validáció, verzióőrzés, véglegesítési besorolás — lehet hasznos. Ne induljon egész repós mutációs CI vagy tesztdarabszám-cél.

R2 olcsó első mérésként `slowTestThreshold`-ot és CI lassúlistát javasolt. A globális 15 s timeout nem teljesítménycél; önmagában sem a csökkentése, sem az emelése nem javítás. A Node/jsdom szétválasztás nyeresége mérendő, a korábbi becsült 5–15 s nem bizonyított gyorsulás.

Az F03 példái mutatják, miért nem elég önmagában a coverage: egy sor lefuthat úgy is, hogy a teszt rossz tulajdonságot ellenőriz.

### F11 — Közepes: a helyi és CI-kapu, illetve a tesztőrök szerződése eltér

A CI futtatja a `test:workflow` parancsot, de a [workflow/lib.mjs `gate()`](../../scripts/workflow/lib.mjs) és a `/implement` négyes kapuja csak build/lint/test/docs-check. Így a workflow-scriptek saját regressziója a helyi „teljes kapu” után csak a push CI-jában derülhet ki. **A kapulisták tulajdonosát és azonosságát rendezni kell.**

A [docs-check tesztfelismerése](../../scripts/docs-check.mjs) csak `app/src/**/*.test.ts(x)` fájlokra vonatkozik; a skip/only regex az egyszerű `.skip(` és `.only(` alakot ismeri. A `.skip.each`, `.only.each`, a hívás előtti whitespace és a `scripts/*.test.mjs` nincs azonos védelem alatt. A jelenlegi keresés nem talált aktív skip/only használatot; ez az őr hiánya, nem jelenlegi kihagyott tesztek állítása.

R2 további alakokat is jelzett (`skipIf`, `todo`). A tiltott kihagyás felismerése és az új alakokra vonatkozó szabály megalkotása külön kérdés; az E2E-s `fixme` és a feltételes kihagyás kezelése K7-ben szerepel.

A docs-check saját negatív fixture-tesztje hiányzik, a workflow-tesztek pedig szándékosan helyettesítik a kaput, így azt nem vizsgálják. Egy jól működő szabályzat gépi védelmét is minimális elfogadott/elutasított példákkal kell tesztelni. Ha új tesztfájlnév kerül bevezetésre, pl. `*.integration.test.tsx` vagy `e2e/*.spec.ts`, a felismerés és az őr hatókörét együtt kell hozzáigazítani.

A CI Node-verziója `lts/*`, az R1/R2 helyi futása v26.4.0 volt. A [test-setup](../../app/src/test-setup.ts) maga is dokumentál korábbi Node/localStorage-különbséget. Célszerű egy reprodukálható alapverziót megadni; több verzió csak tudatos kompatibilitási ellenőrzésként fusson.

### F12 — Közepes: a vizuális és böngészős védelem kézi; az automatizálás után a hívási rend is rendezendő

A `/manual-checks` jó és konkrét eljárás. Nem helyes azt állítani, hogy a PDF/canvas/CSS réteget soha nem ellenőrzik: a [2026-08-10-i böngészős jelentés](2026-08-10-browser-validation.md) valódi PDF-bájtokat és vizuális hibát is tárgyal, többek között a SemiBold-font problémáját.

Viszont ez nem CI-ban ismétlődő védelem. R1 elavult `/finish`-hívásrendet talált; S ellenőrzésekor a [manual-checks skill](../../.claude/skills/manual-checks/SKILL.md) már megnevezi az `/implement` 5b és az `/implement-batch` hívót. Az E2E bevezetésekor az összes hívó, a megmaradó szeletek és az önálló `all` futás szerepe együtt rendezendő, nem egy régi eltérés változatlan fennállását feltételezve.

**Javaslat:** a kézi szakmai/olvashatósági ellenőrzés megmarad, néhány ismételhető, kritikus technikai állítást pedig automatizált böngészős/PDF-smoke teszt vegyen át. Ez jövőbeli módszertani változtatás, nem a jelenlegi „csak kézzel indítva” szabály csendes felülírása. Az izolált Chrome-profil és a kizárólag szintetikus adat változatlan követelmény.

## 5. Egységes tesztelési koncepció, az E2E-vel együtt

### 5.1 Alapelv: egy részletes szabálymátrix, több célzott összekötési bizonyíték

Egy szabály összes értékkombinációját azon a **legkisebb határon** teszteljük, ahol az üzleti jelentése megmarad. Magasabb szinten azt vizsgáljuk, hogy a komponensek tényleg ezt a szabályt használják, a helyes adatot adják át, és a felhasználó helyes kimenetet kap.

Ez nem kötelező unit/integráció/E2E százalékarány. A projekt sok tiszta domain-logikája indokolja az olcsó unit-tesztek nagy számát; a kliensoldali tárolás és a szerződéses PDF indokol néhány erős integrációs és valódi rendereléses tesztet. A Testing Library felhasználóhoz közeli interakciókra építő elve ehhez jól illeszkedik. [Testing Library alapelvek](https://testing-library.com/docs/guiding-principles/).

| Szint | Mit bizonyítson? | Elsődleges hely / környezet | Mi nem tartozik ide? |
|---|---|---|---|
| Statikus kapu | Típushelyesség, tiltott import/API, dokumentációs hivatkozás, tesztfuttatás szabálya | TypeScript, oxlint, docs-check; saját kis őrtesztek | Típussal már kizárt alakok újraellenőrzése minden UI-tesztben |
| Domain-egység | Számolás, döntési táblák, transzformációk, invariánsok és határesetek | Production modul melletti `.test.ts`; tiszta moduloknál Node | DOM, navigáció, teljes demóseed |
| Adapter-/szerződés-integráció | Írás/olvasás, verziók, snapshot, hibánál megmaradó állapot | `storage/`; közös szerződés + adapterenkénti hibatesztek | A domain teljes kombinációs mátrixa |
| Komponens-/hook-viselkedés | Bevitel, fókuszátadás, állapotváltás, callback, megjelenítés | Komponens melletti `.test.tsx`, RTL/jsdom; kis fixture | Valódi geometria, fontbeágyazás, letöltött PDF minősége |
| Alkalmazás-integráció | Valódi providerek/router/tároló összekötése; guard, autosave, véglegesítés | Néhány célzott út, egyértelmű nevű tesztcsalád | Minden variáns megismétlése a kezdőlaptól |
| Valódi PDF-render | Dokumentumtartalom és renderer célzott szerződése | Node + `renderToBuffer`, helyi fontok, PDF-szövegkinyerés | A böngészős blob-frissülés és véglegesítés bizonyítása |
| Valódi böngésző és PDF | Production build, CSS/asset/CSP, valódi PDF és mentés egyezése, billentyűzetes fő ciklus | Kevés izolált Chromium-smoke; külön PDF-artefaktumvizsgálat | Minden validációs input E2E-ben |
| Kézi szakmai/UX | Olvashatóság, nyomtatvány elrendezése, fogorvosi munkafolyamat, szakmai/jogi tartalom megítélése | Doki ellenőrzése + kijelölt manual-check szelet | Automatizálható számtani állítások kézi ismételgetése |

A Node/jsdom szétválasztás ne vak könyvtárglob legyen: `torzsadatBetoltes.test.ts` például tároló-integráció. A könyvtárstruktúra nem helyettesíti a függőségek vizsgálatát.

### 5.2 Konkrét lefedettségi felelősség a jelenlegi alkalmazásban

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

**Példa a pénzügyi bővítésre:** R1 a `totals.test.ts` közös fixture-jében egy fázis egy sorát, `mennyiseg: 1`-gyel találta. A részletes összesítési mátrixhoz kell eltérő mennyiségű több sor, több fázis, üres aggregátum, sor- és tervszintű eltérés együtt. Ez nem teszt minden szorzó helperhez külön: a nyilvános összesítő függvényeken néhány független, kézzel számolt eset elég.

### 5.3 A valódi PDF és a böngészős mentés külön felelőssége

**Feloldott technikai vita (R1/R2/E):** Node-ban is készíthető valódi PDF a `renderToBuffer` API-val. Ez alkalmas a dokumentum tartalmi és renderelési szerződésének célzott vizsgálatára, helyi NotoSans-fontokkal. [React-pdf Node API](https://react-pdf.org/docs/v4/node).

Egy helyesen előállított fixture PDF-je és JSON-ja közötti egyezés azonban nem bizonyítja, hogy a felület véglegesítéskor ugyanazt a friss blobot mentette el. Ehhez a tényleges véglegesítési folyamatot és annak kimenetét kell vizsgálni. **A közös ajánlás: gyors tartalomtesztek + kevés Node-render + a böngészős archiválás E2E-tesztje.** Ezek nem ismétlik meg egymás teljes mátrixát; az eszköz bevezetése K1-től függ.

A mentési teszt elfogadási szerződése:

- A felhasználói véglegesítés után ugyanazon archivált verzió **tényleges JSON-ját és PDF-bájtjait** olvassa vissza.
- Tervazonosító, verzió, páciensnév, pénznem és fizetendő egyezzen; legyenek függetlenül rögzített elvárt üzleti értékek is. Két egyformán hibás kimenet egyezése kevés.
- V2 tartalma szándékosan különbözzön; mentése után V1 teljes JSON-tartalma és korábban mentett PDF-bájtjai maradjanak azonosak.
- A letöltési eset a fájl nevét és tartalmát is vizsgálja. Ha az archivált fájl letöltésével olvassuk vissza a PDF-et, igazolni kell, hogy az az archívumot adja, nem újrarenderel. A Playwright hozzáfér a letöltött fájlhoz. [Downloads](https://playwright.dev/docs/downloads).
- Szövegkinyerő szükséges; a nyers bájtok regexes keresése és a `%PDF` fejléc nem tartalmi bizonyíték. A parser dev-függőségét és a Node-render/E2E közös segédjét a PDF-feladat választja ki.

A szövegkinyerés nem bizonyít glyphminőséget, tördelést vagy képmegjelenést. Két friss render teljes hash-egyezését nem követeljük; a már eltárolt V1 előtte/utána bájtegyezését igen.

### 5.4 E2E-pilot: három fő folyamat, majd célzott bővítés

| Pilot | Megfigyelhető eredmény | Kiváltható korábbi bizonyíték |
|---|---|---|
| P1 — Billentyűzetes tételfelvitel | Három egymást követő felvétel egér nélkül; helyes sorok, ürülő kereső és visszakapott fókusz | A manual-check ismétlődő tételfelviteli ciklusa |
| P2 — Piszkozat újratöltése | Bevitt mezők valós oldalfrissítés után visszaállnak, ugyanazon teszten belüli tárolóból | Az `App.test.tsx` azonos felelősségű unmount–remount esete |
| P3 — Véglegesítés és V2 | Az 5.3 teljes archiválási szerződése, tényleges böngészős PDF-renderrel | Az `App.test.tsx` azonos létrehozás–véglegesítés–V2 útja a mockolt PDF-határon túl is |

R1 öt esetet vázolt; E három pilotot javasolt. Az összevont ajánlás a fenti hárommal indul; **bővítésként** jön a placeholder/nyilatkozat, sávos csillag/lábjegyzet és kedvezménytilalom valós PDF-en, majd a hosszú többoldalas terv magyar ékezetekkel és canvas→PNG→PDF fogtérképpel. Escape/Tab, popover-geometria két felbontáson, font/CSP és fájlnév az érintett technikai állítások alapján kerülhet át. A részletes PDF-szövegmátrix továbbra is az olcsóbb szinteken él.

A production builden PDF-et előállító teszt értékét a korábbi `Buffer is not defined` hiba is indokolja; javításának böngészős bizonyítéka a [2026-09-06-i jelentésben](2026-09-06-manual-checks-all.md) szerepel.

### 5.5 Technikai keret

1. **Külön E2E-készlet:** `app/e2e/*.spec.ts`, `app/playwright.config.ts`, `@playwright/test` dev-függőség, `test:e2e` parancs. Vitest ne gyűjtse be; lint/typecheck és a tesztőr fedje le. Lockfile és egységes Node-verzió rögzítse a környezetet.
2. **Kezdetben Chromium:** saját indítású izolált tesztböngésző, kizárólag szintetikus adatokkal. Tesztenként friss context, saját localStorage; kontrollált idő és állapot. A reload-teszten belül megmarad a context. [Playwright izoláció](https://playwright.dev/docs/browser-contexts).
3. **Production build helyben:** `vite preview`, `127.0.0.1`, fix port és `strictPort`; példa útvonal: `http://127.0.0.1:4173/dental-plan/#/`. A `webServer` kezelje a preview életciklusát, a kapuban `reuseExistingServer: false` mellett. Így friss build, base path, asset és production CSP a vizsgálat tárgya. [Web server](https://playwright.dev/docs/test-webserver).
4. **Valódi mentési út:** P3 production `DemoStorage`-ot és valódi PDF-renderelést használ. A laptesztek fake tárolója itt nem megfelelő helyettesítés. Az előkészítés/visszaolvasás tartsa a tárolóhatárt; a pontos elérési mód a pilot technikai terve, production UI-ba tett tesztkapu nélkül.
5. **Stabil megfigyelések:** szemantikus feliratok, fókusz, visszatöltött adat, tényleges fájl; állapotra várás önkényes sleep helyett. Alkalmazás-/CSP-hibák ellenőrzése, hiba esetén trace/screenshot; feltöltött diagnosztika kizárólag szintetikus adatot tartalmazhat. Az újrapróbálás nem rejthet el bizonytalan hibát.
6. **Electron külön határ:** a webes pilot nem bizonyítja a csomagolt app indulását vagy a fájlrendszer/jogosultság/folyamatmegszakítás viselkedését. Az [Electron-terv](../desktop-app-migration-plan.md) már saját indulástesztet kér; ezt a második fázisban össze kell hangolni. A Playwright Electron API kísérleti. [Electron API](https://playwright.dev/docs/api/class-electron).

A bevezetés előtt a gyökér böngészőszabályának saját indítású tesztböngészőre vonatkozó részét és a manual-checks szerepét kifejezetten rendezni kell (K1). A valós profilok, futó felhasználói böngészők és valódi páciensadatok védelme marad. Helyi/CI szintetikus teszt nem változtatja meg az alkalmazás backend- és külsőadatküldés-tilalmát.

### 5.6 Helyi és CI-kapu

**Javasolt célállapot (K1):** a stabil, kicsi pilotkészlet legyen a helyi teljes kapu és a deploy előtti CI része. Az `npm test` maradhat Vitest; a friss buildet külön `test:e2e` vizsgálja. A `test:workflow` helyi hiánya F11 alapján ettől függetlenül javítandó.

```text
Egységes Node + npm ci
lint + Vitest + test:workflow + docs-check
typecheck + production build
Chromium környezet-előkészítése (CI; helyben egyszeri telepítés)
test:e2e a friss dist ellen
ugyanennek a dist-nek a Pages-artifact feltöltése
deploy csak sikeres kapu után
```

A `.github/workflows/deploy.yml` build-jobja PR-en és master-pushon ellenőriz; a Pages-artifact feltöltése előtt kell az E2E-lépés. A tesztelt `dist` után nincs új build. Külön E2E-job esetén a deploy attól is függjön. Hibadiagnosztikai artefaktum hibás tesztnél is megőrizhető. [Playwright CI](https://playwright.dev/docs/ci-intro).

A `gate()` és az összes érintett script-/skill-hívó kapulistája együtt változzon; a workflow-tesztek ne hívják rekurzívan a saját valódi kapujukat. Az egyező csomag ellenőrzése saját workflow-elfogadási esetet kapjon. A Node-verziót például verziófájl + `engines` + CI `node-version-file` rögzítheti; a kompatibilis konkrét verzió technikai választás.

**Pilotmérés:** azonos HEAD-en és környezetben mérjük a teljes helyi kaput, a célzott E2E-t és a CI idejét, a sikertelen első futásokat, a diagnózis használhatóságát és a kiváltott kézi perceket. A kapuba emelés számszerű feltételeit K1-ben kell rögzíteni; nincs előre állított gyorsulás vagy stabilitás.

### 5.7 Migráció és megmaradó kézi ellenőrzés

Egy régi teszt/checklist-pont csak akkor törölhető vagy szűkíthető, ha megneveztük az új tesztet, az átvett állítást és réteghatárt, és az új bizonyíték legalább egyenértékű. A P1–P3 nem alap az egész `App.test.tsx` törlésére. Domain-/storage-hibainjektálás, a külön guardok és a releváns komponensinterakciók maradnak a saját szintjükön.

A `/manual-checks` megmarad feltáró vizsgálatra, új interakciók és értelmezést igénylő vizuális részletek áttekintésére. Az átvett ismétlődő pont helyén az automatizált tesztre utalás maradjon. Az egytételes úton a doki a munkafát szakmailag és használhatóság szerint fogadja el; ezt a gépi kapu nem helyettesíti. A batch út meglévő feltételei külön érvényesek.

Kevés, előzetesen ellenőrzött vizuális referencia később segíthet. Platformonként rögzített környezet kell; Windows/Linux között ne legyen közös pixelpontos elvárás. Képeltérés vizsgálandó változás, a baseline frissítése nem automatikus hibafeloldás. A screenshot nem bizonyítja a referencia szakmai helyességét. [Visual comparisons](https://playwright.dev/docs/test-snapshots).

## 6. Agenteknek szánt döntési rend — javasolt közös mag

Tartós helye egy rövid `docs/TESTING.md`, a gyökér `CLAUDE.md` pointerével. A leltár és a mérések ebben a review-ban maradnak. A jelenlegi 4000 karakteres gyökérbudget miatt a pointer hozzáadásakor redundanciát kell kivenni, nem budgetet emelni. Az érintett skillek hivatkoznak a szabályra, nem másolják azt.

1. **Keresés és szint:** nevezd meg a megfigyelhető állítást, keresd meg a meglévő bizonyítékát, és válassz a meglévő eset javítása, bővítése, új réteghatár vagy indokoltan nincs új teszt között. Új helperhez nem jár automatikusan új tesztfájl.
2. **Egy részletes mátrix:** a legkisebb megfelelő szinten; magasabban célzott összekötési eset. A dinamikusan szűrt/generált esetlista ürességét védeni kell, ha attól észrevétlenül megszűnne a bizonyíték. A minden `it.each`-re kiterjedő szigor K5 kérdése.
3. **Független elvárás:** ne a bizonyítandó függvény számolja az expected értéket. A roundtrip mellé konkrét, független példa kell.
4. **Izolált negatív eset:** érvényes minimális fixture-ből egy releváns feltételt ronts el; ellenőrizd a megfelelő hibaokát/típusát, ne pusztán azt, hogy valami dobott. Nem kötelező minden belső hiba teljes szövegét befagyasztani.
5. **A név ígéretét bizonyítsd:** „nem mutál” → teljes előtte/utána tartalom vagy megfelelő fagyasztott bemenet; „nem ment” → mellékhatás hiánya; „megmarad” → visszaolvasott adat; „PDF” → egyértelmű DOM-tartalomteszt vagy valódi render/archivált fájl.
6. **Kicsi fixture, megfelelő tároló:** célzott laptesztben kis adatok és injektált adapter; valódi adapterintegrációban/E2E-ben valódi adapter. A teszt lényegét adó pénz, státusz, nyelv, verzió és ID maradjon látható. A seed csak akkor indokolt, ha maga a seed vagy annak valódi bekötése a tárgy.
7. **Mockhatár:** saját üzleti függvényt ne mockolj ott, ahol annak bekötését bizonyítod. Technikai mock korlátját nevezd meg; az átengedő lépésőrrel dolgozó wrapper nem teljes workflow-integráció.
8. **Interakció:** szemantikus lekérdezés és szűkített `within`; `userEvent`, amikor a gépelés/blur/Enter a tárgy. Geometriát valódi renderen bizonyíts, ne DOM-osztályból.
9. **Determinista takarítás:** sikertelen assertion után is lefutó `afterEach`/`finally`; kontrollált promise-ok az async sorrendhez, célzott fake timer. A `restoreMocks` nem univerzális állapot-visszaállító.
10. **Meglévő teszt javítása:** regressziós teszt a javítás nélkül a megfelelő okból bukjon. A tényleges visszavonásos próba kötelező és jelentendő köre K4-ben döntendő; a „milyen hibás implementációt fog meg?” önellenőrzés általános.
11. **Deduplikáció:** azonos előfeltétel + művelet + megfigyelt eredmény + réteghatár. Törlés előtt legyen megnevezett megmaradó bizonyíték; átnevezéskor az invariáns-anchor is frissüljön.
12. **Élő működésleírás:** jelen idejű viselkedésnevek, történeti tételazonosító nélkül. Elvárást nem írunk át pusztán a hibás új kimenetre. Szerződéses PDF-szövegnél a szó szerinti assertion indokolt; egyszerű megjelenítési változáshoz elég lehet a meglévő és a vizuális védelem.

**Workflow-bekötési ajánlás (K2):** a `/plan` `Verification` része marad megfigyelhető viselkedés; a meglévő teszt a `Current state`-ben szerepel. Az `/implement` mondja ki a szintválasztást és a diff-önellenőrzésben a hozzáadott/kiváltott bizonyítékot. A `/finish` a teljes kaput és a törlések indokát ellenőrzi; nem nyílik külön jóváhagyási kör minden tesztre.

## 7. Eltérő álláspontok és eldöntendő kérdések

### 7.1 Amit az összevonás már feloldott

| Eltérés | Egységesített következtetés |
|---|---|
| R1 seed-lefedettségi kifogása ↔ R2 üresség-őr értelmezése | R2 helyes: a részletes esetek megvannak, névjavítás kell (F03). |
| R1/E böngészős PDF ↔ R2 Node-render | Mindkettő érvényes, eltérő bizonyítási határral. Node-render önmagában nem védi a böngésző által archivált blobot (5.3). Az eszköz bevezetése K1. |
| Összeadott fájlfutási idő ↔ falidő/„CPU” | Falidő és célzott iteráció az elsődleges; a fájlfutások összege nem CPU-idő és nem gyorsulási bizonyíték (2. szakasz). |
| Gyenge `.name` teszt törlése ↔ kötelező `savePlan` kivételosztály-teszt | Az elérhető adapterhibamód szerződése dönt; a helper osztálytesztje már létezik, új kivételt nem vezetünk be csak a teszt miatt (F06). |
| „Minden lapteszt fake-et kapjon” ↔ valódi integráció | Célzott lapteszt fake-kel; tárolóintegráció és mentési E2E valódi adapterrel (F07). |
| Minden negatív pénz tiltása ↔ a felár működése | Az előjeles kedvezmény/felár létező domain-viselkedés, nem új kérdés. Az egész pénz invariáns; a mezőnkénti betöltési politika K9 (F02). |
| Sorszámok ↔ névvel hivatkozás | A koncepció fájl + tesztnév/szimbólum hivatkozást használ; a korábbi mérések HEAD-hez kötöttek. Új tervben a `test:` anchor szükség szerint használható. |
| R1 elavult manual-checks hívásrendje ↔ mai skill | A skill időközben változott; E2E mellett a megmaradó feladatokat és hívókat kell rendezni (F12, 5.7). |

### 7.2 Döntési lista

**Minden válasz jelenleg nyitott.** Az ajánlás szerkesztői javaslat, nem elfogadott döntés. K1–K3 a megvalósítás keretét/sorrendjét, K4–K8 a módszertani szigort, K9 a validáció termékhatárát zárja le. A technikai rutinkérdésekre (pontos prop/factory, parsercsomag, verzió) a későbbi terv ad választ.

#### K1 — E2E bevezetése és kapuba emelése

- **Eltérés:** R1/E böngészős védelmet és E szerint helyi+CI kaput javasol; R2 a szabály szövege miatt külön döntésre halasztaná, addig Node-renderrel.
- **Döntendő:** elfogadod-e az 5.4 három pilotját és a saját indítású, izolált Chromium kifejezett engedélyezését helyben és szintetikus CI-adattal? A pilot mikor váljon kötelező kapuvá?
- **Ajánlás:** igen; előbb a szabályok összehangolása és a három pilot, mérés után kötelező helyi+CI kapu. Javasolt induló elfogadás: azonos HEAD-en 10 egymást követő helyi és 10 CI-futás megmagyarázatlan teszthiba nélkül, elvárt hibánál használható diagnosztika; retry ne alakítsa zölddé az instabil első futást. A teljes helyi kapu elfogadható többletidejét másodpercben a pilothoz előre rögzítsük. Ezek javasolt kritériumok, nem már mért eredmények.
- **Alternatíva:** már az első pilot kötelező; vagy E2E később, addig Node + jelenlegi manual-checks, a böngészős mentési bizonyíték korlátját vállalva.
- **Blokkolja:** T6/T8; a Node-, validációs és fixture-munka haladhat nélküle.
- **Válasz:** _nyitott; E2E igen/nem/halasztva; kapuba emelés feltétele; elfogadható helyi többletidő: … s._

#### K2 — Hol legyen a tesztelési szint kiválasztása?

- **Eltérés:** R1 a `/plan` `Verification` részébe is tenné; R2 megőrizné a „nem hogyan tesztelni” sablont, és az `/implement`-be tenné.
- **Ajánlás:** R2 változata, a 6. szakasz szerint. A tervezés már nevezi a meglévő bizonyítékot a `Current state`-ben; nem kell a dokit teszttechnikával terhelni.
- **Alternatíva:** a `/plan` sablon tudatos bővítése rövid szint + tesztcsalád megadással.
- **Blokkolja:** T1 workflow-szövege; az alkalmazás tesztjavításait nem.
- **Válasz:** _nyitott._

#### K3 — Mi legyen az első megvalósítási lépés?

- **Eltérés:** R1 előbb szabályzatot, R2 előbb injektálható tárolót és másolható mintatesztet kér.
- **Ajánlás:** a koncepció döntései után **kis kódminta, majd azonnal a rá mutató rövid szabályzat**, a nagyobb tesztrefaktor előtt. A kicsi, önálló invariáns-javítások nem függenek a teljes fixture-migrációtól.
- **Alternatíva:** a rövid szabályzat az első lezárt tétel, a mintát a következő adja.
- **Blokkolja:** T1/T2 egymáshoz viszonyított sorrendje; nem jelöl ki backlog-`Prio`-t.
- **Válasz:** _nyitott._

#### K4 — Mikor kötelező ténylegesen visszavonni a javítást a piros teszt bizonyítására?

- **Eltérés:** R1 általában bugfixnél írja elő; R2 csak invariáns-anchoros tesztnél tenné kötelezővé és jelentendővé.
- **Ajánlás:** regressziójavításnál általánosan mutassuk ki, hogy a célzott teszt a javítás nélkül a megfelelő okból bukik; invariáns-tesztnél ezt az átadásban is nevezzük meg. Egyszerű tesztátnevezéshez és viselkedést nem változtató refaktorhoz nincs külön mutációs kör. A próba izolált másolatban/diffben történjen, más munkájának visszaállítása nélkül.
- **Alternatíva:** tényleges piros-próba csak az invariáns-anchorokhoz; más bugfixnél indokolt assertion-elemzés.
- **Blokkolja:** T1/T3 elfogadási és jelentési rendje.
- **Válasz:** _nyitott._

#### K5 — Kell-e minden paraméterezett teszt mellé üresség-őr?

- **Eltérés:** R2 minden `it.each` mellé kötelezővé tenné; R1 nem kér ilyen általános szabályt.
- **Ajánlás:** csak futáskor adatból képzett/szűrt listánál, ha az üres lista csendben kivenné a vállalt bizonyítékot; statikus, helyben látható nem üres táblához ne legyen ismétlődő külön teszt.
- **Alternatíva:** minden `it.each`-lista kötelező őrzése.
- **Blokkolja:** T1/T3 szabálya; a meglévő seed üresség-őre mindkét változatban marad.
- **Válasz:** _nyitott._

#### K6 — Hogyan akadályozzuk meg az új történeti tesztneveket?

- **Eltérés:** R1 érintéskori takarítást, R2 rögzített, csak csökkenő számlimitet kér. A repó jelenlegi elve: „allowlist nincs”.
- **Ajánlás:** most érintéskori névjavítás és diff-önellenőrzés; automatikus legacy-kivétellista vagy számlimit nélkül. Későbbi teljes névrendezés után globális tiltó őr vezethető be.
- **Alternatíva:** tudatos szabálymódosítással átmeneti ratchet. Meg kell határozni, mikor szűnik meg, és hogyan akadályozza meg új rossz nevek becserélését a régiek helyére; puszta darabszám ehhez kevés.
- **Blokkolja:** T7 névőr-scope-ja, T1 szövege.
- **Válasz:** _nyitott._

#### K7 — Mely tesztkihagyási alakok legyenek tiltottak?

- **Eltérés:** R1 a meglévő `.skip`/`.only` tiltás hiányos felismerését javítaná; R2 a `skipIf`/`todo` alakot is felvetette. E2E mellett `fixme` és platformfeltételek is megjelenhetnek.
- **Ajánlás:** minden kötelező készletben tiltott a kizárólagos futtatás, kihagyás és befejezetlen eset (`only`, `skip`, láncolt/alias alakok, `skipIf`, `todo`, `fixme`); a tennivaló backlogban él. Platformkülönbséget projektkijelölés kezeljen, ne rejtett tesztkihagyás. Az őr fedje az app-, script- és E2E-fájlokat, pozitív/negatív fixture-ekkel.
- **Alternatíva:** csak a jelenlegi tiltás megbízható kiterjesztése; további alakokról külön döntés a konkrét használatkor. Aktív új kivétel egyik változatból sem következik automatikusan.
- **Blokkolja:** T7, majd az E2E kapuba emelése.
- **Válasz:** _nyitott._

#### K8 — A React-figyelmeztetések is buktassanak?

- **Forrás:** R2 új javaslata, nem közösen elfogadott követelmény; a meglévő DOM-beágyazási őr kiterjesztése `key`/`act()` jelzésekre.
- **Ajánlás:** előbb zajfelmérés, célzott javítás, majd ismert alkalmazási figyelmeztetések teszthibává emelése. Nincs általános konzolelnémítás vagy új allowlist. Környezeti hiányt megfelelő tesztkörnyezettel/határral kezeljünk.
- **Alternatíva:** első körben csak diagnosztikai jelentés, a jelenlegi őr változatlan.
- **Blokkolja:** T9 figyelmeztetés-őr része; az async sorrend és takarítás javítását nem.
- **Válasz:** _nyitott._

#### K9 — Milyen hibás/régi adatot utasítson el a betöltés?

**Termék- és kompatibilitási döntés**, nem a teszttechnika feladata. A már kimondott egész pénz és magasabb sémaverzió tiltását nem nyitjuk újra; a hibás régi állomány kezelését kell meghatározni. A felsorolt ajánlások mind nyitottak:

| Részkérdés | Ajánlott kiindulás | Válasz |
|---|---|---|
| Mennyiség: nulla, negatív, tört; piszkozat és végleges terv azonos szabályú-e? | Végleges tervben pozitív egész; a szerkesztés alatti üres/0 állapot draft-kompatibilitását külön vizsgálni. Tört mennyiség elfogadása esetén a pénzkerekítés szabályát is definiálni kell. | _nyitott_ |
| Pénzmezők előjele és nulla | Egész pénz; lista-/tényleges egységár és fizetendő ne legyen negatív. Nulla ár ne azonosuljon a hiányzó árral. Az előjeles `kedvezmenyOsszeg` és az ebből képzett összesítő meglévő felárjelentése maradjon. | _nyitott_ |
| Duplikált tétel-ID, hiányzó kategóriahivatkozás | Árlista-betöltésnél egyértelmű hiba, néma javítás nélkül. Mentett terv pillanatképe ne váljon érvénytelenné pusztán az élő árlista eltérése miatt. | _nyitott_ |
| Ismeretlen nyelv/pénznem, negatív vagy tört `ervenyessegNap` | Érvénytelen enum és értelmetlen napérték elutasítása; a nulla nap üzleti jelentése külön kimondandó. | _nyitott_ |
| Korábbi fájl az új ellenőrzésen elbukik | Az eredeti megőrzése és érthető betöltési hiba; nincs automatikus kerekítés/átírás. Ha migráció kell, külön tétel. A már dokumentált opcionális mezők/fallbackek maradjanak pozitív kontrollok. | _nyitott_ |

**Blokkolja:** T4 új értéktartományainak implementációját; a már érvényes guardok izolált tesztje és a kompatibilitási leltár előtte elkészíthető. A pontos mezőnkénti mátrix a tervben válik végrehajthatóvá, nem egyetlen általános „szigorítsunk mindent” teszttel.

## 8. Megvalósítási bontás és készfeltételek

Ez **feladatvázlat**, nem létrehozott backlog és nem prioritási döntés. K3 ajánlása szerinti indulás: **T2 kis minta → T1 rövid szabályzat → célzott javítások és E2E-pilot → mért kapuba emelés → további rendezés**. T3/T4/T5 önálló biztonsági javításait nem kell a teljes UI-migráció végéig váratni. A függőségek technikaiak; a sorok sorrendje nem `Prio`.

| Jel / javasolt feladathatár | Forrás és előfeltétel | Ellenőrizhető eredmény / készfeltétel |
|---|---|---|
| T1 — Rövid tesztelési szabály és workflow-pointerek | 6. szakasz; K2–K7, K3 szerinti időzítés | Egy `docs/TESTING.md`, budgeten belüli pointerek; plan/implement/finish felelőssége egyértelmű, működő mintára mutat; nincs másolt szabálylista. |
| T2 — Tárolóinjektálás és egy kis laptesztminta | F05/F07; K3 | Teljes, konzisztens provider-szerződés; kis Plan/Sor builder, minimális tesztadapter; egy árlista-admin eset 2–4 tétellel. A valódi production tárolóút változatlan viselkedésű, a minta saját állapotot kap. |
| T3 — Gyenge assertionök és célzott pénzügyi példák | F03/F06; K4/K5 | V1 teljes megőrzése, másolat nem-mutálása, tényleges kettős keresési találat, timer-takarítás bizonyított; félrevezető PDF/seed név javítva. Többsoros/többfázisos/mennyiséges összesítés független elvárással. Törléshez megmaradó bizonyíték megnevezve. |
| T4 — Betöltési validáció és kompatibilitás | F02; K9; meglévő pénztípus/sémamigráció ötletekkel dedup | Egy hibát tartalmazó negatív mátrix, régi/opcionális pozitív kontrollok; minden fájltípusnál valódi storage→validátor bekötés. Tört pénz és elfogadott határok célzottan védettek. |
| T5 — Tárolási hibaszerződés | F04/F06; a valós adaptert vizsgálja, nem függ T2 React-varratától | Első/második/harmadik íráshiba, meglévő páciensindex, teljes korábbi verzió, retry és sorosítás megmaradó állapota; közös adapterfüggetlen szerződés és külön adapterhiba-esetek. Új kivételtípus csak indokolt API-szerződéssel. |
| T6 — PDF-vizsgáló segéd és három E2E-pilot | F01/F12, 5.3–5.5; K1 szabályrendezése | Valódi PDF-kinyerés, kevés Node-render és P1–P3 production builden; az archivált fájlt vizsgálja, független expected értékekkel. Az eredeti PDF-verzióhiba lezárt javítását nem duplikálja. A Node-rész K1 halasztásakor is külön vihető. |
| T7 — Kapu, Node és tesztőrök egységesítése | F11; K6/K7 | Helyi `test:workflow`, CI-val egyező kötelező csomag, reprodukálható Node; őr-fixture-ek az app/script/E2E alakokra. Új történetinév-őr csak a választott szabály szerint. |
| T8 — Pilot értékelése, E2E kötelezővé tétele és első migráció | T6/T7; K1 mért feltételei | Előre rögzített futási/stabilitási feltételek teljesülnek; helyben és CI-ban friss, ugyanazon buildet vizsgáló E2E. Minden kiváltott jsdom/manual esethez konkrét új teszt; doki-elfogadás és megmaradó manual-check hívók rendezve. |
| T9 — Async sorrend, takarítás és figyelmeztetések | F08; figyelmeztetés-őrhöz K8 | A→B betöltés fordított befejezése, elnavigálás, PDF loading/hiba/retry/friss siker kontrollált promise-okkal; takarítás bukó assertion után is. Nincs timeout-emeléssel elfedett versenyhelyzet. |
| T10 — Árlista-admin és további tesztcsaládok rendezése | F05–F07/F09; T2 mintája | Friss előtte/utána falidő; teljes admincsalád leltára, célállapotú Preview setup, saját PatientPlanChains-tesztek, megfelelő oldalbekötések megtartva. Valódi duplikációk és érintett történeti nevek rendezve. |
| T11 — Diagnosztikai mérések és környezetek | F10; alapmérés már T2/T6 előtt, tartós riport itt | Lassúlista, teljes production scope-ú coverage explicit `include`-dal, stabilitási adatok. Node/jsdom váltás csak függőségvizsgálat és mérés után; nincs új globális coverage-/darabszámkapu. Célzott mutáció csak későbbi, méréssel indokolt bővítés. |
| T12 — További böngészős/PDF és későbbi Electron-esetek | 5.4/5.7; T8, Electronnál a migrációs fázis | Jogi PDF-feltételek, többoldalas terv/fogtérkép és indokolt geometria; kevés ellenőrzött vizuális referencia. Csomagolt Electron indulás és valós fájlrendszerhibák külön bizonyítási határ. |

T3, T6, T10 és T12 szükség szerint kisebb tételekre bontandó: egy tételnek egy átadható eredménye legyen. Például T6 természetes bontása: PDF-segéd/Node-tartalom → E2E-harness → billentyűzet/reload → archiválás. A nagyobb vázlatsor nem felhatalmazás minden érintett teszt egyszerre átírására.

### Véglegesítés és taszkolás menete

1. A 7.2 válaszhelyeire kerüljön döntés és rövid indok; az eltérően elfogadott ajánlást az 5–6. szakaszban is át kell vezetni, hogy ne maradjon két álláspont érvényben.
2. A K9 mezőszabályai, K1 kapukritériumai és K3 kezdősorrendje legyenek konkrétak. A későbbi feladatra halasztott kérdéshez az érintett feladat és a feloldás időpontja szerepeljen; ne maradjon észrevétlen implementációs függőség.
3. Friss backlog-dedup után csak a ténylegesen hiányzó munka kapjon ötletet. Kapcsolódó meglévő tételek: [pénz egész validáció](../../backlog/penz-egesz-validacio.md), [sémamigrációs keret](../../backlog/idea/later/sema-migracios-keret.md). A PDF-verziószám termékhibája már lezárt történet (F01).
4. A kiválasztott tételekből a repó szokásos terve készüljön (`Goal / Current state / Approach / Decisions / Verification`, friss `Baseline`, budget); a `Source` erre a review-ra és az F/T jelre utalhat. `Prio` csak kimondott doki/fejlesztői döntésből származik.
5. Tételenként implementáció → előírt kapu → kézi ellenőrzés a munkafán → lezárás/commit/push a meglévő workflow szerint. A koncepció elfogadása nem helyettesíti a termékváltozás kézi ellenőrzését.

**A koncepció akkor végleges:** a fenti döntések lezártak vagy konkrét későbbi függőséghez rendelten halasztottak; a tesztszintek, a kapu és a kézi felelősség egyértelmű; minden elsőként indítandó feladatnak van előfeltétele, elfogadási bizonyítéka és lezárt scope-ja.

## 9. Függelék — az R1 által vizsgált tesztkészlet történeti leltára

A 2026-09-05-i `f090b198e125dd9b5bf942d41d329bb97d084de2` állapot leltára; nem a jelenlegi készlet és nem teljesítendő tesztdarabszám. R2 későbbi részadatai a 2. szakaszban szerepelnek.

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
