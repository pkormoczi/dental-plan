# arlista-kontroll-keret-hianyzik
Type: bug
Source: manual-checks all-szelet (2026-09-06), Közepes találat — docs/reviews/2026-09-06-manual-checks-all.md
Target: master
Baseline: c443ce34a3741317e3e7cdcf954280ffdbc6a4bd

## Goal
A `#/arlista`-ról elérhető rádiógombok és a kategória-színválasztó kártyái ugyanolyan jól látható
kerettel határolódnak, mint a checkboxok — a doki a Tömeges árváltoztatás dialógusban látja, hol
végződik egy választható kör, a Kategóriák dialógusban pedig, hol egy színswatch.

## Current state
`app/src/index.css` 30–84: a `controlBorder` felülírások a `soft` Buttonra, `.rt-TextFieldRoot`-ra,
`.rt-CheckboxRoot::before`-ra, `.rt-SegmentedControlRoot`-ra és `.rt-SelectTrigger`-re vonatkoznak.
A rádió-család kimaradt: `.rt-BaseRadioRoot:where(.rt-variant-surface)` unchecked `::before`-ja a
Radix `--gray-a7`-ét viseli (az azonos felépítésű Checkbox-szabályt az app már felülírja), a
`.rt-RadioCardsItem::after` pedig a BaseCard `--gray-a5`-ét — mindkettő 2:1 alatt a lap háttere ellen.

Használat: `app/src/pages/priceListAdmin/TomegesArDialog.tsx` (két `RadioGroup.Root`, 5 item) és
`app/src/pages/priceListAdmin/KategoriaPanel.tsx` `RadioCards.Root` (a kurált paletta swatchei). Az
appban nincs `Switch` és `Slider` — a rádió-család ez a két hely.

A token `app/src/design/tokens.ts` `controlBorder`, a `--control-border` változót `app/src/main.tsx`
írja be; az invariáns `app/src/CLAUDE.md` „Két felület, két szabály”.

A jelentés 13-as darabszáma nem 13 hibát jelent: a `+ Új tétel` `solid` Button (dokumentált kivétel),
a kereső `TextField` kerete a `.rt-TextFieldRoot` wrapperen, a `SegmentedControl` chipeké a `Root`-on
ül — ezeket a mérőeszköz nem látja, nem az app hibája.

## Approach
Csak `app/src/index.css` — két új szabály a meglévő `controlBorder` blokk mellé, a Checkbox-szabály
mintájára: a rádió `::before`-jára és a RadioCards item `::after`-jére `inset` box-shadow
`var(--control-border)`-rel. A blokk fölötti komment kiegészül a rádió-családdal.

NEM tartozik ide: a `manual-checks` `visual-css` snippetje (a `control-border-meres-radix-wrapper`
tétel dolga) — a `solid` Button / wrapper / `Root` hamis találatai ott szűnnek meg, itt egyetlen
sorral sem nyúlunk hozzájuk; a `controlBorder` token értéke; más route kontrolljai; a
`KategoriaPanel` paletta összetétele.

## Decisions
- A `RadioCards` színswatch is keretet kap — a kurált paletta világos színei nem mindegyike éri el a
  3:1-et a panel háttere ellen, tehát a `solid` Button-kivétel indoka itt nem áll; új kivétel az
  invariánst hígítaná.
- A keret `inset` box-shadow, nem `border` — a Radix is így rajzol, és a `border` a rádió kör és a
  kártya méretét eltolná; ugyanaz az ok, mint az `index.css` meglévő szabályainál.
- Csak a nem bejelölt állapot kap keretet — a bejelölt kitöltése (`--accent-indicator`), illetve a
  RadioCards `outline`-ja már hordozza a határt, a duplázás vastagodó gyűrűnek látszana. Kikapcsolt
  kontrollra a WCAG 1.4.11 nem kötelez, marad Radix-alapon.
- Nincs jsdom-teszt — a Radix CSS a tesztkörnyezetben nem tölt be (`app/src/CLAUDE.md`
  jsdom-vakfoltok), ezt a réteget a manual-check fedi.

## Verification
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a Tömeges árváltoztatás és a Kategóriák dialógusban minden
      nem bejelölt rádió és színswatch kerete 3:1 fölött mérődik a mögötte lévő felület ellen, a
      bejelölt állapot változatlan. A `control-border-meres-radix-wrapper` UTÁN futtatandó, különben
      a mérés a pszeudoelem-keretet nem látja.
