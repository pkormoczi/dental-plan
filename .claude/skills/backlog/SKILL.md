---
name: backlog
description: List the open backlog read-only — backlog/<slug>.md (planned) and backlog/idea/<slug>.md (idea) as two tables grouped by the doki's Prio (now → next → later → none), with Type, Kerdes flag and first sentence, counts by folder and Type, doki-tasks separately, and a drift flag for planned items (scripts/workflow/drift.mjs --all). Never edits and never decides priority; may suggest at most 3 Prio values with reasons for items that have none. Invoke explicitly with /backlog.
disable-model-invocation: true
---

# /backlog

Csak olvas. Nem módosít fájlt, nem fetchel, és nem dönt prioritásról — a `Prio:` sort a
doki írja. A fájlalak: `backlog/CLAUDE.md`.

## Lépések

1. Olvasd be a `backlog/*.md` (tervezett; a `CLAUDE.md` és a `README.md` kivételével) és a
   `backlog/idea/*.md` (ötlet) fájlokat, és a fejlécből vedd a `Type`, `Kerdes`, `Prio` sorokat;
   a törzs első mondatát rövidítsd ~80 karakterre.
2. Írd ki táblázatban, két blokkban: előbb a gyökér (tervezett, implementálható), aztán az
   `idea/` (tervezendő) tételek. Mindkét blokkon belül a sorrend `Prio` szerint: `now` →
   `next` → `later` → nincs `Prio`; azon belül ábécé. A `Type: doki` sorok a végén, külön
   „Doki-teendők” alcím alatt. Oszlopok: `slug | Prio | Type | Kerdes (✓/–) | első mondat`.
3. Összesítés egy sorban: darab mappánként, típusonként és `Prio` szerint.
4. A gyökér tételeinél `node scripts/workflow/drift.mjs --all` — a `drift` sorokat jelöld
   `baseline elmozdult`-tal. Ez csak jelzés (fetch nélkül): a tényleges vizsgálat az
   `/implement` preflightja.
5. Ha egy fájl fejléce hibás (hiányzó `Type`, ismeretlen érték, `Status:` sor), írd ki külön — a
   `docs-check` ugyanezt piros hibaként adja.
6. **Javaslat, legfeljebb 3:** a `Prio` nélküli tételek közül, egy-egy sor: `<slug>: now|next|later,
   mert <konkrét ok — pl. doki-review Blokkoló, blokkol egy tervezett tételt, régóta nyitott
   Kerdes>`. Zárómondat: *„A `Prio:` sort a doki írja; ez javaslat, nem döntés.”* Ha minden
   tételnek van `Prio`-ja, ez a pont kimarad.
