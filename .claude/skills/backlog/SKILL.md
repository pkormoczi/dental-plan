---
name: backlog
description: List the open backlog — planned items (backlog/<slug>.md, backlog/later/<slug>.md) and ideas (backlog/idea/<slug>.md, backlog/idea/later/<slug>.md) as two tables ordered by Prio (now → next → none); later items collapsed into a count line unless --all; with Type, Kerdes flag and first sentence, counts by folder and Type, doki-tasks separately, and a drift flag for planned items (scripts/workflow/drift.mjs --all). Never decides priority (may suggest at most 3 Prio values with reasons); with `/backlog <slug> <now|next|later|none>` it records an explicitly stated Prio via scripts/workflow/prio.mjs (header + git mv + commit-push). Invoke explicitly with /backlog [--all] | /backlog <slug> <prio>.
argument-hint: [--all] | <slug> <now|next|later|none>
disable-model-invocation: true
---

# /backlog [--all] | /backlog <slug> <now|next|later|none>

Két mód. **Listázás** (argumentum nélkül vagy `--all`): csak olvas, nem módosít fájlt, nem
fetchel. **Átsorolás** (`<slug> <érték>`): a kimondott `Prio`-t könyveli le — a fejlécet, a
mappát és a commitot egyben, a `prio.mjs`-en át. A skill prioritásról nem dönt: a `Prio:` sort a
doki vagy a fejlesztő mondja ki. A fájlalak: `backlog/CLAUDE.md`.

## Listázás — lépések

1. Olvasd be a négy mappa `*.md` fájljait: `backlog/` (tervezett; a `CLAUDE.md` és a `README.md`
   kivételével), `backlog/later/` (tervezett, `Prio: later`), `backlog/idea/` (ötlet),
   `backlog/idea/later/` (ötlet, `Prio: later`). A fejlécből vedd a `Type`, `Kerdes`, `Prio`
   sorokat; a törzs első mondatát rövidítsd ~80 karakterre.
2. Írd ki táblázatban, két blokkban: előbb a tervezett (implementálható), aztán az ötlet
   (tervezendő) tételek. Mindkét blokkon belül a sorrend `Prio` szerint: `now` → `next` → nincs
   `Prio`; azon belül ábécé. A `Type: doki` sorok a végén, külön „Doki-teendők” alcím alatt.
   Oszlopok: `slug | Prio | Type | Kerdes (✓/–) | első mondat`.
   - **Alapból** a `later` tételek NEM kerülnek a táblába: blokkonként egyetlen sor zárja a
     táblát, `+N later (\`/backlog --all\`)` alakban — ez tartja rövidnek a listát, a döntés
     alatt álló és a soron következő tételek maradnak szem előtt.
   - **`--all`:** a `later` sorok is a táblában, a `nincs Prio` előtt (`now → next → later →
     nincs Prio`).
3. Összesítés egy sorban: darab mappánként, típusonként és `Prio` szerint; és külön: hány
   `later` tételnek van nyitott `Kerdes:` sora (ezek alapból nem látszanak).
4. A tervezett tételeknél `node scripts/workflow/drift.mjs --all` (a gyökér és a `later/` is) — a
   `drift` sorokat jelöld `baseline elmozdult`-tal. Ez csak jelzés (fetch nélkül): a tényleges
   vizsgálat az `/implement` preflightja.
5. Ha egy fájl fejléce hibás (hiányzó `Type`, ismeretlen érték, `Status:` sor, `Prio: later`
   nem `later/` alatt vagy fordítva), írd ki külön — a `docs-check` ugyanezt piros hibaként adja.
6. **Javaslat, legfeljebb 3:** a `Prio` nélküli tételek közül, egy-egy sor: `<slug>: now|next|later,
   mert <konkrét ok — pl. doki-review Blokkoló, blokkol egy tervezett tételt, régóta nyitott
   Kerdes>`. Zárómondat: *„Ez javaslat, nem döntés — a `Prio:`-t a doki vagy a fejlesztő mondja
   ki: `/backlog <slug> <érték>`.”* Ha minden tételnek van `Prio`-ja, ez a pont kimarad.

## Átsorolás — `/backlog <slug> <now|next|later|none>`

Csak kimondott értékkel: ha a hívásban nincs érték, ez a mód nem indul (kérdezz vissza, ne
találgass). `none` = a `Prio:` sor törlése (nincs döntés).

1. `node scripts/workflow/prio.mjs <slug> <érték> --trailer "Co-Authored-By: …" --trailer
   "Claude-Session: …"`. A script: megkeresi a tételt a négy mappában; átírja/beszúrja/törli a
   `Prio:` sort; ha a mappa nem egyezik (`later` ⇔ `later/`), `git mv`; majd
   `commit-push.mjs -m "backlog: prio <slug> <érték>"` (docs-check, commit, push). Megáll, ha a
   tétel nem követett vagy módosított — ekkor előbb `commit-push.mjs`, aztán újra.
2. Jelentsd a régi és az új útvonalat, az új `Prio`-t és a commit rövid SHA-ját. Ha a script
   megállt, add vissza a kimenetét — ne kerüld meg kézi `git`-tel.
