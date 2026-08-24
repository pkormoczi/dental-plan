# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo elrendezés

```
docs/     7 fő dokumentum (01–07, lásd térkép alul)
backlog/  BACKLOG.md (nyitott tételek) + plans/ (nyitott tervdokumentumok) +
          done/ (BACKLOG_DONE.md zárt-napló + lezárt tervdokumentumok, lásd
          „Backlog-tétel lezárása")
data/     arlista.seed.json (118 tétel), az eredeti .xls
assets/   márkalogó, navy eredeti (PNG + eredeti PDF-ek) — az app egy átszínezett másolatot használ
app/      a tényleges Vite + React + TypeScript alkalmazás — IDE dolgozz
```

Az `app/`-on kívüli minden más csak referencia és dokumentáció.

**A `docs/` és a `backlog/` szerepe élesen elválik.** Minden tartósan
érvényes, élő dokumentáció és döntés a `docs/`-ban él (funkcionális/
nyomtatvány/technológia szakaszok) — ez az egyetlen forrás, aminek
self-containednek kell maradnia. A `docs/01-attekintes-es-dontesek.md`
`D<szám>` döntéstáblája **lezárt, történeti napló** — nem bővül, és nem
hivatkozási cél (lásd a fájl elején lévő megjegyzést). A `backlog/` csak
munkaközi állapot: nyitott tervek és a lezárási napló, folyamatosan mozgó
tartalommal (egy nyitott tétel lezáráskor eltűnik a `BACKLOG.md`-ből és
átkerül a `done/`-ba). **Forráskód-kommentek soha nem hivatkozhatnak a
`backlog/` mappa semelyik fájljára** — sem a `BACKLOG.md`-re, sem a
`plans/`-ra, sem a `done/`-ra, nyitott vagy lezárt tételtől függetlenül —
és **soha nem hivatkoznak `D<szám>` döntési azonosítóra sem** (se meglévőre,
se újra). Ha egy kódrészlet mögötti döntést dokumentálni kell, az anchor
kizárólag egy néven megnevezett `docs/0X` szakasz lehet (pl. „lásd
`docs/02-domain-modell.md` § Fogszám kezelés"); ha a döntés még nincs
migrálva `docs/`-ba (a tétel még nyitott), a komment a WHY-t írja le
közvetlenül, path-hivatkozás nélkül — ne mutasson előre egy még be nem zárt
backlog-tételre.

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
| Placeholder-jelölésű nyilatkozat mellett a nyomtatvány nyilatkozat + aláírás oldala nem kerülhet PDF-be — a „csak ajánlat" mód kényszerített, felülírás nélkül | D23 — jogi védelem: a jogász által „még nincs lezárva" jelöléssel ellátott szöveg nem kerülhet aláírásra. Az `isPlaceholderTemplate()` (`app/src/domain/templates.ts`) az EGYETLEN hely, ahol ez eldől |
| Korábbi terv új verzióra nyitásakor a dátumbélyeg (`keltezes`/`ervenyesIg`) a betöltés pillanatában íródik (`frissDatummal`), soha nem véglegesítéskor | D22 — különben a mentett JSON és a már renderelt PDF-blob dátuma szétcsúszik, vagy egy lejárt keltezésű ajánlatot írnak alá |
| Páciensmappa-névben az **ékezetek maradnak**, nincs transzliteráció; csak a tiltott karaktereket (`/ \ : * ? " < > \|`) kell cserélni; nevek rövidek (Windows 260 karakteres útvonalkorlát) | A doki a Fájlkezelőben keres rájuk névre |
| A `DraftStorage` (piszkozat-autosave) nem válhat system of recorddá | Csak piszkozat-cache egy félbeszakadt tervhez; mockupban `localStorage`, véglegesben IndexedDB |
| `@react-pdf/renderer` esetén **Unicode fontot kell regisztrálni** (pl. Inter, Source Sans, Noto Sans) | A beépített Helvetica nem tartalmazza az `ő`/`ű` karaktereket — ez csak a végleges PDF-en látszik, a HTML előnézeten nem |
| `#f77409` (a márka narancsa) **soha nem lehet szövegszín** | Fehéren 2,82:1, kis méretben olvashatatlan; csak díszítővonalra való. A fogtérkép saját, kezelés-kategóriánkénti palettát használ (`design/treatmentVisuals.ts`), nem ezt a színt |
| A `Tetel.leiras` hiányzó német fordítása némán elmarad a nyomtatványról, nem esik vissza magyarra | D27 — ellentétben a `nevSnapshot`-tal: a leírás kiegészítő tartalom, egy vegyes nyelvű nyomtatvány rosszabb lenne, mint a hiánya |
| A `paciens.json` és a `terv-cimke.json` kizárólag azonosító-/kereső-index és szervezési metaadat — soha nem system of record, sosem írhatja felül a `terv.json` `paciens` blokkját | D29 — a terv tartalmi igazsága marad a pillanatkép (D7); a `paciens.json` `nev`-je minden mentéskor frissül, de ez csak a legutóbb mentett terv `paciens.nev`-jének tükre |
| A `paciens-adatok.json` (ELLENTÉTBEN a `paciens.json`/`terv-cimke.json`-nal) valódi system of record a saját mezőire — nincs automatikus szinkron a `terv.json` `paciens` blokkjával egyik irányban sem, egy konkrét terv adatlapján tett módosítás soha nem írja át, és fordítva | D33 — a `terv.json` `paciens` blokkja pillanatkép marad (D7); egy automatikus szinkron összemosná "mit tartalmazott ez a konkrét, esetleg aláírt ajánlat" és "mi a páciens jelenleg ismert adata" fogalmát |
| Az árlista `arlistaVerzio` mezője az Árlista admin MINDEN mentésekor a mai napra áll, mezőnkénti különbségtevés nélkül | D30 — a nyomtatvány lábléce ebből mondja, „melyik árlistából készült"; egy befagyott érték hamis audit-adat lenne vitánál. A már mentett terveken lévő érték ettől függetlenül pillanatkép marad (D7) |
| A `PlanStorage`-t fogyasztó `savePriceList`/`saveSettings` kizárólag updatert fogad, sosem kész objektumot; a memóriabeli állapot a mentés előtt, szinkron frissül, és hibára nem gördül vissza | D31 — a render-idejű closure-be zárt régi állapot két gyors egymás utáni szerkesztésnél némán eldobja az egyiket a doki törzsadatában (árlista, rendelő-adat); a `FileSystemStorage`-váltás alatt a ma kicsi versenyablak nagyságrendekkel tágul |
| Páciens nem törölhető, ha van véglegesített (`statusz === 'VEGLEGES'`) terve, rá mutató aktív mentetlen piszkozata, vagy olvashatatlan terv-lánca/verziója | D50 — egy aláírt/kiadott dokumentum vagy egy folyamatban lévő szerkesztés mögül a törlés adatvesztést jelentene; a `deletePatient` a teljes páciensmappát véglegesen elviszi, nincs „kuka” |
| A terv `ervenyesIg` mezője soha nem maradhat üresen | D62 — üres érték a `formatLongDate`-en át „Invalid Date”-ként kerülne egy szerződéses dokumentumra; a „Terv adatai” lap Dátumok szekciója a mező elhagyásakor automatikusan visszaállítja az alapértékre |
| A terv `elolegOsszeg` mezője soha nem haladhatja meg a fizetendőt egy véglegesített terven, és soha nem vágódik le némán | D66 — a százalék-alapú, strukturálisan garantált `előleg ≤ fizetendő` védelem megszűnt az abszolút összegre váltáskor; a véglegesítés-őr kemény blokkja váltja ki, a doki tudatos rendezését várva, nem automatikus levágást |
| A véglegesítés blokkolva, ha a terv `orvos`-a üres vagy nem szerepel a jelenleg AKTÍV orvosok között | D68 — az aláírás-blokkban szereplő név jogilag releváns; egy már véglegesített terv `plan.orvos` név-pillanatképét ez visszamenőleg nem érinti (D7) |
| Sem a sor-, sem a tétel-szintű ár SOHA nem számolódik át automatikusan a két pénznem között; a `Sor.masikPenznemAr` kizárólag a pénznemváltás munkaállapota, sosem system of record egyetlen renderelt/nyomtatott értékhez sem | D11/D71 — minden HUF/EUR érték egymástól függetlenül, kézzel megadott; egy automatikus árfolyam-átszámítás vagy a stash-mező nyomtatványon való feltűnése a pillanatkép-elvet (D7) sértené |
| Egy kézzel gépelt szöveg nyelvi mismatch-ét (`nevNyelv`/`leirasNyelv`/`megnevezesNyelv`/`megjegyzesNyelv`) KIZÁRÓLAG az explicit „Nyelv ellenőrizve” akció oldja fel — a szöveg szerkesztése, egy teljes (akár helyes) fordítás a másik nyelvre, és a dokumentumnyelv puszta váltása sosem | D72 — a páciens által aláírt dokumentumon egy egyszerű szerkesztés nem bizonyítja, hogy a doki ténylegesen ellenőrizte a szöveg nyelvi helyességét; nincs „jelentős változás” heurisztika |
| A PDF-előnézet render-hibája esetén sem letölteni, sem véglegesíteni nem lehet, amíg a hiba fennáll — az utolsó sikeres PDF csak beszürkítve látható, „Újrapróbálás” akcióval | D73 — a `usePDF()` hibán át megőrzi a korábbi `url`-t/`blob`-ot; letöltésre engedve egy a képernyőn látott tervvel már nem egyező PDF hagyhatná el a gépet |
| Egy tartósan mentett verzió (sikeres `savePlan`+`loadPlan`) UTÁNI piszkozat-takarítási hiba SOHA nem minősül „a mentés nem sikerült"-nek — a sikerképernyő ekkor is megjelenik, a takarítás hibája legfeljebb halk jelzés | D74 — a doki különben egy valójában sikeresen, tartósan mentett dokumentumot hinne elveszettnek, és egy fölösleges újrapróbálkozással egy `_v<n+1>` duplikátumot hozna létre (D4) |
| Egy VÉGLEGESÍTETT terv `csakAjanlat` mezője azt rögzíti, hogy a ténylegesen kiadott PDF tartalmazta-e a nyilatkozat + aláírás oldalt — a placeholder-jelölésű nyilatkozat miatti kényszer (D23) a piszkozatban sosem íródik a mezőbe, csak véglegesítéskor | D75 — enélkül egy placeholder miatt kényszerítve, aláírás nélkül kiadott verzió a mentett fájlban tévesen „teljes dokumentum"-ként (`csakAjanlat: false`) szerepelne, és a verziósor jelvénye (D558) pontosan azon az eseten hallgatna, ahol a legkevésbé engedhető meg a tévedés |
| Német nyelvű terven a véglegesítés blokkolva, ha egy látható sor neve nem igazoltan németül van (sem árlistai `nev.de`-t nem követ, sem D72 szerint igazoltan `de`-re írt kézi szöveg), vagy ha a fogtérkép-legendán ténylegesen megjelenő kategóriának nincs `nev.de`-je | D77 — aláírandó német dokumentumon lefordítatlan magyar tételnév/kategórianév jogilag/kommunikációsan nem elfogadható |

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
- `formatMoney(value, currency, nyelv)` / `formatPrice(ar, currency, nyelv)` —
  a `docs/04-nyomtatvany-spec.md` kötelező formátuma szerint: az ezres/tizedes
  elválasztó a `nyelv`-től függ (`hu` szóköz, `de` pont), a tizedesjegyek
  száma és a pénznemjel a `currency`-től (`1 234 567 Ft`, `1.234,56 €`,
  `1.234.567 Ft`). A képernyőn a *pénzösszegek* a terv nyelvét követik
  (1:1 a generált PDF-fel), az UI-próza és a dátumok viszont magyarok
  maradnak. **Ne improvizálj `toLocaleString()`-gel**, ez szerződéses dokumentum.
- `basePrice(ar)` — `SAVOS` típusnál a `min` értéket adja vissza
- `norm(s)` — ékezetfüggetlen kereséshez (`NFD` normalizálás)
- `nevEgyezik(nev, nq)` (`app/src/domain/search.ts`) — egy `LokalizaltSzoveg`
  illeszkedik-e a MÁR normalizált keresőszövegre, MINDKÉT nyelven; ez az
  EGYETLEN hely, ahol a kétnyelvű keresés szabálya él (a szerkesztő
  `ItemPicker`-e és az Árlista admin szűrője is ezt hívja) — a hívó a ciklus
  előtt egyszer normalizál, ne tételenként
- `parseTeeth(input)` — FDI fogszám-validáció (`11–18`/`21–28`/`31–38`/`41–48`
  maradó, `51–55` stb. tejfog)
- `parseSections(markdown)` (`app/src/domain/markdownSections.ts`) — a
  Kezdőlap két fájl-alapú kártyájának (`ChangelogCard`, `FeatureOverviewCard`)
  közös, szándékosan minimális szakasz-parsere: `## cím` + `- tétel` formátum,
  a gyökér `CHANGELOG.md`-t és `FEATURES.md`-t olvassa `?raw` importtal

D21 (nyelv/pénznem szétválasztás) hozott néhány újat, ezeket se írd újra:
- `resolveNev(nev, nyelv)` (`app/src/domain/nev.ts`) — a tétel nevének
  nyelvfüggő feloldása magyar visszaeséssel. `sorFallback(sor, nyelv,
  tetelById)` (ugyanitt) az EGYETLEN hely, ahol eldől, hogy egy SOR neve
  miért nem a terv nyelvén szerepel (`nincsForditas`/`elterAzArlistatol`/
  `egyedi`, lásd backlog-3b) — a szerkesztő `HU`/„átírt" jelvénye ezt
  hívja (a véglegesítés-őr D76 óta a `domain/nemetNev.ts` KOMPONÁLT
  predikátumát hívja, nem ezt közvetlenül, lásd lentebb). `nevKoveti(sor,
  tetel, nyelv)` (ugyanitt) a mag-összehasonlítás mindkettő, és a
  nyelváltás névmegőrzésének (`PatientPage.tsx` `applyNyelv`) forrása
- `lefedettseg(priceList, penznem)` (`app/src/domain/coverage.ts`) — a
  német tartalom készültsége (Beállítások, Terv adatai lap)
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
  kategória-lista sorrendje egyben ütközési prioritás, D28) szín dönt; ez az
  EGYETLEN hely, ahol ez a precedencia eldől
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
  `pdf/toothChartImage.ts` felé menő hívásban. A `szerep`
  (`'button' | 'option'`) és a `selectedTeeth` EGYMÁSTÓL FÜGGETLEN
  paraméterek: a `szerep` dönt az ARIA-szemantikáról
  (`option` → `aria-selected`, `button` + adott `selectedTeeth` →
  `aria-pressed`), a `selectedTeeth` a vizuális kijelölés-gyűrűről,
  mindkét `szerep`-ben. A React-komponens (`components/DentalChart.tsx`)
  ezt egy explicit `szerep` propon adja tovább, nem a `selectedTeeth`
  meglétéből vezeti le — a soronkénti fogválasztó
  (`ToothPickerPopover.tsx`) `szerep="option"`-t ad, a plan-szintű
  térképek (a szerkesztő `ToothChartPanel.tsx` és a Terv részletei
  `pages/tervReszletei/FogterkepPanel.tsx`) az alapértelmezett
  `'button'`-t
