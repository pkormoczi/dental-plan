# dropdownmenu-alertdialog-fokusz-visszaadas
Type: bug
Source: implement-batch böngészős szelete közben mérve (2026-09-09)
Target: master
Baseline: dfced98cc40d2bbfd5a2cb191bb93ae327b1e848

## Goal
A `⋯` menüből nyíló megerősítő dialógus zárása után a fókusz arra a `⋯` gombra tér vissza,
amelyikből nyílt — nem a `body`-ra; a piszkozat-őr dialógusa a látható gombos hívóinál is a
megnyitó gombra ad vissza fókuszt.

## Current state
- Gyökér-ok: `@radix-ui/react-dialog` modális `Dialog.Content`-je záráskor mindig
  `preventDefault()` + `triggerRef.current?.focus()` — trigger nélküli, kontrollált dialógusnál a
  `triggerRef` `null`, a fókusz a `<body>`-ra esik.
- Ma kézzel kezeli: `app/src/components/DiscardChangesDialog.tsx` `visszaFokuszRef`,
  `app/src/pages/paciensek/UjPaciensDialog.tsx`, `app/src/pages/NewPlanPage.tsx`
  `handleUjOpenChange`.
- Érintett dialógusok: `app/src/components/PatientPlanChains.tsx` érvénytelenítés és
  érvénytelenítés-visszavonás `AlertDialog`-ja; `app/src/pages/PatientDetailPage.tsx` „Páciens
  törlése"; `app/src/components/PlanVersionActionDialog.tsx` piszkozat-őr — négy hívó
  (`PatientPlanChains.tsx`, `pages/TervReszleteiPage.tsx`, `pages/NewPlanPage.tsx`,
  `pages/PatientDetailPage.tsx`).
- A két érintett `⋯` trigger: `PatientPlanChains.tsx` verziósor `IkonGomb` (`.map`-ben) és
  `PatientDetailPage.tsx` páciens `IkonGomb`. Mindkettő `DropdownMenu.Content
  onCloseAutoFocus` gátja alatt — a gát MARAD, `PatientPlanChains.tsx` `ugrasLegfrissebbre` épít rá.
- `app/src/components/IkonGomb.tsx` továbbít `ref`-et.
- Nem szabad megbontani: `app/src/pages/demo/OsszesTervSection.test.tsx` „a menü záráskor nem
  halászhatja el a fókuszt a most nyíló dialógus elől" teszt.

## Approach
- Közös fókusz-visszaadó helper `app/src/components/` alatt, a `DiscardChangesDialog`
  `visszaFokuszRef` mintáján: a hívó megnevezi a célelemet, a helper adja az `onCloseAutoFocus`-t
  (preventDefault + rAF-fókusz, csak ha a cél még a DOM-ban van). A `DiscardChangesDialog`
  meglévő `visszaFokuszRef` ága erre áll át.
- `PlanVersionActionDialog.tsx`: az `usePlanVersionActions` `inditas()`-a rögzíti a visszatérési
  célt (a `⋯` triggert, ha onnan indult, különben a nyitáskor fókuszált elemet); a dialógus ezt
  használja — mind a négy hívó egyszerre gyógyul.
- `PatientPlanChains.tsx`: a verziósor `⋯` gombja stabil DOM-jelölést kap, a két
  érvénytelenítés-dialógus állapota ebből találja vissza a triggert.
- `PatientDetailPage.tsx`: a lap egyetlen `⋯` gombja `ref`-et kap, a törlés-dialógus azt kapja meg.
- NEM tartozik ide: a `DropdownMenu.Content` / `Select.Content` `onCloseAutoFocus` gátak
  eltávolítása; `pages/planEditor/LineRow.tsx` és `pages/tervReszletei/FazisUgroNav.tsx` menüi
  (nem nyitnak dialógust, saját fókuszkezelésük van); a többi kontrollált dialógus
  (`PlanEditorPage`, `PriceListAdminPage`, `PatientPage`, `Home`, `TorzsadatSyncCard`,
  `PatientEditorPanel`, `TomegesArDialog`, `RendeloTab`, `AdatkezelesSection`,
  `EgyediVegosszegBlokk`) — ugyanez a gyökér-ok, külön tétel; a navigációval záruló akciók utáni
  fókusz.

## Decisions
- Közös helper, nem helyenkénti `onCloseAutoFocus` — mert a gyökér-ok egy Radix-viselkedés, és az
  új dialógusnak is ez legyen a kézenfekvő útja; nem oxlint-szabály, mert annak megírása külön munka.
- A piszkozat-őr javítása a megosztott `PlanVersionActionDialog`-ban, nem csak a `⋯` úton — mert
  egy komponens négy hívóval; a látható gombos utak külön javítása elcsúszó második másolat lenne.
- Fókusz csak akkor, ha a cél még a DOM-ban van; navigáló akció (törlés, másolás) után nincs
  visszaadás — mert az új lap belépési fókusza dönt, nem egy eltűnt sor gombja.
- Trigger-azonosítás DOM-jelöléssel a verziósoron, `ref`-fel a páciens-lapon — mert a verziósor
  `.map`-ben renderelődik (`ugrasLegfrissebbre` `data-plan` horgonya ugyanez az idióma), a
  páciens-lapon egyetlen `⋯` van.

## Verification
- [ ] tests — verziósor `⋯` → Érvénytelenítés → Escape ÉS → mentés: a fókusz azon a `⋯` gombon;
      ugyanez az Érvénytelenítés visszavonása és a `⋯` → Másolás új tervbe → Mégse úton; páciens
      `⋯` → Páciens törlése → Mégse: a fókusz a páciens `⋯` gombján; a piszkozat-őr látható gombos
      útja (Új verzió → Mégse) a megnyitó gombra tér vissza; a meglévő „a menü záráskor nem
      halászhatja el a fókuszt" teszt zölden marad
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
