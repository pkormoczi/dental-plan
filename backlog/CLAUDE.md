# backlog/
Egy fájl = egy tétel, `<slug>.md`, kebab-case. A státusz a mappa: `idea/<slug>.md` = ötlet,
`<slug>.md` itt a gyökérben = tervezett. Nincs Status sor, index, sorszám, prioritás — a doki
választ. Állapotváltás = `git mv`; kész tétel törlődik (`/finish`); a történet a git history.

Fejléc az első üres sorig: `# <slug>` · `Type: feature|bug|chore|doki` · opcionális
`Source: <honnan>` és `Kerdes: <doki-kérdés>`. Tervezett tételnél még
`Target: master`, `Baseline: <40 hex>` és a `## Goal / Current state / Approach / Decisions /
Verification` szakaszok. Budget: idea ≤ 1500, tervezett ≤ 6000 karakter (docs-check őrzi).

`doki` = emberi teendő, mindig `idea/` alatt; `chore` = kód-housekeeping. Elvetett irány nem
marad itt: egy sor a docs/PRODUCT.md Nem cél szakaszába. Dedup: a két mappa slugjai + ez.
→ product:#nem-cel

Flow: `/idea` → `/plan [--quick]` → `/implement` → `/finish` → `/push-backlog-item`; `/backlog`
listáz. Skill ide app-kódot nem ír, és nem rangsorol.
