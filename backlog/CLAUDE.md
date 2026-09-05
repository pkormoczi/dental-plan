# backlog/
Egy fájl = egy tétel: `<slug>.md`, kebab-case. Nincs index, sorszám, prioritás — a doki választ.
Kész tétel törlődik (`/finish`); a történet a git history.

Fejléc az első üres sorig: `# <slug>` · `Status: idea|planned` · `Type: feature|bug|chore|doki` ·
opcionális `Source: <honnan>` és `Kerdes: <mit kérdezünk a dokitól>`. `planned` alatt még
`Target: master`, `Baseline: <40 hex>` és a `## Goal / Current state / Approach / Decisions /
Verification` szakaszok. Budget: idea ≤ 1500, planned ≤ 6000 karakter (docs-check őrzi).

`doki` = emberi teendő, sosem planned; `chore` = kód-housekeeping. Elvetett irány nem marad itt:
egy sor a PRODUCT.md Nem cél szakaszába. Dedup-forrás: az itteni slugok + PRODUCT.md Nem cél.
→ product:#nem-cel

Flow: `/idea` → `/plan [--quick]` → `/implement` → `/finish` → `/push-backlog-item`; `/backlog`
listáz. Skill sosem ír ide app-kódot, és sosem rangsorol.
