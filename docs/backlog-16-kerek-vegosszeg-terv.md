# Backlog 16. tétel — Terv-szintű „kerek végösszeg" kedvezmény — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 16. tételének („Terv-szintű »kerek
végösszeg« kedvezmény") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat —
az implementáció módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

Az alku lezárásakor a doki gyakran egy kerek végösszegben állapodik meg a
pácienssel („legyen kereken 2 050 000"). Ma ezt fejben vagy számológéppel
osztja vissza soronként, hogy a papíron kijövő összeg pontosan ennyi
legyen — az Excelben ez egyetlen cella átírása volt. Ez az egyetlen pont,
ahol az app ma érdemben rosszabb az Excelnél egy pénzt hozó
munkalépésben.

## Döntések

### 1. Alapmodell: cél-végösszeg bevitele, fix kedvezmény-összeg tárolása

A doki NEM egy levonandó kedvezmény-összeget ír be, hanem a kívánt
**cél-végösszeget** (pl. „2 050 000"). A mező alatt élőben látszik a
belőle adódó kedvezmény. Commitkor (blur/Enter) az app EGYSZER kiszámolja

```
kedvezmenyOsszeg = (sorszintű Fizetendő ekkor) − célösszeg
```

és ezt a fix `kedvezmenyOsszeg`-et menti a `Plan`-be — nem magát a
cél-végösszeget. Ha a doki utólag sort ad hozzá/módosít, a `Fizetendő`
elcsúszhat a kerek számtól — ez tudatosan vállalt viselkedés, NEM hiba —,
és a doki bármikor újra beírhatja a kerek számot, ami újraszámolja és
felülírja a `kedvezmenyOsszeg`-et.

**Miért:** két alternatíva közül választva (lásd a `docs/08-backlog.md`
16. tétel saját megjegyzése: „összeg vs. cél-végösszeg tárolása"): ha a
cél-végösszeg magát tárolnánk élőben (és minden újraszámoláskor abból
vezetnénk le a kedvezményt), a `Fizetendő` MINDIG pontosan kerek maradna,
még utólagos sormódosítás után is — ez elsőre vonzóbbnak tűnik, de a
kedvezmény ilyenkor észrevétlenül, a doki tudta nélkül nőne/csökkenne
minden sormódosításnál, ami D8 szellemével (a kedvezmény mérhető, explicit
tényállapot) ütközne. A fix összeg tárolása ugyanazt a mintát követi, mint
a sorszintű kedvezmény (`listaEgysegar` vs `tenylegesEgysegar` — egyszer
rögzül, nem "él" a listaár változásával), és a bevitel kényelme (cél
begépelése, nem kedvezmény fejben számolása) így is megmarad.

### 2. Adatmodell: additív, nullázható `Plan`-mező

```
Plan.kedvezmenyOsszeg?: number | null
```

`elolegSzazalek` precedense szerint: additív mező, `schemaVersion` NEM
emelkedik. `null` vagy hiányzó mező (régi `terv.json`) = nincs terv-szintű
kedvezmény, a `Fizetendő` a sorok tiszta összege (mai viselkedés,
változatlan).

**Miért:** ugyanaz a minta, mint az előlegnél — egyetlen nullázható mező
hordozza a kapcsoló állapotát ÉS az értéket, nem kerülhet egymásnak
ellentmondó állapotba egy külön boolean és egy szám. `assertPlanShape`
(`domain/validate.ts`) nem whitelistel kulcsokat, tehát nem igényel
módosítást egy új opcionális mezőhöz.

### 3. Elnevezés és elhatárolás az `Osszesitok.kedvezmeny`-től

A `Plan.kedvezmenyOsszeg` (bemenet: a doki által beállított terv-szintű
összeg) és az `Osszesitok.kedvezmeny` (kimenet: a fájlba írt, a
véglegesítéskor számolt TELJES — sor- ÉS terv-szintű — eltérés a
listaártól) két külön dolog, hasonló névvel. Ez a döntéssorozat tudatosan
megtartja ezt a névhasonlóságot (nem vezet be pl. `tervKedvezmeny` nevet),
mert a `kedvezmenyOsszeg` név a grill-me munkamenetben már megbeszélésre
került így — de az implementáció megkezdése előtt érdemes egy gyors
sanity-checket futtatni, hogy a két mező kódban és kommentekben
egyértelműen megkülönböztethető marad (pl. `plan.kedvezmenyOsszeg` vs
`plan.osszesitok.kedvezmeny` teljes elérési úttal hivatkozva, sose csak
`kedvezmeny` változónévvel).

### 4. UI: külön blokk, checkbox + feltételes mező, az `ElolegBlokk` mintájára

Új blokk a `PlanEditorPage.tsx`-en, a `Summary` ÉS az `ElolegBlokk` KÖZÖTT
(nem alattuk, nem fölöttük):

```
Summary (Mindösszesen + Kedvezmény sor)
  ↓
ÚJ: Kerek végösszeg blokk
  ↓
ElolegBlokk (Előleg/Fennmaradó rész)
```

- Checkbox: „Kerek végösszeg beállítása".
- Bepipálva megjelenik egy „Cél végösszeg" `NumberField` (a meglévő
  money-mezők mintájára, pénznem-formázással), alapértéke a jelenlegi
  (sorszintű) Fizetendő.
- A mező alatt élőben kiírva a belőle adódó kedvezmény összege.
- Kikapcsolás → `kedvezmenyOsszeg = null`, a blokk visszaesik alapállapotba
  (a mai viselkedés, nincs kedvezmény).

**Miért a sorrend:** az előleg a CSÖKKENTETT (kedvezménnyel már számolt)
végösszegből számol (lásd 6. döntés) — a vizuális sorrend kövesse a
számítási sorrendet, hogy a doki fentről lefelé olvasva lássa, miből mi
következik.

**Miért ez a vezérlő-minta:** a repóban már van egy bevált, ismerős minta
pontosan erre a helyzetre (checkbox + feltételes mező, `ElolegBlokk`) — az
inline szerkeszthető „Mindösszesen" szám elegánsabbnak tűnhet, de nincs
rá precedens a kódbázisban, és összemosná a "csak megjelenítés" és a
"szerkeszthető bemenet" szerepét ugyanazon a szövegen.

### 5. Értékhatár: csak kedvezmény, nem felár

```
0 ≤ cél végösszeg ≤ aktuális (sorszintű) Fizetendő
```

Túllépéskor commitkor a határra szorítjuk (ugyanaz a minta, mint az
előleg százalékánál: `Math.min(felső, Math.max(alsó, ...))`). A mező
kizárólag kedvezményre való — negatív `kedvezmenyOsszeg` (azaz felár) nem
lehetséges ezen a bevitel úton.

**Miért:** a backlog-tétel címe és leírása kifejezetten „kedvezményről"
beszél (a végösszegből LEVONT összeg), nem felárról; a felár-eset már
kezelve van máshol (a `Summary` meglévő „Felár" ága, ha egy sor tényleges
ára a listaár fölé kerül — az változatlan, ehhez a tételhez nem tartozik).

### 6. Kedvezmény-sor a szerkesztőben: összevonva, nincs külön bontás

A `Summary` komponens meglévő „Kedvezmény: X" sora (`listTotal − grand`)
VÁLTOZATLAN marad a helyén, de mivel a `grand` mostantól a terv-szintű
kedvezményt is tartalmazza (lásd 9. döntés), ez a szám automatikusan a
sorszintű ÉS terv-szintű kedvezmény ÖSSZEGÉT mutatja, külön bontás
nélkül. A kerek végösszeg blokk saját maga alatt külön kiírja a SAJÁT
részét (pl. „→ 130 000 Ft kedvezmény") — ez elég a doki számára a
forrás szétválasztásához, ha kell.

**Miért:** a dokinak az egy összeg számít, nem hogy honnan jön — a
kettébontás plusz UI-t igényelne haszon nélkül; a kerek végösszeg blokk
saját sora amúgy is megadja a bontást igény esetén.

### 7. Sávos/becsült sorok: nincs külön logika

A kerek végösszeg egy sima összeg-levonás, függetlenül attól, hogy a
tervben van-e sávos (`Ar.tipus === 'SAVOS'`) vagy kézzel becsültre
jelölt (`Sor.savos === true`) tétel. Nincs figyelmeztetés, nincs tiltás.

**Miért:** a nyomtatványon a `*` lábjegyzet már jelzi a bizonytalanságot
minden becsült tételnél — egy második, átfedő figyelmeztetés a kerek
végösszeg mellett zajt adna hozzá, nem információt.

### 8. Véglegesítés-őr: nincs új guard

A `PreviewPage.tsx` `confirmStep`-lánca NEM bővül ehhez a tétehez. Az
5. döntés értékhatára (`0 ≤ cél ≤ Fizetendő`) már bevitelkor kizárja a
negatív `Fizetendő`-t; ha a `Fizetendő` 0-ra kerül, az szándékos doki-
döntés (pl. teljes ingyenes kontroll), nem hiba, amit jelezni kellene.

**Miért:** ez a döntés kifejezetten kívül esik a 16. tétel körén — a 0
Ft-os sorok puha figyelmeztetése a 19. tétel hatásköre (`kitoltetlenSorok`
melletti, külön guard), nem szabad itt duplikálni vagy megelőlegezni.

### 9. Technikai megvalósítás: egyetlen forrás a végösszeg-számításra

Új helper a `domain/totals.ts`-ben:

```
tervVegosszeg(fazisok: Fazis[], kedvezmenyOsszeg: number | null | undefined): number
  = (sorszintű grand, azaz Σ fazisOsszeg(fazis)) − (kedvezmenyOsszeg ?? 0)
```

Ez váltja fel a „Fizetendő"-ként kezelt `grand`-ot MINDENÜTT, ahol ma a
nyers sorszintű összeg a végleges összegként szerepel:

- `domain/totals.ts` `computeOsszesitok(fazisok, kedvezmenyOsszeg)` —
  bővített szignatúra (a második paraméter opcionális, alapértéke
  `undefined`/0 — visszafelé kompatibilis a meglévő hívásokkal), a
  `fizetendo` mezőt `tervVegosszeg()`-ből számolja. Az `osszesitok.
  kedvezmeny` (`kezelesekOsszesen − fizetendo`) ezután automatikusan a
  TELJES (sor- + terv-szintű) eltérést tükrözi — nincs hozzá séma-
  változás, csak a bemenete bővül.
- `pdf/TervDocument.tsx` — a mai `const grand = plan.fazisok.reduce(...)`
  helyett `tervVegosszeg(plan.fazisok, plan.kedvezmenyOsszeg)`. Az előleg-
  számítás (`elolegOsszegek(grand, elolegSzazalek)`) változatlan marad,
  de mivel a bemenő `grand` már a csökkentett összeg, az előleg
  automatikusan a csökkentett végösszegből számol (a backlog-tétel saját
  elvárása szerint). A meglévő kétsoros feltételes összegzés
  (`grand !== listTotal`) kódszinten változatlan — csak a bemenete bővül,
  tehát a terv-szintű kedvezmény önmagában (sorszintű eltérés nélkül is)
  kiváltja a „Kezelések összesen" referenciasor megjelenését.
- `pages/PlanEditorPage.tsx` — a mai `const grand = plan.fazisok.reduce
  (...)` (182. sor) helyett szintén `tervVegosszeg(...)`, ami a `Summary`-
  nak ÉS az `ElolegBlokk`-nak is ezt adja át. A kerek végösszeg blokk
  saját magának SZÜKSÉGE VAN a nyers sorszintű összegre is (az 5. döntés
  felső határához és a mező alapértékéhez) — ezt külön kell számolnia
  vagy megkapnia, NEM a `tervVegosszeg()` eredményét.
- `pages/PreviewPage.tsx` — a `doFinalize` `computeOsszesitok(plan.
  fazisok)` hívása bővül: `computeOsszesitok(plan.fazisok, plan.
  kedvezmenyOsszeg)`.
- `state/AppState.tsx` — az `osszesitokElter(p.osszesitok, p.fazisok)`
  hívás (258. sor) bővül a `p.kedvezmenyOsszeg` átadásával, különben a
  betöltéskori eltérés-őr HAMIS eltérést jelezne minden olyan mentett
  tervnél, aminek van terv-szintű kedvezménye (`domain/totals.ts`
  `osszesitokElter` szignatúrája is bővül ennek megfelelően).
- `storage/seed/plans.ts` — a `computeOsszesitok(base.fazisok)` hívás
  érintetlen maradhat (a seed terveknek nincs terv-szintű kedvezménye),
  de a bővített szignatúra miatt build-időben ellenőrizni kell, hogy nem
  törik el.

**Miért:** a CLAUDE.md „Meglévő segédfüggvények" elve (ne írd újra,
egyetlen hely döntsön) — ma HÁROM helyen (PDF, szerkesztő, `totals.ts`)
számolódik újra a sorszintű összeg egymástól függetlenül; egy negyedik,
szintén független levonás-logika bevezetése három helyen szét-drift-elő
kerekítési/logikai hibákat kockáztatna. Az `elolegOsszegek()` pontosan
ezt a mintát követi (egy helyen dől el a számítás, mindenki azt hívja).

### 10. Dokumentáció: hivatkozás a `docs/08-backlog.md`-ből

A `docs/08-backlog.md` 16. tétel szakasza kap egy „**Terv:**" sort,
pontosan a 8./10./13. tétel mintájára, erre a fájlra mutatva. A gyökér
`CHANGELOG.md` NEM változik ebben a munkamenetben — az csak leszállított,
dokinak szóló változásokat sorol, a 16. tétel pedig egyelőre csak terv.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **0 Ft-os / negatív `Fizetendő` elleni véglegesítés-kori figyelmeztetés**
  — lásd 8. döntés; a 19. tétel hatásköre, ha egyáltalán.
- **Sávos tétel felső határának feltüntetése a nyomtatványon** — külön,
  KÉSŐBB listás tétel (`docs/08-backlog.md`), nem érinti ezt a döntést.
- **Sorszintű és terv-szintű kedvezmény vizuális szétválasztása a
  nyomtatványon** — D9 miatt eleve egyik sem jelenik meg a nyomtatványon,
  ez a kérdés csak a szerkesztőre vonatkozna, és lásd 6. döntés: tudatosan
  nem bontjuk szét ott sem.
- **`schemaVersion` emelés** — nem szükséges, a `Plan` séma additív
  bővítést kap, pontosan úgy, mint `elolegSzazalek`.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` — `Plan.kedvezmenyOsszeg?: number | null` új
  mező.
- `app/src/domain/totals.ts` — `tervVegosszeg()` új export;
  `computeOsszesitok()` és `osszesitokElter()` bővített szignatúrája.
- `app/src/domain/totals.test.ts` — a bővített szignatúrák tesztjei
  (kedvezmény nélkül = mai viselkedés; kedvezménnyel = a `fizetendo` és az
  `osszesitok.kedvezmeny` a csökkentett összeget tükrözi).
- `app/src/pdf/TervDocument.tsx` — `grand` számítás cseréje
  `tervVegosszeg()`-re.
- `app/src/pdf/TervDocument.test.tsx` — új eset: terv-szintű kedvezménnyel
  a „Kezelések összesen" sor megjelenik sorszintű eltérés nélkül is, és a
  „Fizetendő" a csökkentett összeget mutatja; az előleg a csökkentett
  összegből számol.
- `app/src/pages/PlanEditorPage.tsx` — `grand` számítás cseréje, új „Kerek
  végösszeg" blokk komponens (checkbox + `NumberField` + élő
  kedvezmény-kiírás) a `Summary` és az `ElolegBlokk` közé.
- `app/src/pages/PlanEditorPage.test.tsx` — a checkbox be/kikapcsolása,
  a cél végösszeg bevitel + határra szorítás, a `Summary` „Kedvezmény"
  sorának összevont értéke.
- `app/src/pages/PreviewPage.tsx` — `computeOsszesitok` hívás bővítése.
- `app/src/state/AppState.tsx` — `osszesitokElter` hívás bővítése.
- `app/src/storage/seed/plans.ts` — build-ellenőrzés a bővített
  szignatúrával.
- `docs/08-backlog.md` — „**Terv:**" hivatkozás a 16. tétel szakaszába.
