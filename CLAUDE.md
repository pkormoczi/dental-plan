# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo elrendezés

```
docs/     8 fő dokumentum (01–08, lásd térkép alul) + nyitott backlog-tervek
          (`backlog-N-*-terv.md`) + archive/ (lezárt anyag, nem hivatkozott)
data/     arlista.seed.json (118 tétel), az eredeti .xls
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

A gyökérben korábban volt egy `ui/` mappa (`PlanEditor.jsx`, `PriceListAdmin.jsx`,
`PrintPreview.jsx`, `tokens.js`) kattintható UX-prototípusként — ez volt az
elrendezés/interakció referenciája, mielőtt az `app/` alatti végleges képernyők
(`PlanEditorPage.tsx`, `PriceListAdminPage.tsx`, `PreviewPage.tsx`) elkészültek.
Miután a segédfüggvényei (`formatMoney`, `norm`, `parseTeeth`, `basePrice`) 1:1
portolva lettek az `app/src/domain/` és `app/src/design/` alá, a mappa elavult, és
törölve lett — a git history-ban elérhető, ha valaha vissza kellene nézni rá.

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
| A sor `savos` mezője (nem az árlistai `SAVOS` ártípus!) dönt a nyomtatvány `*` + lábjegyzetéről, soha nem csupasz fix szám | D15 — jogi védelem: fix számként kötelező érvényű ajánlattá válna. A szerkesztőben soronként kézzel is átbillenthető — a sor lehet fix árú tételből, de a doki jelölheti becsültnek, ha a mennyiség csak a kezelés során derül ki |
| `null` ár egy pénznemben ≠ `0` — a tétel abban a pénznemben nem ajánlható, a keresőben sem jelenik meg | `02-domain-modell.md` |
| Minden JSON `schemaVersion`-nel indul; magasabb verzió észlelésekor **a betöltést meg kell tagadni**, érthető üzenettel | D18 — ezek a fájlok évekig élnek a Drive-on |
| Placeholder-jelölésű nyilatkozat mellett a nyomtatvány 3. oldala (nyilatkozat + aláírás) nem kerülhet PDF-be — a „csak ajánlat" mód kényszerített, felülírás nélkül | D23 — jogi védelem: a jogász által „még nincs lezárva" jelöléssel ellátott szöveg nem kerülhet aláírásra. Az `isPlaceholderTemplate()` (`app/src/domain/templates.ts`) az EGYETLEN hely, ahol ez eldől |
| Korábbi terv új verzióra nyitásakor a dátumbélyeg (`keltezes`/`ervenyesIg`) a betöltés pillanatában íródik (`frissDatummal`), soha nem véglegesítéskor | D22 — különben a mentett JSON és a már renderelt PDF-blob dátuma szétcsúszik, vagy egy lejárt keltezésű ajánlatot írnak alá |
| Páciensmappa-névben az **ékezetek maradnak**, nincs transzliteráció; csak a tiltott karaktereket (`/ \ : * ? " < > \|`) kell cserélni; nevek rövidek (Windows 260 karakteres útvonalkorlát) | A doki a Fájlkezelőben keres rájuk névre |
| A `DraftStorage` (piszkozat-autosave) nem válhat system of recorddá | Csak piszkozat-cache egy félbeszakadt tervhez; mockupban `localStorage`, véglegesben IndexedDB |
| `@react-pdf/renderer` esetén **Unicode fontot kell regisztrálni** (pl. Inter, Source Sans, Noto Sans) | A beépített Helvetica nem tartalmazza az `ő`/`ű` karaktereket — ez csak a végleges PDF-en látszik, a HTML előnézeten nem |
| `#f77409` (a márka narancsa) **soha nem lehet szövegszín** | Fehéren 2,82:1, kis méretben olvashatatlan; csak díszítővonalra való. A fogtérkép saját, kezelés-kategóriánkénti palettát használ (`design/treatmentVisuals.ts`), nem ezt a színt |
| A `Tetel.leiras` hiányzó német fordítása némán elmarad a nyomtatványról, nem esik vissza magyarra | D27 — ellentétben a `nevSnapshot`-tal: a leírás kiegészítő tartalom, egy vegyes nyelvű nyomtatvány rosszabb lenne, mint a hiánya |

A fenti táblázat data-/jogi-integritási szabályokat sorol. A felület
kinézetére és viselkedésére (színek, komponensek, billentyűzet,
akadálymentesség) vonatkozó, ugyanígy kötelező szabályok külön fájlban:
`docs/07-felulet-rendszer.md`.

