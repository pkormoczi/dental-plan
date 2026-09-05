# Backlog 116. tétel — „Nyomtatvány szövegei" fül nyelv-előválasztása a hívó terv nyelvén — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 116. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

A Beállítások „Nyomtatványok" fülének belső nyelv-váltója
(`pages/settings/NyomtatvanyokTab.tsx` `templateLang`) mindig magyarra
nyit, függetlenül attól, hogy a doki melyik terv kontextusából navigált
oda. A véglegesítés-őr checklistjének „Nyomtatvány szövegei" gombja
(`domain/veglegesitesOr.ts` `'sablon-kihagyott-szekcio'`/`'sablon-
fallback'`/`'nyilatkozat-placeholder'` tétel) egy statikus
`/beallitasok?tab=nyomtatvanyok` route-ra navigál — ez csak azt viszi át,
melyik TAB nyíljon, azt nem, melyik NYELVEN.

Egy nem-magyar terv Előnézetéről navigálva a doki ezért mindig egy plusz
kattintással vált a Deutsch fülre, mielőtt a ténylegesen releváns
(a figyelmeztetést kiváltó) szöveget látná.

Forrás: `docs/reviews/2026-09-05-doctor-review-nemet-euro.md` 5. megállapítás
(megfigyelt).

## Döntések

### 1. A checklist route-ja a `?tab=` mintáját követve egy `nyelv` query paramétert is átad

A `veglegesitesDiagnozis()` mindhárom, sablonhoz kötött checklist-tétele
(`sablon-kihagyott-szekcio`, `sablon-fallback`, `nyilatkozat-placeholder`)
a route-ba a HÍVÓ `plan.nyelv`-jét is belefoglalja (pl.
`/beallitasok?tab=nyomtatvanyok&nyelv=de`), ugyanazzal az elvvel, ahogy a
`tab` paraméter ma a fület jelöli ki.

**Miért:** a függvény mindhárom helyen a `plan` paraméterrel dolgozik, a
nyelv tehát ingyen elérhető — nincs szükség új adatforrásra. A `?tab=`
minta követése (egy plusz query paraméter, nem egy teljesen új navigációs
mechanizmus) a legkisebb, legkövetkezetesebb változtatás.

