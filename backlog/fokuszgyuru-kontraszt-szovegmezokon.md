# fokuszgyuru-kontraszt-szovegmezokon
Type: bug
Source: /implement-batch futás (2026-09-08) manual-checks visual-css+keyboard-a11y szelete
Target: master
Baseline: b5b3d1262499eb16c7e2999f8a20d89d9e87c857

## Goal
Az Enter-lánccal mezőről mezőre ugró fókusz gyűrűje mindenhol látszik: a Radix accentből
örökölt 2,09:1 helyett a márkabarna gyűrű 4,97:1 a fehér mezőn, 4,56:1 a laphátteren.

## Current state
- `app/src/design/tokens.ts` `t` — nincs fókuszgyűrű-token; a `brand` (#976445) a PDF-blokk
  fölötti, `pdf/`-ből is importált érték, a `controlBorder` sora mondja ki, hogy az azonos
  értékű szerepeket sem vonjuk össze.
- `app/src/main.tsx` — a `--control-border`, `--solid-fill*`, `--accent-wash`,
  `--warn/danger/ok-accent-text` egyaránt itt íródik be `tokens.ts`-ből.
- `app/src/index.css` — a `[data-accent-color='brown']` (solid kitöltés) és a három
  `[data-accent-color='amber'|'red'|'green']` (`--accent-a11`) blokk a bevált minta: azonos
  specificitás a Radix saját blokkjával, sorrendben nyerünk.
- Radix `styles.css`: `--focus-8` ~25 outline-szabályt táplál; a definíció a
  `.radix-themes, [data-accent-color]:where(:not([data-accent-color=''],[data-accent-color='gray']))`
  szelektoron ül. A `.rt-TextFieldRoot` minden app-beli példánya `surface` variáns (nincs
  `variant=` a `TextField.Root`-okon), tehát mind a `--focus-8`-on lóg.
- `app/src/design/toothChartSvg.ts:80` — a wrapper gyűrűje `var(--focus-8, #2D2D2D)`, a
  fallback csak Radix-téma nélkül él; `app/src/design/toothChartSvg.test.ts` az
  `outline:` prefixre illeszkedik, a színre nem.
- `app/src/design/tokens.test.ts` — kontraszt-helperek (`contrastRatio`, `contrastOfRgb`,
  `compositeOver`) már megvannak, az `--accent-a11` blokk tesztjei ezeket használják.

## Approach
Három fájl változik, a meglévő „token → main.tsx → index.css" lánc szerint:
1. `tokens.ts`: új, szerepalapú `focusRing` token az app-szekcióban (`#976445`).
2. `main.tsx`: `--focus-ring` beírása `t.focusRing`-ből.
3. `index.css`: a `--focus-8` átirányítása `var(--focus-ring)`-re a `.radix-themes` ÉS a
   `[data-accent-color]` szelektoron — így a `color="red"`/`"amber"` kontrollok gyűrűje sem
   marad az accentjükön.
Plusz `tokens.test.ts`: a `focusRing` 3:1-es küszöbe a három szomszédos felület ellen.

NEM tartozik ide: a nyugalmi állapot hiányzó kontroll-kerete
(`arlista-sor-fejlec-keret-hianyzik`, `tab-trigger-keret-hianyzik`); a `--control-border` és a
`--accent-a11`/`--solid-fill` blokkok; a `--focus-a2`/`--focus-a5` washok (kijelölés, autofill,
nem gyűrű); a `toothChartSvg.ts` fallback-hexe; a `pdf/` bármely tokene.

## Decisions
- Önálló `focusRing` token, nem `t.brand` közvetlen használata — mert a `brand` a `pdf/`-ből
  importált nyomtatvány-token, és a `tokens.ts` `controlBorder`-sora kimondja, hogy az azonos
  értékű szerepeket sem vonjuk össze; nem közös hivatkozás, mert akkor a gyűrű későbbi
  hangolása a nyomtatványt is elmozdítaná.
- A `--focus-8` a felülírás pontja, nem szabályonként a `--text-field-focus-color` — mert ez az
  egy alias táplálja mind a ~25 outline-szabályt és a fogtérképet is; nem szűkítjük
  szövegmezőre, mert a gombok/tabok gyűrűje ugyanabból a 2,09:1-ből jön.
- A `[data-accent-color]` szelektor is szerepel, `:where(:not(gray))` szűkítés nélkül — mert a
  gray-elemek úgyis ugyanezt öröklik, a red/amber-elemek viszont csak így veszítik el a saját,
  2,0–2,2:1-es accent-gyűrűjüket.
- A `--focus-a8` nem kap felülírást — a Radix definiálja, de egyetlen komponens-szabály sem
  olvassa, egy nem használt alias átírása hamis biztonságérzet.
- A teszt a `tokens.test.ts` meglévő kontraszt-helpereire épül — mert jsdomban nincs Radix CSS,
  a gyűrű valódi kirajzolása csak a `visual-css` szeletben mérhető.

## Verification
- [ ] tests — a `focusRing` legalább 3:1 a `surface`, a `page` és az `accentWash` hátterén
      (ez utóbbi a fókuszált pácienslista-sor háttere)
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a Tabbal fókuszált szövegmező, gomb, tab és a fogtérkép
      `outlineColor`-a `rgb(151,100,69)`, és egy `color="red"` gombé is
