# demo-import
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a
Target: master
Baseline: 3bab41e179e9bea9992ad6d1f256a20a434ac5bb

## Goal
A telepített appban a doki beolvashatja a demóból exportált fájlt (`kezelesi-terv-export-<nap>.json`): a varázsló üres-mappa ágán új adatmappa épül belőle, a Beállítások → Adattárolás fülön pedig megerősítés után lecseréli a használt mappa árlistáját, beállításait és az exportban szereplő nyomtatvány-szövegeit.

## Current state
- `app/src/storage/adatExport.ts` `AdatExport`, `ADAT_EXPORT_FORMATUM`, `adatExportOsszeallitasa`; `adatExport.test.ts`. Importáló nincs.
- Validátorok: `app/src/domain/validate.ts` `assertPriceListShape`, `assertSettingsShape`; `app/src/domain/schema.ts` `assertKnownSchemaVersion`; `parseJson`.
- Varázsló: `app/src/components/AdatmappaPanel.tsx` üres-mappa ág („Új adatmappa létrehozása”), `useAdatmappaValasztas.ts`; main: `app/electron/adatmappa.ts` `Adatmappa.hasznal`, `app/electron/fileSystemStorage.ts` `adatmappatLetrehoz`, `hianyzotIr`.
- Sablonok: `app/src/storage/fajlTarolo.ts` `DEFAULT_TEMPLATES`, `latestTemplateFile` (a base legmagasabb `-vN`-je az élő), `alapsablonokatPotol` (base-szintű pótlás).
- Beállítások: `app/src/pages/settings/AdattarolasTab.tsx`; IPC: `app/src/storage/taroloIpc.ts`, `app/electron/ipcKezelok.ts` `adatmappaKezelok`, `app/electron/main.ts` `helyetValaszt` és a `DENTAL_PLAN_TESZT_*` injektálás; képesség: `app/src/storage/StorageContext.tsx` `Adattarolas`.
- Tesztek: `app/electron/adatmappa.test.ts`, `fileSystemStorage.test.ts`, `ipcKezelok.test.ts`; e2e `app/e2e/tarolo.spec.ts`, `app/e2e/electronApp.ts` `inditas`.

## Approach
- Validátor az `adatExport.ts` mellé (DOM-mentes, a main is használja), sorrendben: JSON (`parseJson`) → `formatum` → az export `schemaVersion`-je → árlista és beállítások: `assertKnownSchemaVersion` + alak → `sablonok`: objektum, kulcs `<név>-v<szám>.md` mintájú (kisbetű, számjegy, kötőjel; út-elválasztó és `..` nem fér bele), érték string. Az első bukás olvasható magyar üzenet, írás nélkül.
- Main: natív fájlválasztó (`.json` szűrő), olvasás méretkorláttal, validálás; a parse-olt exportot a main tartja, a renderer csak az összegzést kapja (az export dátuma; árlista tételszáma és `arlistaVerzio`, használt mappánál a mostani `arlistaVerzio` is; `rendelo.nev`; a nyomtatvány-szövegek száma és a beépítettből pótoltaké). Megerősítéskor a main a nála tartott exportot írja, a renderer tartalmat nem küld. Teszt-injektálás a meglévő mintán: `DENTAL_PLAN_TESZT_IMPORT_FAJL`, csak `DENTAL_PLAN_TESZT_USER_DATA` mellett.
- Varázsló: az üres-mappa ágon (frissen választott mappánál; a beállított, üresnek talált mappa blokkoló ágán nem) „Van egy exportált fájlom a demóból” → összegzés → írás a közvetlenül előtte újraosztályozott üres mappába: árlista, beállítások, sablonfájlok, `paciensek/`, a hiányzó base-ek a beépítettből; utána config és aktiválás, mint a `hasznal`-nál.
- Beállítások → Adattárolás: új „Átvitel a demóból” szekció ugyanazzal a gombbal; a megerősítő ablak kimondja, hogy a mostani árlista és beállítások elvesznek, a páciensek és a tervek nem változnak, és előbb biztonsági mentést javasol. Írás a `FileSystemStorage`-ban, az írás-sorosításon át (§4.4); siker után „Az import kész” az ablakban, aztán újratöltés, mint mappaváltásnál. Az `irasTortent` mindkét úton jelez.
- Docs: `docs/TELEPITES.md` Első indítás + rövid „Átvitel a demóból” rész; CHANGELOG; FEATURES.
- NEM tartozik ide: a demó export-oldala és a DEMÓ-sáv (a doki 2026-11-16-i döntése szerint nem változik), a Pages lekapcsolása, import hiányos vagy idegen mappába, páciensadat.

## Decisions
- Használt mappában az import felülír, a régi nem kerül félre, a vissza út a ZIP-mentés — a doki döntése (2026-11-19); nem `_import-elotti/` másolat, és nem csak-üres-mappa.
- Összegzés: dátumok és darabszámok — a doki döntése; nem tételes lista, nem egy mondat.
- Használt mappában az ütközésőr nem fut, `_utkozesek/` nem keletkezik — mert a doki a teljes cserét választotta, és egy oda tett régi árlista az induláskori ütközés-sávban jelenne meg; nem `felulir: true`.
- Sablon-egyesítés base-szinten: üres mappába az export minden fájlja, a beépítettből csak az a base, amelyiknek az exportban nincs fájlja; használt mappában az export base-enkénti legfrissebb szövege a mappa ugyanazon base-ének legfrissebb fájljára íródik (ha nincs ilyen, az export fájlnevén) — mert az app a legmagasabb `-vN`-t olvassa, egy fájlszintű írás egy magasabb helyi verzió mögött hatástalan maradna.
- A nyitott piszkozat marad, félkész-terv-megerősítés nincs — mert a mappa nem változik, és a piszkozat sorai pillanatképek, mint egy árlista-szerkesztés után.
- Validálás és írás a mainben, a renderer csak összegzést kap — §3.2 (a main nem bízik a renderer tartalmában); nem `<input type="file">` + renderer-oldali validálás.

## Verification
- [ ] tests — validátor: az `adatExportOsszeallitasa` kimenete átmegy; sorrendben bukik a rossz `formatum`, az újabb export-, árlista- és beállítás-`schemaVersion`, a hibás árlista- és beállítás-alak, a `../x-v1.md` és a mintán kívüli kulcs, a nem string érték. Varázsló: üres mappából `rendben` mappa az export árlistájával, beállításaival, szövegeivel, a hiányzó base pótolva; bukó fájl, bezárt dialógus vagy közben nem üressé vált mappa után semmi nem íródik; idegen küldő elutasítva. Használt mappa: árlista és beállítások lecserélve, az exportált base magasabb helyi `-vN`-je is az export szövegét adja, az exportban nem szereplő szöveg, a páciensek és a tervek érintetlenek, `_utkozesek/` nincs. UI: összegzés a számokkal; Mégse nem ír; a Beállítások-ablak kimondja a felülírást és a mentési javaslatot; képesség nélkül (Pages) nincs import. e2e: varázsló → injektált export → Kezdőlap, a mappában az export árlistája.
- [ ] typecheck/lint
- [ ] docs-check
