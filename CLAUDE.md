# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo elrendezés

```
docs/     8 tervdokumentum (01–08, lásd térkép alul)
data/     arlista.seed.json (118 tétel), az eredeti .xls
ui/       PlanEditor.jsx, PriceListAdmin.jsx, PrintPreview.jsx, tokens.js — REFERENCIA, nem buildelődik
assets/   márkalogó, navy eredeti (PNG + eredeti PDF-ek) — az app egy átszínezett másolatot használ
app/      a tényleges Vite + React + TypeScript alkalmazás — IDE dolgozz
```

Az `app/`-on kívüli minden más csak referencia és dokumentáció.

Parancsok (`app/package.json` scripts, mindig `cd app` után):
`npm run dev` (Vite dev szerver), `npm run build` (`tsc -b && vite build`),
`npm run lint` (`oxlint`), `npm test` (`vitest run`).

A márka a klinika nyilvános honlapját (drmandoki.hu) követi (`#976445` /
`#f77409`), forrása `app/src/design/tokens.ts` — lásd
`docs/04-nyomtatvany-spec.md` "Márka" és `docs/07-felulet-rendszer.md` a
teljes felület-szabályrendszerért (kötelező, nem javaslat).

## A `ui/*.jsx` fájlok státusza

`ui/PlanEditor.jsx`, `ui/PriceListAdmin.jsx`, `ui/PrintPreview.jsx` = **kattintható UX
prototípus, nem kiindulási kód**. Az elrendezést és az interakciókat vedd át belőlük,
a kódszervezést ne. Mindháromban van egy beégetett `SAMPLE`/`DEMO` konstans — élesben
ezek propból/store-ból jönnek. A state-shape viszont szándékosan megegyezik a
`docs/02-domain-modell.md` JSON sémáival, tehát arra igen érdemes építeni.
Az `ui/tokens.js` segédfüggvényei (`formatMoney`, `norm`, `parseTeeth`, `basePrice`)
1:1 portolva élnek az `app/src/domain/` és `app/src/design/` alatt — ne írd újra őket.

## Két fázisú build

1. **Mockup** (`app/`, jelenleg ez létezik) — GitHub Pages-re deployolt demó,
   `localStorage`-alapú `DemoStorage` a `PlanStorage` interface mögött, valódi
   letölthető PDF. Cél: a doki validálja a UX-et, mielőtt a fájlrendszeres verzió
   megépül. Nincs benne valódi páciensadat-perzisztencia — ez szándékos, demó adat.
2. **Végleges alkalmazás** — a `PlanStorage` interfészt egy `FileSystemStorage`
   implementáció váltja (File System Access API), `pdf-lib`-bel a `terv.json`
   PDF-be ágyazásával. A `PlanStorage`-on kívül eső kód (domain logika, UI,
   `paths.ts`) változatlan marad — ezért ne kerülje meg senki az interfészt.

## Architektúra

Statikus React SPA a doki gépén. **Nincs backend, nincs adatbázis, nincs
szerveroldali páciensadat** (D2) — a kezelési terv GDPR 9. cikk szerinti különleges
adatot tartalmaz, ezért ez nem implementációs részlet, hanem tervezési korlát.

- A doki egyszer kijelöl egy **gyökérmappát** — ez a teljes rendszerállapot,
  nincs máshol állapot (D3), Google Drive-val szinkronizálva.
- Fájlrendszer-hozzáférés a `PlanStorage` interface mögött.
- Piszkozat-autosave egy külön, a `PlanStorage` MELLETTI `DraftStorage`
  interface mögött (mockupban `localStorage`, lásd
  `app/src/storage/DemoDraftStorage.ts`; a végleges alkalmazásban IndexedDB)
  — soha nem system of record, csak a félbeszakadt szerkesztés cache-e.
- PDF generálás kliensoldalon, a páciensadat nem mehet szerverre.

Részletek (stack, `PlanStorage` interface, PDF generálás, mappastruktúra,
sémaverziózás, hosztolás): `docs/05-technologia.md`.

## Sérthetetlen szabályok

Ezek jogi vagy adatintegritási következménnyel járnak — nem stíluskérdés.

| Szabály | Miért |
|---|---|
| Verziómappát soha nem írunk felül; módosításkor mindig új `_v<n+1>` | D4 — aláírt dokumentumot nem lehet visszamenőleg átírni; mellékesen ez védi a Drive-ot a `conflicted copy`-tól |
| Ártétel-`id`-t soha nem hasznosítunk újra; törlés helyett `aktiv: false` | D17 — a régi tervek évek múlva is értelmezhetők maradnak |
| Pénz **egész számként**, a pénznem alapegységében (HUF: forint, EUR: **cent**) | Nincs lebegőpontos kerekítési hiba egy szerződéses összegben |
| Mentett tervet soha nem rajzolunk újra az aktuális árlistából | D7 — a soron `nevSnapshot` + `listaEgysegar` a pillanatkép, ez az igazság |
| `osszesitok` a fájlból számít igaznak, eltérés esetén figyelmeztetni kell | Az aláírt papírral kell egyeznie, nem az újraszámolt értékkel |
| Kedvezmény csak a szerkesztőben látszik, a nyomtatványon **nem** | D9 |
| `SAVOS` (sávos) ár a nyomtatványon `*` + lábjegyzet, soha nem csupasz fix szám | D15 — jogi védelem: fix számként kötelező érvényű ajánlattá válna |
| `null` ár egy pénznemben ≠ `0` — a tétel abban a pénznemben nem ajánlható, a keresőben sem jelenik meg | `02-domain-modell.md` |
| Minden JSON `schemaVersion`-nel indul; magasabb verzió észlelésekor **a betöltést meg kell tagadni**, érthető üzenettel | D18 — ezek a fájlok évekig élnek a Drive-on |
| Páciensmappa-névben az **ékezetek maradnak**, nincs transzliteráció; csak a tiltott karaktereket (`/ \ : * ? " < > \|`) kell cserélni; nevek rövidek (Windows 260 karakteres útvonalkorlát) | A doki a Fájlkezelőben keres rájuk névre |
| A `DraftStorage` (piszkozat-autosave) nem válhat system of recorddá | Csak piszkozat-cache egy félbeszakadt tervhez; mockupban `localStorage`, véglegesben IndexedDB |
| `@react-pdf/renderer` esetén **Unicode fontot kell regisztrálni** (pl. Inter, Source Sans, Noto Sans) | A beépített Helvetica nem tartalmazza az `ő`/`ű` karaktereket — ez csak a végleges PDF-en látszik, a HTML előnézeten nem |
| `#f77409` (a márka narancsa) **soha nem lehet szövegszín** | Fehéren 2,82:1, kis méretben olvashatatlan; csak díszítővonalra való. A fogtérkép saját, kezelés-kategóriánkénti palettát használ (`design/treatmentVisuals.ts`), nem ezt a színt |

A fenti táblázat data-/jogi-integritási szabályokat sorol. A felület
kinézetére és viselkedésére (színek, komponensek, billentyűzet,
akadálymentesség) vonatkozó, ugyanígy kötelező szabályok külön fájlban:
`docs/07-felulet-rendszer.md`.

## Meglévő segédfüggvények — használd, ne írd újra

`ui/tokens.js` már tartalmazza (portolva: `app/src/domain/`, `app/src/design/tokens.ts`):
- `t` — design tokenek (márkaszínek, tipográfia, spacing)
- `formatMoney(value, currency)` / `formatPrice(ar, currency)` — a
  `docs/04-nyomtatvany-spec.md` kötelező formátuma szerint (`1 234 567 Ft`,
  `1.234,56 €`). **Ne improvizálj `toLocaleString()`-gel**, ez szerződéses dokumentum.
- `basePrice(ar)` — `SAVOS` típusnál a `min` értéket adja vissza
- `norm(s)` — ékezetfüggetlen kereséshez (`NFD` normalizálás)
- `parseTeeth(input)` — FDI fogszám-validáció (`11–18`/`21–28`/`31–38`/`41–48`
  maradó, `51–55` stb. tejfog)

