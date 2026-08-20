---
description: Egy backlog-tétel implementálása elejétől a teljes lezárásig, elkülönített worktree-ben.
argument-hint: <tétel-szám>
disable-model-invocation: true
---

# Backlog-tétel implementálása — $1. tétel

Ez a parancs egy `backlog/BACKLOG.md`-ben szereplő, már megtervezett tételt
visz végig a kódrésztől a teljes `CLAUDE.md` "Backlog-tétel lezárása"
checklistig, egy erre a tételre dedikált git worktree-ben. Kövesd az
alábbi lépéseket sorban, megállás nélkül, amíg valamelyik lépés
kifejezetten meg nem állít.

## 1. Előzetes validáció (a FŐ könyvtárban, MÉG worktree nélkül)

Olvasd el a `backlog/BACKLOG.md`-t, és keresd meg a `### $1. tétel`
kezdetű bekezdést (a záró elválasztó lehet `—` vagy `:`, ne ez döntsön).

Állítsd meg magad, és **ne hozz létre worktree-t**, ha bármelyik igaz:

- a tétel nem található a fájlban,
- a `NEM FEJLESZTÉS` szakasz alatt van (nem a `KIDOLGOZOTT` alatt),
- a `KIDOLGOZOTT` alatt van, de nincs `**Terv:**` sora (még nincs
  döntési összefoglaló hozzá — a doki futtassa előbb a `/planning`-ot).

Ilyenkor magyarázd el röviden, miért nem indítható az implementáció, és
állj meg — ne menj tovább a 2. lépésre.

Ha a tétel rendben van, jegyezd meg a `**Terv:**` sorban hivatkozott
`backlog/plans/backlog-$1-*-terv.md` útvonalat a következő lépéshez.

## 2. Worktree létrehozása vagy meglévőbe belépés

Nézd meg, létezik-e már `.claude/worktrees/backlog-$1` (pl.
`git worktree list`).

- **Ha nem létezik:** `EnterWorktree(name: "backlog-$1")` — friss branch
  `origin/master`-ről.
- **Ha már létezik** (megszakított vagy korábban befejezett futásból):
  `EnterWorktree(path: ".claude/worktrees/backlog-$1")`, majd térképezd
  fel az állapotát (git log, git status, a worktree-beli
  `backlog/BACKLOG.md` állapota) mielőtt folytatod — ne hozz létre
  duplikátumot, és ne kezdd elölről, amit már elvégeztek benne.

Ettől a ponttól **kizárólag ebben a worktree-ben dolgozz** — minden
további fájlművelet, teszt és commit ide tartozik, a fő munkakönyvtárhoz
innentől ne nyúlj.

## 3. Terv beolvasása és implementáció

Olvasd el a `backlog/plans/backlog-$1-*-terv.md` döntési összefoglalót
(és a rá hivatkozott hátteret, ha releváns). Implementáld a "Döntések"
szakaszban rögzített scope-ot — ne bővítsd ki, ne kerekítsd le a
hatókört egy másik, ott nem eldöntött irányba.

A `CLAUDE.md`-ben felsorolt "Meglévő segédfüggvények" listát nézd át,
mielőtt új logikát írnál — ne duplikálj olyat, ami már létezik.

Mivel a worktree friss checkout, a `node_modules` nincs benne: először
futtasd le `cd app && npm install`-t, csak utána a fejlesztést/teszteket.

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
   prózaként a megfelelő `docs/02`–`07` szakaszba, az új sérthetetlen
   invariáns a `docs/01` D-táblájába (a következő szabad D-számmal) és
   szükség esetén a `CLAUDE.md` "Sérthetetlen szabályok" táblájába. Ha a
   tétel új, újrahasznosítható segédfüggvényt vezetett be, egy új
   bekezdés a "Meglévő segédfüggvények" alá, docs-anchorra/D-számra
   hivatkozva.

   **Konkurencia-ellenőrzés, mielőtt bármit felülírnál:** futtass
   `git fetch origin`-t, és nézd meg az `origin/master` aktuális
   `docs/01` D-táblájának legnagyobb számát és a `backlog/BACKLOG.md`
   mai állapotát. Ha időközben máshol lezárult ez a tétel, vagy a
   következő szabad D-szám eltolódott, **állj meg és jelentsd** — ne
   írj felül vakon egy elavult feltételezésre építve.

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
   `backlog/done/` mappára mutató hivatkozás volt, írd át a megfelelő
   `docs/0X` szakaszra vagy D-számra.

**Ne** futtasd le automatikusan a `/update-changelog`-ot vagy az
`/update-features`-t (mindkettő kizárólag kézi hívásra fut) — csak a
záró jelentésben írj emlékeztetőt a dokinak, hogy futtassa le őket, ha a
tétel felhasználó-szemszögű változást hozott.

## 6. Commit

Stage-eld a worktree-ben módosított fájlokat, és commitolj a worktree
branch-én (`backlog-$1`) — **ne pusholj, ne nyiss PR-t**, ez a doki
kézi lépése marad.

## 7. Záró jelentés

Foglald össze:

- mi valósult meg (a tervdokumentum döntéseihez igazítva),
- egy számozott, kézi tesztelési lista a dokinak,
- a worktree útvonala és branch-neve, és hogy push/PR indítása kézi
  következő lépés,
- emlékeztető a `/update-changelog`/`/update-features`-re, ha releváns.

Ne hívd meg az `ExitWorktree`-t — a munkamenet a worktree-ben marad, amíg
a doki el nem dönti, mi legyen vele.