Elvetett alternatíva: a nyelvet a React Router `location.state`-jén átadni
(`navigate(route, { state: { nyelv } })`). Elvetve — a `CsekklistaRoute` a
`veglegesitesOr.ts`-ben egy tiszta, React-mentes string-típus (a fájl
fejléce szerint szándékosan „React-mentes mag"), a `location.state` bevezetése
React Router-függést vinne be egy olyan modulba, aminek ma nincs ilyen
függősége.

### 2. A `NyomtatvanyokTab` maga olvassa ki a `nyelv` query paramétert, a `SettingsPage` `tab`-jának mintáján

A `templateLang` kezdőértéke `useState(() => ...)` lazy inittel a saját
`useSearchParams()`-ből olvasott `nyelv` paraméterre esik (érvénytelen vagy
hiányzó érték esetén `'hu'` marad az alapérték), ugyanazzal a „kizárólag a
KEZDETI mount pillanatában, nincs param→state szinkron effekt" elvvel, amit
a `SettingsPage.tsx` a saját `tab` állapotára már alkalmaz.

**Miért:** ez tartja meg a `NyomtatvanyokTab` önállóságát — a
`SettingsPage.tsx` fejléce szerint a tab-ok kizárólag az `onDirtyChange`
callbacken át kommunikálnak a shell-lel, a nyelv-előválasztás egy tisztán a
tab BELSEJÉBEN élő prezentációs állapot, nem kell a shell-en átvezetni.

Elvetett alternatíva: a `SettingsPage.tsx` olvassa ki a `nyelv` paramétert,
és adja át `initialNyelv` propként a `NyomtatvanyokTab`-nak. Elvetve —
extra prop-felület egy olyan adatnak, amit a fogyasztó komponens ugyanolyan
egyszerűen ki tud olvasni saját magának, és a fájl fejléce szerint a
tab-ok ma tudatosan nem kapnak ilyen jellegű induló-állapot propokat a
Rendelő/Egyéb tabtól sem.

### 3. Elfogadott korlát: a Radix `Tabs.Content` unmount/remount ciklusa miatt a query paraméter minden újbóli aktiváláskor újra érvényesül

Ha a doki a Nyomtatványok fülön kézzel Magyarra vált, majd egy MÁSIK
Beállítások-fülre lép, majd — ugyanazon a Beállítások-lap-látogatáson belül
— visszalép a Nyomtatványok fülre, a `NyomtatvanyokTab` újra mountol (a
Radix `Tabs.Content` unmountolja az inaktív tabot, `SettingsPage.tsx`
fejléce), és a `templateLang` ismét a query paraméterből (pl. `de`) inicializálódik,
nem a doki előző kézi választásából.

**Miért fogadható el:** a tétel súlyossága alacsony, a jelenség csak akkor
fordulhat elő, ha a doki egyazon Beállítások-látogatáson belül kézzel vált
nyelvet, MAJD tabot vált, MAJD visszatér — ritka minta. Egy erre épülő,
konzisztens javítás (pl. a `SettingsPage.tsx`-ben egy „már felülbírálva"
jelző bevezetése, ami túléli a tab remountot) számottevő új
állapot-kezelést igényelne egy alacsony súlyosságú, ritkán előforduló
esethez képest — nem arányos.

Elvetett alternatíva: a `SettingsPage.tsx`-ben egy, a `NyomtatvanyokTab`
életciklusán átívelő „doki már felülbírálta a nyelvet" jelzőt bevezetni
(hasonlóan a 114. tételben tárgyalt, workflow-élettartamú memóriákhoz).
Elvetve a fenti arányossági indok miatt — ha a doki később ezt zavarónak
jelzi, önálló tételként felvehető.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `templateLang` ChipGroup egyéb viselkedése** (pl. a piszkozat-cache
  base-kulcsolása, a Mentés/Mégse folyamat) — változatlan, a tétel
  kizárólag a KEZDŐÉRTÉKET érinti.
- **A `SettingsPage.tsx` `tab` query paraméterének viselkedése** — már ma
  is helyesen működik, mintaként szolgál, nem módosul.
- **A 117. tétel** (új terv-lánc nyelv-/pénznem-öröklésének jelzése) —
  önálló, más felületet (Terv adatai lap) érintő tétel, nem kapcsolódik a
  Beállítások fül nyelv-előválasztásához.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/veglegesitesOr.ts` — a `CsekklistaRoute` típus két új,
  nyelv-specifikus route-literállal bővül (a `Nyelv` típus `'hu'`/`'de'`
  értékei szerint); a három érintett `route: '/beallitasok?tab=nyomtatvanyok'`
  hozzárendelés (258., 269., 394. sor) a `plan.nyelv`-et is belefoglalja.
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx` — a
  `ROUTE_GOMB_FELIRAT` (39–45. sor) a két új route-literálhoz is felvesz
  egy bejegyzést, ugyanazzal a „Nyomtatvány szövegei" felirattal.
- `app/src/pages/settings/NyomtatvanyokTab.tsx` — a `templateLang`
  kezdőértéke (97. sor) a saját `useSearchParams()`-ből olvasott `nyelv`
  paraméterre esik, a `SettingsPage.tsx` 39–40. sorának lazy-init
  mintáján.
- `docs/03-funkcionalis-spec.md` § „Véglegesítési checklist" — a
  lezáráskor pontosítandó azzal, hogy a „Nyomtatvány szövegei" navigáció a
  terv nyelvét is átadja.

## Tesztelés (irányadó, nem kimerítő)

- Egy német (`de`) nyelvű terv Előnézetén, ha a checklist „Sablon HU-
  visszaesés" vagy „Szakasz kimarad a nyomtatványból" tételének
  „Nyomtatvány szövegei" gombjára kattintva navigál: a Beállítások
  Nyomtatványok fülén a Nyelv-váltó rögtön **Deutsch** állásban nyit.
- Ugyanez magyar (`hu`) nyelvű tervnél: a fül **Magyar** állásban nyit
  (a mai, változatlan alapértelmezés).
- A Beállítások menüből (NavBar-navigációval, nem a checklistről) közvetlenül
  megnyitott Nyomtatványok fül továbbra is Magyarra nyit — nincs `nyelv`
  query paraméter, tehát a fallback érvényesül.
- A `nyilatkozat-placeholder` info tétel „Nyomtatvány szövegei" gombja
  (ha van route-gombja) ugyanígy a terv nyelvén nyit.
