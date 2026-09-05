---
name: backlog
description: List the open backlog read-only — backlog/<slug>.md (planned) and backlog/idea/<slug>.md (idea) as two tables (slug, Type, Kerdes flag, first sentence), counts by folder and Type, doki-tasks separately, and a warning for planned items whose Baseline differs from the local origin/master (no fetch). Never edits, never prioritizes. Invoke explicitly with /backlog.
disable-model-invocation: true
---

# /backlog

Csak olvas. Nem módosít fájlt, nem fetchel, nem rangsorol — a sorrend nem prioritás, a
doki választ. A fájlalak: `backlog/CLAUDE.md`.

## Lépések

1. Olvasd be a `backlog/*.md` (tervezett; a `CLAUDE.md` kivételével) és a `backlog/idea/*.md`
   (ötlet) fájlokat, és a fejlécből vedd a `Type`, `Kerdes`, `Baseline` sorokat; a törzs első mondatát rövidítsd ~80
   karakterre.
2. Írd ki táblázatban, két blokkban: előbb a gyökér (tervezett, implementálható), aztán az
   `idea/` (tervezendő) tételek; a
   `Type: doki` sorok a végén, külön „Doki-teendők” alcím alatt. Oszlopok:
   `slug | Type | Kerdes (✓/–) | első mondat`.
3. Összesítés egy sorban: darab mappánként és típusonként.
4. A gyökér tételeinél: `git rev-parse origin/master` (fetch nélkül) — ha a `Baseline` eltér,
   jelöld a sorban `baseline elmozdult`-tal. Ez csak jelzés; a tényleges drift-vizsgálat az
   `/implement` preflightja.
5. Ha egy fájl fejléce hibás (hiányzó `Type`, ismeretlen érték, `Status:` sor), írd ki külön — a
   `docs-check` ugyanezt piros hibaként adja.

Nincs záró javaslat arról, mit érdemes következőnek választani.
