# darabszamnak-nincs-felso-korlatja-es
Type: feature
Source: review:2026-09-09-doctor-review-elso-megnyitas#4
Target: master
Baseline: 9b6fa3c7b6527cd18aa1b1a171d7b5fabd9bfd41

## Goal
Az előnézeti checklist puha, nem blokkoló tétellel jelzi a 8 fölötti darabszámú sorokat, a sor
nevével és a darabszámmal — a Db mezőbe elgépelt fogszám (36 db → 1 618 000 Ft) nem megy át csendben.

## Current state
- `app/src/domain/veglegesitesOr.ts` `veglegesitesDiagnozis` — 24 ellenőrzés, mennyiség-vizsgálat
  nincs; a követendő minta a `hianyzo-fogszam` puha tétel (`sulyossag: 'soft'`, `szamlalo`,
  `reszletek: [{ cim: 'Érintett sorok', … }]`, `route: '/terv'`).
- `app/src/domain/mennyiseg.ts` — a darabszám-fogalom mai otthona (`kovetettMennyiseg`,
  `sorPatchKovetessel`, `Sor.mennyisegKezi`).
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx` — a `/terv` gomb felirata „Vissza a
  szerkesztőbe" (`ROUTE_GOMB_FELIRAT`); a review „Kezelések" szava a `workflowLepesek.ts`
  lépés-címkéje, ugyanaz a route. A renderelés nem változik.
- `app/src/pages/planEditor/LineRow.tsx` — a Db `NumberField` (`min={1}`,
  `aria-label="Darabszám"`); DOM-szintű `max` nincs. A soron belüli „N fog van felsorolva, a
  darabszám M" jelzés csak érvényes FDI `fogak` mellett fut — a megfigyelt esetben néma.
- Sorrend-őrző tesztek: `app/src/domain/veglegesitesOr.test.ts` „a »sablon-kihagyott-szekcio« és a
  »sablon-fallback« a puha csoport élén áll…" és „a soron hiányzó tartalom egy blokkban áll: a
  fogszám a 0 összegű sor ELŐTT".

## Approach
Új küszöb-konstans + sorlistázó helper a `app/src/domain/mennyiseg.ts`-ben, és egy új puha tétel a
`veglegesitesDiagnozis`-ban, közvetlenül a `hianyzo-fogszam` UTÁN. Tesztek:
`app/src/domain/mennyiseg.test.ts`, `app/src/domain/veglegesitesOr.test.ts`.

NEM tartozik ide: kemény felső korlát vagy blokkolás; `max` prop a `NumberField`-en; a `LineRow`
soron belüli figyelmeztetésének bővítése; a `PreviewPage`/`VeglegesitesChecklist` renderelése; a
fogtérkép, a nyomtatvány, a séma.

## Decisions
- Fix küszöb, 8 fölött — mert a review sikermércéje szó szerint ez; nem FDI-alakú (11–48)
  felismerés, mert az a 136-ot és a fogszámmal ellátott soron elgépelt 36-ot átengedné.
- A helper a `domain/mennyiseg.ts`-be kerül, nem a `kitoltetlen.ts`-be — mert a darabszám-fogalom
  ott lakik (`sorPatchKovetessel`), és a magas darabszám nem „kitöltetlenség".
- A fogakat KÖVETŐ sor (`mennyisegKezi === false`) kimarad — mert ott a darabszám a felsorolt
  fogakból származik, nem gépelésből; `undefined`-nál jelez (a régi sor nem igazolt követő).
- Csak megnevezett sor (`nevSnapshot`) — mert a névtelent a `kitoltetlen-sor` kemény tétele fedi,
  és a felsorolás névvel hasznos.
- A felsorolás a darabszámot is mutatja (pl. „Gyökértömés — 36 db") — mert a puszta névből a doki
  nem látja, elgépelés-e; a `nyelvi-review` címke-dekorálás precedense.
- A `hianyzo-fogszam` UTÁN áll — mert az elgépelt fogszám ugyanarra a sorra mindkét tételt
  kiváltja, egymás mellett diagnosztikus; a két meglévő sorrend-teszt így zöld marad.
- Nincs tétel-szintű kivétel (`fogszamNemKell`, röntgen/konzultáció) — mert a jelzés puha, és egy
  legitim 10 db elolvasása olcsóbb, mint egy adminmunkát igénylő kivétel-lista.

## Verification
- [ ] tests — 8 db-os soron nincs tétel; 9 db-oson puha, nem blokkoló tétel áll elő a sor nevével
      és darabszámával, „Vissza a szerkesztőbe" gombbal; a fogakat követő sor magas darabszámmal
      sem ad tételt; több soron a számláló és a felsorolás terv sorrendben gyűlik; a véglegesítés
      nem blokkolt
- [ ] typecheck/lint
- [ ] docs-check
