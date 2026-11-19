# manual-checks — `pdf` szelet, 2026-11-19

Kiváltó: `/implement pdf-fejlec-lablec-sortores` 2d lépése. A tétel a PDF fejlécének
rendelő-blokkját négy külön sorra, a lábléc bal blokkját három sorra bontotta, a cím két külön
mezőből jön (`app/src/pdf/tervDocument/Chrome.tsx`), és ezek a szövegek nem szótagolnak.

Környezet: izolált, headless Chrome (`.mcp.json`, `--isolated`), `npm run dev`
(`http://localhost:5173/dental-plan/`), 1440×900, a teljes oldalhoz 1440×1500; seed demó adat,
determinisztikus reset a menet elején. Glyph-próba: páciens „Tőkés Ödönné”, tétel „Gyökérkezelés
felső őrlőfogon”. Futásidő: ~25 perc.

## A tételhez tartozó ellenőrzés — rendben

| Eset | Eredmény |
|---|---|
| HU, 28 soros terv, első oldal | ✅ fejléc: „1117 Budapest” / „Móricz Zsigmond körtér 15. 3/8” / „+36 70 617 3172” / „istvan@drmandoki.hu”, kötőjel nélkül |
| HU, teli első oldal alja | ✅ lábléc bal blokkja: név / „1117 Budapest, Móricz Zsigmond körtér 15. 3/8” / „Adószám: — · Cégjegyzékszám: —”; a táblázat utolsó sora és a lábléc vonala között üres sáv, nincs átfedés |
| DE, ugyanez a terv, kitöltött adószám (12345678-1-43) és cégjegyzékszám (01-09-123456) | ✅ négysoros fejléc, háromsoros lábléc; „Steuernummer: … · Handelsregisternummer: …” egy sorban elfér |
| Rövid (3 soros) terv, kitöltött cégadatokkal | ✅ háromsoros lábléc, a jobb blokk (páciensnév · tervId, árlista · oldalszám) változatlan |
| Csak `cim`-et tartalmazó `beallitasok.json` a localStorage-ban, teljes újratöltés | ✅ a Rendelő fülön „Irányítószám, város” = „1117 Budapest”, „Utca, házszám” = „Móricz Zsigmond körtér 15. 3/8”; a tároló mentésig érintetlen |

## A szelet állandó pontjai — rendben

- Fontok: `NotoSans-Regular.ttf` és `NotoSans-SemiBold.ttf` letöltődött (59 840 / 59 908 bájt).
- Nyers bájtok (HU és DE): `allBaseFonts` csak a két NotoSans-subset, `hasHelvetica: false`,
  Helveticára hivatkozó oldal nincs, `objStmCount: 0`, `fontFile2Count: 2`.
- Placeholder-zár: DE nyilatkozat `[PLATZHALTER` törzzsel elmentve, ugyanabban a munkamenetben
  vissza az előnézetre → „Csak ajánlat” bekapcsolva és tiltva, `pageCount` 4 → 3.
- Fogtérkép A/B (bekapcsolt „Ábra a nyomtatványon”): fogszámokkal `imageXObjects` 4, a színezett
  térkép és az „Érintett fogak” cím látszik; fogszám nélkül 2, a térkép és a cím hiányzik, az
  összesítő teljes szélességű.
- Glyphek: ő/ű a páciensnévben és a tételnévben egyaránt helyes (képernyőkép).
- Letöltés: a „Letöltés” sima `<a download>` link („PISZKOZAT-kezelesi-terv-Tőkés-Ödönné-7l1951.pdf”),
  `clicks` üres, `external` üres.
- Konzol: 0 hiba. Egy „A form field element should have an id or name attribute” issue a PDF-néző
  saját mezőiből (oldalszám, nagyítás); az app dokumentumában nincs id/name nélküli mező.

## Kritikus

Nincs.

## Közepes

### 1. A német dokumentumcím szótagolva törik: „Kostenvoran-schlag”

Érintett: `app/src/pdf/tervDocument/Chrome.tsx` `MainHeader` (`s.headerTitle`),
`app/src/pdf/tervDocument/styles.ts` `headerTitleBlock`. Repro: német nyelvű terv előnézete → a
fejléc jobb oldalán „Behandlungsplan und Kostenvoran-” / „schlag”. A 220 pt-os címblokk két sorra
tördelése szándékos, de a react-pdf alapértelmezett szótagolása a szó közepén vág. A tételhez nem
tartozik (a terv a fejlécből csak a rendelő-blokkot vette fel); a páciens által aláírt
dokumentumon látszik.
- Döntés: backlog pdf-nemet-cim-szotagolas (2026-11-19)

## Apró

Nincs.

## Nem ellenőrizhető

- A placeholder-próba teljes újratöltésen át: a demó `init()` a placeholderes nyilatkozatot
  szándékosan visszaírja a seedre (`app/src/storage/DemoStorage.ts` `ensureSeedTemplates`), ezért
  a próba egy SPA-munkamenetben futott.
- `prefers-reduced-motion`: e szeletnél nem releváns.
