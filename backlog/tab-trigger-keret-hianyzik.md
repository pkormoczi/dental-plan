# tab-trigger-keret-hianyzik
Type: chore
Source: manual-checks visual-css szelet (2026-09-08), /implement-batch futásból — a control-border-meres-radix-wrapper wrapper-fix mellékhatásaként derült ki
Target: master
Baseline: d87b5ec2e40fa587214fd018b3fda17eb5a3a606

## Goal
A doki képernyőjén semmi nem változik: a fülcsík keret nélküli affordanciája kimondottan
elfogadott lesz, és a visual-css mérés nem jelenti többé hiánynak.

## Current state
- `app/src/index.css` 30–52. sor: a `controlBorder`-blokk kommentje 3 nevesített kivételt
  sorol (`solid` Button, `IconButton`, `ghost`); a blokk 7 szabálya közül egyik sem éri el a
  fülgombot.
- `app/src/CLAUDE.md` „Két felület, két szabály” 12–13. sor: ugyanez a három kivétel.
- Radix `Tabs.Trigger` = `<button role="tab" class="rt-BaseTabListTrigger rt-TabsTrigger"
  data-state="active|inactive">`, se `border`, se `box-shadow`. A `.rt-BaseTabList`
  `inset 0 -1px 0 0 var(--gray-a5)`-e egy-élű, spread nélküli — a mérés helyesen nem veszi
  keretnek (`control-border-meres-radix-wrapper` döntése).
- Az AKTÍV fül ÁTMEGY: `::before` 2px `--accent-indicator` (`#ad7f58`) kitöltése a
  lapháttéren 3,2:1, panelen 3,5:1 — ugyanaz a szín, amit az `index.css` 101–113. sor
  kommentje már grafikus elemként 3:1-esnek mond ki. Csak az INAKTÍV fülek jelentkeznek.
- `.claude/skills/manual-checks/visual-css.md` 140. sor: a kivétel-osztályok skip-listája
  (`rt-IconButton`, `rt-variant-ghost`); 175–178. sor: „marad kettő”. A `SKILL.md` 66. sora
  „3 nevesített kivétel”-t ír.
- Fülhasználat három helyen, ugyanaz az osztály: `app/src/pages/SettingsPage.tsx` (61–66),
  `app/src/pages/DemoPage.tsx` (44–51), `app/src/pages/PatientDetailPage.tsx` (319–323). A
  mért 7 route közül kettő érintett (`#/beallitasok`, `#/demo/tervek`).

## Approach
Csak dokumentáció + a mérés kivétel-listája. `app/src` alatt CSS-SZABÁLY NEM keletkezik, a
fülök megjelenése nem változik.
- `app/src/CLAUDE.md`: a kivétel-lista 3 → 4, az inaktív `Tabs.Trigger`-rel.
- `app/src/index.css`: a `controlBorder`-blokk kommentjében „Kivétel 4” a WHY-jal, a 3.
  kivétel mintája szerint — szabály nem kerül alá.
- `.claude/skills/manual-checks/visual-css.md`: skip csak `[data-state='inactive']` fülre; a
  záró bekezdés kettő → három. `SKILL.md` 66. sor: 3 → 4.
NEM tartozik ide: a `#/arlista` `<th role="button">` sornevei
(`arlista-sor-fejlec-keret-hianyzik`), a fókuszgyűrű halványsága
(`fokuszgyuru-kontraszt-szovegmezokon`), és bármilyen látható stílusváltozás a fülcsíkon.

## Decisions
- A fülcsík saját affordanciája elfogadott, 4. nevesített WCAG 1.4.11 kivétel — mert az
  ÁLLAPOT jelzése már ma 3:1 fölött van (`--accent-indicator` aláhúzás), az inaktív fül pedig
  szerkezetileg a 3. kivétel (`ghost`) esete: nincs saját kitöltése, szövegszintű kapcsoló.
  Nem per-fül `controlBorder`, mert az aktív fülnek nincs kerete, így az inaktívak
  látszanának erősebbnek — a kiemelés megfordulna, a fülcsík gombsorrá változna.
- A mérés csak a `[data-state='inactive']` fület hagyja ki, nem a teljes trigger-osztályt —
  mert az aktív fül a SAJÁT kitöltésén megy át, és épp ez a kivétel indoka; ha az aláhúzás
  egyszer eltűnik, a mérésnek szólnia kell.
- A tartós context az `app/src/CLAUDE.md`-be kerül, nem `PRODUCT.md` Nem cél alá — mert a
  `controlBorder`-szabály ott él, és a tétel nem elvetett irány, hanem a szabály pontosítása.
- `Type: bug` → `chore` — a doki által látható viselkedés nem változik, ez housekeeping.

## Verification
- [ ] tests — nincs új teszt: a változás komment + md, futó viselkedést nem érint (Radix CSS
      jsdom alatt nem töltődik be; ugyanaz az indok, mint az `arlista-kontroll-keret-hianyzik`
      tételnél)
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — `#/beallitasok` és `#/demo/tervek`: a
      `control-no-border` találatból eltűnnek a fülgombok, az AKTÍV fül továbbra is MÉRVE van
      és átmegy. A `#/arlista` sornév-találatai szándékosan megmaradnak (sibling tétel).
