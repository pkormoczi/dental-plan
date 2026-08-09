# Backlog 19. tétel — 0 Ft-os sorok puha figyelmeztetése véglegesítéskor — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 19. tételének („0 Ft-os sorok puha
figyelmeztetése véglegesítéskor") megbeszélt megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A `PlanEditorPage.tsx` gépel→`↑`/`↓`→`Enter` ciklusa nulla találatra
egyedi sort vesz fel (`sorMezokEgyedibol`, `listaEgysegar === tenylegesEgysegar
=== 0` kezdőértékkel). Egy elgépelés + reflexes Enter emiatt ma némán
tehet egy „gyokerkezx — 0 Ft" fantomsort az aláírandó dokumentumra — a
`PreviewPage.tsx` semmit nem jelez, mert ez a sor NEVESÍTETT (van
`nevSnapshot`-ja), tehát a `kitoltetlenSorok` kemény blokkja nem kapja el
(az csak a névtelen sorokat nézi). Ugyanez a rés véd az egyedi soron
elfelejtett ár ellen is (a doki felvesz egy tételt, elfelejti kitölteni
az árat, és a 0 Ft csendben átmegy a véglegesítésen).

## Döntések

### 1. Predikátum: `sorOsszeg(sor) === 0`, névvel rendelkező sorokra, kivétel nélkül

A figyelmeztetés azokra a sorokra vonatkozik, amikre **mindkettő** igaz:

- `sor.nevSnapshot.trim() !== ''` (van neve — a névtelen sorokat a
  `kitoltetlenSorok` kemény blokkja már elkapja, nem kell duplikálni).
