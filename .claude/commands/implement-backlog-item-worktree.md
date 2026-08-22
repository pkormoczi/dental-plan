---
description: Egy backlog-tétel implementálása elejétől a teljes lezárásig, elkülönített worktree-ben és PR-en keresztül — párhuzamos session-ökhöz.
argument-hint: <tétel-szám>
disable-model-invocation: true
---

# Backlog-tétel implementálása worktree-ben — $1. tétel

Ez a parancs egy `backlog/BACKLOG.md`-ben szereplő, már megtervezett tételt
visz végig a kódrésztől a teljes `CLAUDE.md` "Backlog-tétel lezárása"
checklistig, egy erre a tételre dedikált git worktree-ben, PR-en keresztül.
Ez a változat akkor kell, ha **párhuzamosan több session-ben** dolgozol —
ha nem, használd inkább az `/implement-backlog-item`-et (helyi masteren,
worktree és PR nélkül, commitnál megáll).

Kövesd az alábbi lépéseket sorban, megállás nélkül, amíg valamelyik lépés
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

  Nézd meg azt is, nincs-e **félbehagyott rebase** (`git status` "rebase
  in progress" jelzése, vagy `.git/rebase-merge`/`.git/rebase-apply`
  jelenléte a worktree-ben). Ha van:
  - ha még konfliktusos fájlok vannak, állj meg és kérd meg a dokit, hogy
    oldja fel és futtassa a `git rebase --continue`-t, mielőtt újra
    kiadja ezt a parancsot;
  - ha a doki már lezárta a rebase-t (nincs több konfliktus, a rebase
    kész), folytasd a 6.5. lépés "konfliktus volt" ágával (minőségi kapu
    újrafuttatása), majd a 7. lépéssel.

  Azt is ellenőrizd (`gh pr view`), van-e már nyitott PR ehhez a
  branch-hez, és up-to-date-e a távoli branch a helyivel (nincs
  push-olatlan commit, nincs rebase-elendő drift). Ha igen, a 6–7. lépést
  ne futtasd újra — a 8. lépésben csak a meglévő PR URL-jét jelentsd.

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

## 6. Commit

Stage-eld a worktree-ben módosított fájlokat, és commitolj a worktree
branch-én (`backlog-$1`).

## 6.5. Rebase a target branch-re

`git fetch origin`, majd `git rebase origin/master` — ez teszi
fast-forward mergelhetővé a PR-t.

- **Ha a rebase konfliktusba fut:** állj meg, jelentsd a konfliktusos
  fájlokat, és **hagyd a rebase-t félbehagyott állapotban** — ne oldj fel
  semmit automatikusan, ne futtass `--abort`-ot. A doki oldja fel kézzel
  és futtassa a `git rebase --continue`-t, majd adja ki újra ezt a
  parancsot (lásd a 2. lépés resume-ágát). **Ne lépj tovább a 7.
  lépésre.**
- **Ha a rebase konfliktusmentesen lezárult:** ugorj a 7. lépésre, a 4.
  lépés minőségi kapujának eredménye érvényben marad, nem kell újra
  futtatni.
- **Ha a rebase konfliktussal zárult (akár most, akár egy korábbi,
  megszakított futásból folytatva):** futtasd újra mindhármat az `app/`
  alatt (`npm run build`, `npm run lint`, `npm test`) — a konfliktus
  feloldása módosíthatta a kódot. Ha bármelyik hibázik, javítsd és
  futtasd újra, mielőtt tovább mennél.

## 7. Push + Pull Request

`git push --force-with-lease` (mindig ezzel, első push esetén is
egységesen — a rebase mindig átírja a commit-hasheket).

Ellenőrizd `gh pr view`-val, van-e már nyitott PR ehhez a branch-hez.

- **Ha van, és a branch már up-to-date volt (a 6.5. lépés nem talált
  push-olandó változást):** ne hozz létre új PR-t.
- **Egyébként** hozz létre egyet:
  `gh pr create --base master --title "$1. tétel: <a tétel BACKLOG.md-beli
  rövid címe>" --body "<1-2 mondatos magyar összefoglaló arról, mi
  valósult meg — teszt­lépések NÉLKÜL, azok csak a záró jelentésben
  szerepelnek>"`.

**Ha a `gh` CLI nincs telepítve vagy nincs bejelentkezve:** a push ettől
függetlenül fusson le rendesen; a PR-lépést hagyd ki, és a 8. lépésben
jelezd egyértelműen, hogy a PR-t a dokinak kézzel kell létrehoznia.

## 8. Záró jelentés

Foglald össze:

- mi valósult meg (a tervdokumentum döntéseihez igazítva),
- egy számozott, kézi tesztelési lista a dokinak,
- a worktree útvonala és branch-neve,
- a létrehozott (vagy már meglévő) PR URL-je — vagy, ha a `gh` hiánya
  miatt nem jött létre, egyértelmű jelzés, hogy ezt kézzel kell pótolni,
- emlékeztető a `/update-changelog`/`/update-features`-re, ha releváns.

Ne hívd meg az `ExitWorktree`-t — a munkamenet a worktree-ben marad, amíg
a doki el nem dönti, mi legyen vele.
