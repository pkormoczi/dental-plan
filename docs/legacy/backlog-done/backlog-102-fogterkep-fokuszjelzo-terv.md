# Backlog 102. tétel — Fogtérkép billentyűzetes fókuszjelzőjének kontrasztja — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 102. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

A `docs/07-felulet-rendszer.md` „Billentyűzet" szakasza szerint a fogtérkép
kattintható módban EGY Tab-megállóként érhető el, a fogak közti mozgás
nyilakkal, `aria-activedescendant`-tal — és ugyanennek a szakasznak a
következő sora kimondja: „Minden interaktív elemen látható fókusz gyűrű."
A mai megvalósításban ez a jelzés három, egymástól független okból nem
teljesül.

**Szubpixel kurzorgyűrű.** A `design/toothChartSvg.ts` `INTERACTIVE_STYLE`
szabálya a billentyűzetes kurzort `stroke-width:3` + `stroke-dasharray:4 3`
értékkel rajzolja. Ezek viewBox-egységek, a rajz viewBox-a 1576×768 — a
tényleges megjelenítés viszont 480 px széles a két panelben
(`components/ToothChartPanel.tsx`, `pages/tervReszletei/FogterkepPanel.tsx`)
és 340 px a soronkénti választóban (`components/ToothPickerPopover.tsx`).
Ez 0,9 ill. 0,65 CSS pixel teljes vonalvastagság, amiből a `paint-order:stroke`
miatt csak a KÜLSŐ FELE látszik, ráadásul szaggatva. A gyűrű tehát nem
„halvány" — a megjelenített méreteken fizikailag szubpixel. A kijelölés-gyűrű
(`is-picked`, `stroke-width:8`) ugyanezen a skálán is legalább kétszer-
háromszor vastagabb, innen ered a tételben leírt aránytalanság.

**A gyűrű valódi szomszédja nem a kategóriaszín.** Mivel a `paint-order:stroke`
a vonalat a kitöltés ALÁ teszi, a kategóriaszín a belső felét eltakarja — a
látható külső fél szomszédja a közel fehér lapháttér és a fog saját, az
assetben `#111111` színű vonalrajza (`.line-art`), ami mellett a gyűrű
végigfut. Az `ink` (`#2D2D2D`) ehhez a fekete vonalrajzhoz képest kb. 1,15:1
— vagyis a kurzorgyűrű pont ott olvad össze a háttérrel, ahol a legtöbbet
kellene mondania. A kategóriaszínekkel szemben az `ink` egyébként végig
megfelelő (a `design/treatmentVisuals.ts` `KATEGORIA_PALETTA` legsötétebb
tagja, a `#a5673f` ellen is 3:1 fölött van).

**A wrapper nem az app fókuszkezelését kapja.** A `components/DentalChart.tsx`
interaktív ágának `<div tabIndex={0}>`-ja nem definiál fókusz-stílust. A
Radix Themes CSS a csupasz `div`-ek outline-ját nem nullázza (a benne lévő
`outline: none` szabályok mind `.rt-*` osztályokra szűkítettek), tehát a
böngésző alapértelmezett gyűrűje megjelenik — de NEM a `var(--focus-8)`
kezelés, amit a Radix minden saját kontrollja kap, és a megjelenése
platform-/böngészőfüggő. A 2026-08-10-i böngészős menet
(`docs/reviews/2026-08-10-browser-validation.md`) a fókuszgyűrűnél nem talált
szabálysértést, de a mintája a NavBar-linkekre és a Kezdőlap gombjaira
terjedt ki — a fogtérkép egy alapból CSUKOTT panel mögött van, oda a
mintavétel nem ért el.

**A kurzor eltűnik kijelölt fogon.** A `.tooth.is-active .tooth-fill` és a
`.tooth.is-picked .tooth-fill` szabály azonos specificitású, és az `is-picked`
áll később a forrásban — vagyis egy egyszerre aktív és kijelölt fogon a
narancs kijelölés-gyűrű TELJESEN elnyomja a billentyűzet-kurzort. Ez a
`ToothPickerPopover`-ben a leggyakoribb eset: a doki éppen a már felvett
fogakon lépked végig, hogy valamelyiket kikapcsolja, és közben nem látja,
hol áll.

## Döntések

### 1. Hatókör: a kattintható fogtérkép két jelzése — a wrapper fókuszgyűrűje és a fogankénti kurzorgyűrű

