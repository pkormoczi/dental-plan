# picomatch-redos-kovetes
Type: chore
Source: vite-biztonsagi-frissites implementálása közben talált (npm audit, 2026-11-17)

A `picomatch` GHSA-fc5q-39xc-vjpf (magas, ReDoS, `<=4.0.7`) miatt az `app/`-ban az `npm audit` a
`vite`/`vitest`/`@vitejs/plugin-react`/`tinyglobby` és az `electron-builder` (`node-gyp`,
`@electron/rebuild`) láncon magas találatot mutat; a legfrissebb kiadott `picomatch` (4.0.7) is
érintett, javított verzió még nincs. Mind fejlesztői/build-függőség, a termékfába nem kerül. Ha a
javított `picomatch` megjelenik: `npm audit fix` az `app/`-ban, `--force` és major váltás nélkül;
utána csak a `minimatch`-lánc maradhat. Nem tartozik ide: a `minimatch`-lánc (az `electron-builder`
major visszalépése lenne).
