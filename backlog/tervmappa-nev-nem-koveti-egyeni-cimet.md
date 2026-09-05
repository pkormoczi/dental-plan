# tervmappa-nev-nem-koveti-egyeni-cimet
Type: chore
Source: doctor-review nagy-terv (2026-09-05), 16. megállapítás (Megjegyzés)
Target: master
Baseline: 25739f24aa4787766508835728eb1284f031e2f7

## Goal
Ha a doki egy VADONATÚJ terv-lánc véglegesítése előtt egyéni tervCimet ad meg, a létrejövő
terv-mappa neve ezt a címet tükrözze, ne a domináns kategóriát.

## Current state
- `app/src/pages/PreviewPage.tsx` `doFinalize()` — az `ujLancCim` (a piszkozatban megadott
  egyéni cím) már ki van számolva, de csak a `storage.savePlanLabel()` hívásban (a `terv-cimke.json`
  írásakor) hasznosul; a megelőző `storage.savePlan()` hívás nem kapja meg.
- `app/src/storage/DemoStorage.ts` `doSavePlan()` — új láncnál a `planDir`
  `buildPlanDirName(javasoltTervCim(plan, priceList), tervId)`-ból számol, a kézzel megadott
  címet nem ismeri.
- `app/src/storage/PlanStorage.ts` `savePlan` — a szerződés, amit mindkét jövőbeli implementáció
  (ma: `DemoStorage`) betart; `domain/planChainData.ts` szerint `PreviewPage.tsx` az EGYETLEN hívója.
- `app/src/domain/tervCim.ts` `megjelenitettTervCim()` — a követendő precedencia (kézi cím >
  automatikus javaslat) már létezik, csak a mappanév-javaslat nem ezt hívja.
- Tesztek: `app/src/storage/DemoStorage.test.ts` (savePlan), `app/src/pages/PreviewPage.test.tsx`
  (doFinalize).

## Approach
A `PlanStorage.savePlan` szerződés kap egy opcionális egyéni tervCim bemenetet, amit a
`DemoStorage` KIZÁRÓLAG új lánc létrehozásakor (amikor még nincs `tervId`/`planDir`) használ a
mappanév-javaslatnál, a `javasoltTervCim` elé véve — ugyanaz a precedencia, mint a
`megjelenitettTervCim()`-ben. A `PreviewPage.tsx` `doFinalize()`-ja a már meglévő `ujLancCim`
értéket adja át ebben a hívásban is; a külön `savePlanLabel`-hívás (és annak önálló hibakezelése)
változatlanul megmarad, mert a `terv-cimke.json` mentése a mappanévtől független felelősség.
Nem ide tartozik: már mentett verzió mappanevének utólagos átírása (a mappanév a lánc
létrehozásakor örökre fix marad, `paths.ts` `buildPlanDirName` doc-kommentje).

## Decisions
- Opcionális paraméter a meglévő `savePlan` szerződésen, nem új metódus — egyetlen döntési pontról
  (a mappanév-javaslat) van szó, és így a sok meglévő hívás (tesztek, seed) visszafelé kompatibilis
  marad.
- A `savePlanLabel` külön hívás megmarad — a `terv-cimke.json` írása attól függetlenül is kell,
  hogy a doki adott-e egyéni címet a mentés pillanatában; a mappanév-javaslat és a tárolt címke
  két külön felelősség.

## Verification
- [ ] tests — ha a doki egy ÚJ lánchoz a véglegesítés előtt egyéni tervCimet ad meg, a létrejövő
      `planDir` ezt tükrözi (nem a domináns kategóriát); üresen hagyva a viselkedés változatlan;
      egy meglévő lánc újabb verziójánál a `planDir` nem változik
- [ ] typecheck/lint
- [ ] docs-check
