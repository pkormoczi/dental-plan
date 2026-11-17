# electron-release-workflow
Type: chore
Source: desktop-app-migration-plan-final.md §10.1 és §9.3
Target: master
Baseline: d73be74f1eee5e7e62825ac096fa0dec94e92d54

## Goal
Egy `v*` tag pushára a GitHub felépíti a Windows-telepítőt és az Apple Silicon dmg-t, mindkettőn lefut a
teszt és a füst-teszt, a telepítők az útmutatóval egy GitHub Release-be kerülnek — és az első
teszt-release elkészül.

## Current state
- `.github/workflows/ci.yml` (ubuntu: lint, test, test:workflow, docs-check, build) és `deploy.yml`
  (Pages, a CI után); release workflow nincs.
- `app/package.json` `version: 0.0.0`; `electron:package`, `test:electron` és `docs/TELEPITES.md` az
  előző tételekből.
- A repó publikus, tehát a Release nyilvános; a telepítő a Pages-demóval azonos seed-adatot hordoz,
  páciensadatot nem.

## Approach
- Új `.github/workflows/release.yml`: `push: tags: ['v*']` és `workflow_dispatch` (próbafutás: build,
  tesztek, run-artifact, Release nélkül).
- Build-job, mátrix `windows-latest` + `macos-latest` (arm64): checkout, setup-node (mint a `ci.yml`),
  `npm ci`, `npm test`, a verzió a tagből (csak a CI-munkapéldány `package.json`-jába), `electron:package`,
  `test:electron` a kicsomagolt csomagon, a telepítő feltöltése run-artifactként; `contents: read`.
- Publikáló job (ubuntu, mindkét build után, csak tag-eseményre): artifactok letöltése, `gh release
  create` a telepítőkkel és a `docs/TELEPITES.md`-vel; `-`-t tartalmazó tag → pre-release. Csak ez a job
  kap `contents: write`-ot.
- Őr: a tagelt commit a `master` őse, különben a workflow bukik.
- A `ci.yml` és a `deploy.yml` nem változik.
- A záró push után az /implement: `gh workflow run release.yml` próbafutás → zöld → `v0.1.0-teszt.1`
  tag push → a futás zöld, a Release pre-release-ként létrejön.
- **Nem tartozik ide:** auto-update, aláírás, a FileSystemStorage Node-tesztjei (később kerülnek ide),
  changelog-generálás, a `package.json` verziójának léptetése a repóban.

## Decisions
- Verzió a tagből, nem a repóban kézzel léptetve — egy forrás, nincs elcsúszó `package.json`.
- Külön job publikál `gh` CLI-vel; nem `electron-builder --publish` és nem harmadik féltől származó
  release-action — kevesebb kód fér a write-tokenhez, és a két platform nem versenyez ugyanazért a
  Release-ért.
- `workflow_dispatch` próbafutás publikálás nélkül — a tag előtt kiderül, ha a workflow hibás.
- Master-ős-őr — nyilvános kiadás csak pusholt, kapun átment kódból.
- Az első teszt-taget az /implement pusholja a záró push után (fejlesztő) — a kiadás a tétel része, nem
  külön kézi lépés.

## Verification
- [ ] a `workflow_dispatch` próbafutás zöld mindkét runneren; a run artifactjai közt az `.exe` és a `.dmg`
- [ ] a `v0.1.0-teszt.1` futás zöld; a Release pre-release, benne a két telepítő és a `TELEPITES.md`
- [ ] test:workflow
- [ ] docs-check
