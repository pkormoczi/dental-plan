---
name: planning
description: Interview the user about a not-yet-decided backlog item, or a new idea sourced from backlog/ideas or a freeform prompt — branch by branch until every decision is resolved, then write a backlog/plans/backlog-N-<slug>-terv.md decision summary. For ideas not yet in BACKLOG.md, also assigns the next tétel-szám and writes the ### N. tétel entry itself, appended to the KIDOLGOZOTT block. Never writes or edits application code, and never modifies the source notes it reads from. Invoke explicitly with /planning.
disable-model-invocation: true
---

# Planning

## Cél

Egy döntést végigvinni implementáció-indításig — függetlenül attól, hogy a
kiinduló ötlet honnan jön:

- egy már számozott, de terv nélküli `backlog/BACKLOG.md` tétel,
- egy konkrét, kiválasztott ötlet a `backlog/ideas/` alatti nyers
  jegyzetekből,
- vagy egy szabadon, a `/planning` hívásban vagy a beszélgetésben leírt,
  még sehol nem rögzített ötlet.

A kimenet mindig egy `backlog/plans/backlog-N-<cím>-terv.md` döntési
összefoglaló, a meglévő, nyitott tervdokumentumok mintájára. Ha az ötlet
még nincs a `backlog/BACKLOG.md`-ben, a skill ELŐSZÖR felveszi azt —
sorszámmal, önálló bekezdéssel — mielőtt a részletes döntési interjúra
rátérne (lásd "Mikor fut").

**Ez a skill soha nem ír és nem módosít alkalmazáskódot** (`app/`, `data/`,
`assets/` alatt semmit), és soha nem módosítja a forrás-jegyzeteket
(`backlog/ideas/` — ezek mindig csak olvasásra szolgálnak, lásd
"Korlátok"). Amit ír:

- egy új `backlog/plans/backlog-N-<cím>-terv.md` fájlt,
- ha a tétel már szerepelt a backlogban, de terv nélkül: a meglévő tétel
  végére egyetlen `**Terv:**` sort, ha az még hiányzik,
- ha a tétel MÉG NEM szerepelt a backlogban: az új `### N. tétel`
  bekezdést magát is, a `KIDOLGOZOTT` blokk VÉGÉRE felvéve, a meglévő
  tételek formátumában (lásd "Kimenet — formátum").

Ha egy döntés menet közben valamelyik `docs/01`–`docs/07` fájl JELENLEGI
szövegét pontosítaná (pl. egy D-döntés árnyalása, mint a 25. tételnél a
D26-nál) — ezt NEM ez a skill vezeti át; az a `CLAUDE.md` "Backlog-tétel
lezárása" checklist 2. lépése, egy KÉSŐBBI, az implementáció UTÁNI, külön
explicit lépés. Ez a skill csak a nyitott, implementáció ELŐTTI beszélgetést
zárja le.

## Mikor fut

Explicit indítás: `/planning`. Soha nem automatikus. A hívás argumentuma
(vagy az azt megelőző beszélgetés) dönti el, melyik módban indul:

**A) Meglévő, de terv nélküli tétel.** A `backlog/BACKLOG.md`-ben már
szerepel egy "N. tétel", de nincs hozzá `**Terv:**` sor. A "Mikor fut"
innentől nem tér el a korábbi viselkedéstől, egyenesen a döntési interjúra
megy (lásd "Hogyan dolgozz").

**B) Új tétel felvétele — a forrás még nincs a backlogban.** Két
konkrét alakja lehet:

1. Egy konkrét, MÁR KIVÁLASZTOTT ötlet a `backlog/ideas/` alatt (pl.
   `USER_FEEDBACK.md` egy bulletje) — a hívó pontosan megmondja, melyik
   bekezdésről/gondolatról van szó.
2. Egy szabadon, a hívásban vagy a beszélgetésben leírt ötlet, amihez
   nincs háttérfájl.

Mindkét esetben a skill a döntési interjú ELŐTT elvégzi:

- **Ütközés-ellenőrzés** — lásd "Előkészítés" 2–3. pontja: ha az ötlet
  ütközik egy `docs/01` D-döntéssel vagy egy már elvetett, az "EGYÉB
  ötletek"/"NEM FEJLESZTÉS" listán szereplő tétellel, ezt EXPLICIT ki kell
  mondani, mielőtt tovább megy — a felhasználó dönt, folytatja-e mégis.
