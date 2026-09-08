# manual-checks-fokuszgyuru-snippet-outline-style
Type: chore
Source: /implement-batch futás (2026-09-08), a pdf+keyboard-a11y szeletek végrehajtása közben
Target: master
Baseline: a4d1c1c99452034a4039eb6b858cee18c5ee1c7a

## Goal
A `keyboard-a11y` szelet fókuszgyűrű-ellenőrzése azt méri, ami valóban a gyűrű
láthatóságáról dönt — így a következő böngészős menet nem ad hamis találatot ott, ahol
az app helyes.

## Current state
- `.claude/skills/manual-checks/keyboard-a11y.md:85-95` — a „Fókuszhoz kötött megjelenés +
  wrapper fókuszgyűrű” snippet `wrapperOutlineWidth: cs.outlineWidth` értéket ad vissza,
  `// '0px' fókusz előtt` megjegyzéssel; a `:97-99` próza szerint Tab után „`2px`-re vált”.
- A 2026-09-08-i menet mérése a még nem fókuszált fogtérkép-toolbaron:
  `outlineStyle: 'none'`, `outlineWidth: '3px'`, `kurzorDisplay: 'none'`; Tab után
  `outlineStyle: 'solid'`, `outlineWidth: '2px'`, `kurzorDisplay: 'inline'`. A böngésző az
  `outline-width` computed értékét `outline-style: none` mellett is megtartja, tehát a
  szélesség önmagában nem jelzi a gyűrű hiányát.
- Meglévő, HELYES minta ugyanerre a repóban: `.claude/skills/manual-checks/visual-css.md:98`
  (`outlineStyle === 'none' || parseFloat(outlineWidth) === 0` → nincs gyűrű) és `:189`
  (a snapshot `outlineStyle`-t ÉS `outlineWidth`-et is visz).
- Az app oldalán nincs teendő: a fogtérkép-wrapper `:focus-visible` viselkedése helyes,
  ezt a menet igazolta.

## Approach
Egyetlen fájl változik: `.claude/skills/manual-checks/keyboard-a11y.md`, azon belül csak a
„Fókuszhoz kötött megjelenés + wrapper fókuszgyűrű” snippet és a hozzá tartozó két
prózasor. A snippet a `visual-css.md` mintáját követve `outlineStyle`-t is visszaad, és az
elvárás a `none` → `solid` váltás lesz, nem egy konkrét szélesség.

NEM tartozik ide: a szelet „A kritikus ciklus” / „Egyedi sor” szakasza és az ottani
`isSearch` elvárás (külön, már tervezett tétel scope-ja); a `visual-css.md` és a
`SKILL.md`; a `paint-order`- és a vonalvastagság-snippet; bármely `app/`, `data/`, `assets/`
alatti kód vagy teszt.

## Decisions
- Az `outlineStyle` a kritérium, a szélesség csak kísérő adat — mert a `visual-css.md` már
  így dönti el ugyanezt a kérdést, és egy konkrét px-érték rögzítése a token változásakor
  újra hamis találatot adna.

## Verification
- [ ] tests — nincs kódváltozás, a készlet változatlanul zöld
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y — a javított snippetet a következő böngészős menet
      futtatja (doki-indítva, nem magától)
