# konzol-buffer-is-not-defined
Type: chore
Source: doctor-review nagy-terv (2026-09-05), 17.; papirrol (2026-09-05), 22. megállapítás
Target: master
Baseline: 0cddfda207c5fdbb75fa41249c1393e0eed91f7a

## Goal
Az előnézet renderelésekor a konzolon ne jelenjen meg a „Buffer is not defined" figyelmeztetés.

## Current state
- Izolált böngészőben, valódi stack trace-szel igazolva: a forrás
  `@react-pdf/renderer` saját, bundle-be épített `fetchImage` függvénye
  (`node_modules/@react-pdf/renderer` — nem app-kód), ami minden `<Image>`/`<ImageBackground>`
  node feloldásakor lefuttat egy `Buffer.isBuffer(source)` ellenőrzést try/catch-ben; a catch ág
  `console.warn(e.message)`-t hív. Böngészőben a csupasz `Buffer` hivatkozás
  `ReferenceError: Buffer is not defined`-t dob, amit a catch elnyel — a `node.image` ekkor már
  a helyes értékre állt, csak a belső cache-kulcs (`node.image.key`) marad kitöltetlen. A PDF ettől
  hibátlanul elkészül (megfigyelve).
- A `<Image>` node-ok forrása: `app/src/pdf/tervDocument/Chrome.tsx` (fejléc-logó, minden
  oldalon) és `app/src/pdf/ToothChartPdf.tsx` (fogtérkép-PNG) — ez adja a többoldalas tervnél
  megfigyelt 14–19 ismétlődést.
- KIZÁRVA gyökérokként: a `clone` csomag (`node_modules/clone/clone.js`) `typeof Buffer`
  ága biztonságos (a `typeof` sosem dob deklarálatlan globálra) — ez a nyom hamis vezetőnek
  bizonyult a diagnosztika során.
- `app/src/pages/PreviewPage.tsx` — az egyetlen hívó, ahol `usePDF()` fut
  (`import { usePDF } from '@react-pdf/renderer'`); `app/src/App.tsx` `lazy(() =>
  import('./pages/PreviewPage'))` — ez a react-pdf lazy chunk betöltési határa.
- jsdom-vakfolt: a react-pdf primitíveket jsdom nem tudja ReactDOM-mal renderelni
  (`app/src/pdf/TervDocument.test.tsx` fejléc-kommentje), a valódi renderelési útvonal ma
  sehol nem fut le tesztben.

## Approach
Egy minimális, ág-semleges `Buffer.isBuffer` shim (NEM teljes Node-`Buffer`-polyfill csomag) a
`PreviewPage.tsx`-ben, a `usePDF` import mellett — csak akkor ír `window.Buffer`-t, ha még
nincs ott. Ettől a `fetchImage` meglévő, már ma is ott lévő védelmi ága (ami Buffer hiányában
egyébként is helyesen viselkedne) kivétel nélkül lefut, a konzol néma marad. Nem teljes
`buffer` npm csomag hozzáadása (bővítené a bundle-t egy funkcióért, amit ki sem használunk),
és nem a `console.warn` globális elnyomása (elfedne valódi hibákat is — ez pont az, amit a
tétel meg akar szüntetni).

## Decisions
- Helyi, kétsoros shim a hívási helyen, nem `buffer` npm függőség — a `fetchImage` kizárólag
  `Buffer.isBuffer()`-t hív, egy teljes polyfill felesleges bundle-súly egyetlen metódusért.
- A shim a `PreviewPage.tsx`-ben (a react-pdf lazy chunk határán) él, nem `main.tsx`-ben — a
  blast radius a react-pdf tényleges használati helyére szűkül, nem globális app-indításkori
  side effect.

## Verification
- [ ] tests — a shim modulra: `window.Buffer.isBuffer(...)` bármely bemenetre `false`-t ad,
      nem dob. A valódi react-pdf-renderelés (a figyelmeztetés tényleges eltűnése) jsdom-vakfolt
      (react-pdf primitívek nem futtathatók jsdom+ReactDOM alatt) — ezt a `/manual-checks pdf`
      ellenőrzi.
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf — a konzolon nincs „Buffer is not defined" előnézet-renderelés után
