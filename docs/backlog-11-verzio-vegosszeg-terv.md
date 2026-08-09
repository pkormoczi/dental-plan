# Backlog 11. tétel — Verziónkénti végösszeg a Korábbi tervek listában — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 11. tételének ("Verziónkénti végösszeg a
Korábbi tervek listában") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

A "Korábbi tervek" lista (`PlanHistoryPage.tsx`) minden verziósort ma csak
`v{n} · {dátum}` formában mutat. A doki csak úgy tudja meg, mennyi volt egy
korábbi ajánlat összege, ha megnyitja szerkesztésre — pedig ez az
információ már ott van minden verzió `terv.json`-jában
(`osszesitok.fizetendo`, lásd `docs/02-domain-modell.md`). Kicsi, de valós
időveszteség: hiányzik a gyors visszapillantás, nyitás nélkül.

Ma a kezdeti `useEffect` (`PlanHistoryPage.tsx:68-130`) páciensenként csak
a **legfrissebb** verzió `terv.json`-ját tölti be, kizárólag a megjelenő
páciensnév feloldásához (`plan.paciens.nev`). A verziólista maga
(`versionsByPatient`) csak a mappákból származó metaadat
(`PlanVersion`: `dirName`, `isoDate`, `verzio`), a fájl tartalmát nem
ismeri.

## Döntések

### 1. A megjelenő összeg: `osszesitok.fizetendo`

Nem a listaáras `kezelesekOsszesen`, és nem mindkettő — soronként egyetlen
szám, a ténylegesen fizetendő (kedvezménnyel csökkentett) végösszeg.

**Miért:** ez az a szám, amit a doki valójában fel akar idézni egy gyors
pillantással ("mennyiért adtam ezt az ajánlatot"), nem a listaár. D9
("Kedvezmény csak a szerkesztőben látszik, a nyomtatványon nem") itt nem
korlátoz — ez a szerkesztő-alkalmazás belső, szerkesztésre szolgáló
listája, nem a nyomtatvány; a kedvezménnyel már csökkentett *végösszeg*
megjelenítése attól még nem teszi láthatóvá magát a kedvezmény tényét vagy
mértékét (az szám szerint elrejtve marad, ahogy eddig is).

### 2. Bizalmi modell: nincs újraszámolás, a mentett érték az igazság

A lista kizárólag a fájlban lévő `osszesitok.fizetendo` értéket írja ki,
`fazisok`-ból való újraszámolás és összehasonlítás (`osszesitokElter`,
`domain/totals.ts:42`) **nélkül**.

