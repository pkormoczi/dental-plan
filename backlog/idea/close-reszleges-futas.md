# close-reszleges-futas
Type: bug
Source: fs-storage-alap implementálása közben talált (2026-11-17)

Repro: futás közben egy követett fájlt `git rm`-mel törölsz (pl. `app/tsconfig.electron.build.json`),
majd `node scripts/workflow/close.mjs <slug> …`. A `scripts/workflow/close.mjs` a `trackedChanges()`
listáját `git add -A -- <path…>`-szal stage-eli; az előre stage-elt törlés path-ja már se a munkafában,
se az indexben nincs, így a git „pathspec did not match” hibával megáll. Addigra a close a tételfájlt
már `git rm`-elte, commit nélkül; újrafuttatva „nincs backlog/<slug>.md” hibával áll meg, és csak kézi
`git reset`/`git checkout` hozza vissza. Elvárt: a stage-elt törlés is a lezáró commitba kerül, és ha
a close bármelyik lépésen megáll, a munkafa és az index a hívás előtti állapotban marad (a tételfájl
nincs törölve).
