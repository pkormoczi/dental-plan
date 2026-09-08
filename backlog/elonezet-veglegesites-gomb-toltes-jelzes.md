# elonezet-veglegesites-gomb-toltes-jelzes
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 6. megállapítás
Target: master
Baseline: dad0259413a6a2de9a1c61bba29e744f859acdf2

## Goal
Az Előnézet első megnyitásakor a szürke „Véglegesítés és mentés” gomb mellett és a PDF helyén ott
áll, hogy „Nyomtatvány készül…” — a doki látja, miért szürke a gomb.

## Current state
- `app/src/pages/PreviewPage.tsx:692` — a letöltés-gombhely (benne a `!foglalas`, `pdfError`,
  `pdfStale` állapot-feliratok, `:697-711`) `pdfInstance.url &&` mögé van zárva, tehát az első
  rendereléskor semmi nem látszik ott.
- `:597` `pdfStale = pdfInstance.loading`, `:600` `pdfError = pdfInstance.error`, `:611`
  `busy = saving || pdfStale || foglalas === undefined`; a véglegesítés-gomb `disabled`-je
  `:728-730`.
- `:774-787` a PDF helyén `Skeleton` a végleges (iframe-méretű, keretes) alakban — a Radix
  `Skeleton` a GYEREKEIT elrejti, tehát a felirat nem tehető egyszerűen bele. Ugyanez az alak a
  `app/src/App.tsx` `PreviewLoading` Suspense-fallbackjében.
- Élő régió meglévő mintája: `app/src/pages/PriceListAdminPage.tsx` `VisuallyHidden`
  `aria-live="polite"` és `app/src/components/NumberField.tsx` — a régió MOUNTKOR a DOM-ban van,
  csak a szövege vált (dinamikusan beszúrt régiót sok képernyőolvasó nem mond be).
- A `usePDF` fájlonként mockolt (`app/src/CLAUDE.md` jsdom-vakfoltok). A legtöbb teszt statikus
  mockot ad (`url: 'blob:fake-preview-url'`), de `app/src/pages/PreviewPage.pdfHiba.test.tsx` és
  `app/src/pages/PreviewPage.iframeRemount.test.tsx` MUTÁLHATÓ `pdfMock.state`-tel dolgozik —
  innen állítható `url: null` és `loading: true`. Ma sem a `pdfStale`, sem az `url == null` ágra
  nincs teszt.

## Approach
Egyetlen komponens, `PreviewPage.tsx`: a letöltés-gombhely kapjon „még nincs URL” ágat is (a
meglévő `!foglalas`/`pdfError`/`pdfStale` ágak mintájában), és a `Skeleton`-os PDF-hely mellé
kerüljön ugyanaz a felirat. A „Nyomtatvány készül…” az ELSŐ előállításé (`pdfInstance.url` még
nincs); a meglévő „PDF frissítése…” marad a már látott PDF újrarenderelésére.

NEM tartozik ide: a véglegesítés-gomb `disabled` feltétele és a `busy` összetevői; a
checklist-figyelmeztetések szövegezése (`checklist-figyelmeztetes-szovege`); a PDF-előállítás
gyorsítása; a sikerképernyő gombsora; az `Elavult PDF` / `Azonosító foglalása…` ágak szövege.

## Decisions
- A letöltés-gombhely az első betöltés alatt is látszik, letiltott gombként „Nyomtatvány készül…”
  felirattal — mert a repó kimondott mintája a „skeleton a végleges elrendezés alakjában, ne
  pörgő spinner, a layout ne ugorjon” (`app/src/App.tsx`, `pages/demo/OsszesTervSection.tsx`), és
  így a magyarázat közvetlenül a szürke véglegesítés-gomb MELLETT áll, ahogy a jelentés kéri; nem
  marad rejtve a gombhely, mert akkor a doki csak a néma szürke gombot látná.
- A „Véglegesítés és mentés” gomb saját felirata változatlan — mert az állapot-feliratot a
  szomszédos gombhely hordozza (ez a ma is élő `PDF frissítése…` minta), és az elsődleges gomb
  feliratának cserélgetése elvenné a gomb felismerhetőségét; a `saving` alatti „Mentés…” marad.
- Külön szöveg az első előállításra („Nyomtatvány készül…”) és a frissítésre („PDF frissítése…”)
  — mert az első esetben nincs mit frissíteni, és a doki panasza pont az első megnyitásra szólt.
- A „Nyomtatvány készül…” felirat képernyőolvasónak is bejelentődik: egy MOUNTKOR már a DOM-ban
  lévő `aria-live="polite"` régió, ami csak szöveget vált (a `PriceListAdminPage`/`NumberField`
  mintája) — mert a dinamikusan beszúrt régiót sok képernyőolvasó nem mondja be, és az
  `app/src/CLAUDE.md` szerint a WCAG AA nem opcionális.

## Verification
- [ ] tests — amíg a PDF első példánya készül (nincs `url`), a letöltés-gombhelyen letiltott
      „Nyomtatvány készül…” gomb áll és a PDF helyén is ott a felirat; a PDF elkészültével a
      „Letöltés” gomb és az iframe váltja fel; egy KÉSŐBBI újrarenderelésnél (van `url`,
      `loading`) továbbra is „PDF frissítése…” látszik; a véglegesítés-gomb letiltási feltételei
      és a `pdfError` / `Azonosító foglalása…` ágak változatlanok
- [ ] typecheck/lint
- [ ] docs-check
