# Backlog 71. tétel — Final terv részletei alapnézet és verziónavigáció — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 71. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-060
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D23`, `D33`–`D34`, `D172`–`D182` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Alapozó tétel:** ez a szakasz (71–75. tétel) GREENFIELD munka — ma
egyáltalán nem létezik strukturált, read-only „Terv részletei” nézet. A
`components/PatientPlanChains.tsx` „Megnézés” akciója ma a nyers, mentett
PDF-blobot nyitja meg egy új lapon, nincs hozzá route. Ez a tétel hozza
létre az ALAPOT (route + oldal-héj + verziónavigáció + akciósáv), amire
a 72–75. tétel épül.

## Probléma

- Nincs route egy konkrét, véglegesített verzió megtekintésére — a
  verziósorok (`PatientPlanChains.tsx`) NEM linkek.
- A „Megnézés” akció (`viewVersion()`) közvetlenül a nyers PDF-et nyitja
  meg, megkerülve bármilyen strukturált megjelenítést.
- Nincs prev/next verziónavigáció egy konkrét terven belül (csak a
  tervlánc-fában lehet lapozni sorok között).
- A `PatientPlanChains.tsx` `openVersion`/`copyVersion` (workflow-akciók)
  és a hozzájuk tartozó historical-copy figyelmeztető dialógus ma a
  komponensen belüli, nem exportált függvények — egy második hívóhelynek
  (ez az új oldal) nincs mit hívnia.

## Döntések

### 1. Új route + oldal-héj

`/paciensek/:patientDir/tervek/:planDir/:versionDir` →
`app/src/pages/TervReszleteiPage.tsx`, az `App.tsx`-ben a `/paciensek/
:patientDir` mellé kerül — NEM a `TervWorkflowShell` (`/paciens`/`/terv`/
`/elonezet`) alá.

**Miért nem a workflow shell alá:** D23 explicit „külön, read-only Terv
részletei nézetet” kér — a workflow-stepper (D36/D38, `TervWorkflowShell`)
a PISZKOZAT 3 lépéséhez tartozik; egy már véglegesített, immutable verzió
(D4) nem workflow-lépés, hanem történeti dokumentum. Csak `statusz ===
'VEGLEGES'` verzióra nyílik — piszkozatra nincs ilyen route (a piszkozat
a workflow shell-en belül szerkeszthető).

### 2. Header + metaadat + historical patient snapshot

A fejléc páciensnév + születési dátum (D180) — **szándékosan NEM**
azonos a páciens-részletoldal sticky fejlécével (`PatientDetailHeader`,
ami telefont IS mutat) — itt egy szűkebb, csak-azonosító fejléc kell,
mert a TELJES historical `paciens` pillanatkép lejjebb, ÖSSZECSUKVA
külön blokkban jelenik meg (D179, D262), és nem indokolt duplikálni a
telefont a fejlécben is.

A kibontott historical snapshot a MEGLÉVŐ `masterSnapshotDiff()`
(`domain/masterSnapshotDiff.ts`, backlog-40/48) hívásával mutat
side-by-side diffet a jelenlegi törzsadathoz képest, ha van eltérés
(D264) — READ-ONLY, szinkron-akció NÉLKÜL.

**Miért nincs szinkron-akció itt:** D9/D33/D7 elve szerint egy
véglegesített terv `paciens` blokkja pillanatkép, ami SOHA nem íródik
felül utólag — a `TorzsadatDiffDialog` (a MEGLÉVŐ, DRAFT-oldali
szinkron-mechanizmus, D48) itt nem alkalmazható, mert nincs mit
„frissíteni” egy immutable fájlon. A diff itt tisztán INFORMÁCIÓS.

Metaadat-blokk: tervcím, verzió, dátumok (keltezés/érvényesség), nyelv/
pénznem, orvos, `statusz` + „Csak ajánlat” jelvény.

**A „Csak ajánlat” badge itt kapja meg a detail-header-változatát** — a
70. tétel (`Plan.csakAjanlat`) explicit ehhez a tételhez halasztotta,
mert akkor még nem létezett ez az oldal; a mező már megvan, csak meg
kell jeleníteni.

### 3. Layout-sorrend: total → phases → metadata

D172 explicit ezt a sorrendet kéri — ez a tétel csak a HÁROM layout-slotot
biztosítja (a pénzügyi összegzés a tetején, a fázisok középen, a
metaadat/páciens-snapshot alul), TARTALOM nélkül: a pénzügyi összegzés
tartalma a 74. tétel, a fázisoké a 72. tétel dolga.

### 4. Verziónavigáció

Prev/Next gomb a láncon belül, dátum+verzió felirattal (D181); „Összes
verzió” link vissza a páciens `Kezelési tervek` tabjára, a MEGLÉVŐ
`useListStateMemory` scroll-/nyitottság-visszaállítási mintával
(backlog-43/51). Nincs verzió-diff funkció (D182) — ez rögzítés, nem
épül semmi.

### 5. Verzióváltás — teljes lokális state reset

D275–277 szerint verzióváltáskor MINDEN lokális UI-state (nyitott
fázisok, kibontott leírások, fogtérkép-kijelölés — 73. tétel —, scroll-
pozíció) alapállapotra reset kell, a fázisok újra alapból nyitva.

**Döntés:** ez React `key={`${planDir}/${versionDir}`}` a tartalom-
wrappert körülvéve gyakorlatilag ingyen megadja (a React ilyenkor a teljes
alfát unmountolja/remountolja) — ez a tétel rögzíti ezt mint a lap
ALAPMINTÁJÁT, amire a 72./73. tétel épít, hogy azoknak NE kelljen külön
reset-kódot írniuk.

**Miért nem manuális reset:** egy komponensenként szétszórt
`useEffect(() => reset(), [versionDir])` minta könnyen hagy ki egy
állapotot (pl. egy jövőbeli új interaktív elem, amit valaki elfelejt
bekötni a reset-listába) — a `key`-alapú remount strukturálisan
kizárja ezt a hibaosztályt.

### 6. Akciósáv + megosztott verzió-akció logika

A lap tetején: „Új verzió” (elsődleges, CSAK a legfrissebb verzión),
„Másolás új tervbe” (a MEGLÉVŐ historical-copy-warning dialógussal,
D260), historicalnál „Ugrás a legfrissebbre”.

**Döntés:** a `PatientPlanChains.tsx` `openVersion`/`copyVersion` (+ a
hozzájuk tartozó megerősítő-dialógus konfigurációs logika, pl. a
historical-copy figyelmeztetés szövegépítője) megosztott modulba/hookba
emelendő (pl. `domain/planVersionActions.ts` vagy egy
`usePlanVersionActions()` hook), amit MOST már KÉT hívó fogyaszt: a
`PatientPlanChains.tsx` verziósor `⋯` menüje ÉS ez az új oldal.

**Miért nem duplikáljuk:** a historical-copy figyelmeztetés (D260) és a
piszkozat-felülírás-őr integrációja (`runOrConfirm`) nem triviális logika
— egy második, függetlenül karbantartott másolat elkerülhetetlenül
szét-driftelne (a projekt ismételten dokumentált „ne írd újra” elve,
lásd CLAUDE.md „Meglévő segédfüggvények”).

### 7. „Megnézés” áthuzalozása route-navigációra

A `PatientPlanChains.tsx` verziósor „Megnézés” gombja (`viewVersion()`)
ma a nyers PDF-et nyitja meg új lapon — ez a tétel ÁTHUZALOZZA: a gomb
mostantól az ÚJ route-ra (`/paciensek/:patientDir/tervek/:planDir/
:versionDir`) navigál. A verziósor ezzel VALÓDI linkké válik.

**A nyers-PDF-megnyitás nem szűnik meg** — a 75. tételbe (DP-064)
költözik, mint a detail lap saját „Megnyitás külön” akciója (D258: „App-
level Megnyitás külön csak top actionként”).

### 8. Már MEGVAN, csak dokumentálva

D183 (chain cím immutable finalizáció után), D184 (finalizált verzió nem
törölhető/invalidálható), D185 (latest verzió badge) — ezek MÁR MEGVANNAK
adatintegritási/UI-következményként (D4 kikényszeríti az immutabilitást,
a `PatientPlanChains.tsx` már ad „Legutóbbi” jelvényt) — nincs hozzájuk
UI-munka ebben a tételben, csak rögzítés.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A fázisok/kezelési sorok tényleges tartalma — 72. tétel (DP-061).
- A pénzügyi összegzés tartalma — 74. tétel (DP-063).
- A beágyazott PDF-viewer + „Megnyitás külön”/„Letöltés” akciók — 75.
  tétel (DP-064).
- A fogtérkép — 73. tétel (DP-062).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/App.tsx` — új route.
- `app/src/pages/TervReszleteiPage.tsx` — új oldal (héj, header,
  metaadat-slot, historical snapshot diff, verziónavigáció, akciósáv,
  `key`-alapú tartalom-wrapper).
