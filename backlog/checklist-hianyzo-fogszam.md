# checklist-hianyzo-fogszam
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 3. megállapítás
Target: master
Baseline: f259e4f4b80c6b68e0ee2113cb01e4bae9d8a051

## Goal
A doki az előnézeten látja, hány soron maradt el a fogszám, melyeken, és egy gombbal a
Kezelésekhez ugrik — a fogszám nélküli korona nem megy át némán a véglegesítésen.

## Current state
- `app/src/domain/veglegesitesOr.ts` `veglegesitesDiagnozis` — a puha tételek helye; ma nincs
  fogszám-feltétel. A `nulla-osszegu-sor` tétel a követendő minta (számláló, `reszletek`,
  `route: '/terv'`).
- `app/src/domain/kitoltetlen.ts` — a soron hiányzó tartalom helperei (`nullaOsszeguSorok`,
  `araztalanSorok`); `hianyzoCsomagLeirasok` a `Tetel`-jelölő olvasásának mintája.
- `app/src/domain/types.ts` `Tetel.csomag` — az additív, adminban pipálható jelölő precedense;
  `Sor.fogak` szabad szöveg.
- `app/src/pages/priceListAdmin/ItemEditor.tsx` — a „Csomagtétel” checkbox, ide kerül a párja.
- `data/arlista.seed.json` (118 tétel); a seed csak üres tárolónál alkalmazódik
  (`app/src/storage/seed/priceList.ts`).
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx` — generikus renderer, nem változik.

## Approach
Új, magyar kulcsnevű additív `Tetel`-jelölő („fogszám nélkül is rendben”), `schemaVersion` nem
emelkedik; checkbox az `ItemEditor.tsx`-ben a `Csomagtétel` pipa mellé; új helper a
`kitoltetlen.ts`-ben; új `soft` tétel a `veglegesitesOr.ts`-ben, közvetlenül a `nulla-osszegu-sor`
előtt; a seedben hat tétel előre bejelölve: `t001` konzultáció, `t002` panoráma/TeleRtg/arcüreg,
`t003` CBCT, `t017`–`t018` fogkő, `t019` fogfehérítés komplett fogsor.

NEM tartozik ide: kemény blokk (a `Fog` jegyzetmezővé válása elfogadott — PRODUCT.md Nem cél); a
`t020` (fogfehérítés, 1 db fog) jelölése — ott a fogszám releváns; a meglévő checklist-tételek
szövegezése (`checklist-figyelmeztetes-szovege`); a fogtérkép-ikon felfedezhetősége (a jelentés
12. megállapítása); admin-szűrő vagy tömeges jelölés az új mezőre; a már szerkesztett árlista
visszamenőleges megjelölése.

## Decisions
- A kizárás per-tétel jelölő, nem kategória-szintű — mert a Fogfehérítés kategórián belül a
  „komplett fogsor” és az „1 db fog” ellentétesen viselkedik; a kategória-flag ott hamis lenne.
- Hiányzó jelölő = fogszám kell (jelez) — mert a mező additív, a doki már szerkesztett árlistáján
  mindenhonnan hiányzik, és opt-in mellett a bejelentett hiba tovább élne; a némítás egy pipa.
- Egyedi (`tetelId` nélküli) sor is bekerül — mert épp a szabadon gépelt sorból marad ki a fogszám;
  a jelzés puha, a nem némítható súrlódás elhanyagolható.
- „Van fogszám” = a `fogak` trim után nem üres, nem `parseTeeth`-érvényesség — mert a mező
  elfogadottan jegyzetmező (PRODUCT.md Nem cél), egy „felső front” jegyzet nem hiány.
- A helper a `kitoltetlen.ts`-be kerül a `nullaOsszeguSorok` mellé — az a soron hiányzó tartalom
  gyűjtőhelye.
- A tétel a `nulla-osszegu-sor` elé kerül — a soron hiányzó tartalom (fogszám → 0 összeg → leírás)
  egy blokkban olvasható.

## Verification
- [ ] tests — jelöletlen tételre hivatkozó, fogszám nélküli sor puha checklist-tételt ad
      számlálóval, a sorok felsorolásával és `/terv` route-tal; a jelölt tételre hivatkozó sor NEM
      ad; egyedi sor fogszám nélkül ad; szabadszöveges `fogak` jegyzet NEM ad; a véglegesítés az új
      tételtől nem blokkolódik; az adminban a pipa átbillentése menti a jelölőt; a seed hat tétele
      jelölt, a `t020` nem
- [ ] typecheck/lint
- [ ] docs-check
