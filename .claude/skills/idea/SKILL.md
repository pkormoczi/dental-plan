---
name: idea
description: Capture one or more raw ideas, bugs, chores or doki-tasks as backlog/<slug>.md files with Status: idea (header Status/Type, optional Source and Kerdes, one paragraph, ≤1500 chars). Dedups against existing backlog slugs and PRODUCT.md § Nem cél, splits a multi-idea note (feedback list, review report) into separate files the user picks from. Never writes application code, never plans, never commits. Invoke explicitly with /idea <slug> [szöveg | forrás-fájl].
argument-hint: <slug> [szöveg | forrás-fájl]
disable-model-invocation: true
---

# /idea <slug> [szöveg | forrás-fájl]

## Cél

Egy nyers felvetést — a doki ötlete, egy feedback-lista sora, egy review-jelentés
megállapítása, egy menet közben talált bug, egy kód-housekeeping teendő — azonnal a
backlog egy tételévé tenni: `backlog/<slug>.md`, `Status: idea`. Nincs inbox, nincs
várólista: ami nem fájl, az nincs. A fájlalak és az értékkészlet: `backlog/CLAUDE.md`.

A tétel innen két irányba mehet: `/plan <slug>` (kidolgozás) vagy `git rm` (elvetés — ha az
elvetés termékszintű, egy sor a `PRODUCT.md` Nem cél szakaszába, „nem X, amíg Y” alakban).

**Ez a skill soha nem ír app-kódot, nem tervez, nem rangsorol és nem commitol.**

## Bemenet

- `<slug>`: kebab-case, a fájlnév. Többötletes forrásnál a slugot ötletenként a skill
  javasolja, a hívásban adott slug csak az első jelöltre vonatkozik.
- `szöveg`: a felvetés egy-két mondatban, vagy
- `forrás-fájl`: pl. `docs/reviews/<jelentés>.md` — ekkor a skill a jelentés megállapításait
  szedi szét; vagy semmi — ekkor a beszélgetés eddigi tartalma a forrás.

## Lépések

1. **Olvasd el a forrást**, és a `PRODUCT.md` Nem cél szakaszát.
2. **Dedup.** `ls backlog/` — slugok és a fájlok `Source:` sorai. Ha egy létező tétel már fedi a
   felvetést, ne nyiss újat: mondd meg, melyik, és állj meg. Ha a felvetés a `PRODUCT.md` Nem
   cél szerint elvetett irány vagy hard invariánst sért, mondd ki — a tétel ettől még
   felvehető (a doki dönt), de a bekezdés első mondata jelezze az ütközést.
3. **Többötletes forrásnál** sorold fel a különálló jelölteket: javasolt slug, `Type`, egy
   mondat, és a dedup-/ütközés-jelzés. A felhasználó választ — egyet vagy többet. Egy futás
   több fájlt is írhat, de csak kiválasztottat.
4. **`Type`:** `feature` | `bug` (reprodukálható hiba) | `chore` (kód-housekeeping, refactor,
   őr-erősítés) | `doki` (emberi teendő, adatmunka — sosem lesz planned). Ha nem egyértelmű,
   kérdezz.
5. **`Kerdes:`** csak akkor, ha a tétel sorsa egy konkrét doki-kérdésen múlik — a kérdés
   múltbeli viselkedésre kérdezzen, ne véleményre.
6. **`Source:`** honnan jött: review-jelentés + megállapítás sorszáma, „Réka feedback
   <hónap>”, „doki felvetés”, „<slug> implementálása közben talált”. Legacy-dokumentumra és
   D-számra nem hivatkozhat (docs-check).
7. **Mutasd meg a teljes fájltartalmat**, és csak kifejezett jóváhagyás után írj.

## A fájl

```md
# <slug>
Status: idea
Type: feature|bug|chore|doki
Source: <honnan>
Kerdes: <csak ha van>

Egy bekezdés: mi a fájdalom / mi hiányzik, mit látna másképp a doki; bugnál repro + elvárt
viselkedés; ha van explicit kizárt scope, egy mondatban. Legfeljebb 1500 karakter — a
részlet a /plan-é vagy a git historyé.
```

## Záró jelentés

A létrehozott fájl(ok), a dedup-találatok (mit NEM vettél fel és miért), és hogy a fájl
commitolatlan — a következő commitba a doki teszi be (vagy a `/finish` viszi a tételével).
Következő lépés: `/plan <slug>` vagy `/plan <slug> --quick` (egyértelmű bug).
