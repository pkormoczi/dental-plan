# Backlog 60. tétel — Kezeléssor szerkesztése — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 60. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-043
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D80`–`D83`, `D87`–`D91`, `D105`–`D106` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

**Fontos hatókör-szűkítés:** a redesign-javaslat DP-043 scope-listája
(`sorrend / mozgatás`, `accordion`) NEM felel meg a tétel saját
D-forrás-tartományának (`D80–D83, D87–D91, D105–D106`) — az alábbi 8.
és 9. döntés ezt explicit feloldja, önállóan (nem user-kérdésként),
mert belső, magán a redesign-javaslaton belüli ellentmondásról van szó,
nem a redesign és a mai app közötti konfliktusról.

## Probléma

- **D80 (egyedi név marker + reset) RÉSZLEGES.** Az `átírt` jelvény
  (`PlanEditorPage.tsx:854-858`) `sorFallback() === 'elterAzArlistatol'`-
  ra épül (`domain/nev.ts:61-72`), ami **`nyelv === 'hu'`-nál MINDIG
  `null`-t ad vissza** (`nev.ts:66`) — tehát MAGYAR terven egy kézzel
  átírt sornév SEMMILYEN jelzést nem kap. Reset (vissza az árlistai
  névre) SEHOL nem létezik.
- **D81 (listaár read-only, ajánlati ár szerkeszthető, eltérés+reset)
  RÉSZLEGES.** `listaEgysegar` valóban sosem szerkeszthető közvetlenül
  (`:956-960`, sima szöveg); `tenylegesEgysegar` szerkeszthető
  (`:965-978`); DE csak KEDVEZMÉNY-jelzés van soron (`−X%`, `:790-795,
  859-863`) — FELÁR-jelzés csak terv-szinten (`Summary`, `:1072-1076`),
  soron nincs. Reset (vissza a listaárra) SEHOL nem létezik.
- **D82 (becsült ár inline checkbox az ár mező ALATT) RÉSZLEGES.** A
  vezérlő MEGVAN, de egy `≈` szövegglyph ghost `IconButton` az ár mező
  MELLETT (ugyanabban a `Flex`-ben, `:962-993`), nem alatta, és nem
  szó szerinti checkbox.
- **D83 (mennyiség/fog szinkron ikon + warning, folyamatos
  státuszszöveg NÉLKÜL) TELJESEN MEGVAN** — csak esemény-vezérelt
  figyelmeztető szöveg van (`:906-916`), folyamatos „szinkronban van"
  jellegű szöveg sehol.
- **D87 (leírás `+ leírás`, lokalizált snapshot) TELJESEN MEGVAN.**
- **D88 (egyedi leírásnál nincs külön label, kompakt reset van)
  RÉSZLEGES.** A label-mentesség megvan (`aria-label` only, `:1021`);
  reset és „ez a leírás egyedi/eltér az árlistától" jelzés NINCS — a
  `leirasKoveti()` (`domain/nev.ts:116-119`) MÁR LÉTEZIK, de a
  szerkesztő SEHOL nem hívja (csak a `PatientPage.tsx` nyelváltás-
  szinkronjában).
- **D105/106 (Fog mező szabadszöveges, opcionális, FDI-felismerés)
  TELJESEN MEGVAN.**
- **Sor-mozgatás**: `docs/03-funkcionalis-spec.md` és a redesign SAJÁT
  D102-je is explicit kimondja: „Tételsorok sorrendje nem
  átrendezhető" — MA IS érvényes állapot, és a D80–91/105–106
  forrás-tartomány EGYETLEN döntése sem ad sorrendezést a soroknak. A
  DP-043 scope-bullet „sorrend / mozgatás" tehát nincs döntéssel
  alátámasztva, és EGYENESEN ELLENTMOND D102-nek.
- **Accordion**: a sorok ma FLAT, mindig látható mezőkkel jelennek meg
  (`LineRow`, `PlanEditorPage.tsx:729-1033`) — az EGYETLEN kinyitható
  elem a leírás alsó sávja, saját triggerrel, NEM a teljes sorra
  kattintva. Az Árlista admin MÁS, valódi accordion-mintája
  (`PriceListAdminPage.tsx:473-572`) tételekre való, nem a terv-sorokra
  — egyetlen D80–91/105–106 döntés sem kér ilyet a terv-soroknak.

## Döntések

### 1. D80 marker nyelvfüggetlenné tétele + reset bevezetése

A „kézzel átírt név" jelzés MAGYAR terven is megjelenik — a `sorFallback`-
tól FÜGGETLEN, tisztán a `nevKoveti()` (`domain/nev.ts:30-33`)
összehasonlítására épülő, önálló marker (a `nyelv === 'hu'`
korai-kilépés csak a `sorFallback` DE-specifikus, „miért nem a terv
nyelvén van" kérdésére vonatkozik, nem arra, hogy a név egyáltalán
eltér-e az árlistaitól). A jelvény mellé egy kompakt reset-vezérlő
kerül, ami a `nevSnapshot`-ot visszaállítja `tetel.nev[nyelv]`-re.

**Miért:** D80 explicit marker+reset-et kér, nyelvtől függetlenül — a
mai `sorFallback`-alapú jelzés csak MELLÉKESEN fedte ezt DE terven,
mert az egy MÁSIK kérdésre (fordítás-hiány/eltérés) válaszol. A hiányzó
HU-jelzés a mai kód egy fel nem ismert vakfoltja, amit ez a tétel
tudatosan zár le.

**Elvetett alternatíva:** a `sorFallback`-ot módosítani, hogy HU
terven is fusson — elvetve, mert az a HU/DE-specifikus fallback-logikát
(hiányzó fordítás vs. eltérő szöveg) keverné össze egy nyelvfüggetlen
„eltér az árlistától" kérdéssel; a két komparátor (a meglévő
`sorFallback` és az új, nyelvfüggetlen marker) EGYMÁS MELLETT él,
külön célra.

### 2. D81 felár-jelzés a soron + reset bevezetése

A soron a MEGLÉVŐ kedvezmény-jelzés (`−X%`) mellé egy FELÁR-jelzés
(`+X%`) kerül, amikor `tenylegesEgysegar > listaEgysegar` (a plan-
szintű `Summary` „Felár" sorának mintájára, de SOR-szinten). Az
Ajánlati ár mező mellé egy kompakt reset-vezérlő kerül, ami
`tenylegesEgysegar = listaEgysegar`-ra állít.

**Miért:** D81 explicit „eltérés és reset" kér — a mai kód csak a
kedvezmény felét és a resetet egyáltalán nem fedi. A `docs/01`
D15/D9 nem tiltja a felár megjelenítését a SZERKESZTŐBEN (a nyomtatvány
D9 szerint sosem mutatja a kedvezményt/felárat — ez a szerkesztő
belső, orvos-only nézete, nem érinti a PDF-et).

**Elvetett alternatíva:** nincs — ez tiszta kiegészítés, nem ütközik
semmivel.

### 3. D82 pozíció-igazítás, widget MEGTARTVA

A `≈` becsült-ár vezérlő MARAD a mai ghost-`IconButton` + szövegglyph
formájában — csak a POZÍCIÓJA igazodik (az ár mező ALÁ kerül, nem
mellé).

**Miért:** a `docs/07-felulet-rendszer.md` EXPLICIT NEVESÍTETT
kivételként engedélyezi ezt a widgetet („a `≈` szövegglyph… nem sérti
a fenti szabályt, de tudatos: a csillag-ikon szándékosan ki van zárva,
mert összetéveszthető lenne az Árlista admin »gyakori« csillagával…
Ne cseréld SVG-re") — egy szó szerinti HTML checkbox-ra váltás nem
indokolt, mert a mai widget funkcionálisan ekvivalens (bináris
be/ki-kapcsoló) és egy tudatos, dokumentált tervezési döntés eredménye.
A D82 „inline checkbox… alatt" szövegéből ez a tétel a POZÍCIÓ részét
veszi át szó szerint, a WIDGET-TÍPUST nem.

**Elvetett alternatíva:** valódi Radix `Checkbox`-ra váltás — elvetve a
fenti, `docs/07`-ben rögzített indokkal.

### 4. D88 leírás-reset + „egyedi leírás” marker bevezetése

A leírás-sáv egy kompakt reset-vezérlőt kap, ami `leirasSnapshot`-ot
visszaállítja `tetel.leiras[nyelv]`-re — a MEGLÉVŐ `leirasKoveti()`
(`domain/nev.ts:116-119`) bekötésével a szerkesztőbe (ma csak a
`PatientPage.tsx` nyelváltás-szinkronja hívja).

**Miért:** D88 explicit kompakt resetet kér — a domain-logika már
létezik, csak nincs a szerkesztőben felhasználva; ez tiszta
bekötés, nem új logika.

**Fontos korlát (D27 mintájára):** a leírásnak NINCS HU-visszaesése —
a reset-vezérlő csak akkor jelenik meg értelmesen, ha
`tetel.leiras[nyelv]` létezik; hiányzó fordításnál a reset nem
alkalmazható (a mező üresen marad, mint ma).

### 5. D83/D87/D105/D106 — rögzítés, nincs kódváltozás

Ezek MÁR MA IS pontosan a redesign kívánt állapotát tükrözik.

### 6. Sor-mozgatás EXPLICIT KIZÁRVA

Ez a tétel NEM vezet be sor-belüli vagy fázisok közötti sor-mozgatást.

**Miért:** a redesign SAJÁT D102 döntése explicit tiltja
(„Tételsorok sorrendje nem átrendezhető”), és a DP-043 forrás-
tartományban (`D80–83, D87–91, D105–106`) egyetlen döntés sem ad
sorrendezést — a DP-javaslat „sorrend / mozgatás” scope-bullet-je
ellentmond D102-nek, és nincs konkrét döntéssel alátámasztva. A
specifikusabb, konkrét döntés (D102) győz egy általános felsorolás-szó
felett.

**Elvetett alternatíva:** sor-mozgatás bevezetése a scope-bullet
szerint — elvetve, mert egyenesen ellentmondana D102-nek, egy másik,
ugyanabban a redesign-döntéssorozatban hozott, konkrétabb döntésnek.

### 7. Accordion-alapú sorszerkesztés EXPLICIT KIZÁRVA

Ez a tétel NEM alakítja accordion-ná a sorokat — a mezők MARADNAK
mindig láthatók, inline, a mai flat-row mintában (D70 AS-IS
szellemében).

**Miért:** a DP-043 forrás-tartomány (`D80–83, D87–91, D105–106`)
egyetlen döntése sem kér accordion-t a terv-sorokra — mindegyik az
INLINE mezőkről szól (label, checkbox, ikon, mező-viselkedés). Az
„accordion” scope-szó valószínűleg az Árlista admin MÁSIK,
tétel-szerkesztő accordion-mintájából került át analógiaként, nem egy
konkrét döntésből.

**Elvetett alternatíva:** accordion bevezetése a scope-bullet szerint
— elvetve, mert nincs döntéssel alátámasztva, és jelentős, indokolatlan
UI-átalakítás lenne egy jól működő, tesztelt mintán.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Fázis-szintű mechanikák — 58. tétel (DP-041).
- Tételkeresés, gyorsgombok, fókusz-flow — 59. tétel (DP-042).
- Árlista-snapshot/explicit-refresh (egy sor ÁRÁNAK az AKTUÁLIS
  árlistához viszonyított követése/frissítése) — 61. tétel (DP-044); ez
  a tétel csak az ÁRLISTAI HIVATKOZÁS pillanatában rögzített érték és a
  DOKI KÉZI ÁTÍRÁSA közti eltérést kezeli (1–2., 4. döntés), nem az
  árlista IDŐKÖZBENI változását.
- Többpénznemes soronkénti ár — 62. tétel (DP-045).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanEditorPage.tsx` `LineRow` (`:729-1033`) — marker/
  reset UI mindhárom mezőn (név, ár, leírás), a `≈` vezérlő
  áthelyezése (1–4. döntés).
- `app/src/domain/nev.ts` `nevKoveti()`/`leirasKoveti()` — bekötés a
  szerkesztőbe (1., 4. döntés).

## Tesztelés (irányadó, nem kimerítő)

- Magyar terven egy kézzel átírt sornév marker-t kap; a marker melletti
  reset visszaállítja az árlistai nevet.
- Egy felár-alá emelt ajánlati ár `+X%` jelzést kap a soron; a reset
  visszaállítja a listaárat.
- A `≈` vezérlő az ajánlati ár mező ALATT jelenik meg, ugyanazzal a
  viselkedéssel, mint ma.
- Egy kézzel átírt leírás resetelhető az árlistai leírásra.
- Nincs sor-mozgató UI sehol (fel/le nyíl, drag) a terv-sorokon.
- A sor mezői VÁLTOZATLANUL mindig láthatók, nincs accordion-szerű
  kinyitás a teljes soron.
