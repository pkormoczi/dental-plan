# 4. Nyomtatvány specifikáció

Megvalósítás: `app/src/pages/PreviewPage.tsx`

A4, ~18 mm margó, négy oldal. A jelenlegi Excel két dokumentumot présel
egybe („Kezelési terv" és „Egyedi szolgáltatási szerződés"), ezért itt
élesen elválik: **1–2. oldal a terv és az ár, 3. oldal a garancia, 4.
oldal a nyilatkozat és az aláírás.** A szerkesztőben van egy „csak
ajánlat" kapcsoló, ami a 4. oldalt elhagyja — így a hazavitt példány nem
egy aláírandó szerződés (a garancia oldal ettől függetlenül mindig
megjelenik, lásd „3. oldal — garancia" lent).

## Márka

A márka 2026-08-06 óta a klinika nyilvános honlapját (drmandoki.hu)
követi, nem a logó korábbi (2025-ös, navy/világoskék) színeit — a logó
PNG-jét is ehhez a palettához színeztük át (lásd „Logó" lent).

| Szerep | Érték |
|---|---|
| Elsődleges (címsorok, vonalak) | `#976445` |
| Másodlagos (hajszálvonal-akcentus) | `#f77409` |
| Törzsszöveg | `#1A1A1A` |
| Halvány szöveg | `#5C5651` |
| Vonal | `#D3CBC3` |

**A narancs soha nem lehet szövegszín.** `#f77409` fehéren 2,82:1 —
kis méretben olvashatatlan. Csak vékony díszítővonalra. Az elsődleges
`#976445` fehéren 4,97:1 — épphogy a WCAG AA küszöb (4,5) fölött —,
színes háttéren (pl. kiemelt sor) újra kell számolni a kontrasztot.

A fogtérkép kiemelése **külön, kezelés-kategóriánkénti palettát** használ
(lásd lent) — nem a fenti márkaszíneket. Ez szándékos kivétel a "EGY
akcentus az egész appban" szabály alól (`docs/07-felulet-rendszer.md`),
mert itt a szín információt hordoz (melyik fogat milyen kezelés érinti),
nem díszítés.

## Logó

Fekvő lockup, átlátszó hátterű PNG. A fájl `pHYs` chunkja szerint
**300 dpi**-n van tárolva, 2662×666 px-en — ez jóval a nyomtatáshoz
szükséges felbontás fölött van, egy 96 pt-os fejléc-dobozban éles marad.
(Korábban itt „600 dpi" és „kb. 590 px" szerepelt — ez tévedés volt, a
tényleges fájlt megmérve javítva.)

Az `app/src/assets/logo.png` a 2025-ös lockup **átszínezett** másolata:
pontos RGB-csere `#1a3e79 → #976445` és `#70c2ed → #f77409`, az
alfa-csatorna (élsimítás) érintetlenül — a navy eredeti a repó gyökér
`assets/`-jében marad referenciaként.

A `@react-pdf/renderer` nem tud PDF-et és SVG-t képként beágyazni, csak
PNG-t és JPEG-et. (Ha valaha vektoros logó kell, a `pdf-lib`
`embedPdf()`-je tudja — de egy 2662 px-es PNG nyomatban
megkülönböztethetetlen.)

## Fejléc

A logó fekvő, ezért **oldalra igazított** elrendezés:

```
[logó]  │ 1114 Budapest, Móricz Zsigmond körtér 15. 3/8      Kezelési terv és árajánlat
        │ +36 1 234 5678 · rendelo@mandokidental.hu             a3f9c1 · v1 · 2026.08.05.
────────────────────────────────────────────────────────────────────────────────────────
```

A logó tartalmazza a wordmarkot, ezért a klinika nevét **nem ismételjük**
a fejlécben. A cégnév a lábléc jogi blokkjába kerül.

A `│` egy 2 px-es `#f77409` függőleges vonal — ez az egyetlen díszítő
elem a dokumentumon.

A 2–4. oldal egysoros minifejlécet kap (kis logó + „Kezelési terv ·
<páciensnév>"), hogy ne vesszen el 3 cm minden oldal tetején.

## Lábléc — minden oldalon

```
────────────────────────────────────────────────────────────────────────────────────────
Mándoki Dental Kft. · 1114 Budapest, Móricz Zsigmond körtér 15. 3/8   Kovács János · a3f9c1
Adószám: … · Cégjegyzékszám: …                                  árlista 2026.07.01. · 1 / 4
```

Miért fontos:

- **Oldalszám és tervazonosító minden oldalon.** Egy többoldalas aláírandó
  dokumentumnál e nélkül nem bizonyítható, hogy egy adott oldal ehhez a
  tervhez tartozott.
- A tervazonosító **ugyanaz, mint a mappanév** — papírról vissza lehet
  keresni a JSON-t.
- Az **árlista verziója** megmondja, melyik árlistából készült, ha fél év
  múlva vita van.

## 1. oldal

1. Fejléc
2. Pácienstömb — két oszlop: név / telefon, született / e-mail, lakcím
   teljes szélességben, TAJ
3. Fázisonként: cím, tételtáblázat, fázisösszeg, majd a fázis megjegyzése
   halványan
4. Alul két hasábban: bal oldalon a **fogtérkép**, jobb oldalon az
   összegzés

### Tételtáblázat

| Oszlop | Igazítás | Szélesség |
|---|---|---|
| Beavatkozás | balra | rugalmas |
| Fog | balra | 88 pt |
| Db | középre | 34 pt |
| Egységár | jobbra | 82 pt |
| Összeg | jobbra | 90 pt |

Sávos árú tétel neve után `*`, és a táblázat alatt egyszer:

> \* A csillaggal jelölt tételek ára — és a belőlük számított összegek
> (fizetendő, előleg, fennmaradó rész) — a kezelés során derül ki
> véglegesen, a megadott ár becslés.

Ez jogi védelem: sávos árat fix számként nyomtatni annyi, mint kötelező
érvényű ajánlatot adni olyasmire, aminek a mennyisége még nem ismert.

**Tétel-leírás** (docs/02-domain-modell.md § Tétel-leírás, D27): ha a
`Plan.leirasokMutatasa` igaz és a sornak van `leirasSnapshot`-ja, a leírás
a tételsor alatt jelenik meg, soronként tördelve (a beírt `\n` sortörések
megtartva) — behúzva, szürke színnel, kisebb betűmérettel, hogy
alrészletnek olvasódjon, ne új tételsornak. A tételsor és a leírása egy
`wrap={false}` csoportban renderelődik: a kettő soha nem szakadhat szét
oldaltörésnél, az egész blokk együtt ugrik a következő oldalra, ha nem fér
ki.

### Fogtérkép

Anatómiai rajz mind a 32 maradó fogról (`app/src/assets/dental-chart-fdi-32.svg`,
FDI-számozás, **számozás nélkül** nyomtatva — a fejlesztői/debug
`showToothNumbers` mód kikapcsolva marad éles nyomtatványon). Ugyanez az
SVG a forrása a szerkesztőbeli fogtérképnek is (`components/DentalChart.tsx`)
— a nyomtatvány egy erről canvason renderelt raszterképet ágyaz be
(`pdf/toothChartImage.ts`), nincs két külön rajz.

Az érintett fogak a rájuk felvitt kezelés **kategóriánkénti színét** kapják
(korona, gyökérkezelés, tömés stb. — a tényleges szín az árlista
`Kategoria.szin` mezőjén él, az Árlista admin Kategóriák paneljén
szerkeszthető; a *választható* kurált paletta és az eltévedt hivatkozás
tartalék-színe `app/src/design/treatmentVisuals.ts`-ben, az EGYETLEN
forrásukban), a kezeletlen fogak az eredeti rajz fehérjét. A fogtérkép
alatt egy jelmagyarázat sorolja fel a tervben ténylegesen előforduló
kategóriákat, egy-egy színes ponttal. Ha egy fogon több kezelés is van,
egyetlen (a legkisebb `sorrend`-ű kategóriának megfelelő) szín látszik
rajta — az adott kezelés szövegesen a tételtáblázatban továbbra is
szerepel.

A rajz csak a 32 maradó fogat ábrázolja. Tejfog-szám (51–85) esetén a
fogtérkép alatt egy külön sor sorolja fel szövegesen ("Tejfogak: 55, 65"),
nem a rajzon.

Ha egyetlen fogszám (maradó vagy tejfog) sincs a tervben, a fogtérkép
**kimarad** és az összegzés teljes szélességet kap.

### Összegzés

Az összegzés **feltételesen egy vagy két soros**. Két sor csak akkor
jelenik meg, ha a listaárakból számolt összeg ténylegesen eltér a
tényleges árakból számolttól (`fizetendo`):

```
Kezelések összesen                820 000 Ft
──────────────────────────────────────────── (1.5px, #976445)
Fizetendő                         780 000 Ft
```

Ha a kettő megegyezik — tipikusan amikor a doki nem adott kedvezményt —,
a `Kezelések összesen` sor és az elválasztó is **kimarad**, és csak a
kiemelt `Fizetendő` sor marad, változatlan felirattal:

```
Fizetendő                         820 000 Ft
```

Az eltérés **iránya nem számít**: felár (a tényleges ár a listaár fölött)
ugyanúgy megnyitja mindkét sort, mint a kedvezmény — a `Kezelések
összesen` mindkét esetben ugyanazt az információt hordozza („ebből
indultunk"), külön felirat vagy eltérő megfogalmazás nélkül.

**Kedvezmény sor nincs** (D9) — a kedvezmény *összege* sehol nem jelenik
meg, csak a két végösszeg. A `fizetendo` a tényleges árakból **és** egy
esetleges terv-szintű, kerek végösszeg kedvezményből (`kedvezmenyOsszeg`,
D25) számol — a terv-szintű kedvezmény önmagában, sorszintű eltérés
nélkül is megnyitja ezt a kétsoros összegzést, ugyanúgy, mint egy
sorszintű eltérés (`tervVegosszeg()`, `domain/totals.ts`).

Ha a terven be van kapcsolva az előleg (`elolegOsszeg != null`, D64), a
`Fizetendő` alatt még két sor áll, kisebb súllyal:

```
Fizetendő                         780 000 Ft
Előleg                            390 000 Ft
Fennmaradó rész                   390 000 Ft
```

Az „Előleg” felirat sima, zárójeles összeg-ismétlés nélkül — az érték az
oszlopban amúgy is ott áll. A fennmaradó rész a `Fizetendő`-ből számol,
egész pénznemegységre kerekítve, és a kettő együtt pontosan a
`Fizetendő`-t adja ki — KIVÉVE, ha az előleg meghaladja a `Fizetendő`-t
(sortörlés/módosítás utóhatása); ilyenkor a fennmaradó rész helyén „—” áll.
A szerkesztő ezt az esetet kemény véglegesítési blokkal előzi meg
(`domain/veglegesitesOr.ts`), de a „Csak ajánlat” előnézet a blokk előtt
is renderel, ezért a nyomtatvány maga sem törhet el egy túllépő értéken.
Ha a tervben van becsült árú (csillagos) tétel, **mindkét** sor csillagot
kap — ugyanazt a lábjegyzetet használva, ami a tételekre is vonatkozik
(nincs második csillag-jelentés az oldalon).

Alatta: *„Az ajánlat 2026. november 5. napjáig érvényes."* — számított
dátum, nem „3 hónapig érvényes" szöveg. (A korábbi *„…5-ig érvényes."*
megfogalmazás a magyar hosszú dátum záró pontjával kétértelmű/hibás
tipográfiát adott — lásd a „Nyelv" szakaszt lentebb.)

## 2. oldal — fizetési feltételek

A jelenlegi Excelben ez a jogi szövegfal közepén van elrejtve, pedig ez
az, ami a pácienst valóban érdekli. Külön címmel, olvasható tördelésben:
egy bevezető bekezdés, utána a felsorolás. A szöveg forrása
`sablonok/fizetesi-feltetelek-hu-vN.md` -- szó szerint az eredeti
`data/MINTA_MINTA_Kezelesi_Terv_frissített.xls` `Kezelesi_Terv` lapjáról
átvéve, a Beállítások képernyőn szerkeszthető (lásd lent).

- Fogtechnikai munkát nem tartalmazó kezelésnél az ellenérték
  alkalmanként, azonnal fizetendő.
- Fogtechnikai munkánál a kezelési összeg 50%-a a munka megkezdésekor
  fizetendő; ez a feltétele a technikus felé továbbításnak. A fennmaradó
  rész átadáskor.
- A munka átadásának feltétele a kiegyenlített számla.
- Fizetési mód: készpénz, egészségpénztári kártya, bankkártya.

Ha itt még van hely, a fázisok folytatódhatnak róla — a fizetési
feltételek a tartalom után jönnek.

Ez az oldal a „csak ajánlat" módban is **mindig** nyomtatódik (szemben a
4. oldallal) — ezért kezeli a placeholder-őr a fizetési feltételek (és a
garancia, lásd lent) lezáratlan állapotát eltérően, mint a nyilatkozatét:
itt HU-visszaesés, nem zár (lásd `03-funkcionalis-spec.md` § Sablon-
placeholder őr).

A sablon-markdown egyszerű: üres sorokkal elválasztott bekezdések, és
"- " kezdetű listaelemek (lásd `app/src/pdf/markdownLite.ts`
`parseBlocks`). Bekezdésben és listaelemben is használható a
`{{orvos}}` helyőrző, amit a PDF generáláskor a terv kezelőorvosának
neve vált fel.

## 3. oldal — garancia

A jelenlegi Excelben nincs garancia-tartalom — ez egy új szakasz. A
szöveg forrása `sablonok/garancia-hu-vN.md`, ugyanazzal a mechanizmussal
és markdown-formátummal, mint a fizetési feltételeké, a Beállítások
képernyőn szerkeszthető. **A magyar szöveg ma is placeholder** (a doki
adja meg: kezeléstípusonkénti garanciaidők, kivételek) — ez eltér a
fizetési feltételek/nyilatkozat mai állapotától, azoknak már van valódi
tartalma.

Stílusa a fizetési feltételekével egyezik (normál, nem a nyilatkozat
szorosabb, jogi kinézetű betűje) — a garancia tájékoztató jellegű, nem
maga az aláírás tárgya.

Ez az oldal a „csak ajánlat" módban is **mindig** nyomtatódik, ugyanúgy,
mint a fizetési feltételek — a garancia a hazavitt példányon is
hasznos, a páciens pont ott kérdezne rá legvalószínűbben. A
placeholder-őr ugyanúgy HU-visszaesésként kezeli, nem zárként (lásd
fent és `03-funkcionalis-spec.md` § Sablon-placeholder őr).

## 4. oldal — nyilatkozat és aláírás

A jogi szövegfal (`sablonok/nyilatkozat-hu-vN.md`) kisebb betűvel,
1.5-es sorközzel, bekezdésekre tördelve. A szöveg szó szerint az
eredeti Excel `Kezelesi_Terv` lapjának "Nyilatkozat" blokkjából jön,
záró mondata a `{{orvos}}` helyőrzővel. A tervben tárolt
`sablonVerzio` (véglegesítéskor pinnelt, akkor épp legfrissebb verzió)
mondja meg, melyik szövegváltozat volt érvényes.

Alatta:

```
Budapest, 2026. augusztus 5.

Megbízott:                              Megrendelő:

..............................          ..............................
Dr. Mándoki István
```

**A törvényes képviselő blokkja csak akkor jelenik meg, ha
`paciens.kiskoru === true`.** A jelenlegi Excel minden felnőttnek
kinyomtatja, feleslegesen.

Ha a tervhez tartozó nyilatkozat-sablon még placeholder-jelölésű, ez az
oldal **nem nyomtatható** — a „csak ajánlat" mód ilyenkor kényszerített
és letiltott (D23), lásd `03-funkcionalis-spec.md` § Sablon-placeholder
őr.

## Nyelv (D21)

A nyomtatvány fix feliratai, a dátumformátum és a sablon a **terv
nyelvétől** (`plan.nyelv`) függenek, forrásuk `app/src/pdf/labels.ts`
(`PDF_LABELS: Record<Nyelv, PdfLabels>`). Ez a fájl a német lektorálás
review-artefaktuma — ide kerül minden fix mondat, mielőtt éles
németnyelvű PDF-re kerülne.

| Magyar | Német |
|---|---|
| Kezelési terv és árajánlat | Behandlungsplan und Kostenvoranschlag |
| Kezelési terv · | Behandlungsplan · |
| Beavatkozás / Fog / Db / Egységár / Összeg | Leistung / Zahn / Menge / Einzelpreis / Betrag |
| Fázis összesen | Phase gesamt |
| Név / Telefon / Született / E-mail / TAJ / Lakcím | Name / Telefon / Geburtsdatum / E-Mail / TAJ-Nr. / Adresse |
| Adószám: / Cégjegyzékszám: | Steuernummer: / Handelsregisternummer: |
| Érintett fogak | Betroffene Zähne |
| Kezelések összesen / Fizetendő | Behandlungen gesamt / Zu zahlen |
| Fizetési feltételek / Nyilatkozat | Zahlungsbedingungen / Erklärung |
| Megbízott: / Megrendelő: | Auftragnehmer: / Auftraggeber: |

Három mondat **ragozás miatt függvény**, nem sablon-behelyettesítés
(`ervenyessegMondat`, `alairasSor` a `labels.ts`-ben):

- „Az ajánlat {dátum} napjáig érvényes." → „Das Angebot ist gültig bis
  zum {dátum}."
- „{város}, {dátum}" → „{város}, den {dátum}" — a **város fix marad**
  (`ALAIRAS_VAROS = 'Budapest'`), a rendelő nyelvtől függetlenül ott van.

Dátumformátum nyelvenként (`app/src/domain/date.ts`):

| | Magyar | Német |
|---|---|---|
| Hosszú (érvényesség, aláírás) | `2026. november 5.` | `5. November 2026` |
| Rövid (fejléc/lábléc metaadat) | `2026.08.05.` | `05.08.2026` |

A rövid formátum **kézzel** van összerakva, nem `Intl`-lel — a `de-DE`
Intl-formázó vezető nulla nélküli napot adna (`5.11.2026`), ez viszont a
lábléc jogi metaadata.

**Fontos:** a fenti táblázat gépi/vázlat fordítás, nem lektorált. A
`savosFootnote` (a D15 jogi védelme), az anyagköltség-mondat, a
kiskorú-figyelmeztetés és az érvényességi mondat **jogi lektorálást
igényel**, mielőtt valódi német páciensnek szóló PDF-re kerülnek — lásd
`README.md` „Nyitott kérdések".

A tételnevek (`nev.de`) és a nyilatkozat/fizetési feltételek sablonjai
(`nyilatkozat-de-v1.md`, `fizetesi-feltetelek-de-v1.md`) **külön
hiányzó tartalom** — ha egy tételnek nincs német neve, a nyomtatvány a
magyar nevet használja, jelöléssel (lásd `03-funkcionalis-spec.md` „2.
Terv adatai"). A sablonok 2026-08-10 óta AI-fordítást tartalmaznak,
jogi lektorálás nélkül (lásd `README.md` „Nyitott kérdések" #1) — ez már
nem a korábbi placeholder szöveg, de nem is lektorált végleges szöveg.
A `garancia-de-v1.md` **más eset**: nem AI-fordítás, hanem szándékos
placeholder marad — a magyar forrás maga sem valódi tartalom még, nincs
mit lefordítani (lásd „3. oldal — garancia" fent).

## Számformátum

Az ezres/tizedes **elválasztó** a dokumentum **nyelvétől** függ, a
tizedesjegyek száma és a pénznemjel a **pénznemtől** (D21, D63) — négy
kötelező kombináció:

| Nyelv + pénznem | Formátum | Példa |
|---|---|---|
| HU + HUF | egész, ezres szóközzel, utána `Ft` | `1 234 567 Ft` |
| HU + EUR | két tizedes, ezres szóközzel, tizedes vesszővel, `€` | `1 234,56 €` |
| DE + HUF | egész, ezres ponttal, utána `Ft` | `1.234.567 Ft` |
| DE + EUR | két tizedes, ezres ponttal, tizedes vesszővel, `€` | `1.234,56 €` |

A `hu-HU` Intl ezres-elválasztó-hiánya 4-jegyű összegeknél (`5000 Ft`, nem
`5 000 Ft`) mindkét HU-sorban megmarad — ez a magyar tipográfiai
konvenció, nem hiba (`app/src/domain/money.test.ts`).

Ne `toLocaleString()` improvizációval — fix formázó függvény
(`formatMoney(value, currency, nyelv)`/`formatPrice(ar, currency, nyelv)`,
`app/src/domain/money.ts`). Ez szerződéses dokumentum.
