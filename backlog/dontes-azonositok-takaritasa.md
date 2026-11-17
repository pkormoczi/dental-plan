# dontes-azonositok-takaritasa
Type: chore
Source: lassu-pricelistadmin-tesztek implementálása közben talált (2026-11-17)
Target: master
Baseline: 5daadd7f58c9c89aed1152c5b04493e05facd737

## Goal
Az app kódjában (`app/src`, `app/electron`, `app/e2e`) nem marad régi, feloldhatatlan döntés-,
tétel- vagy review-azonosító sem kommentben, sem tesztnévben, és a docs-check ezek visszatérését
megfogja; a doki számára nincs látható változás.

## Current state
- Négy azonosítófajta (2026-11-17, `.ts`/`.tsx`): `backlog-N` (193 sor); „N. döntés” és rokon
  alakjai, pl. „1./8. döntés”, „2. döntése” (68); „N. tétel” (190); régi review-azonosító
  `P0-N`/`P1-N` (63) — együtt 482 sor, 132 fájl, ebből 115 tesztnévben (`it`/`describe`/`test`).
  Kódszövegben egy sincs, minden találat komment vagy tesztnév. Példák:
  `app/src/pages/PreviewPage.tsx` „backlog-40 (6. döntés)”, `app/src/components/PatientPlanChains.tsx`
  „(46. tétel, 1./8. döntés)”, `app/src/components/NumberField.test.tsx` „P0-4: an emptied field
  reverts…”, `app/src/pages/PriceListAdminPage.test.tsx` „…MINDEN tétele inaktív (8. döntés)”.
- Ritka régi kódok ugyanebből a körből: `K2` (`app/src/App.tsx`), `K4` (`app/src/design/tokens.ts`),
  `C4` (`app/src/domain/money.test.ts`), `F5`.
- `scripts/docs-check.mjs`: a `SCAN_ROOTS` az app-kódból csak az `app/src`-t nézi; a `D_PATTERN`
  (D-szám, DP-szám) és a `dRef` minden vizsgált fájlra fut; `ALLOW_D_TOKENS` az álpozitívokra;
  `LEGACY_PATTERNS`/`legacyRef`.
- A docs-check többi vizsgált fájljában jogos előfordulás van: `docs/desktop-app-migration-plan-final.md`
  a saját döntéstáblájára hivatkozik („25. döntés”), `.claude/skills/implement/SKILL.md` „a 2.
  tételtől” futásbeli sorszám.
- Context-anchor (`test:app/…#<név>`) egyik átnevezendő tesztre sem mutat.
- Szabály: root `CLAUDE.md` Kommentek és Tesztek szakasza.

## Approach
- Kommentek: csak az azonosító kerül ki, a mondat nyelvtanilag igazodik, a WHY szövege marad. Ha
  egy komment csak az azonosítóból állt, törlődik. Ha az azonosító volt a WHY egyetlen pointere,
  és a szándék a `docs/PRODUCT.md` egy meglévő szakaszában le van írva, oda mutat
  (`PRODUCT.md § <cím>`); új PRODUCT-szakasz nem születik.
- Tesztnevek: az azonosító kikerül, a név a megfigyelhető viselkedést írja; állítás nem változik.
- `scripts/docs-check.mjs`: a négy azonosítófajta mintaként bekerül, csak az app-kódra
  (`app/src`, `app/electron`, `app/e2e`) alkalmazva; az `app/electron` és az `app/e2e` bekerül a
  vizsgált körbe.
- Nem tartozik ide: viselkedés- vagy kódváltozás; a kommentek egyéb átírása (a „meglévő
  kommenthez csak hamissá váláskor” szabály marad); a `docs/`, `.claude/`, `backlog/` szövege; a
  `legacy-doksi-torlese`.

## Decisions
- Mind a négy azonosítófajta egy tételben (fejlesztő) — mert ugyanaz a régi, feloldhatatlan
  hivatkozás, és az őr csak teljes lefedéssel ér valamit; nem csak az ötletben megnevezett kettő.
- Gépi őr ugyanebben a tételben, a docs-checkben (fejlesztő) — mert a takarítás nélküle
  visszaszivárog; nem külön tétel, és nem elég a szabály.
- Az új minták csak az app-kódra — mert a migrációs terv a saját döntéstáblájára, a skillek
  futásbeli sorszámra jogosan írnak ilyet; nem az összes vizsgált fájlra.
- A ritka régi kódok (`K2`, `K4`, `C4`, `F5`) a takarítás részei, de őrt nem kapnak — mert a
  betű+szám minta álpozitív lenne.
- Csak az azonosító megy, a komment többi része nem íródik át — mert így a diff mechanikus és
  átnézhető marad.

## Verification
- [ ] tests — a teljes vitest-készlet zöld, változatlan tesztszámmal; a tesztfájlok diffje csak
      kommentet és tesztnevet érint, állítást nem
- [ ] docs-check zöld; egy `app/src`, `app/electron` vagy `app/e2e` alá ideiglenesen ültetett
      `backlog-12`, „3. döntés”, „46. tétel” vagy `P0-4` hivatkozásra piros, a migrációs terv
      „25. döntés”-ére nem
- [ ] typecheck/lint
- [ ] test:workflow
