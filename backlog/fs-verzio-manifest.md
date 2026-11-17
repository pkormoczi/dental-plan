# fs-verzio-manifest
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a
Target: master
Baseline: 8c0d3ee981c910e659fe9fa68291c850fcf00ca6

## Goal
A telepített appban egy verzió csak teljes JSON+PDF-párként használható: a verziósor jelzi, ha a másik gépről még nem érkezett meg teljesen („Szinkron folyamatban vagy hiányos”, „Újraellenőrzés”), sorszám sosem ismétlődik, és egy elakadt index-írás nem rontja a véglegesítés sikerét.

## Current state
- `app/src/storage/fajlTarolo.ts` `doSavePlan`: kizárólagos `mappaLetrehoz` közvetlenül a verziómappára, benne `terv.json`, PDF, `paciens.json` egy try/catch-ben, rollbackkel; `listVersions` csak `parseVersionDirName`-szűrés; `loadPlan`/`loadPlanPdf` teljességet nem néz.
- `app/src/domain/types.ts` `PlanVersion`: nincs `allapot`.
- Kész, használatlan: `app/src/storage/taroloHibak.ts` `HianyosVerzioError`; `app/src/storage/taroloIpc.ts` `HIANYOS_VERZIO`, `VERZIO_UTKOZES.letezo` (ma mindig `null`). `app/src/storage/paths.ts` `VersionConflictError` csak `dirName`-et visz, üzenete „hiba a hívó kódban”.
- `app/electron/fileSystemStorage.ts`, `app/electron/fsPrimitivek.ts` (`atnevez` POSIX-őrrel); teszt: `app/electron/fileSystemStorage.test.ts`, szerződés: `app/src/storage/szerzodesTesztek.ts`.
- Verziósor: `app/src/components/PatientPlanChains.tsx` (`isLegfrissebb`, „Új verzió”/„Megnézés”, ⋯ menü), `app/src/pages/TervReszleteiPage.tsx`. „Legfrissebb verzió” származtatás: `app/src/domain/torzsadatBetoltes.ts` `loadUtolsoTerv`, `app/src/state/planIndulas.ts`, `app/src/pages/Home.tsx` (imént véglegesített kártya).
- `app/src/pages/PreviewPage.tsx` `savePlan`-hívás, `cimkeHiba` siker-képernyős minta.

## Approach
- Mag (`fajlTarolo.ts`): a `savePlan` a tervmappán belüli `.tmp-<versionDir>-<random>` mappába ír (`terv.json`, PDF, utoljára `manifest.json`: `schemaVersion`, `mentesId`, `keszult`, fájlonként `sha256` + `meret`), átnevezés előtt friss listázással újraellenőriz, majd átnevez. Hiba → a temp és az e hívásban született páciens-/láncmappa törölve. Utána `paciens.json`; ennek hibája → a visszatérési érték `figyelmeztetes: 'INDEX_IRAS_HIBA'`, a verzió marad.
- `listVersions` minden verzióhoz `allapot: 'teljes' | 'hianyos'`, hiányosnál `hianyzik` (fájlnév, ill. eltérő méret/hash). `loadPlan`/`loadPlanPdf` hiányosra `HianyosVerzioError`.
- Teljesség-ellenőrzés és manifest-írás tároló-opció: `FileSystemStorage` be, `DemoStorage` ki (mindig `teljes`, nem ír manifestet).
- `VersionConflictError` a meglévő verzió adatait viszi (dátum, orvos, végösszeg a manifestből és a `terv.json`-ból; hiányosnál nincs), IPC-n át is; az üzenete a dokinak szól.
- UI, hiányos sor a `PatientPlanChains`-ben: „Szinkron folyamatban vagy hiányos” jelvény; alatta „Ez a verzió még nem teljes (hiányzik: …). Ha a Drive szinkronizál, várj.”; „Újraellenőrzés” (lánc-adat újratöltése, polling nincs); összeg „—”; nincs ⋯ menü. Amíg a lánc legfrissebb verziója hiányos, a láncon nincs „Új verzió” és „Megnézés”; a régebbi sorok ⋯ menüje (Letöltés, Másolás új tervbe) marad. A `TervReszleteiPage` hiányos verzióra ugyanezt az üzenetet és gombot mutatja. A „legfrissebb verzió” származtatások csak `teljes` verziót vesznek.
- `PreviewPage` siker-képernyő, `INDEX_IRAS_HIBA`: halk (szürke) sor: „A terv elmentődött; a páciens a listákban a következő mentésig a korábbi adatokkal szerepelhet.”
- `app/src/storage/CLAUDE.md`: a manifest a mappastruktúra része; teljesség-szabály egy sorban, anchorral.
- NEM ide: a `VERZIO_UTKOZES` dialógusa és a „Mentés a következő sorszámra” (`fs-hibafelulet`); `.tmp-*` maradványok listázása (`fs-utkozes-sav`); `gepId` a manifestben (a gépenkénti config a `gyokermappa-varazslo`-é, addig a mező kimarad).

## Decisions
- Hiányos legfrissebb mellett nincs „Új verzió” a láncon — doki döntése: elavult alapból indulna; nem költözik a legfrissebb teljes sorra.
- Az átnevezés előtti újraellenőrzés a sorszámot nézi, nem a pontos nevet — a másik gép más dátummal adhatja ugyanazt a `_vN`-t; az `assertVersionDirAvailable` névegyezése ezt nem fogná.
- A `teljes` ítélet folyamaton belül cache-elt (útvonal + méretek), a `hianyos` mindig újraellenőrződik — append-only mappán a teljes nem romlik; különben minden lánc-nézés minden PDF-et hash-elne.
- sha256 a Web Crypto `subtle.digest`-tel — Node-ban és böngészőben is van, a mag DOM-mentes marad, új primitív nem kell.
- Demóban nincs manifest és ellenőrzés — a Pages-demó nem változhat, a seed-verzióknak nincs PDF-je.
- `INDEX_IRAS_HIBA` halk sor, nem hiba — a verzió a lemezen van, egy újrapróba duplikált verziót szülne (migrációs terv §4.5).
- A „legfrissebb verzió” származtatás a hiányost átugorja — nem tölthető; nem hibaüzenet az „Új terv”/törzsadat-tartalék útján.
- `VersionConflictError` üzenete doki-szöveg — a „hiba a hívó kódban” manifesttel hamis; a dialógusig ez látszik a mai hibasávban.

## Verification
- [ ] tests (Node): manifest nélküli, hiányzó PDF-ű és hash-eltérő verzió → `hianyos` + `hianyzik`, `loadPlan`/`loadPlanPdf` elutasítva, a következő sorszám nem használja újra; átnevezés előtt megjelent azonos sorszám (más dátummal is) → `VERZIO_UTKOZES` a meglévő adataival, temp eldobva, semmi nem íródott felül; index-írás hibája → siker + `INDEX_IRAS_HIBA`, a verzió `teljes`; elszáradt `.tmp-*` mappa nem listázódik verzióként.
- [ ] tests: a szerződés Demo-futásában minden verzió `teljes`; IPC-körút `letezo`-val.
- [ ] tests (jsdom, hiányost adó tárolóval): hiányos sor jelvénnyel, hiányzó-listával, Újraellenőrzéssel; nincs Új verzió a láncon; Újraellenőrzés után a szokásos gombok; TervReszletei hiányos üzenete; `INDEX_IRAS_HIBA` sor.
- [ ] typecheck/lint
- [ ] docs-check
