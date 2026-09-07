# savos-ar-savon-beluli-ertek
Type: bug
Source: 2026-09-05 doctor-review (nagy terv) 2.; papirrol (2026-09-05), 3. megállapítás
Target: master
Baseline: 4f145f3dc1e23f94ec7b40a28ef06f58fe0b8b1c

## Goal
Sávos tételnél a sávon belüli ajánlati ár sehol nem kap eltérés-jelvényt (szerkesztő, Terv
részletei), nem nyit „Eltérés a listaártól" sort a Mindösszesen alatt, nem kerül a „Kézzel
felülírt ajánlati ár" checklistre; a szerkesztő Listaár cellája a teljes sávot mutatja.

## Current state
- `domain/types.ts` `Ar` (SAVOS `min`/`max`), `Sor` (`savos`, `listaEgysegar`,
  `tenylegesEgysegar`, `masikPenznemAr`) — nincs sávhatár-mező; `domain/sorMezok.ts`
  `sorMezokTetelbol` — a `max` itt vész el.
- `domain/sorElteres.ts` `sorElteres` — kedvezmény/felár osztályozás (`LineRow.tsx` jelvény +
  szegélyszín, `SorReszlet.tsx` jelvény, ahol `arElter` a halvány listaár-sor triggere); nem
  olvassa a `savos`-t.
- `domain/totals.ts` `sorListaOsszeg`→`sorokListaOsszeg`→`computeOsszesitok.kezelesekOsszesen`
  (mentett audit-mező); az `elteresBontas` (`nyomtatvany-osszesites-netto-felar` óta) ugyanezt
  hívja soronként — adja a `Summary.tsx` egyidejű „Kedvezmény"/„Felár" propjait.
  PDF/`PenzugyiOsszesites.tsx` már `sorokOsszeg`-alapú, nem érintett.
- `domain/arKoveti.ts` `arElteroSorok.keziAr` (nyers, `tetelId`-guard nélkül) →
  `veglegesitesOr.ts` `ar-elteres`; `arFrissites`/`arFrissitesPatch`; `frissArlistaval` `arGate`.
  `domain/orokoltJelzesek.ts` `keziAru` — ugyanaz a nyers, guardolt feltétel a másolat-jelzéshez.
- `domain/penznemValtas.ts` `sorPenznemValtassal` 3 ága — `masikPenznemAr` ma csak ár-pár.
- `pages/planEditor/LineRow.tsx` Listaár cella (egy szám); `arEltero` (nyers, ↺ gomb).
  `pages/planEditor/Summary.tsx` — `kedvezmeny`/`felar` propok, „Kedvezmény: X"/„Felár: X".
- `pages/PlanEditorPage.tsx` (~610) nyers ár-frissítés dialógusszöveg.
- `storage/seed/plans.ts` — Kovács János sora (`t016`, 38 000/55 000, ma sávon belüli, mégis
  felár-jelvényt kap); `buildSor` (SAVOS `savos:true`, sávhatár nélkül); `data/
  arlista.seed.json` `t014`/`t016` — a két SAVOS tétel.
- Tesztek: `sorElteres.test.ts`, `totals.test.ts`, `Summary.test.tsx`, `arKoveti.test.ts`,
  `orokoltJelzesek`/`penznemValtas` tesztje, `veglegesitesOr.test.ts`/`PreviewPage.test.tsx`,
  `PlanEditorPage.sorok.test.tsx`, `FazisokBlokk.test.tsx`, `storage/seed/plans.test.ts`.

## Approach
Változik: `domain/types.ts` (additív sávhatár-mező + `masikPenznemAr`); ÚJ domain modul a
„sávon belül" predikátumnak/referencia-listaárnak; `domain/totals.ts` (`sorListaOsszeg` a
referencia-áron, kaszkádol `elteresBontas`/`computeOsszesitok`-ba — `Summary.tsx` felár-oldala
kód nélkül javul); `domain/sorElteres.ts`; `domain/sorMezok.ts`; `domain/arKoveti.ts` (`keziAr`
+ frissítéskor friss sávhatár); `domain/orokoltJelzesek.ts`; `domain/penznemValtas.ts`
(mindhárom ág); `pages/planEditor/Summary.tsx` (felár-felirat); `LineRow.tsx` (Listaár teljes
sáv); `SorReszlet.tsx` (listaár-sor triggere, séma marad); `storage/seed/plans.ts`.

