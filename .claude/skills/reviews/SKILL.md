---
name: reviews
description: List the review reports in docs/reviews/ (root and archive/) with their processing state as computed by scripts/workflow/reviews.mjs — per report the open above-threshold findings (Blokkoló/Súlyos/ISMÉT/unknown severity) and open Közepes/Kis ones, every finding's derived state (live backlog item Source: line, Döntés: line, closing or discard commit), warnings on contradictions, and a ready /idea command per open finding. Read-only — never decides, never writes a Döntés: line, never creates backlog items; decisions go through /idea. Invoke explicitly with /reviews [--all].
argument-hint: [--all]
disable-model-invocation: true
---

# /reviews [--all]

## Cél

Egy nézetben látszódjon, mely review-jelentésekkel van még teendő, és melyik megállapítás milyen
állapotban van — kézi index nélkül. Az állapot a fájlokból és a gitből számolódik
(`scripts/workflow/reviews.mjs`): élő tétel `Source: review:<jelentés>#<id>` sora → `backlog`;
a jelentés `Döntés:` sora → annak értéke; törölt tétel + `"<slug>: …"` lezáró commit → `javítva`,
`backlog: -<slug>` commit → `elvetve`; Közepes/Kis pont döntés nélkül → `tudomásul véve`;
egyébként `nyitott`. **Teendő** = nyitott Blokkoló/Súlyos/ISMÉT (vagy ismeretlen súlyosságú)
pont. Egy jelentés feldolgozott, ha ilyen pontja nincs, vagy a fejlécében `Feldolgozás:
felülírta review:<újabb jelentés>` áll.

**Ez a skill csak olvas.** Nem dönt, nem ír `Döntés:` sort, nem hoz létre tételt. A döntés a
dokié vagy a fejlesztőé, és az `/idea <slug> review:<jelentés>#<id>` útján könyvelődik.

## Lépések

1. Futtasd: `node scripts/workflow/reviews.mjs` (`--all`-lal, ha a hívó kérte — akkor a nyitott
   Közepes/Kis pontok is listázódnak). Ha a script figyelmeztetést ad (ellentmondó állapot,
   feloldhatatlan `review:` hivatkozás, nyitott pont `archive/` alatt), azt írd ki **először**,
   külön — ez könyvelési hiba, amit a következő `/idea` vagy kézi javítás rendez.
2. Add vissza a lista-táblát rövidítés nélkül, majd a nyitott pontokat a script kész `/idea`
   sorával. A javasolt slug a script címből képzett javaslata — a hívásban átírható.
3. **Javaslat, legfeljebb 3:** melyik jelentést vagy pontot érdemes először eldönteni, és miért
   (pl. Blokkoló, több jelentésben ISMÉT, egy tervezett tételt blokkol). Zárómondat: *„Ez
   javaslat, nem döntés — a döntést az `/idea <slug> review:<id>` könyveli (felvétel, elvetés,
   duplikátum, tudomásul véve).”* Ha nincs nyitott pont, ez a pont kimarad.

## Korlátok

- Nem módosít fájlt, nem fetchel, nem commitol.
- Nem olvassa végig a jelentéseket: a részletekért a hívó nyitja meg a jelentést a listázott
  `review:<id>` alapján.
- Archiválást (`git mv docs/reviews/<jelentés>.md docs/reviews/archive/`) nem végez; az a
  fejlesztő kézi lépése egy feldolgozott jelentésen, `commit-push.mjs`-szel.
