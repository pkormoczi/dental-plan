---
name: plan
description: Interview the user about one backlog item or one new idea (from backlog/ideas or a freeform prompt) branch by branch until every decision is resolved, then write backlog/plans/<slug>.md (Goal / Current state / Approach / Decisions / Verification, with a Baseline SHA). For ideas not yet in BACKLOG.md it also assigns the next tétel-szám from the BACKLOG.md header counter and writes the ### N. tétel entry. Never writes application code and never edits the source notes it reads. Invoke explicitly with /plan <slug>.
argument-hint: <slug> [tétel-szám | ötlet-forrás]
disable-model-invocation: true
---

# /plan <slug>

## Cél

Egy döntést végigvinni implementáció-indításig, és az eredményt egy rövid, az
implementáló session számára olvasható tervfájlba írni. A kiinduló ötlet jöhet:

- **A)** egy már számozott, de terv nélküli `backlog/BACKLOG.md` tételből,
- **B1)** a `backlog/ideas/` egy konkrét, a hívó által kijelölt ötletéből,
- **B2)** egy szabadon, a hívásban vagy a beszélgetésben leírt felvetésből.

A `<slug>` kötelező, kebab-case, a fájlnév és a későbbi `/implement <slug>` /
`/finish <slug>` hívások azonosítója. A kimenet mindig `backlog/plans/<slug>.md`.

**Ez a skill soha nem ír és nem módosít alkalmazáskódot** (`app/`, `data/`,
`assets/` alatt semmit), és soha nem módosítja a forrás-jegyzeteket
(`backlog/ideas/` csak olvasásra). Amit ír:

- az új `backlog/plans/<slug>.md` fájlt,
- A módban: a meglévő tétel végére egyetlen `**Terv:**` sort, ha még hiányzik,
- B módban: az új `### N. tétel` bekezdést a `KIDOLGOZOTT` blokk VÉGÉRE, és a
  fejléc `**Legutóbb kiosztott szám:**` sorának átírását `N`-re.

## Előkészítés — mielőtt egy kérdést is felteszel

1. Olvasd el a célzott tételt (A mód) vagy a forrás-szakaszt / a felvetést (B mód).
2. Olvasd el a `PRODUCT.md`-t (különösen a **Nem cél** és a **Szándékos hiányok és
   nyitott kérdések** szakaszt), a root `CLAUDE.md` **Hard invariants** listáját és
   az érintett terület nested `CLAUDE.md`-jét (`app/src`, `domain`, `storage`, `pdf`).
   Ezek nem tárgyalási alap — ha egy döntési ág ütközik velük, EXPLICIT vesd fel,
   ne csendben kerülgesd, és ne csendben fogadd el az ütközést.
3. Fuss át a `backlog/BACKLOG.md` **NEM FEJLESZTÉS** és **EGYÉB ötletek** szakaszán —
   ha a felvetés egy már mérlegelt és elvetett irány, mondd ki, és kérdezd meg, mi
   változott azóta.
4. A nested `CLAUDE.md`-k „Find before writing” indexét nézd át — a döntéseknek a
   meglévő helperekre kell épülniük. Ez tájékozódás, nem szignatúra-tervezés.

**Több-ötletes nyers jegyzetnél** (a hívó egy egész `backlog/ideas/*.md` fájlra mutat,
konkrét ötlet nélkül): első lépésben sorold fel a fájlban azonosítható különálló
ötleteket, mindegyik mellett jelezve, ha már lefedi egy meglévő tétel, ha elvetett
irány, vagy ha `PRODUCT.md` nem-céllal / hard invariánssal ütközik. A jelöltek nem
esnek ki emiatt — a felhasználó választ pontosan EGYET. Egy `/plan` futás mindig
egyetlen tételt visz végig.

## Hogyan dolgozz — az interjú

1. **Olvasd a felvetést** — értsd meg, mit mond a felhasználó eddig.
2. **Térképezd fel a döntési fát** — adatmodell, mappa-/fájlszerkezet, UX, szélső
   esetek, meglévő invariánsokra gyakorolt hatás.
3. **Ágazz egyszerre egyet** — a legnagyobb hatású bizonytalansággal kezdve; ne lépj
   tovább, amíg az ág nincs lezárva.
4. **Nevezd meg a függőségeket** — ha egy döntés korlátoz egy másikat, mondd ki.
5. **Foglald össze menet közben** — minden lezárt ág után ismételd vissza a döntést.
6. **Állj meg, ha nincs egyezés** — „majdnem kész” állapotban ne írj.

Szabályok: sose feltételezz, kérdezz; egyszerre egy téma; tolj vissza konkrétan (a
`PRODUCT.md` szakaszára, az invariánsra vagy az elvetett tételre hivatkozva, nem
általánosságban); vess fel elvetett alternatívát is; legyél direkt; kövesd, mely
ágak zárultak le.

