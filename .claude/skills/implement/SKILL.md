---
name: implement
description: Implement one planned backlog item from its file (backlog/<slug>.md in the backlog root — the folder is the status) on the local master — validation, sync (scripts/workflow/sync.mjs), baseline-drift preflight (scripts/workflow/drift.mjs, report-only), implementation within the plan's scope, the quality gate (build, lint, test, docs-check), the plan's manual-check slice if any, and a diff self-review against the plan. Stops WITHOUT committing and hands the doki a numbered manual test list — the manual check happens on the working tree, because /finish commits and pushes at once. --worktree runs the same in a dedicated git worktree for parallel sessions. Invoke explicitly with /implement <slug>.
argument-hint: <slug> [--worktree]
disable-model-invocation: true
---

# /implement <slug> [--worktree]

Egy már megtervezett tételt visz végig a tételfájltól a zöld kapuig és a kézi átadásig, és
**ott megáll — nem commitol**. Itt van a doki kézi kapuja: a munkafán ellenőriz, mert a
`/finish` commitol és azonnal pushol, a master-push pedig a Pages-re élesít. Minden gépi és
böngészős ellenőrzés **az átadás előtt** fut le, hogy a doki által kipróbált és a publikált
viselkedés ugyanaz legyen. A lezárás (docs, a tételfájl törlése, commit, push) a
`/finish <slug>` dolga. A fájlalak: `backlog/CLAUDE.md`.

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
  meg a dokit, mi legyen vele; ne építs rá és ne írd felül. A `/finish` a követett
  módosításokat és az `app/`, `docs/`, `data/`, `assets/` alatti új fájlokat commitolja; más
  helyen álló új fájl (pl. jegyzet a gyökérben) a lezárást megállítja.

## 2. Sync

`node scripts/workflow/sync.mjs` — fetch, ff-merge az `origin/master`-re; ha megbukott
vagy félbeszakadt futásból push-olatlan commit maradt, a teljes kapu után felviszi. Ha a
script megáll (nem master, félbehagyott rebase, piros kapu), **állj meg és jelentsd** a
kimenetét.

## 3. Preflight — baseline-drift

`node scripts/workflow/drift.mjs <slug>` — csak jelez, a `Baseline` sort nem írja át:

- **exit 0** (a `Baseline` óta nem változott app-kód): tovább.
- **exit 2** (a stat kiírva): a `Current state` minden fájljára/symboljára/tesztjére nézd meg,
  létezik-e még és változott-e (a stat + a symbol/tesztnév grep-je). Ha a plan valamely döntése
  emiatt nem áll meg, **állj meg** és kérdezz. Ha állnak, folytasd; a záró jelentés mondja ki,
  mi mozdult el és miért áll a plan. A tervfájlhoz ne nyúlj — ha mégis módosítani kell (döntés
  változott), az külön `commit-push.mjs -m "backlog: plan <slug> frissítve"`, különben a
  `/finish` megáll rajta.
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

## 5b. Manual-check szelet

Nézd meg a plan `Verification` szakaszát. Ha manual-check szelet van bejelölve (`pdf`,
`visual-css`, `keyboard-a11y`), futtasd most: `/manual-checks <szelet>` — izolált Chrome,
seed adat, a jelentés a `docs/reviews/`-ba (untracked marad, a `/finish` lezáró commitja
viszi). Ha a szelet a tételhez tartozó találatot ad, javítsd és ismételd az 5. lépést; ami
nem a tételé, az a jelentésben marad a doki döntésére (`/idea`-val vehető fel).

## 5c. Diff-önellenőrzés

`git diff` (és `git status`) a plan ellen, három kérdés, három sor a jelentésbe:
teljesül-e a `Goal` a leírt megfigyelhető viselkedéssel; maradt-e kezeletlen szélső eset,
amit a plan vagy a teszt említ; került-e a diffbe a tételhez nem tartozó módosítás (ha igen,
vedd ki, vagy mondd ki, miért kell). Nem architektúra-review — csak ez a három kérdés.

## 6. Megállás és jelentés

**Ne commitolj.** Foglald össze:

- mi valósult meg, a plan döntéseihez igazítva; drift esetén mi mozdult el és miért áll a plan;
- a plan `Verification` mely tételei teljesültek (tests, typecheck/lint, docs-check,
  manual-check szelet), és a diff-önellenőrzés három sora;
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