## Böngésző-automatizálás — nem tárgyalható

A chrome-devtools MCP KIZÁRÓLAG izolált módban futhat.

TILOS a configba kerülnie: --autoConnect, --browserUrl, vagy --user-data-dir
a fejlesztő valós Chrome profiljára mutatva.

TILOS javasolni vagy megkísérelni a futó Chrome példányhoz csatlakozást,
és tilos remote debuggingot bekapcsolni bármilyen böngészőben.

Ha egy feladat látszólag valós profilt igényelne (bejelentkezett munkamenet,
korábban megadott mappa-engedély), NE kerüld meg. Jelezd, hogy ez a
korlátozás miatt nem megy, és javasolj alternatívát a PlanStorage
teszt-implementációval.

Ennek a szabálynak a kikényszerítési pontja a követett, verzió-pinnelt
`.mcp.json` (`--isolated`). A vitest-készlet strukturálisan nem elérhető
rétegeinek (kontraszt, `controlBorder`, valódi PDF, canvas→PNG fogtérkép,
`paint-order`, Radix popover-geometria) böngészős ellenőrzését a
`.claude/skills/browser-validation/` skill végzi — kézzel indítva, sose
automatikusan.

## Meglévő segédfüggvények — használd, ne írd újra

Ezek (eredetileg a törölt `ui/tokens.js` prototípusból portolva) már megvannak
`app/src/domain/` és `app/src/design/tokens.ts` alatt:
- `t` — design tokenek (márkaszínek, tipográfia, spacing)
- `formatMoney(value, currency)` / `formatPrice(ar, currency)` — a
  `docs/04-nyomtatvany-spec.md` kötelező formátuma szerint (`1 234 567 Ft`,
  `1.234,56 €`). **Ne improvizálj `toLocaleString()`-gel**, ez szerződéses dokumentum.
- `basePrice(ar)` — `SAVOS` típusnál a `min` értéket adja vissza
- `norm(s)` — ékezetfüggetlen kereséshez (`NFD` normalizálás)
- `nevEgyezik(nev, nq)` (`app/src/domain/search.ts`) — egy `LokalizaltSzoveg`
  illeszkedik-e a MÁR normalizált keresőszövegre, MINDKÉT nyelven; ez az
  EGYETLEN hely, ahol a kétnyelvű keresés szabálya él (a szerkesztő
  `ItemPicker`-e és az Árlista admin szűrője is ezt hívja) — a hívó a ciklus
  előtt egyszer normalizál, ne tételenként
- `parseTeeth(input)` — FDI fogszám-validáció (`11–18`/`21–28`/`31–38`/`41–48`
  maradó, `51–55` stb. tejfog)

D21 (nyelv/pénznem szétválasztás) hozott néhány újat, ezeket se írd újra:
- `resolveNev(nev, nyelv)` / `fallbackSorok(plan, priceList)` (`app/src/domain/nev.ts`)
  — a tétel nevének nyelvfüggő feloldása magyar visszaeséssel + a
  véglegesítés-őr diagnosztikája (két listára bontva: `nincsForditas` /
  `elterAzArlistatol`, lásd alább, backlog-3b). `sorFallback(sor, nyelv,
  tetelById)` (ugyanitt) az EGYETLEN hely, ahol eldől, hogy egy SOR neve
  miért nem a terv nyelvén szerepel — a `fallbackSorok` és a szerkesztő
  `HU`/„átírt" jelvénye is ezt hívja. `nevKoveti(sor, tetel, nyelv)`
  (ugyanitt) a mag-összehasonlítás mindkettő, és a nyelváltás
  névmegőrzésének (`PatientPage.tsx` `applyNyelv`) forrása
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
  kategória színét kapja, több kezelés esetén melyiket); `parseTeeth`-re
  épül, nem duplikálja a fogszám-parsolást
- `resolveToothVisual(kezelesek)` (`app/src/domain/toothVisual.ts`) — egy
  fogon több kezelés esetén a legkisebb `sorrend`-ű kategória (a
  kategória-lista sorrendje egyben ütközési prioritás, docs/08-backlog.md
  8. tétel) szín dönt; ez az EGYETLEN hely, ahol ez a precedencia eldől
