---
name: implement
description: Implement one planned backlog item from its file (backlog/<slug>.md with Status: planned) on the local master — validation, ff-only sync, baseline-drift preflight, implementation within the plan's scope, then the quality gate (build, lint, test, docs-check). Stops WITHOUT committing; /finish closes the item. --worktree runs the same in a dedicated git worktree for parallel sessions. Invoke explicitly with /implement <slug>.
argument-hint: <slug> [--worktree]
disable-model-invocation: true
---

# /implement <slug> [--worktree]

Egy már megtervezett tételt visz végig a tételfájltól a zöld minőségi kapuig, és
**ott megáll — nem commitol**. A lezárás (docs, a tételfájl törlése, commit) a
`/finish <slug>` dolga. A fájlalak: `backlog/CLAUDE.md`.

Alapértelmezés: a helyi `master`-en, worktree és PR nélkül — egy session-re való.
`--worktree`: elkülönített worktree, párhuzamos sessionökhöz (lásd a végén).

Kövesd a lépéseket sorban, megállás nélkül, amíg valamelyik kifejezetten meg nem állít.

## 1. Validáció

A tételfájl `backlog/<slug>.md`. Olvasd ki a fejlécét. **Állj meg**, ha:

- a fájl nem létezik,
- `Status:` nem `planned` — egy `idea` előbb `/plan <slug>` (bugnál `--quick`),
- `Type: doki` — emberi teendő, nem implementálható,
- a `git status` a feladathoz nem tartozó, commitolatlan módosítást mutat — kérdezd
  meg a dokit, mi legyen vele; ne építs rá és ne írd felül.

## 2. Master frissítése

`git fetch origin`, majd `git pull --ff-only origin master`.

- Ha a fast-forward nem lehetséges (divergens helyi master): **állj meg és jelentsd**.
- Ha sikerült: `git log origin/master..HEAD --oneline` — push-olatlan commitok esetén
  figyelmeztetés a záró jelentésbe, de folytasd.

## 3. Preflight — baseline-drift

Olvasd ki a `Target` és `Baseline` sort, és hasonlítsd a `Baseline`-t a
`git rev-parse origin/master`-hez.

- **Egyezik:** tovább.
- **Eltér:** a `Current state` minden fájljára/symboljára/tesztjére: létezik-e még, és
  változott-e (`git diff --stat <Baseline>..origin/master -- <fájlok>`, a symbol/tesztnév
  grep-je). Jelentsd egy rövid listában, mi mozdult el és érinti-e a plan feltevéseit.
  Ha a plan valamely döntése emiatt nem áll meg, **állj meg** és kérdezz. Csak ezután
  írd át a plan `Baseline` sorát az aktuális SHA-ra.

## 4. Implementáció

Implementáld a plan `Approach` + `Decisions` scope-ját — ne bővítsd,
és ne kerekítsd le egy ott nem eldöntött irányba. Ha menet közben a plan hibásnak
bizonyul, állj meg és mondd ki; ne dönts helyette csendben. Ha közben a tételhez nem
tartozó hibát vagy teendőt találsz, ne javítsd: `/idea <slug>` a záró jelentés után.

Új logika előtt a terület nested `CLAUDE.md`-jének „Find before writing” indexét nézd
át (`app/src`, `domain`, `storage`, `pdf`) — ne duplikálj meglévő helpert. A
kommentekre a root `CLAUDE.md` Kommentek szabálya áll (csak WHY, nincs azonosító).

A plan `Verification` szakaszának `tests` tételét itt teljesítsd: a leírt megfigyelhető
viselkedésre teszt, konkrét tesztnévvel, `.skip`/`.only` nélkül.

## 5. Minőségi kapu

Az `app/` alatt, mind zöldig:

```
npm run build
npm run lint
npm test
npm run docs-check
```

Ha bármelyik hibázik, javítsd és futtasd újra. A `docs-check` zöld (0 hiba) — D-szám,
legacy-hivatkozás, elrontott anchor, budget-túllépés → javítás, nem allowlist.

## 6. Megállás és jelentés

**Ne commitolj.** Foglald össze:

- mi valósult meg, a plan döntéseihez igazítva;
- a plan `Verification` mely tételei teljesültek (tests, typecheck/lint, docs-check),
  és melyik manual-check szelet van még hátra (azt a `/finish` futtatja);
- ha a 2. lépésben push-olatlan commitot találtál, a listája;
- a következő lépés: `/finish <slug>` (worktree-nél `/finish <slug> --worktree`).

---

## `--worktree` mód

A 1. lépés a FŐ könyvtárban fut, worktree nélkül. Utána:

**Worktree létrehozása vagy belépés.** `git worktree list` — ha nincs
`.claude/worktrees/<slug>`: `EnterWorktree(name: "<slug>")` (friss branch
`origin/master`-ről). Ha van: `EnterWorktree(path: ".claude/worktrees/<slug>")`, majd
térképezd fel az állapotát (`git log`, `git status`), ne kezdd elölről, amit már
elvégeztek benne. Félbehagyott rebase (`.git/rebase-merge` / `rebase-apply`): ha még
konfliktusos, **állj meg** és kérd a dokit a feloldásra + `git rebase --continue`-ra; ha
már lezárt, futtasd újra a minőségi kaput, és a jelentésben jelezd.

Ettől a ponttól **kizárólag a worktree-ben dolgozz.** A worktree friss checkout:
`cd app && npm install` az első teszt előtt. A 2. lépés (ff-only pull) kimarad — a
branch `origin/master`-ről indult; a 3–6. lépés változatlan. Ne hívd az `ExitWorktree`-t;
a rebase/push/PR a `/finish --worktree` dolga.
