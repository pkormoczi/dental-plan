# Backlog 48. tétel — Új verzió létrehozása — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 48. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-022
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D12`, `D24`, `D139`, `D530`, `D536`, `D554` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

## Probléma

A mai „Új verzió” (`PatientPlanChains.tsx:598–600` → `runOrConfirm` →
`openVersion`, `:139–158`) egyetlen, egységes útvonal, függetlenül
attól, MELYIK verzióról indították:

- **Nincs „csak legfrissebből” korlátozás.** A `⋯` menü minden
  verziósoron azonos (`:535–618`, a `.map` nem tesz `vi === 0`
  megkülönböztetést) — v1-ből indítva egy 5-verziós láncon a mentés
  csendben `v6`-ot hoz létre (`nextVersionNumber` = max+1,
  `DemoStorage.ts:497–503`), a lánc némán „elágazik” a fejére, jelzés
  nélkül.
- **`openVersion` pontosan a mentett pillanatképet tölti be**
  (`loadPlanIntoDraft`, `AppState.tsx:344–365` → `frissDatummal`,
  `domain/ujVerzioDatum.ts:29–35`), auto-refresh nélkül — ez MÁR MA IS
  helyes (D139), csak rögzítendő.
- **`statusz` NEM áll vissza `PISZKOZAT`-ra.** A `frissDatummal` csak
  `keltezes`/`ervenyesIg`-et érinti; a betöltött piszkozat `statusz`
  mezője `'VEGLEGES'` marad. Ennek két látható mellékhatása van: a
  szerkesztő fejléce „…véglegesítve”-t ír egy még el sem mentett
  piszkozatnál (`PlanEditorPage.tsx:545`), és az Előnézet letöltése NEM
  kap `PISZKOZAT-` előtagot (`PreviewPage.tsx:550–554`,
  `isDraft: plan.statusz !== 'VEGLEGES'` → hamis) — ezt a `docs/03`
  „Letöltési fájlnév” szakasza ma TUDATOS KORLÁTKÉNT dokumentálja.
- **Nyelv/pénznem zárolva marad.** `PatientPage.tsx:56–59` a `tervId
  !== ''` alapján zárol — „Új verzió” nyitásakor a `tervId` megmarad
  (ez helyes, a lánc-hovatartozás jele), tehát a nyelv/pénznem mező a
  draftban NEM szerkeszthető, holott D530/D484/D486 szerint módosítható
  kellene legyen.
- **Orvos-öröklés**: a betöltött piszkozat `orvos` mezője a mentett
  verzióé — nincs „ha már inaktív, essen vissza a globális defaultra”
  logika, mert az „aktív/inaktív orvos” fogalma ma nem létezik
  (`Settings.orvosok: string[]`).
- **„Csak ajánlat”**: a mai kódban ez a `PreviewPage` lokális
  `useState`-je (`:50`), NEM a `Plan` mezője — egy „Új verzió” nyitás
  tehát mindig `false`-ra reseteli, nincs mit örökíteni.
- A `Kezelések` lépésre nyitás (`navigate('/terv')`, `openVersion:148`)
  MÁR MA IS ez — rögzítendő.

## Döntések

### 1. „Új verzió” kizárólag a lánc legfrissebb verziójából indítható

A `⋯` menü „Új verzió” pontja csak a lánc LEGFRISSEBB verziósorán
jelenik meg (D24); egy historical (nem legfrissebb) soron helyette egy
„Ugrás a legfrissebb verzióra” navigáció áll ugyanabban a menüben.

**Miért:** D24 explicit ezt kéri; a mai jelöletlen elágazás (lásd
Probléma) adatvesztés-szerű zavart okoz — a doki azt hiheti, egy régi
verziót folytat, valójában egy új „fejet” hoz létre a láncon, ami a
korábbi legfrissebb verziót a listán „megelőzi”, félrevezető sorrendet
adva.

**Elvetett alternatíva:** megengedni bármelyik verzióból, csak
figyelmeztetéssel — elvetve, mert D24 explicit tiltást kér, nem
figyelmeztetést; a historical verzióból induló módosítás helyes útja a
„Másolás új tervbe” (49. tétel), ami EXPLICIT új láncot hoz létre, nem
áltatja a dokit azzal, hogy „folytatja” a régi verziót.

**Megjelenítés helye:** a menüpont elrejtése/cseréje verziósoronként a
50. tétel (DP-024) hatóköre, mert az a teljes verziósor-akciógomb
elrendezését újratervezi — ez a tétel csak a mögöttes SZABÁLYT rögzíti
(mikor engedett/tiltott a hívás), nem a menü vizuális alakját.

### 2. Pontosan az előző pillanatképből indul, auto-refresh nélkül

Az „Új verzió” a forrás verzió PONTOS pillanatképéből indul (sorok,
árak, `arlistaVerzio`, mind változatlan) — nincs automatikus árlista-
frissítés a nyitás pillanatában (D139).

**Miért:** ez a mai, helyes viselkedés (D7 pillanatkép-elv) — a döntés
csak azért kerül ide rögzítésként, hogy a jövőbeli DP-044 (árlista
explicit refresh) tudja, hogy az ottani refresh-mechanizmus SOHA nem
válhat automatikussá ezen az útvonalon sem.

### 3. `statusz` visszaáll `PISZKOZAT`-ra nyitáskor, `tervId` érintetlen

A `loadPlanIntoDraft` (vagy az „Új verzió” hívási útja specifikusan)
mostantól `statusz: 'PISZKOZAT'`-ra állítja a betöltött piszkozatot —
a `tervId` (a lánc-hovatartozás jele) VÁLTOZATLAN marad (user-döntés).

**Miért:** a `statusz` a mai, be nem fejezett szerkesztés állapotát
kellene tükrözze, nem a FORRÁS verzió lezárt állapotát — a mai
viselkedés két látható hibát okoz (lásd Probléma: hamis „véglegesítve”
fejléc-jelvény, hiányzó `PISZKOZAT-` letöltési előtag), amik user-döntés
alapján NEM maradnak tudatos korlátként dokumentálva, hanem itt
javításra kerülnek.

**Hatás a dokumentációra:** a `docs/03-funkcionalis-spec.md` § „Letöltési
fájlnév” jelenlegi „Tudatos korlát: …” bekezdése a tétel lezárásakor
törlendő, mert a benne leírt hiányosság megszűnik.

**Elvetett alternatíva:** a `tervId`-t is nullázni — elvetve, az pont a
„Másolás új tervbe” (49. tétel) viselkedése lenne, összemosná a két,
szándékosan eltérő útvonalat (D7 „új terv” vs. „verzió” fogalmi
elválasztás).

### 4. Közvetlenül a `Kezelések` lépésre nyit

„Új verzió” nyitása után a doki közvetlenül a `Kezelések` workflow-
lépésen (`/terv`) találja magát, a `Terv adatai` lépés (`/paciens`)
elérhető marad a stepperen keresztül, de nem ez a belépési pont (D12).

**Miért:** ez a mai, helyes viselkedés — rögzítés, mert a 49. tétel
(„Másolás új tervbe”) EZZEL ELLENTÉTBEN a `Terv adatai`-ra navigál (D7
„ez egy ÚJ terv indítása” jelzés) — a két eltérő nyitási pont a
fogalmi különbség egyik hordozója (`docs/03` „A négy terv-létrehozási
út”).

### 5. Nyelv/pénznem öröklődik, de a draftban módosítható marad

Az „Új verzió” a forrás verzió `nyelv`/`penznem` értékét örökli, de a
`PatientPage.tsx` mai `tervId !== ''` alapú zárolása ETTŐL a
draft-típustól NEM vonatkozhat rá — a doki szabadon módosíthatja
nyelvet/pénznemet a stepperen (D530, D484/D486).

**Miért:** D530 explicit ezt kéri — egy visszatérő páciensnél időközben
változhat, milyen nyelven/pénznemben szeretnék folytatni az ajánlatot;
a mai zárolás (ami eredetileg a MÁR MENTETT tervek visszamenőleges
átírását védte) itt túlzottan szigorú, mert ez a draft még nincs
elmentve ÚJ verzióként.

**Függőség:** a tényleges zárolás-logika UI-szintű átdolgozása (mi
számít „zárolt”-nak a `PatientPage.tsx`-en) a redesign-javaslat DP-031
hatóköre — ez a tétel csak azt rögzíti, hogy az „Új verzió” útvonalon a
zárolásnak FEL KELL OLDÓDNIA, a konkrét megvalósítás a DP-031-re vár.
Amíg DP-031 nincs kidolgozva, ez a döntés VÁRAKOZÓ (nem végrehajtható
önmagában).

### 6. Orvos öröklése, ha még aktív, egyébként globális default + info

Az „Új verzió” a forrás verzió orvosát örökli, HA az még aktív orvos;
ha időközben inaktiválták, a globális default orvosra esik vissza, egy
rövid tájékoztató jelzéssel (D536).

**Miért:** D536 explicit ezt kéri — egy inaktivált orvos csendes
öröklése egy olyan tervet hozna létre, ami finalizáláskor úgyis hard
blokkba ütközne (D537 mintája szerint egy aktív draft megtarthatja az
időközben inaktivált orvost, de nem finalizálható vele) — jobb ezt már
nyitáskor jelezni.

**Függőség:** akárcsak a 3. döntésnél (47. tétel), az „aktív/inaktív
orvos” fogalma MA NEM létezik — ez a döntés VÁRAKOZÓ, a redesign-javaslat
DP-032 (orvos-törzs) kidolgozása után hajtható végre.

### 7. „Csak ajánlat” állapot öröklődik

Az „Új verzió” megtartja a forrás verzió „Csak ajánlat” állapotát
(D554).

**Miért:** D554 explicit ezt kéri — ha egy korábbi ajánlat „csak
ajánlat” módban készült (pl. a nyilatkozat sablon még nem volt
lektorálva), logikus, hogy a folytatása is ebben a módban induljon,
amíg a doki explicit nem vált.

**Függőség:** a „Csak ajánlat” ma NEM a `Plan` mezője, hanem a
`PreviewPage` lokális állapota — ez a döntés VÁRAKOZÓ, a redesign-javaslat
DP-054 (Csak ajánlat mód, ami a `Plan`-re emeli a flaget) kidolgozása
után hajtható végre.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A verziósor vizuális akciógomb-elrendezése (melyik gomb látható,
  melyik a `⋯`-ben, a historical „Ugrás a legfrissebbre” link
  megjelenítése) — 50. tétel (DP-024).
- A `Terv adatai` oldal nyelv/pénznem UI-ja és a zárolás tényleges
  átdolgozása — redesign-javaslat DP-031.
- Az orvos-törzs (aktív/inaktív, választó UI) — redesign-javaslat DP-032.
- A „Csak ajánlat” flag `Plan`-re emelése és a hozzá tartozó UI —
  redesign-javaslat DP-054.
- Az „Új lánc” (47. tétel) és a „Másolás új tervbe” (49. tétel) saját
  öröklési szabályai.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/PatientPlanChains.tsx` `openVersion()` — a
  legfrissebb-only korlátozás bekötése (1. döntés), a `statusz` reset
  hívása (3. döntés).
