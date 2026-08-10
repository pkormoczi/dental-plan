# Backlog 1. tétel — Piszkozat-perzisztencia — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 1. tételének ("Piszkozat-perzisztencia —
frissítés/összeomlás ne törölje a félkész tervet") megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció döntése és a részletek kidolgozása a
megvalósító feladata.

## Probléma

Ma a `plan` állapot (`app/src/state/AppState.tsx`) kizárólag memóriában él
(`useState`). Oldalváltás közben megmarad, de frissítéskor vagy
összeomláskor elvész. A `docs/03-funkcionalis-spec.md` "Autosave" szakasza
ezt már a 2. fázisra (IndexedDB) ütemezte — ezt a tételt korábbra hozzuk a
mockup-fázisba, mert a valós fájdalom már most jelentkezik (lásd
`docs/08-backlog.md` Függelék A napja: háromszori újragépelés egy sürgős
hívás miatt elveszett piszkozat miatt).

## Döntések

### 1. Mit véd a perzisztencia

Minden aktív szerkesztést, **`plan.statusz`/`tervId`-től függetlenül** — nem
csak a `statusz === 'PISZKOZAT'` tervet.

**Miért:** a `PatientPage.tsx` kommentje és a `PlanHistoryPage.tsx`
`openVersion` függvénye szerint egy régi, **VEGLEGES** terv új verzióra
nyitása (`loadPlanIntoDraft`) a `statusz`-t változatlanul hagyja —
`'VEGLEGES'` marad az egész szerkesztési munkamenet alatt, amíg újra
véglegesítik. Ha a védelem csak `PISZKOZAT`-ra szűkülne, pont az a jelenet
maradna védtelen, ami a tétel fő motivációja: egy visszatérő páciens
(Nagy Éva) új verziójának szerkesztése.

### 2. Architektúra — külön interfész, nem a `PlanStorage` bővítése

Új, kicsi interfész (pl. `DraftStorage`), a `PlanStorage`/`DemoStorage` pár
mintáját követve: mockupban egy localStorage-alapú implementáció, a 2.
fázisban IndexedDB-alapú implementáció váltja.

