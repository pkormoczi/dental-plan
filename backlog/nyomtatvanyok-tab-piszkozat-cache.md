# nyomtatvanyok-tab-piszkozat-cache
Status: idea
Type: chore
Source: agent-first dokumentációs migráció follow-up

A `pages/settings/NyomtatvanyokTab.tsx` sablon-piszkozat cache-e ma közvetlen `localStorage`,
lint-disable sorokkal. Egy `DraftStorage`-szerű interfész mögé kerül, hogy a „tároló csak a
`PlanStorage`/`DraftStorage` határon át” invariáns alól a kivétel megszűnjön.