A tétel a `design/toothChartSvg.ts` `INTERACTIVE_STYLE` kurzorgyűrűjét ÉS a
`components/DentalChart.tsx` interaktív wrapperének fókuszjelzését együtt
rendezi. A nem-interaktív (read-only, illetve a nyomtatványba rasterizált)
útvonal változatlan marad.

**Miért:** a két hiány ugyanannak a billentyűzetes útnak a két fele — a
wrapper mondja meg, hogy „a fogtérképen vagy", a fogankénti gyűrű azt, hogy
„ezen a fogon állsz". Az egyiket a másik nélkül javítva a `docs/07`
„Minden interaktív elemen látható fókusz gyűrű" szabálya továbbra is
esetleges maradna (böngésző-alapértelmezésre bízva), és egy következő,
ugyanerre a komponensre irányuló munka ugyanezt a néhány sort nyitná meg
újra. Elvetett alternatíva — **csak a kurzorgyűrű**: szó szerint teljesítené
a tétel címét („fókuszjelzőjének kontrasztja"), de a döntési interjú alatt
a wrapper-hiány explicit felszínre került, a nyitva hagyása indoklás nélküli
adósság lenne.

### 2. A kurzorgyűrű vastagsága a képernyőn állandó, nem skálázódik a viewBox-szal

A kurzor- és a kijelölés-gyűrű vonalvastagsága (és a kurzor szaggatás-osztása)
a megjelenített mérettől függetlenül ugyanaz a CSS-pixel érték legyen — a
340 px-es popoverben és a 480 px-es panelekben egyaránt. A konkrét számérték
a böngészős ellenőrzés során véglegesíthető; az elvárás, hogy a kurzor
látható külső fele mindkét méretben legalább ~2 CSS pixel legyen.

**Miért:** ez a tétel tényleges gyökéroka. A mai `stroke-width:3` nem
„rosszul megválasztott érték", hanem rossz mértékegységben megadott érték —
a rajz 1576 egység széles, tehát minden viewBox-egységben megadott vastagság
a megjelenítéskor a harmadára/ötödére zsugorodik, és a két hívási hely
(340 vs 480 px) között is 40%-kal eltér. Amíg ez így marad, bármilyen
szám-hangolás egy adott szélességre optimalizálna, a másikat elrontva.
Elvetett alternatíva: **a `stroke-width` felszorzása viewBox-egységben**
(pl. 3 → 14) — egyszerűbb, de a két hívási hely közti eltérést nem szünteti
meg, és minden jövőbeli, más szélességű beágyazásnál újra kell hangolni.

### 3. Kétrétegű gyűrű: `ink` mag + fehér kontraszt-réteg

A kurzorgyűrű két rétegből áll: a `docs/07` által nevesített `ink` marad a
mag (a kurzor identitása), és köré egy fehér kontraszt-réteg kerül, hogy a
gyűrű a fog fekete vonalrajza mellett is elváljon.

**Miért:** a `paint-order:stroke` miatt a gyűrűnek csak a külső fele látszik,
ennek szomszédja a közel fehér lapháttér és a fog `#111111` vonalrajza. Az
`ink` az előbbi ellen 13,7:1, az utóbbi ellen viszont kb. 1,15:1 — vagyis
egyrétegű sötét gyűrűvel a WCAG 1.4.11 3:1 nem-szöveges küszöb pont a
vonalrajz mentén bukik, és éppen ott, ahol a gyűrű a legtöbbet fut. A fehér
réteg ezt a szomszédságot fedi le, miközben a `docs/07-felulet-rendszer.md`
„Szín, forma, sűrűség" szakaszának nevesített kivétele (`.is-active` = `ink`,
`.is-picked` = `accent`, kizárólag `stroke`-ként) betűre érvényben marad, és
a `.claude/skills/browser-validation/checklist.md` meglévő
`activeStroke === rgb(45,45,45)` elvárása sem sérül. Elvetett alternatíva:
**új, harmadik kurzorszín** (pl. hideg kék) — erősebben elkülönülne a
kijelölés narancsától, de módosítani kellene a `docs/07` nevesített
kivételét és a böngészős checklistet is, egy olyan tétel keretében, aminek
a kérése kontraszt és nem szín-újratervezés; a `docs/07` fejléce ezt
kifejezetten kérdéshez köti („Ha egy szín hiányzik valamihez, kérdezz").

### 4. A kurzorgyűrű csak akkor látszik, amikor a fogtérkép billentyűzet-fókuszban van

Az `is-active` gyűrű megjelenése a wrapper fókuszállapotához kötött —
`:focus-visible` szemantikával, tehát egérkattintás után nem jelenik meg,
az első nyílbillentyűre igen. A wrapper adja le a jelzést, az injektált
SVG-stílus erre illeszkedik; a `focusedTooth`/`aria-activedescendant`
könyvelés VÁLTOZATLAN marad, csak a vizuális megjelenítés lesz feltételes.

**Miért:** a `DentalChart.tsx` a kurzort ma is mindig kirajzolja, alapból a
`FDI_MARADO[0]` (18-as) fogon — egy soha meg nem érintett fogtérképen is.
A 2. és 3. döntés után ez a jelzés nagyságrendekkel hangosabb lesz, és
fókusz nélkül egy tartós, tévesen kijelölésnek olvasható jelölésként ülne a
18-as fogon, versengve a `is-picked` valódi kijelöléssel. A roving-kurzoros
összetett vezérlő bevett mintája egyébként is az, hogy az aktív leszármazott
kiemelése a konténer fókuszához kötött. Elvetett alternatíva: **marad a mai,
mindig látható kurzor** — előnye, hogy a doki Tab előtt is látja, hova esne
az Enter, de ez az információ éppen fókusz nélkül nem használható semmire,
cserébe a felület minden nyitott fogtérkép-panelen kap egy állandó, meg nem
magyarázott jelölést.

### 5. Kijelölt fogon a kurzor és a kijelölés egyszerre látszik, két koncentrikus gyűrűként

Ha egy fog egyszerre `is-active` és `is-picked`, mindkét jelzés megjelenik,
egymást nem takarva — a kijelölés és a kurzor két külön sugáron. A mai,
forrás-sorrend szerinti elnyomás megszűnik: a kombinált eset explicit,
determinisztikus szabályt kap, nem a kaszkád véletlenét.

**Miért:** ez a legsúlyosabb következménye a mai állapotnak, és pont a
leggyakoribb helyzetben csap le. A `ToothPickerPopover` fejléckommentje
kimondja, hogy a kitöltés és a kijelölés-gyűrű „két külön vizuális csatorna
ugyanazon a `DentalChart`-on" — a kurzor ennek a harmadik csatornája, és
egyik sem hallgathatja el a másikat. A doki tipikus mozdulata itt éppen az,
hogy a MÁR felvett fogakon lépked végig, hogy valamelyiket kikapcsolja;
ilyenkor ma vakon nyomja az Entert. Elvetett alternatíva: **a kurzor
felülírja a kijelölést** — egy sorrend-csere a CSS-ben, tehát a legolcsóbb
javítás, de a doki pont a be-/kikapcsolás pillanatában veszítené el azt az
információt, hogy a fog már fel van véve a sorra.

### 6. A wrapper a Radix saját fókusz-kezelését kapja, nem a böngésző alapértelmezését

A `components/DentalChart.tsx` interaktív wrappere explicit `:focus-visible`
fókuszgyűrűt kap, a Radix által minden más kontrollon használt
`var(--focus-8)` alapon, a rajztól elváló `outline-offset`-tel. Ez a gyűrű a
teljes fogtérkép köré kerül — azt jelenti, hogy „a fogtérkép a fókuszban
van", nem azt, hogy melyik fogon állsz (utóbbi a 3–5. döntés dolga).

**Miért:** ma ez a jelzés a böngésző alapértelmezésére van bízva, ami
platform- és böngészőfüggő, és semmilyen kapcsolatban nincs az app többi
kontrolljának fókuszképével; a `docs/07` „Minden interaktív elemen látható
fókusz gyűrű" szabálya így csak véletlenül teljesül. Új tokent ez nem
igényel: a `var(--focus-8)` már ma is az app minden Radix-kontrolljának
fókuszgyűrűjét adja, és a `docs/07` „Márkatokenek" szakasza expliciten tiltja
kiegészítő paletta generálását. Elvetett alternatíva: **a `t.controlBorder`
használata gyűrűszínként** — az a token a docs/07 szerint a KERET szerepe
(„minden interaktív kontroll kerete"), nem a fókuszé; a kettő
összemosása pont azt a szerep-szétválasztást bontaná meg, amit a
`tokens.ts` fejléce külön kiemel („Azonos ertek, mint `uiTextFaint`, de
kulon szerep -- szandekos egyezes, ne vond ossze a ket tokent").

### 7. A vizuális igazolás a böngészős menetben történik, a vitest csak a markupot őrzi

A tétel elfogadási feltétele egy `.claude/skills/browser-validation/` menet
(„Billentyűzet + geometria"), kézzel indítva. A vitest-készlet szerepe
kizárólag a markup-szintű állítások őrzése (mely fog melyik osztályt kapja,
és hogy a nem-interaktív úton egyik osztály sem jelenik meg).

**Miért:** a `docs/07-felulet-rendszer.md` „Ellenőrzés valódi böngészőben"
szakasza kimondja, hogy „a kontraszt, a `controlBorder` és a fókuszgyűrű
szabályok lefedettsége jsdom alatt nulla", és hogy a `paint-order` sincs
jsdom-ban implementálva — vagyis ennek a tételnek MINDEN vizuális állítása
strukturálisan tesztelhetetlen unit szinten. A `checklist.md` már ma is
tartalmaz egy fogtérkép-specifikus `paint-order`-snippetet a mért
`activeStroke`/`pickedStroke` értékekkel; ezt kell kiterjeszteni a fókuszhoz
kötött megjelenésre, a kombinált (aktív + kijelölt) esetre és a wrapper
fókuszgyűrűjére, mindkét megjelenített szélességen (340 és 480 px).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Hover-visszajelzés a fogakon.** Ma az egyetlen hover-jel a
  `cursor:pointer`; ez az egeres úton javítana, a tétel viszont a
  billentyűzetes útról szól. Külön felvetésként kezelendő.
- **A kurzor kezdőpozíciója.** A `DentalChart.tsx` a kurzort alapból a
  `FDI_MARADO[0]` (18-as bölcsességfog) fogra teszi, nem az első kezelt
  fogra — ez navigációs ergonómia, nem láthatóság, és a 4. döntés (csak
  fókusz alatt látszik) után jóval kevésbé zavaró.
- **Az `accent` narancs ütközése a kategória-palettával.** A
  `treatmentVisuals.ts` `KATEGORIA_PALETTA` tartalmazza a `#e8590c`
  (Narancs) és `#ff922b` (Sárgabarack) színt, amik közel állnak az
  `is-picked` `#f77409`-hez — ez a KIJELÖLÉS oldalán fennálló, önálló
  kérdés, és a paletta vagy a kijelölés-gyűrű átgondolását igényelné.
- **Sötét mód.** A `docs/07` szerint opcionális; ha egyszer bevezetik,
  akkor mindenhol, a kontraszttal együtt — nem ennek a tételnek a
  hatóköre.
- **A nyomtatvány fogtérképe.** A PDF-út (`pages/PreviewPage.tsx`
  `buildToothChartSvg(fogterkep, { sizing: 'fixed' })`) `interactive`
  nélkül hívja a buildert, tehát az `INTERACTIVE_STYLE` be sem kerül a
  markupba — a tétel a nyomtatványt nem érinti, és ezt a meglévő
  regressziós teszt is őrzi.
- **A `NumberField` fókuszáláskori tartalom-kijelölése.** Az a
  `backlog/BACKLOG.md` 98. tétele, saját tervdokumentummal — a
  „fókusz" szó egyezésén túl nincs közük egymáshoz.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/design/toothChartSvg.ts` — az `INTERACTIVE_STYLE` konstans: a
  kurzor- és kijelölés-gyűrű vastagsága képernyő-egységre állítva, a
  kétrétegű kurzorgyűrű, a fókuszhoz kötött megjelenés és a kombinált
  (aktív + kijelölt) eset explicit szabálya. A fejléckomment 44–53. sora
  ma expliciten indokolja, miért NEM `:focus-visible` a szabály — ez a
  komment a 4. döntés után ténylegesen hamissá válik, tehát frissítendő
  (a fogcsoportok továbbra sem kapnak DOM-fókuszt, a feltétel a wrapperen
  ül).
- `app/src/components/DentalChart.tsx` — az interaktív ág wrapperének
  explicit fókusz-stílusa, és a fókuszállapot leadása az injektált
  SVG-stílus felé. A `focusedTooth`/`aria-activedescendant` könyvelés
  (63–81. és 150. sor) változatlan.
- `app/src/design/toothChartSvg.test.ts` — az `interactive` describe-blokk
  pontos markup-stringeket vár (`class="tooth is-active"`,
  `class="tooth is-picked" role="option" …`); ha a kombinált eset új
  osztályt vagy más osztálysorrendet kap, ezek az elvárások frissülnek. A
  PDF-regressziós eset (`not.toContain('is-active'/'is-picked')`)
  változatlanul zöld kell maradjon.
- `app/src/components/DentalChart.test.tsx` — a billentyűzet-describe
  (`role="toolbar"`, egy `tabIndex`, `aria-activedescendant` a 18-as fogon,
  nyíl-navigáció, Enter/szóköz, kattintás viszi a kurzort) mind
  változatlanul zöld kell maradjon; a fókuszhoz kötött megjelenés jsdom
  alatt nem ellenőrizhető, tehát nem itt igazolódik.
- `app/src/components/ToothPickerPopover.test.tsx` — a kombinált eset
  (kurzor egy már kijelölt fogon) itt kaphat markup-szintű esetet.
- `.claude/skills/browser-validation/checklist.md` — a „Fogtérkép Tab-stop
  konszolidáció" és a „`paint-order: stroke`" snippetek kiterjesztése a
  fókuszhoz kötött megjelenésre, a kombinált esetre és a wrapper
  fókuszgyűrűjére; a mért vastagságokat mindkét szélességen (340 és
  480 px) rögzíteni kell.
- `docs/07-felulet-rendszer.md` — a „Szín, forma, sűrűség" nevesített
  kivétele (`.is-active` = `ink`, `.is-picked` = `accent`) tartalmilag
  érvényben marad; a kétrétegű gyűrű és a fókuszhoz kötött megjelenés
  átvezetése a `CLAUDE.md` „Backlog-tétel lezárása" 2. lépésének dolga,
  nem az implementációé.

## Tesztelés (irányadó, nem kimerítő)

1. **Wrapper-fókusz.** A tervszerkesztőben az „Érintett fogak" panelt
   kinyitva, Tabbal a fogtérképre lépve látható, a rajztól elváló gyűrű
   jelenik meg a teljes térkép körül; Tabbal továbblépve eltűnik.
2. **Kurzor láthatósága.** Fókuszban, nyílbillentyűre a kurzorgyűrű
   egyértelműen látszik — fehér fogon, sötét kategóriaszínen (pl.
   `#a5673f` Barna, `#5c7cfa` Indigó) és világoson (pl. `#fcc419`
   Borostyán) egyaránt, és a fog fekete vonalrajza mellett is elválik.
3. **Fókuszhoz kötöttség.** Fókusz nélkül (frissen kinyitott panel,
   egyetlen leütés nélkül) NINCS kurzorgyűrű a 18-as fogon; egérrel egy
   fogra kattintva sem jelenik meg, az első nyílbillentyűre igen.
4. **Kombinált eset.** A soronkénti fogválasztóban (340 px-es popover) egy
   már kijelölt fogra lépve a narancs kijelölés-gyűrű ÉS a kurzorgyűrű
   egyszerre látszik, egymást nem takarva.
5. **Mindkét szélesség.** A 2–4. pont a 480 px-es panelekben
   (tervszerkesztő és Terv részletei) és a 340 px-es popoverben egyaránt
   teljesül, észlelhetően azonos vonalvastagsággal.
6. **Regresszió.** A fogtérkép egy Tab-megálló marad (csukott panelnél
   nulla), a nyíl-/Home/End-navigáció, az Enter/szóköz aktiválás, a
   kattintás-viszi-a-kurzort viselkedés és a jelmagyarázat változatlan.
7. **Nyomtatvány.** A generált PDF fogtérképe bájtra változatlan — az
   `interactive` nélküli út nem kap `is-active`/`is-picked` osztályt és
   `INTERACTIVE_STYLE`-t.
8. **Böngészős igazolás.** A `.claude/skills/browser-validation/` menet
   („Billentyűzet + geometria") kézzel lefuttatva, a mért
   vonalvastagságokkal és kontrasztértékekkel; a 2–5. pont ITT dől el, nem
   a vitestben.
9. `cd app && npm test && npm run build && npm run lint`.
