# Backlog 79. tétel — PDF pénzügyi összesítés — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 79. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-073
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D347`, `D350`–`D351`, `D366`–`D369`, `C6` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

## Probléma

A mai Összesítés blokk (`pdf/TervDocument.tsx` `bottomRow` →
`summaryBlockNarrow`/`Full`) nagyrészt megfelel a redesign szándékának
(stabil két-total-soros szerkezet, feltételes referenciasor, feltételes
Előleg/Fennmaradó blokk), de három konkrét ponton eltér:

1. **Nincs saját cím** a blokknak — a redesign (C6) `Összesítés` címet
   kér.
2. **A feliratok elavultak**: `Fizetendő` a redesign szerint
   `Végösszeg` (D350), `Kezelések összesen` a redesign szerint
   `Kezelések összege` (D351).
3. **Az Előleg és a Fennmaradó rész sor vizuálisan egyforma** —
   ugyanaz a `summaryEloleg` stílus mindkettőn, nincs elválasztóvonal a
   Végösszeg és az Előleg között (D368–D369 három szintet kér).

## Döntések

### 1. Cím: `Összesítés` (C6)

Új `<Text>` cím kerül a blokk tetejére (a fáziscímekkel megegyező
stílusú `h2`-szerű elem) — ma a blokknak nincs saját címe, csak
vizuálisan különül el egy felső vonallal.

### 2. Feliratcsere a PDF-en: `Fizetendő` → `Végösszeg`, `Kezelések összesen` → `Kezelések összege` (D350/D351/C6)

**FIGYELEM, ELLENŐRIZENDŐ IMPLEMENTÁCIÓ ELŐTT:** ez a döntés azon a
feltevésen alapult, hogy a KÉPERNYŐN (final Terv részletei nézet) ez az
átnevezés már megtörtént a 74. tétel során. A 74. tétel ténylegesen
lezárva `docs/03-funkcionalis-spec.md` § 11 "Terv részletei
(véglegesített verzió)" → "Pénzügyi összesítés" alatt — de a doki
kifejezett döntése alapján a képernyő a nyomtatvány MEGLÉVŐ feliratait
vette át változtatás nélkül (`Fizetendő`/`Kezelések összesen`), nem
`Végösszeg`/`Kezelések összege`-re nevezte át. Az itt leírt PDF-oldali
csere emiatt ELLENTÉTES hatást érne el a szándékolttal (a képernyő és a
nyomtatvány szétcsúszna, nem összezárna) — ezt a döntést az
implementáció megkezdése előtt újra kell gondolni.

### 3. Számítási forrás marad `tervVegosszeg()`

Nincs átállás a mentett `plan.osszesitok`-ra. A 74. tétel saját
indoklása szerint a PDF-generálás `tervVegosszeg()`-hívása BIZTONSÁGOS,
mert MINDIG a véglegesítés PILLANATÁBAN fut, amikor `finalPlan.osszesitok
= computeOsszesitok(plan.fazisok, plan.kedvezmenyOsszeg)` ugyanabban a
műveletben történik (`doFinalize()`, `PreviewPage.tsx`) — a két érték
garantáltan megegyezik. **Ezen a ponton nincs kód-változás.**

### 4. Három vizuális szint az Összesítés blokkban (D368–D369)

Új, finom elválasztóvonal a Végösszeg és az Előleg sor között (csak
akkor, ha van előleg, azaz `eloleg != null`); a Fennmaradó rész
erősebb súlyt kap (pl. sötétebb szín vagy nagyobb betűméret), mint az
Előleg, de gyengébbet, mint a Végösszeg — a mai egységes
`summaryEloleg` stílus helyett két különálló stílus (`summaryEloleg`
és egy új `summaryFennmarado`).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A `Végösszeg`/`Kezelések összege` KÉPERNYŐS megjelenítése (final
  Terv részletei) — 74. tétel, MÁR eldöntött hatáskör.
- Az Előleg SZÁZALÉK→ÖSSZEG-alapúra állítása és a PDF előleg-felirata
  (`elolegSor`) — 64. tétel, MÁR eldöntött hatáskör; ez a tétel nem
  nyúl az `elolegSor`/`fennmaradoResz` feliratokhoz, csak a
  `fizetendo`/`kezelesekOsszesen` kulcsokhoz.
- A blokk pozíciója az 1. oldalon (a fázisok UTÁN, teljes szélességben)
  — 77. tétel (DP-071).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pdf/TervDocument.tsx` — új cím-elem az Összesítés blokk
  tetején; új `summaryFennmarado` stílus és elválasztóvonal a
  Végösszeg és az Előleg között.
- `app/src/pdf/labels.ts` — `fizetendo`/`kezelesekOsszesen` értékének
  cseréje (hu+de), és egy új `osszesitesCim: 'Összesítés'`/`'Zusammenfassung'`
  (vagy hasonló) kulcs, ha a cím a `labels.ts`-ből jön (a `h2`/
  `fizetesiFeltetelekCim` mintájára).
- `docs/04-nyomtatvany-spec.md` „Összegzés" szakasz — a felirat- és
  cím-változás átvezetése a tétel lezárásakor (KÉSŐBB, nem most).

## Tesztelés (irányadó, nem kimerítő)

- Az Összesítés blokk tetején megjelenik az `Összesítés` cím (HU),
  `Zusammenfassung` (DE).
- A domináns sor felirata `Végösszeg`, nem `Fizetendő`; a feltételes
  referenciasor felirata `Kezelések összege`, nem `Kezelések összesen`.
- Egy terven, ahol a listaárból számolt összeg megegyezik a tényleges
  árakból számolttal, a `Kezelések összege` sor és az elválasztó
  kimarad, csak a `Végösszeg` sor marad — ugyanúgy, mint ma.
- Egy előleget tartalmazó terven a Végösszeg és az Előleg sor között
  megjelenik a finom elválasztóvonal; a Fennmaradó rész vizuálisan
  erősebb, mint az Előleg, de gyengébb, mint a Végösszeg.
- A Végösszeg értéke minden esetben megegyezik a `tervVegosszeg()`
  élő számításával, ahogy ma is.
