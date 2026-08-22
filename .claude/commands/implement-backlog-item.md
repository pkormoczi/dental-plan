---
description: Egy backlog-tétel implementálása elejétől commitig, helyi masteren, worktree és PR nélkül.
argument-hint: <tétel-szám>
disable-model-invocation: true
---

# Backlog-tétel implementálása — $1. tétel

Ez a parancs egy `backlog/BACKLOG.md`-ben szereplő, már megtervezett tételt
visz végig a kódrésztől a teljes `CLAUDE.md` "Backlog-tétel lezárása"
checklistig, **közvetlenül a helyi masteren**, worktree és PR nélkül. A
munka a végén egyetlen commit-ban landol, és **ott meg is áll** — a
push-ot a doki kézi jóváhagyása után, külön a `/push-backlog-item`
paranccsal kell elindítani.

Ez a változat egyszerre egy session-re való. Ha párhuzamosan több
session-ben dolgozol egyszerre, használd az
`/implement-backlog-item-worktree`-t helyette (elkülönített worktree +
PR-flow).

Kövesd az alábbi lépéseket sorban, megállás nélkül, amíg valamelyik lépés
kifejezetten meg nem állít.

## 1. Előzetes validáció

Olvasd el a `backlog/BACKLOG.md`-t, és keresd meg a `### $1. tétel`
kezdetű bekezdést (a záró elválasztó lehet `—` vagy `:`, ne ez döntsön).

Állítsd meg magad, és **ne lépj tovább a 2. lépésre**, ha bármelyik igaz:

- a tétel nem található a fájlban,
- a `NEM FEJLESZTÉS` szakasz alatt van (nem a `KIDOLGOZOTT` alatt),
- a `KIDOLGOZOTT` alatt van, de nincs `**Terv:**` sora (még nincs
  döntési összefoglaló hozzá — a doki futtassa előbb a `/planning`-ot).

Ilyenkor magyarázd el röviden, miért nem indítható az implementáció.

Ha a tétel rendben van, jegyezd meg a `**Terv:**` sorban hivatkozott
`backlog/plans/backlog-$1-*-terv.md` útvonalat a következő lépéshez.

## 2. Master frissítése és állapot-ellenőrzés

Nézd meg `git status`-szal, nincs-e a munkakönyvtárban a mostani
feladathoz nem tartozó, commitolatlan módosítás. Ha van, állj meg és
kérdezd meg a dokit, mi legyen vele — ne kezdj hozzá rá építve vagy
felülírva.

Futtasd le: `git fetch origin`, majd `git pull --ff-only origin master`.

- **Ha a fast-forward pull nem lehetséges** (a helyi master eltért az
  origin/master-től): állj meg és jelentsd — ne kezdd el az
  implementációt elavult vagy divergens alapon. A doki oldja fel kézzel
  (pl. korábbi, még push-olatlan munka rendezésével).
- **Ha sikerült:** nézd meg, van-e a helyi masteren már push-olatlan
  commit (`git log origin/master..HEAD`). Ha van, **jelezd**
  figyelmeztetésként (mennyi és melyik tétel(ek)), de **folytasd** — nem
  akadály, csak a záró jelentésben térj vissza rá.

## 3. Terv beolvasása és implementáció

Olvasd el a `backlog/plans/backlog-$1-*-terv.md` döntési összefoglalót
(és a rá hivatkozott hátteret, ha releváns). Implementáld a "Döntések"
szakaszban rögzített scope-ot — ne bővítsd ki, ne kerekítsd le a
hatókört egy másik, ott nem eldöntött irányba.

A `CLAUDE.md`-ben felsorolt "Meglévő segédfüggvények" listát nézd át,
mielőtt új logikát írnál — ne duplikálj olyat, ami már létezik.

## 4. Minőségi kapu

Az `app/` alatt futtasd le mindhármat:

```
npm run build
npm run lint
npm test
```

Ha bármelyik hibával fut, javítsd és futtasd újra — ne lépj tovább az
5. lépésre, amíg mindhárom zöld.

## 5. Backlog-tétel lezárása (CLAUDE.md checklist, ugyanebben a körben)

