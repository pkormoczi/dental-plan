# fs-utkozesor
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a
Target: master
Baseline: 4e9238da73eca901e52046a5903ef3a7318b64c3

## Goal
Ha a telepített appban az árlista, a beállítások, egy páciens törzsadata vagy egy sablon a betöltés óta a másik gépen módosult, a mentés nem írja felül csendben: a doki dialógusban választ a másik gép változata és a sajátja között, és a vesztes változat sosem vész el.

## Current state
- `app/src/storage/fajlTarolo.ts`: `savePriceList`, `saveSettings`, `saveTemplate`, `savePatientData` vakon ír; a `load*` metódusok nem jegyeznek meg semmit.
- Kész, használatlan: `app/src/storage/taroloHibak.ts` `FelulirasUtkozesError`, `app/src/storage/taroloIpc.ts` `FELULIRAS_UTKOZES`.
- `app/src/state/AppState.tsx` `saveSettings`/`savePriceList`: optimista, hibára szándékosan nem gördül vissza; teszt: `app/src/state/AppState.test.tsx`.
- Közvetlen hívók: `app/src/components/PatientEditorPanel.tsx`, `app/src/pages/patientPage/TorzsadatSyncCard.tsx` (`savePatientData`), `app/src/pages/settings/NyomtatvanyokTab.tsx` `handleSaveTemplates` (bázisonként `saveTemplate`).
- Minta: `app/src/components/PiszkozatKonfliktusDialog.tsx`, Escape-kezelése a `app/src/components/TervWorkflowShell.tsx`-ben.
- `app/electron/fileSystemStorage.test.ts`, `app/electron/ipcValidate.ts`, `app/src/storage/ElectronStorage.ts`.

## Approach
- Mag: a négy fájlfajta betöltése megjegyzi a tartalom sha256-át (fájlonként, a tároló-példányban); mentés előtt újraolvasás, eltérésnél nincs írás, hanem `FelulirasUtkozesError` a lemezen lévő (parse-olt) tartalommal. Sikeres írás után a megjegyzett hash a frissen írté. Felülírás-jelzővel hívva a lemezen lévő változat előbb `_utkozesek/` alá kerül, csak utána íródik felül. Az őr tároló-opció: `FileSystemStorage` be, `DemoStorage` ki.
- IPC: a jelző és a hibapayload átmegy (`taroloIpc.ts`, `ElectronStorage.ts`, `ipcValidate.ts`).
- Közös dialógus a `PiszkozatKonfliktusDialog` mintáján: „A(z) <emberi név> időközben a másik gépen módosult.”, két gomb a következményével — „A másik gép változatának betöltése” (a most mentett módosítás elvész), „Az én változatom mentése” (a másik gép változata az adatmappa `_utkozesek` mappájába kerül); Escape = Mégsem.
- `AppState`: ütközésnél a mentés függő, a dialógus az app-héjban; közben érkező updaterek sorba állnak. Betöltés → a memória a lemezváltozatra áll (újratöltéssel, így a hash is friss), a sor erre fut; Saját → felülírás-jelzős mentés, a sor utána; Mégsem → a memória a legutóbb mentett értékre áll, a függő és a sorban álló módosítás eldobva, semmi nem íródik.
- Közvetlen hívók, ugyanaz a dialógus: Betöltés → az űrlap/sablon a lemezről újratölt; Mégsem → a begépelt szöveg az űrlapon marad, a mai mentési-hiba helyén „Nem mentve” jelzés, újramentésre a dialógus visszajön. Sablonoknál bázisonként; Mégsem után a hátralévő bázisok sem mentődnek.
- NEM ide: induláskori ütközés-sáv, `_utkozesek/` listázása (`fs-utkozes-sav`); egyéb I/O-hibák felülete (`fs-hibafelulet`); nem ütközéses mentési hibánál az `AppState` viselkedése változatlan; az indexfájlok (`paciens.json`, `terv-cimke.json`, `terv-ervenytelenitesek.json`) last-write-wins maradnak; tartalmi diff a dialógusban.

## Decisions
- Escape = Mégsem, semmi nem íródik — doki döntése; nem „a másik gép változata” (a begépelt szöveg veszne), nem kötelező döntés (csapda, „Escape zár” szabály).
- A hash a tárolóban, fájlonként — a migrációs terv §4.6 mintája, a hívók nem hordoznak hash-t; nem a renderer adja át. Korlát: ugyanazt a fájlt később betöltő másik képernyő frissíti a memóriát.
- Megjegyzett hash nélkül létező fájlra mentés = ütközés, nem létezőre szabad írás — a másik gép közben létrehozhatta (első `paciens-adatok.json`, `-v1.md`).
- `_utkozesek/` a gyökérben, név: `<fájl>.<ISO kettőspont nélkül>.<kiterjesztés>`, törzsadatnál a páciensmappa nevével előtagolva — a páciensmappába tett almappa terv-láncként listázódna, Windows-névben nincs `:`.
- Emberi név a dialógusban (árlista, beállítások, „<páciens> törzsadata”, a sablon címe) — a doki nem fájlnevekben gondolkodik.
- Nincs diff a dialógusban — a vesztes változat megőrzése miatt egyik döntés sem visszavonhatatlan.

## Verification
- [ ] tests (Node): mind a négy fajtán külső módosítás betöltés és mentés között → `FELULIRAS_UTKOZES` a lemezen lévővel, a fájl változatlan; felülírás-jelzővel → a régi `_utkozesek/` alatt, az új a helyén; sikeres mentés után a következő nem ütközik; hash nélkül létező fájl → ütközés; a Demo sosem ütközik.
- [ ] tests (`AppState.test.tsx`): a három kimenet (Betöltés: memória = lemez; Saját: lemez = saját, a régi megőrizve; Mégsem: memória = legutóbb mentett, semmi nem íródott); a dialógus alatt indított updater sorrendhelyes.
- [ ] tests (jsdom): sablon- és törzsadat-képernyőn a három kimenet, Escape = Mégsem, a hátralévő sablonbázisok Mégsem után nem mentődnek.
- [ ] typecheck/lint
- [ ] docs-check
