# Backlog 83. tétel — Kezeléslista/editor: aktiválási modell és deaktiválás megerősítése — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 83. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek
kidolgozása a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat
DP-080 szelete. Az itt hivatkozott `D109`–`D131` a redesign saját
D1–D606 számozásából valók — NEM azonosak a
`docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

- `PriceListAdminPage.tsx` `UjTetelDialog.tsx` `mentUjTetel` egy új
  tételt AZONNAL `aktiv: true`-val hoz létre, `HUF 0` kezdőárral — ez
  `docs/03-funkcionalis-spec.md` § „Új tétel felvitele” dokumentált,
  szándékos jelenlegi viselkedése.
- A szem-ikon (`aria-label="Aktív"`) mindkét irányban (aktív→inaktív
  ÉS inaktív→aktív) azonnali, megerősítés nélküli váltás.
- Semmi nem jelzi a dokinak, ha egy draft sor egy közben deaktivált
  tételre hivatkozik — a sor `nevSnapshot`/ára (D7) érintetlen marad,
  de nincs róla figyelmeztetés.

## Döntések

### 1. Aktiválási modell átállítása D127–D131-re — EXPLICIT ELTÉRÉS a ma dokumentált viselkedéstől

Új tétel a mai azonnali-aktiválás helyett D127–D131 szerint indul: az
„Új tétel” dialógus mentése után a tétel `aktiv: false`-szal jön létre
(a modal maga VÁLTOZATLAN: csak HU név + kategória kötelező), az
inline editor megnyílik, fókusz a HUF ár mezőn (AS-IS, változatlan).

**Miért:** a user explicit megkérdezve, a redesign óvatosabb modellje
mellett döntött a ma dokumentált azonnali-aktiválással szemben — az
utóbbi kockázata, hogy egy félkész (0 Ft-os, kategorizálatlan
gondolattal felvitt) tétel azonnal megjelenik a tervezőben választható
tételként.

**Elvetett alternatíva:** a mai azonnali-aktiválás megtartása — explicit
elvetve.

### 2. Aktiválás kiváltója: a HUF ár mező első commitja

A HUF ár mező ELSŐ commitja (blur/Enter) váltja ki: ha érték `>0`,
azonnali, néma aktiválás (nincs külön „Aktiválás” gomb — a D129 „első
sikeres teljes mentés” megfogalmazását automatikusra fordítva). Ha az
érték `0` marad, egy `AlertDialog` explicit megerősítést kér (D131) —
csak elfogadás után aktiválódik.

**Miért:** a projekt autosave-modelljében (D31) nincs diszkrét „mentés”
gomb — a mezőcommit a természetes analógja a D129 „sikeres mentés”
fogalmának. A 0 Ft eset külön megerősítést kap, mert az árlista-adminban
egy 0 Ft-os aktív tétel csendben megjelenne a tervező keresőjében.

**Elvetett alternatíva:** mindig explicit, külön „Aktiválás” gomb a HUF
ár értékétől függetlenül — elvetve, mert plusz kattintást igényelne
minden új tételnél, még normál ár esetén is, a D129 „automatikus mentés
aktivál” szellemével szemben.

### 3. Az „még soha nem aktivált” állapot TRANZIENS, nincs séma-bővítés

Ez az állapot csak a létrehozást KÖZVETLENÜL követő munkamenetben él (a
meglévő `frissTetelId` UI-állapot mintáján) — nincs új `Tetel`
séma-mező. Ha a doki bezárja/elnavigál a megerősítés előtt, a tétel
egyszerűen egy rendes inaktív tétellé válik: onnantól a szem-ikon
szokásos, azonnali reaktiválása vonatkozik rá, nincs többé „függő első
aktiválás” különleges állapot.

**Miért:** a user explicit ezt választotta a perzisztens séma-mező
alternatívájával szemben — kevesebb migrációs kockázat, és a
elhagyott/félbehagyott tétel viselkedése (rendes inaktív tétel) amúgy is
helyes, biztonságos alapállapot.

**Elvetett alternatíva:** új, opcionális `Tetel` mező (pl.
`aktivaltMar`), ami F5/navigáció után is megőrzi a „függő első
aktiválás” állapotot — elvetve, mert a tranziens megoldás ugyanazt az
eredményt adja kevesebb séma-kockázattal.

### 4. Deaktiválás megerősítést kér (D124), reaktiválás marad azonnali

A szem-ikonos deaktiválás (aktív→inaktív) `AlertDialog` megerősítést
kap. Reaktiválás (inaktív→aktív) marad azonnali, megerősítés nélkül —
mindkét irány ma megerősítés nélküli.

**Miért:** D124 explicit ezt a két ágat írja elő — egy tétel
deaktiválása visszamenőleg érinti, hogy a doki a jövőben választhatja-e
a tervezőben, ezért indokolt egy extra megerősítő lépés; a
reaktiválásnak nincs ilyen kockázata.

### 5. Új, puha D113 véglegesítés-figyelmeztetés

Ha egy draft sor egy közben deaktivált tételre hivatkozik, egy új
domain-helper (`kitoltetlenSorok`/`nullaOsszeguSorok` mintáján) észleli,
és a MÁR meglévő (67. tétel) egységes `VeglegesitesCsekklista`-modellbe
köt be, `soft`/`info` szinten — a sor `nevSnapshot`/ára D7 szerint
VÁLTOZATLAN marad, ez csak tájékoztató jelzés.

**Miért:** D113 explicit ezt kéri; a doki eddig semmilyen jelzést nem
kapott arról, hogy egy draft sora egy időközben deaktivált tételre
mutat.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Tétel-sorrendezés a kategórián belül — nincs hozzá D-döntés, a
  `sorrend` mező ma sem olvasódik vissza sehol, változatlan marad.
- Az árlista-snapshot/refresh a tervekben — 61. tétel (DP-044).
- Kategóriakezelés — 84. tétel (DP-081).
- D109–D112 (package metadata, aktív/gyakori függetlensége, inaktív
  tétel új tervbe nem választható) — MÁR MEGVAN, nincs új munka.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/priceListAdmin/UjTetelDialog.tsx` `mentUjTetel` — a
  kezdő `aktiv: false`.
- `app/src/pages/PriceListAdminPage.tsx` `ItemEditor`/környezete — a
  HUF ár mező első commitjának aktiválás-logikája, a 0 Ft
  megerősítő `AlertDialog`, a deaktiválás megerősítő `AlertDialog`.
- `app/src/domain/kitoltetlen.ts` (vagy szomszédos új fájl) — az új
  D113-helper.
- `app/src/domain/veglegesitesOr.ts` — az új checklist-tétel bekötése
  a 67. tétel `VeglegesitesCsekklista`-modelljébe.

## Tesztelés (irányadó, nem kimerítő)

- Új tétel létrehozás után inaktív marad; HU név/kategória szerkesztése
  önmagában nem aktiválja.
- HUF ár >0 commitja némán, azonnal aktivál.
- HUF ár 0-n maradása megerősítést kér; csak elfogadás után aktivál.
- Az editor bezárása/elnavigálás megerősítés előtt: a tétel rendes
  inaktív tétellé válik, a szem-ikon utána szokásosan (azonnal)
  reaktiválja.
- Aktív tétel deaktiválása megerősítést kér; inaktív tétel
  reaktiválása nem.
- Egy draft sor, ami egy közben deaktivált tételre hivatkozik, egy
  soft/info checklist-tételt mutat az Előnézet oldalon, a sor neve/ára
  változatlan marad.
