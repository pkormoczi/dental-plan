# Backlog 17. tétel — Terv másolása új tervként / új terv a páciens adataival — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 17. tételének („Terv másolása új tervként
/ új terv a páciens adataival") megbeszélt megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

Egy visszatérő pácienshez ma újra kell gépelni a páciensadatokat egy új
tervhez (`PlanHistoryPage.tsx` fájl-fejléc kommentje már ezt jelöli meg a
fájlrendszer-hozzáférés legerősebb indokaként). Egy A/B alku-változatnál
(két árazási verzió ugyanahhoz a kezeléshez, a legnagyobb értékű
konzultáción) a doki kénytelen vagy felülírni a meglévő tervet, vagy
kézzel újra bevinni az összes sort — az Excelben ez korábban egy „Mentés
másként" volt.

## Döntések

### 1. Két belépési pont, eltérő elhelyezés

- **„Új terv a páciens adataival"** — páciensszinten, a
  `PlanHistoryPage.tsx` páciens név-fejléce mellett (nem egy konkrét
  verzióhoz kötve). Mindig a doki által látott LEGFRISSEBB verzió
  `paciens` adatát használja.
- **„Másolás új tervként"** — verziószálanként, minden verzió sorában, a
  meglévő „Letöltés"/„Megnyitás szerkesztésre" gombok mellett, mert
  konkrétan AZT a verziót másolja (sorokkal együtt).

**Miért:** a két gomb más-más adatkört mozgat — a páciens törzsadat egy
páciens-szintű fogalom, a sorok viszont egy KONKRÉT verzióhoz tartoznak
(egy régebbi verzió sorai eltérhetnek a legfrissebbtől). A gombok
elhelyezése kövesse ezt a különbséget, ne kényszerítse mindkettőt egy
szintre.

### 2. Nincs forrás-nyom a másolaton

A `savePlan` a másolatnak ÚJ `tervId`-t és ÚJ páciensmappát ad (D4-nek
megfelelően — verziómappát soha nem írunk felül, egy önálló új terv nem
csúszhat egy meglévő verziólánc közé). Ez azt jelenti, hogy a „Korábbi
tervek" listában UGYANAZ a páciensnév KÉT KÜLÖN csoportként fog
megjelenni (eredeti + másolat), egymás mellett, ábécérendben szomszédosan.
Ehhez **nem** vezetünk be semmilyen látható forrás-hivatkozást (pl. egy új
`Plan`-mezőt, ami visszamutatna az eredeti tervre) — a doki a névismétlés
alapján érti, hogy összetartoznak.

**Miért:** ez a legkisebb tétel, ami még megoldja a valós problémát
(sorok/páciensadat újragépelésének elkerülése); egy forrás-hivatkozó mező
plusz séma- és UI-munka lenne kimutatható haszon nélkül — a névismétlés a
gyakorlatban elég egyértelmű egy egyszemélyes rendelőben. Ha a doki
később mégis hiányolja, ez egy önálló, kisebb UI-tétel lehet.

### 3. „Új terv a páciens adataival" csak a `paciens` blokkot viszi át

Minden más mező (`nyelv`, `penznem`, `orvos`, `fazisok`, `elolegSzazalek`
stb.) a mai `createBlankPlan(settings, priceList)` friss alapértékét kapja
— pontosan úgy, mintha a doki a Home „Új terv indítása" gombját nyomta
volna meg, csak a páciens mezők már ki vannak töltve.

**Miért:** következetesség a „Beállítások = mai alapérték" elvvel — ha a
doki időközben más orvost/pénznemet állított be alapértéknek, az új terv
azt kapja, nem egy régi terv befagyott állapotát. Ez a doki explicit
választása volt a grill-me munkamenetben.

### 4. „Másolás új tervként" mindent átvisz, ami nem azonosító/állapot/dátum

