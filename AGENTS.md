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
Kapu az `app/` alatt: `npm run build`, `lint`, `test`, `docs-check` — mind zöld, allowlist nincs; a
scriptek a diff hatása szerint futtatják. Ötlet (`backlog/idea[/later]/`) → terv (`backlog[/later]/`;
`/plan` interjú csak termékkérdésnél) → `/implement <slug>...`: tételenként commit, végén egy kapu és
egy push (Pages). `/fix "<szöveg>"`: tervfájl nélkül, egy commit. Kézi teszt a Pages-en, nem kapu.

Git-lépések `scripts/workflow/` alatt, a gyökérből (`--help` mindnél):
- `run.mjs start <slug>... | finish` — futásjelző; a `finish` kapuz és pushol.
- `close.mjs <slug> --title "…"` — futásban: `git rm` tételfájl, commit; se kapu, se push.
- `commit-push.mjs -m "…" -- <path>…` — nem app-path: kapu, commit, push.
- `sync.mjs` — fetch, ff-merge; push-olatlan commitnál kapu, push; kiírja a HEAD-et.
- `drift.mjs <slug> | --all` — a `Baseline` óta változott-e app- vagy workflow-kód.
→ file:scripts/workflow/run.mjs; file:scripts/workflow/close.mjs; file:scripts/workflow/commit-push.mjs

Claude Code-ban ugyanez skill (`.claude/skills/*/SKILL.md`); más agent a scripteket hívja és a
skill-fájl lépéseit követi. Review csak jelent; `Prio`-t doki/fejlesztő mond ki.
