# Backlog 65. tétel — Manuális szövegek nyelvi review-ja — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 65. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-048
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D456`–`D481` a redesign saját D1–D606 számozásából valók — NEM azonosak
a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

**Nyelvi review-metaadat SEHOL nem létezik** (repo-szintű grep
`authoredInLanguage|reviewedForLanguage|nyelvEllenorizve` egyetlen
valódi találatot sem ad — az egyetlen hit egy teljesen független
kommentben szereplő „authored” szó, `domain/toothVisual.ts:19`, az SVG
fog-sorrendről). A `Sor`-nak nincs nyelvi mezője; a `Plan.nyelv` a
DOKUMENTUM egészének kimeneti nyelve, nem egy-egy SZÖVEG eredetének
jelzője.

**Ami ma létezik, EGY MÁSIK problémára válaszol.**
`sorFallback()`/`fallbackSorok()` (`domain/nev.ts:61-103`) az
ÁRLISTAI fordítás hiányát/eltérését jelzi (`nincsForditas`,
`elterAzArlistatol`, `egyedi`) — ez egy MÁS kérdés, mint „a doki saját,
szabadon begépelt szövege milyen nyelven íródott, és lektorálva
van-e a MÁSIK nyelvre”:

- **`sorFallback` MAGYAR terven mindig `null`-t ad** (`nev.ts:66`) — egy
  magyar tervbe véletlenül vagy szándékosan németül begépelt szöveg
  MA TELJESEN LÁTHATATLAN.
- **A `leirasSnapshot` (leírás) egyáltalán nem kap semmilyen jelzést** —
  `leirasKoveti()` (`nev.ts:116-119`) ma kizárólag a nyelváltás-szinkron
  belső logikájában fut (`PatientPage.tsx:83-85`), sosem táplál
  badge-et vagy figyelmeztetést.
- **Az `egyedi` (árlistán kívüli sor) eset a mai komparátor SAJÁT
  kommentje szerint is deklaráltan tehetetlen**: „nem `'nincsForditas'`,
  mert nem árlistai fordítás hiányzik, hanem **nem ellenőrizhető,
  milyen nyelven íródott**” (`nev.ts:50-54`) — ez pontosan az a rés,
  amit ez a tétel tölt be.

## Döntések

### 1. Új review-metaadat a `Sor` szabadon szerkeszthető szövegein

A `Sor` (név és leírás mezőin egyaránt) két új, opcionális mezőt kap:
`authoredInLanguage` (melyik nyelven íródott az aktuális kézi szöveg)
és `reviewedForLanguage` (ha nem `null`, jelzi, hogy a szöveget
explicit ellenőrizték/elfogadták a MÁSIK, aktuálisan megjelenített
nyelvre is) — a redesign D478 végleges elnevezése szerint.

**Miért:** D478 explicit ezt a két mezőt kéri; additív, opcionális
mezőként illeszkedik a projekt bevált konvenciójába
(`mennyisegKezi`/`leirasSnapshot` mintája, nincs `schemaVersion`-
emelés). Csak a KÉZI (nem árlistától követett) szövegekre értelmezhető
— egy default-following sor a `nevKoveti()`/`leirasKoveti()` mintáján
marad, ennek a mezőnek nincs rá hatása.

### 2. Mismatch soft warning + explicit field-level „Nyelv ellenőrizve"

Ha egy kézi szöveg `authoredInLanguage`-e ELTÉR a terv aktuális
`nyelv`-étől, ÉS nincs `reviewedForLanguage` bejegyzés az aktuális
nyelvre, a véglegesítés-őr egy PUHA figyelmeztetést ad (számokkal +
navigációval az érintett sorokhoz, D457), és a mezőn magán egy
explicit „Nyelv ellenőrizve” vezérlő jelenik meg — ÖNMAGÁBAN a szöveg
szerkesztése NEM oldja fel a mismatch-et, csak ez a explicit akció
(D459).

**Miért:** D456/D459 explicit ezt kéri — egy egyszerű szerkesztés
(akár csak egy elgépelés javítása) nem bizonyítja, hogy a doki
ténylegesen ellenőrizte a szöveg nyelvi helyességét; csak egy tudatos
„igen, ez a szöveg jó ezen a nyelven” jelzés számít review-nak.

### 3. Normalizáció: csak whitespace-trim nem invalidál review-t

A review-státusz csak akkor invalidálódik, ha a szöveg TÉNYLEGESEN
(nem csak vezető/záró whitespace szinten) megváltozik (D462/D463).

**Miért:** D462/463 explicit ezt kéri — egy véletlen szóköz-javítás
nem kellene, hogy elveszítse egy már elvégzett review-t.

### 4. Field-level review UI csak mismatch esetén jelenik meg

A „Nyelv ellenőrizve” vezérlő KIZÁRÓLAG akkor látszik egy mezőn, ha
tényleges mismatch áll fenn a JELENLEGI dokumentumnyelvhez képest —
review után a figyelmeztetés TELJESEN eltűnik, nincs „✓ ellenőrizve”
sikerjelvény (D464/D465). A dokumentumnyelv puszta VÁLTÁSA
önmagában NEM módosítja a review-metaadatot (D466).

**Miért:** D464/465/466 explicit ezt kéri — a cél a zajmentesség: a
doki csak akkor lásson bármit erről, amikor tényleg tennivalója van.

### 5. Guided review a valódi szerkesztő-mezőkhöz navigál

A véglegesítés-őr checklistjéből egy „irányított review” indítható,
ami VÉGIGVEZETI a dokit a még ellenőrizetlen szövegeken — de a
navigáció a VALÓDI `PlanEditorPage` mezőkhöz visz (nem egy duplikált,
külön modal-szerkesztőhöz, D469), auto-advance-szel review után, Back
támogatással (D468), és a queue a JELENLEGI piszkozat állapotát
dinamikusan követi, nem egy fix N/M számlálót (D473).

**Miért:** D467-474 explicit ezt kéri — a projekt már bevált elve
(„nincs duplikált szerkesztő-felület”, lásd a `TorzsadatDiffDialog`
hasonló, de más célú mintáját) itt is érvényesül: a doki mindig a
TÉNYLEGES mezőn dolgozik, nem egy másolaton.

**Sorrend:** a review-sorrend a dokumentum/workflow sorrendjét követi:
tervcím → fázisok/sorok/leírások/megjegyzések (D472).

### 6. Ha nincs reviewed, teljes átírás sem old fel automatikusan

Ha egy mismatch-elt szöveget a doki A MÁSIK nyelven ír át teljesen
(akár szó szerint lefordítja), ez ÖNMAGÁBAN nem oldja fel a mismatch-et
— az explicit „Nyelv ellenőrizve” akció továbbra is szükséges, nincs
„jelentős változás” heurisztika (D480).

**Miért:** D480 explicit kizárja a heurisztikus feloldást — egy
automatikus „ez elég másnak tűnik, biztos jó” döntés megbízhatatlan
lenne egy jogi dokumentumon.

### 7. Reset törli a manuális felülírást ÉS a nyelvi metaadatot

A 60. tétel (DP-043) 1./4. döntésében bevezetett név/leírás reset
(vissza az árlistai default-following állapotra) egyúttal törli az
`authoredInLanguage`/`reviewedForLanguage` metaadatot is (D481).

**Miért:** D481 explicit ezt kéri — egy default-following szövegnek
nincs értelme review-metaadatot hordoznia (a `nevKoveti()`/
`leirasKoveti()` már eldönti a nyelvi kérdést az árlista alapján).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A `sorFallback`/`fallbackSorok` ÁRLISTAI-fordítás-hiány mechanizmusa
  — VÁLTOZATLAN marad, EGYMÁS MELLETT él ezzel a tétellel, nem
  összevonva (lásd Probléma).
- A név/leírás reset-vezérlők BEVEZETÉSE — 60. tétel (DP-043); ez a
  tétel csak BŐVÍTI azokat a review-metaadat törlésével (7. döntés).
- A véglegesítés-őr checklist EGÉSZ szerkezete — redesign-javaslat
  DP-051; ez a tétel csak EGY új puha lépést ad hozzá (2. döntés).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` `Sor` — `authoredInLanguage`/
  `reviewedForLanguage` új, opcionális mezők (1. döntés).
