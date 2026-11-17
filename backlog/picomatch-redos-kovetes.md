# picomatch-redos-kovetes
Type: chore
Source: vite-biztonsagi-frissites implementálása közben talált (npm audit, 2026-11-17)
Target: master
Baseline: 1e206d44dc0ed59707aba5d7068ae76b71059ca8

## Goal
A `picomatch` javított kiadásával az `app/` fejlesztői és build-függőségeiben nem marad magas
súlyosságú `npm audit`-találat; a doki számára nincs látható változás.

## Current state
- `npm audit` (2026-11-17): 14 találat (9 magas, 5 közepes). Minden magas a GHSA-fc5q-39xc-vjpf-re
  (`picomatch` `<=4.0.7`, ReDoS) vezet vissza: `picomatch`/`fdir`/`tinyglobby` → `vite`, `vitest`,
  `@vitejs/plugin-react`, ill. `tinyglobby` → `node-gyp` → `@electron/rebuild` → `app-builder-lib`.
  A közepesek a `minimatch`-lánc (`@electron/universal`, `dmg-builder`, `electron-builder`).
- `npm view picomatch`: a legfrissebb kiadás a 4.0.7 (2026-08-24) — javított verzió a tervezéskor
  nincs.
- Tartományok: `vite` 8.3.8 `picomatch ^4.0.7`, `tinyglobby` 0.2.17 `^4.0.4`, `vitest` 4.1.12
  `^4.0.3`, `fdir` peer `^3 || ^4` — egy javított 4.x kiadás mindegyiken belül van.
- `npm ls --omit=dev picomatch minimatch tinyglobby`: üres — egyik sem kerül a termékbe.
- `app/package.json`, `app/package-lock.json`.

## Approach
Előfeltétel: az npm-en megjelent a GHSA-fc5q-39xc-vjpf-et javító `picomatch` (az advisory javított
tartománya szerint). Ha az `/implement` idején nincs, a tétel kimarad, a terv érintetlen marad.
Ha van: `npm audit fix` `--force` nélkül az `app/`-ban; a változás a lockfile-ban jelenik meg. App-kód,
konfiguráció és teszt nem változik. Nem tartozik ide: a `minimatch`-lánc (az `electron-builder`
25.1.0-ra lépne vissza), `overrides`, bármilyen major verzióváltás.

## Decisions
- Kivárás a javított kiadásra — mert javított verzió nélkül nincs semver-en belüli lépés; nem
  `overrides` egy másik csomagra, mert az a függőségi fát a felsőbb csomagok mögött írná át egy
  csak fejlesztői/build-eszközt érintő hibáért.

## Verification
- [ ] `npm audit`: nincs magas súlyosságú találat; ami marad, az csak a `minimatch`-lánc (közepes)
- [ ] tests — a teljes vitest-készlet zöld
- [ ] `npm run test:electron` zöld (CSP-sértés nélkül indul, a PDF-ben a font és a logó benne van)
- [ ] typecheck/lint — `npm run build` a Pages-hez továbbra is `/dental-plan/` alá épít
- [ ] docs-check
