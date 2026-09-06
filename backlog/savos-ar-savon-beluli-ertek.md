# savos-ar-savon-beluli-ertek
Type: bug
Source: 2026-09-05 doctor-review (nagy terv) 2. megállapítás; papirrol (2026-09-05), 3. megállapítás
Target: master
Baseline: 7566ed6dcc2f42865589f5c483f04aaba728d76d

## Goal
Sávos tételnél a sávon belüli ajánlati ár nem kap eltérés-jelvényt, nem nyit „Felár" sort, nem
kerül az előnézeti „Kézzel felülírt ajánlati ár" listára, és a sor Listaár cellája a teljes sávot
mutatja.

## Current state
- `app/src/domain/types.ts` `Ar` (SAVOS: `min`/`max`), `Sor` (`savos`, `listaEgysegar`,
  `tenylegesEgysegar`; additív minta: `leirasSnapshot`, `masikPenznemAr`).
- `app/src/domain/money.ts` `basePrice` (SAVOS → `min`), `formatPrice` (`min–max` alak).
- `app/src/domain/sorMezok.ts` `sorMezokTetelbol` — az egyetlen sor-építő árlistából; a `max` itt vész el.
- `app/src/domain/sorElteres.ts` `sorElteres` — a kedvezmény/felár osztályozás egyetlen helye
  (`pages/planEditor/LineRow.tsx` jelvény, `pages/tervReszletei/SorReszlet.tsx`).