- `toggleFog(fogak, fdi)` (`app/src/domain/teeth.ts`) — egy FDI kódot
  be-/kikapcsol a szabadszöveges `fogak` felsorolásban, sorrendtartóan;
  ez az EGYETLEN írási útja a `ToothPickerPopover`-nek (soronkénti
  fogválasztó), ne kezeld a tokeneket a hívóban
- `kitoltetlenSorok(plan)` (`app/src/domain/kitoltetlen.ts`) — a meg nem
  nevezett (üres `nevSnapshot`-ú — pl. fogtérkép-kattintással létrehozott,
  de be nem azonosított) sorokat sorolja fel; a `PreviewPage`
  véglegesítés-őre KEMÉNY blokként hívja, ne írj hozzá második
  ellenőrzést máshol
- `nullaOsszeguSorok(plan)` (`app/src/domain/kitoltetlen.ts`) — a névvel
  ellátott, de 0 összegű (`sorOsszeg(sor) === 0`) sorokat sorolja fel
  (`docs/03-funkcionalis-spec.md` § 4. Előnézet és véglegesítés); a
  `PreviewPage` véglegesítés-őrének PUHA (átugorható) lépéseként hívja,
  szándékosan nem a `kitoltetlenSorok`-kal egybevonva, mert az a névtelen,
  ez a névvel ellátott sorokat fedi

A piszkozat-perzisztencia (`docs/03-funkcionalis-spec.md` § Autosave,
`docs/05-technologia.md` § Piszkozat-autosave) segédfüggvényei és rétege,
szintén ne írd újra őket:
- `piszkozatTartalmas(plan)` (`app/src/domain/piszkozat.ts`) — az EGYETLEN
  hely, ahol eldől, hogy egy `Plan`-en van-e olyan tartalom, amit kár lenne
  elveszíteni; ezt hasonlítja az `AppState` (írási trigger) és a
  Home/OsszesTervSection (felülírás elleni AlertDialog) is, ne implementáld
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

A kezeléssor-szerkesztés (kézzel átírt név/ár/leírás marker + reset,
`docs/03-funkcionalis-spec.md` § Sor mezői, D65) segédfüggvénye, szintén
ne írd újra:
- `nevAtirt(sor, tetel, nyelv)` (`app/src/domain/nev.ts`) — a `nevKoveti`
  (D24) MELLETT, nem helyette élő, nyelvfüggetlen „kézzel eltérítve van-e"
  komparátor: `resolveNev()` visszaesési nevéhez mér, nem az árlistai
  nyers névhez, ezért egy DE terven, fordítás nélküli, egyébként
  érintetlen soron NEM jelez hamisan „átírt"-at — a `sorFallback`-ot
  (D21) TILOS úgy módosítani, hogy HU terven is fusson, a két komparátor
  egymás mellett él, külön kérdésre válaszolva. A leírás-reset a MEGLÉVŐ
  `leirasKoveti()`/`arlistaiLeiras()` (lásd lent, „A tétel-leírás tétel"
  blokk) bekötése — a `LineRow` a D65 óta hívja először, korábban csak a
  nyelváltás-szinkron

A sablonszerkesztő + placeholder-őr tétel (`docs/03-funkcionalis-spec.md`
§ Sablon-placeholder őr, D23) segédfüggvénye, szintén ne írd újra:
- `isPlaceholderTemplate(body)` (`app/src/domain/templates.ts`) — az
  EGYETLEN hely, ahol eldől, hogy egy sablon (nyilatkozat/fizetési
  feltételek/garancia) törzse még jogi lektorálásra vár-e (`[PLACEHOLDER`/
  `[PLATZHALTER` jelölő); a `DemoStorage.ts` (`ensureSeedTemplates`), a
  `SettingsPage.tsx` (a német nyilatkozat készültség-jelzése) és a
  `PreviewPage.tsx` (a nyilatkozat kemény zára + a fizetési feltételek/
  garancia HU-visszaesése) mind ezt hívja — korábban két, egymástól eltérő
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
  `tervVegosszeg()` és a szerkesztő Egyedi végösszeg blokkja is ezeket
  hívja a mező kiindulási alapjához (a `kedvezmenyOsszeg` a nyers, eltérés
  előtti összeghez képest levont/hozzáadott érték, nem a
  `tervVegosszeg()` eredménye)

A terv másolása tétel (`docs/03-funkcionalis-spec.md` § Terv másolása új
tervként, D26, D57) segédfüggvényei, szintén ne írd újra őket:
- `planUjPaciensselTervhez(plan, settings, priceList, oroklott?)` /
  `planMasolatKent(plan, settings, ma, master?)` (`app/src/domain/planCopy.ts`) —
  a két tiszta transzformáció egy korábbi tervből: az első csak a
  `paciens` blokkot viszi át egy friss `createBlankPlan()` fölé (az
  opcionális `oroklott` a nyelv/pénznem-öröklés forrása, lásd D52 lentebb),
  a második mindent átvisz az azonosító/állapot/dátum ÉS az orvos
  kivételével (`frissDatummal`-t hívja a dátumbélyeghez,
  `computeOsszesitok`-ot az `osszesitok` újraszámolásához,
  `alapertelmezettOrvosNeve()`-t az orvos felülírásához — D67, a forrás
  orvosa SOSEM másolódik át — egyiket se írd újra itt sem). Az opcionális
  negyedik `master` paraméter (D57) — ha a hívó átadja — a `paciens`
  blokkot az élő törzsadatból építi (`paciensTorzsadatbol()`), felülírva
  a forrás verzió pillanatképét; a `paciensId` ettől függetlenül mindig a
  forrás tervből jön
- `copyPlanIntoDraft(next)` (`app/src/state/AppState.tsx`) — a fenti két
  függvény EREDMÉNYÉT teszi be a piszkozatba a `resetPlanDraft` mintáján
  (nem a `loadPlanIntoDraft`-én): a másolat azonnal mentetlen munkának
  számít, mert még soha nincs elmentve a saját `tervId` alatt

A verzió-szintű akciók tétel (`docs/03-funkcionalis-spec.md` § 5. „A
verziósoron…", D58) segédfüggvénye, szintén ne írd újra:
- `csokkentettMozgas()` (`app/src/design/motion.ts`) — a
  `docs/07-felulet-rendszer.md` „prefers-reduced-motion tiszteletben
  tartva" NEM opcionális szabályának lekérdezése (`matchMedia`,
  jsdom-biztos); a `PlanEditorPage.tsx` fogszám-fókuszálása és a
  `PatientPlanChains.tsx` „Ugrás a legfrissebb verzióra"
  scroll+fókusza is ezt hívja

A tétel-leírás tétel (`docs/02-domain-modell.md` § Tétel-leírás, D27)
segédfüggvényei, szintén ne írd újra őket:
- `leirasKoveti(sor, tetel, nyelv)` (`app/src/domain/nev.ts`) — a
  `nevKoveti` párja, de NEM ő maga: a `leirasSnapshot` nyelváltáskori
  szinkronizálásához, a hiányzó fordítást üres stringgé normalizálva (nem
  `!= null` őrrel kizárva, mint a névnél) — enélkül egy hu→de→hu oda-vissza
  nyelváltás elveszítené az eredeti magyar leírást. A `PatientPage.tsx`
  `applyNyelv`-je hívja, a RÉGI nyelvvel; a szerkesztő „átírt leírás"
  jelvénye/reset-vezérlője (D65) is ezt hívja, a JELENLEGI nyelvvel
- `arlistaiLeiras(tetel, nyelv)` (`app/src/domain/nev.ts`) — a
  `Tetel.leiras` adott nyelvű szövege, hiányzó fordításnál üres string;
  a `leirasKoveti()` és a `PlanEditorPage.tsx` `sorMezokTetelbol` ebből
  emelve, a D65 leírás-reset a harmadik hívó
