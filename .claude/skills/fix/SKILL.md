---
name: fix
description: Fast lane for a small, unambiguous fix described in one or two sentences (typically found while testing on Pages) — no backlog file, no interview, one commit. Dedups against backlog and PRODUCT.md § Nem cél, forms a quick plan in-session under /plan's no-interview criteria, then runs the /implement item procedure (tests, targeted checks, diff self-review, CHANGELOG when visible) and closes with close.mjs --fix (Goal in the commit body) and run.mjs finish (full gate, push to Pages). Stops and hands over to /idea + /plan the moment a product decision appears. Invoke explicitly with /fix "<szöveg>".
argument-hint: "<szöveg>"
disable-model-invocation: true
---

# /fix "<szöveg>"

Kis, egyértelmű javítás tervfájl és interjú nélkül, **egy commitban**: a Goal a commit
törzsében él, a git history a történet. Tipikus forrás: a doki a Pages-en talált valamit.
Ugyanaz a végrehajtási szabály, mint az `/implement` egy tételére — csak a bemenet más.

## 1. Slug és dedup

- Slug a szövegből, kebab-case, a jelenségről (pl. `mentes-gomb-inaktiv-ures-cimnel`).
- Dedup: `ls backlog backlog/later backlog/idea backlog/idea/later` slugjai és `Source:` sorai,
  `docs/PRODUCT.md` § Nem cél. Létező tétel fedi → **állj meg**: `/implement <slug>` vagy
  `/plan <slug>` az út. Nem cél irány vagy hard invariáns (root `CLAUDE.md`) → **állj meg**,
  mondd ki, `/idea`-t ajánlj.

## 2. Quick-terv — fejben, a `/plan` „nincs interjú” sávja szerint

Repro + elvárt viselkedés (bugnál) vagy egy mondat látható viselkedés; az érintett fájl(ok)
és meglévő teszt; a változás határa egy mondatban. **Ha bármelyik ponton termékdöntés bukkan
fel** — két irány, scope-kérdés, látható viselkedés több mondatban, invariáns közelsége —,
ez nem `/fix`: **állj meg**, írd le a kérdést, és ajánld: `/idea <slug> "<szöveg>"` → `/plan`.

## 3. Futás és végrehajtás

- `git status`: idegen commitolatlan módosításnál **állj meg** és kérdezz.
- `node scripts/workflow/run.mjs start --fix <slug>`. Ha megáll, jelentsd.
- Az `/implement` 2b–2e lépése egy tételre (`.claude/skills/implement/SKILL.md`): implementáció
  a quick-terv határán belül, teszt a megfigyelhető viselkedésre, célzott ellenőrzés, böngészős
  szelet **nincs** (ha kellene, az már nem `/fix`), diff-önellenőrzés, CHANGELOG ha doki-látható.
- `node scripts/workflow/close.mjs <slug> --fix --title "<cím>" --body "<Goal: repro + elvárt
  viselkedés, 1-3 mondat>" --trailer "Co-Authored-By: …" --trailer "Claude-Session: …"`.
- `node scripts/workflow/run.mjs finish`. Piros kapu: javítás, javító commit, újra `finish`;
  ha a quick-terv keretén belül nem megy: **állj meg**, a jelző marad, semmi nincs pusholva.
- Ha a 3. lépésben derül ki, hogy mégis termékdöntés kell, és még nincs commit:
  `git checkout -- <fájlok>`, új fájlok törlése, `node scripts/workflow/run.mjs abort`,
  és a 2. lépés átadása.

## 4. Záró jelentés

A commit (rövid SHA, tárgy), fent az `origin/master`-en, a Pages deploy elindult; a
diff-önellenőrzés három sora; CHANGELOG érintett-e; a talált, de ide nem tartozó hibák kész
`/idea` parancssorai; **számozott kézi tesztlista a dokinak a Pages-hez** — ezzel végződik.
