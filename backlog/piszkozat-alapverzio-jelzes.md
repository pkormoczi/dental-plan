# piszkozat-alapverzio-jelzes
Type: feature
Source: desktop-app-migration-plan-final.md 5. döntés és §10.0
Target: master
Baseline: ea1e320ab0bca3af17f8639e25ba99cec54f5578

## Goal
Ha a doki egy verzióból nyitott piszkozatot véglegesít, de a láncban azóta újabb verzió készült, az
Előnézet checklistje amber, nem blokkoló tételben mondja ki, hogy a terv elavult alapból indult, és melyik
sorszámra mentődik.

## Current state
- `app/src/state/AppState.tsx` `loadPlanIntoDraft`: a betöltött terv `tervId`-je és `verzio`-ja a
  piszkozatban marad (a `terv.json`-ból, amibe a mentéskor a storage írta); az üres terv és a
  `copyPlanIntoDraft` `verzio: 0` (`app/src/domain/planCopy.ts` `planMasolatKent`).
- `app/src/domain/torzsadatBetoltes.ts` `feloldKovetkezoAzonosito`: a lánc következő szabad sorszáma a
  verziómappákból, nem a forrásverzió +1-e.
- `app/src/pages/PreviewPage.tsx`: `foglalas` state (a lefoglalt `tervId`/`verzio`), a
  `veglegesitesDiagnozis(...)` hívás; `app/src/pages/PreviewPage.azonositoFoglalas.test.tsx`.
- `app/src/domain/veglegesitesOr.ts` `veglegesitesDiagnozis`, `CsekklistaTetel` (`soft` = nem blokkoló);
  `app/src/domain/veglegesitesOr.test.ts`.
- `app/src/components/PatientPlanChains.tsx`: „Új verzió” csak a lánc legfrissebb verzióján érhető el, így
  egy gépen, egy piszkozattal az eset ritka; két gépen ez a jellemző eset.

## Approach
- `veglegesitesOr.ts`: új `soft` tétel (`elavult-alapverzio`), ha a piszkozat meglévő láncból indult
  (`tervId` nem üres, `verzio > 0`) és a lefoglalt sorszám nagyobb, mint `verzio + 1`. A diagnózis új
  bemenete a lefoglalt sorszám (`null`, ha nincs foglalás).
- `PreviewPage.tsx`: a `foglalas` értékét adja át; feloldatlan foglalásnál nincs tétel.
- NEM tartozik ide: `DraftMeta`-bővítés, a piszkozat szinkronizálása, kemény blokk, az újabb verzió
  tartalmának összevetése vagy beolvasztása.

## Decisions
- A forrásverzió a piszkozat `plan.verzio`-jából jön, nem új `DraftMeta` mezőből — mert a betöltött terv ezt
  már hordozza és a piszkozattal együtt perzisztál; ez eltér a végleges terv §10.0 `alapVerzio`
  javaslatától, ugyanazt az információt adja.
- `soft` súlyosság, route nélkül — a végleges terv döntése: tudatosít, nem blokkol; nincs szerkesztőoldal,
  ahol javítható lenne.
- Szöveg: „Ez a terv a v{n} verzióból indult, de a láncban azóta v{m} is elkészült. Véglegesítéskor
  v{k}-ként mentődik, a v{m} változásai nincsenek benne.” (m = k − 1)

## Verification
- [ ] tests — domain: v2-ből indult piszkozat, foglalás v4 → `elavult-alapverzio` soft tétel a három
      sorszámmal; foglalás v3 → nincs tétel; üres `tervId` és `verzio: 0` → nincs tétel; `null` foglalás →
      nincs tétel; a tétel mellett a Véglegesítés nem tiltott
- [ ] tests — PreviewPage: v2-ből betöltött piszkozat, a tárolóban a láncnak v3-a is van → a checklistben
      megjelenik a tétel a „v4” mentési sorszámmal
- [ ] typecheck/lint
- [ ] docs-check