**Miért:** a `docs/05-technologia.md` architektúra-diagramja az IndexedDB-t
**testvér-dobozként** rajzolja a `PlanStorage` mellé, nem alá ("IndexedDB —
csak piszkozat-autosave, nem system of record") — ez a különválasztás
szándékos, nem esetleges.

**Kulcs-konvenció:** a piszkozat-kulcs a meglévő `dp:` prefixet kapja
(`app/src/storage/DemoStorage.ts` `PREFIX` konstans). A `DemoStorage.clearAll()`
(amit a `resetDemoData()` is belülről hív) a `dp:` prefixű kulcsokat mind
törli — ez a piszkozatra is **szándékosan** vonatkozik, tehát mind a "Minden
adat törlése", mind a "Demó adat visszaállítása" gomb mellékhatásként törli
a piszkozatot is, külön kód nélkül.

### 3. Írási trigger

Minden `plan`-változásra **azonnal** ír, debounce nélkül.

**Miért:** a terv-objektum kicsi, egy `JSON.stringify` + `localStorage.setItem`
ezen a méreten elhanyagolható költségű — a debounce itt nem
teljesítmény-kérdés, csak egy felesleges adatvesztési ablakot nyitna
összeomláskor, pont azzal szemben, amit a tétel meg akar oldani.

**Kivétel:** az érintetlen, üres piszkozatot (ami megegyezik a friss
`createBlankPlan()` eredményével) **nem** perzisztálja — csak az első
tartalmi módosítás után kezd írni. Enélkül minden "Új terv indítása" után
azonnal létrejönne egy tartalmilag üres, de technikailag létező perzisztált
piszkozat.

### 4. Visszaállítás UX — Home-kártya, nem banner

Induláskor csendes, memóriabeli restore, de a Home (`app/src/pages/Home.tsx`)
egy új **"Piszkozat folytatása" kártyát** kap (páciens név + utolsó
módosítás időpontja), amikor van tartalmas, mentetlen piszkozat. Ez a kártya
maga a visszaállítás jelzése is — nincs külön, a `DemoBanner`
(`app/src/components/DemoBanner.tsx`) mintájára készülő globális sáv.

**Miért:** ma **nincs belépési pont** a memóriában élő piszkozathoz — az "Új
terv indítása" felülírja (`resetPlanDraft()`), a "Korábbi tervek" csak a
lementett verziókat listázza. Egy csendes, de láthatatlan restore
használhatatlan lenne: a doki nem tudná, hogyan jusson vissza hozzá.

### 5. Felülírás elleni védelem — két helyen kell AlertDialog

A meglévő AlertDialog-mintát (`Home.tsx` "Demó adat visszaállítása"/"Minden
adat törlése") kell követnie **mindkét** akciónak, ami ma kérdés nélkül
felülírná az élő piszkozatot, ha az tartalmas és mentetlen:

- Home "Új terv indítása" (`resetPlanDraft()`)
- "Korábbi tervek" → "Megnyitás" (`PlanHistoryPage.tsx` `openVersion` →
  `loadPlanIntoDraft()`)

**Miért:** ugyanaz a kockázat mindkét helyen — a doki figyelmetlenül eldobja
a folyamatban lévő munkáját. A "tartalmas piszkozat" definíciója
konzisztens a 3. döntéssel (eltér a friss `createBlankPlan()`-tól).

### 6. Törlési pontok

- A megerősített reset/megnyitás (5. döntés) pillanatában **azonnal** törli
  a perzisztált piszkozatot — nem várja meg a következő írási triggert.
- Sikeres véglegesítéskor (`PreviewPage.tsx` `doFinalize` siker ága) törli
  — ez már a `docs/03-funkcionalis-spec.md` véglegesítés-lánc 4. lépése
  ("A piszkozat törlése az IndexedDB-ből"), csak itt a `DraftStorage`
  implementáción keresztül.
- "Minden adat törlése" és "Demó adat visszaállítása" — lásd 2. döntés
  (`dp:` prefix-seprés, automatikus).

### 7. Sérült vagy inkompatibilis perzisztált piszkozat

**Elutasítás, látható üzenettel** — nem néma eldobás.

**Miért:** a `CLAUDE.md` D18 szabálya sérthetetlen ("magasabb verzió
észlelésekor a betöltést meg kell tagadni, érthető üzenettel"), és a
`DemoStorage.ts` már ismeri ezt a mintát (`parseJson` +
`assertKnownSchemaVersion`, hibaüzenettel). A piszkozat is `Plan`-alakú
objektum, ugyanaz a szabály vonatkozik rá. Üres tervvel indul, de a dokinak
látszania kell (pl. a Home piszkozat-kártya helyén egy hibaállapotként),
hogy volt piszkozat, amit nem sikerült visszaállítani — nem tűnhet el
nyomtalanul.

### 8. Több böngészőfül

**Elfogadott kockázat, nincs külön védelem.** Egyetlen `dp:piszkozat` kulcs,
egyetlen memóriabeli `plan` slot — több fül esetén last-write-wins, ütközés-
feloldás nélkül. Egyszemélyes asztali eszköznél ez nem realisztikus
munkafolyamat, nem éri meg a többletbonyolultságot.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/storage/` — új `DraftStorage` interfész + mockup-implementáció
  (a `PlanStorage.ts`/`DemoStorage.ts` mintája szerint)
- `app/src/state/AppState.tsx` — a `plan` állapot betöltése/írása a
  `DraftStorage`-on keresztül, "tartalmas piszkozat" ellenőrzés
  (`createBlankPlan()`-hoz viszonyítva)
- `app/src/pages/Home.tsx` — "Piszkozat folytatása" kártya, AlertDialog az
  "Új terv indítása" elé
- `app/src/pages/PlanHistoryPage.tsx` — AlertDialog a "Megnyitás" elé
- `app/src/pages/PreviewPage.tsx` — piszkozat törlése sikeres
  véglegesítéskor (`doFinalize`)
- `app/src/domain/blankPlan.ts` — `createBlankPlan()` mint az "üres terv"
  referencia-érték a tartalmasság-ellenőrzéshez