## Korlátok — amit ez a skill SOHA nem tesz

- Nem ír és nem módosít alkalmazáskódot — mintakódot, „illusztrációs” snippetet sem.
- Nem ír függvényszignatúrát, típusdefiníciót vagy implementációs részletességű
  fájlstruktúra-tervet. A `Current state` és az `Approach` fájl-/symbol-szintű
  pointer, nem implementációs terv.
- Nem módosítja a `backlog/ideas/` fájlokat — ismétlődő futásnál a 3. előkészítő
  lépés dedup-ellenőrzése a védelem, nem egy visszajelölés.
- Nem priorizál: a tételszám stabil azonosító, nem rangsor; az új tétel mindig a
  `KIDOLGOZOTT` blokk végére kerül.
- Nem implementál és nem zár le semmit — az a `/implement` és a `/finish` dolga.

## Kimenet — a tervfájl

`backlog/plans/<slug>.md`, **legfeljebb 6000 karakter**, magyarul (a séma-mezőneveket
nem fordítjuk, lásd root `CLAUDE.md` Domain szókincs):

```md
# <slug>
Target: master
Baseline: <git rev-parse origin/master a tervezés pillanatában>

## Goal
Egy mondat: mit lát másképp a doki.

## Current state
Csak a releváns fájlok, symbolok, tesztek — path-qualified (pl. `app/src/domain/totals.ts`
`tervVegosszeg`, `app/src/pages/PreviewPage.test.tsx` „nyilatkozat placeholder kemény zár”).

## Approach
Mely fájlok / boundary-k változnak, melyek nem. Explicit hatókör-határ: mi NEM tartozik ide.

## Decisions
Csak valódi választásnál, egy sor / döntés:
- <választás> — mert <ok>; nem <alternatíva>, mert <ok>.

## Verification
- [ ] tests — milyen megfigyelhető viselkedést kell látni (nem hogyan tesztelni)
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf | visual-css | keyboard-a11y — csak ha a változás típusa kéri
      (a kadencia-tábla a `.claude/skills/manual-checks/SKILL.md`-ben); különben törölni
```

A `Baseline` a `git fetch origin` utáni `git rev-parse origin/master`. A tervfájl a
`/finish` után törlődik — a git history a történetiség, ezért ne írj bele semmit,
amit később „meg akarnál találni”: ami tartós context, az a `/finish` 4. lépésében
`PRODUCT.md`-be vagy nested `CLAUDE.md`-be kerül.

## Kimenet — a `BACKLOG.md` bejegyzés

A módban: ha a tétel még nem hivatkozik a tervfájlra, egyetlen sor a tétel végére:
`**Terv:** \`backlog/plans/<slug>.md\``.

B módban az új tétel, a meglévő `KIDOLGOZOTT` tételek formájában, a blokk VÉGÉRE:

```md
### N. tétel: <cím>

  (<forrás-hivatkozás: „a backlog/ideas/<fájlnév> alapján”, vagy semmi>) — a jelenlegi
  hiány/fájdalom röviden, majd mit vezet be a tétel; explicit kizárt scope-bulletek, ha
  voltak. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/<slug>.md`
```

**Számozás.** `N` = a `BACKLOG.md` fejlécének `**Legutóbb kiosztott szám:** M` sora
szerinti `M + 1`; ugyanabban az írásban a sor `N`-re íródik át. A lezárt tételek
szakasza törlődik a fájlból, ezért a szabad számot SOHA nem a fájlban látható
legnagyobb tételszámból, hanem kizárólag ebből a számlálóból kell venni.

## Megerősítés írás előtt

Ne írj a lemezre, amíg a döntési fa minden ága le nincs zárva ÉS a felhasználó jóvá
nem hagyta az összefoglalót. Mutasd meg a teljes tervezett tartalmat, és csak kifejezett
jóváhagyás után írj. B módban két megerősítési pont: 1) jelölt-választás (csak
több-ötletes jegyzetnél), 2) a végleges tartalom — EGYSZERRE az új `### N. tétel`
bekezdés ÉS a tervfájl.

**Közvetlenül írás előtt**, a jóváhagyás után: `git fetch origin`, majd az
`origin/master` `backlog/BACKLOG.md`-jének fejléc-számlálóját ÉS a helyi fájlét
olvasd újra — párhuzamos session közben kioszthatott egy számot. Ha a számláló
elmozdult, válts a következő szabad számra, és jelezd. A `Baseline`-t is ekkor vedd.

## Záró jelentés

A létrehozott fájl(ok), a kiosztott szám (B mód), és a következő lépés:
`/implement <slug>`.
