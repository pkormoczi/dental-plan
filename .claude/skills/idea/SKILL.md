---
name: idea
description: Capture one or more raw ideas, bugs, chores or doki-tasks as backlog/idea/<slug>.md files (or backlog/idea/later/<slug>.md when the caller explicitly said Prio later; header Type, optional Source, Kerdes and Prio, one paragraph, ≤1500 chars), then commit and push them at once (scripts/workflow/commit-push.mjs) so the item is shared state from the start. Dedups against existing backlog slugs (all four folders), the derived state of review findings (scripts/workflow/reviews.mjs --json) and docs/PRODUCT.md § Nem cél; splits a multi-idea note (feedback list, review report) into separate candidates the user decides on one by one — take up, reject with reason, duplicate of, acknowledged, later — and books every decision as a Döntés: line in the source report (reviews.mjs dontes) in the same commit. Never writes application code, never plans, never decides Prio on its own. Invoke explicitly with /idea <slug> [szöveg | forrás-fájl | review:<jelentés>#<id>].
argument-hint: <slug> [szöveg | forrás-fájl | review:<jelentés>#<id>]
disable-model-invocation: true
---

# /idea <slug> [szöveg | forrás-fájl | review:<jelentés>#<id>]

## Cél

Egy nyers felvetést — a doki ötlete, egy feedback-lista sora, egy review-jelentés
megállapítása, egy menet közben talált bug, egy kód-housekeeping teendő — azonnal a
backlog egy tételévé tenni: `backlog/idea/<slug>.md` — a státusz a mappa; ha a hívó kimondta,
hogy `later`, akkor `backlog/idea/later/<slug>.md` (a `later/` mappa a `Prio: later` tükre, a
docs-check őrzi). Nincs inbox, nincs várólista: ami nem fájl, az nincs. A fájlalak és az
értékkészlet: `backlog/CLAUDE.md`.

A tétel innen két irányba mehet: `/plan <slug>` (kidolgozás) vagy elvetés —
`node scripts/workflow/discard.mjs <slug> --reason "<indok>"`, ami a `backlog: -<slug>` commitot és a
forrás-jelentés `Döntés: elvetve` sorát is írja; ha az elvetés termékszintű, még egy sor a
`docs/PRODUCT.md` Nem cél szakaszába, „nem X, amíg Y” alakban.

Review-jelentés megállapításából induló tételnél a skill a **döntést is könyveli**: a jelentés
megállapítása alá egy `Döntés:` sor kerül (`node scripts/workflow/reviews.mjs dontes review:<jelentés>#<id>
"<érték> (<dátum>)"`), ugyanabban a commitban, mint a tételfájl. Így a `/reviews` lista és a
review-skillek dedupja a jelentésből tudja, mi lett a pontból.

**Ez a skill soha nem ír app-kódot, nem tervez, és `Prio:`-t magától nem dönt el.** A fájlt írás
után **azonnal commitolja és pusholja** — a backlog minden állapotváltozása megosztott állapot.

## Bemenet

- `<slug>`: kebab-case, a fájlnév. Többötletes forrásnál a slugot ötletenként a skill
  javasolja, a hívásban adott slug csak az első jelöltre vonatkozik.
- `szöveg`: a felvetés egy-két mondatban, vagy
- `forrás-fájl`: pl. `docs/reviews/<jelentés>.md` — ekkor a skill a jelentés megállapításait
  szedi szét; vagy
- `review:<jelentés-basename>#<id>`: egyetlen megállapítás (a `/reviews` és a review-skillek
  záró üzenete ilyen sort ad) — a skill a jelentés `### <id>. …` szakaszát olvassa; vagy semmi —
  ekkor a beszélgetés eddigi tartalma a forrás.

## Lépések

1. **Olvasd el a forrást**, és a `docs/PRODUCT.md` Nem cél szakaszát.
2. **Dedup.** `ls backlog backlog/later backlog/idea backlog/idea/later` — slugok mind a négy
   mappában és a fájlok `Source:` sorai. Review-forrásnál még `node scripts/workflow/reviews.mjs
   --json`: a megállapítás levezetett állapota (`backlog <slug>` → a meglévő tétel fedi;
   `javítva`/`elvetve`/`duplikátum` → mondd meg, mi lett belőle és miért, és állj meg — kivéve, ha
   a hívó kimondja, hogy a jelenség a javítás után újra fennáll: akkor új tétel, a bekezdés első
   mondata a regresszióról). Ha egy létező tétel már fedi a felvetést, ne nyiss újat: mondd meg,
   melyik, és állj meg. Ha a felvetés a `docs/PRODUCT.md` Nem cél szerint elvetett irány vagy hard
   invariánst sért, mondd ki — a tétel ettől még felvehető (a doki dönt), de a bekezdés első
   mondata jelezze az ütközést.
3. **Többötletes forrásnál** sorold fel a különálló jelölteket: javasolt slug, `Type`, egy
   mondat, és a dedup-/ütközés-jelzés. A felhasználó választ — egyet vagy többet. Egy futás
   több fájlt is írhat, de csak kiválasztottat. **Review-jelentésnél minden jelölt egy
   megállapítás (`review:<jelentés>#<id>`), és minden jelöltről döntés születik**, nem csak a
   felvettekről: `felvesz` (tétel + `Döntés: backlog <slug>`), `elvetve: <indok>`,
   `duplikátum → review:<id>` (a cél nem lehet maga is duplikátum), `tudomásul véve`, vagy
   `később` (nincs könyvelés, a pont nyitva marad). A Közepes/Kis pontok döntés nélkül is
   „tudomásul véve” állapotúak — azokra csak akkor kérdezz, ha a hívó kéri, vagy `ISMÉT`
   címkéjűek. A döntést a doki vagy a fejlesztő mondja ki, a skill nem találja ki.
4. **`Type`:** `feature` | `bug` (reprodukálható hiba) | `chore` (kód-housekeeping, refactor,
   őr-erősítés) | `doki` (emberi teendő, adatmunka — sosem kerül a gyökérbe). Ha nem egyértelmű,
   kérdezz.
5. **`Kerdes:`** csak akkor, ha a tétel sorsa egy konkrét doki-kérdésen múlik — a kérdés
   múltbeli viselkedésre kérdezzen, ne véleményre.
6. **`Source:`** honnan jött. Review-megállapításnál a gépi alak kötelező:
   `Source: review:<jelentés-basename>#<id>` (több forrás `;`-vel: `review:…#3; review:…#7`) — a
   docs-check feloldja, a `reviews.mjs` ebből vezeti le a `backlog`/`javítva` állapotot, a
   `close.mjs` és a `discard.mjs` ebből tudja, melyik jelentésbe könyveljen. Más forrásnál szabad
   szöveg: „Réka feedback <hónap>”, „doki felvetés”, „<slug> implementálása közben talált”.
   Legacy-dokumentumra és D-számra nem hivatkozhat (docs-check).
7. **`Prio:`** (`now` | `next` | `later`) csak akkor, ha a doki vagy a fejlesztő a hívásban vagy a
   beszélgetésben kimondta. Ne kérdezz rá, ne javasolj — hiánya azt jelenti, még nincs döntés.
   `later`-nél a fájl helye `backlog/idea/later/<slug>.md`, különben `backlog/idea/<slug>.md`.
8. **Mutasd meg a teljes fájltartalmat** és a könyvelendő `Döntés:` sorokat, és csak kifejezett
   jóváhagyás után írj.
9. **Döntések könyvelése** (csak review-forrásnál): minden eldöntött megállapításra
   `node scripts/workflow/reviews.mjs dontes review:<jelentés>#<id> "<érték> (<YYYY-MM-DD>)"` —
   `backlog <slug>` a felvettekre, `elvetve: <indok>`, `duplikátum → review:<id>`, `tudomásul véve`
   a többire. A script csak fájlt ír; a jelentés path-ja a következő lépés commitjába kerül.
10. **Commit + push:** `node scripts/workflow/commit-push.mjs -m "backlog: +<slug>" --trailer
   "Co-Authored-By: …" --trailer "Claude-Session: …" -- backlog/idea[/later]/<slug>.md
   [docs/reviews/<jelentés>.md]` (több fájl egy futásban: egy commit, `backlog: +a, +b`, minden
   path a `--` után; csak döntés-könyvelésnél, tétel nélkül: `review: <jelentés> döntések`). A
   script docs-checket futtat, commitol, pushol; ha megáll (piros docs-check, megbukott push),
   jelentsd a kimenetét — ne kerüld meg kézi `git`-tel.

## A fájl — `backlog/idea/<slug>.md` (`later`-nél `backlog/idea/later/<slug>.md`)

```md
# <slug>
Type: feature|bug|chore|doki
Source: <honnan>
Kerdes: <csak ha van>
Prio: <csak ha a doki vagy a fejlesztő kimondta: now|next|later>

Egy bekezdés: mi a fájdalom / mi hiányzik, mit látna másképp a doki; bugnál repro + elvárt
viselkedés; ha van explicit kizárt scope, egy mondatban. Legfeljebb 1500 karakter — a
részlet a /plan-é vagy a git historyé.
```

## Záró jelentés

A létrehozott fájl(ok), a dedup-találatok (mit NEM vettél fel és miért), a könyvelt `Döntés:`
sorok jelentésenként, a commit rövid SHA-ja és hogy fent van az `origin/master`-en. Következő
lépés: `/plan <slug>` vagy `/plan <slug> --quick` (egyértelmű bug); review-forrásnál `/reviews`
mutatja, maradt-e nyitott pont.
