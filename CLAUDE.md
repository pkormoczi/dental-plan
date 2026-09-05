# Repo
`app/` Vite + React + TS — az egyetlen szerkesztett könyvtár · `docs/06-veglegesites-terv.md` a 2. fázis
(Electron) terve · `backlog/` egy fájl = egy nyitott tétel (idea|planned) · `data/`, `assets/` referencia ·
`scripts/` repo-checkek.

# Parancsok
`cd app && npm run dev | build | lint | test | docs-check`

# Product context
`PRODUCT.md` — termékcél, napi flow, nem-cél, adat/jogi korlátok. Nested `CLAUDE.md`: `app/src`
(felület-rendszer), `app/src/domain`, `app/src/storage`, `app/src/pdf` — automatikusan betöltődnek.

# Authority
Aktuális viselkedés: kód + futó tesztek. Szándék és nem-cél: `PRODUCT.md`. A `CLAUDE.md` contextet ad,
nem írhat felül tesztet vagy típust.

# Hard invariants
- Páciens- és kezelési adat nem hagyja el a gépet: nincs backend, telemetria, analytics, remote
  logging, külső AI/API. Gépi őr: CSP + oxlint. → product:#adat-es-deployment-korlatok
- Fájlrendszer/tároló csak a `PlanStorage`/`DraftStorage` határon át. → symbol:app/src/storage/PlanStorage.ts#PlanStorage
- Véglegesített verzió sosem íródik felül, mindig `_v<n+1>`.
  → test:app/src/storage/DemoStorage.test.ts#savePlan on an existing tervId appends v2 without touching v1
- Magasabb `schemaVersion` → betöltés megtagadva.
  → test:app/src/domain/schema.test.ts#rejects a newer-than-known version with a readable message
- Pénz egész, a pénznem alapegységében; nincs automatikus HUF↔EUR.
  → symbol:app/src/domain/money.ts#formatMoney; test:app/src/domain/penznemValtas.test.ts#nincs automatikus FX -- a HUF érték sosem lesz belőle számolt EUR érték
- Mentett terv pillanatkép, sosem rajzolódik újra az élő árlistából.
  → test:app/src/domain/totals.test.ts#does NOT mutate or overwrite the passed-in mentett value
- A nyomtatvány szerződéses dokumentum (sávos `*`, kedvezmény nem nyomtatódik, placeholder-zár).
  → product:#a-nyomtatvany-szerzodeses-dokumentum

# Domain szókincs
A JSON-kulcsok magyarul vannak és a lemezre írt séma részei — kódban nem fordíthatók: `fazisok`,
`sorok`, `tetelek`, `kategoriak`, `nevSnapshot`, `listaEgysegar`, `tenylegesEgysegar`, `mennyiseg`,
`fogak`, `osszesitok`, `arlistaVerzio`, `aktiv`, `gyakori`, `paciensId`, `tervCim`; ártípus
`FIX`/`SAVOS`; státusz `PISZKOZAT`/`VEGLEGES`.

# Böngésző-automatizálás — nem tárgyalható
A chrome-devtools MCP KIZÁRÓLAG izolált módban futhat. TILOS a configba: `--autoConnect`,
`--browserUrl`, vagy `--user-data-dir` a fejlesztő valós Chrome-profiljára. TILOS futó Chrome-hoz
csatlakozni vagy remote debuggingot bekapcsolni bármilyen böngészőben. Ha egy feladat valós profilt
igényelne (bejelentkezés, korábbi mappa-engedély), ne kerüld meg: jelezd, és javasolj alternatívát a
`PlanStorage` teszt-implementációjával. Kikényszerítés: a követett, verzió-pinnelt `.mcp.json`
(`--isolated`). A jsdom-ban strukturálisan nem ellenőrizhető réteget (kontraszt, valódi PDF,
canvas→PNG, popover-geometria) a `/manual-checks` skill fedi — kézzel indítva, sose automatikusan.

# Kommentek
Csak WHY, invariáns vagy gotcha. Nincs „mit csinál”. Nincs `D<szám>`/`DP-<szám>` döntési azonosító,
backlog-slug, `backlog/` vagy legacy-doksi hivatkozás. Ha a WHY termékszándék: `PRODUCT.md §
<cím>`; ha discovery: a nested `CLAUDE.md` neve. Meglévő kommenthez csak akkor nyúlj, ha hamissá vált.

# Dokumentáció
Default: ne írj. Nested `CLAUDE.md`-be csak discovery/szándék kerül, egy állítás egy sor,
path-qualified anchorral (típusok: file, symbol, test, product), amit a `docs-check` felold.
Budget-túllépést ne production-refactorral oldj — erősebb mechanizmust (teszt/típus/lint) vagy
redundanciát keress.

# Tesztek
Nincs `.skip`/`.only`. A tesztnév konkrét, megfigyelhető viselkedést ír le, D-szám nélkül.

# Workflow
`/idea <slug>` → `/plan <slug> [--quick]` → `/implement <slug>` → `/finish <slug>`; `/backlog` listáz.
A `/update-changelog` és `/update-features` külön, kézi hívásra fut — a lezárás végén csak
emlékeztetőt írj rájuk.
