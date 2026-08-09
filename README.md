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
| `docs/07-felulet-rendszer.md` | Felület- és nyomtatvány-kinézeti szabályok — kötelező, nem javaslat |
| `docs/08-backlog.md` | Még fejlesztendő tételek, technikai adósság, honnan jönnek az igények |
| `data/arlista.seed.json` | **Kész seed adat** — 118 tétel, 12 kategória, az eredeti Excelből generálva |
| `assets/mandoki-dental-logo.png` | Márkalogó, átlátszó háttér (navy eredeti — az app egy, a honlap arculatához átszínezett másolatot használ, `app/src/assets/logo.png`) |
| `app/` | A tényleges implementáció — lásd `CLAUDE.md` |

## Az MVP határa

**Benne van:** magyar nyelvű terv készítés, árlista admin, PDF generálás
és mentés a fájlrendszerre, korábbi tervek visszatöltése. A német nyelv
*tartalma* (118 tételnév, EUR ár) 2026-08-06 óta kitöltött — a kapcsoló
kipróbálható (D21), a hiányt az app számszerűen mutatja.

**Nincs benne:** a német tételnevek **orvosi lektorálása** (ma gépi/AI
fordítás), a nyilatkozat és a fizetési feltételek **jogi fordítása**
németre, és az EUR árak **véglegesítése** (ma egyszeri árfolyam-becslés,
lásd `docs/06-arlista-import.md`). Szintén nincs benne: automatikus
darabszám a fogszámokból, statisztikák, többfelhasználós működés,
szerveroldali komponens.

## Nyitott kérdések, amik a dokira várnak

1. A német tételnevek orvosi lektorálása és a nyilatkozat/fizetési
   feltételek szövegének **jogi fordítása** — ez **jogi munka**, nem
   gépi fordítás, mert a páciens aláírja. (A PDF néhány további mondata —
   a sávos ár lábjegyzete, D15 jogi védelme, az anyagköltség- és a
   kiskorú-figyelmeztetés, az érvényességi mondat — szintén jogi
   lektorálást igényel, lásd `docs/04-nyomtatvany-spec.md` „Nyelv"
   szakasza.)
2. A cégadatok a lábléchez: adószám, cégjegyzékszám, és ha van ilyen
   kötelezettség, működési engedély szám.
3. Az árlista takarítása — lásd `docs/06-arlista-import.md`.

A további, még fejlesztendő tételek listája: `docs/08-backlog.md`.
