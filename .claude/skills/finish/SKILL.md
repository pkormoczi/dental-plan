---
name: finish
description: Close one implemented, manually verified backlog item — fix loop on the quality gate (stop and hand back to the doki if a fix changes visible behaviour), docs-check, documentation ONLY when non-derivable context appeared, then scripts/workflow/close.mjs (scope guard, final gate, git rm backlog[/later]/<slug>.md, commit "<slug>: <cím>", immediate push to origin/master; on a worktree branch: rebase, force-with-lease, PR; resumes an interrupted run). Call it only AFTER the doki checked the working tree — the master push deploys to Pages. Invoke explicitly with /finish <slug>.
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
nem maradhat. (A végleges, bizonyító kapu a 4. lépés scriptjében fut újra.)

**Ha a javítás a doki által látott viselkedést változtatja** (nem csak típus, teszt, lint
vagy szöveg a kódban), **állj meg**: add vissza a tételt a dokinak a kézi tesztlista érintett
pontjaival, és csak az újbóli ellenőrzés után folytasd. A kipróbált és a publikált viselkedés
nem térhet el.

## 2. `npm run docs-check`

Zöld (0 hiba). D-szám, legacy-hivatkozás, elrontott anchor, budget-túllépés →
javítás, nem allowlist.

## 3. Dokumentáció — csak ha kell

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

## 4. Lezárás — `close.mjs`

```
node scripts/workflow/close.mjs <slug> --title "<cím>" --body "<1–2 mondat magyarul>" \
  --trailer "Co-Authored-By: …" --trailer "Claude-Session: …"
```

A cím a tételfájl `## Goal` mondatának rövid alakja; a commit első sora `<slug>: <cím>`. A
script sorban: fetch + ff; **hatókör-őr** (untracked fájl csak `app/ docs/ data/ assets/` alatt
mehet a commitba); a **teljes kapu** (`build`, `lint`, `test`, `docs-check`);
`git rm backlog[/later]/<slug>.md` (a tételt a `Prio` szerinti mappában találja meg); a
követett módosítások és az engedett új fájlok stage-elése;
commit; `git push origin master`. Ha az origin közben előrelépett: rebase, **a kapu újra**,
push.

Ha a script megáll, jelentsd a kimenetét és **ne kerüld meg kézi `git commit`/`push`-sal**.
A három tipikus megállás és a teendő:

- **untracked fájl a körön kívül** — a doki dönt: törli, ignore-olja vagy külön commitolja
  (`commit-push.mjs`), aztán újra `/finish`;
- **a tervfájl módosított, a `git rm` megtagadta** — ha a módosítás kell:
  `commit-push.mjs -m "backlog: plan <slug> frissítve" -- <a tételfájl útvonala, a close.mjs
  kiírja>`; ha nem: `git checkout -- <útvonal>`; aztán újra;
- **rebase-konfliktus a push előtt** — a rebase félben marad; a doki feloldja,
  `git rebase --continue`, majd `node scripts/workflow/sync.mjs` (a kapu újra fut a push
  előtt). Piros kapu a rebase után: javítás, majd szintén `sync.mjs`.

**Folytatás-mód:** ha a lezáró commit már létezik (a script egy korábbi futása a push vagy a
PR előtt szakadt meg), ugyanez a hívás felismeri (`<slug>: …` tárgyú, push-olatlan commit),
nem commitol újra: kapu, majd a hiányzó publikálási lépés. Tiszta munkafát követel.

## 5. Záró jelentés

- mi valósult meg, a plan döntéseihez igazítva;
- a commit rövid SHA-ja és a mondat: *„fent az `origin/master`-en, a Pages deploy elindult”*;
- volt-e docs-diff, és ha igen, melyik fájl melyik sora;
- emlékeztető: a `/update-changelog` és a `/update-features` külön, kézi hívásra fut —
  ha a tétel a doki számára látható változást hozott, futtasd le őket.

---

## `--worktree` mód

Az 1–3. lépés a worktree-ben fut (`.claude/worktrees/<slug>`, a `/implement --worktree`
hagyta ott). A 4. lépés ugyanaz a `close.mjs` hívás: a script a nem-master branchen
commit után `git rebase origin/master`-t futtat (base-változásnál a kapu újra; konfliktusnál
megáll, a rebase félben marad — a doki oldja fel és `git rebase --continue`, majd újra
`/finish <slug> --worktree`, ami folytatás-módban megy tovább), `git push --force-with-lease -u`,
és `gh pr create --base master` (ha nincs még PR; a `gh` hiánya vagy hibája nem hiba, ilyenkor
a PR kézi). A záró jelentésben a worktree útvonala, a branch neve és a PR URL-je. Ne hívd az
`ExitWorktree`-t — a doki dönt a worktree sorsáról.
