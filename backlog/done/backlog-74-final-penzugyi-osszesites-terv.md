# Backlog 74. tétel — Final pénzügyi összesítés — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 74. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-063
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D307`–`D346` a redesign saját D1–D606 számozásából valók — NEM azonosak
a `docs/01-attekintes-es-dontesek.md` D-táblájával, és NEM azonosak a
62./63./64. tétel forrás-D-jeivel, bár RÉSZBEN ÁTFEDNEK velük (lásd
lent).

**Sorrendi kapcsolat:** a 71. tételre (DP-060) épül (layout-slot); a 72.
tételre (DP-061, a sor-struktúra, ahova a jelvény kerül); tartalmilag a
62./63./64. tétel MÁR eldöntött szemantikáját alkalmazza, read-only
nézetben.

## Probléma

**A forrásdokumentum D307–346 EGÉSZÉT ehhez a tételhez (DP-063) rendeli**
— de ellenőriztem a `backlog-63`/`backlog-64` tervfájlokat (62./63./64.
tétel): mindkettő KIZÁRÓLAG a PLAN-szintű blokkokra
(`KerekVegosszegBlokk`/`ElolegBlokk`, `PlanEditorPage.tsx`) szorítkozik.
**A sor-szintű (item-level) kedvezmény/felár-jelvény (D308–311,
D329–341) egyik meglévő tervben SEM szerepel** — ez a tétel az egyetlen,
ahova ez a hiányzó darab rendelhető.

A mai `LineRow` (számítás: `PlanEditorPage.tsx:1039-1044`, badge:
`PlanEditorPage.tsx:1108-1112`) MÁR mutat egy `−{discount}%` jelvényt,
DE:
- csak KEDVEZMÉNYRE (ha `tenylegesEgysegar < listaEgysegar`) — felárra
  (ajánlati ár > listaár) MA SEMMILYEN jelzés nincs;
- a `[Felár]` (listaár=0, D337) és `[-100%]` (ajánlati ár=0, D338)
  speciális esetek nincsenek kezelve;
- a kerekítési szabály (D340–341: nemnulla eltérés soha nem `0%`-ként)
  nincs implementálva.

Ezen felül: a plan-szintű végösszeg (`Végösszeg`/`Kezelések összege`)
MEGJELENÍTÉSE (nem a szemantikája — az a 63./64. tételé) sehol nem
létezik READ-ONLY nézetben, és a MEGLÉVŐ `osszesitokElter()`
eltérés-figyelő függvény MA KIZÁRÓLAG piszkozat-betöltéskor fut.

## Döntések

### 1. Plan-szintű végösszeg — közvetlenül `plan.osszesitok`-ból

A domináns `Végösszeg` és a feltételes `Kezelések összege` sor
KÖZVETLENÜL `plan.osszesitok.fizetendo`/`kezelesekOsszesen`-ból olvas
(D316–317), **NEM** a `domain/totals.ts` `tervVegosszeg()`/
`sorokOsszeg()` újraszámolásával.

**Miért (D7 sérthetetlen szabály, CLAUDE.md):** „Mentett tervet soha nem
rajzolunk újra az aktuális árlistából” + „`osszesitok` a fájlból számít
igaznak, eltérés esetén figyelmeztetni kell”. A mai PDF-generálás
(`pdf/TervDocument.tsx`) UGYAN `tervVegosszeg()`-et hív, DE ez BIZTONSÁGOS,
mert MINDIG pontosan a véglegesítés PILLANATÁBAN fut, amikor a két érték
garantáltan megegyezik (`finalPlan.osszesitok =
computeOsszesitok(plan.fazisok, plan.kedvezmenyOsszeg)` ugyanabban a
műveletben, `PreviewPage.tsx doFinalize()`). Egy KÉSŐBB, akár hónapokkal
később megnyitott read-only nézetnél ez a garancia elvileg nem áll fenn
(pl. egy jövőbeli hibás kód-módosítás vagy sérült fájl esetén) — a
mentett érték olvasása a helyes, D7-nek megfelelő alapállás.

A `Kezelések összege` sor csak akkor jelenik meg, ha ténylegesen eltér a
`Végösszeg`-től (D315, D319 pontosítása szerint: sor-szintű eltérés
akkor is megnyitja ezt a sort, ha a pozitív/negatív eltérések nettóban
kiegyenlítik egymást — tehát az `osszesitok.kedvezmeny !== 0` a helyes
feltétel, nem egy sorok-feletti egyenlőség-vizsgálat).

### 2. Info-szintű eltérés-figyelmeztetés — az EGYETLEN, korábban le nem
   fedett hely

A MEGLÉVŐ `osszesitokElter(mentett, fazisok, kedvezmenyOsszeg)`
(`domain/totals.ts`) újrahasznosítva: ha a mentett `osszesitok` eltér a
`plan.fazisok`-ból/`kedvezmenyOsszeg`-ből újraszámolt értéktől, egy
info-szintű (nem blokkoló) figyelmeztetés jelenik meg.

**Miért:** ez a függvény ma KIZÁRÓLAG a `state/AppState.tsx`
`loadedOsszesitokDiff`-en át, PISZKOZAT-BETÖLTÉSKOR fut (amikor a doki
egy korábbi verziót „Új verzió”-ként nyit meg szerkesztésre). A CLAUDE.md
szabálya („eltérés esetén figyelmeztetni kell”) NEM szűkíti ezt a
piszkozatra — egy egyszerű MEGTEKINTÉS (nem szerkesztés) esetén ma
SEMMI nem futtatja ezt az ellenőrzést. Ez a tétel az első hely, ahol egy
már véglegesített terv puszta megnyitásakor is lefut.

### 3. Sor-szintű kedvezmény/felár classifier — új, megosztott logika

Egy ÚJ, tiszta függvény (`domain/totals.ts` bővítése egy exportált
classifierrel, vagy önálló modul, pl. `domain/sorEltérés.ts`) adja vissza
egy sorra: `{ tipus: 'kedvezmeny' | 'felar' | null, szazalek: number |
null, cimke: string | null }` (a pontos alak a megvalósító döntése),
implementálva:

- kedvezmény/felár irány mindkét irányban (D308: `offered<list` =
  kedvezmény, `offered>list` = felár);
- `[Felár]` címke, HA `listaár = 0` ÉS `offered > 0` — SZÁZALÉK NÉLKÜL,
  mert 0-ból nem képezhető értelmes arány (D337);
- `[-100%]` címke, HA `offered = 0` pozitív listaár mellett — ez LEGITIM
  állapot (pl. jóváhagyott ingyenes kontroll), nem hibajelzés (D338);
- kerekítés alapból EGÉSZ %-ra (D340);
- **nemnulla eltérés SOHA nem jelenhet meg `0%`-ként** — ha egy valódi,
  nemnulla eltérés egészre kerekítve `0`-t adna (pl. 0,3%), a
  megjelenítés 1 TIZEDESRE vált (D341);
- hiányzó listaár + kézi ajánlati ár esetén NINCS classification, csak
  „listaár nincs megadva” szöveg (D342).

A badge SZÍNE ezen az oldalon **NEUTRÁLIS** (D329) — nem a szerkesztő
zöld `−{discount}%` jelvénye. A classifier csak a TÍPUST/SZÁZALÉKOT adja
vissza, a színt/megjelenést a hívó (ez az oldal, ill. opcionálisan a
szerkesztő) dönti el.

**Melléktermék (tudatosan beleértve ebbe a tételbe): a `LineRow`
(`PlanEditorPage.tsx`) inline `discount`-számításának átállítása erre a
megosztott classifierre.** Ez a szerkesztőben INGYEN megadja a ma
hiányzó felár-jelvényt és a `[Felár]`/`[-100%]` speciális eseteket — a
szerkesztő MEGLÉVŐ zöld színstílusa (`color="green"`) VÁLTOZATLAN marad,
csak a mögöttes érték-számítás forrása vált egy megosztott, egyszer
tesztelt függvényre.

**Miért tartozik ez ide, nem egy külön tételbe:** a projekt „ne írd
újra” elve (CLAUDE.md „Meglévő segédfüggvények”) szerint, ha egy ÚJ
classifier-t építünk egy MEGLÉVŐ, hasonló célú inline számítás mellé,
és a kettő ugyanazt az alapadatot (listaár/ajánlati ár) nézi, a
divergencia (két hely, ami eltérő eredményt adhat ugyanarra a sorra egy
jövőbeli módosításnál) valós kockázat — a retrofit MECHANIKUS és
alacsony kockázatú (a `LineRow` vizuális megjelenése nem változik, csak
a bemeneti szám forrása).

### 4. Becsült tételek száma

Semleges info-sor a végösszeg alatt (D332), a `savos` sorok száma a
mentett `plan.fazisok`-ból számolva, NEM kattintható (D333). Nincs
fázis-szintű becsült-jelző (D334) — csak a plan-szintű összesítő számol.

### 5. „Fizetés” alcsoport — deposit/remainder

Külön, csak akkor CÍMEZETT alcsoport (D322–323, ha van tényleges
magyarázó tartalom — pl. ha nincs előleg, nincs alcsoport-cím sem), a
hátralévő rész vizuálisan ERŐSEBB, mint az Előleg, de GYENGÉBB, mint a
Végösszeg (D324).

`elolegOsszegek(plan.osszesitok.fizetendo, plan.elolegSzazalek)` hívása
— a STORED `fizetendo`-t adva bemenetként (KONZISZTENS az 1. döntéssel:
sosem az újraszámolt `tervVegosszeg()` értéket).

### 6. Hiányzó listaár kezelése — előretekintő tervezés

D342–346 (hiányzó listaárnál nincs partial list sum, „Nem számolható” +
darabszám, a hiány önmagában elég a Pricing block megjelenítéséhez,
Treatment Sum akkor is látszik, ha egyenlő a Final-lal) — a classifier
és az összegzés EXPLICIT külön ágon kezeli ezt az esetet.

**Fontos korlát:** a mai sémában `Sor.listaEgysegar: number` (NEM
nullable) — ez az állapot ma NEM PRODUKÁLHATÓ. Éles teszteléshez a 61.
tétel (Árlista-snapshot és explicit refresh, DP-044) és/vagy a 62. tétel
(Többpénznemes ár, DP-045) előrehaladása szükséges, amik a hiányzó
listaár fogalmát ténylegesen bevezetik a `Sor` sémájába. Ez a tétel
emiatt csak FELKÉSZÜL erre az ágra (a classifier és a rendering explicit
kezeli), de NEM BLOKKOLT tőle — a többi döntés önmagában is teljes,
tesztelhető funkciót ad.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A szerkesztő `KerekVegosszegBlokk`/`ElolegBlokk` PLAN-szintű UI-ja
  (checkbox, mező, felár-irány engedélyezése, 0-megerősítés stb.) — 63./
  64. tétel, VÁLTOZATLAN.
- A pénznemenkénti dual-state architektúra — 62. tétel, VÁLTOZATLAN; ez
  a tétel csak OLVASSA az AKTUÁLIS `plan.penznem` szerinti, már mentett
  adatot.
- A sorok/fázisok egyéb (nem pénzügyi) megjelenítése — 72. tétel
  (DP-061), aminek a szerkezetébe ez a tétel a badge-et illeszti.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/totals.ts` — új, exportált sor-szintű classifier
  függvény (3. döntés); `osszesitokElter()` újrahasznosítása
  (VÁLTOZATLAN függvény, új hívóhely).
