# 4. Nyomtatvány specifikáció

Prototípus: `ui/PrintPreview.jsx`

A4, ~18 mm margó, három oldal. A jelenlegi Excel két dokumentumot présel
egybe („Kezelési terv" és „Egyedi szolgáltatási szerződés"), ezért itt
élesen elválik: **1–2. oldal a terv és az ár, 3. oldal a nyilatkozat és
az aláírás.** A szerkesztőben van egy „csak ajánlat" kapcsoló, ami a 3.
oldalt elhagyja — így a hazavitt példány nem egy aláírandó szerződés.

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
kis méretben olvashatatlan. Csak vékony díszítővonalra és a fogtérkép
kiemelésére. Az elsődleges `#976445` fehéren 4,97:1 — épphogy a WCAG AA
küszöb (4,5) fölött —, színes háttéren (pl. kiemelt sor) újra kell
számolni a kontrasztot.

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

A 2–3. oldal egysoros minifejlécet kap (kis logó + „Kezelési terv ·
<páciensnév>"), hogy ne vesszen el 3 cm minden oldal tetején.

## Lábléc — minden oldalon

```
────────────────────────────────────────────────────────────────────────────────────────
Mándoki Dental Kft. · 1114 Budapest, Móricz Zsigmond körtér 15. 3/8   Kovács János · a3f9c1
Adószám: … · Cégjegyzékszám: …                                  árlista 2026.07.01. · 1 / 3
```

Miért fontos:

- **Oldalszám és tervazonosító minden oldalon.** Egy többoldalas aláírandó
  dokumentumnál e nélkül nem bizonyítható, hogy a 3. oldal ehhez a
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

> \* A csillaggal jelölt tételek ára a kezelés során derül ki
> véglegesen, a megadott ár becslés.

Ez jogi védelem: sávos árat fix számként nyomtatni annyi, mint kötelező
érvényű ajánlatot adni olyasmire, aminek a mennyisége még nem ismert.

### Fogtérkép

32 maradó fog két sorban, kvadránsonként elválasztva, **számozás nélkül**.
Az érintett fogak `#f77409` kitöltést kapnak, a többi meleg-szürkét.
Tejfog csak akkor jelenjen meg, ha a tervben van tejfog-szám.

Ha egyetlen fogszám sincs a tervben, a fogtérkép **kimarad** és az
összegzés teljes szélességet kap.

### Összegzés

```
Kezelések összesen                820 000 Ft
──────────────────────────────────────────── (1.5px, #976445)
Fizetendő                         780 000 Ft
```

**Kedvezmény sor nincs** (D9). A `fizetendo` a tényleges árakból számol.

Alatta: *„Az ajánlat 2026. november 5. napjáig érvényes."* — számított
dátum, nem „3 hónapig érvényes" szöveg. (A korábbi *„…5-ig érvényes."*
megfogalmazás a magyar hosszú dátum záró pontjával kétértelmű/hibás
tipográfiát adott — lásd a „Nyelv" szakaszt lentebb.)

## 2. oldal — fizetési feltételek

A jelenlegi Excelben ez a jogi szövegfal közepén van elrejtve, pedig ez
az, ami a pácienst valóban érdekli. Külön címmel, olvasható tördelésben:

- Fogtechnikai munkát nem tartalmazó kezelésnél az ellenérték
  alkalmanként, azonnal fizetendő.
- Fogtechnikai munkánál a kezelési összeg 50%-a a munka megkezdésekor
  fizetendő; ez a feltétele a technikus felé továbbításnak. A fennmaradó
  rész átadáskor.
- A munka átadásának feltétele a kiegyenlített számla.
- Fizetési mód: készpénz, egészségpénztári kártya, bankkártya.

Ha itt még van hely, a fázisok folytatódhatnak róla — a fizetési
feltételek a tartalom után jönnek.

## 3. oldal — nyilatkozat és aláírás

A jogi szövegfal (`sablonok/nyilatkozat-hu-v1.md`) kisebb betűvel,
1.5-es sorközzel. A tervben tárolt `sablonVerzio` mondja meg, melyik
szövegváltozat volt érvényes.

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
Páciens adatlap"). A sablonok ma placeholder szöveget tartalmaznak.

## Számformátum

| Pénznem | Formátum | Példa |
|---|---|---|
| HUF | egész, ezres szóközzel, utána `Ft` | `1 234 567 Ft` |
| EUR | két tizedes, ezres ponttal, tizedes vesszővel, `€` | `1.234,56 €` |

A formátum a **pénznemtől** függ, nem a nyelvtől (D21) — egy német nyelvű,
forintos terven is `1 234 567 Ft` jelenik meg, nem `1.234.567 Ft`.

Ne `toLocaleString()` improvizációval — fix formázó függvény pénznemenként.
Ez szerződéses dokumentum.
