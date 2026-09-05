# app/src/domain

## Mental model
- Mentett sor = pillanatkép (`nevSnapshot`, `listaEgysegar`), sosem az élő árlista.
  → test:app/src/domain/totals.test.ts#does NOT mutate or overwrite the passed-in mentett value
- `osszesitok` a fájlból igaz; eltérésnél jelzés. → symbol:app/src/domain/totals.ts#osszesitokElter
- Pénz egész, minor unit; formázás csak itt. → symbol:app/src/domain/money.ts#formatMoney
- Nyelv és pénznem függetlenek; a kereső mindkét nyelven talál, a pénznem nem szűr.
  → symbol:app/src/domain/search.ts#nevEgyezik
- `null` ár ≠ 0: abban a pénznemben nem ajánlható. → symbol:app/src/domain/penznemValtas.ts#nincsListaar
- Nyelvi mismatch-et CSAK az explicit „Nyelv ellenőrizve” old fel — szerkesztés, fordítás, nyelvváltás
  nem. → symbol:app/src/domain/nyelviReview.ts#reviewElfogadva
- Egy véglegesítés-őr (hard/soft/info); új feltétel ide, nem a PreviewPage-be.
  → symbol:app/src/domain/veglegesitesOr.ts#veglegesitesDiagnozis;
  test:app/src/domain/veglegesitesOr.test.ts#üres ervenyesIg az "ervenyes-ig-hianyzik" hard tételt adja
- A sor `savos` mezője dönt a nyomtatvány `*`-áról, nem az árlista ártípusa.
- Új verzió dátuma BETÖLTÉSKOR bélyegződik. → symbol:app/src/domain/ujVerzioDatum.ts#frissDatummal

## Intentional gaps
- Nincs HUF↔EUR átváltás; `masikPenznem*` csak váltási munkaállapot. → product:#nem-cel
- `Tetel.leiras` hiányzó DE fordítása némán elmarad, nem esik magyarra. → symbol:app/src/domain/nev.ts#arlistaiLeiras

## Find before writing
- money: `formatMoney`, `basePrice`, `savosHatarForditott` · teeth: `parseTeeth`
- nev: `resolveNev`, `sorFallback` (árlistai fordítás hiánya), `nevAtirt` (kézi eltérítés) — két kérdés,
  ne vond össze; `nevKoveti`, `leirasKoveti` · nemetNev: `nemetNeveIgazolt`
- totals: `tervVegosszeg`, `elolegOsszegek`, `elolegTullepi`, `computeOsszesitok`, `osszesitokElter`
- kitoltetlen: `kitoltetlenSorok`, `araztalanSorok`, `nullaOsszeguSorok`, `uresFazisok`
- arKoveti: `arKoveti`, `arFrissites`, `arElteroSorok`, `frissArlistaval` (kézi ár ≠ `arKoveti`)
- sorElteres: `sorElteres` (kedvezmény/felár, a szín a hívóé) · orokoltJelzesek: `orokoltJelzesekkel`
- priceListIds: `nextTetelId` · penznemValtas: `penznemvaltasHatasa`
- templates: `isPlaceholderTemplate`, `sablonNyomtathato` · piszkozat: `piszkozatTartalmas`
- blankPlan: `createBlankPlan` · planCopy: `planMasolatKent` · orvosok: `orvosProblema`
- paciensKotes: `paciensKotes` · paciensTorles: `paciensTorlesAkadaly` · arlistaSzures: `tetelIlleszkedik`