NEM tartozik ide: csatornaszám-választó; felső határ nyomtatványra vitele
(`savos-felso-hatar-nyomtatvanyon`); felár/kedvezmény nettózás és referenciasor-irány (lezárva,
`nyomtatvany-osszesites-netto-felar`); `schemaVersion`-emelés; `SorReszlet.tsx` Listaár-sémája;
`soronkenti-szazalek-kedvezmeny`; `app/src/pdf/**`, `PenzugyiOsszesites.tsx`; a ↺ gomb, `arGate`,
a `PlanEditorPage.tsx` dialógusszöveg — nyers marad.

## Decisions
- A sáv additív, opcionális mezőként kerül a sorra (pillanatkép-elv, `schemaVersion` marad 1,
  hiányzó mező = mai viselkedés) és a `masikPenznemAr`-ral mozog; mindhárom pénznemváltási ág
  explicit kezeli — visszaállítás nem szivárogtathat át idegen sávot, friss betöltés a belépő
  pénznem sávját írja, hiányzó ár törli.
- Sávon belüli árnál a referencia-listaár maga az ajánlati ár, EGY predikátumban — hívja:
  `sorElteres`, `sorListaOsszeg` (→ `elteresBontas`/`Summary.tsx`, külön kód nélkül),
  `arElteroSorok.keziAr`, `orokoltJelzesek.keziAru`, `SorReszlet.tsx` `arElter`;
  `arFrissites`/`frissArlistaval` is friss sávhatárt ír frissítéskor. Sikermérce: jelvény,
  Mindösszesen-sor, checklist és Terv részletei listaár-sor EGYÜTTES eltűnése.
- A redefiníció biztonságos: additív mező hiányában egy MÁR véglegesített terven a régi érték
  byte-azonos (nincs hamis drift-jelzés); EZUTÁN véglegesített, sávon belüli sorú terv
  „Kezelések összege" mezője magasabb — szándékos, a valódi árat tükrözi.
- Sávon KÍVÜLI ár változatlanul `listaEgysegar`-hoz mérve kap jelvényt, nem a `max`-hoz; a `≈`
  és a sávhatár független, `savos:true` sornak nem muszáj sávhatára legyen.
- A ↺ gomb, `arGate` és a `PlanEditorPage.tsx` dialógusszövege nyers marad — funkcionális okból.
- Mindösszesen alatt „Felár: X" helyett „Eltérés a listaártól: +X" (csak a felár-ág, a
  kedvezmény-ág és a jelvény változatlan) — a „felár" szó félreérthető.
- `SorReszlet.tsx` halvány listaár-sora a jelvénnyel EGYÜTT tűnik el — konzisztens a
  szerkesztővel; a Listaár sémája (nem tartomány) változatlan, csak a triggere.
- `storage/seed/plans.ts`: a Kovács-sor és a `buildSor` SAVOS sorai sávhatárt kapnak, hogy a
  demó mutassa a javítást.

## Verification
- [ ] tests — 38 000–65 000 sávú tételen 65 000 Ft-nál: sehol nincs eltérés-jelvény, nincs
      „Eltérés a listaártól" sor, nem szerepel az „ar-elteres" checklistben, a Terv részletei
      listaár-sora sem jelenik meg; 70 000 Ft-nál (sávon kívül) mindegyik megjelenik; 30 000
      Ft-nál kedvezmény-jelvény; sávhatár nélküli soron a mai viselkedés; a ↺ gomb és a
      dialógusszöveg sávon belül is pontos; HUF→EUR→HUF után a sáv az aktuális pénznemé, régi
      stash nem szivárogtat át idegen sávot; korábbi tervnél nincs hamis drift-jelzés; a Listaár
      cella sávos soron a teljes sávot mutatja.
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a „38 000 Ft–65 000 Ft" a Listaár oszlopban nem törik és
      nem szorítja ki a szomszédos cellákat (`whiteSpace: nowrap`).
