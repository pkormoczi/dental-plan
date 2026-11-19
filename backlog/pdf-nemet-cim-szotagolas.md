# pdf-nemet-cim-szotagolas
Type: bug
Source: review:2026-11-19-manual-checks-pdf#1
Target: master
Baseline: e25298c3d125238b9fb1d81f1ddfe8ba834957f4

## Goal
Német terv PDF-jén a fejléc címe szóhatáron, kötőjel nélkül törik: „Behandlungsplan und” /
„Kostenvoranschlag”, a mai „Behandlungsplan und Kostenvoran-” / „schlag” helyett.

## Current state
- `app/src/pdf/tervDocument/Chrome.tsx` `MainHeader`: a cím (`L.docTitle`, `s.headerTitle`) egyetlen
  `Text` szótagolás-tiltás nélkül; ugyanebben a fájlban a rendelő-blokk és a lábléc már a
  `nincsSzotagolas` callbackot kapja.
- `app/src/pdf/tervDocument/styles.ts` `headerTitleBlock`: fix 220 pt széles, a kétsoros német cím
  szándékos.
- `app/src/pdf/labels.ts` `pdfLabels` `docTitle`: HU „Kezelési terv és árajánlat”, DE
  „Behandlungsplan und Kostenvoranschlag”.
- Mérés NotoSans SemiBold 12,5 pt-on: a teljes DE cím 254 pt (két sor kell), „Behandlungsplan und”
  134 pt, „Kostenvoranschlag” 116 pt, a HU cím 152 pt (egy sor).
- Teszt-minta: `app/src/pdf/TervDocument.test.tsx` „a fejléc és a lábléc rendelő-sorai nem
  szótagolnak: a szó egészben marad” (a mock a `hyphenationCallback`-et `data-szotagolas`-ra képezi).

## Approach
- A `MainHeader` címe a meglévő `nincsSzotagolas` callbackot kapja; más fájl nem változik.
- NEM tartozik ide: a cím szövege és a `headerTitleBlock` szélessége; a `headerMeta` sor; a
  `MiniHeader`; a dokumentum többi részének szótagolása (táblázat, nyilatkozat, feltételek).

## Decisions
- A tiltás nyelvfüggetlen, a cím `Text`-jén — mert a HU cím egy sorban elfér, rajta látható változás
  nincs; nem csak a DE ágon, mert az nyelvi elágazást vinne egy egysoros javításba.

## Verification
- [ ] tests — a fejléc címe (HU és DE) nem kap szótagolást: a szó egészben marad
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf — DE PDF fejlécében „Behandlungsplan und” / „Kostenvoranschlag”
      kötőjel nélkül, a cím nem csúszik a rendelő-blokkra; a HU cím továbbra is egy sor
