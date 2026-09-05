---
name: finish
description: Close one implemented, manually verified backlog item — fix loop on the quality gate, docs-check, the plan's manual-check slice if any, documentation ONLY when non-derivable context appeared, then scripts/workflow/close.mjs (final gate, git rm backlog/<slug>.md, commit "<slug>: <cím>", immediate push to origin/master; on a worktree branch: rebase, force-with-lease, PR). Call it only AFTER the doki checked the working tree — the master push deploys to Pages. Invoke explicitly with /finish <slug>.
argument-hint: <slug> [--worktree]
disable-model-invocation: true
---

# /finish <slug> [--worktree]

Egy `/implement <slug>` után álló, **kézzel már ellenőrzött** tétel lezárása. Csak a doki
ellenőrzése után hívd: a lépések végén a commit azonnal az `origin/master`-re kerül, és a
master-push a GitHub Pages-re élesít — utólagos javítás új tétel vagy revert. A lépések
sorrendje kötelező, egyik sem ugorható át; ahol „állj meg” van, ott nincs továbblépés.

## 1. Minőségi kapu — javító kör

Az `app/` alatt: `npm run build`, `npm run lint`, `npm test`. Bármi piros → javítsd,
futtasd újra. A tesztnevek konkrét, megfigyelhető viselkedést írjanak le; `.skip`/`.only`
nem maradhat. (A végleges, bizonyító kapu az 5. lépés scriptjében fut újra.)

## 2. `npm run docs-check`

Zöld (0 hiba). D-szám, legacy-hivatkozás, elrontott anchor, budget-túllépés →
javítás, nem allowlist.

## 3. Manual-check szelet

Nézd meg a plan `Verification` szakaszát. Ha manual-check szelet van bejelölve (`pdf`,
`visual-css`, `keyboard-a11y`), futtasd: `/manual-checks <szelet>` — izolált Chrome,
seed adat, a jelentés a `docs/reviews/`-ba (a lezáró commit viszi). Ha a szelet találatot
ad, ami a tételhez tartozik, **itt javítsd** (ez már implementációs kontextus, nem review),
és ismételd az 1–2. lépést; ami nem a tételé, az a jelentésben marad a doki döntésére
(`/idea`-val vehető fel).

## 4. Dokumentáció — csak ha kell

Default: **nincs docs-diff**, és ezt a záró jelentés kimondja. Írj csak akkor, ha a
tétel olyan contextet hozott létre, ami kódból és tesztből nem levezethető:

- termékszándék, nem-cél, jogi/adat-korlát → `docs/PRODUCT.md` megfelelő szakasza (a `##`
  címek slugja anchor-cél, ne változzon);
- discovery vagy gotcha (hol a párja, mit ne építs újra, mit nem lát a jsdom) → az
  érintett nested `CLAUDE.md`, **egy állítás egy sor**, path-qualified anchorral
  (`file:` / `symbol:` / `test:` / `product:`), a budgeten belül; ha nem fér, ne
  production-refactorral oldd — erősebb mechanizmust (teszt/típus/lint) vagy törlendő
  redundanciát keress;
- új, ismétlődően használandó helper → egy sor a nested „Find before writing” indexbe.

Nincs „döntések átvezetése” prózába, nincs referencia-seprés, nincs lezárt-tétel napló.
A tervfájl tartalma nem kerül át sehova — a git history elég.

## 5. Lezárás — `close.mjs`

```
node scripts/workflow/close.mjs <slug> --title "<cím>" --body "<1–2 mondat magyarul>" \
  --trailer "Co-Authored-By: …" --trailer "Claude-Session: …"
```

A cím a tételfájl `## Goal` mondatának rövid alakja; a commit első sora `<slug>: <cím>`. A
script sorban: fetch + ff (ha utána a `backlog/<slug>.md` nincs meg, máshol lezárták → megáll);
a **teljes kapu** (`build`, `lint`, `test`, `docs-check`); `git rm backlog/<slug>.md`; minden
munkafa-változás stage-elése (ezért kellett az `/implement` 1. lépésében tiszta fa); commit;
`git push origin master`. Ha az origin közben előrelépett: rebase, **a kapu újra**, push;
konfliktusnál a rebase félben marad — a doki oldja fel, `git rebase --continue`, majd
`node scripts/workflow/sync.mjs --gate`.

Ha a script megáll, jelentsd a kimenetét és **ne kerüld meg kézi `git commit`/`push`-sal**:
piros kapu → vissza az 1. lépésre; egyéb → a doki dönt.

## 6. Záró jelentés

- mi valósult meg, a plan döntéseihez igazítva;
- a commit rövid SHA-ja és a mondat: *„fent az `origin/master`-en, a Pages deploy elindult”*;
- volt-e docs-diff, és ha igen, melyik fájl melyik sora;
- emlékeztető: a `/update-changelog` és a `/update-features` külön, kézi hívásra fut —
  ha a tétel a doki számára látható változást hozott, futtasd le őket.

---

## `--worktree` mód

Az 1–4. lépés a worktree-ben fut (`.claude/worktrees/<slug>`, a `/implement --worktree`
hagyta ott). Az 5. lépés ugyanaz a `close.mjs` hívás: a script a nem-master branchen
commit után `git rebase origin/master`-t futtat (base-változásnál a kapu újra; konfliktusnál
megáll, a rebase félben marad — a doki oldja fel és `git rebase --continue`, majd újra
`/finish <slug> --worktree`), `git push --force-with-lease -u`, és `gh pr create --base master`
(ha nincs még PR; a `gh` hiánya nem hiba, ilyenkor a PR kézi). A záró jelentésben a worktree
útvonala, a branch neve és a PR URL-je. Ne hívd az `ExitWorktree`-t — a doki dönt a worktree
sorsáról.
