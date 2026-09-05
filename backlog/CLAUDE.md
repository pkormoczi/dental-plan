# backlog/
Egy fájl = egy tétel, `<slug>.md`, kebab-case. A státusz a mappa: `idea/` = ötlet, a gyökér =
tervezett; mindkettő alatt `later/` a `Prio: later` tételeké (docs-check őrzi). Prio-t doki vagy
fejlesztő mond ki; skill nem dönt. Állapotváltás = `git mv`; kész tétel törlődik; történet =
git history.

Fejléc az üres sorig: `# <slug>` · `Type: feature|bug|chore|doki` · opcionális
`Source: <honnan>`, `Kerdes: <doki-kérdés>`, `Prio: now|next|later`. Tervezettnél még
`Target: master`, `Baseline: <40 hex>` és a `## Goal / Current state / Approach / Decisions /
Verification` szakaszok. Budget: idea ≤ 1500, terv ≤ 6000 kar.

`doki` = emberi teendő, mindig `idea/` alatt; `chore` = kód-housekeeping. Elvetett irány nem
marad itt: egy sor a PRODUCT.md Nem cél alá. Dedup: a négy mappa slugjai + ez.
→ product:#nem-cel

Flow: `/idea` → `/plan [--quick]` → `/implement` → kézi teszt → `/finish`; `/backlog` listáz,
`/backlog <slug> <prio>` átsorol. Minden lépés commit + push; flow: `README.md`.
