# Backlog 5. tétel — `unit="EUR"` a szerkesztő „Tényleges ár" mezőjén — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 5. tételének („unit="EUR" a szerkesztő
„Tényleges ár" mezőjén") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat —
az implementáció módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

A `NumberField` komponens (`app/src/components/NumberField.tsx`) `unit`
propja (`'HUF' | 'EUR'`) már ma is helyesen működik: `'EUR'` esetén a mező
euróban jelenít meg és fogad be szöveget, a commit viszont változatlanul
centben történik (`parseEuroInput`/`formatCentForInput`,
`app/src/domain/money.ts:47-60`). Ez a mechanizmus a P0-5 kódreview-találat
óta létezik és él az árlista adminban (`PriceListAdminPage.tsx:458`,
`:466`, `:483` — mindhárom EUR-ár mező `unit="EUR"`-t kap).

A tervszerkesztő (`PlanEditorPage.tsx`) `LineRow` komponensében a
„Tényleges" oszlop `NumberField`-je (kb. 620-628. sor) **nem kapja meg ezt
a propot** — alapértelmezett `unit = 'HUF'` marad, tehát egy EUR pénznemű
tervnél is nyers centként jelenít meg és fogad be számot. Ez pontosan az a
majdnem 100×-os beviteli hiba (euró vs. cent tévesztés), amit a P0-5 az
adminban már kizárt, de a szerkesztőben nyitva maradt — élő, aláírandó
pénzügyi dokumentumon.

**Megerősített, NEM kockázatos pontok** (kutatással ellenőrizve, nem
feltételezve):

- A `currency` (`Penznem`) prop már elérhető a `LineRow`-ban — a szomszédos
  `formatMoney(line.listaEgysegar, currency)` (616. sor) és
  `formatMoney(line.tenylegesEgysegar * line.mennyiseg, currency)` (632.
  sor) már használja. Típusa szó szerint megegyezik a `NumberField.unit`
  típusával — nincs leképezés, csak áthúzás.
- A `tenylegesEgysegar` értékét sor felvételekor a `sorMezokTetelbol()`
  (`PlanEditorPage.tsx:54-69`) már ma is helyesen, a kiválasztott
  `item.ar[currency]`-ból tölti fel (EUR esetén centben) — a hiba
  kizárólag a **kézi szerkesztéskor** (blur/Enter commit) jelentkezik, az
  automatikus feltöltésnél nem.
- `data/arlista.seed.json` demó tervei (`app/src/storage/seed/plans.ts`)
  mind `penznem: 'HUF'` — nincs meglévő, esetlegesen már hibás nagyságrendű
  EUR demóadat, amit migrálni kellene.
- Ez az egyetlen beviteli felület a `tenylegesEgysegar`-hoz a
  szerkesztőben — nincs másik `NumberField` vagy egyéb input, ami ugyanezt
  a mezőt írná.

## Döntések

### 1. A hiányzó `unit` prop pótlása

A `LineRow`-beli „Tényleges" `NumberField` megkapja a `unit={currency}`
propot (a szomszédos `min={0}` és egyéb propok változatlanok — a tárolt
érték mértékegysége nem változik, csak a mező megjelenítési/beviteli
egysége).