- `kategoriaVizual(kategoria)` / `vizualKategoriaFor(kategoriaId, kategoriak)`
  / `KATEGORIA_PALETTA` / `ALAP_KATEGORIA_SZIN` / `ISMERETLEN_KATEGORIA`
  (`app/src/design/treatmentVisuals.ts`) — a `Kategoria.szin` mező (az
  árlista-adminban, a Kategóriák panelen szerkeszthető) a tényleges
  színforrás; ez a fájl adja a kurált *választható* palettát a
  színválasztóhoz és az eltévedt hivatkozás (`kategoriaId` nem létező
  kategóriára mutat) fix tartalék-színét. A szerkesztő
  (`components/DentalChart.tsx`, `DentalChartLegend.tsx`) és a nyomtatvány
  (`pdf/ToothChartPdf.tsx`) mindig a `buildToothVisualStates` eredményéből
  olvas, nem közvetlenül innen
- `nextKategoriaId(kategoriak)` (`app/src/domain/priceListIds.ts`) — a
  `nextTetelId` kategória-párja, ugyanazzal a D17-szerű max-alapú
  (nem hossz-alapú) számítással
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
- `kitoltetlenSorok(plan)` (`app/src/domain/kitoltetlen.ts`) — a meg nem
  nevezett (üres `nevSnapshot`-ú — pl. fogtérkép-kattintással létrehozott,
  de be nem azonosított) sorokat sorolja fel; a `PreviewPage`
  véglegesítés-őre KEMÉNY blokként hívja, ne írj hozzá második
  ellenőrzést máshol

A piszkozat-perzisztencia (`docs/03-funkcionalis-spec.md` § Autosave,
`docs/05-technologia.md` § Piszkozat-autosave) segédfüggvényei és rétege,
szintén ne írd újra őket:
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

A friss-dátum tétel (`docs/03-funkcionalis-spec.md` § Korábbi terv új
verzióra nyitása, D22) segédfüggvényei, szintén ne írd újra őket:
- `todayIso()` (`app/src/domain/date.ts`) — a mai nap ISO dátuma; az
  EGYETLEN forrás, `createBlankPlan()` is ezt hívja
- `frissDatummal(plan, settings, ma)` (`app/src/domain/ujVerzioDatum.ts`) —
  egy betöltött terv `keltezes`/`ervenyesIg`-ét bélyegzi mai dátumra (D7
  szerint minden más mező pillanatkép, érintetlen); az `AppState.tsx`
  `loadPlanIntoDraft`-ja hívja betöltéskor, ne máshol és ne
  véglegesítéskor

A sornév-szerkesztés + egyedi sor tétel (`docs/03-funkcionalis-spec.md`
§ Sor mezői, § Egyedi sor) segédfüggvényei, szintén ne írd újra őket:
- `sorMezokEgyedibol(nev)` (`app/src/pages/PlanEditorPage.tsx`) — a
  `sorMezokTetelbol` egyedi (árlistán kívüli) párja: `tetelId: ''`,
  `listaEgysegar === tenylegesEgysegar === 0` kezdőértékkel; ezt hívja
  mind a fázis alatti, mind a soron belüli `ItemPicker` `onPickEgyedi`-je
- `ItemPicker` `onPickEgyedi` prop (`app/src/pages/planEditor/ItemPicker.tsx`)
  — nulla találatnál az Enter, találatok mellett egy pszeudo-opció a lista
  alján veszi fel a gépelt szöveget a gépel → nyíl → Enter cikluson belül;
  ne építs mellé külön UI-utat egyedi sor felvitelére
- `sorFallback(sor, nyelv, tetelById)` (`app/src/domain/nev.ts`) — lásd
  fent, D21 blokk

A nyelváltás-névmegőrzés tétel (`docs/03-funkcionalis-spec.md` § Nyelv és
pénznem (D21), D24) segédfüggvényei, szintén ne írd újra őket:
- `nevKoveti(sor, tetel, nyelv)` (`app/src/domain/nev.ts`) — lásd fent, D21
  blokk; a `PatientPage.tsx` `applyNyelv`-je a RÉGI nyelvvel hívja (csak az
  ezt teljesítő sorok neve frissül az új nyelvre), a `sorFallback` a
  JELENLEGI nyelvvel
- `nyelvvaltasHatasa(plan, priceList)` (`app/src/domain/nev.ts`) — hány
  `tetelId`-hez kötött sor neve frissülne/maradna változatlan egy
  nyelváltáskor; a `PatientPage.tsx` nyelváltás-megerősítő `AlertDialog`-
  jának élő számlálásához, ne számold újra máshol
