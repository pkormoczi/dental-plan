---
name: plan
description: Take one backlog item from idea to implementation-ready. Interviews the user branch by branch until every decision is resolved, then git-mv's backlog/idea/<slug>.md to backlog/<slug>.md, rewrites it (Goal / Current state / Approach / Decisions / Verification, Target + Baseline from scripts/workflow/sync.mjs) and commits + pushes it at once (scripts/workflow/commit-push.mjs) so the plan is shared state before implementation starts. Input is an existing backlog/idea/<slug>.md or a freeform prompt (then the file is created first, with the /idea dedup). --quick skips the interview for an unambiguous bug. Never writes application code, never accepts Type: doki, never sets Prio on its own. Invoke explicitly with /plan <slug> [--quick].
argument-hint: <slug> [--quick]
disable-model-invocation: true
---

# /plan <slug> [--quick]

## Cél

Egy tételt döntésről döntésre implementáció-indításig vinni, és az eredményt a tétel saját
fájljába írni, a fájlt az `idea/` mappából a gyökérbe víve — a státusz a mappa:
`git mv backlog/idea/<slug>.md backlog/<slug>.md`. A bemenet:

- egy létező `backlog/idea/<slug>.md` fájl, vagy
- egy szabad felvetés a hívásban / a beszélgetésben — ekkor a fájlt is ez a skill hozza
  létre, a `/idea` dedup-lépésével.

A `<slug>` kötelező, kebab-case: a fájlnév és a későbbi `/implement <slug>` / `/finish <slug>`
azonosítója. A fájlalak és a fejléc-értékkészlet: `backlog/CLAUDE.md`.

**Ez a skill soha nem ír és nem módosít alkalmazáskódot** (`app/`, `data/`, `assets/` alatt
semmit), nem nyúl más backlog-fájlhoz, és `Prio:`-t magától nem ír. A tervfájlt írás után
**azonnal commitolja és pusholja** — a terv megosztott állapot, mielőtt implementáció indul.
`Type: doki` tételt
nem fogad el — az emberi teendő, nem tervezhető; a gyökérben már meglévő `backlog/<slug>.md`-t sem — az már
tervezett, újratervezésre előbb mondd ki, mi bukott meg benne.

## Előkészítés — mielőtt egy kérdést is felteszel

1. Olvasd el a tétel fájlját (vagy a felvetést) és a `Source:` szerinti forrást, ha van.
2. Olvasd el a `docs/PRODUCT.md`-t (különösen a **Nem cél** és a **Szándékos hiányok és nyitott
   kérdések** szakaszt), a root `CLAUDE.md` **Hard invariants** listáját és az érintett terület
   nested `CLAUDE.md`-jét (`app/src`, `domain`, `storage`, `pdf`). Ezek nem tárgyalási alap —
   ha egy döntési ág ütközik velük, EXPLICIT vesd fel, ne csendben kerülgesd, és ne csendben
   fogadd el az ütközést.
3. Dedup: `ls backlog backlog/idea` slugjai és `Source:` sorai + `docs/PRODUCT.md` Nem cél. Ha a felvetés egy
   már mérlegelt és elvetett irány, mondd ki, és kérdezd meg, mi változott azóta; ha egy
   létező tétel fedi, ne nyiss újat.
4. A nested `CLAUDE.md`-k „Find before writing” indexét nézd át — a döntéseknek a meglévő
   helperekre kell épülniük. Ez tájékozódás, nem szignatúra-tervezés.

## `--quick` — a bug-sáv

Csak akkor, ha a tétel `Type: bug` (vagy a felvetés egyértelműen az), és reprodukálható
leírás + elvárt viselkedés adott. Nincs interjú: Goal = repro + elvárt viselkedés; Current
state = az érintett fájl(ok) és a meglévő teszt; Approach = a javítás határa, egy mondat;
Decisions = `- nincs`; Verification = regressziós teszt a megfigyelhető viselkedésre. Ha az
előkészítés vagy az írás közben döntési ág bukkan fel (két javítási irány, invariáns-érintés,
scope-kérdés), állj le, mondd ki, és folytasd a normál interjúval.

## Hogyan dolgozz — az interjú

1. **Olvasd a felvetést** — értsd meg, mit mond a felhasználó eddig.
2. **Térképezd fel a döntési fát** — adatmodell, mappa-/fájlszerkezet, UX, szélső esetek,
   meglévő invariánsokra gyakorolt hatás.
3. **Ágazz egyszerre egyet** — a legnagyobb hatású bizonytalansággal kezdve; ne lépj tovább,
   amíg az ág nincs lezárva.
