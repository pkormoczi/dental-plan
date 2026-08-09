# Backlog 2. tétel — Visszatöltött terv új verziója friss dátummal induljon — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 2. tételének ("Visszatöltött terv új
verziója friss dátummal induljon") megbeszélt megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

Ma a `loadPlanIntoDraft` (`app/src/state/AppState.tsx:109-112`) szó szerint
átveszi a betöltött (korábbi, VEGLEGES) terv `keltezes`/`ervenyesIg`
mezőit, a `doFinalize` (`app/src/pages/PreviewPage.tsx:182-189`) pedig nem
frissíti őket véglegesítéskor sem. Egy visszatöltött terv új verziója ezért
a régi, akár hónapokkal korábbi dátummal nyomtat ki — lásd
`docs/08-backlog.md` Függelék A) napja: Nagy Éva visszatérő páciens új
verziója júniusi keltezéssel készült volna el, csak este, a kinyomtatott
PDF ellenőrzésekor derült ki, hogy majdnem egy lejárt ajánlatot írattak
volna alá.

## Döntések

### 1. Mikor íródik a friss dátum

Betöltéskor, a `loadPlanIntoDraft`-ban — **nem** a véglegesítéskor.

**Miért:** a `PreviewPage.tsx` a `plan` élő state-jéből renderel PDF-et
(`usePDF` hook + egy `useEffect`, ami a `[plan, settings, ...]` változásra
újragenerálja a `pdfInstance`-t). A `doFinalize` ezt a **már korábban
renderelt** `pdfInstance.blob`-ot menti bájtokként — a `finalPlan` objektum
csak a `statusz`/`sablonVerzio`/`osszesitok` mezőket írja felül explicit
módon. Ha a dátumot csak véglegesítéskor írnánk át a `finalPlan`-ba, a
mentett `terv.json` "ma" dátumot mondana, de a ténylegesen kinyomtatott
PDF-oldal (a korábban, a régi dátummal renderelt `pdfInstance.blob`) a régi
dátumot mutatná — ez rosszabb, észrevétlenebb hiba lenne, mint a mai
állapot. A javításhoz egy kényszerített, aszinkron újra-renderelés kellene
közvetlenül mentés előtt, jelentős többletbonyolultsággal.

Betöltéskori írás esetén ez a kockázat nincs: minden lejjebb (élő
előnézet, `pdfInstance`, `finalPlan`) ugyanabból a már frissített `plan`
state-ből származik. Ez emellett pontosan azt a mintát követi, amit a
`createBlankPlan()` (`app/src/domain/blankPlan.ts:42`) már ma is csinál —
a dátum egyszeri bélyegzése a piszkozat létrehozásának pillanatában, utána
érintetlenül hagyva a szerkesztési munkamenet alatt.

### 2. Mely mezők változnak

Kizárólag `keltezes` és `ervenyesIg`. A `docs/01` D7 döntése (soronkénti
pillanatkép) szerint minden más — sorok ára, `nevSnapshot`,
`listaEgysegar`, `tetelId`, `arlistaVerzio` — változatlan marad. A
dátum-frissítés csak a dokumentum-szintű metaadatot érinti, nem árazza
újra a tervet.

### 3. Az érvényesség (`ervenyesIg`) számítási alapja

`ervenyesIg = keltezes + settings.ervenyessegNap`, az **aktuális**
Beállítások-érték alapján — ugyanaz a képlet, mint a `createBlankPlan`-ben
(`app/src/domain/blankPlan.ts:42`, `addDaysIso(today, settings.ervenyessegNap)`).

**Nem** az eredeti terv megőrzött érvényességi ablak-hossza számít (azaz
nem `keltezes + (régi ervenyesIg − régi keltezes)`). Ha a doki időközben
módosította a Beállításokban az alapértelmezett érvényességi napok számát,
az új verzió ezt az újat kapja — konzisztens azzal, hogy ez friss
dokumentum-metaadat, nem soronkénti pillanatkép.

### 4. Feltétel a frissítésre

A dátum-frissítés **feltétel nélkül** fut le minden `loadPlanIntoDraft`
híváskor — nincs külön `statusz === 'VEGLEGES'` őrfeltétel.

