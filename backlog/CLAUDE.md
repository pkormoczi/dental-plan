# backlog/
Egy fájl = egy tétel, `<slug>.md`, kebab-case. A státusz a mappa: `idea/<slug>.md` = ötlet,
`<slug>.md` itt a gyökérben = tervezett. Nincs Status sor, index; Prio-t csak a doki ír.
Állapotváltás = `git mv`; kész tétel törlődik (`/finish`); történet = git history.

Fejléc az üres sorig: `# <slug>` · `Type: feature|bug|chore|doki` · opcionális
`Source: <honnan>`, `Kerdes: <doki-kérdés>`, `Prio: now|next|later`. Tervezett tételnél még
`Target: master`, `Baseline: <40 hex>` és a `## Goal / Current state / Approach / Decisions /
Verification` szakaszok. Budget: idea ≤ 1500, terv ≤ 6000 karakter.

`doki` = emberi teendő, mindig `idea/` alatt; `chore` = kód-housekeeping. Elvetett irány nem
marad itt: egy sor a PRODUCT.md Nem cél alá. Dedup: a két mappa slugjai + ez.
→ product:#nem-cel

Flow: `/idea` → `/plan [--quick]` → `/implement` → kézi teszt → `/finish`; `/backlog` listáz.
Minden lépés azonnal commit + push. Teljes flow: `README.md`. Skill app-kódot nem ír, Prio-t
nem dönt.
