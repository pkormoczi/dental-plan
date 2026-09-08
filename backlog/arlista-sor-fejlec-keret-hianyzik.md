# arlista-sor-fejlec-keret-hianyzik
Type: bug
Source: manual-checks visual-css szelet (2026-09-08), /implement-batch futásból — a control-border-meres-radix-wrapper wrapper-fix mellékhatásaként derült ki
Target: master
Baseline: 5ccc9fcd23727b0b4a3afac9ff75d83838837090

## Goal
A `#/arlista` kattintható sorneve egérrel és billentyűzetről is jelzi magát: a sor hover és fókusz
alatt kiemelt hátteret kap, a fókuszolt sornév látható `controlBorder` gyűrűt — állandó cellakeret
nélkül.

## Current state
- `app/src/pages/PriceListAdminPage.tsx` tétel-tábla `Table.RowHeaderCell role="button"
  tabIndex={0}` cellája (`Table.Root size="1"`, `className` nélkül) — csak `cursor: 'pointer'`, se
  hover, se app-oldali fókuszstílus (UA-alap outline marad).
- `app/src/pages/priceListAdmin/KategoriaPanel.tsx` ugyanez a minta a kategória-táblán.
- `app/src/index.css` `.paciens-lista tbody tr:hover, :focus-within` →
  `--table-row-background-color: var(--accent-wash)` — az app egyetlen sor-hover szabálya; a Radix
  cellánkénti háttere miatt csak ezen a változón át írható felül.
- `app/src/main.tsx` `--accent-wash`, `--control-border` (`tokens.ts` `accentWash`, `controlBorder`).
- `.claude/skills/manual-checks/visual-css.md` `CTRL` — a `[role="button"]` révén mind a ~118 sornév
  bekerül a mérésbe; a `rt-TableCell` egyoldalas inset shadow-ja szándékosan nem számít keretnek.
- `app/src/pages/PriceListAdminPage.test.tsx` „a tétel-sor Enterrel/Space-szel is megnyitható, nem
  csak kattintással", „a kategória-sor is Enterrel/Space-szel nyitható billentyűzetről".

## Approach
Változik: `app/src/index.css` — sor-hover/`:focus-within` háttér az árlista két táblájára a
`.paciens-lista` mintájára, és `:focus-visible` `controlBorder` outline a `[role="button"]`
sorfejléc-cellákra; a két `Table.Root` osztálynevet kap (`PriceListAdminPage.tsx`,
`KategoriaPanel.tsx`). Továbbá `.claude/skills/manual-checks/visual-css.md`: a táblázat-sor
fejléc-cellája dokumentált kivétel a `control-no-border` mérésben, a meglévő kivétel-lista mellé.

NEM tartozik ide: a `#/demo` és `#/beallitasok` tab-triggerei (`tab-trigger-keret-hianyzik`), a
szövegmezők fókuszgyűrűje (`fokuszgyuru-kontraszt-szovegmezokon`), a `controlBorder` meglévő
Radix-szabályai, a sor viselkedése (kattintás/Enter/Space/`aria-expanded` változatlan), a domain.

## Decisions
- Nincs állandó cellakeret, hover+fókusz kiemelés van — mert ~118 keretes cella sűrű rácsot rajzolna
  a táblázatba; nem elvetés, mert a kattinthatóság ma egérrel is csak a kurzorból derül ki.
- A hover a `.paciens-lista` `--table-row-background-color`/`--accent-wash` mintáját ismétli, nem új
  token — mert `<tr>`-re tett `background` a Radix cellánkénti háttere mögé kerülne.
- A fókuszgyűrű `controlBorder` színű `outline` a cellán, a UA-alap helyett — ez a mért 3:1-es token,
  és az `outline` nem tol layoutot; nem `box-shadow`, mert a cella saját sor-elválasztóját írná felül.
- Osztálynév a `Table.Root`-on, nem inline style — `:hover`/`:focus-visible` inline nem írható, és ez
  a `.paciens-lista`/`.fazis-tabla` meglévő mintája.
- A mérés kivétele ide tartozik, nem külön tételbe — a statikus snippet a javítás után is jelezné a
  ~118 sort, a tétel különben nem ellenőrizhető zöldre.

## Verification
- [ ] tests — a sorfejléc mindkét táblán változatlanul Enterrel/Space-szel nyitja és zárja a
      szerkesztőt; a két `Table.Root` viseli a stílust hordozó osztálynevet (a CSS-varrat őre)
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css (a `control-no-border` nem jelzi többé a sorneveket) és
      keyboard-a11y (a sorfejléc fókuszgyűrűje látszik, a sor végigtabolható)
