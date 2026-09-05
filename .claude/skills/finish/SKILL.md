---
name: finish
description: Close one implemented backlog item — quality gate (build, lint, test), docs-check, the plan's manual-check slice if any, documentation ONLY when non-derivable context appeared, then git rm the plan file, delete the item's section from BACKLOG.md, and commit on the local master. Stops after the commit; pushing is /push-backlog-item. --worktree instead rebases, pushes with --force-with-lease and opens the PR. Invoke explicitly with /finish <slug>.
argument-hint: <slug | backlog-N-…-terv.md> [--worktree]
disable-model-invocation: true
---

# /finish <slug> [--worktree]

Egy `/implement <slug>` után álló, kódszinten kész tétel lezárása. A lépések sorrendje
kötelező, egyik sem ugorható át; ahol „állj meg” van, ott nincs továbblépés.

## 1. Minőségi kapu

Az `app/` alatt: `npm run build`, `npm run lint`, `npm test`. Bármi piros → javítsd,
futtasd újra. A tesztnevek konkrét, megfigyelhető viselkedést írjanak le; `.skip`/`.only`
nem maradhat.

## 2. `npm run docs-check`

Az érintett fájlokban nulla találat, az összesített hibaszám nem nőtt a tétel
kiindulásához képest. D-szám, legacy-hivatkozás, elrontott anchor, budget-túllépés →
javítás, nem allowlist.

## 3. Manual-check szelet

Nézd meg a plan `Verification` szakaszát. Ha manual-check szelet van bejelölve (`pdf`,
`visual-css`, `keyboard-a11y`), futtasd: `/manual-checks <szelet>` — izolált Chrome,
seed adat, a jelentés a `docs/reviews/`-ba. Ha a szelet találatot ad, ami a tételhez
tartozik, javítsd és ismételd az 1–2. lépést; ami nem a tételé, az a jelentésben marad
a doki döntésére. Régi formátumú tervnél (nincs `Verification` checkbox) a
`.claude/skills/manual-checks/SKILL.md` kadencia-táblája dönt a változás típusa alapján.

## 4. Dokumentáció — csak ha kell

Default: **nincs docs-diff**, és ezt a záró jelentés kimondja. Írj csak akkor, ha a
tétel olyan contextet hozott létre, ami kódból és tesztből nem levezethető:

- termékszándék, nem-cél, jogi/adat-korlát → `PRODUCT.md` megfelelő szakasza (a `##`
  címek slugja anchor-cél, ne változzon);
- discovery vagy gotcha (hol a párja, mit ne építs újra, mit nem lát a jsdom) → az
  érintett nested `CLAUDE.md`, **egy állítás egy sor**, path-qualified anchorral
  (`file:` / `symbol:` / `test:` / `product:`), a budgeten belül; ha nem fér, ne
  production-refactorral oldd — erősebb mechanizmust (teszt/típus/lint) vagy törlendő
  redundanciát keress;
- új, ismétlődően használandó helper → egy sor a nested „Find before writing” indexbe.

Nincs „döntések átvezetése” prózába, nincs referencia-seprés, nincs lezárt-tétel napló.
A tervfájl tartalma nem kerül át sehova — a git history elég.

## 5. Tervfájl és `BACKLOG.md`

**Konkurencia-ellenőrzés előbb:** `git fetch origin`, és nézd meg az `origin/master`
`backlog/BACKLOG.md`-jét. Ha a tétel szakasza ott már nincs meg (máshol lezárták),
**állj meg és jelentsd**.

Azután:

- `git rm backlog/plans/<tervfájl>` (a slug-fájl vagy a régi `backlog-N-*-terv.md`);
- töröld a `### N. tétel` teljes szakaszát a `backlog/BACKLOG.md`-ből — ne jelöld
  KÉSZ-nek, ne hagyj stubot;
- a fejléc `**Legutóbb kiosztott szám:**` sorát **ne csökkentsd** — a szám végleg
  nyugdíjazott.

## 6. Commit — és megállás

Stage-eld a tétel fájljait, és commitolj a helyi masteren. Első sor:
`<N>. tétel: <a BACKLOG.md-beli rövid cím>`; törzs: 1–2 mondat magyarul arról, mi
valósult meg; a repó szokásos lábléce.

**Itt állj meg.** Nincs `git push`, nincs PR — a doki kézi ellenőrzése után a
`/push-backlog-item` parancs dolga.

## 7. Záró jelentés

- mi valósult meg, a plan döntéseihez igazítva;
- egy **számozott, kézi tesztelési lista** a dokinak;
- a commit rövid összefoglalója, és a helyi masteren várakozó, push-olatlan commitok
  listája (ezzel együtt);
- volt-e docs-diff, és ha igen, melyik fájl melyik sora;
- egyértelmű jelzés: *„A commit a helyi masteren van, push-olatlan. Amint kézzel
  ellenőrizted, add ki a `/push-backlog-item` parancsot.”*;
- emlékeztető: a `/update-changelog` és a `/update-features` külön, kézi hívásra fut —
  ha a tétel a doki számára látható változást hozott, futtasd le őket.

---

## `--worktree` mód

Az 1–5. lépés a worktree-ben fut (`.claude/worktrees/<slug>`, a `/implement --worktree`
hagyta ott). A 6. lépés helyett:

1. **Commit** a worktree branch-én, a fenti üzenettel.
2. **Rebase:** `git fetch origin`, `git rebase origin/master`. Konfliktusnál **állj meg**,
   jelentsd a fájlokat, hagyd a rebase-t félbe (nincs `--abort`, nincs automatikus
   feloldás) — a doki oldja fel és `git rebase --continue`, majd újra `/finish <slug>
   --worktree`. Konfliktussal zárult rebase után az 1–2. lépés kapuját futtasd újra.
3. **Push:** `git push --force-with-lease` (mindig ezzel, első pushnál is).
4. **PR:** `gh pr view` — ha nincs nyitott PR: `gh pr create --base master --title
   "<N>. tétel: <cím>" --body "<1–2 mondat, tesztlépések nélkül>"`, a PR-leírás a repó
   szokásos láblécével. Ha a `gh` hiányzik vagy nincs bejelentkezve, a push attól még
   fusson le, és a jelentés mondja ki, hogy a PR-t kézzel kell létrehozni.
5. A záró jelentésben a worktree útvonala, a branch neve és a PR URL-je. Ne hívd az
   `ExitWorktree`-t — a doki dönt a worktree sorsáról.
