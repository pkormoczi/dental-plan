# pdf-szuletesi-datum-formatum
Type: bug
Source: doctor-review papirrol (2026-09-05), 18. megállapítás
Target: master
Baseline: 746e8d70e11146e1f5e2ccaf3b9a198a4f40d22d

## Goal
A nyomtatvány páciensblokkjában a születési dátum a terv nyelvének megfelelő rövid alakban áll
(magyar terven `1992.12.01.`, német terven `01.12.1992`), nem nyers ISO-alakban
(`1992-12-01`) — így a papíron nem keveredik két dátumnyelv a keltezés mellett.

## Current state
`app/src/pdf/TervDocument.tsx` a `<Kv k={L.kvSzuletett} v={plan.paciens.szuletesiIdo} />` sorban a
nyers ISO-stringet adja át; a `Kv` (`app/src/pdf/tervDocument/Chrome.tsx`) üres értéknél `null`-t
ad vissza, tehát a hiányzó dátum ma sem jelenik meg. A nyomtatvány minden más dátuma már a domain
formázóit használja `plan.nyelv`-vel (`formatLongDate` az érvényességi mondathoz és az
aláírás-sorhoz ugyanebben a fájlban, `formatShortDate` a fejlécben/láblécben,
`app/src/pdf/tervDocument/Chrome.tsx`). Az appban ugyanez a mező már formázva jelenik meg
(`app/src/components/PatientDetailHeader.tsx`, `app/src/pages/TervReszleteiPage.tsx`), a bevitelt
a `szuletesiIdoHiba` (`app/src/domain/paciensValidacio.ts`) validálja. Meglévő teszt:
`app/src/pdf/TervDocument.test.tsx` a páciensblokk mezősorrendjére (`Név` / `Született` / `TAJ`),
`1990-01-01` születési dátummal.

## Approach
A `TervDocument.tsx` páciensblokkjában a születési dátum `formatShortDate`-tel formázva kerüljön a
`Kv`-be, az üres érték továbbra is üresen maradjon (a `Kv` `null`-ága). Egyetlen hívási hely
változik; nem tartozik ide a többi páciensmező, a fejléc/lábléc dátumai, a `formatShortDate` maga,
és az appon belüli dátummezők kijelzése (`datummezo-formatum-inkonzisztens`).

## Decisions
- A nyelv a `plan.nyelv`, nem fix `hu` — mert a nyomtatvány minden dátuma a terv nyelvét követi
  (`pdf/CLAUDE.md`); nem a `PatientDetailHeader.tsx` fix `'hu'`-ja, mert az appon belüli,
  doki felé szóló szöveg, nem a nyomtatvány.

## Verification
- [ ] tests — a nyomtatvány páciensblokkjában a születési dátum magyar terven `1992.12.01.`
      alakban jelenik meg, német terven `01.12.1992`; üres születési dátumnál a sor továbbra
      sem jelenik meg
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf
