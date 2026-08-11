---
name: planning
description: Interview the user about a not-yet-decided backlog item (or a brand-new idea) branch by branch until every decision is resolved, then write a backlog/plans/backlog-N-<slug>-terv.md decision summary. Never writes or edits application code — planning documents only. Invoke explicitly with /planning.
disable-model-invocation: true
---

# Planning

## Cél

Egy még kidolgozatlan backlog-tételről (vagy egy most felmerülő, még be nem
sorolt ötletről) áganként végigmenni minden döntésen, amíg a felhasználó és
a fejlesztő között nincs félreértés — mielőtt egyetlen sor kód is íródna. A
kimenet egy `backlog/plans/backlog-N-<cím>-terv.md` döntési összefoglaló, a
meglévő, nyitott tervdokumentumok (pl.
`backlog/plans/backlog-18-fazis-torles-terv.md`) mintájára.

**Ez a skill soha nem ír és nem módosít alkalmazáskódot** (`app/`, `data/`,
`assets/` alatt semmit). Amit ír:

- egy új `backlog/plans/backlog-N-<cím>-terv.md` fájlt,
- és — csak ha a döntés kész — a megfelelő `backlog/BACKLOG.md` tétel
  egyetlen `**Terv:**` sorát, ha az még hiányzik.

Ha egy döntés menet közben valamelyik `docs/01`–`docs/07` fájl JELENLEGI
szövegét pontosítaná (pl. egy D-döntés árnyalása, mint a 25. tételnél a
D26-nál) — ezt NEM ez a skill vezeti át; az a `CLAUDE.md` "Backlog-tétel
lezárása" checklist 2. lépése, egy KÉSŐBBI, az implementáció UTÁNI, külön
explicit lépés. Ez a skill csak a nyitott, implementáció ELŐTTI beszélgetést
zárja le.

## Mikor fut

Explicit indítás: `/planning`. Soha nem automatikus. Tipikusan akkor, amikor:

- egy `backlog/BACKLOG.md`-ben már szereplő tételhez ("N. tétel") még nincs
  `**Terv:**` sor, vagy
- valaki egy vadonatúj ötletet vet fel, ami még nincs a backlogban.

Ha a tétel még nincs a backlogban: ez a skill NEM sorolja be, NEM ad neki
sorszámot, és NEM írja meg a `Méret`/`Kereteket sért?`/`Valódi haszon`/
`20%-os verzió` triázs-blokkot — az a backlog rangsorolás (doktor-nap +
architekt-triázs) feladata, külön kör. Jelezd ezt, és javasold, hogy a
triázs-blokk előbb kerüljön be a `backlog/BACKLOG.md`-be, utána jöhet ez a
skill.

## Előkészítés — mielőtt egy kérdést is felteszel

1. Olvasd el a célzott `backlog/BACKLOG.md` tételt (ha van sorszáma) — a
   `Méret`/`Kereteket sért?`/`Valódi haszon`/`20%-os verzió` blokk már
   tartalmazhat kötöttségeket, amiket nem kell újra megkérdezni.
2. Olvasd el a `docs/01-attekintes-es-dontesek.md` D-táblázatát és a
   `CLAUDE.md` "Sérthetetlen szabályok" táblázatát. Ezek nem tárgyalási
   alap — ha egy döntési ág ütközik egy meglévő D-ponttal, ezt EXPLICIT
   módon vesd fel, ne csendben kerülgesd, és ne csendben fogadd el az
   ütközést.
3. Fuss át a `backlog/BACKLOG.md` "EGYÉB ötletek" szakaszán — ha egy
   felmerülő ötlet egy már mérlegelt és elvetett irány, mondd ki, és
   kérdezd meg, mi változott azóta, ami miatt most mégis felmerül.
4. Ha a tétel érint egy `CLAUDE.md` "Meglévő segédfüggvények" alatt
   listázott függvényt/mintát, vedd figyelembe — a döntéseknek ezekre kell
   épülniük, nem újra feltalálni őket. (Ez csak tájékozódás, nem
   függvényszignatúra-tervezés — lásd Korlátok.)

## Hogyan dolgozz

Ugyanaz az interjú-mechanika, ami eddig is bevált:

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
  Az egy KÉSŐBBI, implementáció utáni, önálló lépés (döntések átvezetése a
  `docs/02`–`07`-be, D-táblabővítés, tervfájl `backlog/done/`-ba
  mozgatása). Ez a skill csak idáig visz: implementáció-indításra kész
  döntési összefoglaló.
- **Nem sorolja be és nem priorizálja** a tételt a `backlog/BACKLOG.md`-ben,
  ha az még nincs ott (lásd "Mikor fut").

## Kimenet — formátum

Fájlnév: `backlog/plans/backlog-N-<rövid-szlug>-terv.md`, ahol `N` a
`backlog/BACKLOG.md`-beli tételszám (ha van; ha nincs, ne találj ki egyet —
lásd "Mikor fut").

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

Magyar nyelven, a projekt többi `docs/*.md` fájljának stílusában (lásd
`CLAUDE.md` "Domain szókincs" — a séma-mezőneveket ne fordítsd le).

## Megerősítés írás előtt

Ne írj a lemezre, amíg a döntési fa minden ága le nincs zárva ÉS a
felhasználó jóvá nem hagyta az összefoglalót. Mutasd meg a teljes tervezett
tartalmat (nem csak a diffet, hiszen új fájl), és csak kifejezett
jóváhagyás után hozd létre a fájlt — ugyanaz az elv, mint az
`update-changelog`/`update-features` skilleknél.

Ha a `backlog/BACKLOG.md` megfelelő tétele még nem hivatkozik a most
létrehozott tervfájlra, ajánld fel egyetlen sor hozzáadását
(`**Terv:** backlog/plans/backlog-N-...-terv.md`) a meglévő tétel végére —
ez a `backlog/BACKLOG.md`-ben már ma is meglévő minta, nem új konvenció.

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
