# Backlog 66. tétel — Előnézet oldal layout és validation checklist — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 66. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-050
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D38`–`D39`, `D602` a redesign saját D1–D606 számozásából valók — NEM
azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Sorrendi függőség (előre mutat):** ez a tétel a 67. tételre (DP-051)
épül — a checklist a 67. tételben megszülető egységes, navigálható
hard/soft/info-lista modellt (`VeglegesitesCsekklista`) fogyasztja.
Szándékos eltérés a korábbi tételek mindig-visszafelé-mutató függőségi
mintájától (pl. „a 62. tételre épül”): a DP-050/DP-051 pontosan
„UI fogyasztja a modellt” viszonyban áll, a forrásdokumentum saját
scope-bontása szerint is (DP-051 = „központi finalization validity
model”, DP-050 = „preview page shell” + „navigáció a hibákhoz”).

## Probléma

A mai `PreviewPage.tsx` (`app/src/pages/PreviewPage.tsx`) egyetlen
oszlopos elrendezés:

- felül szórt `Callout`-ok — némelyik MINDIG látszik (`templateError`,
  `nyilatkozatIsPlaceholder`, `sablonFallback`, `pdfError`,
  `masterElteresek`), mások csak egy SIKERTELEN véglegesítési kísérlet
  UTÁN (`nameMissingNotice`, `uresSorokNotice`);
- alatta a „Csak ajánlat” checkbox + a „Letöltés”/„Véglegesítés és
  mentés” gombsor;
- alul a teljes szélességű PDF-iframe (`80vh`).

A négylépéses PUHA lánc (`missing-fields → de-fallback-names →
zero-price-rows → missing-leiras`, `domain/veglegesitesOr.ts`
`VEGLEGESITES_LEPESEK`) teljesen REJTVE van, amíg a doki meg nem nyomja a
„Véglegesítés és mentés” gombot — akkor egyenként, szekvenciális
`AlertDialog`-okkal bukkan elő (`confirmStep`/`confirmStepContinue`,
`PreviewPage.tsx:375-409`). A doki tehát csak a gombnyomás UTÁN szembesül
a problémákkal, nem ELŐTTE — ez ellentmond a redesign D39/D602
szándékának.

## Döntések

### 1. Két hasábos desktop-elrendezés — PDF balra, checklist jobbra

Desktopon a PDF-preview (elsődleges, nagy) balra kerül, egy állandó,
READ-ONLY **checklist panel** jobbra (D38: „desktop: preview bal,
checklist jobb”; D39: „checklist kompakt read-only összegzés +
validation/warningok”). A checklist a 67. tétel `VeglegesitesCsekklista`
(`{ tetelek: CsekklistaTetel[] }`) kimenetét listázza — minden tétel
súlyossága (`hard`/`soft`/`info`) szerint vizuálisan megkülönböztetve
(pl. piros/sárga/szürke jelölés, a projekt meglévő `Callout`
színkonvencióját követve).

Szűk (mobil/keskeny) viewporton egyoszlopos elrendezésre esik vissza — a
checklist kerül FELÜLRE, a PDF alá („ezt olvasd el előbb” sorrend), a
`docs/07-felulet-rendszer.md` reszponzív szabályai szerint.

**Miért:** D38 explicit ezt a layoutot kéri — a mai egyoszlopos
elrendezés a PDF-et és a validációs állapotot egymás alá kényszeríti,
ami a nagy PDF-iframe (`80vh`) miatt a checklistet gyakorlatilag
láthatatlanná tenné, ha egyszerűen a PDF alá kerülne desktopon is.

**A „Csak ajánlat” checkbox és a Letöltés/Véglegesítés gombsor a jobb
(checklist) hasáb ALJÁRA kerül, a checklist-sorok UTÁN — explicit
megkérdezve, megerősítve.** Nem sticky, és nem marad a két hasáb fölött,
teljes szélességben (ahogy ma). Szűk viewporton ugyanez a sorrend
öröklődik: checklist (a PDF fölött) → checkbox + gombsor, a checklist
alján.

**Miért:** a doki fentről lefelé végigolvassa a checklistet, és a lista
végén ott a gomb — a logikai sorrend („előbb ezt nézd át, aztán
véglegesíts”) így vizuálisan is adott, nem egy külön, a checklisttől
független sávban ismétlődik.

### 2. A szekvenciális „Folytatás” modal-lánc megszűnik (user-döntés)

**Explicit megkérdezve, megerősítve:** a mai `AlertDialog`-alapú
`confirmStep`/`confirmStepContinue` state-gép (`PreviewPage.tsx:34,
75-79, 375-409, 595-625`) TELJESEN megszűnik. A puha (`soft`) tételek a
checklisten ELŐRE látszanak, mielőtt a doki a „Véglegesítés és mentés”
gombot megnyomná; a gomb megnyomása — amíg nincs `hard` tétel a listán —
KÖZVETLENÜL lefuttatja a mentést, nem nyit újabb párbeszédablakot a puha
tételekre.

A checklist minden sora kattintható/navigálható a releváns
workflow-lépésre — a meglévő „Vissza a szerkesztőbe” (`navigate('/terv')`)
és „Terv adatai” (`navigate('/paciens')`) gombminta ÁLTALÁNOSÍTVA,
tétel-szinten (a 67. tétel `CsekklistaTetel.route`-ja adja a célt).

**Miért:** D602 explicit ezt kéri — „nincs külön Átnéztem checkbox, maga
a kötelező Preview-lépés a kontroll”. Ha a puha tételek a checklisten már
ELŐRE látszanak, a gombnyomáskori újbóli, szekvenciális megerősítés
duplikált, felesleges interakció lenne — a doki már látta a
figyelmeztetéseket, mielőtt a gombot megnyomta.

**Elvetett alternatíva:** a checklist ÉS a modal-lánc egyszerre való
megtartása (dupla védelem) — elvetve a user explicit döntése alapján; a
kérdés feltevésekor pontosan ez a két opció állt szemben egymással, és a
„csak checklist” győzött.

### 3. A checklist szűken a tartalmi/üzleti validációra szorítkozik

A technikai/infrastrukturális hibák — `templateError` (sablon betöltési
hiba), `pdfError` (PDF-render hiba), `saveError` (mentési hiba) — TOVÁBBRA
IS külön, tranziens `Callout`-ok maradnak, NEM checklist-sorok.

**Miért:** ezek nem a DOKUMENTUM tartalmáról szólnak (amit a checklist
diagnosztizál), hanem az alkalmazás aktuális working-state-jéről (pl.
elhasalt hálózati/storage-hívás) — a kettő keverése a checklistet
félrevezetővé tenné (egy technikai hiba nem „javítható” a checklist
sorára kattintva, ellentétben egy tartalmi hiánnyal).

**A ma mindig látható `masterElteresek` (törzsadat-eltérés) Callout NEM
tartozik ebbe a kizárt körbe** — a 67. tétel (1. döntés) ezt explicit a
checklistbe helyezi, `info`-szintű tételként, mert a páciens adatairól,
tehát a dokumentum TARTALMÁRÓL szól, nem az alkalmazás working-state-jéről.

### 4. D602 (nincs külön „Átnéztem” checkbox) — MEGVAN

Ma sincs ilyen checkbox — nincs teendő, csak dokumentálandó: a checklist
MAGA a kontroll, nem kell hozzá külön megerősítő UI-elem.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az egységes `VeglegesitesCsekklista`/`CsekklistaTetel` modell
  MEGÉPÍTÉSE és a hozzá tartozó tartalmi szabályok (a D133 hard blockká
  emelése, D404 új check) — 67. tétel (DP-051); ez a tétel csak
  FOGYASZTÓJA a modellnek.
- A PDF-generálás hiba/retry-kezelése (D604/D606) — 68. tétel (DP-052).
- Az atomikus mentés hibakezelése (`doFinalize` try/catch szétválasztása)
  — 69. tétel (DP-053).
- A „Csak ajánlat” checkbox állapot-perzisztenciája — 70. tétel
  (DP-054); ez a tétel a checkbox POZÍCIÓJÁT/layoutját érintheti, de nem
  az állapotkezelését.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PreviewPage.tsx` — nagy átalakítás: a réteg-elrendezés
  két hasábra bontása, a `confirmStep`/`confirmStepContinue` state-gép és
  a hozzá tartozó `AlertDialog`/`confirmStepTartalom`/`nevListaSzoveg`
  eltávolítása (a szövegező logika a 67. tételben a checklist-tétel
  `reszletek`-jébe költözik), az `attemptFinalize()` egyszerűsítése (csak
  hard blockokat ellenőriz, majd közvetlenül `doFinalize()`-t hív).
- Új komponens a checklist panelhez (pl.
  `app/src/pages/previewPage/VeglegesitesChecklist.tsx`) — a
  `VeglegesitesCsekklista` renderelése, tétel-kattintás → `navigate()`.

## Tesztelés (irányadó, nem kimerítő)

- Desktopon a PDF és a checklist egymás mellett látszik; keskeny
  viewporton a checklist a PDF fölé kerül.
- Egy puha figyelmeztetés (pl. 0 Ft-os sor) a checklisten látszik, MIELŐTT
  a doki a „Véglegesítés és mentés” gombot megnyomná.
- A „Véglegesítés és mentés” gomb megnyomása — csak puha figyelmeztetések
  mellett, hard block nélkül — NEM nyit modal-t, közvetlenül fut a mentés.
- Egy hard block (pl. hiányzó páciensnév) esetén a gomb tiltott/hibát
  jelez, a checklist adott sorára kattintva a `/paciens` oldalra navigál.
- A technikai hibák (sablon betöltési hiba, PDF-render hiba, mentési
  hiba) továbbra is külön Callout-ként jelennek meg, nem a checklisten.