**Miért:** ez a backlog saját méretbecslését („15 perc — egy prop
átadása, ami az árlista adminban már megvan") pontosan igazoló,
mechanikus javítás — a típusegyezés miatt nincs új logika, nincs
mellékhatás a `commit()`/`step()` meglévő, admin oldalon már bevált
viselkedésén.

### 2. Fejléc-konzisztencia: mindhárom pénzoszlop jelzi a mértékegységet

A `PhaseSection` táblázatfejlécében (`PlanEditorPage.tsx` kb. 405-418.
sor) mindhárom pénzoszlop — „Listaár", „Tényleges", „Összeg" — kap egy
pénznemtől függő utótagot: `(Ft)` HUF, `(€)` EUR pénznemű tervnél. A
`currency` prop a `PhaseSection`-ben már elérhető (370. sor), a
számítás (`currency === 'EUR' ? '€' : 'Ft'`) egy helyi konstansként
elég, nem igényel új exportált segédfüggvényt a `domain/money.ts`-ben —
ez tisztán UI-réteg felirat, nem pénzösszeg-formázás.

**Miért:** felmerült, hogy csak a szerkeszthető „Tényleges" oszlop kapjon
jelzést (ott van tényleges beviteli kockázat, a másik kettő csak
megjelenítés) — de ez vizuálisan következetlen lenne egyetlen táblázatsoron
belül, és azt sugallná, hogy a másik két oszlop „biztonságos" a
pénznem-összetévesztéssel szemben, miközben azok is ugyanabban a
pénznemben, ugyanolyan számformátumban jelennek meg. Az egységes fejléc
mellett döntöttünk. Nem érint meglévő tesztet — a `PlanEditorPage.test.tsx`
egyik tesztje sem hivatkozik pontos egyezéssel a „Listaár"/„Tényleges"/
„Összeg" fejlécszövegre.

### 3. Regressziós teszt a `PlanEditorPage.test.tsx`-ben

Új teszt, ami:

1. EUR pénznemű tervet indít (a meglévő „shows the empty-currency
   message..." teszt mintája, `PlanEditorPage.test.tsx:403-417` — de a
   `seedPriceList` EUR árait **nem** nullázza, mint a
   `seedWithGermanEnabledAndNoEurPrices` helper teszi; csak
   `nemetEngedelyezve: true`-t állít be a `beallitasok.json`-on keresztül,
   mert a pénznem-választó kártya (`PatientPage.tsx:51,121`) enélkül nem
   látszik).
2. Felvesz egy valódi EUR árú tételt (pl. `t001` „Konzultáció/fél óránként",
   `data/arlista.seed.json:104-125`, EUR fix ár 2800 cent = 28,00 €).
3. Beír egy új értéket a „Tényleges" mezőbe, és leellenőrzi, hogy a mező
   euró-formátumban (vesszős tizedes) jelenik meg — NEM nyers centként.
4. (Opcionális, ha egyszerűen megoldható:) az „Összeg" oszlopon vagy a
   fázisösszegen keresztül közvetve igazolja, hogy a committált érték
   ténylegesen centben tárolódott (a `formatMoney` kimenetén át, mivel a
   `plan` state nincs közvetlenül exponálva a tesztben).

**Miért:** a backlog méretbecslése (15 perc) és „nincs kisebb egység, ez
már a legkisebb javítás" megjegyzése a KÓDVÁLTOZÁS méretére vonatkozik, nem
zárja ki a tesztet. Mivel ez pontosan az a hibaosztály (P0-5), ami miatt az
admin oldalon már védőháló épült, indokolt, hogy a szerkesztő oldali
javítás is tartós, automatizált védelmet kapjon, ne csak egyszeri manuális
ellenőrzést.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Seed/demó adat migrálása** — nincs rá szükség, mert nincs meglévő EUR
  pénznemű demóterv (lásd Probléma szakasz).
- **A `NumberField` `step()`/nyíl-billentyű viselkedése EUR módban** —
  változatlan, meglévő, az adminban már bevált mechanizmus; ez a tétel nem
  nyúl hozzá.
- **SAVOS (tól-ig) EUR mező a szerkesztőben** — nem létezik és nem is kell:
  a `Sor.tenylegesEgysegar` a sémában mindig egyetlen szám, sosem
  tartomány, függetlenül attól, hogy az árlistai forrás-tétel FIX vagy
  SAVOS típusú volt (`sorMezokTetelbol` a SAVOS `min`-jét veszi
  alapértékként). A `LineRow` „Tényleges" mezője ma is, ezután is egyetlen
  `NumberField`.
- **`domain/money.ts` bővítése egy „pénznem-szimbólum" segédfüggvénnyel** —
  a fejléc-utótag túl kicsi és túl UI-specifikus ahhoz, hogy közös domain
  segédfüggvényt indokoljon; helyi konstansként elég a `PhaseSection`-ben.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanEditorPage.tsx`
  - `LineRow` „Tényleges" `NumberField` (kb. 620-628. sor) —
    `unit={currency}` hozzáadása.
  - `PhaseSection` táblázatfejléc (kb. 405-418. sor) — `(Ft)`/`(€)`
    utótag a „Listaár", „Tényleges", „Összeg" cellákhoz.
- `app/src/pages/PlanEditorPage.test.tsx` — új teszt a fenti 3. döntés
  szerint, a meglévő EUR-terv-indítási minta (403-417. sor) újrafelhasználásával.
