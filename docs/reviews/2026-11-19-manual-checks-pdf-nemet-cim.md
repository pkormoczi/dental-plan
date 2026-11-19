# manual-checks — `pdf` szelet, 2026-11-19 (német cím)

Kiváltó: `/implement pdf-nemet-cim-szotagolas` 2d lépése. A tétel a fejléc dokumentumcímét
(`app/src/pdf/tervDocument/Chrome.tsx` `MainHeader`) szótagolás nélkülire állította, a rendelő-blokk
és a lábléc mintájára.

Környezet: izolált, headless Chrome (`.mcp.json`, `--isolated`), `npm run dev`
(`http://localhost:5174/dental-plan/`), 1440×900; seed demó adat, determinisztikus reset a menet
elején. Glyph-próba: páciens „Tőkés Ödönné”, árlistai tétel fogszámmal (36). Futásidő: ~12 perc.

## A tételhez tartozó ellenőrzés — rendben

| Eset | Eredmény |
|---|---|
| DE terv előnézete, első oldal | ✅ a cím „Behandlungsplan und” / „Kostenvoranschlag”, kötőjel nélkül; a jobb szélre zárt címblokk nem ér a rendelő-blokkhoz |
| HU terv előnézete, első oldal | ✅ „Kezelési terv és árajánlat” egy sorban, változatlan |

## A szelet állandó pontjai — rendben

- Fontok: `NotoSans-Regular.ttf` és `NotoSans-SemiBold.ttf` letöltődött (59 840 / 59 908 bájt).
- Nyers bájtok (DE): `allBaseFonts` csak a két NotoSans-subset, `hasHelvetica: false`, Helveticára
  hivatkozó oldal nincs, `objStmCount: 0`; a HU PDF-ben sincs Helvetica.
- Placeholder-zár: HU nyilatkozat `[PLACEHOLDER` törzzsel elmentve, ugyanabban a munkamenetben
  vissza az előnézetre → „Csak ajánlat” bekapcsolva és tiltva, `pageCount` 3 → 2.
- Fogtérkép A/B (bekapcsolt „Ábra a nyomtatványon”): fogszámmal `imageXObjects` 4, a színezett
  térkép látszik; fogszám nélkül 2.
- Letöltés: a „Letöltés” sima `<a download>` link („PISZKOZAT-kezelesi-terv-Tőkés-Ödönné-8xb98g.pdf”),
  `clicks` üres, `external` üres.
- Konzol: 0 hiba; az „A form field element should have an id or name attribute” issue a PDF-néző
  saját mezőiből jön, ahogy a délelőtti menetben.

## Kritikus

Nincs.

## Közepes

Nincs.

## Apró

Nincs.

## Nem ellenőrizhető

- A placeholder-próba teljes újratöltésen át: a demó `init()` a placeholderes nyilatkozatot
  szándékosan visszaírja a seedre (`app/src/storage/DemoStorage.ts` `ensureSeedTemplates`), ezért
  a próba egy SPA-munkamenetben futott.
