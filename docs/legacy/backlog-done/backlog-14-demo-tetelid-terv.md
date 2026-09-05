# Backlog 14. tétel — Demó tervek hibás `tetelId`-jainak javítása — terv

grill-me munkamenet, 2026-08-09. Forrás: `docs/08-backlog.md` 14. tétel.

> **Frissítve 2026-08-09** (implementáció előtt, a terv megírása után):
> a hivatkozott `ui/` prototípusmappa azóta törölve lett, és a javasolt
> integritás-teszt egyik feltétele ellentmondásosnak bizonyult. Mindkettő
> lentebb, a helyén javítva — a javítás lényege (a 8 `tetelId`-csere)
> változatlan, és a jelenlegi `data/arlista.seed.json` ellen újra
> ellenőrizve.

## A hiba

`app/src/storage/seed/plans.ts` fejléc-kommentje szerint a demó tervek
`tetelId`-jait "ellenőrizve ui/PlanEditor.jsx és ui/PriceListAdmin.jsx
SAMPLE-jei alapján" — vagyis a szerző a két, kézzel írt, referencia-jellegű
UX-prototípus beégetett `SAMPLE` konstansai ellen ellenőrzött, nem a
tényleges, azóta módosult `data/arlista.seed.json` ellen. A két adatforrás
`tXXX` id-számozása nem egyezik — ez a gyökéroka.

**A prototípusmappa azóta törölve lett** (`aab43f8`, „Remove PlanEditor,
PriceListAdmin, and PrintPreview from codebase"; a CLAUDE.md „Repo
elrendezés" szakasza írja le, miért — a segédfüggvényei 1:1 portolva
lettek az `app/src/domain/` és `app/src/design/` alá). Ez a gyökérokot
nem érinti, csak a bizonyítás helyét: a hibás referenciaadat a git
history-ban nézhető meg, `git show aab43f8^:ui/PlanEditor.jsx`. Ott a
`SAMPLE` szerint `t009` = „Esztétikus tömés 3 felszín" (45 000) és
`t077` = „Neodent implantatum" (170 000) — a valódi árlistában viszont a
`t009` az „Esztétikus tömés 4 felszín (betét indikáció)" (50 000), a
`t077` pedig a „Teleszkóp korona (primer-szekunder)" (70 000). A törlés
mellékhatásaként a `plans.ts` fejléc-kommentje ma már **nem létező
fájlokra** hivatkozik, ami önmagában is indokolja a lentebbi
komment-frissítést.

Ennek eredményeként **8 a 10-ből** demó sorban a `tetelId` egy létező, de
**rossz** árlistai tételre mutat (a `nevSnapshot` egy másik tételt ír le,
mint amire az id ténylegesen feloldódik). 6 különböző hibás `tetelId`
érintett (némelyik két sorban is előfordul).

## Miért nem "csak" kozmetikai/adminisztratív hiba

A backlog-tétel szövege szerint ez "a demó adat belső hibája (a
`nevSnapshot` miatt a UI-n nem látszik)". Ez **részben téves**: a sor
szövege és ára valóban `nevSnapshot`/`listaEgysegar` pillanatkép (D7), azt
nem érinti a hibás id. **De** a fogtérkép színezése
(`app/src/domain/toothVisual.ts:106-108`, `buildToothVisualStates`) a
`sor.tetelId`-t a JELENLEGI árlistában keresi fel, és onnan olvassa a
`kategoriaId`-t a szín eldöntéséhez — ez szándékosan feszíti a D7-et, csak
kozmetikai szinten (lásd a fájl saját fejléc-kommentje). Mivel a hibás
id-k ténylegesen léteznek (csak rossz tételre mutatnak), a `hianyzoTetel`
jelző nem ugrik be, és a fogtérkép **csendben rossz kategória-színt**
mutat 3 esetben:

| Sor | Valós kezelés | Jelenleg mutatott kategória | Helyes kategória |
|---|---|---|---|
| Kovács János, 36-os fog, "Neodent implantátum" | implantáció | KORONA (t077 valójában "Teleszkóp korona") | SEBESZET |
| Kovács János, 35/36-os fog, "Zirkonkerámia korona fogra" | korona | FOGSOR (t103 valójában "Klipsz 8 fogtól") | KORONA |
| Nagy Éva V2, 36-os fog, "Fémkerámia" | korona | FOGSOR (t100 valójában "Klipsz 1-2 fog") | KORONA |

Ez élesen fut a GitHub Pages demón (`DemoStorage.resetDemoData()` ezt az
adatot írja `localStorage`-ba első betöltéskor) — tehát nem csak
fejlesztői minőségi kérdés, hanem egy ma is látható vizuális hiba a
publikus demóban.

