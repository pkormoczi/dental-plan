# checklist-callout-szoveg-kontraszt
Type: bug
Source: manual-checks visual-css szelet (2026-09-07), /implement-batch futásból
Target: master
Baseline: 224e6286186d1aca293739cbe5b64e30072ba223

## Goal
A Radix `amber`, `red` és `green` színnel festett szövegek — Callout, `soft` Badge, `soft`
Button, `Text` — minden előforduló hátterükön elérik a 4,5:1-et, a legszigorúbb esetet
(Calloutba ágyazott, azonos színű jelvény) is beleértve.

## Current state
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx:16` `SULYOSSAG_SZIN` (`hard`→red,
  `soft`→amber, `info`→gray) ugyanazzal az értékkel festi a `Callout.Root`-ot (:84) és a benne
  ülő `Badge`-et (:88) — a jelvény így KÉT `--accent-a3` washon ül: ez a legrosszabb háttér.
- A Radix mind a négy szövegfelületet EGY változóból festi: `.rt-CalloutRoot`,
  `.rt-Badge:where(.rt-variant-soft)`, `.rt-BaseButton:where(.rt-variant-soft, .rt-variant-ghost)`,
  `.rt-Text:where([data-accent-color])` → `color: var(--accent-a11)`
  (`@radix-ui/themes` 3.3 `styles.css`). Nem 25 hívási hely, hanem egy alias.
- Hívási helyek: amber 25 (öt `PatientPage.tsx` Callout, `PreviewPage.tsx:519,527`,
  `PlanEditorPage.tsx:368`, `ToothPickerPopover.tsx:52`, `MentettPdfPanel.tsx:51`,
  `RendeloTab.tsx:350`, `HuChip.tsx:11`, `LineRow.tsx:191,214,231,247,490,512`,
  `PhaseSection.tsx:193`, `FazisMegjegyzes.tsx:49,73`, `PlanEditorHeader.tsx:44`); red ~40
  Callout/Button; green 1 (`LineRow.tsx:231`, a `−X%` kedvezmény-jelvény).
- Mért, illetve a mérést reprodukáló számítás a mai Radix-értékekkel: amber jelvény Calloutban
  3,79:1, amber egy washon 3,95:1, wash nélküli amber `Text` a lapon 4,21:1; red jelvény
  Calloutban ~3,85:1, red egy washon ~4,33:1; green egy washon ~3,99:1. Gray/slate ~5,37:1 —
  megfelel, nem érintett.
- `app/src/design/tokens.ts:72-78` — az app saját szerep-palettája már létezik, WCAG-mérésekkel
  dokumentálva: `warn: '#9A5B00'`, `danger: '#B3261E'`, `ok: '#1F7A4D'`. A legrosszabb háttéren
  `danger` megfelel (~4,60:1), `warn` (4,42:1) és `ok` (~3,95:1) nem.
- `app/src/index.css:86-103` + `app/src/main.tsx:11-25` — a kész precedens: a
  `[data-accent-color='brown']` blokk a Radix `--accent-9/10/contrast`-ját irányítja át
  `tokens.ts`-ből, `main.tsx`-en keresztül injektált CSS-változókra; azonos specificitás,
  betöltési sorrendből nyer, `!important` nélkül.
- jsdom alatt nincs Radix CSS (`app/src/CLAUDE.md`), a tényleges arányt csak a
  `/manual-checks visual-css` szelet méri; ma egyetlen teszt sem rögzít kontraszt-arányt, és
  `app/src/design/` alatt nincs `tokens` teszt.

## Approach
Három fájl: `tokens.ts` (a `warn` és az `ok` értéke sötétedik, `danger` marad), `main.tsx` (a
három szerep-token CSS-változóként kiírva, a meglévő `setProperty`-blokk mintájában),
`index.css` (három új `[data-accent-color='amber'|'red'|'green']` blokk, ami a `--accent-a11`-et
ezekre irányítja). Alkalmazás-komponens nem módosul.

NEM tartozik ide: a wash (`--accent-a3`); a `solid` variánsok kitöltése és felirata
(`--accent-9`/`--accent-contrast`) — a piros `Button`-ok változatlanok; a `--accent-11` (csak a
`--focus-11`-et táplálja) és a `--accent-12` (`highContrast`, az app nem használja); a
gray/slate szín; a `danger` token értéke; a Calloutba ágyazott jelvény szerkezete; a
Callout-szövegek szövegezése (`checklist-figyelmeztetes-szovege`); a slate szövegek
(`terv-lap-halvany-szoveg-kontraszt`); a `visual-css` mérőszkript `effectiveBg` hibája
(`control-border-meres-radix-wrapper`).

## Decisions
- A javítás a Radix `--accent-a11` aliasánál dől el, nem hívási helyenként — mert mind a négy
  komponens ebből fest, és a `[data-accent-color='brown']` blokk már bizonyítja, hogy ez a minta
  működik; csak `--accent-a11`, nem `--accent-11`, mert az utóbbi a stíluslapon egyedül a
  `--focus-11`-et táplálja, ahhoz semmi köze ennek a javításnak.
- Az érték a meglévő `warn`/`danger`/`ok` szerep-tokenekből jön, nem új „Radix-alias"
  tokenekből — mert különben két, alig eltérő amber élne egymás mellett (`LineRow.tsx:438`
  „Becsült ár" jelvénye inline `t.warn`, a szomszédos `+X%` jelvény Radix amber).
- `warn` és `ok` értéke sötétedik, `danger` nem — a mérce a legrosszabb valós háttér (jelvény
  Calloutban), és ott csak ez a kettő bukik; a ~27 inline `t.warn`/`t.ok` hely kontrasztja
  ezzel csak javul.
- A pontos hexek a `/implement` lépésben, a `manual-checks visual-css` mérésével dőlnek el
  (a küszöb a kettős washon ≥4,5:1, tartalékkal; irányadó jelölt `warn`-ra `#8F5400` körül,
  `ok`-ra hasonló mértékben sötétebb) — a valódi kaszkádban mért pixel a bizonyíték.
- Elvetett: a Calloutba ágyazott jelvény wash nélküli variánsra váltása — csak a kettős washt
  oldaná, a wash nélküli amber `Text` (4,21:1) és az egy washon ülő `+X%` jelvény (3,95:1)
  továbbra is bukna.
- Elvetett: a `--accent-a3` wash világosítása — a lépcső több komponensen közös (a `soft` gomb
  háttere is), és a `controlBorder` 3:1-es K4 levezetését is újraszámolná.

## Verification
- [ ] tests — egy kontraszt-teszt rögzíti, hogy `warn`, `danger` és `ok` a Radix
      wash-kompozitok ellen (egy wash a lapháttéren, és a Calloutba ágyazott kettős wash — a
      Radix-értékek a tesztben rögzített, kommentelt konstansok) ≥4,5:1-et ad, hogy egy jövőbeli
      token-változtatás ne csússzon vissza csendben a küszöb alá; ha a
      `terv-lap-halvany-szoveg-kontraszt` már létrehozta a kontraszt-teszt fájlját, ez abba ír
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — `tokens.ts` + `index.css` érintett; az `#/elonezet`
      checklistjén (piros és sárga tétel, jelvénnyel), a `#/terv` `+X%`/`−X%` jelvényein és a
      „Piszkozat nincs mentve" soron a `text-contrast` találatok száma nulla, és a `solid` piros
      gombok felirata változatlan