D21 (nyelv/pénznem szétválasztás) hozott néhány újat, ezeket se írd újra:
- `resolveNev(nev, nyelv)` / `fallbackSorok(plan, priceList)` (`app/src/domain/nev.ts`)
  — a tétel nevének nyelvfüggő feloldása magyar visszaeséssel + a
  véglegesítés-őr diagnosztikája
- `lefedettseg(priceList, penznem)` (`app/src/domain/coverage.ts`) — a
  német tartalom készültsége (Beállítások, Páciens adatlap)
- `formatLongDate(iso, nyelv)` / `formatShortDate(iso, nyelv)` (`app/src/domain/date.ts`)
- `pdfLabels(nyelv)` (`app/src/pdf/labels.ts`) — a PDF fix feliratai; **csak
  a `pdf/` alatt importálható**, a kezelőfelület (NavBar, oldalak) végig
  magyar marad

A fogtérkép (kezelés-alapú fogkiemelés) segédfüggvényei, szintén ne írd újra
őket:
- `buildToothVisualStates(plan, priceList)` (`app/src/domain/toothVisual.ts`)
  — a terv soraiból fogankénti vizuális állapotot épít (melyik fog milyen
  kezelés-kategória színét kapja, több kezelés esetén melyiket); `parseTeeth`-re
  épül, nem duplikálja a fogszám-parsolást
- `resolveToothVisual(kezelesek)` (`app/src/domain/toothVisual.ts`) — egy
  fogon több kezelés esetén a `KEZELES_VIZUAL_PRIORITAS` tábla szerint dönti
  el a megjelenő színt; ez az EGYETLEN hely, ahol ez a precedencia eldől
- `vizualKategoriaFor(kategoriaId)` / `KEZELES_VIZUALOK` / `KEZELES_VIZUAL_PRIORITAS`
  (`app/src/design/treatmentVisuals.ts`) — az árlista `kategoriaId`-jának
  megfeleltetése egy kezelés-vizuál kategóriának és annak színe/felirata; ez
  az EGYETLEN színforrás, a szerkesztő (`components/DentalChart.tsx`,
  `DentalChartLegend.tsx`) és a nyomtatvány (`pdf/ToothChartPdf.tsx`) is
  innen olvas
- `buildToothChartSvg(allapot, opts)` (`app/src/design/toothChartSvg.ts`) —
  az `assets/dental-chart-fdi-32.svg` nyers markupjából épít egy már
  színezett SVG-stringet; ugyanez a markup megy DOM-ba a szerkesztőben és
  canvason át PNG-be a nyomtatványhoz (`pdf/toothChartImage.ts`
  `renderToothChartPng`) — egy vizuális forrás, ne rajzold újra máshol.
  Az `opts.interactive` (+ `szerep`/`focusedTooth`/`selectedTeeth`) az
  EGYETLEN kapcsoló, ami a fogankénti `role`/`aria-label`/kurzor- és
  kijelölés-gyűrűt bekapcsolja — alapból kikapcsolva, hogy a PDF-útvonal
  bájtra változatlan maradjon; sose add át `interactive: true`-t a
  `pdf/toothChartImage.ts` felé menő hívásban
- `toggleFog(fogak, fdi)` (`app/src/domain/teeth.ts`) — egy FDI kódot
  be-/kikapcsol a szabadszöveges `fogak` felsorolásban, sorrendtartóan;
  ez az EGYETLEN írási útja a `ToothPickerPopover`-nek (soronkénti
  fogválasztó), ne kezeld a tokeneket a hívóban
- `kitoltetlenSorok(plan)` (`app/src/domain/kitoltetlen.ts`) — a tétel
  nélküli (fogtérkép-kattintással létrehozott, de be nem azonosított)
  sorokat sorolja fel; a `PreviewPage` véglegesítés-őre KEMÉNY blokként
  hívja, ne írj hozzá második ellenőrzést máshol

A piszkozat-perzisztencia (`docs/backlog-1-piszkozat-terv.md`) segédfüggvényei
és rétege, szintén ne írd újra őket:
- `piszkozatTartalmas(plan)` (`app/src/domain/piszkozat.ts`) — az EGYETLEN
  hely, ahol eldől, hogy egy `Plan`-en van-e olyan tartalom, amit kár lenne
  elveszíteni; ezt hasonlítja az `AppState` (írási trigger) és a
  Home/PlanHistoryPage (felülírás elleni AlertDialog) is, ne implementáld
  újra egy `createBlankPlan()`-nal való mély-egyenlőség-hasonlítással (a
  `keltezes`/`orvos`/`nyelv` a mai dátumtól/beállításoktól függ, hamis
  "módosítva"-t adna)
