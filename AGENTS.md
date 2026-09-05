# AGENTS.md — belépő bármely agentnek

Fogorvosi kezelési-terv készítő (Vite + React + TS az `app/` alatt), egy fejlesztő, egy
`master`. A context a `CLAUDE.md`-kben él — ez a fájl csak odamutat, nem duplikál.

## Olvasd el, mielőtt írsz
1. `CLAUDE.md` (gyökér): repó, parancsok, hard invariants, domain szókincs, komment- és tesztszabály.
2. `docs/PRODUCT.md`: termékcél, **Nem cél**, adat/jogi korlátok — a szándék forrása.
3. Az érintett terület nested `CLAUDE.md`-je (`app/src`, `app/src/domain`, `app/src/storage`,
   `app/src/pdf`) — benne a „Find before writing" index.
4. `backlog/CLAUDE.md` a tétel alakja; `backlog/README.md` a flow és a scriptek szerződése.
→ file:CLAUDE.md; file:docs/PRODUCT.md; file:backlog/CLAUDE.md; file:backlog/README.md

## Hard invariants (részletek a gyökér `CLAUDE.md`-ben)
- Páciensadat nem hagyja el a gépet: nincs backend, telemetria, külső AI/API.
- Tároló csak a `PlanStorage`/`DraftStorage` határon át.
- Véglegesített verzió sosem íródik felül (`_v<n+1>`); magasabb `schemaVersion` nem tölthető be.
- Pénz egész, alapegységben; nincs automatikus HUF↔EUR. Mentett terv pillanatkép.
- A nyomtatvány szerződéses dokumentum.
- Böngésző-automatizálás csak izolált Chrome-profillal.
→ product:#adat-es-deployment-korlatok; product:#a-nyomtatvany-szerzodeses-dokumentum

## Kapu és flow
Kapu az `app/` alatt: `npm run build`, `lint`, `test`, `docs-check` — mind zöld, allowlist nincs.
Egy tétel: ötlet (`backlog/idea[/later]/`) → terv (`backlog[/later]/`) → implementáció a
masteren, commit nélkül → **kézi ellenőrzés a munkafán** → lezárás (tételfájl törlése, commit,
azonnali push; a master-push Pages-re élesít). Minden állapotváltozás azonnal commit + push.

Git-lépések scriptben, a gyökérből (`--help` mindnél):
- `scripts/workflow/sync.mjs` — fetch, ff-merge; push-olatlan commitnál kapu, majd push; kiírja a HEAD-et.
- `scripts/workflow/commit-push.mjs -m "…" [--trailer …]… -- <path>…` — csak a path-ok, docs-check, commit, push.
- `scripts/workflow/drift.mjs <slug> | --all` — a terv `Baseline`-ja óta változott-e app-kód (csak jelez).
- `scripts/workflow/close.mjs <slug> --title "…"` — teljes kapu, `git rm` tételfájl, commit, push.
→ file:scripts/workflow/sync.mjs; file:scripts/workflow/commit-push.mjs; file:scripts/workflow/drift.mjs; file:scripts/workflow/close.mjs

Claude Code-ban ugyanez skill (`.claude/skills/*/SKILL.md`); más agent a scripteket hívja és a
skill-fájl lépéseit követi. Review csak jelent; `Prio`-t doki/fejlesztő mond ki.
