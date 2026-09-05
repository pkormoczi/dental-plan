# Backlog 46. tétel — Kezelési terv-lánc fa (hierarchia, rendezés, badge-ek, aktív draft blokk) — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 46. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-020
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D6`, `D23`–`D34`, `D183`–`D189`, `D237`–`D254` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

## Probléma

A terv-lánc/verzió fa (`app/src/components/PatientPlanChains.tsx`, két
hívóval: `PlanHistoryPage.tsx` `standalone`, `PatientDetailPage.tsx`
`embedded`) ma jelentősen szegényebb, mint amit a redesign kér:

- **Nincs lánc-szintű összecsukás.** Csak páciens-szintű létezik
  (`standalone` + 2+ lánc esetén, `PatientPlanChains.tsx:120–121`,
  alapból csukva, nem perzisztált) — a láncok maguk mindig teljesen
  kibontva renderelnek (`:456` `plans.map`).
- **A lánc-fejléc szegényes és nem interaktív** (`:467–520`): egy sima
  `Flex`, NEM gomb, nincs `aria-expanded`, nincs chevron. Tartalma
  `` `${label} · ${versions[0]?.isoDate}` `` — és a `versions[0]` a
  LEGRÉGEBBI verzió (a `listVersions` `verzio` szerint növekvőn rendez,
  `DemoStorage.ts:431`), tehát a fejléc a lánc INDULÁSI dátumát mutatja,
  összeg és verziószám nélkül.
- **A láncok sorrendje rendezetlen.** `DemoStorage.listPlans`
  (`DemoStorage.ts:395–416`) egy `Set`-ből enumerál, nincs komparátor
  sehol a betöltési láncban (`domain/planChainData.ts:36–40,78` a
  storage sorrendjét változatlanul adja tovább).
- **Nulla badge.** Nincs `Badge` import a komponensben; sem „legutóbbi"
  jelzés egy verzión, sem draft-státusz jelzés egy láncon.
- **Az aktív draft NEM jelenik meg ezen a listán**, csak felülírás-őrként
  (`vanMentetlenPiszkozat` → `AlertDialog`, `:626–656`) — az egyetlen
  felülete a Kezdőlap „Piszkozat folytatása" kártyája (`Home.tsx:122–148`).
- **Nincs nyitás-/scroll-állapot-visszaállítás** — a komponens minden
  navigációkor unmountol, a lánc-összecsukás modul-szintű memóriája ma
  csak a `PaciensekPage.tsx` keresőjéhez létezik
  (`components/useListStateMemory.ts`, kizárólag POP-navigációnál).
- Amit MÁR MA IS betöltünk, és amire ez a tétel ráépíthet: minden
  verzió teljes `Plan`-je (`domain/planChainData.ts` `plansByVersion`) —
  tehát `statusz`, `keltezes`, `osszesitok.fizetendo` mind kéznél van
  típusbővítés (a `PlanVersion` interfész bővítése) NÉLKÜL.

## Döntések

### 1. Lánc-szintű összecsukás bevezetése, alapból csak a legfrissebb lánc nyitva

Minden terv-lánc fejléce tiszta toggle (nem navigáció, D241), alapból
CSAK a legfrissebb lánc van nyitva (D237), több lánc egyszerre is
nyitható (D250), és egyverziós lánc is megtartja a lánc→verzió
hierarchiát — nem lapul össze egyetlen sorrá (D249).

**Miért:** egy visszatérő páciensnek gyakran több, régen lezárt láncú
terve van (pl. egy korábbi tömés + egy friss fogpótlási terv) — ezeket
alapból összecsukva tartani csökkenti a listazajt, miközben a legutóbbi
munka (amit a doki valószínűleg keres) azonnal látszik.

**Elvetett alternatíva:** alapból minden lánc nyitva (a mai állapot) —
sok láncú páciensnél (a demó-adatkészlet 22 páciensre bővült
kézi teszteléshez) gyorsan átláthatatlanná válna.

### 2. Csukott lánc-fejléc: címke + LEGFRISSEBB verzió dátuma/verziószáma + végösszeg

A fejléc mostantól a lánc LEGFRISSEBB verziójának adatait mutatja
(dátum, verziószám, `osszesitok.fizetendo`), nem a legrégebbiét — a mai
`versions[0]` bug jellegű felcserélés javítása (D238).

**Miért:** a doki egy csukott lánc alapján dönt, kinyissa-e — a
legfrissebb állapot (mennyiért áll most az ajánlat) sokkal relevánsabb,
mint mikor indult a lánc.

### 3. Lánc-rendezés: legfrissebb VÉGLEGESÍTETT verzió dátuma szerint csökkenően

A láncok a bennük lévő legfrissebb `VEGLEGES` verzió `keltezes`-e
szerint csökkenő sorrendben jelennek meg (D186), a MÁR betöltött
`plansByVersion`-ből számolva — nincs új storage-hívás.

**Miért:** D186 explicit ezt kéri; a mai rendezetlen (storage
enumerációs) sorrend a dokinak semmilyen használható jelentést nem
hordoz.

**Elvetett alternatíva:** a lánc LÉTREHOZÁSI dátuma szerint rendezni —
ez egy régen indult, de nemrég frissített láncot hátrasorolna, holott
pont az számít aktuálisnak.

### 4. „Legutóbbi" badge a lánc legfrissebb verziósorán

A lánc legfrissebb verziósora egy „Legutóbbi" `Badge`-et kap
(`soft`/`size="1"`, a `HuChip` mintájára, D185) — a `#f77409` márkaszín
nem használható szövegszínként (CLAUDE.md sérthetetlen szabály), a
badge egy semleges/`gray` vagy `t.brand`-alapú `Badge`-szín.