- `app/src/state/AppState.tsx` `loadPlanIntoDraft()` — a `statusz:
  'PISZKOZAT'` beállítása (3. döntés), a `tervId` érintetlenül hagyása
  mellett.
- `app/src/domain/planFolders.ts` — esetleges új helper a „ez a
  verzió a lánc legfrissebbje-e” eldöntéséhez (1. döntés), a MEGLÉVŐ
  `latestVersionAcrossPlans` mintájára.
- `app/src/pages/PatientPage.tsx` — a `tervId !== ''` zárolás
  felülvizsgálata (5. döntés, VÁRAKOZÓ, DP-031 után).
- `docs/03-funkcionalis-spec.md` § „Letöltési fájlnév” — a „Tudatos
  korlát” bekezdés törlése a tétel lezárásakor (3. döntés).

## Tesztelés (irányadó, nem kimerítő)

- „Új verzió” csak a lánc legfrissebb verziósorán érhető el; historical
  soron a menüpont hiányzik/helyette navigáció áll.
- Egy legfrissebb verzióból nyitott „Új verzió” piszkozata `statusz:
  'PISZKOZAT'`-tal indul, a szerkesztő fejléce ezt tükrözi, az Előnézet
  letöltése `PISZKOZAT-` előtagot kap.
- A `tervId` a nyitás után is a forrás lánc azonosítója (mentéskor
  ugyanabba a láncba kerül `v(n+1)`-ként).
- Nyelv/pénznem a forrásból öröklődik, de amíg a DP-031 nincs
  kidolgozva, ez a pont dokumentált, nem tesztelhető végállapot
  (a mai zárolás marad érvényben, jelezve a tesztben is, hogy VÁRAKOZÓ).
- A nyitás közvetlenül a `Kezelések` lépésre navigál.