## A javítás — pontos id-csere

Minden hibás párt a `nevSnapshot` szövege ÉS a `listaEgysegar` értéke
együtt, kétszeresen igazol egyetlen valós árlistai tételre — nincs
kétértelmű eset, nem kellett választani több jelölt közül.

| Fájl:sor | Jelenlegi `tetelId` | `nevSnapshot` | `listaEgysegar` | Helyes `tetelId` | Igazolás |
|---|---|---|---|---|---|
| `plans.ts:35` (Kovács #1) | `t009` | "Esztétikus tömés 3 felszín" | 45 000 | **`t008`** | név + ár egyezik pontosan |
| `plans.ts:53` (Kovács #3) | `t051` | "Fogeltávolítás" | 25 000 | **`t041`** | név + ár egyezik pontosan |
| `plans.ts:69` (Kovács #4) | `t077` | "Neodent implantátum" | 170 000 | **`t057`** | név (ékezetkülönbség az árlistában: "implantatum") + ár egyezik pontosan |
| `plans.ts:78` (Kovács #5) | `t103` | "Zirkonkerámia korona fogra" | 135 000 | **`t074`** | ár egyezik pontosan (a "korona" szó nincs benne az árlistai névben, de az ár egyértelműsíti) |
| `plans.ts:133` (Nagy Éva V1 #1) | `t007` | "Fognyaki tömés" | 25 000 | **`t004`** | név + ár egyezik pontosan |
| `plans.ts:142` (Nagy Éva V1 #2) | `t009` | "Esztétikus tömés 3 felszín" | 45 000 | **`t008`** | ua., mint fent (duplikált előfordulás) |
| `plans.ts:189` (Nagy Éva V2 #1) | `t100` | "Fémkerámia" | 95 000 | **`t071`** | név + ár egyezik pontosan |
| `plans.ts:240` (Tóth Zoltán #2) | `t051` | "Fogeltávolítás" | 25 000 | **`t041`** | ua., mint fent (duplikált előfordulás) |

Csak a `tetelId` mező értéke változik mind a 8 helyen. A
`nevSnapshot`/`listaEgysegar`/`tenylegesEgysegar` értékek már most is
egyeznek a helyes tétellel (a kedvezményt mutató két sor —
`t103`/`t074`-nél 135 000→115 000, `t100`/`t071`-nél 95 000→85 000 — a
`tenylegesEgysegar` szándékos kedvezmény, változatlanul marad).

A `t016` (Kovács #2, "Gyökértömés...") és `t001` (Tóth Zoltán #1,
"Konzultáció...") sorok már ma is helyesek, nem érintettek.

Egyetlen sor sem üres `tetelId`-jű (egyedi sor) a demó adatban — a
backlog 3. tétel egyedi-sor esete itt nem fordul elő, nincs dolgunk vele.

**A táblázat újraellenőrizve** a jelenlegi `data/arlista.seed.json` ellen:
mind a 8 cél-`tetelId` létezik, és mindegyiknél a név és a HUF-ár is a
fentiek szerint egyezik. Két helyen a `nevSnapshot` **szándékosan
eltér** az árlistai névtől — ezt a lenti teszt-szakasz kezeli:

| Cél-id | Árlistai név | Demó `nevSnapshot` | Eltérés |
|---|---|---|---|
| `t057` | „Neodent implantatum" | „Neodent implantátum" | ékezethiba az árlistában (a 8. tétel adattisztítása javítja) |
| `t074` | „Zirkonkerámia fogra" | „Zirkonkerámia korona fogra" | a demó neve pontosabb, a „korona" szó hiányzik az árlistából |

## Root-cause komment frissítése

A `plans.ts:4-7` fejléc-komment ("ellenőrizve ui/PlanEditor.jsx és
ui/PriceListAdmin.jsx SAMPLE-jei alapján") a hiba tényleges forrása —
rossz referenciaadat ellen lett ellenőrizve — ráadásul az `aab43f8` óta
két olyan fájlra hivatkozik, amik már nem is léteznek. A javítással együtt a
komment is frissül: a `data/arlista.seed.json`-t (a `seedPriceList`-en
át) nevezze meg az egyetlen hiteles forrásként, és utaljon az új
`plans.test.ts` integritás-tesztre, ami mostantól kikényszeríti az
egyezést.

## Új integritás-teszt

Új fájl: `app/src/storage/seed/plans.test.ts` — ugyanaz a konvenció, mint
a meglévő `priceList.test.ts`/`templates.test.ts` (co-located, `describe`
+ `it`, `vitest`).

**Mit ellenőriz:** minden `seedPlans[].plan.fazisok[].sorok[]` sorra,
aminek nem üres a `tetelId`-je:
1. a `tetelId` létezik `seedPriceList.tetelek`-ben (`tetelekById.get(...)`
   mintájára, mint `toothVisual.ts`-ben),
2. `basePrice(tetel.ar[plan.penznem]) === sor.listaEgysegar` (a
   `domain/money.ts` `basePrice()` hívásával, SAVOS típusnál a `min`
   értékkel — ugyanaz a segédfüggvény, amit a UI is használ, nem
   duplikáljuk a HUF/EUR branch-elést).

Mindkét feltétel együtt kell — a létezés-ellenőrzés önmagában nem lett
volna elég, mert mind a 6 hibás id létezik (lásd fent). Az ár-egyezés
viszont **mind a 6-ot elkapja**: egyik hibás id ára sem esik egybe a sor
`listaEgysegar`-jával (`t009` 50 000 ≠ 45 000, `t051` 35 000 ≠ 25 000,
`t077` 70 000 ≠ 170 000, `t103` 80 000 ≠ 135 000, `t007` 40 000 ≠ 25 000,
`t100` 52 000 ≠ 95 000) — ellenőrizve a jelenlegi seed adaton.

**A terv eredeti 2. feltétele (`resolveNev(tetel.nev, 'hu').szoveg ===
sor.nevSnapshot`) törölve — ellentmondásos volt.** A javítás UTÁN is
bukott volna két soron: a `t057` árlistai neve ékezethibás („Neodent
implantatum"), a `t074`-é pedig rövidebb („Zirkonkerámia fogra"), miközben
a demó `nevSnapshot`-ja mindkettőnél a helyesebb, pácienshez való szöveg.
A javítás ezeket a neveket **nem** rontja el az árlistai változatra: a
`nevSnapshot` D7 szerint pillanatkép, és a 3. backlog-tétel óta a doki
kézzel is pontosíthatja egy soron — vagyis a szó szerinti névegyezés már
a demó adaton sem érvényes invariáns. Normalizált (`norm()`)
összehasonlítás sem segítene, mert a `t074`-nél egy egész szó a
különbség. Mivel az ár-egyezés bizonyítottan elegendő a hiba
elkapásához, névre nem marad assertion; a két szándékos eltérést a fenti
javítás-szakasz táblázata dokumentálja.

**Hatókör:** kizárólag a demó/seed tervadatra vonatkozik, nem általános
motor-szintű szabály. Éles, véglegesített terveken a `nevSnapshot`
szándékosan eltérhet a jelenlegi árlistától (D7, árlista-frissítés
után) — ott ugyanez az állítás hamis pozitívot adna. A demó tervek
viszont a mockup "frissen felvitt" bemutató-állapotát reprezentálják,
ahol az egyezés helyes elvárás.

## Nem változik

- CHANGELOG.md — nem kap bejegyzést, mert ez belső demóadat-hiba, nem a
  dokinak kommunikált funkció-/viselkedésváltozás.
- ~~`ui/PlanEditor.jsx` / `ui/PriceListAdmin.jsx` SAMPLE-jei~~ — tárgytalan,
  a mappa a terv megírása óta törölve lett (`aab43f8`). A hatókör
  változatlanul kizárólag az `app/`-beli, ténylegesen futó demó/seed adat.
- `data/arlista.seed.json` — nem változik, ez az egyetlen hiteles forrás,
  ehhez igazodik a demó adat, nem fordítva. A benne lévő ékezethiba
  („Neodent implantatum") **itt nem javul** — az a 8. tétel
  adattisztításának a dolga, és a demó `nevSnapshot`-ja addig is a helyes
  szöveget mutatja.
- A demó sorok `nevSnapshot` értékei — csak a `tetelId` mező változik,
  lásd a javítás-szakaszt.

## Elfogadási kritérium

- `npm test` (`app/`) zöld, az új `plans.test.ts` is lefut és bukna a
  javítás előtti állapoton (ellenőrizhető: a 8 javítás visszaállításával
  a teszt piroson buktatja mind a 6 érintett `tetelId`-t).
- A demó Kovács János tervében a fogtérkép a 36-os fogon SEBESZET
  (implantáció) színt mutat KORONA helyett; a 35/36-os fogakon és Nagy
  Éva 2. verziójának 36-os fogán KORONA színt mutat FOGSOR helyett.