- **Sorszám-hozzárendelés** — a következő szabad tétel-szám a
  `backlog/BACKLOG.md` `KIDOLGOZOTT` blokkjának legnagyobb "N. tétel"
  száma ÉS a `backlog/done/BACKLOG_DONE.md` lezárt tételei közül a
  legnagyobb szám közül a nagyobbik, +1. Ezt a számot a döntési interjú
  VÉGÉN, közvetlenül az írás előtt ÚJRA ellenőrizni kell (nem elég a
  munkamenet elején egyszer megnézni) — másik, párhuzamosan futó
  munkamenet közben felkerülhetett egy új tétel a `master`-re.

**Ha a forrás egy TÖBB ötletet tartalmazó nyers jegyzet** (pl. a hívó egy
egész `backlog/ideas/*.md` fájlra mutat rá, konkrét ötlet kijelölése
nélkül): a skill ELSŐ lépésben — még a döntési interjú előtt — felsorolja
a fájlban azonosítható különálló ötleteket/felvetéseket. Minden jelölt
mellett jelezni kell, ha:

- már lefedi egy meglévő `KIDOLGOZOTT`/`KIDOLGOZÁSRA VÁR` tétel (melyik),
- már szerepel elvetve a `NEM FEJLESZTÉS`/`EGYÉB ötletek` listán (melyik,
  miért),
- ütközik egy `docs/01` D-döntéssel (melyikkel).

A jelöltek NEM esnek ki emiatt a listából — látszanak a jelöléssel együtt,
a felhasználó dönt. A felhasználó ezután pontosan EGY jelöltet választ ki
— egy `/planning` munkamenet mindig egyetlen tételt visz végig a döntési
interjún és a felvételen, sosem többet egyszerre.

## Előkészítés — mielőtt egy kérdést is felteszel

1. Olvasd el a célzott `backlog/BACKLOG.md` tételt (ha van sorszáma), vagy
   — B) módban — a forrás-szakaszt (az idézett ötlet).
2. Olvasd el a `docs/01-attekintes-es-dontesek.md` D-táblázatát és a
   `CLAUDE.md` "Sérthetetlen szabályok" táblázatát. Ezek nem tárgyalási
   alap — ha egy döntési ág ütközik egy meglévő D-ponttal, ezt EXPLICIT
   módon vesd fel, ne csendben kerülgesd, és ne csendben fogadd el az
   ütközést.
3. Fuss át a `backlog/BACKLOG.md` "EGYÉB ötletek" és "NEM FEJLESZTÉS"
   szakaszán — ha egy felmerülő ötlet egy már mérlegelt és elvetett irány,
   mondd ki, és kérdezd meg, mi változott azóta, ami miatt most mégis
   felmerül.
4. Ha a tétel érint egy `CLAUDE.md` "Meglévő segédfüggvények" alatt
   listázott függvényt/mintát, vedd figyelembe — a döntéseknek ezekre kell
   épülniük, nem újra feltalálni őket. (Ez csak tájékozódás, nem
   függvényszignatúra-tervezés — lásd Korlátok.)
5. B módban: a tétel-szám hozzárendelése (lásd "Mikor fut") csak
   TÁJÉKOZTATÓ jelleggel történik itt — a végleges, kötelező újraellenőrzés
   az írás közvetlen előtt van.

## Hogyan dolgozz

Ugyanaz az interjú-mechanika, ami eddig is bevált — B) módban azzal a
különbséggel, hogy a jelölt-kiválasztás (ha volt) és az ütközés-ellenőrzés
már lezajlott az Előkészítés/Mikor fut lépéseiben, mielőtt ez elkezdődik:

1. **Olvasd a felvetést** — értsd meg, mit mond a felhasználó eddig.
2. **Térképezd fel a döntési fát** — minden ágat: adatmodell,
   mappa-/fájlszerkezet, UX, szélső esetek, meglévő döntésekre gyakorolt
   hatás.
3. **Ágazz egyszerre egyet** — fókuszált kérdések, a legnagyobb hatású
   bizonytalanságokkal kezdve. Ne lépj tovább, amíg az ág nincs lezárva.
4. **Nevezd meg a függőségeket** — ha egy döntés korlátoz egy másikat,
   mondd ki explicit, mielőtt továbbmész.
5. **Foglald össze menet közben** — minden lezárt ág után ismételd vissza
   a döntést, hogy a felhasználó megerősíthesse vagy javíthassa.
