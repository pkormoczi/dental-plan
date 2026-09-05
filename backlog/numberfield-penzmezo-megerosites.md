# numberfield-penzmezo-megerosites
Status: planned
Type: bug
Source: docs/reviews/2026-09-05-doctor-review-nemet-euro.md 6. megállapítás
Target: master
Baseline: b6c3430781afbfc51b390fcbc802354b63c1b609

## Goal
Egy pénz-mező sosem mutat olyan szöveget, amit a saját parsere nem olvas vissza, sosem áll vissza
némán, és sosem ír át szerződéses összeget egy elkattintásra vagy nyíl-billentyűre.

## Current state
- `app/src/components/NumberField.tsx` — `commit()` `null` parse-eredménynél némán az utolsó
  értékre áll; a ~14 px ▲/▼ léptető `onMouseDown` preventDefault miatt fókusz nélkül, azonnal
  commitál `step()`-pel, Escape nem vonja vissza; ArrowUp/Down ugyanígy léptet.
- `app/src/domain/money.ts` — `formatCentForInput` `de-DE` ezres ponttal formáz
  (`900000` → `"9.000,00"`), `parseEuroInput` ezt `null`-nak olvassa; egyetlen fogyasztója a
  `NumberField`. A HUF ág csupasz `String(value)`.
- `app/src/components/NumberField.test.tsx` — az EUR-eset 825 €-val fut, az 1000 € fölötti
  tartomány fedetlen.
- Pénz-mező hívási helyek: `pages/planEditor/LineRow.tsx` (ajánlati ár; ugyanitt a darabszám
  NEM pénz), `pages/planEditor/ElolegBlokk.tsx`, `pages/planEditor/EgyediVegosszegBlokk.tsx`,
  `pages/priceListAdmin/ItemEditor.tsx`, `pages/priceListAdmin/UjTetelDialog.tsx`. A
  `TomegesArDialog.tsx` százalék-mezője nem pénz. A `unit` prop opcionális, `'HUF'` default,
  ezért a HUF ár-mező és a darabszám mező ma megkülönböztethetetlen.

## Approach
- `money.ts`: `formatCentForInput` csoportosítás nélkül (`"9000,00"`); `parseEuroInput` szigorú
  marad.
- `NumberField.tsx`: a visszaállás rövid, nem-modális, magától elmúló jelzést kap (minden
  példányon); pénz-mezőn nincs ▲/▼ gomb és nincs nyíl-léptetés; a pénz-jelleg explicit
  jelölésű a hívási helyeken (forma az implementálóé), nem a `unit` meglétéből derivált.
- Tesztek: EUR round-trip 1000 € fölött, a jelzés, léptetés-tiltás pénzmezőn / megtartás
  darabszámon és százalékon.
Nem változik: `formatMoney`/`formatPrice` és a PDF számformátuma, a commit-on-blur elv, a
`priceListAdmin/BufferedFields.tsx` (nem `NumberField`), semmilyen HUF↔EUR átszámítás.

## Decisions
- Egy tétel: javítás + verifikáció, nem puszta kivizsgálás — mert ugyanaz a komponens és
  kockázatosztály, és a léptetés-tiltás zárja a megfigyelt `300,00 → 300,01` teljes felületét.
- Csupasz EUR bevitel, szigorú parser — mert a hiba így megszűnik, nem tolerálódik; nem toleráns
  parser, mert `"9.000"` kétértelmű lenne pont ott, ahol az EUR-mód a tévesztés ellen létezik.
- Visszaállás-jelzés minden példányon — mert egy elgépelt darabszám elvesztése is jelzést érdemel,
  és két visszajelzési mód aránytalan; az érték sosem esik 0-ra.
- Léptető gomb és nyíl elmarad pénzmezőn, marad darabszámon/százalékon — mert ±1 Ft/cent sosem
  hasznos szerződéses összegen, a kockázat viszont valós; nem „fókusz + blur-commit”, mert a
  haszontalan lépés maradna; nem globális tiltás, mert a darabszám léptetése használt.
- Pénz-jelleg explicit — mert a `unit` megléte nem különbözteti meg a HUF ár-mezőt a darabszámtól.
- Ha a kézi újrateszt a tiltás után is reprodukálja a +1-et: új tétel, nem ennek a farka.

## Verification
- [ ] tests — 1000 € fölötti érték kurzoros szerkesztése túléli a blurt; a mező ezres jel nélkül
      mutat, az összesítők és a PDF csoportosítva; betűk beírására látható jelzés + utolsó érték;
      pénzmezőn gomb és nyíl nem változtat, darabszám/százalék mezőn igen; HUF pénzmező ugyanúgy
      védett, mint az EUR
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y — valódi egér-/billentyű-eseményre nincs véletlen
      léptetés pénzmezőn
