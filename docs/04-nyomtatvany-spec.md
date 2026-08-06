# 4. Nyomtatvány specifikáció

Prototípus: `ui/PrintPreview.jsx`

A4, ~18 mm margó, három oldal. A jelenlegi Excel két dokumentumot présel
egybe („Kezelési terv" és „Egyedi szolgáltatási szerződés"), ezért itt
élesen elválik: **1–2. oldal a terv és az ár, 3. oldal a nyilatkozat és
az aláírás.** A szerkesztőben van egy „csak ajánlat" kapcsoló, ami a 3.
oldalt elhagyja — így a hazavitt példány nem egy aláírandó szerződés.

## Márka

| Szerep | Érték |
|---|---|
| Elsődleges (címsorok, vonalak) | `#233C79` |
| Másodlagos (hajszálvonal-akcentus) | `#7EC7EF` |
| Törzsszöveg | `#1A1A1A` |
| Halvány szöveg | `#5A6579` |
| Vonal | `#C9D2E2` |

**A világoskék soha nem lehet szövegszín.** `#7EC7EF` fehéren, 11 px-en
olvashatatlan. Csak vékony díszítővonalra és a fogtérkép kiemelésére.

## Logó

Fekvő lockup, átlátszó hátterű PNG, **600 dpi-n raszterizálva**. 25 mm
fejlécszélességnél ez kb. 590 px. A CorelDRAW PDF megnyitásakor a
Photoshop 72 dpi-t ajánl fel — az nyomtatásban homályos.

A `@react-pdf/renderer` nem tud PDF-et és SVG-t képként beágyazni, csak
PNG-t és JPEG-et. (Ha valaha vektoros logó kell, a `pdf-lib`
`embedPdf()`-je tudja — de egy 1500 px-es PNG nyomatban
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

A `│` egy 2 px-es `#7EC7EF` függőleges vonal — ez az egyetlen díszítő
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
Az érintett fogak `#7EC7EF` kitöltést kapnak, a többi halványszürkét.
Tejfog csak akkor jelenjen meg, ha a tervben van tejfog-szám.

Ha egyetlen fogszám sincs a tervben, a fogtérkép **kimarad** és az
összegzés teljes szélességet kap.

### Összegzés

```
Kezelések összesen                820 000 Ft
──────────────────────────────────────────── (1.5px, #233C79)
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
