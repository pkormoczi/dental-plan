# sanitize-foglalt-windows-nevek
Type: chore
Source: desktop-app-migration-plan-final.md §4.8 és §10.0
Target: master
Baseline: ea1e320ab0bca3af17f8639e25ba99cec54f5578

## Goal
Nincs doki-látható változás: a `sanitizeNamePart()` kimenete a 40 karakteres vágás után sem végződhet
szóközre vagy pontra.

## Current state
- `app/src/storage/paths.ts` `sanitizeNamePart`: trim, tiltott karakter cseréje, záró pont/szóköz levágása,
  majd `slice(0, MAX_NAME_PART_LENGTH)` — a vágás új záró szóközt vagy pontot hagyhat. Hívói:
  `buildPatientDirName` (név-részek `-`-vel, utána `_<id>`) és `buildPlanDirName` (`<cím>_<id>`).
- A mappanév csak létrehozáskor számolódik, a keresés `paciensId`/`tervId` alapján megy: meglévő mappák
  nevét a változás nem érinti.
- `app/src/storage/paths.test.ts` `describe('sanitizeNamePart')`, „trims a trailing dot or space (illegal
  on Windows)”.

## Approach
- Csak `sanitizeNamePart`: a záró pont/szóköz levágása a vágás után is lefut; a `Nevtelen` fallback a
  végeredményre érvényes.
- NEM tartozik ide: foglalt Windows-nevek (`CON`, `AUX`, …), Unicode-normalizáció, útvonalhossz-ellenőrzés.

## Decisions
- Foglalt-név védelem nem kell — mert a kimenet mindig `-` vagy `_<id>` elé kerül, így pl. `AUX_ab12cd`
  sosem foglalt név; egy jövőbeli, teljes névként használó hívó a saját tételében hozza.

## Verification
- [ ] tests — hosszú bemenetnél, ahol a 40. karakter szóköz vagy pont, a kimenet legfeljebb 40 karakter és
      nem végződik szóközre/pontra; pontokból és szóközökből álló bemenetre `Nevtelen`; a meglévő
      `sanitizeNamePart` tesztek változatlanul zöldek
- [ ] typecheck/lint
- [ ] docs-check