**Miért:** D185 explicit badge-et kér; egyértelművé teszi, melyik
verzió a jelenleg érvényes ajánlat egy 3+ verziós láncban.

### 5. Draft-jelzés a lánc fejlécén, nem kattintható

Ha egy lánchoz aktív, mentetlen piszkozat tartozik (a globális aktív
draft `Plan.paciensId` + `tervId` egyezik ezzel a lánccal), a lánc
fejléce egy státusz-jelzőt mutat (D242) — ez a jelző NEM kattintható
külön (D243), a kattintás célja a lánc fejlécének toggle-je marad.

**Miért:** D242/D243 explicit ezt kéri; egy második, beágyazott
kattintható elem a fejlécen belül összezavarná a toggle-lel való
interakciót (két különböző célú kattintási zóna egymás mellett).

### 6. Aktív draft blokk a láncok FÖLÖTT, csak a hozzá tartozó páciensnél

Ha az egyetlen globális aktív draft (`DraftStorage`, D21 — MÁR MA IS
csak egy lehet) ehhez a pácienshez tartozik (`Plan.paciensId` egyezik),
egy külön blokk jelenik meg a lánc-lista TETEJÉN, a finalizált láncok
fölött (D187–D189, D244): draft típusa/kontextusa, az aktuális
workflow-lépés (`lastRoute`, a 32. tétel/D37 `piszkozatLastRoute`-ja),
az utolsó módosítás időbélyege (`formatPiszkozatIdo`), és az aktuális
végösszeg ELŐLEG NÉLKÜL (`tervVegosszeg(fazisok, kedvezmenyOsszeg)`,
D247) — tétel/fázisszám nélkül (D248), és HA nincs egyetlen sor sem, az
összeg egyáltalán nem jelenik meg (D246). A teljes blokk kattintható, a
`lastRoute`-ra navigál, plusz egy külön „Folytatás" gomb (D244).

**Miért:** D187–D189/D244–D248 explicit ezt a tartalmat és
elhelyezést kéri; ma az aktív draft KIZÁRÓLAG a Kezdőlapon látszik — egy
visszatérő pácienst a részletoldalán megnyitva a doki nem látja, hogy
már van hozzá félbeszakadt munka, csak a felülírás-őr `AlertDialog`
jelzi ezt, amikor már túl késő (egy másik akciót indítana).

**Elvetett alternatíva:** a Kezdőlap kártyáját megszüntetni, csak itt
mutatni a draftot — elvetve, mert a Kezdőlap az elsődleges belépési
pont, ott a draft látása navigáció nélkül kell (D20).

### 7. Nyitás-/scroll-állapot visszaállítása visszatéréskor

A lánc-összecsukás állapota (melyik lánc van nyitva) és a lista
scroll-pozíciója POP-navigációnál visszaáll (D240), a MEGLÉVŐ
`components/useListStateMemory.ts` modul-szintű, POP-only mintájának
bővítésével — nem egy második, párhuzamos memória-mechanizmussal.

