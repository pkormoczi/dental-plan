# Kezelési terv app — tervdokumentáció

Fogorvosi kezelési terv és árajánlat készítő alkalmazás, ami kiváltja a
Mándoki Dental jelenlegi Excel + form control alapú megoldását.

## 🔗 Élő demó

**[pkormoczi.github.io/dental-plan](https://pkormoczi.github.io/dental-plan/)**

Ez a mockup (1. fázis) — demó adatokkal, a böngészőben tárolva. Ne írj
be valódi páciensadatot. A cél, hogy a doki végigkattintsa és
visszajelezzen, mielőtt a fájlrendszeres verzió elkészül.

A tervezési fázis (ez a dokumentumcsomag) lezárult, az implementáció az
`app/` mappában folyik, két lépésben:

1. **Mockup** — GitHub Pages-re deployolt, kattintható demó, demó adatokkal
   (`localStorage`, nincs valódi páciensadat-mentés). Ez a doki validációjára
   szolgál, mielőtt a fájlrendszeres verzió elkészül.
2. **Végleges alkalmazás** — ugyanaz a kódbázis, a tárolóréteg lecserélve a
   fájlrendszerre író implementációra (lásd `docs/05-technologia.md`).

## Tartalom

| Fájl | Mit tartalmaz |
|---|---|
| `docs/01-attekintes-es-dontesek.md` | Miért készül, mit vált ki, és minden eddigi döntés az indoklásával |
| `docs/02-domain-modell.md` | Adatmodell, JSON sémák, mappastruktúra |
| `docs/03-funkcionalis-spec.md` | Képernyők és viselkedés |
| `docs/04-nyomtatvany-spec.md` | A generált PDF felépítése, tipográfia, márkaszínek |
| `docs/05-technologia.md` | Stack, `PlanStorage` interface, PDF generálás, deployment |
| `docs/06-arlista-import.md` | Az Excel árlista importja, a benne lévő hibák, takarítási feladatok |
| `data/arlista.seed.json` | **Kész seed adat** — 118 tétel, 12 kategória, az eredeti Excelből generálva |
| `ui/tokens.js` | Design tokenek (márkaszínek, tipográfia, spacing) |
| `ui/PlanEditor.jsx` | Kezelési terv szerkesztő — a legfontosabb képernyő |
| `ui/PriceListAdmin.jsx` | Árlista admin, kinyitható sorokkal |
| `ui/PrintPreview.jsx` | A nyomtatvány három oldala |
| `assets/mandoki-dental-logo.png` | Márkalogó, átlátszó háttér |
| `app/` | A tényleges implementáció — lásd `CLAUDE.md` |

## A `ui/*.jsx` fájlok státusza

**Működő prototípusok, nem végleges kód.** Kattinthatók, a state-shape
megegyezik a `docs/02-domain-modell.md` sémáival, de nincs bennük
perzisztencia, PDF generálás és hibakezelés. Az `app/` implementáció
referenciaként veszi át őket — az elrendezés és az interakciók a lényeg,
nem a kódszervezés. Részletek: `CLAUDE.md`.

## Az MVP határa

**Benne van:** magyar nyelvű terv készítés, árlista admin, PDF generálás
és mentés a fájlrendszerre, korábbi tervek visszatöltése.

**Nincs benne:** a német nyelv *tartalma* (118 tételnév, EUR árak, a
nyilatkozat és a fizetési feltételek jogi fordítása) — maga a kapcsoló
kipróbálható (D21), a hiányt az app számszerűen mutatja. Szintén nincs
benne: automatikus darabszám a fogszámokból, statisztikák,
többfelhasználós működés, szerveroldali komponens.

## Nyitott kérdések, amik a dokira várnak

1. A német tételnevek (118 db) és EUR árak.
2. A nyilatkozat/szerződés és a fizetési feltételek szövegének német
   fordítása — ez **jogi munka**, nem gépi fordítás, mert a páciens
   aláírja. (A PDF néhány további mondata — a sávos ár lábjegyzete, D15
   jogi védelme, az anyagköltség- és a kiskorú-figyelmeztetés, az
   érvényességi mondat — szintén jogi lektorálást igényel, lásd
   `docs/04-nyomtatvany-spec.md` „Nyelv" szakasza.)
3. A cégadatok a lábléchez: adószám, cégjegyzékszám, és ha van ilyen
   kötelezettség, működési engedély szám.
4. Az árlista takarítása — lásd `docs/06-arlista-import.md`.
5. A fekvő logó átlátszó hátterű PNG-ben, **600 dpi-n raszterizálva**
   (a Photoshop alapértelmezett 72 dpi-je nyomtatásban homályos lesz).
