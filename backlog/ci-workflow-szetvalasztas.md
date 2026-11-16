# ci-workflow-szetvalasztas
Type: chore
Source: desktop-app-migration-plan-final.md 14. döntés és §9.3
Target: master
Baseline: ea1e320ab0bca3af17f8639e25ba99cec54f5578

## Goal
Nincs doki-látható változás: a CI önálló workflow-ban él, hogy a demó lebontása után is megmaradjon, a
Pages-deploy pedig csak zöld CI után fut.

## Current state
- `.github/workflows/deploy.yml`: `build` job (npm ci, lint, test, test:workflow, docs-check, build, Pages
  artifact) és `deploy` job (`needs: build`, PR-en kihagyva); trigger push és PR a masterre,
  `workflow_dispatch`; `concurrency: pages`.
- Más workflow nincs; a `scripts/workflow/*` és a skillek nem hivatkoznak a workflow-fájlokra.

## Approach
- Új `.github/workflows/ci.yml`: push és PR a masterre, `workflow_dispatch`; a mai `build` job lépései a
  Pages-artifact nélkül.
- `deploy.yml`: `workflow_run` trigger a CI sikeres, master-pushból indult futására, plusz
  `workflow_dispatch`; a CI által tesztelt commitot checkoutolja, `npm ci`, `npm run build`, Pages
  artifact, deploy. PR-en nem fut. A `concurrency: pages` marad.
- NEM tartozik ide: release-workflow, Electron-build, a lint/test lépések tartalmi változása.

## Decisions
- `workflow_run` a deployhoz, nem hívható (`workflow_call`) CI — mert így master-pushonként egyszer fut a
  CI, és a deploy a már tesztelt SHA-t építi; a hívható változat pushra kétszer futna.
- A deploy újra buildel, nem a CI artifactját tölti le — mert a workflow-k közti artifact-letöltés több
  jogosultságot és lépést kér, a build rövid.

## Verification
- [ ] a `run finish` push-a után a CI zöld, utána a Deploy lefut, és a Pages a friss commitot szolgálja ki
      (`gh run list` mutatja a két futást)
- [ ] a `deploy.yml` feltétele kizárja a sikertelen CI-t és a PR-ből indult futást (olvasással ellenőrizve)
- [ ] docs-check, test:workflow