- `hianyzoCsomagLeirasok(plan, priceList)` (`app/src/domain/kitoltetlen.ts`)
  — PUHA diagnosztika, szándékosan külön a `kitoltetlenSorok` kemény
  blokkjától: azon sorok, amik `csomag: true` tételre hivatkoznak, de üres
  a leírásuk. A véglegesítés-őr `'hianyzo-leiras'` puha checklist-tétele
  (D76) hívja, csak ha `plan.leirasokMutatasa` igaz
- `leirasTulHosszu(szoveg)` / `LEIRAS_FIGYELMEZTETES_KARAKTER` /
  `LEIRAS_FIGYELMEZTETES_SOR` (`app/src/domain/leirasHossz.ts`) — a puha
  hosszkorlát-figyelmeztetés, mindkét hívó helyen (Árlista admin
  `ItemEditor`, szerkesztő `LineRow`) ugyanaz a predikátum

A páciens-entitás tétel (`docs/02-domain-modell.md` § Páciens- és
terv-mappa, D29) segédfüggvényei, szintén ne írd újra őket:
- `javasoltTervCim(plan, priceList)` (`app/src/domain/tervCim.ts`) — a
  terv-lánc élő címke-javaslata: a legnagyobb ÖSSZEGŰ kategória neve
  (`totals.ts` `sorOsszeg()`-gel súlyozva), holtversenynél a kisebb
  `sorrend`-ű kategória — ugyanaz a precedencia-elv, mint a fogtérkép
  ütközésfeloldásában (D28, `resolveToothVisual`). `megjelenitettTervCim(
  tervCim, plan, priceList)` (ugyanitt) az EGYETLEN hely, ahol eldől, hogy
  a kézi (`terv-cimke.json`-beli) vagy az élő javaslat látszik —
  `OsszesTervSection.tsx` és a `storage.savePlan()` induló terv-mappanév-
  javaslata is ezt hívja
- `buildPlanDirName(tervCim, planId)` / `parsePlanDirName(dirName)`
  (`app/src/storage/paths.ts`) — a `buildPatientDirName`/
  `parsePatientDirName` terv-mappa párja; a mappanév a LÉTREHOZÁSKORI
  címkéből képződik és utána fix marad, a megjelenített címke ettől
  függetlenül szabadon változik
- `latestVersionAcrossPlans(plans, versionsFor)`
  (`app/src/domain/planFolders.ts`) — egy páciens összes terv-láncának
  összes verziója közül a legfrissebb (`isoDate`, holtversenynél nagyobb
  `verzio`); az `OsszesTervSection.tsx` páciensszintű „Új terv” gombja és az
  `/uj-terv` „Meglévő páciens keresése” előtöltése is ezt hívja, hogy a
  két hely ne térjen el egymástól

A Filerendszer nézet (`docs/03-funkcionalis-spec.md` § 8. Filerendszer)
segédfüggvénye, szintén ne írd újra:
- `buildDemoFileTree(keys, prefix)` (`app/src/storage/demoFileTree.ts`) —
  tiszta függvény, `dp:` localStorage-kulcsok tömbjéből épít egy rendezett
  fát; `DemoStorage`-tól független (nem ismeri a `localStorage`-ot), ezért
  `localStorage` nélkül tesztelhető. Allowlist-alapú: csak a
  `docs/02-domain-modell.md` "Mappastruktúra" szerinti kulcsalakok kerülnek
  be, minden más (a piszkozat-cache-ek is) némán kimarad. A `DemoStorage`
  ezt hívja a `listFileTree()`/`readRawFile()` demó-only (nem a
  `PlanStorage` interfész része, a `resetDemoData`/`clearAll`/`loadPlanPdf`
  mintájára a `StorageContext`-en kitéve) mezőin keresztül — ne hozz létre
  második útvonalat a `dp:` kulcsok fává alakítására

