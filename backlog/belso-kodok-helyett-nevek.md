# belso-kodok-helyett-nevek
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 9. megállapítás
Target: master
Baseline: eabdbc6af7e895443f0dfb9965ce21b60def7eed

## Goal
A doki a saját nyelvén látja, mi hova került — a mappanevek megnevezett, másodlagos sorba
kerülnek, a „Megnyitás külön” füle pedig a páciens nevét és a terv címét mutatja.

## Current state
- `app/src/pages/PatientPage.tsx` (271–278. sor) — a kötés-jelző `ReadOnlyField`-je: a felirat
  „A terv ehhez a páciensmappához kötve mentődik”, az érték `${kotott.nev} (${kotottPatientDir})`.
  Az alatta álló ütközés-`Callout` a „fenti kötött páciensmappára” hivatkozik.
- `app/src/pages/PreviewPage.tsx` (515–517. sor) — a sikerképernyő monospace útvonalsora; a
  `tervCim` (`megjelenitettTervCim`) és a `savedRef` ugyanebben a komponensben már kéznél van.
- `app/src/storage/paths.ts` `parseVersionDirName` — a verziószám a `versionDir`-ből;
  `buildDownloadFileName` — a letöltési fájlnév, ez NEM változik.
- `app/src/pdf/TervDocument.tsx` — a `<Document>`-en ma nincs metaadat-prop; a `TervDocumentProps`
  MÁR kap `tervCim`-et, és `app/src/pdf/pdfCimLokalizacio.ts` `pdfTervCim` oldja fel a nyomtatvány
  nyelvére. `@react-pdf/renderer` ^4.5.1 — a `<Document>` `title` propja támogatott.
- Tesztek, amiket a változás elmozdít: `app/src/App.test.tsx` (77–78. sor) az útvonalsorból
  olvassa vissza a hármast (`getByText(/_v1$/)` + `split(' / ')`, kétszer);
  `app/src/pages/PatientPage.test.tsx` (758–759. sor) a kötés-jelző mai két szövegét állítja.

## Approach
`PatientPage.tsx`: a kötés-jelző név-elsődleges mondattá válik, alatta megnevezett, halvány
mappa-sor; az ütközés-`Callout` hivatkozó mondata maradjon igaz. `PreviewPage.tsx`: a
sikerképernyőn „<páciens neve> · <terv címe> · <n>. verzió”, alatta megnevezett, halvány
mappa-sor. `TervDocument.tsx`: a `<Document>` `title` metaadatot kap.

NEM tartozik ide: a mappastruktúra, a mappa-/fájlnév-képzés és az azonosítók (`paths.ts`
változatlan); a letöltött PDF fájlneve; a `storage/openPlanPdfInNewTab.ts` megnyitás-mechanizmusa;
a Demó „Fájlrendszer” nézet, ahol az útvonalak szándékosan nyersek maradnak. A már archivált
PDF-ek füle UUID marad — visszamenőleg nem generálunk újra nyomtatványt (append-only).

## Decisions
- A mappanevek nem tűnnek el, csak megnevezetté válnak — mert a doki a Fájlkezelőben névre keres
  (PRODUCT.md § Adat- és deployment-korlátok), és ez tartja egyértelműen azonosíthatónak a
  kötést azonos nevű pácienseknél; nem teljes elrejtés és nem összecsukott részlet.
- A PDF Title a nyomtatvány nyelvét követi (`pdfTervCim`, `pdf/pdfCimLokalizacio.ts`) — mert a
  Title a dokumentum metaadata, nem felületszöveg; a `tervCim` prop már megvan, nincs új adatút.
- A fülcím PDF-metaadatból jön, nem HTML-keretből — mert a nyomtatvány így egyetlen fájl marad,
  és a név a fájl tulajdonságaiban meg a nyomtatási párbeszédben is megjelenik; cserébe a régi,
  archivált verziók füle változatlan.
- A verziószám a meglévő `parseVersionDirName`-ből, a terv címe a helyben már kiszámolt
  `tervCim`-ből — nincs új parser és nincs újraszámolás.
- A „Mappa:” felirat és maga az útvonal külön elemben — hogy az `App.test.tsx` útvonal-leolvasása
  egyszerű maradhasson.

## Verification
- [ ] tests — a kötés-jelzőn a páciens neve az elsődleges szöveg, a mappanév megnevezett
      másodlagos sorban áll, és két azonos nevű páciens esetén is megkülönböztethető; a
      sikerképernyőn „<név> · <terv címe> · <n>. verzió” látszik a mappa-sor mellett; a generált
      PDF metaadatában a páciens neve és a terv címe szerepel, német terven a nyomtatvány
      nyelvén; a letöltött fájl neve változatlan
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf (a fülcím és a PDF-tulajdonságok valódi Chrome-ban)
