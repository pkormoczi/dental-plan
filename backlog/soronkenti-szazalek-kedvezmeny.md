# soronkenti-szazalek-kedvezmeny
Type: feature
Source: doctor-review papirrol (2026-09-05), 4. megállapítás
Target: master
Baseline: c08e1a21d8670c47c94cb12246cc75d28d036c5a

## Goal
A doki a sor Ajánlati ár mezőjébe „-10%" (vagy „+10%") alakot írhat be, a mező a kiszámolt árat
menti, a meglévő kedvezmény-/felár-jelvény pedig visszaigazolja a százalékot.

## Current state
- `app/src/components/NumberField.tsx` `parseDraft` (81-87. sor) — csak számot parseol, a „%"
  végű szöveg `NaN`-re fut, ami a meglévő „Érvénytelen érték — az előző maradt" visszaállást
  váltja ki (`commit()`, 119-137.). `onCommit` egész, kerekített (`Math.round`, 133.) számot ad
  át, a hívó nem lát nyers szöveget.
- `app/src/pages/planEditor/LineRow.tsx:379-405` — az Ajánlati ár `NumberField`, `onCommit`
  ma `onPatch({ tenylegesEgysegar: v })`-t hív (egyedi sornál `listaEgysegar`-t is, 385-391.).
- `app/src/domain/savHatar.ts` `sorReferenciaAr` (34. sor) — a százalék alapja: sávos soron a
  sávon belüli ajánlati ár, egyébként `listaEgysegar`. Ugyanez az alap, amiből a meglévő
  kedvezmény-/felár-jelvény számol (`app/src/domain/sorElteres.ts` `sorElteres`, 58-88.) — így a
  „-10%" beírása pontosan „-10%" jelvényt ad, nem halmozódik újra a jelvény alapjából.
- `app/src/domain/sorElteres.ts` `szazalekCimke` (39-45.) — a jelvény egész %-ra kerekít, tiltott
  értékeknél (0%, 100% kedvezménynél) 1 tizedesre vagy szó-alakra esik vissza; a % bevitel
  kerekítése ugyanezt az elvet követi (végeredmény = egész Ft/cent).
- Meglévő minta ugyanerre a „% csak beviteli segéd, sosem tárolt mező" elvre:
  `app/src/pages/planEditor/ElolegBlokk.tsx` (117-171.) — Ft/% `ChipGroup` váltó, a
  `NumberField penz={false}` mezőbe írt % `elolegSzazalekbol()`-lal (`domain/totals.ts:140-144`)
  alakul abszolút összeggé, a `Plan`-re csak az utóbbi kerül. `app/src/domain/types.ts:221-235`
  doc commentje explicit kimondja: a régi `elolegSzazalek` mezőt emiatt vezették ki, nincs rá
  visszaút.
- Nincs generikus százalék-parser a repóban (`NumberField.parseDraft` sem ismeri); a
  `TomegesArDialog.tsx` egy KÜLÖN, `penz={false}` mezőben kér %-ot, irány-választóval, nem
  előjeles alakban — más minta, nem másolható 1:1.
- Money-kerekítés: `app/src/components/NumberField.tsx:133` `Math.round(parsed)` — a pénz mindig
  egész (`app/src/domain/money.ts` fejléc, 3-4. sor); EUR-on ez centben értendő.
- Nem érinti: `Sor` séma (nincs új mező, nincs `schemaVersion`-emelés — a százalék sosem
  tárolódik, csak a belőle számolt `tenylegesEgysegar`), a nyomtatvány (`PhaseTable.tsx` ma is
  csak `tenylegesEgysegar`-t nyomtat, jelvény/százalék nélkül — ez változatlan marad, a meglévő
  `TervDocument.test.tsx` „SOHA nem jelenik meg a nyomtatványon" tesztjei őrzik).

## Approach
A `%`-alak értelmezése a sor referencia-árához KÖTÖTT (a `NumberField` önmagában nem ismeri azt),
ezért az értelmezés a `LineRow` Ajánlati ár mezőjéhez szűkül, nem a `NumberField` általános
viselkedése — a Db, az Egyedi végösszeg, az Előleg % és a Tömeges ár mező mind érintetlen marad,
azok NEM kapnak `%`-alak-felismerést.

`-10%`/`+10%`/`10%` (= kedvezmény) alak felismerése és a `sorReferenciaAr(line)`-hoz képesti
átváltás abszolút, egész (kerekített) árra; a mentés utáni mező a kiszámolt árat mutatja, a
meglévő `sorElteres`/jelvény változatlan logikával igazolja vissza. Érvénytelen/tartományon kívüli
% (pl. „150%" kedvezmény, ami negatív árat adna) a `NumberField` meglévő `min={0}` határán és
„Érvénytelen érték" visszaállásán akad el — nincs új hibaüzenet.

Nem tartozik ide: a `NumberField` globális bővítése; új `Sor`-mező vagy `schemaVersion`-emelés;
a nyomtatvány vagy a Mindösszesen blokk (`Kedvezmény`/`Eltérés a listaártól` sorok) — azok már
készen vannak; a Db/Egyedi végösszeg/Előleg/Tömeges ár mezők; terv-szintű (nem soronkénti)
százalékos kedvezmény.

## Decisions
- A bevitel az Ajánlati ár mezőben, nem külön „%" gomb vagy oszlop — mert a sor cellája már
  zsúfolt (mező + ⟳ + ≈), és a doki Excel-mintája is a csökkentett árat írta ugyanabba a mezőbe;
  nem külön oszlop, mert az a `Sor`-on új tárolt mezőt és 8. táblaoszlopot kérne.
- Az alap `sorReferenciaAr` (sávos soron a sávon belüli ár), nem a nyers `listaEgysegar` — mert
  ez ugyanaz az alap, amiből a meglévő jelvény számol; így a beírt „-10%" és a visszaigazoló
  jelvény sosem térhet el, és a sávos tétel doki által már beállított sávon belüli ára nem vész
  el egy váratlan újraszámolással.
- `-10%` kedvezmény, `+10%` felár, csupasz `10%` = kedvezmény — mert ez a papír nyelve
  („koronára 10% kedv."), a leggyakoribb eset (kedvezmény) mínuszjel nélkül gépelhető; a
  tévedés azonnal látszik commit után (a mező a kiszámolt árat mutatja, mellette a jelvény).
- Egészre kerekít (`Math.round`) — a `NumberField` ma is ezt teszi minden committált értékre,
  nincs új kerekítési szabály.
- Nincs új `Sor`-mező, a százalék nem tárolódik — az `ElolegBlokk` bevált mintáját követi: a %
  csak beviteli segéd, a `Plan`-re a belőle számolt abszolút `tenylegesEgysegar` kerül.

## Verification
- [ ] tests — az Ajánlati ár mezőbe „-10%"-ot írva és Entert/blurt küldve a mező a
      `sorReferenciaAr` 90%-ára kerekített egész árat menti, és a meglévő „-10%" jelvény
      megjelenik; „+10%" a referenciaár 110%-ára kerekít; csupasz „10%" ugyanaz, mint „-10%";
      sávos soron a sávon belüli ár az alap, nem a nyers listaár; „150%" (negatív árat adna) az
      előző értékre áll vissza, „Érvénytelen érték" jelzéssel; a Db/Egyedi végösszeg/Előleg/
      Tömeges ár mezők `%`-viselkedése változatlan; a PDF-en és a Mindösszesen blokkban semmi
      nem változik (a meglévő tesztek zöldek maradnak).
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