- A `PreviewPage.tsx` „Tételnevek nem németül" dialógusának „Folytatás"
  gombja SZÁNDÉKOSAN nem `AlertDialog.Action` — lásd a helyi kommentet: az
  Action beépített auto-close-a versenyhelyzetbe kerülne a `confirmStep`-
  lánc `missing-fields` → `de-fallback-names` váltásával, és mindig
  átugorná a második dialógust

A sablonszerkesztő + placeholder-őr tétel (`docs/03-funkcionalis-spec.md`
§ Sablon-placeholder őr, D23) segédfüggvénye, szintén ne írd újra:
- `isPlaceholderTemplate(body)` (`app/src/domain/templates.ts`) — az
  EGYETLEN hely, ahol eldől, hogy egy sablon (nyilatkozat/fizetési
  feltételek) törzse még jogi lektorálásra vár-e (`[PLACEHOLDER`/
  `[PLATZHALTER` jelölő); a `DemoStorage.ts` (`ensureSeedTemplates`), a
  `SettingsPage.tsx` (a német nyilatkozat készültség-jelzése) és a
  `PreviewPage.tsx` (a nyilatkozat kemény zára + a fizetési feltételek
  HU-visszaesése) mind ezt hívja — korábban két, egymástól eltérő
  string-egyezésű privát duplikátum létezett, egy harmadik hívási hely
  bevezetése volt az alkalom a konszolidálásra

A terv-szintű „kerek végösszeg" kedvezmény tétel
(`docs/02-domain-modell.md` § Terv-szintű kedvezmény, D25)
segédfüggvényei, szintén ne írd újra őket:
- `tervVegosszeg(fazisok, kedvezmenyOsszeg)` (`app/src/domain/totals.ts`)
  — az EGYETLEN hely, ahol a `Fizetendő` eldől: a sorok összegéből levonja
  a terv-szintű kedvezményt, és soha nem ad negatívat (0-ra padlóz). A
  szerkesztő (`PlanEditorPage.tsx`), a nyomtatvány (`pdf/TervDocument.tsx`)
  és a `computeOsszesitok()`/`osszesitokElter()` is ezt hívja — korábban a
  sorok nyers összege három helyen, egymástól függetlenül számolódott
  újra, egy negyedik levonás-logika szét-driftelt volna
- `sorokOsszeg(fazisok)` / `sorokListaOsszeg(fazisok)` (ugyanitt) — a
  `fazisOsszeg`/`fazisListaOsszeg` terv-szintű összegzői, a
  `tervVegosszeg()` és a szerkesztő Kerek végösszeg blokkja is ezeket
  hívja a felső határhoz (a mező alapértéke a nyers, kedvezmény előtti
  összeg, nem a `tervVegosszeg()` eredménye)

A terv másolása tétel (`docs/03-funkcionalis-spec.md` § Terv másolása új
tervként, D26) segédfüggvényei, szintén ne írd újra őket:
- `planUjPaciensselTervhez(plan, settings, priceList)` /
  `planMasolatKent(plan, settings, ma)` (`app/src/domain/planCopy.ts`) —
  a két tiszta transzformáció egy korábbi tervből: az első csak a
  `paciens` blokkot viszi át egy friss `createBlankPlan()` fölé, a
  második mindent átvisz az azonosító/állapot/dátum kivételével
  (`frissDatummal`-t hívja a dátumbélyeghez, `computeOsszesitok`-ot az
  `osszesitok` újraszámolásához — egyiket se írd újra itt sem)
- `copyPlanIntoDraft(next)` (`app/src/state/AppState.tsx`) — a fenti két
  függvény EREDMÉNYÉT teszi be a piszkozatba a `resetPlanDraft` mintáján
  (nem a `loadPlanIntoDraft`-én): a másolat azonnal mentetlen munkának
  számít, mert még soha nincs elmentve a saját `tervId` alatt

A tétel-leírás tétel (`docs/02-domain-modell.md` § Tétel-leírás, D27)
segédfüggvényei, szintén ne írd újra őket:
- `leirasKoveti(sor, tetel, nyelv)` (`app/src/domain/nev.ts`) — a
  `nevKoveti` párja, de NEM ő maga: a `leirasSnapshot` nyelváltáskori
  szinkronizálásához, a hiányzó fordítást üres stringgé normalizálva (nem
  `!= null` őrrel kizárva, mint a névnél) — enélkül egy hu→de→hu oda-vissza
  nyelváltás elveszítené az eredeti magyar leírást. A `PatientPage.tsx`
  `applyNyelv`-je hívja, a RÉGI nyelvvel
