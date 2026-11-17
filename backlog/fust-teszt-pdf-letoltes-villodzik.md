# fust-teszt-pdf-letoltes-villodzik
Type: chore
Source: mac-intel-tamogatas implementálása közben talált (release próbafutás, 2026-11-17)
Target: master
Baseline: 1e206d44dc0ed59707aba5d7068ae76b71059ca8

## Goal
A csomagolt app PDF-előnézetes füst-tesztje lassú vagy terhelt runneren is stabilan zöld, a
PDF-tartalom ellenőrzése nem gyengül; a doki számára nincs látható változás.

## Current state
- `app/e2e/fust.spec.ts` „egy seed-terv előnézetén a PDF saját blob: URL-ről betölt, beágyazott
  NotoSans fonttal és a logóval”: az előnézeti iframe láthatóvá válása után azonnal kiolvassa a
  `src`-t, és a main process `downloadURL`-jével letölti; `completed` állapotot vár, utána a
  NotoSans-, `/FontFile2`- és logó-méret-ellenőrzés.
- `app/src/pages/PreviewPage.tsx`: `usePDF` + az `updatePdf`-et hívó effekt, ami a mount után
  betöltődő bemenetekre (nyilatkozat, fizetési feltételek, garancia, foglalás, fogtérkép-PNG stb.)
  újrarenderel; az iframe `key`-e a blob-URL. A `@react-pdf/renderer` `usePDF`-je minden sikeres
  újrarenderelés után új object URL-t ad, a régit visszavonja (`URL.revokeObjectURL`). Nyugalmi
  jel: a „Letöltés” link látszik; közben „Nyomtatvány készül…” vagy „PDF frissítése…” gomb áll.
- Bukás: release run 44148231341 (arm64 Mac, 2. próba) `interrupted` letöltési állapot; a hibakori
  lap-pillanatképen (`fust-teszt-macos-latest` artifact, `error-context.md`) már a „Letöltés” link
  látszik — egybevág azzal, hogy a kiolvasott URL egy közben lecserélt, visszavont példányé volt.
  Ugyanez a teszt Windowson, Intel Macen és a korábbi arm64-futásban zöld.

## Approach
Csak a füst-teszt változik: a letöltendő URL-t a PDF nyugalmi állapotában veszi (a „Letöltés” link
látszik, nincs folyamatban lévő újragenerálás), és az ekkor az iframe-ben lévő URL-t tölti le. A
`PreviewPage` és a `usePDF`-használat nem változik. Nem tartozik ide: a többi e2e-spec, az
előnézet termékviselkedése, timeout-emelés, a `release.yml`.

## Decisions
- Várás a nyugalmi állapotra — mert a bukás oka az URL lecserélődése; nem újrapróbálkozás
  `interrupted`-ra, mert az egy valódi visszavonási hibát is elfedne; nem timeout-emelés, mert nem
  időkorlát bukott.

## Verification
- [ ] tests — a füst-teszt csak a nyugalmi állapotban (látható „Letöltés”) érvényes URL-t tölti le,
      a NotoSans-, `/FontFile2`- és logó-ellenőrzés változatlan; `npm run test:electron` Windowson
      zöld
- [ ] typecheck/lint
- [ ] docs-check