- `DraftStorage` interfész + `DemoDraftStorage` implementáció
  (`app/src/storage/`) — a `dp:piszkozat` localStorage-kulcson; a
  `StorageContext` `drafts` mezőjeként érhető el, ne hozz létre másik
  példányt vagy másik kulcsot piszkozat-mentéshez

## Domain szókincs

A JSON sémák mezőnevei magyarul vannak, és ezek **a lemezre írt séma kulcsai** — ne
fordítsd le őket kódban: `fazisok`, `sorok`, `tetelek`, `kategoriak`, `nevSnapshot`,
`listaEgysegar`, `tenylegesEgysegar`, `mennyiseg`, `fogak`, `osszesitok`,
`arlistaVerzio`, `sablonVerzio`, `aktiv`, `gyakori`, ártípus `FIX`/`SAVOS`, tervstátusz
`PISZKOZAT`/`VEGLEGES`.

## A UX kritikus pontja

A tételfelvitel billentyűzetes ciklusa dönti el, hogy az app gyorsabb-e az Excelnél:
**gépel → `↑`/`↓` navigál → `Enter` hozzáad → a kereső kiürül és visszakapja a
fókuszt → gépel tovább**, egérhasználat nélkül. Ezt kell elsőként tesztelni, a PDF
generálás előtt. A kereső search-only, nincs kategória böngésző (D19); ékezetfüggetlen
(`norm()`); csak `aktiv: true` és az aktuális pénznemben árazott tételeket listázza.
Mindkét nyelven keres (`nev.hu` és `nev.de`) függetlenül a terv nyelvétől — a doki
magyar, magyarul gépel akkor is, ha német ajánlatot állít össze (D21).

## Adat és ismert hiányok

`data/arlista.seed.json` = 118 tétel, 12 kategória, az eredeti Excel `Arlista`
lapjából importálva. A tényleges, folyamatosan változó állapot (mi van
lektorálva, mi van bekategorizálva, hány tétel kapott `gyakori` jelölést)
**a `docs/06-arlista-import.md`-ben él, ne itt** — ez a fájl gyorsan
elavulna, mert a doki az adminban éppen ezt takarítja.

A hiányzó/lektorálatlan tartalom **nem blokkolja** a német nyelv
kipróbálását (D21): hiányzó `de` név esetén magyar névre esik vissza `HU`
jelöléssel, hiányzó ár esetén a Páciens adatlap előre jelez. A
Beállítások számszerűsíti a készültséget (`lefedettseg()`).

## Dokumentáció-térkép

| Fájl | Mikor nyisd meg |
|---|---|
| `docs/01-attekintes-es-dontesek.md` | Miért nem elég az Excelt javítani; a D1–D21 döntések és indoklásuk; adatvédelmi keret; kockázatok |
| `docs/02-domain-modell.md` | Mappastruktúra, `arlista.json`/`terv.json`/`beallitasok.json` sémák, fogszám-parsolás szabályai |
| `docs/03-funkcionalis-spec.md` | Képernyők és viselkedés (terv szerkesztő, árlista admin, korábbi tervek stb.) |
| `docs/04-nyomtatvany-spec.md` | A generált PDF felépítése, tipográfia, márkaszínek, számformátum |
| `docs/05-technologia.md` | Stack, `PlanStorage` interface, PDF generálás, sémaverziózás, hosztolás |
| `docs/06-arlista-import.md` | Az Excel-import szabályai, ismert szennyeződések, mit ne javíts az importban |
| `docs/07-felulet-rendszer.md` | Felület- és nyomtatvány-kinézeti szabályok: márkatokenek, komponensek, billentyűzet, akadálymentesség — kötelező, nem javaslat |
| `docs/08-backlog.md` | Még fejlesztendő tételek (priorizálva), technikai adósság, és honnan jönnek az igények |
