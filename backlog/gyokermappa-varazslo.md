# gyokermappa-varazslo
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a
Target: master
Baseline: 3da4cdc2847eb60c3c14e80dad3cf6d8b1c76fd6

## Goal
A telepített app varázslóval kéri az adatmappát, induláskor blokkol, ha az nem használható, az Adattárolás fülön a mappa megnyitható/váltható, kilépéskor emlékeztet a Drive-feltöltésre.

## Current state
- `app/electron/main.ts` `inditas`: fájlrendszeres tároló csak `DENTAL_PLAN_TESZT_GYOKER`-rel, különben demó (`AKTIV_CSATORNA`).
- `app/electron/fileSystemStorage.ts` `osztalyoz`, `init` (üres gyökérbe ma magától ír: `alapKeszletetIr`).
- `app/src/storage/fajlTarolo.ts` `ujManifest` (nincs `gepId`), `loadLatestTemplateByBase` (hiányzó alapsablonra hiba).
- `app/src/storage/StorageContext.tsx` (`hid.aktiv`, `megmutat` csak gyökéren belül — `app/electron/ipcValidate.ts` `gyokerRelativUtvonal`; `naploMegmutat` gomb nélkül); `app/src/storage/taroloIpc.ts` `TaroloHid`.
- `app/src/state/AppState.tsx` `discardPersistedDraft`; `app/src/pages/SettingsPage.tsx`, `app/src/pages/DemoPage.tsx`, `app/src/components/DemoBanner.tsx`.
- `app/electron/naplo.ts` `gyokerNaplozo`; `app/e2e/tarolo.spec.ts`; `docs/TELEPITES.md` (demó-figyelmeztetés, nincs gépváltási szabály).

## Approach
- Main: `userData/config.json` (`schemaVersion`, `gyokerMappa`, egyszer generált `gepId`). Gyökérállapot induláskor: nincs config / rendben / elérhetetlen / üres / hiányos / idegen; a tároló csak „rendben”-nél indul, mappaváltáskor cserélődik (csatornák egyszer regisztrálva, napló az aktuális gyökérhez kötve). `gepId` a manifestbe.
- `init()` üres gyökérbe sem ír. Explicit akciók: „Új adatmappa létrehozása” (varázsló üres ága), „Hiányzó alapfájlok létrehozása” (csak hiányzó saját elem), „Hiányzó alapsablonok pótlása” (csak verzió nélküli alapra `-v1`).
- Új main-csatornák küldő-ellenőrzéssel: mappaválasztás (natív `showOpenDialog`, a renderer nem ad útvonalat, eredmény validált), a fenti akciók, gyökér megmutatása, kilépés-jelzés.
- Renderer, a tároló kiválasztásakor, polling nélkül: varázsló (My Drive alatti, Tükrözés módú mappa; ne Shared Drive, ne Letöltések) és blokkoló képernyő („Újrapróba” / „Másik mappa kiválasztása”, hiányosnál + pótlás).
- Beállítások új „Adattárolás” fül, csak telepítettben: útvonal, „Mappa megnyitása”, „Mappa váltása” (utána teljes újratöltés), gépváltási szabály, alapsablon-pótlás, „Napló megnyitása”.
- Kilépés: ha volt sikeres írás, ~4 mp-es záró képernyő „Bezárás most” gombbal; nem válaszoló renderernél a main határidő után zár.
- Telepítettben `DemoBanner` helyett „Próbaüzem: csak kitalált páciensadattal”, a DEMO lap Filerendszer és Adatkezelés füle rejtve. A Pages-demó nem változik.
- `docs/TELEPITES.md`: első indítás, gépváltási szabály (az appal azonos szöveg), próbaüzem a demó-figyelmeztetés helyett.
- Nem ide: `demo-import`, `zip-mentes`, a demó lebontása, a Letöltések/Shared Drive/Tükrözés kikényszerítése, a korábbi localStorage-demóadat átvitele.

## Decisions
- Hiányos mappa pótlása a blokkoló képernyő harmadik gombja, megerősítéssel („csak ha a Drive már végzett”), csak hiányzót ír — doki döntése; nem a Beállításokban, mert blokkolt állapotból oda nem jut el.
- Mappaváltáskor félkész terv: megerősítés („A félkész terv elvész”), igenre törlődik — doki döntése; nem tiltás/átvitel, mert a régi mappa páciensére mutathat. A kérdés érvényes mappa kiválasztása után jön; Mégsem semmit nem változtat.
- Kilépési emlékeztető: rövid záró képernyő — doki döntése; nem rendszer-értesítés (Mac-engedély, Ne zavarjanak), nem Rendben-dialógus (blokkoló).
- Telepítettben próbaüzem-sáv, két demó-fül rejtve — doki döntése; az éles indulás kapujáig.
- Üres mappánál a varázsló megerősítést kér, a második gépre figyelmeztetve („ha a másik gépeden már van adatmappa, várd meg a Drive letöltését”) — doki döntése.
- Induláskor üresnek talált, korábban választott gyökér blokkol, nem épít bele — mert ez le nem töltött Drive is lehet (migrációs terv §6.2/§6.4); új adatmappa csak a varázsló üres ágán.
- Letöltések/Shared Drive/Tükrözés csak szöveg — nem kikényszeríthető (§12).
- Config csak sikeres választás után, atomian; olvashatatlan config → varázsló — rutin.
- Dialógusok injektálhatók (`PdfRendszer`-minta); e2e előre írt configgal — rutin.
- Adattárolás külön fül — nincs mentendő draftja, csak telepítettben látszik.
- `gepId` opcionális manifestmező, a teljesség-ellenőrzés nem használja, sémaverzió nem nő (§6.1).

## Verification
- [ ] tests — main: config nélkül varázsló; elérhetetlen/üres/hiányos/idegen → blokkoló állapot írás nélkül; „Új adatmappa” csak üresbe, pótlás csak hiányzót; config csak sikerkor, `gepId` egyszer és megmarad; váltás után tároló és napló az új gyökéren; új csatornák idegen küldőt elutasítanak; manifestben `gepId`; írás után a bezárás záró képernyőt kér, írás nélkül nem.
- [ ] tests — renderer: varázsló üres mappánál figyelmeztetve megerősít, idegent elutasít; blokkoló képernyő állapotonként helyes szöveggel/gombokkal, hiányosnál pótlás megerősítés után; Adattárolás fül csak képességgel; váltás félkész tervnél megerősít, igenre elvet; telepítettben próbaüzem-sáv, a két fül nélkül; képesség nélkül (Pages) változatlan.
- [ ] tests — e2e (`test:electron`): előre írt configgal a mappán indul; nem létező mappára mutató configgal blokkoló képernyő, mappa nem jön létre.
- [ ] typecheck/lint
- [ ] docs-check
