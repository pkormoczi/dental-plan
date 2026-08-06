# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo elrendezés

```
docs/     6 tervdokumentum (01–06, lásd térkép alul)
data/     arlista.seed.json (118 tétel), az eredeti .xls
ui/       PlanEditor.jsx, PriceListAdmin.jsx, PrintPreview.jsx, tokens.js — REFERENCIA, nem buildelődik
assets/   márkalogó, navy eredeti (PNG + eredeti PDF-ek) — az app egy átszínezett másolatot használ
app/      a tényleges Vite + React + TypeScript alkalmazás — IDE dolgozz
```

Az `app/`-on kívüli minden más csak referencia és dokumentáció. Build/lint/teszt
parancsok az `app/README.md`-ben (vagy `app/package.json` scripts).

A márka a klinika nyilvános honlapját (drmandoki.hu) követi (`#976445` /
`#f77409`), forrása `app/src/design/tokens.ts` — lásd
`docs/04-nyomtatvany-spec.md` "Márka".

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

- A doki egyszer kijelöl egy **gyökérmappát** — ez a teljes rendszerállapot, nincs
  máshol állapot (D3). Google Drive-val szinkronizálva (kliens: Tükrözés mód, nem
  Streamelés).
- Fájlrendszer-hozzáférés a `PlanStorage` interface mögött (`docs/05-technologia.md:24-36`):
  kezdésnek File System Access API (`showDirectoryPicker()`, csak Chrome/Edge),
  cserélhető Tauri-ra natív hozzáférésért — ez implementációcsere, nem újraírás, ha az
  interface tiszta marad.
- IndexedDB **csak piszkozat-autosave**, soha nem system of record. Fájlrendszerre csak
  véglegesítéskor írunk.
- PDF generálás kliensoldalon (a páciensadat nem mehet szerverre): `@react-pdf/renderer`
  a layouthoz + `pdf-lib` a `terv.json` beágyazásához mellékletként. Betöltéskor
  elsődlegesen a különálló `terv.json`, fallback a PDF-be ágyazott példányból.
- Mappastruktúra:
  `paciensek/<Vezeteknev-Keresztnev_id6>/<ISO dátum>_v<n>/{kezelesi-terv.pdf, terv.json}`.

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
| IndexedDB nem válhat system of recorddá | Csak piszkozat-cache egy félbeszakadt tervhez |
| `@react-pdf/renderer` esetén **Unicode fontot kell regisztrálni** (pl. Inter, Source Sans, Noto Sans) | A beépített Helvetica nem tartalmazza az `ő`/`ű` karaktereket — ez csak a végleges PDF-en látszik, a HTML előnézeten nem |
| `#f77409` (a márka narancsa) **soha nem lehet szövegszín** | Fehéren 2,82:1, kis méretben olvashatatlan; csak díszítővonalra és a fogtérkép kiemelésére való |

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

`data/arlista.seed.json` = 118 tétel, 12 kategória, az eredeti Excel `Arlista` lapjából
importálva; első indításkor `arlista.json` néven másolódik a gyökérmappába, ha még
nincs ott. 2026-08-06 óta mind a 118 tételnek van `de` neve és `EUR` ára: a nevek
gépi/AI-fordítások (szakmailag törekedve a pontosságra, de nem orvos által
lektorálva), az EUR árak a HUF árból a fordítás napi középárfolyamán (~363,3 HUF/EUR)
számolt, egész euróra kerekített becslések — egyik sem éles, a doki az adminban
soronként felülbírálhatja/javíthatja. `gyakori` jelölés továbbra is mind `false` — ezt
a dokinak kell megjelölnie (8–12 tétel), ez adja a szerkesztő gyorsgombjait. A
`k01 Besorolatlan` kategória és az „Egyéb kezelések" 11 árva tétele (fogszabályozási
és francia nyelvű maradvány tételnevek) **szándékosan takarítatlan** (D16) — ez
adminban, kategória-átmozgatással orvosolandó, ne az importlogikában javítsd.

A hiányzó/lektorálatlan tartalom (D21 óta) **nem blokkolja** a német nyelv
kipróbálását: ha egy tételnek mégsem lenne `de` neve, magyar névvel, `HU`
jelöléssel jelenik meg; ha egy pénznemben egy tételnek sincs ára, ezt a Páciens
adatlap előre jelzi. A Beállítások számszerűsíti a készültséget (`lefedettseg()`).

## Dokumentáció-térkép

| Fájl | Mikor nyisd meg |
|---|---|
| `docs/01-attekintes-es-dontesek.md` | Miért nem elég az Excelt javítani; a D1–D21 döntések és indoklásuk; adatvédelmi keret; kockázatok |
| `docs/02-domain-modell.md` | Mappastruktúra, `arlista.json`/`terv.json`/`beallitasok.json` sémák, fogszám-parsolás szabályai |
| `docs/03-funkcionalis-spec.md` | Képernyők és viselkedés (terv szerkesztő, árlista admin, korábbi tervek stb.) |
| `docs/04-nyomtatvany-spec.md` | A generált PDF felépítése, tipográfia, márkaszínek, számformátum |
| `docs/05-technologia.md` | Stack, `PlanStorage` interface, PDF generálás, sémaverziózás, hosztolás |
| `docs/06-arlista-import.md` | Az Excel-import szabályai, ismert szennyeződések, mit ne javíts az importban |
