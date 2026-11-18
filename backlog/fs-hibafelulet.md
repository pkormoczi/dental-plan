# fs-hibafelulet
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a
Target: master
Baseline: c1c105c9819cc692e58092fcb04415749771e033

## Goal
A telepített appban a fájlrendszeri hibák a doki nyelvén szólnak, a sorszám-ütközés egy kattintással a következő sorszámra menthető, a ma néma ellenőrzés-kiesések látszanak, és a PDF „Megnyitás” + „Másolás máshová” gombokkal érhető el, a Letöltések mappa megkerülésével.

## Current state
- `app/src/storage/taroloHibak.ts` `IoError` (üzenete ma „Fájlrendszer-hiba (<errno>): <út>”); `app/src/storage/taroloIpc.ts` `storageHibaBolHiba` (`SEMA_VERZIO`); `app/src/domain/schema.ts` `SchemaVersionError`.
- `app/src/storage/paths.ts` `VersionConflictError` (`letezo`); `app/src/storage/fajlTarolo.ts` `doSavePlan` a foglalás-eltérésre sima `Error`-t dob („A nyomtatványra v… került…”).
- `app/src/pages/PreviewPage.tsx` `doFinalize` (`saveError`), foglalás-effekt (`feloldKovetkezoAzonosito`, `foglalas`), sikerképernyő „Megnyitás külön” + „Letöltés”, piszkozat „Letöltés” (`elonezetFajlnev`); `app/src/storage/openPlanPdfInNewTab.ts`.
- PDF-akciók még: `app/src/pages/TervReszleteiPage.tsx`, `app/src/pages/Home.tsx` (imént véglegesített kártya), `app/src/components/PatientPlanChains.tsx` `downloadVersion` (⋯ „Letöltés”).
- Néma `catch`: `app/src/components/PatientEditorPanel.tsx` (`listPatients` a duplikáció-ellenőrzéshez), `app/src/components/PaciensKotesContext.tsx` (`listPatients`); véglegesítés-őr: `app/src/domain/veglegesitesOr.ts`.
- `app/src/pages/PatientDetailPage.tsx` `deleteError` piros Callout (a `TorlesAkadalyError` szövege ma is a terv szerinti).
- Main: `app/electron/ipcKezelok.ts` (`megmutatKezelo` minta), `app/electron/ipcValidate.ts` (`planRef`, `PDF_MAX_BAJT`), `app/electron/preload.ts`, `app/electron/main.ts`; renderer-képesség: `app/src/storage/StorageContext.tsx` `megmutat`.

## Approach
- Hibaszövegek: az `IoError` üzenete errno szerint a migrációs terv §5 szövege (+ a fájl útja); a meglévő hibahelyek (piros Callout, betöltési képernyő) így változtatás nélkül ezt mutatják. `SEMA_VERZIO` az IPC-n átjövet kiegészül: „valószínűleg a másik gépen újabb az alkalmazás”.
- Sorszám-ütközés: a foglalás-eltérés is `VersionConflictError` a sorszámot foglaló verzió adataival. A `PreviewPage` dialógust mutat: a meglévő verzió sorszáma, dátuma, orvosa, végösszege, „Mented a következő sorszámra, vagy mégsem?”; „Mentés v<n>-ként” friss foglalás → újragenerált PDF → mentés; „Mégsem”/Escape: semmi nem íródik, a doki az Előnézeten marad.
- Néma helyek: `PatientEditorPanel` — ha a pácienslista nem olvasható, halk szürke sor a mentés mellett („A hasonló nevű páciensek ellenőrzése most nem futott le.”), ami a következő sikeres listázásnál (újabb mentési kísérlet) eltűnik; `PaciensKotesContext` → új amber, nem blokkoló tétel a véglegesítés-őrben. A `PreviewPage` best-effort törzsadat-olvasása változatlan.
- PDF-akciók: új renderer-képesség a `StorageContext`-en (demóban `null`), két szűk main-csatornával: „Megnyitás” (verzió-hivatkozás → a main a teljes verzió PDF-jét a rendszer olvasójával nyitja; hiányosra hiba) és „Másolás máshová” (verzió-hivatkozás vagy a piszkozat bájtjai + javasolt fájlnév → natív mentés-dialógus, alapmappa a Dokumentumok). A képesség megléte dönt: a sikerképernyő, Terv részletei, Kezdőlap-kártya, lánc ⋯ menü és a piszkozat-előnézet gombjai ennek megfelelően; a fájlnév a mai `buildDownloadFileName`/`elonezetFajlnev`.
- NEM ide: ütközés-dialógus a felülírt fájlokon (kész), blokkoló képernyő és gyökér „Mappa megnyitása” (`gyokermappa-varazslo`), napló (`fs-naplo-redakcio`); a Pages-demó gombjai és szövegei.

## Decisions
- „Mentés v<n>-ként” egy kattintás — doki döntése: a tartalom már átnézett, csak a sorszám más, a sikerképernyő kimondja; nem vissza az Előnézetre.
- A foglalás-eltérés ugyanaz a dialógus — a doki számára ugyanaz a helyzet (a sorszámot közben más foglalta); nem két külön üzenet.
- A piszkozat-PDF is „Másolás máshová” — doki döntése: páciensadatos fájl ne landoljon csendben a OneDrive-ra szinkronizálható Letöltésekben.
- Szövegcsere az `IoError`-ban, nem hívási helyenként — egy forrás, minden meglévő hibahely örökli; a demóban `IoError` nem keletkezik, ott semmi nem változik.
- A `SEMA_VERZIO` kiegészítés csak az IPC-n át — a demóban nincs „másik gép”.
- Célútvonalat a renderer nem ad, csak hivatkozást vagy bájtokat; a dialógust és az írást a main végzi — a renderer kompromittálódása se adhasson szabad írást (migrációs terv §3.2). Alapmappa a Dokumentumok: nem a Letöltések és nem a gyökérmappa.

## Verification
- [ ] tests — errno szerinti szövegek (EACCES/EPERM/EBUSY, ENOSPC, EROFS, EMFILE, EISDIR/ENOTDIR, hiányzó gyökér); `SEMA_VERZIO` az IPC-n kiegészítve, a demó üzenete változatlan
- [ ] tests — átnevezéskori ütközés és foglalás-eltérés → dialógus a meglévő verzió adataival; „Mentés v<n>-ként” után a mentett verzió és a PDF a következő sorszámot viseli; Mégsem/Escape után nincs új verzió
- [ ] tests — törlési akadály piros Calloutban; nem olvasható pácienslista → a szerkesztőben halk sor, a véglegesítésnél amber, nem blokkoló tétel
- [ ] tests — képességgel az öt helyen „Megnyitás”/„Másolás máshová”, nélküle a mai gombok; main: idegen küldő, hibás hivatkozás, hiányos verzió, túl nagy bájtsor elutasítva, a célutat a renderer nem adhatja meg
- [ ] typecheck/lint
- [ ] docs-check
