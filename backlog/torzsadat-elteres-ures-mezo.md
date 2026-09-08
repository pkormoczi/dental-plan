# torzsadat-elteres-ures-mezo
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 5. megállapítás
Target: master
Baseline: 9b45e832aad38bb34d35ac33149c028d0bd450aa

## Goal
A csak névvel felvett páciensnél a tervbe írt telefonszám egy, a hatását kimondó gombbal
felkerül a páciens adatlapjára; az „eltérés" szó és a hozzá tartozó számok csak valódi
ütközést jelentenek, üres mező pótlását soha.

## Current state
- `app/src/domain/masterSnapshotDiff.ts` — `masterSnapshotDiff` az „üres az egyik oldalon,
  kitöltött a másikon" esetet IS eltérésnek számolja (`ertekEgyezik` csak `null`⇄`''`-t
  normalizál; teszt: `masterSnapshotDiff.test.ts` „üres és kitöltött érték IGEN eltérés"). A
  szűkítő `valodiUtkozesek` (mindkét oldal kitöltött) MÁR LÉTEZIK, de ma egyetlen helyen fut.
- `app/src/pages/patientPage/TorzsadatSyncCard.tsx` — `:102`/`:196` a lépés-elhagyási prompt
  kapuja (`valodiUtkozesek`); `:273` a „{n} mező eltér a páciens törzsadatától" sáv és
  `:280-290` a két, azonos súlyú `size="1" variant="soft"` gomb — mindkettő a TELJES diffet
  kapja. Írási utak: `:116` `writeMaster`, `:126` `createMasterFromDraft`.
- `app/src/components/TorzsadatDiffDialog.tsx` — a kapott `elteresek` tömböt rajzolja
  (checkbox-tábla, „Törzsadat"/„Terv adata" oszlop); nem ő dönti el, mi az eltérés.
- `app/src/domain/veglegesitesOr.ts:442-448` — a `torzsadat-elteres` info tétel a teljes
  `masterSnapshotDiff`-en; ezt jeleníti meg a `PreviewPage` info-sávja is.
- `app/src/pages/TervReszleteiPage.tsx:302-304, 553-556` — „N mező azóta módosult" jelvény,
  szintén a teljes diffen.
- A zaj forrása: `app/src/storage/DemoStorage.ts:702-716` `createPatient` a
  `nev`/`szuletesiIdo`/`telefon`-t tölti (az `UjPaciensDialog` ennyit kér), a maradék öt mező
  üres — így a Terv adatai lapon kitöltve azonnal „eltérésnek" látszanak.
- `app/src/storage/PlanStorage.ts:75` `savePatientData` az egyetlen írási határ a
  `paciens-adatok.json`-höz.
- Sztringre/darabszámra épülő tesztek: `app/src/pages/PatientPage.test.tsx:505-698`,
  `app/src/components/TorzsadatDiffDialog.test.tsx`,
  `app/src/components/TervWorkflowShell.test.tsx:273+`,
  `app/src/pages/PreviewPage.test.tsx:1373+`, `app/src/domain/masterSnapshotDiff.test.ts`.

## Approach
1. `masterSnapshotDiff.ts` kap egy pótlás-fogalmat a meglévő `valodiUtkozesek` párjaként (a
   diff azon része, ahol az egyik oldal üres) — új összevetési szabály nélkül, a meglévő
   `mezoErtekSzoveg` ürességi próbájára építve.
2. Mind a négy doki-látta felület a `valodiUtkozesek`-re áll: a `TorzsadatSyncCard` „N mező
   eltér" sávja és a belőle nyíló két-gombos dialógus, a `veglegesitesOr` `torzsadat-elteres`
   tétele, a `TervReszleteiPage` jelvénye.
3. A `TorzsadatSyncCard` külön sávot kap a pótlásoknak: hány mező hiányzik, és EGY elsődleges
   gomb, ami dialógus nélkül, egy lépésben elvégzi a pótlást (amelyik oldal üres, a másikról
   veszi). Írási hibánál a kártya mai hibakezelése (Callout + újrapróbálás) érvényes.

NEM tartozik ide: kétirányú automatikus szinkron; néma írás (a doki gombot nyom); a
`TorzsadatDiffDialog` két-gombos szimmetriája valódi ütközésnél; a doki-látta szóhasználat
(`torzsadat-letrehozas-dialogus-szovege`, ami ELŐBB megy); a `veglegesitesOr`
`hianyzo-paciensadat` tétele; az `UjPaciensDialog` mezőköre; a `createPatient` üres mezői.

## Decisions
- A pótlás gombbal történik, nem magától — mert a `docs/PRODUCT.md § Szándékos hiányok`
  „nincs automatikus szinkron … egyik irányban sem" szándéka így érintetlen marad; nem néma
  írás, mert a doki nem látná, mikor módosult a karton.
- Mind a négy felület a `valodiUtkozesek`-re áll — doki döntés; ez FELÜLÍRJA a
  `valodiUtkozesek` mai doc-kommentjében rögzített korábbi döntést („a kártya és az Előnézet
  info-sora ellenben a TELJES diffet mutatja"), a kommentet is javítani kell.
- A pótlás dialógus nélkül, egy gombbal, minden pótlandó mezőre egyszerre — doki döntés; nincs
  mit mérlegelni, tehát nincs checkbox-tábla; ára, hogy egy mező nem hagyható ki.
- A pótlás mindkét irányba működik (amelyik oldal üres, a másikról veszi) — mert az egyirányú
  változat a fordított esetet (adatlap kitöltött, terv üres) némán kiejtené mind a négy
  jelzésből, új út nélkül.
- A `kiskoru` sosem pótlás, mindig ütközés — mert `mezoErtekSzoveg` rá `Igen`/`Nem`-et ad, üres
  stringet soha; ez a meglévő helper viselkedéséből következik, nem új szabály.
- Ez a tétel a `torzsadat-letrehozas-dialogus-szovege` UTÁN megy — doki döntés: az minden
  doki-látta „törzsadat" sztringet átír ugyanebben a két fájlban, a tesztjeikkel együtt.

## Verification
- [ ] tests — csak névvel felvett páciensnél a Terv adatai lapon kitöltött telefonszám NEM
      számít eltérésnek egyetlen felületen sem (kártya-sáv, véglegesítési checklist, Terv
      részletei jelvény), hanem külön, pótlásként jelenik meg; az elsődleges gomb egy
      kattintással minden pótlandó mezőt a `paciens-adatok.json`-be ír, és utána a Kezdőlap
      „Legutóbbi páciensek" sora mutatja a telefonszámot; valódi ütközésnél (mindkét oldal
      kitöltött, de eltér) a mai két-gombos dialógus változatlanul jön; vegyes esetben a két
      sáv egyszerre látszik és egymástól függetlenül működik; írási hibánál a pótlás-gomb
      újrapróbálható és nem navigál
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — új sáv és új elsődleges gomb a kártyán (kontraszt,
      `controlBorder`)
