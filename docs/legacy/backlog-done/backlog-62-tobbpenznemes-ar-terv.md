# Backlog 62. tétel — Többpénznemes listaár / ajánlati ár state — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 62. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-045
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D91`, `D483`–`D531`, valamint a `C5` konfliktus-feloldás a redesign
saját D1–D606 számozásából/kategorizált feloldásaiból valók — NEM
azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával, és NEM
azonosak a `docs/01` D11-gyel (a HUF/EUR ár egymástól független
szerkeszthetősége — ez az árlistai tételre vonatkozik, ennek a
tételnek a PLAN-SOR oldali kiterjesztése).

**Előfeltétel-jellegű tétel:** a 63. (DP-046) és 64. (DP-047) tétel
pénznemenkénti külön állapota (D487/D488) erre a tételre épül —
sorrendben ez a tétel megy előbb.

## Probléma

- **`Sor` egyetlen, IMPLICIT pénznemű ár-párt tart.** `listaEgysegar`/
  `tenylegesEgysegar` (`domain/types.ts:88-89`) sima `number`, nem
  pénznem-kulcsolt — a pénznem csak `Plan.penznem`-ből derül ki, és az
  egész terven EGYSÉGES.
- **A pénznemváltás MA DESTRUKTÍV.** `applyPenznem()`
  (`PatientPage.tsx:92-105`) a pénznem cseréjekor **minden sort töröl**
  minden fázisból, ha van tartalom — megerősítő dialógussal
  (`:295-325`), mert „pénznemváltás nem átváltás, hanem a számok
  újraértelmezése lenne rossz mértékegységben”.
- **Ezzel szemben az ÁRLISTAI oldal MÁR MA IS mindkét pénznemet
  tartja.** `Tetel.ar: ArByPenznem` (`domain/types.ts:21,45`) =
  `Partial<Record<Penznem, Ar | null>>` — egy tétel HUF és EUR ára
  EGYSZERRE, egymástól függetlenül létezik (`null` = abban a
  pénznemben nem ajánlható, D21/`docs/01`). Ez a mintázat MÁR MA IS
  kiszolgálja a keresőt (`PlanEditorPage.tsx:179-182`, `x.ar[currency]`),
  a lefedettség-számítást (`domain/coverage.ts`) és az admin euró/cent
  beviteli konverziót (`domain/money.ts:58-71`).
- **`null` EUR listaár kezelése (C5) MA RÉSZBEN MEGVAN**, a
  KERESŐ szintjén (egy `ar.EUR === null` tétel nem jelenik meg EUR
  tervben) — de a redesign C5 EXPLICIT ENGEDNÉ egy ilyen tétel felvételét
  KÉZI ajánlati árral, ami ma egyáltalán nem elérhető út, mert a tétel
  a keresőben SEM jelenik meg.

## Döntések

### 1. `Sor` additív bővítése egy „másik pénznem” stash-mezővel

A MEGLÉVŐ `listaEgysegar`/`tenylegesEgysegar` VÁLTOZATLANUL az
AKTUÁLIS `plan.penznem` állapotát tükrözi (nincs törés a meglévő
sémán/hívási helyeken). Egy ÚJ, opcionális mező —
`masikPenznemAr?: { listaEgysegar: number; tenylegesEgysegar: number }
| null` — tárolja a NEM aktív pénznem utolsó ismert állapotát.
Pénznemváltáskor a rendszer (a) a JELENLEGI pár értékét a
`masikPenznemAr`-be stashelja, (b) ha a `masikPenznemAr`-ben már van
mentett érték az ÚJ pénznemre, azt emeli elő a fő mezőkbe, (c) ha
nincs, a sor az ÚJ pénznemben „hiányzó ár” állapotba kerül (lásd 3.
döntés).

**Miért:** ez a projekt már bevált „opcionális, additív mező,
`schemaVersion` nem emelkedik” konvencióját követi (`mennyisegKezi`,
`elolegSzazalek`, `kedvezmenyOsszeg`, `paciensId` mintájára) — egy
teljes séma-átalakítás (`{HUF: {...}, EUR: {...}}` mindkét mezőre)
törné a MEGLÉVŐ, egyszerű `number` hívási helyeket (PDF, szerkesztő,
összegzés mind `listaEgysegar: number`-t vár), és `schemaVersion`
emelést + migrációt igényelne egy olyan mezőn, ami MA MINDEN mentett
tervben létezik.

**Elvetett alternatíva:** `listaEgysegar`/`tenylegesEgysegar` átalakítása
`Partial<Record<Penznem, number>>`-re (a `Tetel.ar` mintájára) —
elvetve; bár ez az árlistai oldallal szimmetrikus lenne, BREAKING
változás minden meglévő olvasóra (PDF, szerkesztő, összegzés,
letöltési fájlnév-logika mind egyetlen `number`-t vár), és egy régi
`terv.json` betöltésekor migrációt igényelne — az additív stash-mező
ugyanazt a funkcionális célt éri el kompatibilis módon.

### 2. Pénznemváltás NEM destruktív többé

Az `applyPenznem()` MEGLÉVŐ „minden sor törlődik” ága megszűnik — a
váltás mostantól az 1. döntés stash-mechanizmusát használja
soronként.

**Miért:** D91/D483-531 explicit ezt kéri (a HUF/EUR ajánlati árak
külön tárolása pontosan azért történik, hogy a váltás ne legyen
destruktív) — a mai törlő viselkedés csak azért volt indokolt, mert
nem volt hova „elmenteni” a másik pénznem állapotát; az 1. döntés ezt
megoldja.

**Fontos, mit ez a döntés NEM változtat meg:** a `Plan.penznem`
VÁLTOZATLANUL egyetlen, „aktuális dokumentum-pénznem” mező marad (nincs
külön „nézett” és „dokumentum” pénznem, D531, lásd az 52. tétel) — ez
a tétel a SOROK mögöttes állapotát bővíti, nem a `Plan` szintű
pénznem-fogalmat.

### 3. `null` EUR listaár kezelése (C5)

Egy EUR-ban nem árazott tétel (`ar.EUR === null`) EUR tervben is
KERESHETŐ és FELVEHETŐ marad — a keresőben megjelenik, a listaár
helyén „—”/„nincs megadva” állapot látszik, és az Ajánlati ár mező
KÉZZEL kitölthető. Ha a kézi ajánlati ár hiányzik, ez FINALIZÁCIÓS HARD
BLOCK.

**Miért:** C5 explicit ezt kéri — a mai, csendes kiszűrés a keresőből
(`x.ar[currency]` feltétel) elzárja a dokit egy legitim eset elől
(egy tétel, aminek még nincs beárazott EUR referencia, de a doki egy
konkrét páciensnek meg tudja mondani az árát).

**Elvetett alternatíva:** automatikus HUF→EUR átváltás egy
árfolyammal — explicit kizárva (C5 „automatikus FX tiltása”,
konzisztens a `docs/01` D11-gyel: „Nincs árfolyam-átváltás, nincs
külső hívás”).

### 4. Nincs automatikus FX — rögzítés

Sem a sor-szintű, sem a tétel-szintű ár SOHA nem számolódik át
automatikusan a két pénznem között — minden EUR/HUF érték egymástól
FÜGGETLENÜL, KÉZZEL megadott (D91, `docs/01` D11).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az árlista-tétel (`Tetel.ar`) pénznemenkénti tárolása — MÁR MA IS
  megvan, ez a tétel csak a PLAN-SOR oldalán pótolja ugyanezt az elvet.
- Egyedi végösszeg/előleg pénznemenkénti állapota — 63./64. tétel
  (DP-046/047), amik erre a tételre ÉPÜLNEK (ugyanazt a stash-mintát
  alkalmazzák a `kedvezmenyOsszeg`/`elolegSzazalek` mezőkre).
- Árlista-snapshot/refresh az AKTUÁLIS pénznemen belül — 61. tétel
  (DP-044).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` `Sor` — az új `masikPenznemAr?` mező (1.
  döntés).
- `app/src/pages/PatientPage.tsx` `applyPenznem()` — a destruktív
  törlő ág megszüntetése, a stash-logika bekötése (2. döntés).
- `app/src/pages/PlanEditorPage.tsx` `available`/keresőszűrés
  (`:179-183`) — a `null` EUR listaár melletti felvehetőség (3.
  döntés).
- `app/src/domain/veglegesitesOr.ts` — új hard block a hiányzó kézi
  EUR ajánlati árra (3. döntés).

## Tesztelés (irányadó, nem kimerítő)

- HUF→EUR→HUF pénznemváltás nem törli a sorokat; mindkét irányban a
  korábban beírt árak visszaállnak, ha korábban már be voltak állítva
  abban a pénznemben.
- Egy sor, aminek nincs mentett állapota az új pénznemben, „hiányzó ár”
  jelzést kap, törlés nélkül.
- EUR-ban nem árazott tétel EUR tervben kereshető és felvehető, kézi
  ajánlati árral; kézi ár hiánya blokkolja a véglegesítést.
- Sehol nincs automatikus HUF↔EUR átszámítás.
