# Backlog 115. tétel — Nyelv-/pénznemváltás megerősítő dialógusának gombszín-inkonzisztenciája — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 115. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

A „Terv adatai" lap nyelv-/pénznemváltás megerősítő `AlertDialog`-jának
(`app/src/pages/PatientPage.tsx` 499–527. sor) „Folytatás" gombja
`color={pending?.kind === 'nyelv' ? 'red' : undefined}` — kizárólag a
nyelvváltásnál kap explicit piros színt, a pénznemváltásnál nem, holott a
két művelet kockázata azonos: `applyNyelv()` és `applyPenznem()` egyike sem
töröl adatot, csak neveket, illetve árakat frissít az árlistából/a kézi
felülírásokat érintetlenül hagyva (D24, D71).

A piros szín itt félrevezető jelzés — a doki a nyelvváltásnál óvatosabbnak
érzi magát, mint a pénznemváltásnál, pedig egyik sem destruktívabb a
másiknál. Ez a kódbázis saját, más helyeken már dokumentált konvencióját is
sérti: a `components/PlanVersionActionDialog.tsx` 258–260. sorának kommentje
kimondja, hogy „piros csak piszkozat-vesztés kockázatánál" jár, egy tisztán
figyelmeztető, adatvesztés nélküli esetnél a piros „túlsúlyozná" az akciót.
Minden más `AlertDialog.Action` gomb a kódbázisban ezt az elvet követi
(piros: piszkozat/páciens/tétel törlése; semleges: tömeges árváltoztatás,
tétel visszaaktiválása) — a nyelvváltás gombja az egyetlen kivétel.

Forrás: `docs/reviews/2026-09-05-doctor-review-nemet-euro.md` 3. megállapítás
(megfigyelt).

## Döntések

### 1. A „Folytatás" gomb mindkét váltásnál a semleges (alapértelmezett) színt kapja

A `pending?.kind === 'nyelv' ? 'red' : undefined` feltétel megszűnik — a
gomb `color` propja nélkül (vagy explicit `undefined`-del) a Radix-alapértelmezett
akcentusszínt kapja, ugyanúgy, ahogy ma a pénznemváltásnál már történik.

**Miért:** a kódbázis saját konvenciója (lásd fent, `PlanVersionActionDialog.tsx`
kommentje) szerint a piros szín valódi adatvesztés-kockázatot jelöl. Sem a
nyelv-, sem a pénznemváltás nem jár azzal — mindkettő csak neveket/árakat
frissít, a kézzel felülírt tartalmat érintetlenül hagyva. A pénznemváltás
gombja ma is helyesen semleges; a javítás a nyelvváltást hozza erre a
szintre, nem fordítva.

Elvetett alternatíva: a pénznemváltás gombját tenni pirossá, a nyelvváltással
egyező irányba egységesítve. Elvetve — ez a kódbázis egészének „piros = valódi
adatvesztés" konvenciójával menne szembe, és a review saját megfigyelése is
azt mondja ki, hogy egyik váltás sem hordoz extra kockázatot; a semleges felé
egységesítés az, ami a tényleges viselkedést tükrözi.

Elvetett alternatíva: a piros színt megtartani, de egy magyarázó
tooltippel/szöveggel enyhíteni. Elvetve — ez nem oldaná meg az alapproblémát
(a szín önmagában, első pillantásra súlyosabbnak tűnik, mint amennyire indokolt),
és a kódbázis meglévő konvenciójától (szín = tényleges kockázat) egy plusz,
kompenzáló UI-elemmel térne el feleslegesen.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A dialógus szövegének/tartalmának módosítása** (`nyelvvaltasHatas`/
  `penznemvaltasHatas` élő számlálása, `penznemDialogSzoveg()`) — ezek
  változatlanok, a tétel kizárólag a gomb színét érinti.
- **Az `applyNyelv()`/`applyPenznem()` viselkedésének módosítása** — mindkettő
  ma is helyesen működik (D24/D71 szerint), nem érintett.
- **A `PlanVersionActionDialog.tsx` feltételes piros színének módosítása** —
  az ottani `vanMentetlenPiszkozat ? 'red' : undefined` logika helyesen
  követi a konvenciót, változatlan marad; csak referenciaként szolgál ehhez
  a tételhez.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PatientPage.tsx` 521. sor — a „Folytatás" gomb `color`
  propja.

## Tesztelés (irányadó, nem kimerítő)

- Egy már tételekkel rendelkező tervben nyelvet váltva: a megerősítő
  dialógus „Folytatás" gombja **semleges** (nem piros) színű.
- Ugyanitt pénznemet váltva: a gomb változatlanul semleges — a viselkedés
  a két eset közt vizuálisan egyező.
- A dialógus szövege/számlálása (`nyelvvaltasHatas`/`penznemvaltasHatas`)
  mindkét esetben változatlanul helyes marad — csak a gomb színe módosul.
- Meglévő `PatientPage.test.tsx` tesztek (ha a gomb színét/attribútumát
  vizsgálják) frissítendők az új, egységes elvárásra.
