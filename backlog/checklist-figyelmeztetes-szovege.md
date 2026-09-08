# checklist-figyelmeztetes-szovege
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 10. megállapítás; doctor-review nagy-terv (2026-09-05), 8. megállapítás
Target: master
Baseline: d1da6a3253f12745a8cb1c3d103a5ccdb6d85b51

## Goal
A négy sablon-/páciensadat-checklisttétel megnevezi, MI hiányzik és HOL pótolható, a lista
fölött pedig egy sor kimondja, melyik szín blokkolja a véglegesítést.

## Current state
`app/src/domain/veglegesitesOr.ts` `veglegesitesDiagnozis` — a négy érintett tétel `cim`-e:
`sablon-kihagyott-szekcio` (statikus cím + `szamlalo` + `reszletek: [{ cim: 'Kimaradó
szakaszok', nevek: sablon.kihagyottSzekciok }]`), `sablon-fallback`, `nyilatkozat-placeholder`,
`hianyzo-paciensadat` (az `otherFieldsMissing` boolean eldobja, MELY mező hiányzik).
`app/src/pages/previewPage/VeglegesitesChecklist.tsx` `SULYOSSAG_SZIN` (hard→red, soft→amber,
info→gray) — a listának nincs magyarázó sora; a `csak-olvasó` mód (`onNavigate` nélkül,
sikerképernyő) a `PreviewPage.tsx`-ből jön.
`app/src/domain/masterSnapshotDiff.ts` `MASTER_DIFF_MEZOK` — kész kulcs→címke lista, a
`torzsadat-elteres` már ebből sorolja fel az érintett mezőket.
`app/src/pages/PreviewPage.tsx` `kihagyottSablonSzekciok` — a szakasznevek forrása
(`Fizetési feltételek`, `Garancia`).
Szöveget rögzítő tesztek: `app/src/domain/veglegesitesOr.test.ts`,
`app/src/pages/PreviewPage.test.tsx`, `app/src/pages/previewPage/VeglegesitesChecklist.test.tsx`.

## Approach
`veglegesitesOr.ts`: a négy tétel `cim`-je íródik újra; a `sablon-kihagyott-szekcio` elveszti a
`reszletek`-blokkját és a `szamlalo`-ját, a `hianyzo-paciensadat` a `MASTER_DIFF_MEZOK`
címkéiből sorolja fel a ténylegesen üres mezőket. Új tétel, új súlyosság, új `route` nincs.
`VeglegesitesChecklist.tsx`: a lista fölé egy magyarázó sor, CSAK interaktív módban
(`onNavigate` megadva) — a sikerképernyőn a terv már véglegesítve van, ott a „nem
véglegesíthető” mondat hamis lenne.

Nem tartozik ide: a súlyosság-besorolás, a `vanKemenyBlokk` blokkolás, a placeholder-zár és a
„Csak ajánlat” kényszerítés (mind változatlan); a többi 20 tétel szövege; a gombfeliratok; az
amber Callout kontrasztja (`checklist-callout-szoveg-kontraszt`); a garancia-szöveg tényleges
kitöltése (`arlista-nap`, doki-teendő).

## Decisions
- A szín-magyarázat egy sor a lista fölött — mert egy helyen áll, nem duzzasztja mind a 24
  tételszöveget, és a szürke `info` súlyt is lefedi; nem tételenkénti záradék, mert 24-szer
  ismételne ugyanannyi információt.
- A magyarázó sor csak `onNavigate` mellett jelenik meg — mert a sikerképernyőn a terv már
  véglegesítve van, ott a blokkolásról szóló mondat félrevezet.
- `sablon-kihagyott-szekcio`: nevek a címben, `reszletek` és `szamlalo` törölve — mert legfeljebb
  két szakasz van, a külön részletsor és a jelvény ugyanazt mondaná el harmadszor; a
  `torzsadat-elteres` ugyanígy inline sorol fel.
- `hianyzo-paciensadat`: a meglévő `MASTER_DIFF_MEZOK` címkéi, nem új címke-map — mert a
  `torzsadat-elteres` már ezeket a szavakat mutatja ugyanezekre a mezőkre, két lista elcsúszna.
- A „vagy még jogi lektorálásra vár” tagmondat kikerül mind a háromból — mert a dokinak a
  teendője ugyanaz (töltse ki a Beállításokban); a placeholder és az üres szöveg fejlesztői
  megkülönböztetése nem az ő döntése.

## Verification
- [ ] tests — a `sablon-kihagyott-szekcio` egy kimaradó szakasznál a szakasz nevét egyes számban,
      kettőnél mindkettőt többes számban mondja ki, és nincs többé „Kimaradó szakaszok” részletsor
      és jelvény; a `hianyzo-paciensadat` pontosan a ténylegesen üres mezőket sorolja fel (a
      kitöltötteket nem); a `sablon-fallback` és a `nyilatkozat-placeholder` címe kimondja a
      pótlás helyét; a magyarázó sor az előnézeten látszik, a sikerképernyőn nem
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a hosszabb címek tördelése a kéthasábos előnézetben és
      az új magyarázó sor

## Rögzített szövegek
- `sablon-kihagyott-szekcio`, egy szakasz:
  „A Garancia szövege nincs kitöltve — a címével együtt kimarad a nyomtatványból. Pótlás:
  Beállítások → Nyomtatvány szövegei.”
- `sablon-kihagyott-szekcio`, két szakasz:
  „A Fizetési feltételek és a Garancia szövege nincs kitöltve — a címükkel együtt kimaradnak a
  nyomtatványból. Pótlás: Beállítások → Nyomtatvány szövegei.”
- `sablon-fallback`:
  „A nyomtatvány szövegei nincsenek kitöltve a terv nyelvén — helyettük a magyar szöveg kerül a
  nyomtatványra. Pótlás: Beállítások → Nyomtatvány szövegei.”
- `nyilatkozat-placeholder`:
  „A Nyilatkozat szövege nincs kitöltve ezen a nyelven — aláírás-oldal nélkül, „Csak ajánlat”
  módban készül a nyomtatvány. Pótlás: Beállítások → Nyomtatvány szövegei.”
- `hianyzo-paciensadat`:
  „Nem kötelező, de a nyomtatványon üresen marad: Született, Telefon, TAJ.” (csak a ténylegesen
  üres mezők nevei kerülnek bele, ez a példa mind az ötöt üresnek feltételezi)
- Magyarázó sor a lista fölött:
  „Piros: amíg fennáll, a terv nem véglegesíthető. Sárga és szürke: csak jelzés, a véglegesítés
  mehet.”
