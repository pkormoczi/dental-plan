# sikerkepernyo-nyomtatas-letoltes
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 2. megállapítás (a 15. is ide fut)
Target: master
Baseline: df4a2d515cf31903b9a4447f9a1a4896aae3012c

## Goal
A „Véglegesítés és mentés" utáni sikerképernyőn egy kattintással megnyitható/letölthető a most
mentett PDF; a böngésző Vissza a plan előnézetére visz (nem zsákutcába, és nem enged
újra-véglegesítést); aki nem látta a sikerképernyőt, a Kezdőlapon egy „imént véglegesített terv"
kártyáról ugyanide jut.

## Current state
- A sikerképernyő (`PreviewPage.tsx` `savedRef` ág, `:428-478`) minden hook-ot lát: `pdfInstance`
  (`usePDF`, `:272`) élő marad, mert `markPlanSaved(persisted)` a `plan` state-et a PERZISZTÁLT
  tervre állítja (`AppState.tsx:478-491`), nem üríti ki.
- A Terv részletei lapon (`TervReszleteiPage.tsx`) MÁR létezik a két művelet: `megnyitasKulon()`
  (`:222-255`, popup-blokk-tűrő `window.open` + `loadPlanPdf` + blob-URL) és a `Letöltés` link
  (`:419-436`, `usePlanPdfObjectUrl` + `buildDownloadFileName`). Nincs valódi „Nyomtatás"
  sehol a kódban (nulla `window.print()`); a natív böngésző-PDF-nézegető nyomtat.
- `plan.statusz === 'VEGLEGES'` a piszkozatban KIZÁRÓLAG közvetlenül `markPlanSaved` után áll
  elő — minden más betöltési út (`loadPlanIntoDraft` `AppState.tsx:427`, `planCopy.ts:106`,
  `blankPlan.ts:70`) explicit PISZKOZAT-ra állítja vissza. Ez a megbízható jel az
  újra-véglegesítés letiltásához.
- `navigate('/elonezet')` (`PlanEditorPage.tsx:320`) push; a `doFinalize()` (`:312-409`) ma NEM
  hív `navigate`-et — a sikerállapot csak komponens-state, ezért a böngésző-előzményben nincs
  külön belépési pont, amire a Vissza visszatérhetne.
- `latestVersionAcrossPlans(plans, versionsFor)` (`domain/planFolders.ts:44-49`) — a páciens
  összes tervláncának legfrissebb verziója, pontosan a Kezdőlap-kártyához kell.
  `PatientFolder.utolsoAktivitas` (`domain/paciensAktivitas.ts`) már rögzíti a
  `terv-veglegesitve` típust + időpontot, `aktivitasSzoveg`/`legutobbAktivPaciensek` mellette él.

## Approach
Változik:
- `app/src/pages/PreviewPage.tsx` — a sikerképernyőn két új gomb (`Megnyitás külön`,
  `Letöltés`) a most mentett verzióra; a `savedRef` `useState` helyett egy `useRef` + egy
  URL-jelző (`?mentve=1`) dönti el a sikerállapot megjelenítését, hogy a Vissza/Előre valódi
  history-lépés legyen; a „Véglegesítés és mentés" gomb `disabled`-je kiegészül
  `plan.statusz === 'VEGLEGES'`-szel, mellette rövid magyarázó szöveg.
- ÚJ megosztott helper (pl. `app/src/storage/openPlanPdfInNewTab.ts`) — a `megnyitasKulon()`
  popup-tűrő logikájának kiemelése, hogy a sikerképernyő, a Kezdőlap-kártya és a Terv részletei
  ugyanazt hívja.
- `app/src/pages/TervReszleteiPage.tsx` — `megnyitasKulon()` az új helperre épül (kis
  refaktor, a gomb/szöveg változatlan).
- `app/src/pages/Home.tsx` — új „imént véglegesített terv" kártya (a „Piszkozat folytatása"
  kártya mintáján), a két PDF-művelettel.
- `app/src/domain/paciensAktivitas.ts` — kis recency-predikátum (pl. `imentVeglegesitve`) a
  kártya megjelenítési ablakához (30 perc).

NEM tartozik ide: a sikerképernyő belső kódjainak (mappanév) laikus szövegre cserélése
(`belso-kodok-helyett-nevek`); a véglegesítés közbeni frissítés (`frissites-veglegesites-kozben-ures-elonezet`);
a beágyazott iframe saját Vissza-navigációja (`elonezet-vissza-iframe-hibaoldal`); a böngésző
natív PDF-eszköztára (`pdf-nezegeto-google-drive-gomb`); a Letöltés gomb néma voltának
visszajelzése (`letoltes-visszajelzes`); valódi `window.print()` bevezetése.

## Decisions
- A sikerállapotot egy `?mentve=1` URL-jelző + `navigate()` push adja, a meglévő `savedRef`
  komponens-state helyett egy `useRef`-ben tárolt referenciával — mert e nélkül a Vissza gomb
  nem hagy valódi history-bejegyzést; nem `location.state`, mert az F5-nél elveszne, és a
  visszaesési út (a Kezdőlap-kártya) ezt már lefedi.
- A „Véglegesítés és mentés" letiltása `plan.statusz === 'VEGLEGES'`-nél — mert ez a
  piszkozatban KIZÁRÓLAG a frissen mentett tartalom lehet (lásd Current state), újra-mentése
  duplikált verziót hozna létre; nem egy külön megerősítő dialógus, mert a gomb már ma is
  `disabled`-alapú mintát követ.
- A „Megnyitás külön" logika kiemelése megosztott helperbe — mert három hívóhely (Terv
  részletei, sikerképernyő, Kezdőlap-kártya) ugyanazt a popup-blokk-kezelést és hibaszöveget
  igényli; nem másolás, mert a `nincsMentettPdfHiba` mintáját ismétlő harmadik példány
  karbantarthatatlan lenne.
- A Kezdőlap-kártya célverzióját `latestVersionAcrossPlans` adja, nem új tárolt mutató — a
  doki döntése szerint a több egyidejű terv-lánc esete elfogadottan pontatlan marad, ahogy ma
  máshol is (l. `tobb-felretett-terv`).
- A recency-ablak 30 perc — elegendő a „frissítés közben elveszett sikerképernyő" esetre, nem
  ragad be tartósan egy „legutóbbi terv" kártyaként.

## Verification
- [ ] tests — sikeres véglegesítés után a sikerképernyőn `Megnyitás külön` és `Letöltés` gomb
      jelenik meg a most mentett verzióra (a `Letöltés` `download`-attribútuma
      `isDraft:false`+`suffix:versionDir`-rel épül, mint a Terv részletei lapon); böngésző
      Vissza a sikerképernyőről a plan előnézetére visz, ahol a „Véglegesítés és mentés" gomb
      letiltva + magyarázó szöveg látszik (`plan.statusz === 'VEGLEGES'`); Előre visszahozza a
      sikerképernyőt; a Kezdőlapon egy `terv-veglegesitve` aktivitású, 30 percen belüli páciensre
      megjelenik az „imént véglegesített terv" kártya a két gombbal, régebbi vagy más típusú
      aktivitásnál nem.
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf — a sikerképernyő és a Kezdőlap-kártya `Megnyitás külön` gombja
      valódi böngészőben tényleg megnyitja az archivált PDF-et új lapon.
