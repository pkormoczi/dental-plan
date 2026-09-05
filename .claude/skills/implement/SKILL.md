---
name: implement
description: Implement one planned backlog item from its file (backlog/<slug>.md in the backlog root — the folder is the status) on the local master — validation, sync (scripts/workflow/sync.mjs), baseline-drift preflight (scripts/workflow/drift.mjs), implementation within the plan's scope, then the quality gate (build, lint, test, docs-check). Stops WITHOUT committing and hands the doki a numbered manual test list — the manual check happens on the working tree, because /finish commits and pushes at once. --worktree runs the same in a dedicated git worktree for parallel sessions. Invoke explicitly with /implement <slug>.
argument-hint: <slug> [--worktree]
disable-model-invocation: true
---

# /implement <slug> [--worktree]

Egy már megtervezett tételt visz végig a tételfájltól a zöld minőségi kapuig, és
**ott megáll — nem commitol**. Itt van a doki kézi kapuja: a munkafán ellenőriz, mert a
`/finish` commitol és azonnal pushol, a master-push pedig a Pages-re élesít. A lezárás
(docs, a tételfájl törlése, commit, push) a `/finish <slug>` dolga. A fájlalak: `backlog/CLAUDE.md`.

Alapértelmezés: a helyi `master`-en, worktree és PR nélkül — egy session-re való.
`--worktree`: elkülönített worktree, párhuzamos sessionökhöz (lásd a végén).

Kövesd a lépéseket sorban, megállás nélkül, amíg valamelyik kifejezetten meg nem állít.

## 1. Validáció

A tételfájl `backlog/<slug>.md` — a gyökérben, mert a státusz a mappa. Olvasd ki a
fejlécét. **Állj meg**, ha:

- a fájl a gyökérben nem létezik — ha `backlog/idea/<slug>.md`-ként megvan, előbb
  `/plan <slug>` (bugnál `--quick`),
- `Type: doki` — emberi teendő, nem implementálható,
- a `git status` a feladathoz nem tartozó, commitolatlan módosítást mutat — kérdezd
  meg a dokit, mi legyen vele; ne építs rá és ne írd felül. (A `/finish` mindent commitol,
  ami a munkafán van — ezért kell itt tisztának lennie.)

## 2. Sync

`node scripts/workflow/sync.mjs` — fetch, ff-merge az `origin/master`-re, és ha megbukott
push maradt a masteren, felviszi. Ha a script megáll (divergencia, nem master, félbehagyott
rebase), **állj meg és jelentsd** a kimenetét.

## 3. Preflight — baseline-drift

`node scripts/workflow/drift.mjs <slug>`:

- **exit 0** (a `Baseline` óta nem változott app-kód): tovább.
- **exit 2** (a stat kiírva): a `Current state` minden fájljára/symboljára/tesztjére nézd meg,
  létezik-e még és változott-e (a stat + a symbol/tesztnév grep-je). Jelentsd egy rövid listában,
  mi mozdult el és érinti-e a plan feltevéseit. Ha a plan valamely döntése emiatt nem áll meg,
  **állj meg** és kérdezz. Ha állnak: `node scripts/workflow/drift.mjs <slug> --set` (a
  `Baseline` sor HEAD-re íródik; a `/finish` commitja viszi).
- **exit 1**: hibás vagy ismeretlen `Baseline` — állj meg és jelentsd.

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
- egy **számozott, kézi tesztelési lista** a dokinak — a munkafán, `npm run dev` mellett;
- egyértelmű jelzés: *„A kód a munkafán van, commitolatlan. Ellenőrizd a lista szerint; a
  `/finish <slug>` commitol és azonnal az `origin/master`-re pushol, ami a Pages-re élesít.”*;
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
`cd app && npm install` az első teszt előtt. A 2. lépés (sync) kimarad — a branch
`origin/master`-ről indult, és a tervfájl commitolt, tehát benne van; a 3–6. lépés
változatlan (a `drift.mjs` a branchen is a `Baseline..HEAD` app-diffet nézi). Ne hívd az
`ExitWorktree`-t; a rebase/push/PR a `/finish --worktree` dolga.
