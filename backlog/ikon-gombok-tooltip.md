# ikon-gombok-tooltip
Type: feature
Source: doki felvetés
Target: master
Baseline: 3dcb93e41afbf61aeb819190eae3ef56a04eb842

## Goal
Minden felirat nélküli ikon-gomb fölé érve a doki egy rövid szövegből megtudja, mit tesz a gomb —
kattintás előtt; a letiltottaknál azt is, miért nem kattintható.

## Current state
- ~33 ikon-gomb `IconButton`-ként, mind `aria-label`-lel — az csak képernyőolvasónak szól:
  `app/src/pages/planEditor/LineRow.tsx` (⟳, ↺, ≈, kuka, pipa), `planEditor/PhaseSection.tsx`
  (chevron, fel/le, kuka), `app/src/pages/PriceListAdminPage.tsx` (csillag `gyakori`, szem
  `aktiv`), `priceListAdmin/KategoriaPanel.tsx` és `settings/RendeloTab.tsx` (fel/le, kuka),
  `app/src/components/ToothPickerPopover.tsx` (célkereszt),
  `app/src/components/PatientPlanChains.tsx` (ceruza, pipa, X, „…” menü),
  `app/src/pages/PatientDetailPage.tsx`, `PaciensekPage.tsx`, `planEditor/PlanEditorHeader.tsx`,
  `priceListAdmin/ItemEditor.tsx`, `tervReszletei/FazisReszlet.tsx`, `planEditor/FazisMegjegyzes.tsx`.
- Natív `title` szórványosan 10 helyen — késve jelenik meg, nem a felület stílusa, és
  `priceListAdmin/KategoriaPanel.tsx` kuka-gombján épp letiltott gombon ül.
- `@radix-ui/themes` `Tooltip` elérhető; a `Theme` gyökér (`app/src/App.tsx`) már ad
  `Tooltip.Provider`-t 200 ms késleltetéssel.
- `app/src/components/NumberField.tsx` ▲▼ léptetői natív gombok, `tabIndex={-1}`, `aria-label`-lel.
- Gépi őr mintája: `app/.oxlintrc.json` `no-restricted-imports` + `overrides`.

## Approach
Új `app/src/components/IkonGomb.tsx`: Radix `Tooltip` + `IconButton` egy komponensben, kötelező
`cimke` proppal (= a tooltip szövege és az alap `aria-label`), opcionális `ariaLabel`
felülírással ott, ahol a képernyőolvasónak több kontextus kell (árlista csillag/szem: sornév-
előtag, „…” menü: terv+verzió). `forwardRef` + prop-továbbadás, hogy `Popover.Trigger` /
`DropdownMenu.Trigger` gyerekeként is működjön. Letiltott állapotban a gomb egy `<span>`-be kerül,
és az a tooltip triggere (a letiltott gomb nem kap egérmozgás-eseményt); a span nem lesz
Tab-megálló, letiltott gombnál a tooltip egér-only.
A ~33 hívóhely átáll az `IkonGomb`-ra, az ottani natív `title`-ök törlődnek. A `NumberField` ▲▼
léptetői közvetlen `Tooltip`-et kapnak.
Őr: `app/.oxlintrc.json` megtiltja az `IconButton` importját a `@radix-ui/themes`-ből, kivétel
`src/components/IkonGomb.tsx` — így felirat nélküli ikon-gomb nem keletkezhet tooltip nélkül.
NEM tartozik ide: a nem kattintható jelzések (badge-ek, HU-chip, Callout-ikonok), a feliratos
gombok `title`-je (`LineRow.tsx` „Leírás”, `FazisMegjegyzes.tsx` „Megjegyzés” — `getByTitle`
tesztek függnek tőlük), a fogtérkép fogszámai, és bármilyen viselkedés- vagy elrendezés-változás.

## Decisions
- Minden felirat nélküli ikon-gomb kap tooltipet, a „nyilvánvalók” is — mert a doki egységes
  szabályt kért; nem szelektív lista, mert az újra és újra vitatható maradna.
- Szöveg: rövid akciócímke + tagmondat ott, ahol a mellékhatás nem nyilvánvaló (a mai `LineRow`
  `title`-ök mintája) — nem mindenhol teljes mondat, mert sűrű táblában az zavaró.
- Letiltott gomb is ad tooltipet, az okkal, `<span>` triggerrel — mert ott a legnagyobb a
  hiányzó magyarázat ára; nem marad natív `title`-lel, mert az a kevert megoldást tartaná fenn.
- Wrapper komponens, nem hívóhelyenkénti `Tooltip` — mert így lintből őrizhető, hogy ikon-gomb
  tooltip nélkül nem létezhet; hívóhelyenkénti megoldásnál ez 33 helyen elfelejthető maradna.
- Az `aria-label` marad az akadálymentes NÉV, a tooltip `aria-describedby`-ként jön mellé — nem
  cseréljük le, mert a sornév-előtagos labelekre (csillag/szem, „…” menü) tesztek épülnek.

## Verification
- [ ] tests — ikon-gomb fölé érve megjelenik a magyarázó szöveg; letiltott ikon-gombnál is
      megjelenik, és az okot mondja; a csillag/szem tooltipje az állapottal együtt vált; a
      popover-/menü-trigger ikon-gombok kattintásra továbbra is nyitnak
- [ ] typecheck/lint — az új oxlint-szabály zöld, `IconButton` sehol nem importálódik közvetlenül
- [ ] docs-check
- [ ] manual-check szelet: visual-css (tooltip kontraszt, elhelyezkedés sűrű táblasorban, nem
      takarja a szomszéd cellát) + keyboard-a11y (Tab-fókuszra megjelenik, Escape zárja, a
      letiltott gomb nem lett új Tab-megálló)