- `app/src/domain/totals.ts` `sorListaOsszeg` → `sorokListaOsszeg` → `computeOsszesitok`
  `kezelesekOsszesen`; hívók: `pages/planEditor/Summary.tsx` („Felár: …"), `app/src/pdf/TervDocument.tsx`
  „Kezelések összege" referenciasor.
- `app/src/domain/arKoveti.ts` `arElteroSorok` `keziAr` → `app/src/domain/veglegesitesOr.ts`
  `ar-elteres` puha tétel „Kézzel felülírt ajánlati ár"; `arFrissitesPatch`, `frissArlistaval` `arGate`.
- `app/src/domain/orokoltJelzesek.ts` `keziAru` — ugyanaz a feltétel a másolat-jelzéshez.
- `app/src/domain/penznemValtas.ts` `sorPenznemValtassal` — a `masikPenznemAr` stash az árpárral.
- `app/src/pages/planEditor/LineRow.tsx` Listaár cellája (egy szám, `whiteSpace: nowrap`) és
  `arEltero` (a ↺ visszaállító gomb).
- `app/src/storage/seed/plans.ts` — a demó tervek sávos sorai.
- Tesztek: `app/src/domain/sorElteres.test.ts`, `totals.test.ts`, `arKoveti.test.ts`,
  `veglegesitesOr.test.ts` „kézzel felülírt ajánlati ár is az »ar-elteres« soft tételt adja",
  `app/src/pages/planEditor/Summary.test.tsx`, `PlanEditorPage.sorok.test.tsx` „+X% jelvényt kap a
  sor", `app/src/pages/PreviewPage.test.tsx` `ar-elteres` teszt, `app/src/pdf/TervDocument.test.tsx`
  „feltételes összegsor", `app/src/pages/tervReszletei/FazisokBlokk.test.tsx` eltérés-jelvény.

## Approach
Változik: `domain/types.ts` (a `Sor` additív sávhatár-mezője, a `masikPenznemAr` slotban is), egy ÚJ
`domain/` modul a „sávon belül" predikátumnak és a sor referencia-listaárának, `domain/sorMezok.ts`,
`domain/arKoveti.ts`, `domain/penznemValtas.ts`, `domain/orokoltJelzesek.ts`, `domain/totals.ts`
(`sorListaOsszeg` a referencia-áron), `domain/sorElteres.ts`, `domain/veglegesitesOr.ts` (a puha
tétel szövege), `pages/planEditor/Summary.tsx`, `pages/planEditor/LineRow.tsx` (Listaár cella),
`storage/seed/plans.ts`.

NEM tartozik ide: csatornaszám-választó a sávos tételen; a felső határ nyomtatványra vitele
(`savos-felso-hatar-nyomtatvanyon`); a felár/kedvezmény nettózása és a nyomtatvány
referenciasorának iránya (`nyomtatvany-osszesites-netto-felar`); `schemaVersion`-emelés; a lezárt
terv read-only sorának (`SorReszlet.tsx`) Listaár-megjelenítése; soronkénti százalék-mező
(`soronkenti-szazalek-kedvezmeny`); az `app/src/pdf/**` fájljai.

## Decisions
- A sáv `min`/`max` felvételkor a sorra kerül, additív, opcionális mezőként — mert mentett terv
  sosem rajzolódik újra az élő árlistából; nem élő lookup, mert egy későbbi árlista-módosítás
  visszamenőleg átírná, mi volt sávon belül. `schemaVersion` marad 1, a `masikPenznemAr` mintáján;
  hiányzó mező = mező előtti sor → mai viselkedés, meglévő tervek/piszkozat nem javul visszamenőleg.
- A sávhatár a `masikPenznemAr` stash slottal együtt mozog — pénznemenként más sáv tartozik hozzá.
- Sávon belüli ajánlati árnál a sor referencia-listaára maga az ajánlati ár, EGY domain
  predikátumban eldöntve, minden fogyasztó ezt hívja (`sorElteres`, `sorListaOsszeg`,
  `arElteroSorok` `keziAr`, `orokoltJelzesek`) — a sikermérce a jelvény, a „Felár" sor és az
  előnézeti felsorolás EGYÜTTES eltűnése; nem megjelenítés-szintű elnyomás, az négy helyen
  ismételné a szabályt.
- A sávon KÍVÜLI ár (`min` alatt/`max` fölött) változatlanul `listaEgysegar`-hoz mérve kap
  jelvényt — nem a `max`-hoz, két referencia két százalékot adna ugyanarra a sorra.
- A `≈` kapcsoló és a sávhatár független: kikapcsolása nem hozza vissza a felár-jelvényt — a
  `savos` a nyomtatvány `*`-áról dönt, nem az árazásról.
- A ↺ visszaállító gomb és a `frissArlistaval` `arGate` marad a nyers
  `tenylegesEgysegar !== listaEgysegar` feltételen — a sávon belüli ár is szándékos kézi érték,
  a másolás nem írhatja felül némán, a visszaállítást meg kell tartani.
- A Mindösszesen alatti „Felár: X" helyett „Eltérés a listaártól: +X"; a kedvezmény-ág szövege és
  a soron lévő `+71%`/`−12%` jelvény alakja változatlan — a „felár" szó félreérthető, a százalék
  semleges.
- Az `ar-elteres` puha tétel kimondja, hogy ez a nyomtatványra nem kerül.

## Verification
- [ ] tests — 38 000–65 000 sávú tételen 65 000 Ft ajánlati árnál: nincs eltérés-jelvény a soron,
      nincs „Eltérés a listaártól" sor a Mindösszesen alatt, a sor nem szerepel a véglegesítési
      checklist „Kézzel felülírt ajánlati ár" felsorolásában, és a nyomtatvány Összesítése egysoros
      marad; 70 000 Ft-nál (sávon kívül) mindhárom jelzés megjelenik; 30 000 Ft-nál
      kedvezmény-jelvény; sávhatár nélküli (régi) soron a mai viselkedés; HUF→EUR→HUF váltás után a
      sáv az aktuális pénznemé; a Listaár cella sávos soron a teljes sávot írja ki.
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a „38 000 Ft–65 000 Ft" a Listaár oszlopban nem törik és nem
      szorítja ki a szomszédos cellákat (`whiteSpace: nowrap`).