- `app/src/domain/nev.ts` — új komparátor(ok) a mismatch-detektáláshoz,
  a `sorFallback`-tól ELKÜLÖNÍTVE (2–4., 6. döntés).
- `app/src/pages/PlanEditorPage.tsx` `LineRow` — a „Nyelv ellenőrizve”
  mezőszintű vezérlő (2., 4. döntés); a reset-vezérlők bővítése (7.
  döntés).
- `app/src/domain/veglegesitesOr.ts` — új puha lépés a checklistben
  (2. döntés), a queue/sorrend logika (5. döntés).
- Új komponens a guided review nem-modális sávjához (5. döntés).

## Tesztelés (irányadó, nem kimerítő)

- Magyar terven egy németül begépelt sornév mismatch-figyelmeztetést
  kap (ma ez láthatatlan).
- Egyszerű szöveg-szerkesztés (whitespace-en túli tényleges változás)
  UTÁN a review-státusz elvész; puszta trim NEM invalidál.
- „Nyelv ellenőrizve” után a figyelmeztetés eltűnik a mezőről, nincs
  sikerjelvény.
- Dokumentumnyelv-váltás önmagában nem törli/állítja a review-
  metaadatot.
- A guided review a valódi `LineRow` mezőkhöz navigál, nem nyit külön
  modalt.
- A név/leírás reset törli a review-metaadatot is.
- A `sorFallback`/`fallbackSorok` (árlistai fordítás-hiány) mechanizmus
  változatlanul működik, függetlenül ettől a tételtől.