6. **Állj meg, ha nincs egyezés** — amíg nincs közös kép, ne írj
   összefoglalót "majdnem kész" állapotban.

### Szabályok

- **Sose feltételezz.** Ha valami kétértelmű, kérdezz.
- **Egyszerre egy téma.** Ne vonj össze össze nem tartozó kérdéseket.
- **Tolj vissza.** Ha egy döntés kockázatosnak tűnik, vagy ütközik egy
  meglévő D-ponttal vagy egy korábban már elvetett, az "EGYÉB ötletek"
  listán szereplő tétellel, mondd ki — konkrétan a D-számra vagy az adott
  tételre hivatkozva, ne csak általánosságban "ez kockázatos".
- **Vess fel elvetett alternatívákat is.** A meglévő tervdokumentumok
  mintája szerint egy jó döntés-bekezdés nemcsak a választott utat írja
  le, hanem 1-2 komolyan mérlegelt, elvetett alternatívát is, azzal, hogy
  miért esett ki.
- **Legyél direkt.** Udvariaskodás nélkül, lényegre törően.
- **Kövesd a haladást.** Tartsd fejben, mely ágak zárultak le és melyek
  nyitottak, hogy a felhasználó lássa, hol tart.

## Korlátok — amit ez a skill SOHA nem tesz

- **Nem ír és nem módosít alkalmazáskódot** (`app/`, `data/`, `assets/`) —
  sem mintakódot, sem "csak illusztrációként" beszúrt snippetet.
- **Nem ír függvényszignatúrát, típusdefiníciót vagy fájlstruktúra-tervet
  implementációs részletességgel.** A meglévő tervdokumentumok nyitómondata
  a minta: *"Nem tartalmaz kódot vagy függvényszignatúrákat — az
  implementáció módja és a részletek kidolgozása a megvalósító feladata."*
  Az "Érintett helyek" szakasz (lásd lent) fájl-szintű, tájékoztató jellegű
  megjegyzésekre szorítkozik, nem tervezi meg az implementációt.
- **Nem futtatja le a `CLAUDE.md` "Backlog-tétel lezárása" checklistjét.**
  Az egy KÉSŐBBI, implementáció utáni, önálló lépés (döntések prózaként a
  `docs/02`–`07`-be, tervfájl `backlog/done/`-ba mozgatása). Ez a skill
  csak idáig visz: implementáció-indításra kész döntési összefoglaló.
- **Nem javasol és nem rendel hozzá új D-számot.** A `docs/01` D-táblája
  lezárt, történeti napló — nem bővül. A tervdokumentum egy meglévő
  D-pontra hivatkozhat (ütközés-ellenőrzésként, lásd "Előkészítés"), de
  soha nem ígéri, hogy egy döntés "D-számot fog kapni", és nem ír elő a
  megvalósítónak D-hivatkozást — a lezárás a döntést prózaként vezeti át.
- **Nem módosítja a forrás-jegyzeteket.** A `backlog/ideas/` alatti
  fájlok mindig csak olvasásra szolgálnak — a skill sosem jelöli vissza
  bennük, hogy egy ötletből már lett tétel. Ismétlődő futásnál a
  dedup-ellenőrzés (Előkészítés 3. pont, kiterjesztve a
  `backlog/done/BACKLOG_DONE.md`-re is) a védelem, nem egy fájlba írt
  jelölés.
- **A tétel-felvétel (B mód) sosem priorizálás.** A hozzárendelt szám
  stabil azonosító, nem rangsor (`backlog/BACKLOG.md` fejléce szerint) —
  a skill nem méretez, nem dönt a "megéri-e" kérdésben, és nem kér a
  felhasználótól relatív fontosság-besorolást. Az új tétel mindig a
  `KIDOLGOZOTT` blokk VÉGÉRE kerül.

## Kimenet — formátum

### A tervdokumentum

Fájlnév: `backlog/plans/backlog-N-<rövid-szlug>-terv.md`, ahol `N` a
`backlog/BACKLOG.md`-beli tételszám (A módban a meglévő szám, B módban a
frissen hozzárendelt, írás előtt újraellenőrzött szám).

Szerkezet, a meglévő tervdokumentumok mintájára:

```
# Backlog N. tétel — <cím> — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` N. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma
<mi a jelenlegi hiány/fájdalom, mire hivatkozva>