- `app/src/components/PatientPlanChains.tsx` — `openVersion`/
  `copyVersion` (+ dialógus-konfiguráció) kiemelése megosztott modulba/
  hookba; `viewVersion()` hívásának lecserélése route-navigációra a
  „Megnézés” gombon.
- `app/src/domain/masterSnapshotDiff.ts` — újrafelhasználás, változatlan.

## Tesztelés (irányadó, nem kimerítő)

- Egy véglegesített verzió „Megnézés” gombja az ÚJ route-ra navigál, nem
  nyit új lapot PDF-fel.
- A lap fejléce páciensnév+DOB-ot mutat; a teljes historical snapshot
  csak kibontásra jelenik meg, diff-fel, ha a törzsadat eltér.
- Prev/Next verziógomb a láncon belül navigál; „Összes verzió” vissza a
  `Kezelési tervek` tabra, megőrzött scroll/nyitottsággal.
- Verzióváltás után minden lokális UI-state (pl. egy korábban nyitva
  hagyott leírás) alapállapotra áll.
- „Új verzió” csak a legfrissebb verzión elsődleges gomb; historicalon
  „Ugrás a legfrissebbre” jelenik meg helyette.
- „Másolás új tervbe” historical verzión, ha van nála frissebb, ugyanazt
  a figyelmeztetést adja, mint ma a listán.
