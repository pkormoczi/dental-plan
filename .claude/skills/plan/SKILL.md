---
name: plan
description: Take one or more backlog items from idea to implementation-ready. Decides per item whether an interview is needed — asks only on product-level questions (visible behaviour, scope boundary, acceptance, hard invariant or Nem cél contact); an unambiguous bug or a chore/feature with no open product decision is written without asking. No approval step for the final file. git-mv's backlog/idea[/later]/<slug>.md to backlog[/later]/<slug>.md, rewrites it (Goal / Current state / Approach / Decisions / Verification, Target + Baseline from scripts/workflow/sync.mjs), commits per item (commit-push.mjs --no-push) and publishes once at the end (sync.mjs, docs-check only). Input is an existing idea file or a freeform prompt (then the file is created first, with the /idea dedup). Never writes application code, never accepts Type: doki, never sets Prio on its own. Invoke explicitly with /plan <slug>...
argument-hint: <slug>...
disable-model-invocation: true
---

# /plan <slug>...

## Cél

Egy vagy több tételt döntésről döntésre implementáció-indításig vinni, és az eredményt a
tétel saját fájljába írni, a fájlt az `idea/` mappából a gyökérbe víve — a státusz a mappa:
`git mv backlog/idea[/later]/<slug>.md backlog[/later]/<slug>.md` (a `Prio` megmarad, a
`later/` almappa követi: `Prio: later` ⇔ `later/`, a docs-check őrzi). A bemenet tételenként:

- egy létező `backlog/idea/<slug>.md` vagy `backlog/idea/later/<slug>.md` fájl, vagy
- egy szabad felvetés a hívásban / a beszélgetésben — ekkor a fájlt is ez a skill hozza
  létre, a `/idea` dedup-lépésével.

A `<slug>` kötelező, kebab-case: a fájlnév és a későbbi `/implement <slug>` azonosítója.
A fájlalak és a fejléc-értékkészlet: `backlog/CLAUDE.md`.

**Ez a skill soha nem ír és nem módosít alkalmazáskódot** (`app/`, `data/`, `assets/` alatt
semmit), nem nyúl más backlog-fájlhoz, és `Prio:`-t magától nem dönt el. A tervfájlt írás után
azonnal commitolja, a futás végén pusholja — a terv megosztott állapot, mielőtt implementáció
indul. `Type: doki` tételt nem fogad el — az emberi teendő, nem tervezhető; a már tervezett
`backlog[/later]/<slug>.md`-t sem — újratervezésre előbb mondd ki, mi bukott meg benne.

**Ez az egyetlen hely, ahol emberi döntés születik a flow-ban.** Utána az `/implement`
kérdés nélkül végigmegy, ezért ami termékdöntés, annak itt kell eldőlnie — de csak az.

## Előkészítés — mielőtt egy kérdést is felteszel

0. `node scripts/workflow/sync.mjs` — a feltárás a friss `origin/master`-en induljon; jegyezd
   meg a kiírt HEAD-et (írás előtt ehhez képest nézed, változott-e közben az app). Ha megáll
   (futásjelző, push-olatlan commit piros kapuval), **állj meg és jelentsd**.
1. Olvasd el a tétel fájlját (vagy a felvetést) és a `Source:` szerinti forrást, ha van.
2. Olvasd el a `docs/PRODUCT.md`-t (különösen a **Nem cél** és a **Szándékos hiányok és nyitott
   kérdések** szakaszt), a root `CLAUDE.md` **Hard invariants** listáját és az érintett terület
   nested `CLAUDE.md`-jét (`app/src`, `domain`, `storage`, `pdf`). Ezek nem tárgyalási alap —
   ha egy döntési ág ütközik velük, EXPLICIT vesd fel, ne csendben kerülgesd, és ne csendben
   fogadd el az ütközést.
3. Dedup: `ls backlog backlog/later backlog/idea backlog/idea/later` slugjai és `Source:` sorai +
   `docs/PRODUCT.md` Nem cél. Ha a felvetés egy már mérlegelt és elvetett irány, mondd ki, és
   kérdezd meg, mi változott azóta; ha egy létező tétel fedi, ne nyiss újat.
4. A nested `CLAUDE.md`-k „Find before writing” indexét nézd át — a döntéseknek a meglévő
   helperekre kell épülniük. Ez tájékozódás, nem szignatúra-tervezés.

## Interjú vagy nem — tételenként

**Nincs interjú**, ha a feltárás után nem maradt termékkérdés: `Type: bug` reprodukálható
leírással és elvárt viselkedéssel; vagy `chore`/`feature`, ahol nincs nyitott termékdöntés, nem
érint hard invariánst vagy Nem célt, és a doki által látható viselkedés változatlan vagy egy
mondatban leírható. Ilyenkor: Goal = repro + elvárt viselkedés (vagy az egy mondat); Current
state = az érintett fájl(ok) és a meglévő teszt; Approach = a változás határa, egy mondat;
Decisions = `- nincs` (vagy a technikai rutindöntés egy sorban, indokkal); Verification =
teszt a megfigyelhető viselkedésre. Mondd ki a jelentésben, hogy interjú nélkül írtad, és miért.

