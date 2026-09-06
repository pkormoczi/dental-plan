---
name: plan-batch
description: Több ötlet-státuszú (backlog/idea[/later]/<slug>.md) backlog-tétel megtervezése egymás után, MINDEN interjú és jóváhagyás nélkül — kizárólag a plan/SKILL.md --quick kockázati sávjába eső, egyértelmű tételekre. Tételenként a --quick tartalom megírása (Goal/Current state/Approach/Decisions/Verification), közös Baseline a batch elejéről (a terv csak backlog/*.md-t ír, app-kód-driftet nem okoz), git mv idea[/later]/ → gyökér[/later]/, commit-push.mjs --no-push. Döntési ágat, nyitott terméki kérdést vagy egynél több mondatos látható-viselkedés-leírást hordozó ötlet KIMARAD (marad idea/ alatt, a jelentésben feljegyezve) — sosem interjúzik, sosem kér megerősítést, sosem találgat. A ciklus után egy sync.mjs: teljes kapu (docs-check) + EGY push. A kimenete az /implement-batch bemenete. Invoke explicitly with /plan-batch <slug> <slug>...
argument-hint: <slug> <slug>...
disable-model-invocation: true
---

# /plan-batch <slug> <slug>...

## Mikor NE ezt használd

Ez a skill a `/plan` két emberi kapuját **egyszerre** hagyja ki: nincs interjú (ezt a `--quick`
sáv is kihagyja), **és nincs a végleges tartalom jóváhagyása sem** (`plan/SKILL.md` „Megerősítés
írás előtt” szakasza — ezt a `--quick` önmagában NEM váltja ki, csak ez a skill). Ezért a
kockázati sáv szigorúbb, mint a `/plan --quick`-nél: **kétség esetén a tétel kimarad**, sosem
találgatás. Ne vedd fel a listába, és NE erőltesd bele --quick-ként, ha a tétel:

- `Type: doki` — sosem tervezhető;
- már tervezett (`backlog[/later]/<slug>.md`-ként létezik) — ennek nincs itt dolga;
- a `plan/SKILL.md` „--quick — a kis kockázatú sáv” kritériumát nem teljesíti egyértelműen:
  `Type: bug` reprodukálható leírás + elvárt viselkedés nélkül; vagy `chore`/`feature`, ahol van
  nyitott termékdöntés, hard invariánst érint, vagy a doki által látható viselkedés több
  mondatban írható le.

Ezekre `/plan <slug>` (interjúval) — az egytételes utat ez a skill nem helyettesíti.

## 0. Preflight

A fő könyvtárban, `master`-en: `node scripts/workflow/sync.mjs --require-clean` — friss
`origin/master`, megáll, ha a munkafa nem tiszta; jegyezd meg a kiírt HEAD-et. **Ez a HEAD a
batch minden tételének `Baseline`-ja**
— a terv csak `backlog/*.md`-t ír, ami a `drift.mjs` `CODE_PATHS`-jét (`app`, `data`, `assets`)
nem érinti, tehát a batchen belüli backlog-commitok nem okoznak driftet a következő tételnek; nem
kell tételenként újra-sync-elni.

Minden megadott slugra: `findItem` — **állj meg**, ha egy slug nem létezik, két helyen él, vagy
státusza nem `idea`. Olvasd el a `docs/PRODUCT.md` Nem cél szakaszát és a root `CLAUDE.md` Hard
invariánsait egyszer, a teljes listához — ezek a kizárás forrásai lent.

## 1. Ciklus, tételenként

**a. Kockázat-eldöntés.** Olvasd az ötletet. Ha a `--quick` kritérium (fent) nem teljesül
egyértelműen — két lehetséges irány, hard invariáns vagy `Nem cél` közelsége, a látható
viselkedés nem egy mondat, vagy a fájl már hordoz nyitott `Kerdes:`-t — a tétel **kimarad**:
jegyezd fel „interjút kér”-ként, `idea/` alatt marad (semmi nem íródik, nincs `git mv`), menj a
következőre.

**b. Tartalom — még a lemezre írás nélkül.** A `plan/SKILL.md` `--quick` sávja szerint állítsd
össze: Goal = repro + elvárt viselkedés (bugnál) vagy egy mondat (chore/feature); Current state =
az érintett fájl(ok) és a meglévő teszt; Approach = a változás határa, egy mondat; Decisions =
`- nincs`, vagy a technikai rutindöntés egy sorban indokolva; Verification = teszt a
megfigyelhető viselkedésre + a `plan/SKILL.md` kimeneti sablonjának többi tétele
(`typecheck/lint`, `docs-check`, manual-check szelet csak ha a változás típusa kéri).

Ugyanaz a szabály él itt, mint a `/plan --quick`-nél: **ha összeállítás közben döntési ág bukkan
fel** — a `Decisions`-be egynél több valódi választás kerülne, az `Approach` nem fér egy
mondatba, vagy a `Current state` átvizsgálása során egy invariáns- vagy `Nem cél`-ütközés
derül ki, amit az (a) triázs a puszta ötletszövegből nem látott előre — a tétel **ugyanúgy
kimarad**, mint (a)-ban: ne írd meg, ne mentsd el sehova (se ideiglenesen, se a végleges helyére),
jegyezd fel az okot, és menj a következő slugra. **A (c)/(d) lépés (git mv, commit) csak azután
következik, hogy a tartalom végig megfelelt a `--quick` sávnak** — így egy kihagyott tételnél
sosem marad félkész `git mv` vagy commit.

Ha a tartalom rendben áll: `Target: master`, `Baseline: <a 0. lépés HEAD-je>`. **Nincs
megjelenítés, nincs megerősítés-várás** — ez a lépés különbözik a `/plan`-tól.

**c. Mozgatás.** `git mv backlog/idea[/later]/<slug>.md backlog[/later]/<slug>.md` (a `Prio`
megmarad, a `later/` almappa követi).

**d. Commit, push nélkül:**
```
node scripts/workflow/commit-push.mjs --no-push -m "backlog: plan <slug>" \
  --trailer "Co-Authored-By: …" --trailer "Claude-Session: …" \
  -- backlog/idea[/later]/<slug>.md backlog[/later]/<slug>.md
```
(mindkét path kell, hogy a `git mv` átnevezésként kerüljön a commitba). Ha a script megáll,
old fel a `commit-push.mjs` üzenete szerint, majd folytasd a következő tétellel.

## 2. Záró publikálás

```
node scripts/workflow/sync.mjs
```
Teljes kapu (`build`+`lint`+`test`+`docs-check` — a batch csak backlog-fájlt írt, de a script nem
tudja ezt, mindig a teljeset futtatja) és **egy push** az egész láncra. Piros itt → javítás,
commit, `sync.mjs` újra. Nem-ff → a script maga rebase-el és kapuz újra.

## 3. Záró jelentés

- táblázat: `slug | megtervezve / kimaradt | ok (kimaradtnál)` — a kimaradt sor ok-oszlopa mondja
  ki, hol akadt el: (a) a puszta ötletszöveg alapján, vagy (b) tartalom összeállítása közben derült
  ki a döntési ág. Minden kimaradt tétel érintetlenül `idea/` alatt marad.
- a felvitt commit-tartomány, és hogy fent van az `origin/master`-en;
- a következő lépés: a megtervezett slugok bemenetei egy `/implement-batch <slug>...` hívásnak;
  a kimaradtak egyénileg `/plan <slug>`-ot kérnek (interjúval) — a doki ezt kézzel intézi.
