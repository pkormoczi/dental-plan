# 04 — Struktúra (architektúra review)

Scope: kizárólag `app/src` (a repo többi része dokumentáció/referencia, lásd
CLAUDE.md "Repo elrendezés"). Read-only elemzés, commit `5a552c3` állapotán.
10 megállapítás, a hat kérdés sorrendjében, mindegyik konkrét file:line-hoz
kötve.

## 1. Hol lakik az üzleti logika?

A domain logika többsége tényleg ki van emelve tiszta függvényekbe
(`domain/totals.ts`, `domain/nev.ts`, `domain/money.ts`, `domain/coverage.ts`,
`domain/blankPlan.ts`, `domain/teeth.ts`, `domain/priceListIds.ts`) — ezek
oldalfüggetlenek, típusból építkeznek, nincs bennük React-hívás. Ez jó
alap. Három helyen viszont nem-triviális döntés van közvetlenül komponensbe
ágyazva:

- **`app/src/pages/PatientPage.tsx:43-92`** (`changeNyelv`,
  `changePenznem`): a D21/D4 szabály — nyelvváltáskor a `nevSnapshot`
  újra-feloldása, pénznemváltáskor a `sorok` törlése — a komponens
  closure-jában él, `confirm()`-mel összefonva.
- **`app/src/pages/PreviewPage.tsx:97-142`** (`finalize`): a véglegesítés
  teljes őrlogikája (név kötelező, hiányzó mezők megerősítése,
  `fallbackSorok` jogi védelmi ellenőrzés D21 szerint) és a mentés+újratöltés
  szekvenciája egyetlen komponens-függvényben van, `alert`/`confirm`-mel.
- **`app/src/pages/PlanEditorPage.tsx:52-55`** (`addLine`): a SAVOS
  alapár-választás (`ar.tipus === 'SAVOS' ? ar.min : ar.ertek`) újra van
  írva itt, holott a `domain/money.ts:32-35` pontosan ezt a logikát
  `basePrice(ar)` néven már exportálja — CLAUDE.md ezt név szerint felsorolja
  a "használd, ne írd újra" listában.

## 2. Mit nem lehet unit-tesztelni a jelenlegi coupling miatt?

Konkrétan: a `PreviewPage.finalize()` (1. pont) egyetlen függvényben
kombinálja a `usePDF` hook state-jét, a `window.confirm`/`alert`-et, a
`storage.savePlan`/`loadPlan` hívást és a jogi fallback-ellenőrzést. Nincs
belőle kiszedhető pure function, amit `plan` + `priceList` bemenettel
meghívva állítanál "ez a döntés, ez a mentett plan" — a teszteléshez az
egész oldalt kell renderelni, a `@react-pdf/renderer`-t és a
`StorageContext`-et is mockolva. Ennek eredménye mérhető: nincs
`PreviewPage.test.tsx` a repóban (`app/src/pages/*.test.tsx` lista), miközben
ez az egyetlen hely, ahol a D9/D21 jogi védelem ténylegesen érvényesül.

Hasonló, kisebb mértékben: `PatientPage.tsx:43-92` logikája tesztelve *van*
(`PatientPage.test.tsx`), de csak úgy, hogy a teszt a teljes komponensfát
rendereli és DOM-eseményeket szimulál — nincs elkülönített
"changeNyelv(plan, nyelv) → new plan" függvény, amit `confirm` mock nélkül,
közvetlenül lehetne hívni.

## 3. Van-e körkörös import vagy modulhatár-szivárgás?

Körkörös importot nem találtam — az importgráf egyirányú:
`pages/ → domain/, design/, state/, storage/, pdf/`;
`state/ → domain/, storage/`; `storage/ → domain/`; `pdf/ → domain/, design/`;
`domain/` semmi máshonnan a `src`-n belül nem importál. Feature-fájl közötti
határsértést sem találtam (pl. egyik page sem nyúl bele egy másik page belső
fájljába).

