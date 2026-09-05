# app/src/pdf

## Mental model
- Szerződéses dokumentum jogi szabályai → product:#a-nyomtatvany-szerzodeses-dokumentum
- `pdfLabels`, `pdfCimLokalizacio` csak `pdf/` alól (komment-konvenció); a felület magyar marad.
  → symbol:app/src/pdf/labels.ts#pdfLabels; symbol:app/src/pdf/pdfCimLokalizacio.ts#pdfTervCim
- Egy fogtérkép-forrás: `design/toothChartSvg.ts` → DOM a szerkesztőben, canvas→PNG itt; `interactive:
  true` sosem a PDF-úton. jsdom alatt nincs canvas → a PNG `null`, a térkép kimarad.
  → symbol:app/src/design/toothChartSvg.ts#interactive; symbol:app/src/pdf/toothChartImage.ts#renderToothChartPng
- Font: NotoSans regisztrálva (a Roboto a képernyőé); a Helvetica nem tud ő/ű — csak a kész PDF-en látszik.
  → symbol:app/src/pdf/fonts.ts#registerPdfFonts; test:app/src/pdf/fonts.test.ts#SemiBold name table identifies itself as SemiBold, not Regular
- Kedvezmény és sor-szintű eltérés SOHA nem a nyomtatványon.
  → test:app/src/pdf/TervDocument.test.tsx#a terv-szintű kedvezmény összege, aránya és a "kedvezmény" szó SOHA nem jelenik meg a nyomtatványon
- Előleg > fizetendő → „—”, nem negatív. → symbol:app/src/domain/totals.ts#elolegOsszegek
- Placeholder fizetési feltételek/garancia címestől kimarad. → symbol:app/src/domain/templates.ts#sablonNyomtathato
- Placeholder/üres nyilatkozat → aláírás-oldal nem kerül be, „csak ajánlat” kényszerített.
  → test:app/src/pages/PreviewPage.test.tsx#PreviewPage -- nyilatkozat placeholder kemény zár
- Render-hiba: a `usePDF` őrzi a régi `url`-t; a `PreviewPage` tiltja a letöltést/véglegesítést.
  → test:app/src/pages/PreviewPage.pdfHiba.test.tsx#hibaüzenet jelenik meg összeomlás nélkül, Újrapróbálás újrahívja updatePdf-et, Letöltés/Véglegesítés letiltva
- Blokkhatár = oldaltörés; a lábléc oldalszáma a tényleges renderből jön.

## Heuristics
- `footerLayout.ts`: a react-pdf nem mér szöveget — karakterszám-becslés, hosszú névvel böngészős ellenőrzés.
  → symbol:app/src/pdf/footerLayout.ts#footerNevSorok
- `markdownLite.ts`: minimális részhalmaz (`p`/`ul`/`ol`, `**`), nem teljes parser. → symbol:app/src/pdf/markdownLite.ts#parseBlocks

## Find before writing
- TervDocument + tervDocument/: `Chrome`, `PhaseTable`, `Markdown`, `styles` · labels: `pdfLabels`, `ALAIRAS_VAROS`
- footerLayout: `footerNevSorok`, `footerExtraMagassag` · markdownLite: `parseBlocks`, `parseInline`, `fillPlaceholders`
- Pénz/dátum a domain-ből (`formatMoney`, `formatLongDate`, `formatShortDate`) — nincs PDF-saját formázó.