## Döntések
### 1. <döntés címe>
<a döntés + indoklás, benne "Miért:" bekezdés az elvetett alternatívákkal>
### 2. ...

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok
<explicit hatókör-határolás>

## Érintett helyek (tájékoztató, nem kimerítő)
<fájl/modul szintű pointerek, NEM implementációs terv>

## Tesztelés (irányadó, nem kimerítő)
<milyen viselkedést kell majd látni, nem hogyan tesztelni kódban>
```

### Az új `BACKLOG.md` tétel (csak B módban)

Ugyanaz a forma, mint a meglévő `KIDOLGOZOTT` tételeké:

```
### N. tétel — <cím>
  (<forrás-hivatkozás, lásd lent>) — <a jelenlegi hiány/fájdalom röviden,
  majd mit vezet be a tétel; explicit kizárt/elvetett scope-bulletek, ha
  voltak a döntési interjú alatt>. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-N-<rövid-szlug>-terv.md`
```

A forrás-hivatkozás alakja a bemenet szerint változik:

- `backlog/ideas/` eredetű: `a backlog/ideas/<fájlnév> alapján`.
- szabad, háttérfájl nélküli felvetés: nincs zárójeles hivatkozás — a
  bekezdés egyenesen a probléma leírásával kezdődik.

Az új tétel a `KIDOLGOZOTT` blokk VÉGÉRE kerül, a jelenlegi utolsó tétel
után (lásd "Korlátok" — nincs relatív fontosság szerinti beszúrás).

Magyar nyelven, a projekt többi `docs/*.md` fájljának stílusában (lásd
`CLAUDE.md` "Domain szókincs" — a séma-mezőneveket ne fordítsd le).

## Megerősítés írás előtt

Ne írj a lemezre, amíg a döntési fa minden ága le nincs zárva ÉS a
felhasználó jóvá nem hagyta az összefoglalót. Mutasd meg a teljes tervezett
tartalmat (nem csak a diffet, hiszen új fájl), és csak kifejezett
jóváhagyás után hozz létre bármit — ugyanaz az elv, mint az
`update-changelog`/`update-features` skilleknél.

B módban ez KÉT külön megerősítési pont, ebben a sorrendben:

1. **Jelölt-választás** (csak több-ötletes nyers jegyzetnél) — a
   felsorolt, jelzésekkel ellátott jelöltek közül a felhasználó választ
   pontosan egyet, mielőtt a döntési interjú elindulna.
2. **Végleges tartalom** — a döntési interjú végén EGYSZERRE mutasd meg
   az új `### N. tétel` bekezdés teljes szövegét ÉS a
   `backlog-N-*-terv.md` teljes tervezett tartalmát. A tétel-szám ekkor
   kerül véglegesen újraellenőrzésre (lásd "Mikor fut" B/2. pont) — ha
   időközben foglalt lett, a következő szabad számra kell váltani, és ezt
   jelezni a felhasználónak, mielőtt írnál.

A módban (meglévő, terv nélküli tétel) a folyamat változatlan: ha a
`backlog/BACKLOG.md` megfelelő tétele még nem hivatkozik a most létrehozott
tervfájlra, ajánld fel egyetlen sor hozzáadását (`**Terv:**
backlog/plans/backlog-N-...-terv.md`) a meglévő tétel végére — ez a
`backlog/BACKLOG.md`-ben már ma is meglévő minta, nem új konvenció.

## Megjegyzések

- A `backlog/BACKLOG.md` fejlécének megfogalmazása szerint a MOST szakasz
  tételeihez tartozó tervdokumentumok mind "grill-me munkamenetek döntési
  összefoglalói" — ez a skill ugyanezt a műfajt folytatja, csak szigorúbb
  korlátokkal és a projekt saját formátumára szabva.
- Ha egy döntés menet közben kiderül, hogy valójában egy MEGLÉVŐ D-pontot
  pontosít (nem újat vezet be), a tervdokumentum "Miért" bekezdése ezt
  mondja ki explicit (a 25. tétel 1. döntése a minta: "Ez pontosítja, nem
  törli el D26-ot") — ez segíti a későbbi lezárás 2. lépését, de maga az
  átvezetés nem ennek a skillnek a feladata.
- B módban a tétel-szám sosem "foglalható le" előre, munkamenetek között —
  minden `/planning` futás a saját írása előtti pillanatban dönti el a
  következő szabad számot.