- `app/src/pages/TervReszleteiPage.tsx` (71. tétel) — a „total”
  layout-slot tartalma.
- Új komponens (pl. `pages/tervReszletei/PenzugyiOsszesites.tsx`).
- `app/src/pages/PlanEditorPage.tsx` `LineRow` — a `discount`
  inline-számítás lecserélése a megosztott classifierre (3. döntés
  mellékterméke), a vizuális stílus (zöld badge) megtartásával.

## Tesztelés (irányadó, nem kimerítő)

- A `Végösszeg` a MENTETT `plan.osszesitok.fizetendo`-t mutatja, nem egy
  újraszámolt értéket.
- Egy mesterségesen eltérített (`osszesitok` vs. `fazisok`) teszt-terv
  info-szintű eltérés-figyelmeztetést kap.
- Egy felárazott sor (ajánlati ár > listaár) jelvényt kap — ma ez nem
  látszik sehol, sem a szerkesztőben, sem itt.
- `listaár = 0`, `offered > 0` sor `[Felár]` címkét kap, százalék nélkül.
- `offered = 0`, pozitív listaár mellett `[-100%]` jelvényt kap.
- Egy 0,3%-os eltérés `-0,3%`-ot mutat, nem `0%`-ot.
- A szerkesztő `LineRow` badge-e VÁLTOZATLANUL zöld marad, de mostantól
  felárnál is megjelenik (regressziós teszt: a kedvezmény-eset változatlan
  eredményt ad, mint korábban).
- Az „Előleg”/„Fennmaradó rész” a STORED `fizetendo`-ból számol.
