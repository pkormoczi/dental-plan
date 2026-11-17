# vite-biztonsagi-frissites
Type: chore
Source: electron-hej-ablak implementálása közben talált (npm audit, 2026-11-17)
Target: master
Baseline: 70dc2d6e0dac4d8d5eaffd4d584133c58df6e1a4

## Goal
Az `app/` fejlesztői és build-függőségei a semver-tartományon belül a javított verzióra frissülnek;
a doki számára nincs látható változás.

## Current state
- `app/package.json` devDependencies: `vite ^8.2.0`, `vitest ^4.1.10`, `electron-builder ^26.18.0`;
  `app/package-lock.json`.
- `npm audit`: 12 találat (8 közepes, 4 magas) — `vite` 8.2.0–8.2.2, `vitest`/`@vitest/mocker`,
  `nanoid`, `source-map-js`, `undici` (a `jsdom` alatt), `minimatch` (az `electron-builder` alatt).
  `npm ls --omit=dev` üres: egyik sem kerül a termékbe.
- `npm audit fix --dry-run`: `vite` 8.2.0 → 8.3.8, `vitest` → 4.1.12, `electron-builder` és
  `app-builder-lib` → 26.18.1, `nanoid`, `source-map-js`, `postcss`, `rolldown` tartományon belül.
- `app/vite.config.ts` `cspPlugin` (`transformIndexHtml`), `base` és `build` a `mode` szerint.

## Approach
`npm audit fix` `--force` nélkül az `app/`-ban; a változás a lockfile-ban (és ha az npm úgy írja, a
`package.json` alsó határaiban) jelenik meg. App-kód, konfiguráció és teszt nem változik. Nem
tartozik ide: a `--force` (az `electron-builder`-t a 25.1.0-ra léptetné vissza), és semmilyen
major verzióváltás.

## Decisions
- A `minimatch`-lánc maradhat, ha a 26.18.1-es `electron-builder` sem javítja — mert csak a
  csomagoláskor fut, és a javítás egy major visszalépés lenne.

## Verification
- [ ] `npm audit`: nincs magas súlyosságú találat; ami marad, az csak a `minimatch`-lánc
- [ ] tests — a teljes vitest-készlet és a `test:workflow` zöld
- [ ] `npm run test:electron` zöld (új `vite` és `electron-builder` alatt is: CSP-sértés nélkül
      indul, a PDF-ben a font és a logó benne van)
- [ ] typecheck/lint — `npm run build` a Pages-hez továbbra is `/dental-plan/` alá épít
- [ ] docs-check
