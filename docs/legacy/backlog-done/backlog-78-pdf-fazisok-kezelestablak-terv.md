# Backlog 78. tétel — PDF fázisok és kezeléstáblák — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 78. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-072
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D356`–`D419` a redesign saját D1–D606 számozásából valók — NEM azonosak
a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A mai `PhaseTable` (`pdf/TervDocument.tsx`) nagyrészt megfelel a
redesignnak (stabil oszlopok, `Db` sima szám, 0 Ft explicit, item
description full-width secondary row), de három konkrét ponton eltér:

1. **Üres `Fog` mező üres cellát ad**, nem `—`-t (D371).
2. **A becsült-ár csillag a tételnév UTÁN áll**
   (`sor.nevSnapshot + (sor.savos ? ' *' : '')`), a redesign (D376) az
   Egységár mellé kéri.
3. **Nincs keep-together védelem** a fázis-zárás (`Fázis összesen` +
   `Megjegyzés`) és a fáziscím+táblázatfejléc+első sor között — egy
   oldaltörés szétszakíthatja ezeket.

## Döntések

### 1. Üres `Fog` mező „—" (D371)

Ha egy sor `fogak` mezője üres, a `Fog` oszlop cellája `—`-t ad a puszta
üres string helyett — a mai `formatTeethForPrint(sor.fogak)` eredménye
üres inputnál üres marad, ezt egy explicit fallback váltja fel.

### 2. Becsült-ár csillag az Egységár mellé (D376)

Explicit átállás a `docs/04-nyomtatvany-spec.md` mai, dokumentált
elhelyezéséről (tételnév után) — a csillag az `Egységár` oszlop
értéke MELLÉ kerül, nem a tételnév mögé. **Miért éri meg a docs/04-től
való eltérés:** a csillag célja a becsült ÁRRA mutatás, nem a sor
egészére — az Egységár melletti elhelyezés pontosabban közli, MELYIK
adat becsült (nem a kezelés ténye, hanem az ára).

### 3. Sávos lábjegyzet szövege: D378 magja, a mai kiterjesztéssel megtartva

A D378 rövidebb mondatszerkezete kerül át a `pdf/labels.ts`
`savosFootnote` értékébe, DE a mai szöveg származtatott összegekre
(Fizetendő/„Végösszeg" — lásd 79. tétel, Előleg, Fennmaradó rész)
vonatkozó kiterjesztése MARAD. Végleges magyar szöveg:

> „* A csillaggal jelölt tételek ára és a belőlük számított összegek
> becsültek; a tényleges ár a kezelés körülményeitől függően
> változhat."

Német párja ugyanígy AI-fordítással, lektorálás nélkül készül (a mai
`labels.ts` `de.savosFootnote` állapotával konzisztensen — az a fájl
fejléce szerint is „gépi/vázlat fordítás, lektorálandó").

**Miért nem a D378 szó szerinti (rövidebb) szövege:** a rövidebb
verzió NEM említi a származtatott összegeket — ha átvennénk
változtatás nélkül, az Előleg/Fennmaradó rész soron maradó csillag
(`TervDocument.tsx:474,481`) magyarázat nélkül maradna, és szűkülne a
D15 jogi védelme (`CLAUDE.md` sérthetetlen szabály: a sávos ár fix
számként nyomtatása kötelező érvényű ajánlattá válna).

### 4. Keep-together bővítés: fázis-zárás + árva cím védelme

- **(a) `Fázis összesen` + `Megjegyzés` egy `wrap={false}` blokk**
  (D414) — a kettő nem szakadhat szét oldaltörésnél.
- **(b) fáziscím + táblázatfejléc + első tételsor `minPresenceAhead`-
  del védett** (D361/D356 — D356 ebbe a konkrét mechanizmusba olvad
  bele, önálló szabályként nem kell kezelni), hogy a cím ne maradjon
  árván az oldal alján, tartalom nélkül fölötte.
- A tételsorok maguk (a leírásukkal, lásd az 5. döntés) továbbra is
  szabadon törhetnek egymás közt — csak a fázis EGÉSZE nem törik meg
  árván a cím/fejléc után rögtön.

### 5. D362 enyhítve: az alapsor egyben marad, a leírás törhet

A mai szigorú „tételsor + leírás soha nem szakadhat szét" szabály
lazul: a tételsor (név/fog/db/ár) marad `wrap={false}`, de a HOZZÁ
tartozó leírás — ha nagyon hosszú — engedhető oldalra törni, best
effort (D362). Ez a `docs/04-nyomtatvany-spec.md` „a tételsor és a
leírása egy `wrap={false}` csoportban" mondatát PONTOSÍTJA, nem törli
el: a csoport szűkül a tételsorra, a leírás önálló, törhető elem lesz
alatta.

**Miért:** egy extrém hosszú leírás (a `leirasHossz.ts`
`LEIRAS_FIGYELMEZTETES_KARAKTER`/`_SOR` már ma is figyelmeztet erre a
szerkesztőben, de nem TILTJA) a mai szigorú szabály mellett vagy kilóg
az oldalról, vagy egy teljesen üres oldalt hagy maga előtt, ha nem fér
ki — egyik sem jó nyomtatási eredmény.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A folytatólagos szakaszcím kérdése (D357/D363–D364/D415/D586) —
  lásd 76. tétel (DP-070), EXPLICIT ELVETVE ott, ez a tétel csak a
  keep-together (nem folytatólagos-cím) mechanizmusokat viszi.
- Az Összesítés blokk (`Fizetendő`/`Kezelések összesen` átnevezés,
  vizuális szintek) — 79. tétel (DP-073).
- A fázisok/fogtérkép ELRENDEZÉSE az 1. oldalon — 77. tétel (DP-071).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pdf/TervDocument.tsx` `PhaseTable` — üres Fog mező fallback,
  csillag-pozíció áthelyezése, `wrap={false}`/`minPresenceAhead`
  bővítés a fázis-zárásra és a fáziscím+fejléc+első sorra, a
  tételsor+leírás `wrap={false}` csoport szűkítése a tételsorra.
- `app/src/pdf/labels.ts` `savosFootnote` (hu+de) — új szöveg.
- `docs/04-nyomtatvany-spec.md` „Tételtáblázat" szakasz — a csillag
  pozíciójának és a lábjegyzet szövegének frissítése a tétel
  lezárásakor (KÉSŐBB, nem most).

## Tesztelés (irányadó, nem kimerítő)

- Egy fogszám nélküli sor `Fog` cellája `—`-t mutat.
- Egy sávos (`SAVOS`) árú tétel sorában a csillag az Egységár mellett
  jelenik meg, nem a tételnév után.
- A sávos lábjegyzet szövege megegyezik a fenti végleges magyar
  szöveggel, és a fázisok után, az Összesítés előtt, EGYSZER jelenik
  meg, ha van legalább egy sávos sor.
- Egy fázis, aminek a `Fázis összesen` + `Megjegyzés` sora oldaltörés
  határára esne, a kettő EGYÜTT kerül át a következő oldalra.
- Egy fázis, aminek a címe az oldal legalján lenne, tartalom nélkül
  fölötte, TELJES EGÉSZÉBEN átkerül a következő oldalra (cím +
  táblázatfejléc + legalább az első sor együtt).
- Egy nagyon hosszú tétel-leírás — ha nem fér ki — oldalra törhet, a
  hozzá tartozó tételsor (név/fog/db/ár) viszont mindig egyben marad.
