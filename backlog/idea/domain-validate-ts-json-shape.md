# domain-validate-ts-json-shape
Type: chore
Source: review:2026-08-25-arch-react-review#ARCH-001

`domain/validate.ts` alak-/típusguardjainak nagy része tesztelés nélkül fut: a
`validate.test.ts` (2026-09-08, penz-egesz-validacio) csak a tört pénzérték ágakat fedi
`assertPlanShape`-ben és `assertPriceListShape`-ben, de `assertSettingsShape` és
`assertPatientMasterDataShape` egyáltalán nincs tesztelve, és hiányzik minden strukturális eset
is: hiányzó/nem-tömb mező (`kategoriak`, `tetelek`, `orvosok`, `fazisok`, `sorok`), nem-objektum
elem, ismeretlen `ar.tipus`, és az érvényes minimál-alak elfogadása. Ezek a guardok védik a
`schemaVersion` melletti egyetlen futásidejű ellenőrzést egy kézzel piszkált vagy Drive-ütközésben
sérült JSON ellen — egy néma regresszió itt visszahozná a null/string pénzmező NaN-hibáját anélkül,
hogy bármelyik teszt jelezné.
