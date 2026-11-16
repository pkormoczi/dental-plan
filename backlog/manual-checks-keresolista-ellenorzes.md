# manual-checks-keresolista-ellenorzes
Type: chore
Source: review:2026-11-16-manual-checks-keyboard-a11y-megerosito-ablak#2
Target: master
Baseline: c85334a92df15ebe9eb6b3b99223242df142928f

## Goal
Nincs doki-látható változás: a `keyboard-a11y` szelet a tételkereső találati listájának nyitottságát
a ténylegesen látható listán méri, így a „lista bezárult” elvárás csak akkor teljesül, ha a lista
valóban eltűnt.

## Current state
- `.claude/skills/manual-checks/keyboard-a11y.md` „A kritikus ciklus”: a snippet `popoverOpen` mezője a
  `[data-radix-popper-content-wrapper]` elemet keresi; a várt eredmény `popoverOpen === false`. Az
  Escape-bekezdés és a „Popover-geometria” szakasz ugyanezt a jelet használja.
- `app/src/pages/planEditor/ItemPicker.tsx`: `floating = 'inline'` alapértelmezésben a lista a kereső
  mező után, egy abszolút pozicionált, jelölés nélküli konténerben jelenik meg (nem lebegő elem);
  csak `floating="portal"`-nál (`pages/planEditor/LineRow.tsx`, a sor saját keresője `keresoMod`-ban)
  kerül Radix `Popover.Content`-be.
- A 2026-11-16-i menetben a tervszintű kereső listája látható volt, miközben a `popoverOpen` hamis.

## Approach
- Csak a `keyboard-a11y.md`: a ciklus snippetje a lista nyitottságát a kereső melletti
  listakonténer látható tartalmán mérje; a leírás mondja ki, hogy a tervszintű kereső helyben, a
  soron belüli `keresoMod`-os kereső portálban jelenít meg, és a „Popover-geometria” szakasz csak
  az utóbbira vonatkozik.
- NEM tartozik ide: alkalmazáskód (adat-attribútum vagy ARIA-szerep a listán), a kereső
  combobox-szemantikája (`review:2026-08-25-arch-react-review#REACT-002`), a többi szelet.

## Decisions
- Alkalmazáskód nem változik, a mérés a meglévő DOM-on épül — mert a tétel a szelet hibája; egy
  csak a teszteléshez bevezetett jelölés helyett a combobox-szemantika lesz a tartós jel, ha a
  REACT-002 megvalósul.

## Verification
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y — az új snippet a tervszintű keresőnél nyitott listánál
      nyitottat, Enter és Escape után zártat mutat; a „Popover-geometria” a soron belüli portál-módú
      keresőn fut