- `hianyzoCsomagLeirasok(plan, priceList)` (`app/src/domain/kitoltetlen.ts`)
  — PUHA diagnosztika, szándékosan külön a `kitoltetlenSorok` kemény
  blokkjától: azon sorok, amik `csomag: true` tételre hivatkoznak, de üres
  a leírásuk. A `PreviewPage.tsx` `confirmStep`-láncának harmadik tagja
  hívja, csak ha `plan.leirasokMutatasa` igaz
- `leirasTulHosszu(szoveg)` / `LEIRAS_FIGYELMEZTETES_KARAKTER` /
  `LEIRAS_FIGYELMEZTETES_SOR` (`app/src/domain/leirasHossz.ts`) — a puha
  hosszkorlát-figyelmeztetés, mindkét hívó helyen (Árlista admin
  `ItemEditor`, szerkesztő `LineRow`) ugyanaz a predikátum

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

`data/arlista.seed.json` = 118 tétel, 13 kategória, az eredeti Excel `Arlista`
lapjából importálva. A tényleges, folyamatosan változó állapot (mi van
lektorálva, mi van bekategorizálva, hány tétel kapott `gyakori` jelölést)
**a `docs/06-arlista-import.md`-ben él, ne itt** — ez a fájl gyorsan
elavulna, mert a doki az adminban éppen ezt takarítja.

A hiányzó/lektorálatlan tartalom **nem blokkolja** a német nyelv
kipróbálását (D21): hiányzó `de` név esetén magyar névre esik vissza `HU`
jelöléssel, hiányzó ár esetén a Páciens adatlap előre jelez. A
Beállítások számszerűsíti a készültséget (`lefedettseg()`).

## Komment-szabályzat

- Ne írj magyarázó kommentet olyan kódrészhez, ami a saját nevéből/
  szerkezetéből egyértelmű. A "mit csinál" típusú kommentet ne írd le
  még akkor sem, ha "hasznosnak" tűnik írás közben.
- Kommentet csak akkor írj, ha WHY-t vagy nem triviális döntést közöl:
  miért ezt a megoldást választottuk (nem a nyilvánvalót), milyen
  invariánst nem szabad megsérteni, milyen gotcha/workaround van
  mögötte, vagy mit nem szabad módosítani X nélkül.
- Meglévő kommentet ne módosíts egy nem kapcsolódó változtatás
  mellékhatásaként. Csak akkor nyúlj hozzá, ha a komment által
  állított tény ténylegesen hamissá vált a kódváltozás miatt.
- Indoklás: minden komment karbantartási költség (a jövőbeli
  session-öknek minden olvasásnál be kell tölteniük, és
  szinkronban kell tartani a kóddal) — ha nem hordoz új
  információt a kód szerkezetén felül, ne írd meg.

Az architekturális/tervezési döntések forrása a `docs/*.md` fájlokban van
(ADR-ek és döntési dokumentumok), NEM a forráskód kommentjeiben. A
döntések (D1–D24) egy helyen, számozva élnek a
`docs/01-attekintes-es-dontesek.md`-ben; egy-egy nyitott funkció tervezési
háttere külön fájlban, `docs/backlog-<n>-<cim>-terv.md` néven. Amikor egy
modul vagy komponens "miért így van megcsinálva" kérdés merül fel, először
nézd meg a `docs/` könyvtárat, mielőtt találgatnál vagy rákérdeznél.

## Backlog-tétel lezárása

**A `docs/archive/` mappára és a benne lévő fájlokra sehonnan sem szabad
hivatkozni** — sem `docs/*.md`-ből, sem forráskódból, sem ebből a
fájlból. Kivétel: a `docs/08-backlog.md` NYITOTT tételeinek `**Terv:**`
sora a még nyitott (nem archivált) tervfájlra mutathat — ez lezárásig élő
navigáció, és lezáráskor a 4. lépéssel együtt, magával a tétellel tűnik
el, nem marad dangling pointerként.

Egy backlog-tétel megvalósítása után ezt a sorrendet kell követni,
ugyanabban a körben, nem később:

1. **Csak teljesen kész tételnél.** Ha a tétel csak részben kész (pl.
   kódrész kész, doktori adatmunka nyitva — lásd a 8. tétel mintáját a
   `docs/08-backlog.md`-ben: „**Kódrész — KÉSZ (dátum).**" + „Még nyitva"
   albekezdés), a tétel a `docs/08-backlog.md`-ben marad, ugyanebben a
   mintában jelölve. **Nem archiválunk, nem törlünk semmit**, amíg a tétel
   csak részben kész.
2. **Döntések átvezetése.** A tervdokumentum (`docs/backlog-N-*-terv.md`)
   döntéseiből, ami tartósan érvényes (nem feladatlista, nem elvetett
   alternatíva, nem teszt-terv), az bekerül a megfelelő `docs/02`–`07`
   szakaszba prózaként; a valóban sérthetetlen invariáns új sorként a
   `docs/01` D-táblájába (a következő szabad D-számmal) és — ha jogi/
   adatintegritási következménye van — a „Sérthetetlen szabályok"
   táblába is. Ha a tétel új, újrahasznosítható segédfüggvényt vezetett
   be, egy új bekezdés kerül a „Meglévő segédfüggvények" alá, a meglévők
   mintájában (docs-anchorra/D-számra hivatkozva, SOHA a terv-fájlra).
3. **Tervdokumentum archiválása.** `git mv docs/backlog-N-*.md
   docs/archive/backlog/`. A tétel száma (N) ezután véglegesen
   nyugdíjazva — soha nem osztható ki új tételnek, ugyanaz az elv, mint a
   D17 ártétel-`id`-nél.
4. **Backlog-bejegyzés törlése + zárt-napló bővítése.** A tétel teljes
   szakasza törlődik a `docs/08-backlog.md`-ből (nem jelöljük KÉSZ-nek, nem
   hagyunk stub-ot) — a maradék tételek „N. hely" rangsorát
   újraszámozzuk. Egy tömör összefoglaló (méret, a végleges megoldás 1-2
   mondatban, `docs/0X` hivatkozás a részletekhez) bekerül a
   `docs/archive/08-backlog-closed.md` végére — ez a bejegyzés NEM
   hivatkozhat a most archivált terv-fájlra, csak a fő dokumentumokra és a
   git history-ra.
5. **Referencia-seprés.** Minden helyen (forráskód-kommentek, ez a fájl,
   `docs/*.md`), ahol a most archivált terv-fájlra vagy a `docs/archive/`
   mappára mutató hivatkozás volt, át kell írni a megfelelő `docs/0X`
   szakaszra vagy D-számra.
6. **CHANGELOG.** Ha a tétel a pácienst/dokit érintő, felhasználó-szemszögű
   változás, a `/update-changelog` továbbra is külön, explicit lépés — ez
   a checklist nem helyettesíti.

## Dokumentáció-térkép

| Fájl | Mikor nyisd meg |
|---|---|
| `docs/01-attekintes-es-dontesek.md` | Miért nem elég az Excelt javítani; a D1–D24 döntések és indoklásuk; adatvédelmi keret; kockázatok |
| `docs/02-domain-modell.md` | Mappastruktúra, `arlista.json`/`terv.json`/`beallitasok.json` sémák, fogszám-parsolás szabályai |
| `docs/03-funkcionalis-spec.md` | Képernyők és viselkedés (terv szerkesztő, árlista admin, korábbi tervek stb.) |
| `docs/04-nyomtatvany-spec.md` | A generált PDF felépítése, tipográfia, márkaszínek, számformátum |
| `docs/05-technologia.md` | Stack, `PlanStorage` interface, PDF generálás, sémaverziózás, hosztolás |
| `docs/06-arlista-import.md` | Az Excel-import szabályai, ismert szennyeződések, mit ne javíts az importban |
| `docs/07-felulet-rendszer.md` | Felület- és nyomtatvány-kinézeti szabályok: márkatokenek, komponensek, billentyűzet, akadálymentesség — kötelező, nem javaslat |
| `docs/08-backlog.md` | Még fejlesztendő tételek (priorizálva), technikai adósság, és honnan jönnek az igények |
| `docs/backlog-N-*-terv.md` | Egy nyitott backlog-tétel részletes döntései — a `docs/08-backlog.md` tétel `**Terv:**` sora mutat rá; lezáráskor a `docs/archive/backlog/`-ba költözik és eltűnik a listából (lásd „Backlog-tétel lezárása") |