**Miért:** a `useListStateMemory` már pontosan ezt az elvet
implementálja (keresőszöveg + scroll) a `PaciensekPage.tsx`-en; a
lánc-nyitottság ugyanolyan jellegű, munkamenetre szűkített UI-állapot.

### 8. Billentyűzet: `aria-expanded`/`aria-controls` a lánc-toggle-ön, nincs fa-szemantika

A lánc-toggle a MEGLÉVŐ páciens-szintű toggle mintáját követi
(`aria-expanded` + `aria-controls`, `PatientPlanChains.tsx:433–434`) —
NEM vezetünk be `role="tree"`/`role="treeitem"`/roving tabindexet
(D251 „billentyűzet-navigáció támogatott" ennyit jelent: natív Tab-sorrend
+ Enter/Space a togglén, nem egy egyedi fa-widget).

**Miért:** a projektben másik helyen sincs fa-widget (`docs/07-felulet-
rendszer.md` a Lenyíló/összecsukható panel mintáját írja elő pontosan
erre az esetre) — egy ARIA `tree` bevezetése aránytalan komplexitás
lenne egy két szintű, alapvetően lista-jellegű nézethez.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Verziósorok navigation-only alakja (D32) és a read-only „Terv
  részletei" nézet — redesign-javaslat DP-060, teljesen új felület, ma
  sehol nem létezik (nincs `/terv-reszletei` route).
- A latest/historical verziósor LÁTHATÓ akciógombjai és a historical
  másolás-figyelmeztetés — 50. tétel (DP-024).
- Az „Új terv"/„Új verzió"/„Másolás új tervbe" gombok tartalmi
  viselkedése — 47./48./49. tétel (DP-021/022/023).
- A `PlanVersion` interfész bővítése `statusz`-szal — NEM szükséges,
  mert a `plansByVersion` már a teljes `Plan`-t hordozza; ha egy jövőbeli
  tétel a `listVersions`-t önmagában (teljes `loadPlan` nélkül) akarná
  státusszal, az külön döntés.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/PatientPlanChains.tsx` — a lánc-fejléc toggle-lé
  alakítása, a fejléc-tartalom cseréje, a draft-blokk beillesztése, a
  lánc-rendezés (1–6. döntés).
- `app/src/components/HuChip.tsx` mintájára új `Badge`-felhasználás a
  „Legutóbbi” jelzéshez (4. döntés) — nem feltétlenül új fájl, csak a
  meglévő konvenció követése.
- `app/src/components/useListStateMemory.ts` — bővítés a lánc-nyitottság
  tárolásához (7. döntés).
- `app/src/domain/planChainData.ts` — a lánc-rendezéshez szükséges
  „legfrissebb véglegesített verzió dátuma” kinyerése a MÁR betöltött
  `plansByVersion`-ből (3. döntés) — új domain-helper, nem storage-hívás.
- `app/src/pages/Home.tsx` — a draft-kártya változatlan marad (6. döntés
  megjegyzése), csak a MÁSIK felület (ez a tétel) bővül vele.

## Tesztelés (irányadó, nem kimerítő)

- Több láncú páciensnél alapból csak a legfrissebb lánc nyitva, a többi
  csukva; kattintásra bármelyik nyitható/csukható, egyszerre több is.
- A csukott lánc-fejléc a legfrissebb verzió dátumát/verziószámát/
  végösszegét mutatja, nem a legrégebbiét.
- A láncok csökkenő dátumsorrendben jelennek meg.
- A lánc legfrissebb verziósora „Legutóbbi” badge-et kap, a többi nem.
- Aktív, ehhez a pácienshez tartozó draft esetén a draft-blokk megjelenik
  a láncok fölött, helyes tartalommal; más pácienshez tartozó vagy
  hiányzó draft esetén nem jelenik meg.
- Draft-blokk nélküli sor esetén nincs összeg megjelenítve.
- Visszalépés (böngésző vissza) után a lánc-nyitottság és a scroll-
  pozíció visszaáll; NavBar-navigációról érkezve tiszta állapot.
- A lánc-fejléc `aria-expanded`/`aria-controls` párja billentyűzettel
  (Tab + Enter/Space) is elérhető és működik.