Van viszont egy `app/`-on kívülre mutató határsértés:
**`app/src/storage/seed/priceList.ts:6`** — `import raw from
'../../../../data/arlista.seed.json'` — négy `../`-vel kilép az `app/`
mappából a repo gyökerén lévő `data/`-ba. A CLAUDE.md "Repo elrendezés" ezt a
mappát kifejezetten csak referenciaként/dokumentációként írja le ("Az
`app/`-on kívüli minden más csak referencia és dokumentáció"), a build mégis
fordítási időben függ tőle (`resolveJsonModule` a `tsconfig.app.json`-ban).
Nincs másolási/validációs lépés a határon — ha valaki a `data/` fájlt
átmozgatja vagy átnevezi (pl. mert "csak referencia"), a build csendben
eltörik.

## 4. Melyik 3 fájl ütközik/nő legvalószínűbben?

- **`app/src/pages/PlanEditorPage.tsx` (628 sor, a legnagyobb `src`-ben)** —
  egy fájlban van a page shell, a `PhaseCard`, a `LineRow` (SAVOS jelzés,
  kedvezmény-számítás, fog/darabszám-eltérés figyelmeztetés), az
  `ItemPicker` (a CLAUDE.md szerint az app UX-kritikus pontja, billentyűzetes
  ciklussal) és inline style-konstansok. Minden jövőbeli módosítás — új
  sor-mező, a kereső dropdown finomítása, a fázis-header átalakítása —
  ugyanabban a fájlban ütközik a többivel, mert nincs komponens-szintű
  elválasztás.
- **`app/src/pdf/TervDocument.tsx` (422 sor)** — a teljes 3 oldalas PDF
  (terv+ár, fizetési feltételek, nyilatkozat+aláírás) egy közös `s`
  style-objektumot használ (29-162. sor). A fájl saját kommentjei már most
  két helyen jelzik a "német layout-törés" kockázatát (46-50, 62-64,
  83-85. sor) — egy hosszabb német mező vagy egy harmadik nyelv bevezetése
  ugyanezt a megosztott style-blokkot kényszerítené módosítani, ahol egy
  javítás a magyar elrendezést is elmozdíthatja.
- **`app/src/pages/PriceListAdminPage.tsx` (441 sor)** — ez az egyetlen
  page, amelyik a megosztott style-primitíveket (`input`, `chip`, `btn`,
  `iconBtn`, `row`) helyben, saját másolatban definiálja újra (389-441. sor)
  a `design/ui.ts` importja helyett (lásd 8. pont). Emellett a CLAUDE.md ezt
  a fájlt jelöli ki a `k01`/"Egyéb kezelések" takarítás (D16) helyszínéül —
  vagyis pontosan ez a fájl van kijelölve a következő nagyobb admin-célú
  bővítésre, miközben már most is saját, drifted stílus-másolatot cipel.

## 5. Mennyire konzisztens a szerkezet önmagával?

Két konkrét, egymástól független kettősséget találtam:

- **Gombstílus, három változatban.** `design/ui.ts:40-52` exportálja a
  `btn()`-t kifejezetten azért, hogy "a képernyők ne duplikálják" (a fájl
  saját fejléc-kommentje, 1-3. sor) — magasság 32px, fontSize 13.
  `PriceListAdminPage.tsx:429-441` egy helyi `btn()`-t definiál (magasság
  30px, fontSize 12.5). `Home.tsx:59-76` egy harmadik változatot,
  `btnPrimary`/`btnSecondary` konstansként (magasság 34px, fontSize 13). A
  doki három vizuálisan eltérő gombméretet lát, ahogy Kezdőlap → Árlista →
  szerkesztő között navigál.
- **Két írási minta ugyanarra a "mentsd el a szerkesztést" problémára.**
  `PlanEditorPage`/`PatientPage` a `plan` piszkozatot kizárólag memóriában
  tartja (`AppState.setPlan`), és csak egyszer perzisztál, a
  `PreviewPage.finalize()`-ban (`PreviewPage.tsx:135`). Ezzel szemben
  `PriceListAdminPage.patchItem` (`PriceListAdminPage.tsx:40-45`) és
  `SettingsPage.patch` (`SettingsPage.tsx:22-24`) minden mezőváltozásnál
  azonnal, szinkron hívást indítanak (`savePriceList`/`saveSettings`) —
  gyakorlatilag minden billentyűleütésnél. Ma ez láthatatlan, mert a
  `DemoStorage` `localStorage`-ba ír. CLAUDE.md "Két fázisú build" szerint a
  `PlanStorage`-ot később `FileSystemStorage` váltja (File System Access
  API) — azon a ponton minden karakterleütés egy valódi fájlírást jelentene
  a teljes `arlista.json`-ra (akár 118 tétel), miközben a tervszerkesztő
  megtartja a puffer-majd-ír mintát. Az interfész maga (D5,
  `docs/05-technologia.md`) nem véd ez ellen, mert a hívási gyakoriság nem
  az interfész kontraktusának része.

## 6. Eltérés a dokumentált konvenciótól

A CLAUDE.md-ben van dokumentált konvenció, és a kód el is tér tőle két
ponton:

- A "Meglévő segédfüggvények — használd, ne írd újra" szabály név szerint
  említi a `basePrice(ar)`-t. A `PlanEditorPage.tsx:55` ennek ellenére
  helyben újraírja a logikáját (lásd 1. pont) a `domain/money.ts:32`
  importja helyett.
- A "Sérthetetlen szabályok" táblázat előírja: "`osszesitok` a fájlból
  számít igaznak, eltérés esetén figyelmeztetni kell". Ennek nincs
  implementációja sehol a `src`-ben: `DemoStorage.loadPlan`
  (`storage/DemoStorage.ts:170-178`) a betöltött `plan.osszesitok`-ot
  módosítás nélkül adja vissza, `PlanHistoryPage.openVersion`
  (`PlanHistoryPage.tsx:65-69`) egyenesen a piszkozatba tölti. A
  `computeOsszesitok` (`domain/totals.ts:24-32`), ami az összehasonlításhoz
  kellene, jelenleg csak mentéskor fut le (`PreviewPage.tsx:132`,
  `storage/seed/plans.ts:22`), betöltéskor soha — az összehasonlítás és a
  figyelmeztetés funkció ma nem létezik.

## A legfontosabb strukturális kockázat

A legnagyobb strukturális kockázat nem egyetlen fájlban van, hanem abban,
hogy a "mikor írjunk a storage-ba" döntés nincs kikényszerítve az
interfészen: a `PlanStorage` maga csak a *hogyan*-t rögzíti (D5), a
*mikor*-t minden oldal maga dönti el, és ma két, egymásnak ellentmondó
minta él egymás mellett — a tervszerkesztő pufferelt, egyszeri mentése, és
az árlista/beállítások azonnali, mezőnkénti mentése (5. pont). Amíg a
`DemoStorage` `localStorage`-ra ír, ez a különbség ártalmatlan; a
CLAUDE.md-ben tervezett `FileSystemStorage`-váltás (File System Access API)
viszont pontosan azon a helyen fog fájdalmassá válni, ahol ma a
legkevésbé látszik — az Árlista adminban, ahol amúgy is a D16 takarítás
miatt a legtöbb jövőbeli szerkesztés várható —, mert a "billentyűnként
fájlba ír" minta ott nem stílushiba, hanem valódi teljesítmény- és
megbízhatósági kockázattá válik (lassulás, verseny-feltételek, esetleg
jogosultság-kérés minden mezőnél). Mivel az interfészcsere szándékosan úgy
van megtervezve, hogy "a `PlanStorage`-on kívül eső kód … változatlan
marad", ez a hívási minta pont az a réteg, amit a terv nem véd — csendben
öröklődik át a 2. fázisba, ha valaki nem nézi át kifejezetten emiatt.