**Interjú kell**, ha bármelyik ponton döntési ág van: két irány, invariáns- vagy Nem cél-érintés,
scope-kérdés, több mondatos látható viselkedés, nyitott `Kerdes:` sor. Ha írás közben bukkan
fel, állj le, mondd ki, és folytasd az interjúval.

**Hogyan.** Térképezd fel a döntési fát (adatmodell, UX, szélső esetek, invariáns-hatás);
ágazz egyszerre egyet, a legnagyobb hatású bizonytalansággal kezdve; nevezd meg a
függőségeket; minden lezárt ág után ismételd vissza a döntést; ne írj „majdnem kész”
állapotban. **Mit kérdezz és mit dönts el magad:** kérdezz, ha a döntés termékszintű — a doki
által látható viselkedés, scope-határ (mi nem tartozik ide), elfogadási feltétel, hard
invariáns vagy Nem cél érintése, adat/jogi korlát. Dönts magad — és a `Decisions`-ben egy
sorban indokold —, ha rutin technikai kérdés a meglévő architektúrán belül: helper helye,
fájlnév, követett minta, teszt szerkezete. Termékkérdésben ne feltételezz; egyszerre egy
téma; tolj vissza konkrétan (a `docs/PRODUCT.md` szakaszára, az invariánsra vagy a létező
tételre hivatkozva); vess fel elvetett alternatívát is; legyél direkt.

## Korlátok — amit ez a skill SOHA nem tesz

- Nem ír és nem módosít alkalmazáskódot — mintakódot, „illusztrációs” snippetet sem.
- Nem ír függvényszignatúrát, típusdefiníciót vagy implementációs részletességű
  fájlstruktúra-tervet. A `Current state` és az `Approach` fájl-/symbol-szintű pointer.
- Nem implementál és nem zár le semmit — az az `/implement` dolga.
- Nem kér jóváhagyást a kész fájlra: az interjú lezárt döntései a jóváhagyás.

## Kimenet — a tételfájl

`backlog/<slug>.md` a gyökérben, `Prio: later`-nél `backlog/later/<slug>.md` (`git mv` az
`idea[/later]/`-ból), **legfeljebb 6000 karakter**, magyarul (a séma-mezőneveket nem
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
      (a kadencia-tábla a `.claude/skills/manual-checks/SKILL.md`-ben); különben törölni.
      Ez az egyetlen hely, ahol böngészős ellenőrzés elrendelhető: az /implement nem mérlegel.
```

A tervfájl a lezáráskor törlődik — a git history a történetiség, ezért ne írj bele semmit,
amit később „meg akarnál találni”: ami tartós context, azt az `/implement` írja
`docs/PRODUCT.md`-be vagy nested `CLAUDE.md`-be. D-szám és legacy-hivatkozás tilos (docs-check).

## Írás, commit, publikálás

**Közvetlenül írás előtt** (tételenként): újra `node scripts/workflow/sync.mjs` (ha megáll,
állj meg és jelentsd). Ha a gyökérben már van `backlog[/later]/<slug>.md`, állj meg. Ha a HEAD
eltér az előkészítés 0. lépésében megjegyzettől: `git diff --stat <kezdő HEAD>..HEAD -- app data
assets` — ha nem üres, a `Current state` minden pointerét ellenőrizd újra a friss kódon; ha egy
döntés nem áll meg, kérdezz; csak utána írj. A `Baseline` = az írás előtti HEAD SHA.

**Írás után, tételenként commit, push nélkül:**

```
node scripts/workflow/commit-push.mjs --no-push -m "backlog: plan <slug>" \
  --trailer "Co-Authored-By: …" --trailer "Claude-Session: …" \
  -- backlog/idea[/later]/<slug>.md backlog[/later]/<slug>.md
```

(mindkét path kell, hogy a `git mv` átnevezésként kerüljön a commitba; szabad felvetésből
induló, új fájlnál csak a cél-útvonal). Egy slugnál is így: a záró `sync` pushol.

**A futás végén:** `node scripts/workflow/sync.mjs` — a docs-only commitokra csak docs-check
fut, aztán egy push. Ha megáll, jelentsd a kimenetét, ne kerüld meg kézi `git`-tel.

## Záró jelentés

Tételenként: a megírt fájl, a `Baseline`, interjú volt-e (és a lezárt `Kerdes:`); a
commit-tartomány rövid SHA-i (fent az `origin/master`-en); a következő lépés:
`/implement <slug>...` (ellenőriz, commitol, pushol — a doki a Pages-en tesztel).
