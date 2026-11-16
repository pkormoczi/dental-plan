# product-adatvedelmi-szoveg
Type: chore
Source: desktop-app-migration-plan-final.md §10.0, doki döntés 2026-11-16
Target: master
Baseline: ea1e320ab0bca3af17f8639e25ba99cec54f5578

## Goal
A PRODUCT.md és a root CLAUDE.md adatkezelési állítása igaz lesz a Drive-szinkronnal együtt: az app nem
továbbít páciensadatot, a felhőszinkront a rendelő Drive-kliense végzi.

## Current state
- `docs/PRODUCT.md` „Adat- és deployment-korlátok”: „Páciens- és kezelési adat sosem hagyja el a helyi
  gépet.”; „append-only írás mellett nem keletkezik `conflicted copy`”; „negyedévente külső másolat”.
  „Szándékos hiányok”: „A `terv.json` PDF-be ágyazása a 2. fázis része” — a végleges terv szerint már
  az első asztali kiadáson kívül esik.
- `CLAUDE.md` Hard invariants első sora: „Páciens- és kezelési adat nem hagyja el a gépet: nincs backend, …”
  → product:#adat-es-deployment-korlatok.
- A `docs/PRODUCT.md` a 6000 karakteres budget határán van (`scripts/docs-check.mjs` `BUDGETS`).

## Approach
- PRODUCT.md második pont, a doki által elfogadott szöveggel: „Az alkalmazás nem továbbít páciensadatot:
  nincs backend, adatbázis, telemetria, analytics, remote logging, külső AI/API hívás. A rendelő által
  beállított Drive-kliens végzi a felhőszinkront (My Drive, Tükrözés mód, Google Workspace DPA).” A gépi
  őr-mondat (CSP + oxlint, nem lazíthatók) marad.
- Harmadik pont: a `conflicted copy`-állítás helyett a gépváltási szabály egy mondatban (app bezárása, a
  Drive feltöltése kész, a másik gépen a letöltés kész, app megnyitása); My Drive alatti mappa, nem
  Shared Drive.
- Negyedik pont: „negyedévente” helyett „havonta” külső másolat.
- „Szándékos hiányok”: a `terv.json`-beágyazás sora az első asztali kiadáson kívülre kerül.
- Root `CLAUDE.md` Hard invariants első sora: „Az app nem továbbít páciens- és kezelési adatot: …”, az
  anchor marad.
- NEM tartozik ide: az `app/vite.config.ts` CSP-kommentje és az `.oxlintrc.json` üzenetei (az app hálózati
  hívásairól szólnak, ma is igazak); bármilyen kód.

## Decisions
- A root CLAUDE.md invariáns-sora a PRODUCT.md-vel együtt változik — mert ugyanazt az invariánst mondják,
  szétcsúszva az agent hamis szabályt kapna; a tartalom (nincs backend/telemetria/külső API, CSP + oxlint
  őr) nem változik.
- A budgetet tömörítés tartja, nem budget-emelés — mert a docs-check budget szándékos.

## Verification
- [ ] docs-check zöld (budget, anchorok)
- [ ] a PRODUCT.md-ben nem marad „sosem hagyja el a helyi gépet” és „nem keletkezik `conflicted copy`”
      állítás; a CLAUDE.md invariáns-sora a PRODUCT.md-vel azonos értelmű
