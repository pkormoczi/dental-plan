---
name: backlog
description: List the open backlog read-only — every backlog/<slug>.md as a table (slug, Status, Type, Kerdes flag, first sentence), counts by Status and Type, doki-tasks separately, and a warning for planned items whose Baseline differs from the local origin/master (no fetch). Never edits, never prioritizes. Invoke explicitly with /backlog.
disable-model-invocation: true
---

# /backlog

Csak olvas. Nem módosít fájlt, nem fetchel, nem rangsorol — a sorrend nem prioritás, a
doki választ. A fájlalak: `backlog/CLAUDE.md`.

## Lépések

1. Olvasd be minden `backlog/*.md` fájlt (a `CLAUDE.md` kivételével), és a fejlécből vedd a
   `Status`, `Type`, `Kerdes`, `Baseline` sorokat; a törzs első mondatát rövidítsd ~80
   karakterre.
2. Írd ki táblázatban, két blokkban: előbb a `planned`, aztán az `idea` tételek; a
   `Type: doki` sorok a végén, külön „Doki-teendők” alcím alatt. Oszlopok:
   `slug | Type | Kerdes (✓/–) | első mondat`.
3. Összesítés egy sorban: darab státuszonként és típusonként.
4. `planned` tételeknél: `git rev-parse origin/master` (fetch nélkül) — ha a `Baseline` eltér,
   jelöld a sorban `baseline elmozdult`-tal. Ez csak jelzés; a tényleges drift-vizsgálat az
   `/implement` preflightja.
5. Ha egy fájl fejléce hibás (hiányzó `Status`/`Type`, ismeretlen érték), írd ki külön — a
   `docs-check` ugyanezt piros hibaként adja.

Nincs záró javaslat arról, mit érdemes következőnek választani.
