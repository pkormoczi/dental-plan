# backlog/
Egy fájl = egy tétel, `<slug>.md`, kebab-case. A státusz a mappa: `idea/` ötlet, gyökér tervezett;
mindkettő alatt `later/` a `Prio: later` tételeké. Prio-t doki/fejlesztő mondja ki, skill nem dönt.
Állapotváltás = `git mv`; kész tétel törlődik; történet = git history.

Fejléc az üres sorig: `# <slug>` · `Type: feature|bug|chore|doki` · opcionális
`Source: <honnan | review:<jelentés>#<id>>`, `Kerdes: <doki-kérdés>`, `Prio: now|next|later`. Tervezettnél még
`Target: master`, `Baseline: <40 hex>` és a `## Goal / Current state / Approach / Decisions /
Verification` szakaszok. Budget: idea ≤ 1500, terv ≤ 6000 kar.

`doki` = emberi teendő, `idea/` alatt; `chore` = kód-housekeeping. Elvetés: `discard.mjs`;
termékszintűnél egy sor a PRODUCT.md Nem cél alá. Dedup: a négy mappa slugjai + ez.
→ product:#nem-cel

Flow és skillek: gyökér `CLAUDE.md` § Workflow; minden lépés commit + push; részletek: `README.md`.
