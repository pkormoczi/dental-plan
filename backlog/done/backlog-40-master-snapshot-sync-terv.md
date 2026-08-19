# Backlog 40. tétel — Páciens master ↔ terv snapshot compare/sync — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 40. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-016
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D9`–`D10`/`D157`–`D163`/`D210`–`D214` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával, és NEM azonosak a `docs/02-domain-modell.md` D33-mal
(páciens-szintű törzsadat, backlog-28), ami a KÉT ADATFORRÁS
(`paciens-adatok.json` vs. `terv.json` `paciens` blokk) meglétét és
szándékos szétválását már rögzítette — ez a tétel az ELSŐ, ami a
kettő közötti tényleges ÖSSZEVETŐ/SZINKRONIZÁLÓ UI-t építi.

## Probléma

A `docs/01` D33 (`docs/02-domain-modell.md` § Páciens-szintű törzsadat)
már kimondja: "nincs automatikus szinkron a `terv.json` `paciens`
blokkjával egyik irányban sem" — ez a döntés MÁR MA IS érvényben van, és
ez a tétel NEM változtatja meg az alapelvet (a szinkron marad explicit,
soha nem automatikus). Amit a feltárás megerősített: **teljesen hiányzik
minden UI, ami ezt az eltérést egyáltalán MEGMUTATNÁ vagy kezelhetővé
tenné** — nulla találat `szinkron`/`elter`/`diff`/`osszehasonlit`
mintákra a `PatientEditor`/`PatientPage` code-ban túl az egy-mondatos,
tájékoztató fallback-szövegen (`PaciensekPage.tsx:508–513`). Ez tehát
TELJESEN ÚJ felület, nem egy meglévő minta bővítése.

## Döntések

### 1. Két külön, explicit irányú művelet — nincs "szinkronizálás" gomb

A master (`paciens-adatok.json`) és egy KONKRÉT terv `paciens`
pillanatképe között KÉT, egymástól teljesen külön akció létezik:
"Frissítés a törzsadatból" (master → draft) és "Törzsadat frissítése a
tervből" (draft → master) — sosem egy közös, iránytalan "Szinkronizálás"
gomb (D160).

**Miért:** D160 explicit két irányt kér; egy közös gomb elmosná, melyik
adat melyiket írja felül — jogilag/adatvédelmi szempontból (D7 pillanatkép-
elv) kritikus, hogy a doki mindig tudja, melyik irányba mozgat adatot.

### 2. Mezőszintű diff + aggregate compare, alapból semmi nincs kijelölve

Mindkét irányú művelet egy mezőnkénti összevetést mutat (régi→új
érték, csak az ELTÉRŐ mezőkre), checkboxokkal — alapból SEMMI nincs
kijelölve, egy "Összes kijelölése" opcióval (D10, D159). Csak a
kijelölt mezők íródnak át.

**Miért:** D10/D159 explicit ezt kéri; egy alapból mindent kijelölő
UI könnyen véletlen, nem szándékolt felülíráshoz vezetne egy olyan
adaton, amit a doki talán direkt hagyott eltérni (pl. egy régi terven a
páciens akkori, már nem aktuális címe egy jogi dokumentum része).

### 3. `Plan → master` diff-prompt csak egyszer jelenik meg, amíg a diff nem változik

A "Terv adatai" lépés elhagyásakor, ha a draft `paciens` blokkja eltér a
mastertől, egyszer felkínálja a frissítést (D211/D212 mintájára) — de ha
a doki elutasítja, és a diff KÖZBEN nem változik (nincs újabb
szerkesztés), a prompt NEM jelenik meg ismét ugyanazon a munkameneten
belül (D161).

**Miért:** D161 explicit ezt kéri — egy minden alkalommal újra felugró
prompt zavaró lenne, ha a doki már egyszer tudatosan döntött ugyanarról
az eltérésről.

### 4. Fallback-állapot: információs blokk, nem hibaüzenet

Ha a páciensnek nincs saját `paciens-adatok.json`-ja (a mai `isLocked`
mintájában), egy neutrális, INFORMÁCIÓS blokk jelzi ezt (D210) — nem
piros/hiba-szín, mert ez egy legitim, várt állapot (backlog-28 saját
döntése), nem hibaállapot. Ilyen esetben egy új terv a legutóbbi terv
pillanatképéből indul (D211, ez MÁR MA IS így működik a
`megjelenitettTorzsadat()` fallback-láncán át), és a "Terv adatai" lépés
elhagyásakor egy (alapból kijelöletlen) opció felkínálja a master
LÉTREHOZÁSÁT a draft adataiból (D212) — kijelölés esetén a master AZONNAL
létrejön (D213), nem várja meg a terv véglegesítését.

**Miért:** ez a fallback-koncepció MÁR LÉTEZIK (backlog-28), csak a
"Terv adatai" lépésből induló, explicit "hozzuk létre most" akció
hiányzik — ez pontosan az a hiányzó darab, ami a fallback-állapotot
véglegesen fel tudja oldani, ha a doki akarja.

### 5. Master-írási hiba: a felhasználó a helyszínen marad, Retry vagy Continue

Ha a master → írás (2–4. döntés bármelyike) meghiúsul, a doki NEM
veszíti el a helyét — egy hibaüzenet Retry (újra próbálja ugyanazt az
írást) vagy Continue (folytatja a workflow-t az írás elvégzése NÉLKÜL, a
draft érintetlen marad) választást ad (D214).

**Miért:** D214 explicit ezt kéri; ez ugyanaz az elv, mint a 33. tétel
(DP-005) write-failure-megőrzési döntése — egy meghiúsult írás sosem
veszíthet el munkát vagy állíthatja meg kényszerűen a dokit.

### 6. Finalizáció: a master mindig újraolvasva, az eltérés csak info-szinten jelenik meg

Véglegesítéskor a rendszer újraolvassa a patient mastert (D163 — ez MÁR
MA IS így van, a `PreviewPage.tsx` `doFinalize()` feltárása szerint más
tételben), és ha eltér a draft pillanatképétől, ez az "Előnézet és
véglegesítés" checklistjében egy INFO-szintű (nem blokkoló) sorként
jelenik meg (D162) — a véglegesítés önmagában nem kényszerít
szinkronizálást.

**Miért:** D162/D163 explicit info-szintet kér, nem hard blokkot — a
pillanatkép-elv (D7) szerint a tervnek NEM kötelessége mindig a
legfrissebb master-adatot hordozni, csak látnia kell a dokinak, ha
eltérés van.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A `paciens-adatok.json` mezőinek read-only/edit/validációs viselkedése
  — 39. tétel (DP-015); ez a tétel csak az ÖSSZEVETÉST/szinkront adja,
  nem a mezőszerkesztést.
- A "Terv adatai" lépés egyéb tartalma (cím, nyelv/pénznem, orvos,
  dátumok) — redesign-javaslat DP-030.
- A "Előnézet és véglegesítés" checklist egyéb sorai — redesign-javaslat
  DP-051 (Finalization validation engine); ez a tétel csak EGY sort ad
  hozzá (6. döntés).

## Érintett helyek (tájékoztató, nem kimerítő)

- Új `app/src/domain/masterSnapshotDiff.ts` (vagy hasonló) — a
  mezőszintű összevetés tiszta domain-logikája, mindkét irányhoz (1–2.
  döntés).
- `app/src/pages/PatientPage.tsx` (a "Terv adatai" lépés mai
  tartalma) — a lépés elhagyásakor futó diff-prompt (3. döntés) és a
  master-létrehozás opció (4. döntés).
- `app/src/domain/paciensAdatok.ts` `megjelenitettTorzsadat()` — reuse a
  fallback-állapot eldöntéséhez (4. döntés).
- `app/src/storage/DemoStorage.ts` `savePatientData()` — a master-írási
  hiba kezelése (5. döntés).
- `app/src/domain/veglegesitesOr.ts` — új, info-szintű checklist-sor a
  patient/master eltérésre (6. döntés).

## Tesztelés (irányadó, nem kimerítő)

- Master→draft és draft→master frissítés két KÜLÖN gombként létezik,
  nincs egyesített "Szinkronizálás" akció.
- A mezőszintű összevetésben alapból semmi nincs kijelölve; "Összes
  kijelölése" mindent bejelöl.
- Ugyanazon diffre a prompt csak egyszer jelenik meg egy munkameneten
  belül, amíg a diff nem változik.
- Fallback-állapotban a "Terv adatai" lépés elhagyásakor felkínált
  master-létrehozás kijelölve azonnal létrehozza a mastert.
- Master-írási hiba esetén Retry újrapróbálja, Continue tovább enged a
  workflow-ban, a draft mindkét esetben érintetlen marad.
- Véglegesítéskor a checklist info-szinten (nem blokkolva) jelzi, ha a
  master eltér a draft pillanatképétől.