A `paciens`, `nyelv`, `penznem`, `orvos`, `fazisok` (teljes sorokkal),
`elolegSzazalek` (és egy jövőbeli `kedvezmenyOsszeg`, ha a 16. tétel addig
megépül) mind változatlanul átjönnek. Csak `tervId`/`verzio`/`statusz`
ürül ki/áll `PISZKOZAT`-ra, és a `keltezes`/`ervenyesIg` frissül mai
dátumra (lásd 5. döntés). Az `arlistaVerzio` is VÁLTOZATLANUL átjön — ez
nem kivétel a „minden átjön" szabály alól, hanem ugyanazt a precedenst
követi, mint egy meglévő terv új verzióra nyitása (`ujVerzioDatum.ts`
`frissDatummal` sem nyúl hozzá, lásd a teszt: „az arlistaVerzio,
osszesitok, tervId, verzio, statusz változatlan marad").

**Miért:** ez a valódi „másik verzió ugyanabból" használati eset — a doki
utána módosítja azt, ami eltér az A és B ajánlat között (pl. egy tétel
árát vagy egy sort), nem gépeli be újra az egészet. Egy „csak sorok +
páciens, minden más friss alapértékre áll" változat elvetve, mert
visszatérő pácienseknél (pl. már németül vagy euróban kapott ajánlatot)
ez pluszmunkát adna vissza a dokinak, amit a másolás pont ki akar váltani.

### 5. Dátum-bélyegzés: a meglévő `frissDatummal` újrahasznosítása

Mindkét flow a mai dátumot kapja `keltezes`-nek, `ervenyesIg` pedig ebből
és az AKTUÁLIS `settings.ervenyessegNap`-ból számol — ugyanaz a szabály,
mint egy meglévő terv új verzióra nyitásakor. Ehhez NEM kell új
dátum-logika: a meglévő `frissDatummal(plan, settings, todayIso())`
(`domain/ujVerzioDatum.ts`) pontosan ezt csinálja, feltétel nélkül (nem
csak akkor bélyegez, ha a régi dátum lejárt).

**Miért:** a `ujVerzioDatum.ts` fájl-fejléce ezt már kijelöli az EGYETLEN
forrásnak a betöltéskori dátumbélyegre — újraírása két, egymástól
független dátumszámítás driftjét kockáztatná (pontosan az a hibaosztály,
amit ez a modul orvosolt, lásd `docs/03-funkcionalis-spec.md`
§ Korábbi terv új verzióra nyitása és D22).

### 6. Célpont navigáció: mindkét gomb a Páciens adatlapra visz

„Új terv a páciens adataival" ÉS „Másolás új tervként" is `/paciens`-re
navigál a másolás után — ugyanúgy, mint egy teljesen új terv indításakor
(Home „Új terv indítása" → `resetPlanDraft()` → `/paciens`), NEM
egyenesen a szerkesztőbe (`/terv`), ahogy a „Megnyitás szerkesztésre" tesz.

**Miért:** a doki itt látja és tudja pontosítani az átvett páciensadatot
(pl. időközbeni címváltozás) még mielőtt bármihez hozzáérne a sorok
között; ez a tranzitív lépés (Páciens adatlap, nem egyenesen a
szerkesztő) önmagában is jelzi a dokinak, hogy ez egy ÚJ terv indítása,
nem egy meglévő verzió folytatása — enélkül könnyebben összetéveszthetné
a „Megnyitás szerkesztésre" gombbal (lásd 8. döntés).

### 7. A friss másolat azonnal védett piszkozatnak számít

A másolat valódi tartalommal indul (páciensadat, „Másolás új tervként"
esetén sorokkal is), ezért a `resetPlanDraft` mintáját követi, NEM a
`loadPlanIntoDraft`-ét: a `mentettPlan` állapot NEM ugyanarra a
referenciára áll, mint a most betöltött `plan` — tehát a
`vanMentetlenPiszkozat` azonnal igazra vált. Ha a doki bezárja a lapot
mentés nélkül, az autómentés (`DraftStorage`) elkapja, és a Home
legközelebb felajánlja a folytatást.

**Miért:** a `loadPlanIntoDraft` azért állítja `mentettPlan`-t ugyanarra a
referenciára, mert egy MÁR MENTETT tervet nyit meg (a fájlban biztonságban
van) — a másolat viszont MÉG SOHA nincs elmentve a saját `tervId` alatt,
tehát ténylegesen mentetlen munka, amit tévesen „biztonságosnak" jelezni
adatvesztés-kockázatot rejtene.

### 8. Nincs külön tisztázó megerősítő dialógus

A meglévő piszkozat-felülírás-őr (a `PlanHistoryPage.tsx` `pendingOpen`
mintájának megfelelő `AlertDialog`, ami akkor jelenik meg, ha
`vanMentetlenPiszkozat` igaz) MINDENKÉPP lefut mindkét új gombnál is —
ezen felül NEM kap egy második, kifejezetten a „ez új, önálló terv lesz"
tényt tisztázó dialógust.

**Miért:** a gombfelirat (didaktikus, nem „Új verzió") + a Páciens
adatlapra navigálás (6. döntés, nem egyenesen a szerkesztőbe) együtt már
elég egyértelművé teszi a különbséget a „Megnyitás szerkesztésre"-hez
képest — egy plusz megerősítő kattintás minden egyes használatnál
súrlódást adna hozzá kimutatható haszon nélkül.

### 9. Technikai megvalósítás: tiszta domain-függvények + AppState-wrapper

Két új, tiszta (side-effect-mentes) domain-függvény, a `createBlankPlan`/
`frissDatummal` mintájára (`domain/blankPlan.ts` bővítése, vagy egy új
`domain/planCopy.ts` — az implementáló döntse el a fájlbontást):

- `planUjPaciensselTervhez(plan: Plan, settings: Settings, priceList: PriceList): Plan`
  — lényegében `{ ...createBlankPlan(settings, priceList), paciens: plan.paciens }`
  (3. döntés).
- `planMasolatKent(plan: Plan, settings: Settings, ma: string): Plan` —
  `frissDatummal(plan, settings, ma)` eredményén `tervId: ''`,
  `verzio: 0`, `statusz: 'PISZKOZAT'` felülírással (4–5. döntés), és az
  `osszesitok` a saját (átvett) `fazisok`-ból ÚJRASZÁMOLVA
  (`computeOsszesitok`, `domain/totals.ts`) — NEM a forrás `osszesitok`-
  jának másolata, mert az az EREDETI, már mentett terv fájl-igazsága
  (D7), nem a most keletkező piszkozaté.

Egy új, publikus `AppState` függvény (pl. `copyPlanIntoDraft(next: Plan)`),
ami a fenti tiszta transzformáció EREDMÉNYÉT veszi át (a hívó —
`PlanHistoryPage.tsx` — már elvégezte a `planUjPaciensselTervhez`/
`planMasolatKent` hívást), és a `resetPlanDraft` mintáját követi (nem a
`loadPlanIntoDraft`-ét):

- `setPlanState(next)`
- `setLoadedOsszesitokDiff(null)` — nincs `osszesitokElter`
  korrupció-ellenőrzés egy még soha nem mentett piszkozaton, az a
  ellenőrzés a FÁJLBÓL betöltött adat sérülését hivatott elkapni (P1-3),
  egy frissen származtatott draft esetén nem értelmezhető.
- `setMentettPlan(null)` — azonnal „mentetlen" (7. döntés).
- `setFrissitettDatum(null)` — a `frissDatummal` már a
  `planUjPaciensselTervhez`/`planMasolatKent` HÍVÁSÁBAN lefutott, nincs
  itt újabb dátumváltás, amiről tájékoztató sávot kellene mutatni.
- A `drafts.clear()` hívás (amit a `resetPlanDraft` a végén elvégez) **itt
  NEM fut** — ott azért törlünk, mert egy ÜRES tervre váltunk, aminek nem
  szabad egy régi piszkozatot örökölnie; itt VAN tartalom, amit meg kell
  őrizni (az író effekt az első szerkesztés/render után úgyis felülírja a
  régi piszkozatot a `DraftStorage`-ban).

`PlanHistoryPage.tsx` a meglévő `vanMentetlenPiszkozat` mintát követve
(ugyanaz az `AlertDialog`, mint a „Megnyitás szerkesztésre"-nél, csak egy
harmadik `pending*`-ág vagy egy általánosított `pendingAction` state) hívja
a fenti transzformációt, majd `copyPlanIntoDraft(...)`, majd
`navigate('/paciens')`. A „Másolás új tervként" gomb a kattintáskor
`storage.loadPlan(...)`-nal tölti be a kiválasztott verzió teljes
`Plan`-jét (az `openVersion`/`downloadVersion` mintájára — a lista ma nem
tart készenlétben teljes `Plan`-objektumokat, csak az összesítő
`totalsByVersion`-t).

**Miért:** a CLAUDE.md „Meglévő segédfüggvények" elve — a
dátum-/összesítő-számítás EGYETLEN helyen dőljön el (`frissDatummal`,
`computeOsszesitok`), az `AppState` csak a React-állapot (mentetlenség,
korrupció-diff) bekötéséért felel, ahogy a `resetPlanDraft`/
`loadPlanIntoDraft` már ma is elválasztja a tiszta transzformációt
(`createBlankPlan`, `frissDatummal`) a bookkeeping-től.

### 10. Tesztelés

- Domain szinten (`planCopy.test.ts` vagy `blankPlan.test.ts` bővítése) —
  pure function tesztek: `planUjPaciensselTervhez` csak a `paciens`-t
  viszi át, minden más blank; `planMasolatKent` mindent átvisz az
  azonosító/állapot/dátum kivételével, és az `osszesitok` a friss
  `fazisok`-ból számol.
- `state/AppState.test.tsx` (vagy hasonló) — `copyPlanIntoDraft` után
  `vanMentetlenPiszkozat` igaz, `loadedOsszesitokDiff` null.
- `pages/PlanHistoryPage.test.tsx` bővítése — mindkét új gomb a megfelelő
  helyen jelenik meg (páciensszint vs. verziószint), kattintásra
  `/paciens`-re navigál, és a piszkozat-felülírás-őr lefut, ha van
  mentetlen munka (a meglévő `pendingOpen`-teszt mintájára).

**Miért:** a projekt eddigi gyakorlata — a tiszta transzformációk
önmagukban tesztelhetők (mint `frissDatummal`/`createBlankPlan` ma), a
React-bekötés pedig külön, hogy egy jövőbeli refaktor ne csak az egyiket
törje el észrevétlenül.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Forrás-hivatkozás a másolat és az eredeti között** — lásd 2. döntés,
  tudatosan kihagyva.
- **Külön tisztázó megerősítő dialógus** — lásd 8. döntés, tudatosan
  kihagyva; a piszkozat-felülírás-őr marad az egyetlen guard.
- **A verziólánc/`savePlan` mechanizmusának módosítása** — D4 és a meglévő
  `storage.savePlan` logika teljesen érintetlen; ez a tétel csak egy
  előre kitöltött piszkozatot ad át neki bemenetként, nem változtatja meg
  magát a mentési/verziószámozási logikát.
- **`arlistaVerzio` frissítése másoláskor a jelenlegi árlistára** — lásd
  4. döntés; a `Másolás új tervként" ág a snapshot-elvet követi, mint egy
  meglévő terv új verzióra nyitása.
- **16. tétel (`kedvezmenyOsszeg`) speciális kezelése** — ha az a tétel
  addigra megépül, a mezője ugyanabba a „minden átjön" kategóriába esik a
  teljes-másolás ágon (4. döntés), nincs hozzá külön logika.
- **`schemaVersion` emelés** — nem szükséges, a `Plan` séma nem változik,
  csak új értékekkel töltjük fel a meglévő mezőket.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/blankPlan.ts` (vagy új `app/src/domain/planCopy.ts`) —
  `planUjPaciensselTervhez()` és `planMasolatKent()` új exportok.
- `app/src/domain/blankPlan.test.ts` (vagy `planCopy.test.ts`) — a két új
  pure function tesztjei.
- `app/src/state/AppState.tsx` — `copyPlanIntoDraft()` új export,
  `AppStateValue` interfész bővítése.
- `app/src/pages/PlanHistoryPage.tsx`
  - Páciensszintű „Új terv a páciens adataival" gomb a névfejléc mellett.
  - Verziószintű „Másolás új tervként" gomb minden verzió-soron, a
    „Letöltés"/„Megnyitás szerkesztésre" mellett.
  - A meglévő `pendingOpen`/`AlertDialog` piszkozat-felülírás-őr
    kiterjesztése (vagy egy általánosított `pendingAction` state) mindkét
    új gombra.
  - `storage.loadPlan(...)` hívás a „Másolás új tervként" kattintáskor,
    az `openVersion` mintájára.
- `app/src/pages/PlanHistoryPage.test.tsx` — az új gombok, a navigáció és
  a piszkozat-felülírás-őr tesztjei.