A letöltési fájlnév (`docs/03-funkcionalis-spec.md` § 4. Előnézet és
véglegesítés „Letöltési fájlnév") segédfüggvényei, szintén ne írd újra
őket:
- `buildPatientNameSlug(fullName)` (`app/src/storage/paths.ts`) — a
  `buildPatientDirName`-ből kiemelt névrész (split + sanitizálás +
  kötőjeles összefűzés); a `buildPatientDirName` és a
  `buildDownloadFileName` közös alapja, hogy a letöltött fájl neve
  vizuálisan párosítható legyen a páciensmappa nevével
- `buildDownloadFileName(nev, opts)` (ugyanitt) — primitív
  paraméterekkel (nincs `Plan` a `paths.ts`-ben): az `isDraft` eldöntése
  (mi számít piszkozatnak — a nyers `plan.statusz !== 'VEGLEGES'`) a hívó
  (`PreviewPage.tsx`, `OsszesTervSection.tsx`) dolga

A véglegesítés-őr egységes csekklista-modellje (`docs/01-attekintes-es-
dontesek.md` D76/D77/D78, `docs/03-funkcionalis-spec.md` § 4. Előnézet és
véglegesítés) segédfüggvényei, szintén ne írd újra őket:
- `veglegesitesDiagnozis(plan, priceList, leirasokMutatasa, master,
  aktivOrvosNevek, sablon)` / `vanKemenyBlokk(csekklista)`
  (`app/src/domain/veglegesitesOr.ts`) — egységes, navigálható
  `VeglegesitesCsekklista { tetelek: CsekklistaTetel[] }` (D76); minden
  tétel `sulyossag: 'hard' | 'soft' | 'info'`, stabil `id`, opcionális
  `reszletek`/`szamlalo`/`route`. A korábbi, egymástól eltérő alakú
  mezőkből (boolean flag-ek, `string[]` listák, egy `alkalmazhato` map
  által vezérelt szekvenciális `VEGLEGESITES_LEPESEK` lánc) EBBE az
  egységes alakba olvasztva — nincs többé szekvenciális "Folytatás"
  modal-lánc, a `PreviewPage.tsx` a teljes listát MINDIG, a
  gombnyomás ELŐTT is megjeleníti, a "Véglegesítés és mentés" gomb
  `vanKemenyBlokk()` esetén letiltott. A meglévő `kitoltetlenSorok`/
  `nullaOsszeguSorok`/`hianyzoCsomagLeirasok`/`arElteroSorok`/
  `masterSnapshotDiff`/`orvosProblema`/`nyelviMismatchek` hívása
  VÁLTOZATLAN — ez a tétel csak a BEFOGADÓ formátumot adta. A `sablon`
  paraméter (`{ sablonFallback, nyilatkozatPlaceholder }`) a hívó MÁR
  feloldott sablon-betöltési ténye, a modul sosem tölt be sablont maga —
  a `leirasokMutatasa`/`master`/`aktivOrvosNevek` mintáján. A
  technikai/infrastrukturális hibák (`templateError`/`pdfError`/
  `saveError`) TOVÁBBRA IS a `PreviewPage.tsx` önálló, tranziens
  `Callout`-jai, NEM checklist-tételek — nem a dokumentum tartalmáról,
  hanem az alkalmazás working-state-jéről szólnak
- `domain/nemetNev.ts` `nemetNeveIgazolt(sor, tetel)` /
  `igazolatlanNemetNevek(plan, priceList)` /
  `igazolatlanNemetKategoriak(plan, priceList)` — D77: SZÁNDÉKOSAN ÚJ,
  külön modul, ami a `nev.ts` `sorFallback()`-ot (árlistai fordítás
  megléte, D21) és a `nyelviReview.ts` `nyelviMismatch()`-et (a doki
  SAJÁT szövegének nyelve, D72) KOMPONÁLJA, egyiket sem módosítja — a
  soron VAGY az árlistai német nevet kell követnie (`nevKoveti`), VAGY a
  `Sor.nevNyelv` review-metaadatnak igazoltan a `de` nyelvre kell szólnia;
  ha egyik sem teljesül, a véglegesítés-őr `'nemet-nev'` HARD tételt ad
  (a korábbi PUHA „de-fallback-names" lépés helyett). Az
  `igazolatlanNemetKategoriak()` a MEGLÉVŐ `buildToothVisualStates()`
  `jelmagyarazat`-jából dolgozik — csak a fogtérképen TÉNYLEGESEN
  megjelenő, `nev.de` nélküli kategóriákat adja (`'nemet-kategoria-nev'`
  HARD tétel), a tervben nem használt kategória hiánya nem blokkol
- `uresFazisok(plan)` (`app/src/domain/kitoltetlen.ts`) — D78: a
  `kitoltetlenSorok()`/`nullaOsszeguSorok()` mintáján, a 0 soros
  fázisokat sorolja fel; a véglegesítés-őr `'ures-fazis'` HARD
  tételeként jelenik meg
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx` — D79: a fenti
  `VeglegesitesCsekklista` read-only renderelése (súlyosság→szín,
  route→gombfelirat leképezéssel), kiemelve a `PreviewPage.tsx`-ből az
  egyoszlopos elrendezés (checklist a PDF fölött, `docs/03-
  funkcionalis-spec.md` § 4. „Elrendezés") felső blokkjaként. A
  `nyelvi-review` tétel guided-review gombja (`NyelviReviewContext`) egy
  opcionális `nyelviReviewAction` propon jön be — a komponens maga nem
  ismeri a Contextet

A Terv részletei fázis-megjelenítés (`docs/03-funkcionalis-spec.md` § 11.
Terv részletei (véglegesített verzió) "Fázisok és kezelési sorok")
segédfüggvénye, szintén ne írd újra:
- `sorElemId(fazisIndex, sorIndex)` (`app/src/pages/tervReszletei/
  SorReszlet.tsx`) — egy kezelési sor read-only nézetének stabil, egyedi
  DOM id-je, a szerkesztő `fog-<pi>-<li>` mintájának (`PlanEditorPage.tsx`)
  külön névterű megfelelője, hogy a két lap id-i sose ütközzenek; más
  felület (pl. egy fogtérkép-kattintás) erre tud scroll-navigálni

A Terv részletei beágyazott mentett PDF-viewere (`docs/03-funkcionalis-
spec.md` § 11. Terv részletei (véglegesített verzió) "Mentett PDF")
segédfüggvénye, szintén ne írd újra:
- `usePlanPdfObjectUrl(ref)` (`app/src/storage/usePlanPdfObjectUrl.ts`) —
  a "mentett bájtok → Blob → object URL, cleanupban revoke" effekt
  megosztott otthona; a dep-lista a ref HÁROM mezőjére megy, nem az
  objektum-identitására, hogy a hívónak ne kelljen `useMemo`-znia egy
  inline `{...}`-ot. `null` ref esetén azonnal üres állapotot ad,
  storage-hívás nélkül; a hiányzó mentett PDF (`loadPlanPdf()` `null`
  visszatérése) KÜLÖN, nem hiba állapot. Két hívója van: a Terv részletei
  lap beágyazott viewere és a Filerendszer nézet `FileContentPanel.tsx`-e
  — ne hozz létre harmadik, egyedi blob-URL-effektet PDF-bájtokhoz.

A nyomtatvány dokumentum-szintű lábléc-magassága (`docs/04-nyomtatvany-
spec.md` § "Lábléc — minden oldalon") segédfüggvényei, szintén ne írd
újra őket:
- `footerNevSorok(nev, tervId)` / `footerExtraMagassag(nev, tervId)`
  (`app/src/pdf/footerLayout.ts`) — a lábléc jobb blokkjának
  (páciensnév + tervId) karakterszám-alapú sorbecslése, illetve az
  ebből adódó extra `paddingBottom`; a `pdf/TervDocument.tsx` a
  dokumentum ELEJÉN, egyszer hívja, és ugyanazt az értéket alkalmazza
  mindhárom blokk `<Page>` stílusán — a `@react-pdf/renderer` nem ad
  szövegmérést, ezért ez heurisztika, böngészős vizuális ellenőrzést
  igényel szélsőségesen hosszú névvel

A D31 (`docs/01-attekintes-es-dontesek.md`) segédfüggvénye:
- `savosHatarForditott(ar)` (`app/src/domain/money.ts`) — igaz, ha egy
  SAVOS ár `min`-je nagyobb, mint a `max`-a; puha figyelmeztetés az Árlista
  admin `ItemEditor`-jában (`docs/03-funkcionalis-spec.md` § 6. Árlista
  admin), nem betöltési hiba — a `basePrice()`/`formatPrice()` mellett él,
  ugyanabban a fájlban, ahol a `SAVOS` szemantika a többi helye is van

Az automatikus darabszám tétel (`docs/02-domain-modell.md` § Fogszám
kezelés, D32) segédfüggvényei, szintén ne írd újra őket:
- `kovetettMennyiseg(fogak)` / `sorPatchKovetessel(sor, patch)`
  (`app/src/domain/mennyiseg.ts`) — az EGYETLEN hely, ahol eldől, hogy egy
  `Sor`-patch leválasztja-e a darabszámot a fogak-követéstől, vagy
  szinkronizálja azt; a `PlanEditorPage.tsx` `patchLine`-ja hívja minden
  `LineRow`-patchre, a hívónak nem kell ismernie a szabályokat. A
  `Sor.mennyisegKezi` hiányzó mezője (egy, a funkció bevezetése előtti sor)
  kézinek számít, nem követőnek — a `nevKoveti()`-nél alkalmazott D24
  mintáján

A páciens-szintű törzsadat tétel (`docs/02-domain-modell.md` § Páciens-
szintű törzsadat, D33) segédfüggvényei, szintén ne írd újra őket:
- `megjelenitettTorzsadat(adatok, utolsoTerv, patient)`
  (`app/src/domain/paciensAdatok.ts`) — az EGYETLEN hely, ahol eldől, a
  lezárt `paciens-adatok.json` vagy egy élő fallback látszik-e, a
  `megjelenitettTervCim()` (D29) mintáján. `torzsadatTervbol(paciens,
  paciensId)` / `uresTorzsadat(nev, paciensId)` (ugyanitt) a fallback két
  forrása (egy korábbi terv pillanatképe, illetve egy vadonatúj, terv
  nélküli páciens); `paciensIndexNev(adatok, planNev)` (ugyanitt) dönti el
  terv-mentéskor, hogy a `paciens.json` index nev-je a törzsadatból vagy a
  terv `paciens.nev`-jéből jön-e; `paciensTorzsadatbol(adatok)` (ugyanitt)
  emeli ki belőle a `Paciens` részhalmazt terv-előtöltéshez.
- `planUjTorzsadattal(adatok, settings, priceList, oroklott?)`
  (`app/src/domain/planCopy.ts`) — a `planUjPaciensselTervhez` (backlog-17)
  törzsadat-alapú párja. `ujTervForrasPaciensbol(storage, settings,
  priceList, patientDir)` (`app/src/state/planIndulas.ts`) a közös
  forráskiválasztás: törzsadat, ha van, egyébként a legutóbb módosított
  terv-lánc legfrissebb `paciens` pillanatképe — a `PatientPlanChains.tsx`
  páciensszintű "Új terv" gombja (`OsszesTervSection.tsx` és
  `PatientDetailPage.tsx` is ezen keresztül hívja, backlog-30) és a
  NewPlanPage.tsx "Meglévő páciens keresése" előtöltése is ezt hívja, hogy
  a hívási helyek ne térjenek el egymástól.

Az új terv-lánc inicializálása tétel (`docs/01-attekintes-es-dontesek.md`
D52, `docs/02-domain-modell.md` § Nyelv és pénznem, `docs/03-funkcionalis-
spec.md` § 2. Terv adatai „Dokumentum nyelve / Pénznem”) segédfüggvényei, szintén
ne írd újra őket:
- `createBlankPlan(settings, priceList, oroklott?)`
  (`app/src/domain/blankPlan.ts`) opcionális harmadik paramétere
  (`OroklottNyelvPenznem`, csak `nyelv`/`penznem`, SOSEM `orvos`) — ha
  megadva, felülírja a `nyelv`/`penznem` globális alapértékét, a
  `sablonVerzio` ettől függetlenül a MEGLÉVŐ `sablonVerzioFor(nyelv)`-en
  keresztül magától követi. Az `orvos` ezen a paraméteren nem juthat be —
  saját, önálló globális default-forrása van (D67,
  `domain/orvosok.ts` `alapertelmezettOrvosNeve()`, lásd lentebb)
- `verziokFrissessegSzerint(plans, versionsFor)`
  (`app/src/domain/planFolders.ts`) — az összes terv-lánc összes verziója
  csökkenő frissesség szerint (a `rendezettLancok()` determinizmus-
  mintáján); a `latestVersionAcrossPlans()` ennek első elemére
  egyszerűsödött. `ujTervForrasPaciensbol()` ezen bejárva keresi meg EGY
  körben a legfrissebb (a `paciens` pillanatkép forrása) ÉS a legfrissebb
  `VEGLEGES` (a nyelv/pénznem-öröklés forrása) verziót — egy olvashatatlan
  verzió nem szakítja meg a bejárást, csak kimarad

A páciens detail shell tétel (`docs/03-funkcionalis-spec.md` § 10.
Páciens részletei, D35) segédfüggvényei/komponensei, szintén ne írd újra
őket:
- `app/src/components/PatientEditorPanel.tsx` — a törzsadat-szerkesztő
  panel (mezők + Save/Cancel), eredetileg a `PaciensekPage.tsx` helyi
  komponense volt; a 38. tétel (D43) óta a `PatientDetailPage.tsx` "Páciens
  adatai" tabja az EGYETLEN hívási helye — a `PaciensekPage.tsx` lista
  azóta tiszta navigációs lista, nem tartalmaz szerkesztőt. Nincs alján
  "Korábbi tervek" tükör-link a tabsorra — a hívó tabsora már kínálja
  ugyanezt a váltást (D44).
- `app/src/components/PatientPlanChains.tsx` — EGY páciens terv-lánc →
  verzió fája a hozzá tartozó akciókkal (Új verzió/Másolás új tervbe/
  Megnézés/Letöltés/Új terv/címke-szerkesztés), eredetileg az
  `OsszesTervSection.tsx` soronkénti JSX-e volt; páciens-paraméteresre
  alakítva az `OsszesTervSection.tsx` lista (patiensenként egy példány) ÉS a
  `PatientDetailPage.tsx` "Kezelési tervek" tabja (egy példány) is
  használja. Az interakciós state (címke-szerkesztés, megerősítő
  dialógus, akció-hiba, összecsukás) a komponensben él, példányonként
  függetlenül — a `plans`/`versionsByPlan`/`plansByVersion`/
  `totalsByVersion` a hívó tölti be és adja át, az `onLabelSaved`
  callbacken át kell a hívó saját állapotát frissítenie sikeres
  címke-mentés után. A fejléce hívónként eltér (kötelező `header` prop,
  D44): `'standalone'` (Korábbi tervek lista) páciensnév + „Páciens
  adatai" kereszt-link + „Új terv"; `'embedded'` (részletoldal) CSAK az
  „Új terv" és a ⚠ jelzés — ott a sticky fejléc és a tabsor már kimondja
  a másik kettőt. Az `onNavigateToPatientData` emiatt opcionális,
  kizárólag `'standalone'`-ban hívódik.
- `loadPlanChainData(storage, patientDir)` (`app/src/domain/planChainData.ts`)
  — EGY páciens terv-lánc/verzió adatainak 3-lépéses
  (`listPlans`→`listVersions`→`loadPlan`) betöltése, amit az
  `OsszesTervSection.tsx` (minden páciensre egyszerre) és a
  `PatientDetailPage.tsx` (egyetlen páciensre) is hív; sosem dob, egy
  sérült lépés `unreadable: true`-t állít a részlegesen betöltött adat
  mellett (P1-2 mintája).

A terv-workflow héj tétel (`docs/03-funkcionalis-spec.md` § Terv-workflow
héj, D36) komponense, szintén ne írd újra:
- `app/src/components/TervWorkflowShell.tsx` — a `/paciens`/`/terv`/
  `/elonezet` közös layout-route-ja (react-router `Outlet`, az app első
  nested route-mintája, `App.tsx`): állandó breadcrumb + szabadon
  kattintható, route-vezérelt 3-lépéses stepper. Az aktuális lépést
  kizárólag a `useLocation().pathname` dönti el, nincs hozzá `Plan`/
  `AppState` mező. A meglévő, laponkénti "Tovább" gombok ettől
  függetlenül, változatlanul megmaradnak.

A piszkozat UI-workflow metaadata (`docs/01-attekintes-es-dontesek.md`
D37, `docs/03-funkcionalis-spec.md` § Autosave) segédfüggvényei, szintén
ne írd újra őket:
- `formatPiszkozatIdo(iso)` (`app/src/domain/date.ts`) — a piszkozat
  "mentve"/"utolsó módosítás" időbélyege (dátum + óra:perc, böngésző-
  időzónában, mindig magyar) — NEM a nyomtatvány `formatLongDate`/
  `formatShortDate`-je (azok naptári dátumot formáznak, UTC-re
  rögzítve); a Kezdőlap és a Terv szerkesztő fejléce is ezt hívja
- `jelezWorkflowLepes(route)` (`state/AppState.tsx`, a `useAppState()`
  API-ja) — az EGYETLEN hely, ahol a piszkozat `lastRoute` metaadata
  íródik; a `TervWorkflowShell.tsx` hívja route-váltáskor. A
  `piszkozatPatientDir`/`piszkozatLastRoute` (ugyanott) a `DraftMeta`
  olvasó oldala — a `loadPlanIntoDraft`/`copyPlanIntoDraft` opcionális
  második (`patientDir`) paramétere tölti fel, ahol a hívó már ismeri

A közös Save/Cancel + dirty-navigation guard tétel
(`docs/01-attekintes-es-dontesek.md` D38, `docs/07-felulet-rendszer.md`
§ Komponensek) segédfüggvényei/komponensei, szintén ne írd újra őket:
- `draftDirty(draft, saved)` / `useDirtyDraft(saved, opts)`
  (`app/src/components/useDirtyDraft.ts`) — a `PatientEditorPanel` korábbi,
  bespoke `JSON.stringify`-alapú mély-egyenlőségéből kiemelt közös
  primitív; `opts.ready` a késve érkező (pl. lustán betöltött fallback)
  `saved`-ből való egyszeri, felülírás nélküli inicializáláshoz
- `useDiscardGuard(dirty)` / `DiscardChangesDialog`
  (`app/src/components/DiscardChangesDialog.tsx`) — a MA ötször
  másolat-beillesztett „elvetnéd a módosításokat?" `AlertDialog` közös
  hook+komponens párja; `request(apply)` dirty állapotban megerősítést kér,
  egyébként azonnal lefuttatja `apply`-t. Hívói: `PatientEditorPanel`
  retrofitja (a 38. tétel/D43 óta az EGYETLEN hívási helyén,
  `PatientDetailPage.tsx`-ben), `PatientDetailPage.tsx` tab-váltása,
  `SettingsPage.tsx` „Nyomtatvány szövegei" Mégse gombja. A
  „piszkozat felülírása" (aktív terv-draft) guardok (`Home.tsx`,
  `NewPlanPage.tsx`, `PatientPlanChains.tsx`) MÁS domaint védenek (D37) —
  ezekre SZÁNDÉKOSAN nincsenek ráállítva

A Kezdőlap „Legutóbbi páciensek" tétel (`docs/01-attekintes-es-dontesek.md`
D39, `docs/03-funkcionalis-spec.md` § 1. Indítás) segédfüggvényei, szintén
ne írd újra őket:
- `ujAktivitas(tipus, most?)` / `ervenyesAktivitas(value)` /
  `legutobbAktivPaciensek(patients, limit)` / `aktivitasSzoveg(aktivitas,
  most)` (`app/src/domain/paciensAktivitas.ts`) — az EGYETLEN hely, ahol a
  `paciens.json` `utolsoAktivitas` mezője íródik, tolerálva olvasódik
  (D29: sosem dob), rendeződik/limitálódik (tiszta függvény, nincs I/O —
  a hívó adja a MÁR betöltött `PatientFolder[]`-t) és szövegesedik. A
  Kezdőlap ÉS az „Új terv indítása" köztes páciensválasztó
  (`NewPlanPage.tsx`, D40) is ezt hívja, hogy a két recent-lista ne
  térjen el egymástól
- `formatRelativIdo(iso, most)` (`app/src/domain/date.ts`) — a
  „2 órája"/„tegnap"/„3 napja" jelzés; szándékosan NEM
  `Intl.RelativeTimeFormat` (a `hu`/`auto` "2 órával ezelőtt"-et és
  naptári-periódusra hivatkozó "előző hét" alakot ad), a `most` kötelező
  paraméter a determinisztikus teszteléshez
- `loadUtolsoTerv(storage, patientDir)` / `loadMegjelenitettTorzsadat(storage,
  patient)` (`app/src/domain/torzsadatBetoltes.ts`) — EGY páciens
  legfrissebb terv-verziójának betöltése (nem `loadPlanChainData`, az
  minden verziót betöltene), illetve a `megjelenitettTorzsadat()` (D33)
  betöltve, sosem dobva (P1-2 mintája). A Kezdőlap recent sorai hívják
  közvetlenül; a `loadTorzsadatok()` (lásd lent, D43) ugyanezt TÖBB
  páciensre futtatja

Az „Új terv indítása" köztes páciensválasztó (`docs/01-attekintes-es-
dontesek.md` D40, `docs/03-funkcionalis-spec.md` § Új terv indítása)
segédfüggvénye, szintén ne írd újra:
- `paciensTalalatok(patients, q)` / `KERESES_MIN_KARAKTER`
  (`app/src/domain/paciensKereses.ts`) — a 2+ karakteres keresés
  relevancia-rendezője (teljes név eleje > szótöredék eleje > belső
  egyezés, azon belül `localeCompare('hu')`); tiszta függvény, egyszer
  normalizál a hívó ciklus előtt (`norm()`, a `nevEgyezik()` konvenciója,
  `domain/search.ts`), nem mutálja a bemenetet. Külön modul a
  `search.ts`-től, mert az a kétnyelvű ártétel-név-egyezés helye, ez
  páciensnév-rangsor — csak a `NewPlanPage.tsx` hívja

A páciens-duplikáció felismerés tétel (`docs/01-attekintes-es-dontesek.md`
D42, `docs/03-funkcionalis-spec.md` § 9. Páciensek / § Új terv indítása)
segédfüggvényei/rétegei, szintén ne írd újra őket:
- `nevJeloltek(patients, nev, opts?)` / `duplikaciosJeloltek(jeloltek,
  bemenet, torzsadatByDir)` / `szuletesiIdoViszony(a, b)` /
  `telefonKulcs(telefon)` / `telefonViszony(a, b)` / `JAVASLAT_LATHATO` /
  `JELOLT_MAX` (`app/src/domain/paciensDuplikacio.ts`) — a kétfázisú
  detektálás tiszta magja: `nevJeloltek` az olcsó, csak `PatientFolder[]`-t
  igénylő 1. fázis (token-alapú név-hasonlóság, szándékosan NEM
  Levenshtein/fuzzy, a magyar `-né` toldalékra explicit kivétellel),
  `duplikaciosJeloltek` a szűk jelölt-körre betöltött DOB/telefonnal
  fésüli össze — ez az EGYETLEN hely, ahol eldől, hogy egy pontos
  névegyezés ellentmondó adat mellett is látszik-e (igen, jelöléssel),
  egy hasonló névegyezés pedig nem (D42)
- `loadTorzsadatok(storage, patients)` (`app/src/domain/torzsadatBetoltes.ts`)
  — a 2. fázis betöltője, a meglévő `loadMegjelenitettTorzsadat()` (D33)
  több páciensre, `dirName` szerint kulcsolva, sosem dobva. A
  `usePaciensDuplikacio` (jelölt-körre, lásd lent) mellett a
  `PaciensekPage.tsx` (D43) is ezt hívja, a teljes listára egyszerre, az
  `OsszesTervSection` végösszeg-betöltésének mintájára
- `usePaciensDuplikacio(opts)` (`app/src/components/usePaciensDuplikacio.ts`)
  — a React-réteg: additív, kulcsolt cache a versenyhelyzetek ellen (nem
  lista-csere/sorszámozás), `ellenoriz(bemenet)` a save-time útvonalhoz. A
  `UjPaciensDialog.tsx` (inline javaslat-lista, `DuplikacioJavaslatok.tsx`
  + két megerősítő `AlertDialog`) ÉS a `PatientEditorPanel.tsx`
  (átnevezéskor, csak `ellenoriz`, javaslat-lista nélkül) is ezt hívja

A Pácienslista navigációs-listává alakítása tétel
(`docs/01-attekintes-es-dontesek.md` D43, `docs/03-funkcionalis-spec.md`
§ 9. Páciensek) segédfüggvényei/komponensei, szintén ne írd újra őket:
- `keresoKulcs(q)` / `torzsadatEgyezik(adat, kulcs)`
  (`app/src/domain/paciensKereses.ts`) — a `paciensTalalatok()` (D40)
  névkereső-modulja mellett: `keresoKulcs` egyszer normalizál (a
  `nevEgyezik()` konvenciója), `torzsadatEgyezik` a névegyezés MELLETT a
  tárolt születési dátum/telefon számjegysorára is illeszkedik (a
  telefonnál a D42 `telefonKulcs()`-előtag-normalizálását is bevonva) —
  csak a `PaciensekPage.tsx` hívja
- `app/src/components/PatientListRow.tsx` — a Kezdőlap "Legutóbbi
  páciensek" kompakt páciens-sora (név + DOB + telefon, KIZÁRÓLAG a
  törzsadat-betöltés hibája kap jelzést; `children` prop a sor alatti
  aktivitás-szöveghez, `aktivitasSzoveg()`). A Pácienslista (D47) SAJÁT,
  oszlopos táblázat-sort használ (`app/src/pages/paciensek/
  PatientTableRow.tsx`) — a két lista elrendezése SZÁNDÉKOSAN eltér,
  ne vond össze őket
- `useListStateMemory(key, ready)` (`app/src/components/useListStateMemory.ts`)
  — egy lista keresőszövegének/scroll-pozíciójának ÉS a sorain belüli
  összecsukható blokkok nyitottságának (46. tétel) megőrzése route-váltás
  után-vissza, KIZÁRÓLAG böngésző-"vissza" (POP) navigációnál; modul-
  szintű `Map`-ben (a kódbázis első modul-szintű mutábilis állapota),
  NEM böngészőtárban — a `PaciensekPage.tsx` (kereső/scroll) és az
  `OsszesTervSection.tsx` (mindhárom mező) hívja

A törzsadat-szerkesztő read-only/edit módváltás tétel
(`docs/01-attekintes-es-dontesek.md` D45, `docs/03-funkcionalis-spec.md`
§ 10. Páciens részletei) segédfüggvényei/komponensei, szintén ne írd újra
őket:
- `emailHiba(email)` / `szuletesiIdoHiba(szuletesiIdo, ma)`
  (`app/src/domain/paciensValidacio.ts`) — blokkoló mezővalidáció (nem a
  `validate.ts` JSON-betöltési `assert*`-mintája, ez hibaszöveget ad
  vissza, nem dob); mindkettő üres bemenetnél `null`-t ad (opcionális
  mező). A `PatientEditorPanel.tsx` Mentés gombja ÉS a quick-create
  `UjPaciensDialog.tsx` Született mezője is ezt hívja, hogy ugyanaz az
  adat ne kapjon két különböző ítéletet a két belépési ponton
- `ReadOnlyField` (`app/src/components/Field.tsx`) — a `Field`/
  `FieldGroup` read-only párja, a `FieldGroup`-ra épülve (nem a
  `Field`-re, lásd a fájl saját kommentjét); üres értéknél az app
  meglévő „—” hiányzó-érték jelölését adja, nem külön szöveget

A nem mentett módosítás védelmének NavBar-navigációra kiterjesztése
(`docs/01-attekintes-es-dontesek.md` D46, `docs/07-felulet-rendszer.md`
§ Komponensek) segédfüggvényei, szintén ne írd újra őket:
- `NavGuardProvider` / `useNavGuard(dirty)` / `useNavGuardState()`
  (`app/src/components/NavGuardContext.tsx`) — egyetlen, app-szintű
  megosztott „van piszkozat” jelző (nem kulcsolt regisztry, mert a
  `HashRouter` egyszerre egy route-ot renderel, tehát egyszerre
  kizárólag egy D38-védett felület lehet mountolva). Egy védett felület
  (`pages/PatientDetailPage.tsx`, `pages/SettingsPage.tsx`) a MÁR
  meglévő dirty state-jét regisztrálja egy plusz `useNavGuard(dirty)`
  hívással; a `components/NavBar.tsx` a MEGLÉVŐ
  `useDiscardGuard`/`DiscardChangesDialog` primitívet (D38) hívja újra
  erre a jelzőre, nem épít második megerősítő-mechanizmust

A páciens törzsadata ↔ terv-piszkozat összevetés/szinkron tétel
(`docs/01-attekintes-es-dontesek.md` D48, `docs/02-domain-modell.md` §
Páciens-szintű törzsadat, `docs/03-funkcionalis-spec.md` § 2. Páciens
adatlap "Páciens törzsadata") segédfüggvényei/komponensei, szintén ne írd
újra őket:
- `masterSnapshotDiff(master, snapshot)` / `mezoErtekSzoveg(p, kulcs)` /
  `alkalmazMezoket(cel, forras, kulcsok)` / `diffAzonosito(elteresek,
  master, snapshot)` (`app/src/domain/masterSnapshotDiff.ts`) — a
  mezőszintű összevetés tiszta magja, a `Paciens` 8 mezőjére. A master
  `Paciens`-alakra hozásához a MEGLÉVŐ `paciensTorzsadatbol()`
  (`domain/paciensAdatok.ts`, D33) hívandó. `valodiUtkozesek(elteresek,
  master, snapshot)` (ugyanitt) a `elteresek` azon részhalmaza, ahol
  MINDKÉT oldalon van érték, és azok különböznek — a lépés-elhagyási prompt
  EZT nézi, nem a teljes `elteresek`-et, hogy egy üres mező puszta pótlása
  (a leggyakoribb eset: quick-create után a törzsadat még csak a nevet
  tartalmazza) ne szakítsa félbe a workflow-t minden alkalommal
- `feloldPatientDir(storage, piszkozatPatientDir, paciensId)`
  (`app/src/domain/torzsadatBetoltes.ts`) — a draft-hoz tartozó
  páciensmappa nevének feloldása, `piszkozatPatientDir` (D37, lehet
  `null`) elsőbbséggel, `plan.paciensId` → `listPatients()` tartalékkal;
  sosem dob. Hívói: `pages/patientPage/TorzsadatSyncCard.tsx`,
  `pages/PreviewPage.tsx`, a `feloldTervCimke()` (backlog-51, lásd lent) és
  — a páciens-törlés (D50) aktív-draft ellenőrzéséhez —
  `pages/PatientDetailPage.tsx`
- `components/TorzsadatDiffDialog.tsx` — a mezőszintű, checkbox-listás
  összevető/szinkron dialógus mindhárom módhoz (master→draft kézi,
  draft→master kézi, draft→master lépés-elhagyási ajánlat, `onSkip` prop
  különbözteti meg) — ne írj mellé külön dialógust egyik irányhoz sem
- `components/LepesGuardContext.tsx` `useLepesGuard()` /
  `useLepesElhagyas(handler)` — a "Terv adatai" lépés ELŐRE elhagyásának
  ajánlat-jellegű elfogása, a `TervWorkflowShell.tsx`-ben élő state fölött;
  KÜLÖN mechanizmus a D46 `NavGuardContext`-től (más a szemantika, lásd a
  fájl fejlécét), nem építendő rá és nem keverendő össze vele
- `pages/patientPage/TorzsadatSyncCard.tsx` — a "Páciens törzsadata"
  eltérés-jelzés, a Terv adatai lap "Páciens adatai" szekciójába ágyazva
  (backlog-51 óta kártyakeret NÉLKÜL, `Separator` + halvány alcím — lásd
  lent) — tartja a master-betöltést, mindkét kézi dialógust ÉS a
  lépés-elhagyási handler regisztrációját is; a `PatientPage.tsx` emiatt
  gyakorlatilag érintetlen maradt
- `veglegesitesDiagnozis(plan, priceList, leirasokMutatasa, master, …)`
  (`domain/veglegesitesOr.ts`) negyedik paramétere — a `masterSnapshotDiff()`
  eredménye a `'torzsadat-elteres'` INFO-szintű, NEM blokkoló checklist-
  tételként jelenik meg (D76); a véglegesítés önmagában nem kényszerít
  szinkronizálást (D9/D33)

A páciens törlése tétel (`docs/01-attekintes-es-dontesek.md` D50,
`docs/02-domain-modell.md` § Páciens- és terv-mappa,
`docs/03-funkcionalis-spec.md` § 10. Páciens részletei) segédfüggvénye,
szintén ne írd újra:
- `paciensTorlesAkadaly(chainData, sajatAktivPiszkozat)`
  (`app/src/domain/paciensTorles.ts`) — az EGYETLEN hely, ahol eldől, hogy
  egy páciens törölhető-e: `null`, ha igen, egyébként a blokkoló ok
  (`'veglegesitett-terv'` / `'aktiv-piszkozat'` / `'nem-olvashato'`,
  ebben a precedencia-sorrendben). Tiszta függvény — a hívó
  (`pages/PatientDetailPage.tsx`) adja a MÁR betöltött
  `domain/planChainData.ts` `PlanChainData`-t és a saját aktív draftjának
  hovatartozását (a MEGLÉVŐ `feloldPatientDir()`-rel, D48, eldöntve, nem
  új heurisztikával). A tényleges törlés a `PlanStorage.deletePatient(
  patientDir)` — az interfész első destruktív metódusa, feltétel nélkül
  végrehajt; az előfeltétel-ellenőrzés a hívó felelőssége

A terv-lánc fa lánc-szintű összecsukása és aktív-draft blokkja
(`docs/01-attekintes-es-dontesek.md` D51, `docs/03-funkcionalis-spec.md`
§ 5. Terv-láncok és verziók) segédfüggvényei/komponense, szintén ne írd
újra őket:
- `legfrissebbVerzio(versions)` (`app/src/domain/planFolders.ts`) — EGY
  terv-lánc legfrissebb verziója (max `isoDate`, holtversenynél nagyobb
  `verzio`) — a `latestVersionAcrossPlans()` egy láncra szűkített
  komparátora; a lánc-fejléc EZT a verziót mutatja, nem a `versions`
  tömb utolsó elemét (a tömb sorrendje nem szerződés)
- `legfrissebbVeglegesVerzio(planDir, versions, plansByVersion)` /
  `rendezettLancok(plans, versionsByPlan, plansByVersion)`
  (`app/src/domain/planChainData.ts`) — a lánc-rendezés (a legfrissebb
  VÉGLEGESÍTETT verzió dátuma szerint csökkenően, D51) tiszta magja, a
  MÁR betöltött `plansByVersion`-ből (nincs új storage-hívás). Kulcs
  nélküli (nincs VEGLEGES verziójú) lánc a lista végére kerül —
  előkészítve a backlog egy még nyitott, PISZKOZAT-státuszú mentett
  verziót bevezető tételére, de ma minden mentett verzió VEGLEGES (a
  `storage.savePlan()` egyetlen hívója a `PreviewPage.tsx`
  véglegesítés-ága)
- `useAktivDraft()` / `sajatDraft(draft, patientDir)`
  (`app/src/components/useAktivDraft.ts`) — az EGYETLEN globális,
  mentetlen piszkozat (D21) feloldott páciensmappája, a D50
  `paciensTorlesAkadaly` mögötti feloldó-effekt kiemelve; a
  `feloldPatientDir()`-t (D48) hívja. `useAktivDraft()` laponként
  EGYSZER hívandó (nem páciensenként), a `sajatDraft()` tiszta szűrő
  szűkíti egy konkrét páciensre — az `OsszesTervSection.tsx` (egyszer a lap
  tetején) ÉS a `PatientDetailPage.tsx` (a D50 törlés-őrhöz) is ezt
  hívja, hogy a két hely ne térjen el egymástól
- `piszkozatCelRoute(lastRoute, plan)` (`app/src/domain/piszkozat.ts`) —
  hová navigáljon a piszkozat "Megnyitás"/"Folytatás" akciója
  (`piszkozatLastRoute` elsőbbséggel, névkitöltés-heurisztika
  tartalékkal); a Kezdőlap kártyája ÉS a terv-lánc fa aktív-draft blokkja
  is ezt hívja
- `WORKFLOW_LEPESEK` / `workflowLepesFelirat(route)`
  (`app/src/domain/workflowLepesek.ts`) — a 3 workflow-route (D36) emberi
  felirata; a `TervWorkflowShell.tsx` stepperje ÉS az aktív-draft blokk
  workflow-lépés-sora is ezt hívja
- `useListStateMemory(key, ready)` bővítése (`app/src/components/
  useListStateMemory.ts`) — lásd fent a D43 bekezdésben; a `nyitottak`/
  `setNyitott` mezőpár a lánc-nyitottság POP-only memóriája, a hívó
  dönti el az `id` jelentését (az `OsszesTervSection.tsx`-en
  `${patientDir}/${planDir}`)

A kezelési fázisok kezelése tétel (`docs/01-attekintes-es-dontesek.md`
D60, `docs/03-funkcionalis-spec.md` § Fázisok) segédfüggvénye, szintén ne
írd újra:
- `generaltFazisNev(pos)` / `fazisNevGeneralt(nev, pos)`
  (`app/src/domain/blankPlan.ts`) — az EGYETLEN hely, ahol a generált
  fázisnév-minta (`"N. kezelés"`) él; a „Fázis hozzáadása" gomb és a
  fázis-sorrendezés (`PlanEditorPage.tsx` `movePhase()`, a mozgatott
  fázis generált nevének pozíció szerinti frissítéséhez, kézzel átírt
  nevet érintetlenül hagyva) egyaránt ezt hívja. `ELSO_FAZIS_NEV`
  (ugyanott) `generaltFazisNev(1)`-ként van definiálva, hogy a két
  string-literál ne driftelhessen szét

A "Terv adatai" oldal hat szekciója + terv címe + dátumok tétel
(`docs/01-attekintes-es-dontesek.md` D61/D62, `docs/03-funkcionalis-spec.md`
§ 2. Terv adatai) segédfüggvényei/komponensei, szintén ne írd újra őket:
- `components/Section.tsx` — a szekciócímes kártya-blokk (`Card` +
  félkövér, `t.brand` színű cím) közös primitívje, korábban öt helyen
  másolat-beillesztve (`docs/07-felulet-rendszer.md` § Komponensek); a
  Terv adatai lap mind a hat szekciója és a Beállítások három tabja is
  ezt hívja
- `feloldTervCimke(storage, piszkozatPatientDir, paciensId, tervId)`
  (`app/src/domain/torzsadatBetoltes.ts`) — a MEGLÉVŐ `feloldPatientDir()`
  (D48) MELLÉ, arra épülve: a lánc mappaneve + a tárolt (vagy `null`, ha
  nincs) `terv-cimke.json`-tartalom feloldása egy `tervId`-ből. Üres
  `tervId`-nél (vadonatúj lánc) `null`-t ad STORAGE-HÍVÁS NÉLKÜL; sosem dob
  (P1-2 mintája)
- `piszkozatTervCim` / `jelezTervCim(tervCim)` (`state/AppState.tsx`,
  `useAppState()` API-ja) — a `jelezWorkflowLepes` mintája szerint: az
  EGYETLEN hely, ahol a `piszkozatMeta.tervCim` (`DraftMeta`, D37) íródik.
  Szándékosan nem trimmel és nem törli a kulcsot üres bemenetre — az
  "üres = vissza az élő javaslatra" szemantika az ÍRÁSI oldalon
  (`PlanStorage.savePlanLabel`) él
- `pages/patientPage/TervCimField.tsx` — a Terv címe mező: már mentett
  lánchoz a `feloldTervCimke()` eredményéből seedel, és `storage.
  savePlanLabel`-lel azonnal ír, ha a beírt érték eltér a tárolttól
  (Mentés gomb/Enter); vadonatúj lánchoz csak a `jelezTervCim()`-et hívja,
  az írás a `PreviewPage.tsx` `doFinalize()`-jában történik. A
  megjelenített érték `piszkozatTervCim ?? mentettLabel ?? ''` OLVASÁSI
  lánc, nem egy induló seed-írás — ez zárja ki a doki épp begépelt
  (navigációt túlélt) értéke és a storage-ból frissen betöltött címke
  közti versenyt

Az előleg százalékról abszolút összegre állítása (`docs/01-attekintes-es-
dontesek.md` D66, `docs/02-domain-modell.md` § Előleg, `docs/03-
funkcionalis-spec.md` § 2. Terv adatai „Előleg”) segédfüggvényei, szintén
ne írd újra őket:
- `elolegOsszegek(fizetendo, eloleg)` / `elolegTullepi(fizetendo, eloleg)`
  (`app/src/domain/totals.ts`) — az EGYETLEN hely, ahol az előleg és a
  fennmaradó rész összege, illetve a `előleg > fizetendő` túllépés-határ
  eldől. `elolegOsszegek` `fennmarado: null`-t ad, ha az előleg meghaladja
  a fizetendőt — a hívó (szerkesztő, PDF) ekkor „—”-t jelenít meg, nem
  negatív számot. A szerkesztő (`PlanEditorPage.tsx` `ElolegBlokk`), a
  véglegesítés-őr (`domain/veglegesitesOr.ts` `elolegTullep` mező) és a
  nyomtatvány (`pdf/TervDocument.tsx`) mind ezeket hívja
- `NumberField` (`app/src/components/NumberField.tsx`) opcionális
  `onBlur?: () => void` propja — KIZÁRÓLAG „a mező most vesztette el a
  fókuszt” jelzéshez (pl. egy kötelező-mező hiba, ami csak blur/Enter után
  jelenhet meg), a `commit()` lefutása UTÁN hívódik; nem helyettesíti az
  `onCommit`-ot

A kezelőorvos-választás és öröklési szabályok tétel
(`docs/01-attekintes-es-dontesek.md` D67/D68, `docs/02-domain-modell.md`
§ `beallitasok.json`, `docs/03-funkcionalis-spec.md` § 2. Kezelőorvos, §
4. Előnézet és véglegesítés) segédfüggvényei, szintén ne írd újra őket:
- `aktivOrvosok(settings)` / `alapertelmezettOrvosNeve(settings)` /
  `ujVerzioOrvosa(forrasOrvos, settings)` / `orvosProblema(orvos,
  aktivOrvosNevek)` (`app/src/domain/orvosok.ts`) — az EGYETLEN hely,
  ahol a `Settings.inaktivOrvosok`/`alapertelmezettOrvos` szemantikája
  eldől. `createBlankPlan()` (új lánc) és `planMasolatKent()` (másolás)
  az `alapertelmezettOrvosNeve()`-t hívja; `state/AppState.tsx`
  `loadPlanIntoDraft()` (új verzió) az `ujVerzioOrvosa()`-t, aminek
  `fallback` mezőjét a `PlanEditorPage.tsx` a MEGLÉVŐ, dátum-frissítést
  jelző semleges `Callout` mellé, nem egy harmadik csatornába rendereli;
  a `domain/veglegesitesOr.ts` `veglegesitesDiagnozis()` az
  `orvosProblema()`-t hívja, a `'orvos'` HARD checklist-tételhez (D68/D76)
- `pages/PatientPage.tsx` „Kezelőorvos" szekció — Radix `Select`, csak az
  aktív orvosok közül, egy árva (inaktivált/törölt) hivatkozás külön,
  elválasztó utáni `Select.Item`-ként jelenik meg, amber figyelmeztetéssel.
  A `Field` címkéje SZÁNDÉKOSAN „Kezelőorvos (aláírás-blokk)", nem puszta
  „Kezelőorvos" — az utóbbi a `Section` címével ütközne (két azonos
  szövegű találat egy accessible-name lekérdezésnél)
- `pages/settings/RendeloTab.tsx` „Orvosok" szekció — soronkénti lista
  (`Table.Root size="1"`, a `PriceListAdminPage.tsx` `KategoriaPanel`
  mintáján), a default orvos deaktiválása/törlése MÁSIK aktív orvos
  mellett `Dialog`-alapú azonnali újraválasztást kényszerít (nem
  `RadioGroup`-pal, hanem a már bevált `Select`-tel); nincs másik aktív
  orvos esetén a művelet a dialógus megnyitása nélkül, azonnal engedett,
  amber figyelmeztetéssel

Az árlista-snapshot és explicit refresh tétel (`docs/01-attekintes-es-
dontesek.md` D70, `docs/02-domain-modell.md` § "Miért van `nevSnapshot`
és `listaEgysegar` a soron", `docs/03-funkcionalis-spec.md` § 3. "Sor
mezői" és § 4. "Előnézet és véglegesítés") segédfüggvényei
(`app/src/domain/arKoveti.ts`), szintén ne írd újra őket:
- `arKoveti(sor, tetel, penznem)` — igaz, ha a sor `listaEgysegar`-ja
  pontosan a tétel MAI árlistai alapára (`basePrice()`), a `nevKoveti()`/
  `leirasKoveti()` (`domain/nev.ts`) mintáján; derived, nincs hozzá
  tárolt flag
- `arFrissites(sor, penznem, tetelById)` — egy sor konkrét ár-frissítési
  javaslata (`{ regi, uj, savos }`) vagy `null`, ha nincs mit frissíteni
  (egyedi sor, törölt tétel, ajánlhatatlan ár, vagy már követő sor) — a
  `sorFallback()` tri-state mintája
- `arFrissitesPatch(frissites)` — a javaslat sor-patchké alakítása; a
  `tenylegesEgysegar`-t is az új értékre írja, a kézi felülírást törölve
- `arElteroSorok(plan, priceList)` — a tervben eltérő sorok neve, két
  bucketbe bontva (`elavult`/`keziAr`) — a véglegesítés-őr `'ar-elteres'`
  puha checklist-tételéhez (D76)
- `frissArlistaval(plan, priceList)` — a "Másolás új tervbe" default-
  following frissítése: a forrásban ár ÉS név ÉS leírás is követő sorokat
  az aktuális árlistára állítja, `plan.arlistaVerzio`-t is átbélyegezve;
  az ár-dimenzióhoz SZÁNDÉKOSAN NEM az `arKoveti()`-t használja (az a MAI
  árlistával hasonlítana, ami driftelt soroknál mindig hamis lenne), a
  kézi árfelülírás jele `tenylegesEgysegar !== listaEgysegar`.
  `domain/planCopy.ts` `planMasolatKent()` opcionális ötödik `priceList`
  paramétere hívja, ha a hívó átadja

A pénznemváltás tétel (`docs/01-attekintes-es-dontesek.md` D71,
`docs/02-domain-modell.md` § Pénznemváltás, `docs/03-funkcionalis-spec.md`
§ 2. Dokumentum nyelve / Pénznem) segédfüggvényei, szintén ne írd újra
őket:
- `sorPenznemValtassal(sor, ujPenznem, tetel)` / `penznemvaltasHatasa(plan,
  priceList, ujPenznem)` / `nincsListaar(sor, tetel, penznem)`
  (`app/src/domain/penznemValtas.ts`) — az EGYETLEN hely, ahol egy sor
  pénznemváltása eldől (stash > árlista > „hiányzó ár" precedencia),
  illetve a `PatientPage.tsx` pénznemváltás-megerősítő dialógusának élő
  számlálása, a `nyelvvaltasHatasa()` (D24) mintáján. `nincsListaar()` az
  EGYETLEN hely, ahol eldől, hogy egy sornak nincs árlistai
  referenciaára az adott pénznemben — a `PlanEditorPage.tsx` Listaár
  cellája és a `domain/kitoltetlen.ts` `araztalanSorok()` is ezt hívja
- `araztalanSorok(plan, priceList)` (`app/src/domain/kitoltetlen.ts`) — a
  `nullaOsszeguSorok()` mintájára, de KEMÉNY blokk: névvel ellátott,
  beárazatlan ÉS kézi árat sem kapott sorok. A `veglegesitesOr.ts`
  `'araztalan-sor'` hard checklist-tételeként (D76) jelenik meg

A manuális szövegek nyelvi review-ja tétel (`docs/01-attekintes-es-dontesek.md`
D72, `docs/02-domain-modell.md` § Nyelvi review a kézzel írt szövegeken,
`docs/03-funkcionalis-spec.md` § 3. Sor mezői és § Fázisok, § 4. Előnézet
és véglegesítés) segédfüggvényei/komponensei, szintén ne írd újra őket:
- `nyelviMismatch(meta, nyelv)` / `reviewIrasUtan(elozo, regi, uj, nyelv)` /
  `reviewElfogadva(meta, nyelv)` / `nyelviMismatchek(plan)`
  (`app/src/domain/nyelviReview.ts`) — SZÁNDÉKOSAN külön modul a
  `nev.ts` `sorFallback`-jától (az ÁRLISTAI fordítás hiányát jelzi, hu
  terven mindig `null`; ez a doki SAJÁT szövegének nyelvét, mindkét
  terv-nyelven). `reviewIrasUtan()` az EGYETLEN hely, ahol egy szöveg-írás
  review-metaadatra gyakorolt hatása eldől — csak vezető/záró whitespace
  nem invalidál, és egy MÁR mismatch-elt mezőn a tartalom bármilyen
  átírása (akár a másik nyelvre fordítva) ÉRINTETLENÜL hagyja a
  metaadatot, kizárólag a `reviewElfogadva()`-t hívó explicit „Nyelv
  ellenőrizve" akció oldja fel (D72). `sorPatchNyelvvel(sor, patch, nyelv)`
  (ugyanitt) a `PlanEditorPage.tsx` `patchLine`-jának a `sorPatchKovetessel()`
  (mennyiség-követés) MELLÉ kötött hívása — ha a hívó patch-e már explicit
  tartalmaz `nevNyelv`/`leirasNyelv` kulcsot (reset, „Nyelv ellenőrizve"),
  az mindig nyer
- a `'nyelvi-review'` checklist-tétel (`app/src/domain/veglegesitesOr.ts`
  `veglegesitesDiagnozis()`, D76) — lásd lentebb
- `components/NyelviReviewContext.tsx` `NyelviReviewProvider`/
  `useNyelviReview()` — a guided review tranziens SESSION-állapota
  (`aktiv`/`cel`/`elozmeny`), a `TervWorkflowShell.tsx`-ben mountolva;
  KÜLÖN mechanizmus a `NavGuardContext`-től (D46) és a
  `LepesGuardContext`-től (D48), nem épül rájuk. `components/
  NyelviReviewBar.tsx` a nem-modális sáv — a „még N ellenőrizendő" szám és
  a következő cél MINDIG a JELENLEGI piszkozatból élőben számol
  (`nyelviMismatchek(plan)`), nem egy a Contextben tárolt, befagyott lista.
  A navigáció a VALÓDI szerkesztőmezőkhöz a MEGLÉVŐ `fokuszCel`
  mechanizmusra épül (`PlanEditorPage.tsx`), nem egy duplikált
  modal-szerkesztőre — a `nev-${pi}-${li}`/`leiras-${pi}-${li}`/
  `fazis-nev-${pi}`/`fazis-megjegyzes-${pi}` DOM `id`-k ehhez a horgonyok

A Terv részletei nézet (`docs/03-funkcionalis-spec.md` § 11. Terv
részletei (véglegesített verzió)) segédfüggvényei/komponensei, szintén ne
írd újra őket:
- `domain/planVersionActions.ts` `kellMegerosites(action,
  vanMentetlenPiszkozat)` / `megerositesTartalom(action,
  vanMentetlenPiszkozat)` / `tervReszleteiUtvonal(patientDir, ref)` — a
  verzió-linkelt akciók (Új verzió/Másolás új tervbe/Új terv) tiszta
  döntési logikája: a piszkozat-felülírás-őr feltétele, a megerősítő
  dialógus szövege és a Terv részletei útvonal encodeURIComponent-es
  felépítése egy helyen. A `components/PatientPlanChains.tsx` verziósora
  ÉS a `pages/TervReszleteiPage.tsx` egyaránt ezt hívja, hogy a szöveg/
  feltétel a két felület között ne térjen el
- `components/PlanVersionActionDialog.tsx` `usePlanVersionActions(patientDir)`
  / `PlanVersionActionDialog` — a fenti tiszta logika React-kontextusra
  (storage/AppState/navigáció) kötött hook+dialógus párosa, a
  `DiscardChangesDialog.tsx` mintáján; a hiba-állapot (`hiba`/`jelezHiba`)
  a hívó SAJÁT akcióit (pl. `downloadVersion`, „Megnyitás külön") is
  fogadja, a megjelenítés helyét (sorhoz kötött vagy lap-szintű) a hívó
  dönti el
- `sorElteres(sor, nincsReferenciaAr?)` (`app/src/domain/sorElteres.ts`,
  lásd `docs/02-domain-modell.md` § „Sor-szintű ár-eltérés osztályozása")
  — a kezelési sor listaár/ajánlati ár eltérésének EGYETLEN osztályozója:
  típus (kedvezmény/felár) + kész felirat. A szerkesztő `LineRow`-ja
  (`pages/PlanEditorPage.tsx`) és a Terv részletei read-only sora
  (`pages/tervReszletei/SorReszlet.tsx`) egyaránt ezt hívja — csak a
  jelvény SZÍNE tér el a két hívó között, a típus/felirat-logika egy
  helyen él. A `pages/tervReszletei/PenzugyiOsszesites.tsx` a plan-szintű
  pénzügyi összesítést a MENTETT `plan.osszesitok`-ból olvassa, sosem a
  `tervVegosszeg()` újraszámolásából — az `osszesitokElter()` itt fut le
  először egy verzió puszta megtekintésekor is, nem csak
  piszkozat-betöltéskor

A PDF-csak terv-cím/fázisnév lokalizáció (`docs/04-nyomtatvany-spec.md` §
„Nyelv") segédfüggvényei, szintén ne írd újra őket:
- `dominansKategoria(plan, priceList)` (`app/src/domain/tervCim.ts`) — a
  legnagyobb ÖSSZEGŰ kategória a tervben (a tie-break szabály D28-mintájú
  precedenciával), a teljes `Kategoria` objektummal; a `javasoltTervCim()`
  ebből emeli ki a `.nev.hu`-t, ne duplikáld a tie-break ciklust máshol
- `pdfTervCim(tervCim, plan, priceList)` / `pdfFazisNev(nev, pos, nyelv)`
  (`app/src/pdf/pdfCimLokalizacio.ts`, csak a `pdf/` alól importálható, a
  `pdf/labels.ts` mintájára) — a soha át nem írt (auto-javasolt) terv-cím,
  illetve a generált fázisnév-minta német PDF-en való feloldása; kézzel
  átírt/átnevezett szöveget változtatás nélkül hagynak. A `javasoltTervCim()`
  és a `generaltFazisNev()`/`fazisNevGeneralt()` MAGUK szándékosan nem
  kapnak `nyelv` paramétert — a szerkesztő UI-ja (Korábbi tervek fa,
  terv-mappa névjavaslat, „+ Fázis hozzáadása" gomb) végig magyar marad

## Domain szókincs

A JSON sémák mezőnevei magyarul vannak, és ezek **a lemezre írt séma kulcsai** — ne
fordítsd le őket kódban: `fazisok`, `sorok`, `tetelek`, `kategoriak`, `nevSnapshot`,
`listaEgysegar`, `tenylegesEgysegar`, `mennyiseg`, `fogak`, `osszesitok`,
`arlistaVerzio`, `sablonVerzio`, `aktiv`, `gyakori`, `paciensId`, `tervCim`, ártípus `FIX`/`SAVOS`, tervstátusz
`PISZKOZAT`/`VEGLEGES`.

## A UX kritikus pontja

A tételfelvitel billentyűzetes ciklusa dönti el, hogy az app gyorsabb-e az Excelnél:
**gépel → `↑`/`↓` navigál → `Enter` hozzáad → a kereső kiürül és visszakapja a
fókuszt → gépel tovább**, egérhasználat nélkül. Ezt kell elsőként tesztelni, a PDF
generálás előtt. A kereső search-only, nincs kategória böngésző (D19); ékezetfüggetlen
(`norm()`); csak `aktiv: true` tételeket listáz — a pénznem NEM szűr a találatokra
(D71), egy a terv pénznemében beárazatlan tétel is `—` listaárral, kézi ajánlati árral
felvehető. Mindkét nyelven keres (`nev.hu` és `nev.de`) függetlenül a terv nyelvétől —
a doki magyar, magyarul gépel akkor is, ha német ajánlatot állít össze (D21).

## Adat és ismert hiányok

`data/arlista.seed.json` = 118 tétel, 13 kategória, az eredeti Excel `Arlista`
lapjából importálva. A tényleges, folyamatosan változó állapot (mi van
lektorálva, mi van bekategorizálva, hány tétel kapott `gyakori` jelölést)
**a `backlog/BACKLOG.md` „24. tétel"-jében él, ne itt** — ez a lista gyorsan
elavulna, mert a doki az adminban éppen ezt takarítja.

A hiányzó/lektorálatlan tartalom **nem blokkolja** a német nyelv
kipróbálását (D21): hiányzó `de` név esetén magyar névre esik vissza `HU`
jelöléssel, hiányzó ár esetén a Terv adatai lap előre jelez. A
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
- Kommentbe soha nem kerül döntési azonosító (`D<szám>`, `DP-<szám>`) és
  backlog-tételszám sem. A komment vagy a lokális WHY-t írja le közvetlenül,
  vagy egy néven megnevezett `docs/0X` szakaszt nevez meg — sosem egy
  azonosítót, amit a döntéstáblában kellene visszakeresni.

Az architekturális/tervezési döntések forrása a `docs/*.md` fájlokban van
(ADR-ek és döntési dokumentumok), NEM a forráskód kommentjeiben. A
`docs/01-attekintes-es-dontesek.md` `D<szám>` döntéstáblája lezárt,
történeti napló — a jelenleg érvényes szabályok prózaként a megfelelő
`docs/02`–`07` élő dokumentumban élnek; egy-egy nyitott funkció tervezési
háttere külön fájlban, `backlog/plans/backlog-<n>-<cim>-terv.md` néven.
Amikor egy modul vagy komponens "miért így van megcsinálva" kérdés merül
fel, először nézd meg a `docs/` és a `backlog/` könyvtárat, mielőtt
találgatnál vagy rákérdeznél.

## Backlog-tétel lezárása

**A `backlog/done/` mappára és a benne lévő fájlokra sehonnan sem szabad
hivatkozni** — sem `docs/*.md`-ből, sem forráskódból, sem ebből a
fájlból. Kivétel: a `backlog/BACKLOG.md` NYITOTT tételeinek `**Terv:**`
sora a még nyitott (a `backlog/plans/` alatt élő) tervfájlra mutathat —
ez lezárásig élő navigáció, és lezáráskor a 4. lépéssel együtt, magával a
tétellel tűnik el, nem marad dangling pointerként.

Egy backlog-tétel megvalósítása után ezt a sorrendet kell követni,
ugyanabban a körben, nem később:

1. **Lezárás, amint a tétel eldöntött hatóköre kész.** Amint a tétel
   eldöntött munkája (jellemzően a kódrész) elkészült, a tétel **teljesen
   lezárul** — a 2–5. lépés szerint, azonnal, ugyanabban a körben. Nem
   marad nyitva „Kódrész — KÉSZ" + „Még nyitva" jelöléssel, akkor sem, ha
   marad hátra kapcsolódó, de különálló munka (pl. tisztán doktori
   adatmunka, kódot nem igénylő feladat). A maradék **új, önálló
   backlog-tételként** kerül be a `backlog/BACKLOG.md`-be, saját új
   sorszámmal, a leírásában egy mondattal hivatkozva arra, melyik lezárt
   tételből vált le — ahogy a 24. tétel is a korábban lezárt tételek
   (8., 13.) visszamaradt doktori adatmunkájából állt össze.
2. **Döntések átvezetése.** A tervdokumentum (`backlog/plans/backlog-N-*-terv.md`)
   döntéseiből, ami tartósan érvényes (nem feladatlista, nem elvetett
   alternatíva, nem teszt-terv), az bekerül a megfelelő `docs/02`–`07`
   szakaszba prózaként, önhordozóan — a szabály és az indoka egy helyen,
   azonosító nélkül. Ha a döntés valóban sérthetetlen (jogi/
   adatintegritási következménnyel jár), új sor a „Sérthetetlen
   szabályok" táblába, ahol a Miért oszlop a tényleges indokot írja le,
   nem egy hivatkozást. **A `docs/01` D-táblája le van zárva: új döntés
   soha nem kap D-számot, és meglévő D-számra sem forráskód, sem
   `CLAUDE.md`, sem `docs/` nem hivatkozhat új helyen.** Ha a tétel új,
   újrahasznosítható segédfüggvényt vezetett be, egy új bekezdés kerül a
   „Meglévő segédfüggvények" alá, a meglévők mintájában (docs-anchorra
   hivatkozva, SOHA a terv-fájlra, SOHA D-számra).
3. **Tervdokumentum archiválása.** `git mv backlog/plans/backlog-N-*.md
   backlog/done/`. A tétel száma (N) ezután véglegesen nyugdíjazva —
   soha nem osztható ki új tételnek, ugyanaz az elv, mint a D17
   ártétel-`id`-nél.
4. **Backlog-bejegyzés törlése + zárt-napló bővítése.** A tétel teljes
   szakasza törlődik a `backlog/BACKLOG.md`-ből (nem jelöljük KÉSZ-nek, nem
   hagyunk stub-ot) — a maradék tételek „N. hely" rangsorát
   újraszámozzuk. Egy tömör összefoglaló (méret, a végleges megoldás 1-2
   mondatban, `docs/0X` hivatkozás a részletekhez) bekerül a
   `backlog/done/BACKLOG_DONE.md` végére — ez a bejegyzés NEM
   hivatkozhat a most archivált terv-fájlra, csak a fő dokumentumokra és a
   git history-ra.
5. **Referencia-seprés.** Minden helyen (forráskód-kommentek, ez a fájl,
   `docs/*.md`), ahol a most archivált terv-fájlra vagy a `backlog/done/`
   mappára mutató hivatkozás volt, át kell írni a megfelelő, néven
   megnevezett `docs/0X` szakaszra — D-számra soha.
6. **CHANGELOG.** Ha a tétel a pácienst/dokit érintő, felhasználó-szemszögű
   változás, a `/update-changelog` továbbra is külön, explicit lépés — ez
   a checklist nem helyettesíti. Ha a tétel megváltoztatta, mit lehet egy
   képernyőn csinálni, a `/update-features` (`FEATURES.md` frissítése)
   ugyanígy külön, explicit lépés. **Mindkét skill kizárólag kézi hívásra
   fut** (`disable-model-invocation`) — a lezárás végén ne próbáld
   automatikusan meghívni egyiket sem, csak írj emlékeztetőt a dokinak,
   hogy futtassa le a `/update-changelog`-ot és/vagy a `/update-features`-t.

## Dokumentáció-térkép

| Fájl | Mikor nyisd meg |
|---|---|
| `docs/01-attekintes-es-dontesek.md` | Miért nem elég az Excelt javítani; adatvédelmi keret; kockázatok. A `D<szám>` döntéstábla **lezárt, történeti napló** — nem bővül, nem hivatkozási cél |
| `docs/02-domain-modell.md` | Mappastruktúra, `arlista.json`/`terv.json`/`beallitasok.json` sémák, fogszám-parsolás szabályai |
| `docs/03-funkcionalis-spec.md` | Képernyők és viselkedés (terv szerkesztő, kezelések és árak, korábbi tervek stb.) |
| `docs/04-nyomtatvany-spec.md` | A generált PDF felépítése, tipográfia, márkaszínek, számformátum |
| `docs/05-technologia.md` | Stack, `PlanStorage` interface, PDF generálás, sémaverziózás, hosztolás |
| `docs/07-felulet-rendszer.md` | Felület- és nyomtatvány-kinézeti szabályok: márkatokenek, komponensek, billentyűzet, akadálymentesség — kötelező, nem javaslat |
| `backlog/BACKLOG.md` | Még fejlesztendő tételek (priorizálva), technikai adósság, és honnan jönnek az igények |
| `backlog/plans/backlog-N-*-terv.md` | Egy nyitott backlog-tétel részletes döntései — a `backlog/BACKLOG.md` tétel `**Terv:**` sora mutat rá; lezáráskor a `backlog/done/`-ba költözik és eltűnik a listából (lásd „Backlog-tétel lezárása") |
