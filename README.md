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
| `backlog/BACKLOG.md` | Még fejlesztendő tételek, technikai adósság, honnan jönnek az igények |
| `data/arlista.seed.json` | **Kész seed adat** — 118 tétel, 12 kategória, az eredeti Excelből generálva |
| `assets/mandoki-dental-logo.png` | Márkalogó, átlátszó háttér (navy eredeti — az app egy, a honlap arculatához átszínezett másolatot használ, `app/src/assets/logo.png`) |
| `app/` | A tényleges implementáció — lásd `CLAUDE.md` |

## Az MVP határa

**Benne van:** magyar nyelvű terv készítés, árlista admin, PDF generálás
és mentés a fájlrendszerre, korábbi tervek visszatöltése. A német nyelv
*tartalma* (118 tételnév, EUR ár) 2026-08-06 óta kitöltött, a nyilatkozat
és a fizetési feltételek szövege 2026-08-10 óta — a kapcsoló kipróbálható
(D21), a hiányt az app számszerűen mutatja.

**Nincs benne:** a német tételnevek **orvosi lektorálása**, illetve a
nyilatkozat és a fizetési feltételek **jogi lektorálása** — mindhárom ma
gépi/AI fordítás, a nyilatkozat/fizetési feltételek esetén a doki
kifejezett, 2026-08-10-i döntése alapján lektorálás és jelölés nélkül
élesítve (lásd lent, „Nyitott kérdések" #1). Az EUR árak
**véglegesítése** is nyitott (ma egyszeri árfolyam-becslés, lásd
`docs/06-arlista-import.md`). A nyomtatvány új garancia-szakaszának
tényleges szövege sem kész — egyelőre helykitöltő mindkét nyelven, a
doki adja meg (lásd lent, „Nyitott kérdések" #4). Szintén nincs benne:
automatikus darabszám a fogszámokból, statisztikák, többfelhasználós
működés, szerveroldali komponens.

## Nyitott kérdések, amik a dokira várnak

1. A német tételnevek orvosi lektorálása, valamint a nyilatkozat és a
   fizetési feltételek szövegének **jogi lektorálása** — mindhárom ma
   gépi/AI fordítás. A nyilatkozat/fizetési feltételek esetén ez jogi
   munka lenne (a páciens aláírja): a projekt eredeti szabálya szerint
   nem gépi fordítás töltötte volna ki, hanem a doki jogásza a
   Beállítások képernyőn — a doki 2026-08-10-én kifejezetten úgy
   döntött, hogy az AI-fordítás mégis éles szövegként kerüljön be,
   lektorálás és jelölés nélkül (lásd `app/src/storage/seed/templates.ts`).
   A lektorálás tehát továbbra is nyitott, csak már nem blokkolja a
   nyomtatványt. (A PDF néhány további mondata — a sávos ár lábjegyzete,
   D15 jogi védelme, az anyagköltség- és a kiskorú-figyelmeztetés, az
   érvényességi mondat — szintén jogi lektorálást igényel, lásd
   `docs/04-nyomtatvany-spec.md` „Nyelv" szakasza.)
2. A cégadatok a lábléchez: adószám, cégjegyzékszám, és ha van ilyen
   kötelezettség, működési engedély szám.
3. Az árlista takarítása — lásd `docs/06-arlista-import.md`.
4. A nyomtatvány garancia-szakaszának tényleges tartalma —
   kezeléstípusonkénti garanciaidők, kivételek. Egyelőre helykitöltő
   szöveg mindkét nyelven (magyarul és németül is), amíg a doki meg nem
   adja a Beállítások → Nyomtatvány szövegei alatt.

A további, még fejlesztendő tételek listája: `backlog/BACKLOG.md`.
