# betoltesi-hiba-masik-mappa
Type: feature
Source: gyokermappa-varazslo implementálása közben talált
Target: master
Baseline: eb996216bf60229570ccc79ce962a629fbf86e0f

## Goal
A telepített appban a „Nem sikerült betölteni az adatokat” képernyőn az „Újrapróbálás” mellett „Másik mappa kiválasztása” és „Mappa megnyitása” is van, így egy sérült vagy újabb sémájú fájl miatt elakadt indulásból a doki kijut.

## Current state
- `app/src/state/AppState.tsx` `AppStateProvider` `loadError`-ága: csak „Újrapróbálás” (`setLoadToken`). A hibát a `ready` (`ElectronStorage.init` → `app/electron/fileSystemStorage.ts` `init`) és a `loadSettings`/`loadPriceList` adja (`SerultJsonError`, `SchemaVersionError`, `IoError`, `HianyosMappaError`). Erre a képernyőre ma nincs teszt.
- `app/src/storage/StorageContext.tsx` `Adattarolas` (`valaszt`, `hasznal`, `megnyit`, `ujratolt`): ebben az állapotban az adatmappa már `rendben`, a tároló fut, ezért a `megnyit` működik.
- `app/src/components/useAdatmappaValasztas.ts`, `app/src/components/AdatmappaPanel.tsx`: a választás lépései és állapotonkénti panelje.
- `app/src/pages/settings/AdattarolasTab.tsx`: a „Mappa váltása” mintája (dialógus a panellel, `valtasElott` félkész-terv-kérdéssel, `DiscardChangesDialog`).
- `app/src/domain/piszkozat.ts` `piszkozatTartalmas`; a piszkozat a `drafts`-ban (`app/src/storage/DemoDraftStorage.ts`) akkor is ott van, ha az AppState nem töltődött be.

## Approach
- A `loadError`-képernyő a telepített appban (ha van `adattarolas` képesség) két gombot kap: „Másik mappa kiválasztása” (a mappaváltás folyamata) és „Mappa megnyitása” (`adattarolas.megnyit`). A Pages-demó hibaképernyője változatlan.
- A mappaváltás (dialógus a panellel, félkész-terv-kérdés, váltás, újratöltés) az Adattárolás füllel közös elemre épül, hogy a két hely ugyanúgy viselkedjen.
- A félkész terv meglétét a hibaképernyő a `drafts`-ból olvassa, nem az AppState-ből, mert az itt nem töltődött be.
- Nem tartozik ide:
  - a sérült fájl javítása, felülírása vagy alapértelmezettre cserélése;
  - a hibás fájl kijelölése a fájlkezelőben;
  - a hibaüzenetek szövegének változtatása;
  - a demó hibaképernyője.

## Decisions
- A félkész tervre ugyanaz a szabály érvényes, mint a Beállítások mappaváltásánál (megerősítés, igenre elvész): a doki ezt a mappaváltásra döntötte el, és a piszkozat itt is a régi mappa páciensére mutathat. Nem kap új szabályt.
- Olvashatatlan piszkozatnál is kérdez: biztonságosabb alapértelmezés, mert csendben nem vész el semmi.
- A „Mappa megnyitása” a gyökeret nyitja meg, nem a hibás fájlt jelöli ki: a hibák nem mindig hordoznak gyökérhez relatív utat, a hibaüzenet pedig megnevezi a fájlt.
- A közös mappaváltó elem az Adattárolás fül mintájából kiemelve készül (rutin), nem másolatként.

## Verification
- [ ] tests:
  - a telepített appban betöltési hibánál (pl. sérült árlista) a képernyőn ott a hibaüzenet, és mindhárom gomb látszik;
  - a „Mappa megnyitása” a telepített app megnyitó műveletét hívja;
  - a „Másik mappa kiválasztása” a meglévő adatmappára kérdés nélkül vált és újratölt;
  - üres mappánál a létrehozás megerősítése jön, a Mégsem semmit nem változtat;
  - félkész tervnél előbb megerősítést kér: Mégse-re nem vált és a terv megmarad, igenre elveti és vált;
  - az Újrapróbálás továbbra is újratölt;
  - képesség nélkül (Pages) csak az Újrapróbálás látszik;
  - az Adattárolás fül meglévő tesztjei zöldek maradnak.
- [ ] typecheck/lint
- [ ] docs-check