**Miért:** a sérthetetlen szabály ("`osszesitok` a fájlból számít
igaznak, eltérés esetén figyelmeztetni kell") szerint a mentett érték már
maga az igazság — nincs mit "igaznak számítani" hozzá képest, amíg nem
*szerkesztjük* a tervet. Az `osszesitokElter` őr ma pontosan ott fut, ahol
ez ténylegesen kockázatot jelentene: amikor a doki egy korábbi verziót
*betölt a szerkesztőbe* (`AppState.tsx:258`), és onnantól módosíthatja a
sorokat. A Korábbi tervek lista viszont csak olvasásra szolgáló
visszapillantás — ide bekötni az őrt azt jelentené, hogy minden egyes
verzióhoz be kellene tölteni és összegezni a teljes `fazisok` tömböt is,
nem elég a már betöltött `Plan` `osszesitok` mezőjét kiolvasni. Ez
messze túlmutatna a tétel becsült ~1 órás méretén, és a mismatch-eset
amúgy is felszínre kerül, amint a doki ténylegesen megnyitja azt a
verziót.

### 3. Betöltési stratégia: egy körben, a meglévő kezdeti `useEffect`-ben

A ma két külön célra futó betöltés — (a) `listVersions` minden
páciensre, (b) a *legfrissebb* verzió `terv.json`-ja a névhez — egyetlen
kiegészített körré bővül: **minden** páciens **minden** verziójának
`terv.json`-ja betöltődik, ugyanabban a `Promise.allSettled`-alapú
mintában, ami ma is megvan (`PlanHistoryPage.tsx:77-110`). A név
feloldása ugyanebből a batch-ből, a legfrissebb verzió eredményéből
olvasható ki — nem kell külön, második `loadPlan` hívás ugyanarra a
legfrissebb fájlra.

A teljes lista (verziók + összegek + nevek) egyszerre jelenik meg, a
meglévő `loading`/`HistorySkeleton` állapot változatlan szemantikával
fedi le — nincs új, soronkénti betöltés-jelző.

**Miért:** ez fedi le a backlog saját méretbecslését ("a `Promise.
allSettled` már megvan… csak minden verziót kell betöltenie és kiírnia az
összeget") — a meglévő mintát bővíti, nem vezet be új betöltési
architektúrát (pl. lusta, soronkénti betöltést az elrendezés
szétnyitásával). Helyi fájlrendszer-elérésnél (nem hálózati hívás) a
plusz olvasások száma (páciensenként 1 helyett annyi, ahány verziója van)
nem indokol progresszív/lusta betöltést egy ~1 órás tételnél.

### 4. Hiba egy adott verzió `terv.json`-jánál: „—” az összeg helyén

Ha egy adott verzió `loadPlan`-ja elhasal (ugyanaz a hívás, amit a
"Megnyitás szerkesztésre" gomb is használ), **csak az az egy verziósor**
mutat „—”-t az összeg helyén — nem külön, új hibaszöveggel, hanem azzal,
hogy az adott verzióhoz nem kerül szám az összeg-térképbe (vagy `null`
kerül bele), és a már meglévő `formatMoney(null, …)` amúgy is „—”-t ad
vissza (`domain/money.ts:14`). A többi verziósor (ugyanannál a páciensnél
és másoknál is) érintetlenül mutatja a saját összegét.

A meglévő páciens-szintű `unreadable` jelzés ("⚠ néhány verziója nem
olvasható", `PlanHistoryPage.tsx:224-228`) változatlan marad, és mostantól
ezt a hibát is lefedi — nincs szükség külön, verzió-szintű
hibaüzenet-mechanizmusra a "Megnyitás"/"Letöltés" gombok melletti
`actionError` mintája mellett. Ha egy verzió összege nem tölthető be, az
adott verzió megnyitása is elhasalna — ez már ma is kezelt eset
(`actionError`, `PlanHistoryPage.tsx:136-154`), a "—" csak előre jelzi ezt
a listában.

**Miért:** a meglévő `formatMoney` null-kezelése és a meglévő
páciens-szintű `unreadable` jelzés együtt pontosan lefedi ezt az esetet —
nincs ok új hibamegjelenítési mintát bevezetni ugyanarra a mögöttes
hibaokra (sérült/olvashatatlan `terv.json`).

### 5. Elhelyezés a soron: külön, jobbra igazított elem a gombok előtt

A verziósor (`PlanHistoryPage.tsx:237-261`, jelenleg `Flex
justify="between"`: bal = `v{n} · {dátum}` szöveg, jobb = a két gomb) egy
harmadik, középső/jobb oldali elemet kap: az összeg, jobbra igazítva,
tabular-nums-szal, a két gomb elé ékelve — **nem** összefűzve a bal oldali
`v{n} · {dátum}` szöveggel.

**Miért:** `docs/07-felulet-rendszer.md:104` ("Minden pénzérték és
mennyiség jobbra igazítva, tabular-nums") kötelező szabály, nem
stílusjavaslat — ezt egy bal oldali, balra igazított szöveges
összefűzéssel megsértenénk.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **`osszesitokElter` mismatch-őr a listában** — lásd 2. döntés
  indoklása; marad ott, ahol ma is fut (szerkesztőbe töltéskor,
  `AppState.tsx`).
- **`kezelesekOsszesen` és/vagy `kedvezmeny` megjelenítése soronként** —
  lásd 1. döntés; csak `fizetendo` jelenik meg.
- **Teljes verzió-diff (mi változott sorszinten v1 és v2 között)** — ez a
  `docs/08-backlog.md` KÉSŐBB listáján szerepel, explicit ennek a
  tételnek (11.) az egyszerű összeg-kiírása utáni, külön kör, ha
  ténylegesen felmerül az igény.
- **Progresszív/lusta, soronkénti betöltés** — lásd 3. döntés; nem
  indokolt helyi fájlrendszer-elérésnél egy ~1 órás tételhez.
- **Új domain pure function vagy `Osszesitok`/séma-bővítés** — nem
  szükséges; a tétel kizárólag már létező mezőt (`osszesitok.fizetendo`)
  és már létező segédfüggvényt (`formatMoney`) olvas ki/jelenít meg.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanHistoryPage.tsx`
  - A kezdeti `useEffect` (68-130. sor) bővítése: a mai "csak a legfrissebb
    verzió betöltése a névhez" kör helyett minden páciens minden
    verziójára fusson `loadPlan`, `Promise.allSettled`-del (3. döntés).
    Egy új state (pl. `totalsByVersion`, kulcsolva
    `patientDir`+`versionDir` szerint) tárolja a betöltött
    `osszesitok.fizetendo` értékeket; sikertelen betöltésnél az adott
    kulcs kimarad (vagy `null`), és a páciens bekerül a meglévő
    `unreadable` halmazba (4. döntés).
  - A verziósor JSX-e (237-261. sor): új, jobbra igazított, tabular-nums
    elem a gombok előtt, `formatMoney(totalsByVersion[kulcs],
    plan.penznem)` (5. döntés) — a pénznem verziónként a saját
    `terv.json`-jából jön (D21: `penznem` plan-szintű mező, nem globális).
- `app/src/pages/PlanHistoryPage.test.tsx` — két új eset (lásd Tesztelés).
- Nincs változás: `domain/money.ts`, `domain/totals.ts`,
  `domain/types.ts`, séma (`schemaVersion` nem emelkedik).

## Tesztelés

Egységteszt/komponensteszt kell (a meglévő `PlanHistoryPage.test.tsx`
mintáit követve, `DemoStorage` seed-adaton):

- **Alap eset:** egy több verziós páciensnél (a seedben Nagy Éva már két
  verzióval szerepel, `storage/seed/plans.ts`) mindkét verziósor a saját
  `osszesitok.fizetendo`-ját mutatja, helyesen formázva
  (`formatMoney`/`hu-HU` ezres tagolás).
- **Sérült verzió esete:** a meglévő "egy sérült `terv.json` nem
  bénítja meg a listát" teszt (`PlanHistoryPage.test.tsx:62-79`)
  kiegészítve: az érintett verziósor „—”-t mutat az összeg helyén, a
  többi (a páciens másik verziója, illetve más páciensek verziói)
  érintetlenül mutatja a sajátját.
