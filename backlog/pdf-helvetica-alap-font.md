# pdf-helvetica-alap-font
Type: chore
Source: manual-checks pdf szelet (2026-09-07), /implement-batch futásból
Target: master
Baseline: 845577489be31d266baea12b5a3668e5b00fea95

## Goal
Eldől és rögzül, hogy a nyomtatvány minden szövegfutama beágyazott NotoSans-szal renderel-e — és ha
egy futam mégis a pdfkit alapértelmezett Helveticájára esik vissza, az megszűnik.

## Current state
- `app/src/pdf/fonts.ts` `registerPdfFonts` — NotoSans 400/600; a `.ttf` import Vite-URL-t ad.
- `app/src/pdf/tervDocument/styles.ts` `s.page` `fontFamily: 'NotoSans'` — minden `Text` innen
  örököl; nincs `pdf/` alatt olyan `Text`, ami a `Page` fáján kívül renderelne.
- `app/src/pdf/fonts.test.ts` — a két TTF name-tábláját olvassa; PDF-et NEM renderel.
- `@react-pdf/pdfkit` `PDFFont.finalize()` (`pdfkit.js:37641`) korán kilép `dictionary == null`
  esetén; `ref()` egyetlen hívója `_renderGlyphs` (`@react-pdf/render/lib/index.js:128`) —
  tehát `/BaseFont /Helvetica` ⇒ egy oldal `/Resources /Font`-ja hivatkozik rá ⇒ rajzolt szöveg.
- `@react-pdf/pdfkit` `initFonts()` (`pdfkit.js:37674`) a dokumentum létrejöttekor
  `this.font('Helvetica')`-t hív — ez az alapértelmezés, amire egy font nélküli futam visszaesik.
- `.claude/skills/manual-checks/pdf.md` — `allBaseFonts`, `hasHelvetica` (nyers substring),
  `fontFile2Count`, `objStmCount` mérése; a `/Resources /Font` szótárt nem nézi.
- `docs/reviews/2026-09-06-manual-checks-all.md` és `docs/reviews/2026-08-10-browser-validation.md`
  ellentmondó `allBaseFonts` leletei (utóbbi a kérdést kimondottan nyitva hagyja).
- `app/src/pdf/CLAUDE.md` font-sora — ma csak annyit mond, hogy a Helvetica nem tud ő/ű.

## Approach
1. Egyszeri, eldobható mérés valódi PDF-bájtokon (a mérőkód NEM kerül a repóba): a `/BaseFont`
   lista MELLETT minden oldal `/Resources /Font` szótára — ez dönti el, hivatkozik-e oldal a
   Helvetica-objektumra, és melyik oldal.
2. Ha nem hivatkozik: a tény és a megkülönböztetés bekerül a doksikba, kód nem változik.
3. Ha hivatkozik: megkeressük, melyik szövegfutam esik vissza, és a `pdf/` alatt megszüntetjük.
4. `.claude/skills/manual-checks/pdf.md`: a mérés a `/Resources /Font`-ra is kiterjed, és a szelet
   kimondja a VÁRT értéket és a riasztás kritériumát.
5. `app/src/pdf/CLAUDE.md`: a font-sor kiegészül a lezárt ténnyel, path-qualified anchorral.

NEM tartozik ide: állandó `renderToBuffer`-es PDF-bájt teszt bevezetése a vitest-készletbe, a
font-készlet bővítése, a NotoSans lecserélése, a subset-tagek vagy a `fontFile2Count` ellenőrzésének
kiterjesztése, és a `bufferShim.ts` környéke.

## Decisions
- Nincs állandó Node-vitest PDF-bájt teszt — mert a `.ttf` import Vite-URL-t ad, Node-ban
  `fontkit.open` fájl-útvonalat vár, tehát a teszt nem a `registerPdfFonts()`-ot futtatná; a
  fidelity-vesztésért cserébe kapott őr gyengébb, mint a `manual-checks pdf` szelete.
- A riasztás kritériuma az oldal-`/Resources /Font` hivatkozás, nem a `hasHelvetica` substring —
  mert a `finalize()` korai kilépése miatt egy nem hivatkozott font ki sem íródik, tehát a puszta
  substring mást jelent, mint egy `/BaseFont /Helvetica` bejegyzés.
- A javítás — ha kell — ide tartozik, nem külön `Type: bug` tételbe: egy aláírandó dokumentumon a
  néma glyph-vesztés nem vár külön körre.
- Javítás esetén a regressziós őr az, amit a vitest-réteg meg TUD figyelni (a hiányzó
  font-hozzárendelés a stílus-oldalon), plusz a `manual-checks pdf` szelet — nem valódi PDF-bájt.

## Verification
- [ ] a valódi PDF bájtjain egyetlen oldal `/Resources /Font` szótára sem hivatkozik Helvetica
      font-objektumra, és a `/BaseFont` lista csak a két NotoSans-subsetet tartalmazza
- [ ] ha javítás kellett: az érintett szövegfutam a nyomtatványon NotoSans-szal renderel, és a
      vitest-réteg által megfigyelhető szelete regressziós tesztet kap
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf
