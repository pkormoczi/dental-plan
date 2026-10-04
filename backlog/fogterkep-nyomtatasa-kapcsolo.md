# fogterkep-nyomtatasa-kapcsolo
Type: feature
Source: doki felvetés 2026-10-04
Target: master
Baseline: 7c9947e6290b7baeee62d259fbd791484f5dc80c

## Goal
A tervszerkesztőben az „Érintett fogak” gomb mellett egy „Ábra a nyomtatványon” jelölőnégyzet
van; az ajánlatra csak bekapcsolva kerül az érintett fogak ábrája, új terven alapból kikapcsolva,
régi terv új verzióján és másolatán bekapcsolva, ahogy eddig nyomtatódott.

## Current state
- `app/src/pdf/TervDocument.tsx` `showToothChart` (~102): az ábra feltétele ma csak a PNG és a
  fogszám; a blokk ~181–188. `pdf/ToothChartPdf.tsx` fejléckommentje erre a feltételre hivatkozik.
- Minta: `app/src/domain/types.ts` `leirasokMutatasa` (~249, opcionális, „hiányzó mező = true”,
  `schemaVersion` nem emelkedett); `domain/blankPlan.ts` `createBlankPlan` (~96); szerkesztő
  `pages/PlanEditorPage.tsx` ~719–731 (`Checkbox` a `Text as="label"`-ben, `updatePlan`).
- `app/src/components/ToothChartPanel.tsx`: fejléc-sor (`Flex justify="between"`, ~28) egyetlen
  „Érintett fogak” triggerrel; egyetlen hívója `PlanEditorPage.tsx` (~566). A Terv részletei
  `pages/tervReszletei/FogterkepPanel.tsx` külön komponens.
- Öröklés: „Új verzió” `state/AppState.tsx` `loadPlanIntoDraft` + `domain/ujVerzioDatum.ts`
  `frissDatummal`, „Másolás” `domain/planCopy.ts` — mindkettő egészben másolja a tervet.
- `domain/piszkozat.ts` `piszkozatTartalmas` a `leirasokMutatasa`-t szándékosan figyelmen kívül hagyja.
- `domain/validate.ts` `assertPlanShape` nem tilt ismeretlen kulcsot; `domain/schema.ts` csak a
  magasabb `schemaVersion`-t utasítja el.
- Tesztek: `pdf/TervDocument.test.tsx` describe „77. tétel: cím + páciensadatok + fogtérkép”
  (`renderElsoBlokk`), „nincs fogszám a tervben: a fogtérkép-blokk kimarad”;
  `domain/piszkozat.test.ts` „createBlankPlan starts with leirasokMutatasa: true”;
  `domain/ujVerzioDatum.test.ts` „a csakAjanlat változatlanul öröklődik”; `domain/planCopy.test.ts`
  „…mindent átvisz a forrásból”; `pages/PlanEditorPage.sorok.test.tsx` „Tétel-leírások nyomtatása”
  kapcsoló tesztje. jsdom-ban a PNG mindig `null`.

## Approach
Változik: `domain/types.ts` (új opcionális `Plan` mező, a `leirasokMutatasa` mintájára, magyar
JSON-kulccsal), `domain/blankPlan.ts` (új terv: kikapcsolva), `pdf/TervDocument.tsx` (a
`showToothChart` feltétele a mezővel bővül, hiányzó mező = be), `components/ToothChartPanel.tsx`
(jelölőnégyzet a fejléc-sorban, a trigger mellett, két új prop), `pages/PlanEditorPage.tsx`
(bekötés `updatePlan`-nel), `domain/piszkozat.ts` (a mező egyedül nem tartalom), plusz tesztek.
Nem változik: `schemaVersion`, `validate.ts`, `veglegesitesOr.ts` (nincs új tétel), `PreviewPage.tsx`,
a szerkesztőbeli fogtérkép-panel működése, `tervReszletei/FogterkepPanel.tsx`, `planCopy.ts` és
`ujVerzioDatum.ts` (egészben másolnak). Kizárt: globális alapértelmezés a Beállításokban.

## Decisions
- Hiányzó mező = bekapcsolva, új terv explicit kikapcsolva — mert a doki döntése szerint a régi
  terv új verziója úgy nézzen ki, mint amit a páciens kapott; nem „mindig ki”, mert az csendben
  tüntetné el az ábrát.
- Új verzió és másolat örökli az értéket — a doki döntése; a meglévő másolók egészben visznek,
  nem kell külön ág (nem a `csakAjanlat` reset-mintája).
- Nincs ellenőrzőlista-tétel kikapcsolt ábrára — a doki döntése: az alapállás „ki”, minden
  tervnél zaj lenne; az előnézet úgyis mutatja.
- Felirat „Ábra a nyomtatványon”, a `ToothChartPanel` fejléc-sorában — a doki döntése; ez a sor
  csukott panelnél is látszik.
- Additív mező `schemaVersion` emelés nélkül — a `leirasokMutatasa`/`csakAjanlat` bevett mintája;
  a régi app az ismeretlen kulcsot nem utasítja el.
- A kapuzás a `TervDocument`-ben, a `PreviewPage` PNG-renderelése marad — egy helyen dől el a
  láthatóság, és a jsdom-teszt ott éri el.
- `piszkozatTartalmas` a mezőt nem számolja tartalomnak — a `leirasokMutatasa` mintája: egy
  kapcsoló átbillentése még nem munka, amit menteni kellene.

## Verification
- [ ] tests — új terv kikapcsolva indul; kikapcsolt mezővel a nyomtatványon nincs „Érintett
      fogak” blokk akkor sem, ha van fogszám és PNG; bekapcsolva és mező nélküli (régi) tervnél
      megjelenik; a szerkesztőben az „Érintett fogak” gomb mellett „Ábra a nyomtatványon”
      jelölőnégyzet van, alapból üres, bepipálva a terv mezője igaz lesz, csukott panelnél is
      látszik; új verzió és másolás az igaz/hamis/hiányzó értéket változatlanul viszi; a kapcsoló
      egyedül nem teszi tartalmassá a piszkozatot.
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf (fogtérkép A/B valós PDF-bájtokon: bekapcsolva van képobjektum,
      kikapcsolva nincs, az előnézet a pipálásra frissül).
