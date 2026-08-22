# Backlog 72. tétel — Final fázis- és kezeléssor megjelenítés — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 72. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-061
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D173`–`D178`, `D278`–`D306` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Sorrendi függőség:** a 71. tételre (DP-060) épül — ez a tétel a
`TervReszleteiPage.tsx` „phases” layout-slotjának TARTALMÁT adja.

## Probléma

Ma nincs read-only fázis-/sor-megjelenítés — a `PlanEditorPage.tsx`
`PhaseSection`/`LineRow` komponensei SZERKESZTHETŐ állapotot feltételeznek
(input mezők, `onPatch` callback-ek, keresők) — ezek közvetlen
újrahasznosítása egy read-only nézeten hibás interakciós felületet adna
(pl. egy `TextField` ott, ahol semmi nem szerkeszthető).

## Döntések

### 1. Új, read-only komponensek — a domain-logika újrahasznosításával

Új `FazisReszlet`/`SorReszlet` (vagy hasonló nevű) komponensek épülnek,
DE a MEGLÉVŐ `domain/totals.ts` (`fazisOsszeg`, `sorOsszeg`) és
`domain/toothVisual.ts` hívásával — a vizuális szerkezetet a
`PlanEditorPage.tsx` `PhaseSection`/`LineRow` mintája inspirálja, de a
kódot NEM importáljuk közvetlenül (más interakciós modell).

**Miért biztonságos `fazisOsszeg`/`sorOsszeg` hívása egy VÉGLEGESÍTETT
tervre:** `Osszesitok` (a mentett plan-szintű snapshot, D7) nem
tartalmaz fázisonkénti bontást — nincs máshonnan honnan olvasni a
fázis-összeget. Mivel `plan.fazisok` egy véglegesített verzión D4 szerint
immutable (soha nem íródik felül), a `fazisOsszeg`/`sorOsszeg` hívása
ezen az adaton NEM „árlista-alapú újraszámolás” (amit D7 tilt), csak a
MÁR RÖGZÍTETT pillanatkép-árak összegzése — determinisztikusan
ugyanazt adja minden hívásra.

### 2. Fázis-szekciók: alapból nyitva, saját táblafejléc

Fázisok alapból NYITVA, összecsukhatók (D173); minden fázisnak SAJÁT
táblafejléce van (D288), sticky (D298) — a fázis-CÍM viszont NEM sticky
(D299, csak a táblafejléc az).

### 3. Oszlopok

Stabil oszlopkészlet: Beavatkozás / Fog / Db / Egységár / Összeg (D284).
Szöveg balra, szám jobbra + tabular nums (D296–297). Hosszú kezelésnév
tördelhet, a numerikus cella felül igazodik (D296).

### 4. Ár-megjelenítés: ajánlati elsődleges, listaár csak eltérésnél

Ha listaár === ajánlati ár, EGY unit price érték látszik; ha eltér, az
ajánlati az elsődleges, a listaár másodlagosan (kisebb/halványabb)
jelenik meg mellette (D282, D285). A `Db` mindig explicit `×N` logikával
jelenik meg (D283 — pl. akkor is kiírva, ha `N=1`, konzisztens
oszlopszélesség kedvéért).

**A sor-szintű kedvezmény/felár JELVÉNY (a badge maga) NEM ennek a
tételnek a hatásköre** — az a 74. tétel (DP-063) hozza létre (ott a
teljes D308–341 tartomány, `[Felár]`/`[-100%]` speciális esetekkel
együtt). Ez a tétel csak a NÉVCELLÁT alakítja úgy, hogy legyen hely egy
ilyen jelvénynek (a mai `LineRow` badge-sorának mintáján).

### 5. Fog mező és hiányzó fog

A fog mező pontosan az EREDETI szabadszöveges tartalmat mutatja (D294,
nem parse-olt/normalizált alakot); hiányzó fog esetén „—” (D295).

### 6. Leírás: alapból rejtett, explicit kibontás

Leírás csak explicit kibontásra nyílik (D289), teljes szélességű második
sorban (D290), TÖBB egyszerre is nyitható (D291). Fázis
összecsukása/kinyitása MEGŐRZI az egyes sorok leírás-nyitottsági
állapotát (D292) — ez a 71. tétel `key`-alapú VERZIÓVÁLTÁS-reset
mintájától FÜGGETLEN eset: itt fázis-toggle-ről van szó, nem
verzióváltásról, tehát ez lokális React state, ami a fázis-collapse alatt
NEM unmountol (csak vizuálisan rejtőzik). Csukott fázis fejléce jelzi, ha
van fázismegjegyzés (D293).

### 7. Fázismegjegyzés

Látszik, ha van (D279); a label egyszerűen `Megjegyzés` (D280, a mai PDF
`Megjegyzés: <szöveg>` inline mintájához hasonlóan, de itt önálló mezőként).

### 8. Becsült ár (`savos`) — statikus jelvény

Kompakt jelvény (D281), NEM toggle-gomb (szemben a szerkesztő `≈`
ikongombjával, ami ott aktívan kapcsolható) — itt csak megjelenítés.

### 9. 4+ fázisnál fázis-ugró navigáció

Dropdown, ordinal + tényleges fázisnév (D300–302), scrollspy-vel (D303),
egy kompakt, KÉTSOROS sticky nav (fázis-ugró + a fázis táblafejléce) a
globális fejléc alatt, kizárólag a treatment section-ön belül aktív
(D304–305). Az ugrás NEM reseteli a lokális state-eket (D306) — ez csak
scroll+fókusz, függetlenül a 71. tétel verzióváltás-reset mintájától.

**Miért ez a legösszetettebb új interakció ebben a tételben:** a sticky
scrollspy-navigáció (pozíció-követés görgetés közben + a megfelelő
dropdown-elem kiemelése) ÚJ, a projektben eddig nem használt UI-mintát
vezet be — a `docs/07-felulet-rendszer.md` billentyűzet-/akadálymentességi
szabályai szerint kell megépíteni (fókuszkezelés, ARIA).

### 10. Stabil sor-szintű DOM id — a 73. tétel függősége

`SorReszlet` minden sorhoz stabil, egyedi DOM `id`-t ad (a szerkesztő
`fog-<fazisIndex>-<sorIndex>` mintájára, `PlanEditorPage.tsx:1136`) —
ez a NÉVCELLÁT/sor gyökérelemét jelöli, nem egy input mezőt (itt nincs
input). Ez saját magában nem hordoz megfigyelhető viselkedést ebben a
tételben, de KÖVETELMÉNY a 73. tételhez (DP-062): a fogtérkép-kattintás
scroll-navigációja erre az id-re épít (`scrollIntoView`), és e nélkül
nem tudna konkrét sorra ugrani.

**Miért itt, nem a 73. tételben rögzítve:** az id-t a SOR komponense adja
ki, aminek a struktúráját ez a tétel hozza létre — a 73. tétel csak
FOGYASZTJA, nem hozza létre.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A sor-szintű kedvezmény/felár jelvény tartalma — 74. tétel (DP-063).
- A fogtérkép és a hozzá tartozó kattintás-navigáció — 73. tétel
  (DP-062).
- A lap héja, header, verziónavigáció — 71. tétel (DP-060).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/TervReszleteiPage.tsx` (71. tétel) — a „phases”
  layout-slot tartalma.
- Új komponensek (pl. `pages/tervReszletei/FazisReszlet.tsx`,
  `SorReszlet.tsx`, `FazisUgroNav.tsx`) — read-only rendering,
  `domain/totals.ts`/`domain/toothVisual.ts` hívásával.

## Tesztelés (irányadó, nem kimerítő)

- Minden fázis alapból nyitva; összecsukható, a leírás-nyitottság
  megmarad összecsukás/kinyitás után.
- Egy sor, aminek ajánlati ára megegyezik a listaárral, EGY árat mutat;
  eltérésnél mindkettő látszik, az ajánlati elsődlegesen.
- Hiányzó fog „—”-t mutat, nem üres cellát.
- Minden sor gyökéreleme stabil, egyedi DOM `id`-vel rendelkezik (a 73.
  tétel scroll-navigációja erre épít).
- 4 vagy több fázisnál megjelenik a fázis-ugró dropdown, scrollspy-vel
  követi az aktuális fázist görgetés közben.
- A táblafejléc sticky marad görgetéskor a treatment section-ön belül,
  de a fázis-cím nem.