**Miért:** a függvény JSDoc-ja szerint (`AppState.tsx:22`) kizárólag
"korábbi terv piszkozatba töltése" a szerepe, és ma az egyetlen hívója
(`PlanHistoryPage.tsx` `openVersion`) mindig VEGLEGES tervet ad át — nincs
ma elérhető, ezen az úton betölthető PISZKOZAT-státuszú terv (az 1. tétel,
piszkozat-perzisztencia, a Home-oldal "Piszkozat folytatása" kártyáján át
tölt vissza, nem a `loadPlanIntoDraft`-on keresztül — lásd
`docs/backlog-1-piszkozat-terv.md` 4. döntés). Felesleges őrfeltételt írni
egy ma nem létező esetre; ha ez a feltevés a jövőben megváltozna (pl. a
`loadPlanIntoDraft`-ot egy másik hívó is elkezdi használni PISZKOZAT
tervekre), ide vissza kell térni.

### 5. Üres/félbehagyott új verzió

Ha a doki megnyit egy régi tervet, de nem véglegesíti, **nem** jön létre
új verziómappa.

**Miért:** ez már ma is így van — a verziómappa csak a `storage.savePlan`
hívásban (`DemoStorage.ts` `doSavePlan`, véglegesítéskor) jön létre. A
betöltéskori dátumfrissítés csak a memóriabeli piszkozatot érinti, nincs
fájlrendszeri melléhatása.

### 6. UI-visszajelzés — sáv színe és szövege

Semleges (nem amber) `Callout.Root`, a meglévő `loadedOsszesitokDiff` sáv
mellett, ugyanazzal a feltételes render-mintával (`PlanEditorPage.tsx`,
kb. 200–210. sor).

Szöveg: *„Az új verzió mai dátummal ({keltezes}) és érvényességgel
({ervenyesIg}-ig) indul — a korábbi tételek ára változatlan."*

**Miért a szín:** ez várt, nem hiba-jellegű viselkedés. A meglévő amber
`Callout` (`loadedOsszesitokDiff`) egy valódi anomáliára — mentett és
újraszámolt összesítő eltérésére — van fenntartva; ugyanazzal a színnel
jelezni a dátum-frissítést félrevezető lenne, mintha ott is valami hiba
történt volna.

**Miért a szöveg:** explicit kimondja, mi változott (dátum + érvényesség)
és mi **nem** (tételek ára) — ez utóbbi direkt eloszlatja a Nagy Éva-eset
mögötti félelmet, hogy a dátumfrissítés esetleg az árakat is újraszámolja.

### 7. Tesztelés

Egységteszt kell a viselkedésre: régi `keltezes`/`ervenyesIg`-ű terv
betöltése → a piszkozat mai `keltezes`-t és az aktuális
`settings.ervenyessegNap` alapján számolt `ervenyesIg`-et kapja, miközben a
sorok ára, `nevSnapshot`-ja és `listaEgysegar`-ja változatlan marad. A
`DemoStorage.test.ts` már fed le hasonló verziózási eseteket, ennek
mintáját érdemes követni.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/state/AppState.tsx:109-112` — `loadPlanIntoDraft` kiegészítése a
  `keltezes`/`ervenyesIg` felülírásával, plusz egy új, a
  `loadedOsszesitokDiff`-fel párhuzamos jelző state (pl. az új dátum/
  érvényesség értékéhez), amit a banner olvas
- `app/src/pages/PlanEditorPage.tsx` (kb. 200–210. sor) — új, semleges
  színű `Callout.Root` a meglévő amber `Callout` mellett
- `app/src/domain/blankPlan.ts:42` — a `keltezes`/`ervenyesIg` számítás
  meglévő mintája (`addDaysIso`, "today" forrás) — ezt kell újrahasználni,
  nem újraírni
- `app/src/domain/date.ts` — `addDaysIso` és a "today" ISO-dátum
  segédfüggvénye
- Teszt: a `loadPlanIntoDraft` dátum-frissítő viselkedésére (lásd 7.
  döntés). Ha a logika ma egy inline closure-ként él az `AppState.tsx`
  `useMemo`-jában, érdemes lehet egy önálló, tesztelhető
  segédfüggvénybe kiemelni (pl. a `domain/` alá) — ez implementációs
  döntés, a megvalósító dönti el