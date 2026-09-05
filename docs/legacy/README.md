# Legacy — történeti dokumentáció

Történeti anyag a 2026-09-05 előtti dokumentációs modellből. **Normatív ereje nincs.**
Az aktuális igazság a kód + a futó tesztek, a szándék és a nem-cél a `PRODUCT.md`, az
agent-context a root és a nested `CLAUDE.md` fájlok.

**Semmi nem hivatkozhat ide** — sem forráskód, sem `CLAUDE.md`/`PRODUCT.md`/`README.md`, sem
skill, sem az élő `docs/06` terv. A `scripts/docs-check.mjs` ezt gépileg tiltja (a mappa neve,
a régi fájlnevek és a `D<szám>` döntési azonosítók is tiltott minták).

**Törlés 2026-11-04 után, külön commitban** (`git rm -r` erre a mappára). Addig a git history
helyett itt kereshető, ha egy régi döntés eredeti gondolatmenete kell.

## Tartalom

- `01-attekintes-es-dontesek.md` — a régi áttekintés és a lezárt `D1–D79` döntéstábla
- `02-domain-modell.md`, `03-funkcionalis-spec.md`, `04-nyomtatvany-spec.md`,
  `05-technologia.md`, `07-felulet-rendszer.md` — a régi specifikációk (a nem-levezethető
  magjuk a `PRODUCT.md`-be és a nested `CLAUDE.md`-kbe került)
- `D-SZAM-FORRASKOD-LELTAR.md`, `PROBLEMS.md` — a migráció felmérése és kiváltó okai
- `agent-first-documentation-model_V2.md` — a célmodell leírása
- `agent-first-migracios-terv.md` — a végrehajtott migrációs terv, a 7. szakaszában a
  fázisonkénti napló és commit-hashek
- `backlog-done/` — a régi backlog-lezárási modell archívuma: a lezárt tervfájlok, a
  `BACKLOG_DONE.md` napló és a `redesign/` döntésnapló (saját, a `01`-gyel ütköző
  `D<szám>` számozással)