4. **Nevezd meg a függőségeket** — ha egy döntés korlátoz egy másikat, mondd ki.
5. **Foglald össze menet közben** — minden lezárt ág után ismételd vissza a döntést.
6. **Állj meg, ha nincs egyezés** — „majdnem kész” állapotban ne írj.

Szabályok: sose feltételezz, kérdezz; egyszerre egy téma; tolj vissza konkrétan (a
`docs/PRODUCT.md` szakaszára, az invariánsra vagy a létező tételre hivatkozva, nem
általánosságban); vess fel elvetett alternatívát is; legyél direkt; kövesd, mely ágak
zárultak le.

## Korlátok — amit ez a skill SOHA nem tesz

- Nem ír és nem módosít alkalmazáskódot — mintakódot, „illusztrációs” snippetet sem.
- Nem ír függvényszignatúrát, típusdefiníciót vagy implementációs részletességű
  fájlstruktúra-tervet. A `Current state` és az `Approach` fájl-/symbol-szintű pointer, nem
  implementációs terv.
- Nem implementál és nem zár le semmit — az a `/implement` és a `/finish` dolga.

## Kimenet — a tételfájl

`backlog/<slug>.md` a gyökérben (`git mv` az `idea/`-ból), **legfeljebb 6000 karakter**, magyarul (a séma-mezőneveket nem
fordítjuk, lásd root `CLAUDE.md` Domain szókincs). A meglévő `Type:`, `Source:` és `Prio:` sor
megmarad; a `Kerdes:` sor törlődik, ha a tervezés megválaszolta.

```md
# <slug>
Type: feature|bug|chore
Source: <honnan>
Prio: <ha volt>
Target: master
Baseline: <a sync.mjs által kiírt HEAD>

## Goal
Egy mondat: mit lát másképp a doki.

## Current state
Csak a releváns fájlok, symbolok, tesztek — path-qualified (pl. `app/src/domain/totals.ts`
`tervVegosszeg`, `app/src/pages/PreviewPage.test.tsx` „nyilatkozat placeholder kemény zár”).

## Approach
Mely fájlok / boundary-k változnak, melyek nem. Explicit hatókör-határ: mi NEM tartozik ide.

## Decisions
Csak valódi választásnál, egy sor / döntés:
- <választás> — mert <ok>; nem <alternatíva>, mert <ok>.

## Verification
- [ ] tests — milyen megfigyelhető viselkedést kell látni (nem hogyan tesztelni)
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf | visual-css | keyboard-a11y — csak ha a változás típusa kéri
      (a kadencia-tábla a `.claude/skills/manual-checks/SKILL.md`-ben); különben törölni
```

A tervfájl a `/finish` után törlődik — a git history a történetiség, ezért ne írj bele
semmit, amit később „meg akarnál találni”: ami tartós context, az a `/finish` 4. lépésében
`docs/PRODUCT.md`-be vagy nested `CLAUDE.md`-be kerül. D-szám és legacy-hivatkozás tilos
(docs-check).

## Megerősítés írás előtt

Ne írj a lemezre, amíg a döntési fa minden ága le nincs zárva ÉS a felhasználó jóvá nem
hagyta az összefoglalót. Mutasd meg a teljes tervezett tartalmat, és csak kifejezett
jóváhagyás után írj. Két megerősítési pont: 1) jelölt-választás (csak többötletes forrásnál,
új fájl esetén), 2) a végleges fájltartalom.

**Közvetlenül írás előtt**, a jóváhagyás után: `node scripts/workflow/sync.mjs` (fetch, ff-merge,
megbukott push felvitele; ha megáll, állj meg és jelentsd). A sync után, ha a gyökérben már van
`backlog/<slug>.md` (párhuzamos session tervezte), állj meg. A `Baseline` = a sync által kiírt
HEAD SHA.

**Írás után, commit + push:**

```
node scripts/workflow/commit-push.mjs -m "backlog: plan <slug>" \
  --trailer "Co-Authored-By: …" --trailer "Claude-Session: …" \
  -- backlog/idea/<slug>.md backlog/<slug>.md
```

(mindkét path kell, hogy a `git mv` átnevezésként kerüljön a commitba; szabad felvetésből
induló, új fájlnál csak a gyökérbeli). A script docs-checket futtat, commitol, pushol; ha megáll,
jelentsd a kimenetét, ne kerüld meg kézi `git`-tel.

## Záró jelentés

A megírt fájl, a `Baseline`, a lezárt `Kerdes:` (ha volt), a commit rövid SHA-ja (fent az
`origin/master`-en), és a következő lépés: `/implement <slug>`.
