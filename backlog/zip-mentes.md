# zip-mentes
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a
Target: master
Baseline: e0a79ee6f3bad213f250ed65ee227955dc7e6d0f

## Goal
A telepített appban a Beállítások Adattárolás fülén a teljes adatmappáról biztonsági mentés készíthető egy ZIP-fájlba; a fül mutatja az utolsó mentés dátumát és gépét, a Kezdőlap pedig 30 nap után emlékeztet.

## Current state
- `app/src/pages/settings/AdattarolasTab.tsx`.
- `app/src/pages/Home.tsx`: `UtkozesSav`; az elrejthető sáv mintája `app/src/components/UtkozesSav.tsx` (`futasok` WeakMap = „erre a futásra”).
- `app/src/components/LetoltesJelzo.tsx` (`LetoltesFelirat`, `jelezLetoltes`): a „Másolva:” visszajelzés mintája.
- `app/electron/ipcKezelok.ts` `PdfRendszer`, `pdfKezelok` (injektált mentés-dialógus, a renderer célt nem ad); `app/electron/main.ts` `helyetValaszt` (Dokumentumok-alapértelmezés).
- `app/electron/adatmappa.ts` `Adatmappa` (`gepId` a configból, aktív gyökér, `prim`); `app/electron/fsPrimitivek.ts` `FsPrimitivek` (gyökérbe zárt olvasás, atomi írás).
- `app/electron/naplo.ts` `GYOKER_NEV`: a naplóban név szerint megmaradó gyökérfájlok.
- `app/src/storage/StorageContext.tsx` `Adattarolas`; `app/src/storage/taroloIpc.ts`.
- `docs/TELEPITES.md`: mentés, visszaállítás nincs. ZIP-író nincs (`app/vite.main.config.ts` `noExternal: true`).

## Approach
- **Main:** a teljes gyökérmappa ZIP-be kerül (a `.tmp-*` maradványok és az OS-szemét, pl. `desktop.ini`, `.DS_Store` nélkül). A natív mentés-dialógus alapértelmezése `mandoki-dental-mentes-<ISO dátum>.zip` a Dokumentumokban. A gyökérben lévő vagy alatta fekvő célt a main elutasítja, és megmondja, miért. Az írás temp fájlba, majd átnevezéssel történik; hibánál nem marad félkész ZIP.
- **`biztonsagi-mentes.json`:** siker után a gyökérbe kerül (`utolso`, `gepId`), last-write-wins index. Írásnak számít a kilépési emlékeztetőnél, a naplóban név szerint látszik.
- **A renderer** a gépazonosítót nem kapja meg, csak azt, hogy az utolsó mentés ezen a gépen készült-e.
- **Új képesség a `StorageContext`-ben** (demóban `null`): mentés indítása és az utolsó mentés lekérdezése; új csatornák küldő-ellenőrzéssel.
- **Adattárolás fül, új szekció:**
  - „Biztonsági mentés ZIP-be” gomb, folyamatban-állapottal;
  - visszajelzés az elmentett fájlnévvel;
  - „Utolsó mentés: <dátum> (ezen a gépen | a másik gépen)” vagy „Még nem készült”;
  - figyelmeztető szöveg: a mentést csak titkosított külső lemezre szabad tenni (Windowson BitLocker To Go, Macen titkosított lemez).
- **Kezdőlap:** sárga emlékeztető, ha az utolsó mentés 30 napnál régebbi vagy nincs („Az utolsó biztonsági mentés N napja készült” / „Még nem készült biztonsági mentés”). „Biztonsági mentés most” gombbal indítja a mentést, „Elrejtés”-sel erre a futásra eltűnik; sikeres mentés után magától eltűnik.
- **`docs/TELEPITES.md`:**
  - havi mentés titkosított külső lemezre;
  - visszaállítás lépésenként: kibontás egy üres mappába, majd a varázslóban „Másik mappa kiválasztása”.
- **Nem tartozik ide:**
  - titkosított vagy jelszavas ZIP;
  - automatikus vagy ütemezett mentés;
  - visszaállítás az appból;
  - a mentés tartalmának szűrése vagy a hiányos verziók külön kezelése;
  - a doki fiktív adatos visszaállítás-próbája (az emberi teendő, a 10.2a kész-definíciója).

## Decisions
- **Titkosítás:** sima, titkosítatlan ZIP; az app és az útmutató a titkosított külső lemezt írja elő — a doki döntése. Nem AES-jelszavas, mert a beépített kibontó nem kezeli, és egy elfelejtett jelszó a mentést használhatatlanná tenné.
- **Kezdőlap-emlékeztető:** „Biztonsági mentés most” gombbal, erre a futásra elrejthető — a doki döntése. Nem állandó, és nem csak a Beállításokra mutat.
- **Mentés helye:** az adatmappába vagy alá mentést a main elutasítja, minden más hely engedett — a doki döntése. Az adatmappában lévő ZIP nem független másolat, a Drive felszinkronizálná, és a következő mentés magát is belecsomagolná.
- **Utolsó mentés kijelzése:** dátum és „ezen a gépen / a másik gépen” — a doki döntése.
- **A mentés a mappát hűen másolja,** a hiányos verziókat és a Drive-ütközéses neveket is. A visszaállított mappa ugyanazt mutatja, és az app semmit nem old fel magától (migrációs terv §1.1).
- **ZIP-író:** `yazl` (UTF-8 nevek, ZIP64) a main bundle-ben, visszaolvasás tesztben `yauzl`-lal — rutin. Nem saját író: a ZIP64 és a névkódolás a visszaállíthatóságon múlik.
- **A 30 napos küszöb számítása** DOM-mentes domain-függvény, tesztelhető mai dátummal — rutin.

## Verification
- [ ] tests:
  - a ZIP visszaolvasva az adatmappa minden fájlját tartalmazza, ékezetes páciensmappa-névvel együtt; `.tmp-*` és OS-szemét nélkül;
  - egy üres mappába kibontva az app a miénkként ismeri fel, és minden verzió `teljes`;
  - a mentés-dialógus az adatmappán belüli célt elutasítja, és nem ír;
  - hibás írásnál nem marad félkész ZIP a célhelyen;
  - bezárt dialógusnál nincs írás;
  - siker után a `biztonsagi-mentes.json` frissül, és a kilépési emlékeztető aktiválódik;
  - az új csatornák idegen küldőt elutasítanak;
  - a naplóban a ZIP célja nem jelenik meg névvel;
  - a 30 napos küszöb: 30 napon belül nincs emlékeztető, utána és mentés nélkül van;
  - a Kezdőlap-emlékeztető gombja ment, az Elrejtés erre a futásra eltünteti, a sikeres mentés után eltűnik;
  - az Adattárolás fül mutatja a dátumot, a gépet és a titkosított lemez szövegét;
  - képesség nélkül (Pages) se gomb, se emlékeztető;
  - az e2e (`test:electron`) egy mentést elkészít, és a ZIP létrejön.
- [ ] typecheck/lint
- [ ] docs-check
