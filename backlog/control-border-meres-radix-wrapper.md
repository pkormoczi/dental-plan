# control-border-meres-radix-wrapper
Type: chore
Source: manual-checks visual-css szelet (2026-09-07), 3. megállapítás
Target: master
Baseline: 143e44e98852459d4e34ef6386f9ce58603d7b01

## Goal
A `visual-css` menet `control-no-border` ága nullát ad, amikor tényleg nincs hiányzó keret, és
a `control-border-contrast` ág a ténylegesen kirajzolt keret színét méri.

## Current state
`.claude/skills/manual-checks/visual-css.md` „Kontraszt / `controlBorder` /
accent-mint-szövegszín” snippetje a `CTRL` szelektorral talált elemen néz
`borderTopColor`/`borderTopWidth`-t és `boxShadow`-t; keret hiányában `control-no-border`,
egyébként csak a CSS-`border` színét viszi a `control-border-contrast` ágra — a box-shadow
színe méretlen. Két kivétel osztály-alapú (`rt-IconButton`, `rt-variant-ghost`), a harmadik
(`solid` Button) csak prózában él a fájl 101–103. sorában, a mérésben nem.

A keret tényleges hordozói `app/src/index.css` 53–84: `.rt-BaseButton.rt-variant-soft` és
`.rt-SelectTrigger` (maga az elem), `.rt-TextFieldRoot` és `.rt-SegmentedControlRoot`
(wrapper), `.rt-CheckboxRoot::before` (pszeudoelem). A `solid` Button és a bepipált checkbox
szándékosan keret nélküli, a kitöltésük az affordancia (`index.css` 30–52, 86–98;
`app/src/design/tokens.ts` `controlBorder`; `app/src/CLAUDE.md` „Két felület, két szabály”).
A legutóbbi menet: `docs/reviews/2026-09-07-manual-checks-visual-css.md` 3. megállapítás.

## Approach
Csak `.claude/skills/manual-checks/visual-css.md` — a snippet és a hozzá tartozó próza. A
keresés a kontrollról indul, és a keretet három helyen keresi: az elemen, a `::before`-ján,
majd korlátozott számú ős-szinten, az `index.css` szelektoraiból származó wrapper-listán. Ha
egyik sem hordoz keretet, a kontroll saját (vagy `::before`) kitöltésének kontrasztja dönt a
környező felület ellen. A megtalált keret színe — akár `border`, akár `inset` box-shadow — a
3:1 ellenőrzésre kerül.

NEM tartozik ide: a `controlBorder` token értéke és a kontraszt-küszöbök
(`terv-lap-halvany-szoveg-kontraszt`, `checklist-callout-szoveg-kontraszt`), a `manual-checks`
többi szelete és a `SKILL.md` protokollja (csak ha egy mondata hamissá válik), az `index.css`
kaszkádja és bármely alkalmazáskód. Ha a javított mérés VALÓDI keret-kontraszt hiányt talál,
az új tétel, nem itt javul.

## Decisions
- A wrapper-lista az `index.css` szelektoraiból származik — az az egyetlen hely, ahol az app
  eldönti, melyik elem hordozza a keretet; nem geometriai „öleli-e” heurisztika, mert a
  `SegmentedControlRoot` N itemet fog át, egyiket sem öleli.
- Az ős-bejárás lépésszáma korlátos — egy kártya vagy panel kerete különben felmentene egy
  valóban keret nélküli kontrollt, és a hamis negatív rosszabb, mint a zaj.
- Csak `inset` box-shadow számít keretnek — a fókuszgyűrű és az emelés-árnyék nem az, és a
  fókuszgyűrűnek külön szakasza van a fájlban.
- A `solid` Button és a bepipált checkbox mért kitöltés-kontraszttal megy át, nem
  osztály-kihagyással — így a kivétel nem válik vakfolttá; ezt állítja az `index.css` és a
  szelet-fájl saját szövege is.
- Marad osztály-alapú kihagyás az `rt-IconButton` és az `rt-variant-ghost` — ezek nevesített
  WCAG 1.4.11 kivételek, nincs se keretük, se kitöltésük (`app/src/CLAUDE.md`).

## Verification
- [ ] manual-check szelet: visual-css — a `#/terv`-en és a másik hat route-on a
      `control-no-border` nulla; ami marad, arról a menet megnevezi, melyik elem hordozná a
      keretet; a `control-border-contrast` a box-shadow-val rajzolt kereteket is méri
- [ ] docs-check
