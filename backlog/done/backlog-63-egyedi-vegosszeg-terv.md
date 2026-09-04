# Backlog 63. tétel — Egyedi végösszeg — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 63. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-046
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D307`–`D324`, `D487`+ a redesign saját D1–D606 számozásából valók — NEM
azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával, és NEM
azonosak a `docs/01` D25-tel (a mai „Kerek végösszeg” alapdöntése — ezt
a tétel a redesign kérése szerint bővíti, nem cseréli le).

**Sorrendi függőség:** a pénznemenkénti külön állapot (D487) a 62.
tételre (DP-045) épül — az a rész VÁRAKOZÓ, amíg a 62. tétel nem
készül el.

## Probléma

- **A mai „Kerek végösszeg” (`kedvezmenyOsszeg`) MÁR MA IS ABSZOLÚT
  ÖSSZEG, nem cél-végösszeg vagy százalék** (`domain/types.ts:144-153`,
  `domain/totals.ts:42-44`) — ez a redesign D25 (`docs/01`) elve
  szerint helyesen működik: a doki a CÉL-végösszeget gépeli be, a
  `Plan`-en fix LEVONT összeg tárolódik.
- **DE csak KEDVEZMÉNYRE korlátozva.** A `KerekVegosszegBlokk`
  (`PlanEditorPage.tsx:1094-1159`) `NumberField`-je `min={0}`, felső
  korlátja pedig `onCommit`-ben a sorok nyers összegére szorít
  (`:1136-1142`, „a mező kizárólag kedvezményre való, felárra nem”) —
  a `kedvezmenyOsszeg` SOSEM lehet negatív, tehát a cél-végösszeg SOHA
  nem emelhető a nyers összeg FÖLÉ.
- **Bekapcsoláskor `0`-ra áll, nem üres/autofókuszált mezőre**
  (`:1118`, `onCheckedChange={(checked) => onChange(checked === true ?
  0 : null)}`).
- **Nincs 0-végösszeg megerősítés.** `NumberField min={0}` + a fenti
  clamp miatt a doki simán beírhat `0`-t célként (=teljes kedvezmény),
  figyelmeztetés/megerősítés nélkül.
- **Nincs blur-only validáció** — a mező `onCommit` (blur/Enter)
  alapú, ez már megfelel D521-nek, de a jelenlegi felső-clamp `onCommit`-
  ban fut, nem egy külön validációs réteg (ez rendben van, csak
  rögzítendő).
- **Nincs finalizációs kapcsolódás** — sem `kedvezmenyOsszeg`, sem az
  ebből számolt eltérés nem jelenik meg a `veglegesitesOr.ts`-ben.

## Döntések

### 1. „Kerek végösszeg” → „Egyedi végösszeg” átnevezés

A kapcsoló és a mező felirata „Kerek végösszeg beállítása”/„Cél
végösszeg”-ről a redesign D312 szerinti „Egyedi végösszeg”-re változik.

**Miért:** D312 explicit ezt kéri — a névváltás egyben jelzi a 2.
döntés szemantikai bővülését (nem csak „kerekítés”, hanem tetszőleges
egyedi végösszeg, akár felfelé is).

### 2. Felár-irány engedélyezése — a mai csak-kedvezmény korlát megszüntetése

A cél-végösszeg mostantól a sorok nyers összege FÖLÉ is állítható
(felár) — a `kedvezmenyOsszeg` mező szemantikailag „terv-szintű
eltérés”-sé bővül: pozitív érték kedvezményt, negatív érték felárat
jelent (vagy — a megvalósító döntése — egy előjeles belső ábrázolás,
ami a UI-n „Kedvezmény: X”/„Felár: X” alszövegként jelenik meg, a
MEGLÉVŐ `Summary` mintáján, `PlanEditorPage.tsx:1072-1076`).

**Miért (önállóan eldöntve, nem user-kérdés):** D308 explicit felár-
irányt is kér. A mai csak-kedvezmény korlát ("a mező kizárólag
kedvezményre való, felárra nem") egy TUDATOS, de tisztán HATÓKÖR-
DÖNTÉS volt — nem egy adatintegritási védelem (ellentétben pl. az
Előleg százalék-alapú tárolásával, ahol a user explicit döntött a
64. tételnél egy hasonló konfliktusban). A `tervVegosszeg()`
(`domain/totals.ts:42-44`) `Math.max(0, ...)` padlózása VÁLTOZATLANUL
véd a negatív végösszeg ellen — a felár engedélyezése ezt nem sérti,
csak a `kedvezmenyOsszeg` előjelének tartományát bővíti.

**Elvetett alternatíva:** a mai korlát megtartása, D308 elvetése —
elvetve; a jelen tétel nem talált olyan dokumentált, tudatos
adatintegritási indokot, ami a C4/deposit-konfliktusokhoz hasonlóan
user-döntést indokolna — a korlát puszta hatókör-szűkítés volt a 9.
(D25) tétel eredeti megvalósításakor.

### 3. `0` végösszeg — üzletileg valid, explicit megerősítéssel

A doki beállíthat `0` cél-végösszeget (=teljes elengedés), de ez
EGYSZERI, explicit megerősítést kér (D522) — a megerősítés PÉNZNEMEN-
KÉNT külön állapot (D524, a 62. tételre épül), és addig érvényes, amíg
az összeg `0` marad; egy `0→más→0` váltás új megerősítést kér (D523).

**Miért:** D522-524 explicit ezt kéri — egy teljesen elengedett
végösszeg legitim (pl. jóváhagyott jótékonysági eset), de elég szokatlan
ahhoz, hogy egyszer tudatosítani kelljen, elgépelés ellen védve.

### 4. Bekapcsoláskor üres, azonnal fókuszált mező

A kapcsoló bekapcsolásakor a cél-végösszeg mező ÜRESEN, azonnali
fókusszal jelenik meg — nincs `0`/alapérték előtöltés.

**Miért:** D520 explicit ezt kéri — a mai `0` előtöltés (ami
`kedvezmenyOsszeg: 0`-t ír, azaz „nincs kedvezmény, de a kapcsoló be
van kapcsolva” állapotot) félrevezető: azt sugallja, a doki már
eldöntött valamit, holott még be sem gépelt semmit.

### 5. Validáció csak blur/véglegesítési kísérlet után

A kötelező-mező validáció (ha a kapcsoló be van kapcsolva, de a mező
üres marad) csak blur vagy véglegesítési kísérlet UTÁN jelenik meg,
nem azonnal a kapcsoló bekapcsolásakor (D521).

**Miért:** D521 explicit ezt kéri — a 4. döntéssel összhangban: a
frissen bekapcsolt, üres mező nem hibaállapot, amíg a doki még be sem
fejezte a gépelést.

### 6. Pénznemenkénti külön állapot (D487) — a 62. tételre épül

A cél-végösszeg/kedvezmény ÖNÁLLÓ állapotot tart mindkét pénznemre (a
62. tétel `masikPenznemAr`-stash mintájának analógiájára) — ez a
döntés VÁRAKOZÓ, a 62. tétel (DP-045) elkészültéig.

**Miért:** D487 explicit ezt kéri, és a 62. tétel pontosan ezt az
architektúrát vezeti be a sorokra — az `Egyedi végösszeg` ugyanazt a
mintát kell kövesse konzisztencia kedvéért.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az Előleg (`elolegSzazalek`) saját, párhuzamos átalakítása — 64.
  tétel (DP-047); a két blokk EGYMÁS ALATT él, de a döntéseik függetlenek.
- A pénznemenkénti dual-state alap-architektúra — 62. tétel (DP-045),
  ez a tétel csak FOGYASZTÓJA (6. döntés).
- Az árlista-refresh „Hatás a tervre” impact-számítása — 61. tétel
  (DP-044), ami HIVATKOZIK erre a blokkra, de ennek a tételnek nem
  feladata a refresh-előnézet felépítése.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanEditorPage.tsx` `KerekVegosszegBlokk` (`:1094-1159`)
  — átnevezés, felár-irány, üres+autofókusz, 0-megerősítés (1–5.
  döntés).
- `app/src/domain/totals.ts` `tervVegosszeg()` — a felár-irány
  matematikai kezelése (2. döntés), a `Math.max(0, ...)` padlózás
  megtartásával.
- `app/src/domain/types.ts` `Plan.kedvezmenyOsszeg` — dokumentáció-
  frissítés a bővült szemantikára (2. döntés); a pénznemenkénti bővítés
  a 62. tételre vár (6. döntés).

## Tesztelés (irányadó, nem kimerítő)

- A kapcsoló felirata „Egyedi végösszeg beállítása”.
- A cél-végösszeg beállítható a sorok nyers összege FÖLÉ is (felár), és
  ez „Felár: X” alszöveget ad.
- `0` cél-végösszeg beállítása egyszeri megerősítést kér; a
  megerősítés érvényben marad, amíg az érték `0` marad.
- Bekapcsoláskor a mező üres és azonnal fókuszban van, nem `0`.
- Üres, kötelező mező hibája csak blur/véglegesítési kísérlet után
  jelenik meg.
