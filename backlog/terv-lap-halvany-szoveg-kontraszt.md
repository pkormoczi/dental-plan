# terv-lap-halvany-szoveg-kontraszt
Type: bug
Source: manual-checks visual-css szelet (2026-09-07), /implement-batch futásból
Target: master
Baseline: 264e7aa738253e06a5dc486a3b48d61dd3914c05

## Goal
A `#/terv` fázistáblájában a halvány (`uiTextFaint`) szöveg — a listaár/sáv-tartomány és a
„Becsült ár” `≈` jelvény — legalább 4,5:1 kontrasztot ad a lap hátterén.

## Current state
- `app/src/design/tokens.ts:62` — `uiTextFaint: '#64748B'` (slate-500, 4,76:1 fehéren, 4,34:1
  `t.page`-en — ez utóbbi a hiba).
- `app/src/design/tokens.ts:44` — `page: '#F1F5F9'`, a lap-háttér (`App.tsx:49`).
- `app/src/pages/planEditor/LineRow.tsx:342` (listaár szöveg) és `:438` (a „Becsült ár” `≈`
  jelvény, `line.savos ? t.warn : t.uiTextFaint`) — a két valós, érintett hely; a sorok
  burkolat nélkül `t.page`-en ülnek (`PlanEditorPage.tsx:401-404`, `PhaseSection.tsx:262`).
- `app/src/design/tokens.ts:65-69` — `controlBorder: '#64748B'` — SZÁNDÉKOSAN ugyanaz az érték,
  mint a mai `uiTextFaint`, de KÜLÖN token, külön (3:1, WCAG 1.4.11) szerepben; a kommentje
  kifejezetten tiltja az összevonást.
- Mérési műtermék, NEM javítandó: `app/src/components/NumberField.tsx:261-273` (stepper-glyph,
  valós háttér fehér, 4,76:1) és `app/src/pages/tervReszletei/SorReszlet.tsx:133` (Radix `Card`
  `::before`-festése, valós háttér ~4,63:1) — a `.claude/skills/manual-checks/visual-css.md`
  `effectiveBg` számítása mindkettőnél téveszt (nem ősre, hanem testvérre/pszeudoelemre kellene
  néznie).
- `docs/reviews/2026-09-07-manual-checks-visual-css.md:29-39` — a jelentés maga mondja ki:
  „Egyik sem regresszió: mindkét szín és méret változatlan”.

## Approach
Egyetlen érték módosul: `tokens.ts` `uiTextFaint` konstansa, WCAG-megfelelő, `t.page`-en is
≥4,5:1-et adó slate-árnyalatra. Mivel `LineRow.tsx` és a többi felsorolt hely már ma is ezt a
tokent importálja, komponens-szintű módosítás nem kell.

NEM tartozik ide: `controlBorder` értéke (külön token, változatlan marad); `t.page` vagy más
felület-token; a `NumberField`/`SorReszlet` érintett sorai (ma is megfelelnek, lásd Decisions);
az amber jelvények kontrasztja (`checklist-callout-szoveg-kontraszt`); a `visual-css.md`
`effectiveBg` mérési hibája (külön, a `control-border-meres-radix-wrapper` mintájú tétel volna,
ha a doki fontosnak ítéli).

## Decisions
- A token szintjén javítunk (`uiTextFaint` sötétítése), nem a háttér szintjén (`t.page`
  világosítása) — mert egy sötétebb szövegszín MINDEN eddigi, ma is megfelelő helyen (fehér
  hátteres `ItemPicker.tsx`, `SorReszlet.tsx`, `PriceListAdminPage.tsx`) csak JAVÍTJA a
  kontrasztot, míg a lap-háttér világosítása az egész app „hideg slate” karakterét lapítaná
  (`app/src/CLAUDE.md`), és újraszámolást igényelne a `controlBorder` már dokumentált 3:1 K4
  levezetéséhez (`tokens.ts:24-30`) — szélesebb hatókör ugyanazért a javításért.
- A `NumberField` stepper-glyph és a `SorReszlet` ár-oszlop NEM kap semmilyen kódváltozást —
  mindkettő valósan is 4,5:1 fölött van (4,76:1, illetve ~4,63:1), a jelentésben szereplő találat
  a mérőszkript `effectiveBg`-jének korlátja (testvér-elem, illetve Radix `::before`), nem
  tényleges kontraszthiba; egy nem létező hibát „javítani” elemenkénti kézi színnel pont azt a
  mintát vinné be, amit a tétel eredeti szövege kifejezetten tilt.
- `controlBorder` értéke és önálló token-definíciója változatlan — a `tokens.ts` kommentje
  szándékos egyezésként, nem összevonásként írja le a mai közös értéket.
- A pontos csere-szín a `t.page`-en mért ≥4,5:1 küszöb alapján, a `/implement` lépésben, a
  `manual-checks visual-css` szeletével igazoltan dől el (irányadó jelöltek: Radix `--gray-11`
  `#60646C`, ~5,4:1, vizuálisan a legközelebbi a mai árnyalathoz és a szomszédos `color="gray"`
  Radix-szövegekhez; vagy a meglévő `uiTextMuted` `#475569`, biztosabb tartalék, de láthatóan
  sötétebb) — nem rögzítjük itt, mert a tényleges pixel-szín manual-check nélkül nem ellenőrizhető.

## Verification
- [ ] tests — egy kontraszt-arány unit teszt rögzíti, hogy `uiTextFaint` és `t.page` között a
      arány ≥4,5:1 (a `tokens.ts` fejlécében már dokumentált arányok mintájában), hogy egy
      jövőbeli tokenváltoztatás ne csússzon vissza csendben a küszöb alá
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a `design/tokens.ts` érintett; a `#/terv` fázistábláján
      a listaár és a „Becsült ár” jelvény mért kontrasztja ≥4,5:1 a valódi Radix CSS-sel, és a
      `NumberField`/`SorReszlet` helyeken a szín nem romlott
