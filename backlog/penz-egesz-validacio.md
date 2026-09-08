# penz-egesz-validacio
Type: chore
Source: agent-first dokumentációs migráció follow-up
Prio: next
Target: master
Baseline: 906bec6c27410bcad9e6807d262483ba71592010

## Goal
Tört pénzérték nem juthat be a lemezről és nem írható lemezre: érthető betöltési/mentési
hibát ad, néma kerekítés nélkül.

## Current state
- `app/src/domain/validate.ts` `isFiniteNumber` (21.) — a pénzmezők guardja véges számot néz,
  nem egészet; `assertAr` (`ertek`/`min`/`max`), `assertPlanShape` (`listaEgysegar`,
  `tenylegesEgysegar`, `osszesitok.*`). A `10.5` ma átmegy —
  `docs/reviews/2026-09-05-tesztelesi-modszertan-review.md` F02 méréssel.
- `app/src/domain/validate.ts` — nincs hozzá tesztfájl, és egyetlen teszt sem importálja.
- `app/src/storage/DemoStorage.ts` — `assertPlanShape` a `loadPlan`-ban (459) és a migrációs
  úton (273); a `doSavePlan` (496) NEM validál. `DemoDraftStorage.ts` (37, 109) betöltéskor
  validál.
- `app/src/domain/types.ts` — a `Plan` pénzmezői: `osszesitok.*` (201-205),
  `elolegOsszeg` (235), `kedvezmenyOsszeg` (247); utóbbi kettő opcionális és ma
  validálatlan. `Sor.masikPenznemAr`/`savHatar` (137-141) szintén validálatlan.
- Kerekítési pontok, ahonnan a pénz ma származik: `app/src/components/NumberField.tsx`
  `commit()` `Math.round`, `app/src/domain/money.ts` `parseEuroInput`,
  `app/src/domain/totals.ts` `elolegSzazalekbol` (`Math.ceil`).
- `data/arlista.seed.json` és `app/src/storage/seed/plans.ts`/`templates.ts` — ellenőrizve,
  nulla tört pénzérték; a szigorítás a saját adatainkat nem töri.
- Hard invariáns: „Pénz egész, a pénznem alapegységében" (`CLAUDE.md`,
  `app/src/domain/money.ts` fejléc).

## Approach
Változik: `app/src/domain/validate.ts` (a pénzmezők guardja egészet követel; a Plan-szintű
`elolegOsszeg`/`kedvezmenyOsszeg` — ha jelen van — bekerül a védett körbe),
`app/src/storage/DemoStorage.ts` (`doSavePlan` validál írás előtt), plusz egy új
`validate.test.ts`.

Nem változik: `domain/money.ts` és a formázás; a `NumberField` és a kerekítési pontok; a
`schemaVersion` és a séma; a UI és a PDF.

Hatókör-határ: NEM kerül branded típus a kódba. Nem szigorodik a `mennyiseg`, az
`ervenyessegNap`, az előjel, az ID-egyediség és az enumok — ezek a hivatkozott review K9
nyitott kérdései, külön tétel. Nem kerül új mező a validátorba a felsoroltakon túl: a
`masikPenznemAr`/`savHatar` munkaállapot, sosem kerül nyomtatványra. A piszkozat-autosave
NEM validál.

## Decisions
- A védett kör „minden pénzérték, ami a nyomtatványra kerülhet" — mert ez ad egyetlen,
  kimondható szabályt; ezért marad ki a `masikPenznemAr`/`savHatar` (a pénznemváltás
  munkaállapota, `PRODUCT.md § Nem cél`) és marad benne az opcionális
  `elolegOsszeg`/`kedvezmenyOsszeg`.
- A `doSavePlan` is validál, a piszkozat-autosave nem — mert a véglegesítés adja ki a
  szerződéses dokumentumot, ott a leállás a helyes kimenet; egy autosave-en dobott hiba
  viszont a doki munkáját veszítené el.
- Hibaüzenet, nem néma kerekítés — mert a hivatkozott review K9 sora ezt írja elő
  („az eredeti megőrzése és érthető betöltési hiba; nincs automatikus kerekítés/átírás").
- A `mennyiseg` guardja változatlan marad — mert a mennyiség értéktartománya K9-ben nyitott
  termékdöntés, és a tört mennyiség elfogadása a pénzkerekítés szabályát is érintené.

## Verification
- [ ] tests — tört pénzérték (`10.5`) a tétel árában, a sor lista-/tényleges egységárában, az
      `osszesitok` bármely mezőjében, illetve az `elolegOsszeg`/`kedvezmenyOsszeg`-ben
      betöltéskor érthető hibával elbukik; a hiányzó opcionális mezők és a nulla érték
      továbbra is érvényesek; a `savePlan` tört pénzt tartalmazó tervnél hibát dob és nem ír
      lemezre; a `mennyiseg` tört értéke változatlanul átmegy
- [ ] typecheck/lint
- [ ] docs-check
