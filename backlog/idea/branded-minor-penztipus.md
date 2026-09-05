# branded-minor-penztipus
Type: chore
Source: agent-first dokumentációs migráció follow-up

Branded `Minor` pénztípus az `app/src/domain/money.ts`-ben, a `Sor`/`Plan` pénzmezőire
kiterjesztve, plusz invariáns-teszt: nem egész érték nem kerülhet `tenylegesEgysegar`-ba. A
„pénz egész, a pénznem alapegységében” hard invariánst típus-szinten kényszeríti ki a mai
konvenció helyett.
