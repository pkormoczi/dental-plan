# Backlog 70. tétel — „Csak ajánlat” mód — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 70. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-054
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D550`–`D559`, `D563`–`D565`, `D579`–`D580` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

## Probléma

A „Csak ajánlat” kapcsoló (`offerOnly`) ma KIZÁRÓLAG a `PreviewPage.tsx`
helyi React state-je (`useState(false)`, `PreviewPage.tsx:50`) —
**nincs `Plan`-mezője**. Ellenőriztem: a `finalPlan` összeállítása
(`doFinalize()`, `PreviewPage.tsx:342-349`) sem menti el sehova. Ebből
három konkrét, dokumentált D-döntést sértő következmény:

1. **Nincs perzisztencia.** Minden `PreviewPage` mountnál `false`-ra
   reseteli magát — akkor is, ha a doki egy már bekapcsolt drafton
   navigál oda-vissza (pl. `Kezelések` → `Előnézet` → vissza →
   `Előnézet`).
2. **D554 sérül.** „Új verzió” nyitásakor nincs mit örökíteni — a
   betöltött terv nem hordozza az előző verzió csak-ajánlat állapotát,
   mert az sosem került a `Plan`-be.
3. **D558 sérül.** Egy véglegesített, csak-ajánlat módban készült PDF
   `terv.json`-ja ezt utólag NEM mutatja — a verziósoron badge (D558)
   adat híján nem lehetséges.

## Döntések

### 1. Új, additív `Plan.csakAjanlat?: boolean` mező

A `Plan` (`app/src/domain/types.ts`) egy új, opcionális `csakAjanlat?:
boolean` mezőt kap — nincs `schemaVersion`-emelés, a `mennyisegKezi`/
`leirasSnapshot`/`elolegSzazalek`/`kedvezmenyOsszeg` bevált additív-mező
mintáján. `createBlankPlan()` alapértéke `false` (vagy a mező hiánya,
ami a hívó oldalon `false`-ként értelmezendő) — D553 szerint „új terv
alapból teljes dokumentum (Csak ajánlat = false), ha van nyilatkozat”.

A `PreviewPage.tsx` helyi `useState(false)`-ja MEGSZŰNIK — a checkbox
innentől `plan.csakAjanlat`-ot olvassa, és a meglévő
`useAppState().setPlan` updateren át írja (ugyanúgy, mint a többi
draft-mező, pl. a `PlanEditorPage.tsx` sorpatch-ei). Ez a váltás
ÖNMAGÁBAN megoldja mindhárom fenti problémát:

- **perzisztencia:** a `setPlan` a draft state-en át az autosave-en
  keresztül (`DraftStorage`) is elmentődik, tehát navigáció oda-vissza
  megőrzi az állapotot;
- **`doFinalize` automatikusan hordozza:** a `finalPlan = {...plan,
  statusz: 'VEGLEGES', ...}` spread MÁR magával viszi a `csakAjanlat`
  mezőt, külön kód nélkül.

**Miért:** ez a legkisebb, a projekt meglévő konvencióihoz leginkább
illeszkedő megoldás — nem kell új storage-mechanizmus, csak a MÁR
meglévő draft-state/autosave/finalPlan-spread útvonalba kell bekötni egy
eddig kimaradt mezőt.

### 2. „Új verzió” automatikusan örököl (D554) — nincs teendő

Ellenőriztem: az „Új verzió” betöltés (`state/AppState.tsx`
`loadPlanIntoDraft`) a `domain/ujVerzioDatum.ts` `frissDatummal(plan,
settings, ma)`-on át történik, ami `{...plan, keltezes: ma, ervenyesIg:
...}`-t ad vissza — TELJES SPREAD, csak két mezőt (`keltezes`/
`ervenyesIg`) módosít. Mivel a `csakAjanlat` mostantól a `Plan` RÉSZE
(1. döntés), ez a spread automatikusan átviszi — a doki a betöltött
draftban ugyanazt a csak-ajánlat állapotot látja, mint amit az előző
verzió véglegesítésekor beállított.

**Miért csak dokumentálás, nem kódmunka:** a meglévő spread-alapú
`frissDatummal` architektúra ELEVE úgy van megírva, hogy minden D7
szerinti pillanatkép-mező automatikusan öröklődik, kivéve amit explicit
felülír — a `csakAjanlat`-nak pontosan ez a helyes viselkedése (D554), új
kód nélkül.

### 3. „Másolás új tervként” NEM örököl (D555) — explicit felülírás szükséges

Ellenőriztem: a `planMasolatKent()` (`app/src/domain/planCopy.ts:70-85`)
UGYANAZT a `frissDatummal(plan, settings, ma)`-t hívja, mint az „Új
verzió” — tehát a `csakAjanlat` mező bevezetése után ALAPÉRTELMEZETTEN Ő
IS örökölne, ami D555 szerint HIBÁS lenne („Másolás új tervként nem
örökli a forrás offer-only állapotát; új chain normál defaultból indul,
kivéve forced eset”).

**Döntés:** a `planMasolatKent()` visszatérési objektumába EXPLICIT
`csakAjanlat: false` kerül (a `tervId: ''`, `verzio: 0`, `statusz:
'PISZKOZAT'` explicit felülírások mellé, ugyanabban a return-blokkban).

A `planUjPaciensselTervhez()`/`planUjTorzsadattal()` (vadonatúj lánc
induló pácienshez) a `createBlankPlan()`-en át amúgy is friss `false`-ból
indul (1. döntés) — ezeken NINCS teendő.

**A „kivéve forced eset” (D552, kényszerített placeholder-eset) itt sem
igényel külön kódot** — a `csakAjanlat: false` a NYERS, kézi állapotot
állítja vissza; ha a cél terven a nyilatkozat placeholder, az
`effectiveOfferOnly` derivált érték (lásd 7. döntés) attól függetlenül
igazra kényszerül, amint a `PreviewPage` betölti azt.

**Miért:** enélkül az explicit felülírás nélkül a copy-funkció a
`frissDatummal` spread miatt CSENDESEN örökölné a forrás állapotát,
pontosan azt a hibát reprodukálva, amit D555 kifejezetten tilt.

### 4. D558 badge — hatókör szűkítve a MEGLÉVŐ verziósorra

A redesign „finalizált verzión badge a verziósorban ÉS a detail
headerben” — ellenőriztem: a „Terv részletei” final read-only nézet
(DP-060, `03_...md` § 9) MA MÉG NEM LÉTEZIK ebben az appban (a
`components/PatientPlanChains.tsx` „Megnézés” akciója ma a nyers,
mentett PDF blob-ot nyitja meg egy új böngészőlapon, `loadPlanPdf()`-fel
— nincs strukturált detail-oldal, amin egy „header” egyáltalán
értelmezhető lenne).

**Döntés:** ez a tétel a badge-et a MÁR LÉTEZŐ verziósorra
(`components/PatientPlanChains.tsx`) szűkíti — ott a teljes
`plansByVersion[key]: Plan` MÁR be van töltve (a végösszeg
megjelenítéséhez, lásd `domain/planChainData.ts`), tehát a `csakAjanlat`
olvasásához NEM kell új storage-hívás, csak egy új badge-elem a meglévő
soron. A detail-header-változat a DP-060 tételre marad, amikor az a nézet
ténylegesen megépül — akkor kell majd újra hivatkozni erre a mezőre.

**Miért nem építjük meg most a detail-header-et:** az feleslegesen
kitágítaná ezt a tételt egy MÁSIK, még nem létező képernyő
megépítésével — a `plansByVersion`-ből a badge-adat ma is elérhető, a
verziósoron való megjelenítés önmagában teljes értékű, tesztelhető
szeletet ad.

### 5. Már MEGVAN, csak dokumentálva — nincs új munka

- **D552** (kényszerített, letiltott checkbox placeholder-nyilatkozatnál)
  — MEGVAN: `disabled={nyilatkozatIsPlaceholder}` + piros `Callout`
  magyarázattal (`PreviewPage.tsx:462-471, 536`).
- **D556** (toggle azonnal újragenerálja a preview-t) — MEGVAN: az
  `effectiveOfferOnly` már ma is a PDF-generáló `useEffect`
  dependency-listájában van.
- **D563** (nincs külön forced/manual state-modell) — MEGVAN: az
  `effectiveOfferOnly = offerOnly || nyilatkozatIsPlaceholder` derivált
  érték pontosan ezt csinálja — a mögöttes `plan.csakAjanlat` (1. döntés
  után) marad a doki „nyers” kézi választása, a placeholder-eset SOHA
  nem íródik bele a mentett mezőbe. Ez helyes: ha a doki később
  lektoráltatja a nyilatkozatot, a mező visszaadja a doki utolsó KÉZI
  választását, nem marad örökre kényszerítve.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A checklist UI és a hozzá tartozó layout — 66. tétel (DP-050); ez a
  tétel a checkbox ADATmodelljét érinti, nem a képernyő elrendezését.
- A „Terv részletei” final detail nézet megépítése (és a benne
  megjelenő badge) — jövőbeli DP-060 tétel.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` — `Plan.csakAjanlat?: boolean` új mező.
