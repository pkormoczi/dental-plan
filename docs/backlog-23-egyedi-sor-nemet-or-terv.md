# Backlog 23. tétel — Egyedi sor pontosabb megnevezése a német véglegesítés-őrben — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 23. tételének („Egyedi sor pontosabb
megnevezése a német véglegesítés-őrben") megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat (a lenti aláírás-szerű részletek csak
illusztrációk) — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

A `sorFallback()` (`app/src/domain/nev.ts`) a dokumentált EGYETLEN hely,
ahol eldől, hogy egy sor neve miért nem a terv nyelvén szerepel — ezt
hívja mind a `PreviewPage.tsx` véglegesítés-őre (`fallbackSorok`-on át,
a „Tételnevek nem németül" dialógusban), mind a szerkesztő `LineRow`
jelvénye. Egy egyedi (`sor.tetelId.trim() === ''`), kitöltött nevű sor
ma MINDIG `'nincsForditas'`-t ad egy német terven (`nev.ts:64`) —
függetlenül attól, hogy a doki milyen nyelven írta a sort. Ez két helyen
téves jelzést ad:

- A véglegesítés-dialógusban az egyedi sor a „Nincs német nevük az
  árlistában" lista alá kerül — holott az „árlista" fogalma egyedi
  sorra nem is értelmezhető (nincs mögötte árlistai tétel), és lehet,
  hogy a doki pontosan németül írta be.
- A szerkesztőben egy egyedi sor a már meglévő szürke „egyedi" jelvény
  MELLETT egy amber „HU" jelvényt (`HuChip`) is kap — két, egymásnak
  részben ellentmondó jelzés ugyanarra a sorra.

A hamis riasztás pont ott koptatja a riasztás hitelét, ahol a valódi
találat (egy ténylegesen fordítás nélküli árlistai tétel) komoly.

## Döntések

### 1. Új `SorFallbackOk` érték a `sorFallback`-ban: `'egyedi'`

A `sor.tetelId.trim() === ''` ág (`nev.ts:64`, ma mindig `'nincsForditas'`-t
ad) mostantól egy önálló, harmadik `SorFallbackOk` értéket ad:
`'egyedi'`. A `FallbackSorokEredmeny` interfész egy azonos nevű, harmadik
`string[]` mezőt kap (`egyedi: string[]`, a meglévő `nincsForditas`/
`elterAzArlistatol` mezők mintájára — mindkettő egy FELTÉTELT nevez meg,
nem egy „lista"-szót).

```
export type SorFallbackOk = 'nincsForditas' | 'elterAzArlistatol' | 'egyedi';
```

**Miért:** a `sorFallback` fejléc-kommentje maga írja elő, hogy ez „az
EGYETLEN hely, ahol ez a szabály eldől" — mindkét fogyasztó (a
`PreviewPage` dialógusa és a `LineRow` jelvénye) ugyanezt a függvényt
hívja, tehát a fix EBBEN a függvényben, egy helyen történik, és
automatikusan propagál mindkét UI-hoz. Egy sor-szintű (`tetelId`
ellenőrzés) duplikált logika a két UI-ban pont az ellenkezője lenne a
CLAUDE.md „Meglévő segédfüggvények — használd, ne írd újra" elvének, és
könnyen szétcsúszna egy jövőbeli módosításnál.

### 2. Szerkesztő (`LineRow`): a „HU" jelvény elmarad egyedi soron, nincs új UI-elem

A `{fallback === 'nincsForditas' && <HuChip />}` feltétel változatlan
marad a kódban — de mivel az 1. döntés után a `sorFallback` egyedi
sorra már nem `'nincsForditas'`-t ad, ez az ág egyedi soron magától nem
fut le többé. A meglévő szürke „egyedi" jelvény (`egyedi &&
<Badge>egyedi</Badge>`, a `line.tetelId.trim() === ''`-ból számolva)
változatlanul megjelenik. `fallback === 'egyedi'`-re NEM kerül új
jelvény, tooltip vagy egyéb UI-elem.

**Miért:** a kódbázisban nincs Tooltip-precedens (egyetlen `Tooltip`
import sincs sehol), egy ilyen bevezetése önmagában meghaladná ennek a
fél órás tételnek a méretét. A backlog-szövegben idézett hosszabb
magyarázat („Egyedi, szabad szöveges sor — a nyelvét te írtad") egy
inline badge-hez túl hosszú lenne, egy rövidített/homályos verziója
pedig nem adna hozzá érdemi információt a már ott lévő „egyedi"
jelvényhez képest — az már önmagában jelzi, hogy ez egy kézzel írt
szöveg. A teljes, pontos szöveg a dialógusba való (3. döntés), ahol már
ma is teljes mondatok/címek szerepelnek.

### 3. `PreviewPage` dialógus: harmadik lista a végén, a közös bevezető mondat változatlan

A dialógus két meglévő `nevListaSzoveg(...)` hívása mellé egy harmadik
kerül, a HARMADIK (utolsó) helyre:

```
nevListaSzoveg('Nincs német nevük az árlistában', nincsForditas),
nevListaSzoveg('Kézzel átírt, eltér az árlistától', elterAzArlistatol),
nevListaSzoveg('Egyedi, szabad szöveges sor — a nyelvét te írtad', egyedi),
```

A dialógus közös bevezető mondata („Ez egy német nyelvű ajánlat, de
néhány sor neve nem németül kerül a nyomtatványra.") változatlan marad.

**Miért — sorrend:** a meglévő két lista sorrendje érintetlen (minimális
diff a szöveghez/tesztekhez képest), az új, bizonytalan/legenyhébb
kategória a végén — a legkomolyabb (biztosan hiányzó fordítás) esetek
maradnak legelöl.

**Miért — bevezető mondat változatlan:** a mondat a másik két listára
igaz állítás (biztosan tudjuk, hogy nem németül kerül a nyomtatványra),
az egyedi sorokra túl erős állítás lenne (nem tudjuk, milyen nyelven írta
a doki) — de a harmadik lista SAJÁT címe („...a nyelvét te írtad") már
önmagában hordozza ezt a pontosítást, nem állítja, hogy a sor NEM német,
csak hogy nem ellenőrizhető. A közös mondat egy általánosabbra
gyengítése minden esetre (a másik kettőre is) csökkentené a jelzés
határozottságát egy olyan pontosságért, amit a lista címe már úgyis
biztosít — nem éri meg egy fél órás tételben.

### 4. A véglegesítés-dialógus trigger-feltétele változatlanul MINDHÁROM listát számolja

`nevProblemaSzama` (`PreviewPage.tsx:203`) mostantól:
`nincsForditas.length + elterAzArlistatol.length + egyedi.length` — egy
kitöltött nevű egyedi sor német terven TOVÁBBRA IS megnyitja a
dialógust, csak a HARMADIK lista alatt, pontosabb szöveggel.

**Miért:** a backlog-tétel saját „Kereteket sért?" sora expliciten
kimondja: „Nem — a D21-őr szigora (soha nem néma) marad." Az egyedi
sorok NEM tűnhetnek el néma módon a diagnosztikából — a tétel a
KATEGORIZÁLÁST pontosítja, nem a riasztás meglétét gyengíti.

### 5. Tesztelés: két meglévő teszt frissítése + két új eset

- `app/src/domain/nev.test.ts`: a két meglévő teszt, ami ma a RÉGI
  `'nincsForditas'` értéket várja egy kitöltött nevű egyedi sorra
  (`sorFallback`-teszt: „backlog-3: egyedi (üres tetelId-jű), kitöltött
  nevű sor de terven »nincsForditas«"; `fallbackSorok`-teszt: „backlog-3:
  kitöltött egyedi (tetelId nélküli) sor is bekerül de terven,
  nincsForditas alá") frissül az új `'egyedi'` értékre/mezőre — ezek
  MEGTÖRNÉNEK az 1. döntés nélküli frissítés esetén.
- `app/src/pages/PreviewPage.test.tsx`: új eset, ami egy VALÓDI egyedi
  sort vesz fel (az `ItemPicker` „Egyedi tétel felvétele" pszeudo-opcióján
  át, a `PlanEditorPage.test.tsx` meglévő „nulla találatra... egyedi sor
  vehető fel" mintája szerint) egy német terven, és igazolja, hogy a
  dialógusban a harmadik cím („Egyedi, szabad szöveges sor — a nyelvét te
  írtad (1)") KÜLÖN jelenik meg, NEM a „Nincs német nevük az árlistában"
  alatt. (A meglévő „a dialógus külön sorolja fel..." teszt NEM érintett —
  az egy `tetelId`-hez kötött, kézzel átírt sort tesztel, nem egy valódi
  üres-`tetelId` egyedi sort.)
- `app/src/pages/PlanEditorPage.test.tsx`: új eset, ami egy német terven
  (a meglévő `seedGermanPlanWithOneTranslatedItem` mintája) egyedi sort
  vesz fel, és igazolja, hogy csak a szürke „egyedi" jelvény látszik,
  amber „HU" jelvény NEM.

**Miért:** a két meglévő teszt frissítése KÖTELEZŐ (különben törnek), a
két új eset pedig pontosan az ebben a munkamenetben hozott, ténylegesen
új UI-viselkedést fedi le (a dialógus harmadik listája, a HU-chip
hiánya a szerkesztőben) — enélkül egy jövőbeli refaktor némán
visszahozhatná a mai, hibás viselkedést.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `HuChip` / `ItemPicker` keresőben megjelenő „HU" jelvény
  jelentése** — az valódi árlistai tételekre vonatkozik (nincs német
  nevük az árlistában), ez a jelentés pontos és változatlan marad; ezt a
  tételt kizárólag a `LineRow`-beli, SOR-szintű felhasználás érinti.
- **Tooltip bevezetése a szerkesztőbe** — lásd 2. döntés, tudatosan
  elvetve.
- **A közös dialógus-bevezető mondat átfogalmazása** — lásd 3. döntés,
  tudatosan elvetve.
- **A `nevProblemaSzama` trigger gyengítése/az egyedi sorok kizárása a
  számlálásból** — lásd 4. döntés, kifejezetten elvetve a backlog saját
  „soha nem néma" kikötése miatt.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/nev.ts`
  - `SorFallbackOk` union bővítése `'egyedi'`-vel, a `sorFallback`
    egyedi-ág (`nev.ts:64`) visszatérési értékének cseréje (1. döntés).
  - `FallbackSorokEredmeny` interfész bővítése egy `egyedi: string[]`
    mezővel, a `fallbackSorok` ciklusának bővítése ennek gyűjtésére.
- `app/src/domain/nev.test.ts` — a két meglévő teszt frissítése (5.
  döntés).
- `app/src/pages/PlanEditorPage.tsx`
  - `LineRow`-ban a `{fallback === 'nincsForditas' && <HuChip />}` ág
    kódja NEM változik, csak a `sorFallback` bemenete változik a fenti
    módon (2. döntés) — a feltétel maga érintetlen marad.
- `app/src/pages/PlanEditorPage.test.tsx` — az 5. döntésben leírt új eset.
- `app/src/pages/PreviewPage.tsx`
  - `fallbackSorok(plan, priceList)` destrukturálás bővítése `egyedi`-vel.
  - `nevProblemaSzama` számítás bővítése (4. döntés).
  - A dialógus `nevListaSzoveg(...)` hívásai: harmadik hívás hozzáadása
    (3. döntés).
- `app/src/pages/PreviewPage.test.tsx` — az 5. döntésben leírt új eset.
