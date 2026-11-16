# ci-workflow-szetvalasztas
Type: chore
Source: desktop-app-migration-plan-final.md 14. döntés és §9.3

A `.github/workflows/deploy.yml` ma egyszerre hordozza a CI-t (lint, test, test:workflow,
docs-check, build) és a Pages-deployt. A demó lebontásakor a workflow törlődne, és vele a
folyamatos ellenőrzés is. Ezért a CI önálló `ci.yml`-be kerül (push és PR a masterre), a
`deploy.yml`-ben csak a Pages-build és -deploy marad, a CI sikeréhez kötve. A Pages-deploy a doki
számára változatlan.