Kövesd a `CLAUDE.md` "Backlog-tétel lezárása" szakaszának 2–5. lépését
teljes egészében:

1. **Döntések átvezetése** — a tervdokumentum tartósan érvényes döntései
   prózaként, önhordozóan a megfelelő `docs/02`–`07` szakaszba (a szabály
   és az indoka egy helyen, azonosító nélkül); ha az invariáns valóban
   sérthetetlen, új sor a `CLAUDE.md` "Sérthetetlen szabályok" táblájába,
   a Miért oszlopban a tényleges indokkal, nem hivatkozással. **A
   `docs/01` D-táblája le van zárva: új döntés soha nem kap D-számot, és
   meglévő D-számra sem itt, sem máshol nem hivatkozunk új helyen.** Ha a
   tétel új, újrahasznosítható segédfüggvényt vezetett be, egy új
   bekezdés a "Meglévő segédfüggvények" alá, docs-anchorra hivatkozva
   (SOHA D-számra).

   **Konkurencia-ellenőrzés, mielőtt bármit felülírnál:** futtass
   `git fetch origin`-t, és nézd meg az `origin/master` aktuális
   `backlog/BACKLOG.md` mai állapotát. Ha időközben máshol lezárult ez a
   tétel, vagy a következő szabad tételszám eltolódott, **állj meg és
   jelentsd** — ne írj felül vakon egy elavult feltételezésre építve.

2. **Tervdokumentum archiválása** — `git mv backlog/plans/backlog-$1-*.md
   backlog/done/`. A tétel száma ezután véglegesen nyugdíjazva.

3. **Backlog-bejegyzés törlése + zárt-napló bővítése** — töröld a `### $1.
   tétel` teljes szakaszát a `backlog/BACKLOG.md`-ből (ne jelöld KÉSZ-nek,
   ne hagyj stub-ot), és írj egy tömör összefoglalót (méret, a végleges
   megoldás 1-2 mondatban, `docs/0X` hivatkozás) a
   `backlog/done/BACKLOG_DONE.md` végére — ez a bejegyzés NEM
   hivatkozhat az imént archivált tervfájlra.

4. **Referencia-seprés** — minden helyen (forráskód-kommentek, `CLAUDE.md`,
   `docs/*.md`), ahol az imént archivált tervfájlra vagy a
   `backlog/done/` mappára mutató hivatkozás volt, írd át a megfelelő,
   néven megnevezett `docs/0X` szakaszra — D-számra soha.

**Ne** futtasd le automatikusan a `/update-changelog`-ot vagy az
`/update-features`-t (mindkettő kizárólag kézi hívásra fut) — csak a
záró jelentésben írj emlékeztetőt a dokinak, hogy futtassa le őket, ha a
tétel felhasználó-szemszögű változást hozott.

## 6. Commit — és megállás

Stage-eld a módosított fájlokat, és commitolj a helyi masteren.

Commit-üzenet első sora: `$1. tétel: <a tétel BACKLOG.md-beli rövid
címe>`, a törzsben 1-2 mondatos magyar összefoglaló arról, mi valósult
meg.

**Itt állj meg.** Ne futtass `git push`-t, ne hozz létre PR-t, ne
rebase-elj a target branch-re — ez a `/push-backlog-item` dolga, a doki
kézi jóváhagyása után.

## 7. Záró jelentés

Foglald össze:

- mi valósult meg (a tervdokumentum döntéseihez igazítva),
- egy számozott, kézi tesztelési lista a dokinak,
- a most létrehozott commit rövid összefoglalója,
- ha a 2. lépésben találtál korábbi, még push-olatlan commitot, sorold
  fel azokat is (most már ezzel az újjal együtt várnak push-ra),
- egyértelmű jelzés: *"A commit a helyi masteren van, push-olatlan.
  Amint kézzel ellenőrizted és rendben van, add ki a
  `/push-backlog-item` parancsot (vagy mondd, hogy pusholhatom)."*
- emlékeztető a `/update-changelog`/`/update-features`-re, ha releváns.