- `app/src/domain/blankPlan.ts` `createBlankPlan()` — alapérték
  dokumentálása (a mező hiánya/explicit `false` egyaránt elfogadható,
  a meglévő `elolegSzazalek`/`kedvezmenyOsszeg` mintájára, de itt nem
  szükséges `null`-lal jelezni „nincs beállítva” állapotot, mert a mező
  szemantikailag mindig `boolean`).
- `app/src/domain/planCopy.ts` `planMasolatKent()` — explicit
  `csakAjanlat: false` a visszatérési objektumban.
- `app/src/pages/PreviewPage.tsx` — a helyi `offerOnly` state
  eltávolítása, átállás `plan.csakAjanlat`/`setPlan`-ra.
- `app/src/components/PatientPlanChains.tsx` — badge a verziósoron, a
  MÁR betöltött `plansByVersion[key].csakAjanlat` alapján.

## Tesztelés (irányadó, nem kimerítő)

- A „Csak ajánlat” checkbox bekapcsolása után a draft más workflow-lépésre
  navigálva, majd visszatérve az `Előnézet` lépésre, MEGŐRZI a bekapcsolt
  állapotot.
- „Új verzió” nyitásakor a betöltött draft a forrás verzió csak-ajánlat
  állapotát mutatja.
- „Másolás új tervként” után a friss draft MINDIG `false`-ból indul,
  függetlenül a forrás állapotától (kivéve, ha a cél terv nyilatkozata
  placeholder — akkor az `effectiveOfferOnly` a betöltéskor úgyis
  igazra kényszerül).
- Egy csak-ajánlat módban véglegesített terv verziósora badge-et mutat a
  `Kezelési tervek` tabon.
- Egy NEM csak-ajánlat módban véglegesített terv verziósorán nincs badge.
