# close-reszleges-futas
Type: bug
Source: fs-storage-alap implementálása közben talált (2026-11-17)
Target: master
Baseline: b078d865ca43ba18dae19b2c3c6b0b4a3939e412

## Goal
Repro: futás közben egy követett fájlt `git rm`-mel törölsz, majd `close.mjs <slug> …` — a
`git add -A -- <path…>` „pathspec did not match” hibával megáll, a tételfájl addigra `git rm`-elve,
commit nélkül, és az újrafuttatás „nincs backlog/<slug>.md” hibát ad. Elvárt: az előre stage-elt
törlés is a lezáró commitba kerül, és ha a close bármelyik lépésen megáll, a munkafa és az index a
hívás előtti állapotban marad; a doki számára nincs látható változás.

## Current state
- `scripts/workflow/close.mjs`: az ellenőrzések után a mutáló lépések sorrendje: `Döntés:` sorok a
  forrás-jelentésbe (`setDontes`), `git rm` a tételfájlra, `git add -A -- <trackedChanges>`, `git add`
  az untracked söprésre, `commit`. Hibánál semmit nem állít vissza.
- `scripts/workflow/lib.mjs` `trackedChanges` (`git status --porcelain --untracked-files=no`, a
  státuszmező levágva, átnevezésnél mindkét path) — a stage-elt törlés (`D `) path-ja is benne van,
  és arra a `git add -A -- <path>` nem talál pathspecet; `git`, `commit`.
- `scripts/workflow/reviewsLib.mjs` `setDontes`: a jelentésfájlt a munkafában írja.
- `scripts/workflow/workflow.test.mjs`: ideiglenes repón futó integrációs tesztek
  (`repo()`, `r.run('close', …)`), köztük „close a követett körből (docs/CHANGELOG.md, nested
  CLAUDE.md, scripts/) viszi a módosítást” és „close: a tétel review: Source sorára "Döntés: javítva
  <slug>" kerül a jelentésbe és a lezáró commitba”.

## Approach
Csak a `close.mjs` (és ha kell, a `lib.mjs` egy segédje) változik: a stage-elés csak azokat a
követett path-okat adja hozzá, amiknek a munkafában van stage-eletlen változása (a már stage-elt
törlés, módosítás, átnevezés úgy marad); a mutáló szakasz bármely hibájánál az index a hívás előtti
állapotra, a tételfájl és a `Döntés:`-sorral írt jelentések a hívás előtti tartalmukra állnak
vissza, és a hiba üzenete változatlanul jut a hívóhoz. A `--fix` ág ugyanezt a kódot használja. Nem
tartozik ide: a `commit-push.mjs`, a `run.mjs` és az ismert kör (`ALLOWED_TRACKED`).

## Decisions
- Visszaállítás a hívás előtti állapotra, nem csak a lépések átrendezése — mert a commit maga is
  elbukhat (hook, aláírás), és akkor a sorrendtől függetlenül félkész állapot maradna.
- A stage-elt változás érintetlenül marad, nem bontjuk szét és nem adjuk újra hozzá — mert a hívó
  szándékosan stage-elte, és a commit így is viszi.

## Verification
- [ ] tests — egy `git rm`-mel előre stage-elt követett fájl törlése a lezáró commitba kerül; ha a
      commit elbukik (pl. egy elutasító commit-msg hook a teszt-repóban), a tételfájl a munkafában
      és az indexben is megvan, az index a hívás előtti, a forrás-jelentés `Döntés:`-sor nélküli, és
      a close újrafuttatva sikerül; a meglévő close-tesztek változatlanul zöldek
- [ ] test:workflow
- [ ] docs-check