- `sorOsszeg(sor) === 0` (`domain/totals.ts`, azaz `tenylegesEgysegar *
  mennyiseg === 0`). A `mennyiseg` mezőn a szerkesztőben `min={1}`
  kényszerül (`PlanEditorPage.tsx` `NumberField`), tehát a gyakorlatban ez
  `tenylegesEgysegar === 0`-ra redukálódik — de a `sorOsszeg`-et hívjuk, nem
  közvetlenül az egységárat, mert ez a meglévő, egy helyen élő segédfüggvény
  (CLAUDE.md „Meglévő segédfüggvények").

Nincs sortípus szerinti kivétel — egy `SAVOS` eredetű sor is bekerül a
listába, ha a pillanatnyi `tenylegesEgysegar` (a `min`-ből származtatva
felvételkor) épp 0.

**Miért:** a backlog-szöveg nem említ kivételt, és mivel ez egy **puha**,
egy kattintással elvethető figyelmeztetés (nem blokk), egy legitim 0
Ft-os `SAVOS`-eredetű sor felbukkanása a listán csekély súrlódás — a doki
egyszerűen továbbmegy. Egy sortípus szerinti kivétel plusz állapotot
(a sor eredeti árlistai típusának ismerete a `tetelId`-n keresztül)
igényelne kimutatható haszon nélkül.

### 2. Helye a puha `confirmStep`-láncban: a lánc VÉGÉN

A meglévő lánc (`PreviewPage.tsx` `attemptFinalize`/`confirmStepContinue`):
`missing-fields` → `de-fallback-names` → `doFinalize`. Az új lépés
(`zero-price-rows`) ehhez a lánc VÉGÉRE csatlakozik:

`missing-fields` → `de-fallback-names` → `zero-price-rows` → `doFinalize`.

A két meglévő kemény blokk (hiányzó páciensnév, `kitoltetlenSorok`) a
teljes puha lánc ELŐTT marad, változatlanul.

**Miért:** ez a minimális diff a meglévő lánchoz és a hozzá tartozó
tesztekhez képest — a két meglévő lépés sorrendje/viselkedése egy karaktert
sem változik, az új lépés csak hozzáfűződik. Egy elöl beszúrt lépés
átírná a meglévő láncteszt-forgatókönyvek előfeltevését (melyik dialógus
jön az első „Folytatás" kattintásra), kockáztatva egy néma
teszt-regressziót egy 2–3 órás tételben.

### 3. Lánc-mechanika: egy újabb ad hoc if-ág, NEM általánosított lépéslista

Az `attemptFinalize` és a `confirmStepContinue` ma két kézzel írt,
egymást feltételező if-ág (mert eddig csak két puha lépés volt egymáshoz
képest kellett sorba rendezni). A harmadik lépést UGYANEZZEL a mintával
vezetjük be — egy újabb kézzel írt if-ág mindkét függvényben —, **nem**
egy általánosított `{key, active}[]` lépéslistával és egy
`nextStepAfter(current)` segédfüggvénnyel.

**Miért:** 3 lépésnél az ad hoc lánc még átlátható, és ez tartja a
tételt a becsült 2–3 órás méretben — egy általánosított lépéslista nagyobb
diff lenne, és a MA MŰKÖDŐ két lépés logikáját is átírná egy olyan
tételben, ahol ez nem indokolt. Ha egy jövőbeli negyedik puha lépés
tovább nehezítené az if-ágak olvashatóságát, az az általánosítás
alkalma lesz, nem ez a tétel.

### 4. Dialógus tartalma: csak névlista, semleges hangnem

- **Cím:** „0 Ft-os tételek"
- **Leírás:** a következő szándékkal — felsorolja az érintett sorok
  NEVÉT (nem a fázisukat, nem a fogszámukat), és semleges hangnemben
  jelzi, hogy ez szándékos is lehet (pl. ingyenes kontroll), a doki
  eldöntheti, folytatja-e:

  > A következő, névvel ellátott sorok 0 Ft értékkel szerepelnek a
  > tervben. Ha ez szándékos (pl. ingyenes kontroll), folytathatod a
  > véglegesítést.
  >
  > {`nevListaSzoveg('Érintett sorok', nullaForintosNevek)` kimenete}

  A meglévő `nevListaSzoveg(cím, nevek: string[])` segédfüggvényt
  VÁLTOZATLANUL hívja — 8 tétel felett „… és további N" csonkolással,
  ugyanúgy, mint a `de-fallback-names` lépés két allistája.

**Miért:** a `de-fallback-names` lépés is csak a `nevSnapshot`-ot listázza
(fázis/fogszám nélkül) — ez a meglévő, bevált mintázat egy NÉVVEL
rendelkező sorokból álló listánál (szemben a névtelen `uresSorok`
Callout-jával, ami fázist és fogszámot mutat, mert ott ez az EGYETLEN
azonosító, nincs név). A hangnem szándékosan nem vádló/hibára utaló — a
backlog explicit „puha" jelzőt használ, és a 0 Ft egy legitim eset
(ingyenes kontroll) is lehet, nem csak elgépelés.

### 5. Nincs külön, tartós Callout — csak a `confirmStep`-dialógus

A `zero-price-rows` lépés kizárólag a meglévő `AlertDialog`-lánc egy
újabb tagja, ugyanúgy, mint a `missing-fields`/`de-fallback-names`. NEM
kap külön, a `uresSorokNotice` mintájára tartósan megjelenő piros
Callout-ot a lap tetején.

**Miért:** a `uresSorokNotice` Callout azért létezik, mert az a lépés
KEMÉNY blokk — a doki addig nem tud véglegesíteni, amíg vissza nem megy
szerkeszteni, ezért szüksége van egy tartós, navigációs gombbal ellátott
jelzésre. A `zero-price-rows` puha lépés — egy „Folytatás" kattintással
túljutunk rajta —, ugyanúgy, mint a másik két puha lépés, aminek szintén
nincs kísérő Callout-ja.

### 6. Domain-függvény: `nullaForintosSorok(plan)`, a `domain/kitoltetlen.ts`-ben, `string[]` visszatéréssel

Új export a meglévő `domain/kitoltetlen.ts` fájlban (a `kitoltetlenSorok`
mellett), NEM új fájlban:

```
export function nullaForintosSorok(plan: Plan): string[]
```

Terv-sorrendben visszaadja az 1. döntés szerinti sorok `nevSnapshot`-jait
(nem objektumot `fazisIndex`/`sorIndex` mezőkkel, mint a `kitoltetlenSorok`
teszi).

**Miért — fájl:** a fájl fejléc-kommentje már ma is egy rokon fogalommal
(`toothVisual.ts` `hianyzoTetel`) veti össze a `kitoltetlenSorok`-ot —
természetes bővítési pont egy harmadik, „mely sorok problémásak
véglegesítéskor" kérdésre válaszoló függvénnyel, ahelyett hogy egy külön
fájlba szórnánk szét ugyanazt a témát.

**Miért — `string[]`, nem objektum:** a `kitoltetlenSorok` azért ad
vissza `fazisIndex`/`fazisNev`/`fogak` mezőket, mert azoknak a soroknak
NINCS nevük — muszáj más azonosítót mutatni. A `nullaForintosSorok`
sorainak VAN nevük, és a 4. döntés szerint a dialógus kizárólag a nevet
listázza — ez pontosan a `fallbackSorok` (`domain/nev.ts`)
`nincsForditas`/`elterAzArlistatol` mezőinek mintája, amik ugyanezen okból
egyszerű `string[]`-ek. Egy objektum-visszatérés ma kihasználatlan mezőket
vinne be.

### 7. Tesztelés

`PreviewPage.test.tsx` bővítése:

- **Csak 0 Ft-os sor a probléma** (nincs hiányzó mező, nincs
  név-eltérés): a „Véglegesítés és mentés" gombra kattintva egyenesen a
  „0 Ft-os tételek" dialógus jelenik meg (nem a másik kettő), a listában
  a helyes névvel; „Folytatás" → mentés sikeres.
- **Teljes, 3 mély lánc**: hiányzó mező ÉS német név-eltérés ÉS 0 Ft-os
  sor egyszerre — három egymást követő „Folytatás" kattintás a helyes
  sorrendben (`missing-fields` → `de-fallback-names` → `zero-price-rows`)
  viszi végig a véglegesítésig.
- **Regresszió a meglévő lánc-teszteken**: a már létező, 0 Ft-os sor
  NÉLKÜLI forgatókönyvek (pl. a „csak a fizetési feltételek placeholder"
  teszt, ami egyetlen „Folytatás" után egyenesen mentést vár) változatlanul
  lefutnak — ez implicit módon azt is igazolja, hogy az új lépés nem
  jelenik meg feleslegesen.

**Miért:** ez a három eset fedi le a 2. döntés (lánc-sorrend) teljes
igazságtábláját, és biztosítja, hogy a meglévő két lépés viselkedése a
bővítés után is változatlan maradjon.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Az egyedi-sor-felvétel megerősítése** (pl. egy dialógus MÁR a
  gépel→Enter pillanatában) — a backlog kifejezetten elveti: eltörné a
  billentyűzetes ciklust, ami az app UX-kritikus pontja.
- **`SAVOS` eredetű sorok kizárása a predikátumból** — lásd 1. döntés,
  tudatosan kihagyva.
- **Sortípus szerinti differenciált szöveg** (pl. „ez egy egyedi sor, biztos
  szándékos?" vs. „ez egy árlistai tétel, valószínűleg elgépelés") — a
  dialógus egységesen kezeli az összes 0 Ft-os, névvel rendelkező sort.
- **Az `attemptFinalize`/`confirmStepContinue` lánc általánosítása** —
  lásd 3. döntés, tudatosan kihagyva ebben a tételben.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/kitoltetlen.ts` — `nullaForintosSorok(plan): string[]`
  új export (6. döntés).
- `app/src/domain/kitoltetlen.test.ts` (ha van, vagy új fájl) — a
  `nullaForintosSorok` pure function tesztje: névvel rendelkező, 0 Ft-os
  sor bekerül; névtelen 0 Ft-os sor NEM (azt a `kitoltetlenSorok` fedi);
  nem-0 Ft-os sor nem kerül be.
- `app/src/pages/PreviewPage.tsx`
  - `ConfirmStep` típus bővítése: `'missing-fields' | 'de-fallback-names'
    | 'zero-price-rows' | null`.
  - `nullaForintosSorok(plan)` hívás a komponens törzsében, a meglévő
    `uresSorok`/`nevProblemaSzama` számítások mellé.
  - `attemptFinalize` és `confirmStepContinue` bővítése egy-egy új
    if-ággal (3. döntés), a lánc végén (2. döntés).
  - Az `AlertDialog.Content` cím/leírás elágazásának bővítése a
    `zero-price-rows` esettel (4. döntés), a meglévő `nevListaSzoveg`
    segédfüggvény felhasználásával.
- `app/src/pages/PreviewPage.test.tsx` — a 7. döntésben leírt esetek.
