# discard-dialog-escape-fokusz-visszateres
Type: bug
Source: /implement-batch futás (2026-09-08) manual-checks keyboard-a11y szelete
Target: master
Baseline: e6b75060a3ee94a43d972cad8779173e2fef42a0

## Goal
A `#/terv` „Piszkozat eldobása" ablakát Escape-pel zárva a fókusz a `<body>`-ra esik, nem a
megnyitó gombra: a billentyűzetes doki elveszíti a helyét, a következő Tab a lap elejéről indul.
A `keyboard-a11y` szelet elvárása szó szerint: „Escape minden dialógust/popovert zár, a fókusz a
megnyitó elemre tér vissza".

Repró: `#/terv`, a „Piszkozat eldobása" gombra Tabbal, Enter, majd Escape — a
`document.activeElement` a `<body>`. Elvárt: a „Piszkozat eldobása" gomb.

## Current state
`app/src/components/DiscardChangesDialog.tsx` `visszaFokuszRef` propja és az
`onCloseAutoFocus` kerülőútja — a prop kommentje már kimondja a Radix-okot: kontrollált
(`AlertDialog.Trigger` nélküli) ablaknál a beépített visszafókuszálás `triggerRef.current`
null-ra fut. Ma egyedül `app/src/pages/paciensek/UjPaciensDialog.tsx:345` köti be. Ref nélküli
hívóhelyek: `components/NavBar.tsx:93`, `pages/PatientDetailPage.tsx:395`,
`pages/priceListAdmin/KategoriaPanel.tsx:90`, `pages/SettingsPage.tsx:81`,
`pages/settings/NyomtatvanyokTab.tsx:355`; plusz a mért eset, a `pages/PlanEditorPage.tsx:630`
inline `AlertDialog.Root`-ja („Piszkozat eldobása" — ez a `DiscardChangesDialog` komponenst nem
használja, saját `AlertDialog.Content`-je van).

## Approach
Az öt ref nélküli `DiscardChangesDialog` hívóhely megkapja a saját nyitó gombjára mutató
`visszaFokuszRef`-et. A `PlanEditorPage` inline „Piszkozat eldobása" ablaka ugyanezt az
`onCloseAutoFocus` mintát kapja meg közvetlenül a saját `AlertDialog.Content`-jén. NEM tartozik
ide: a `PlanEditorPage` másik két inline ablaka („Fázis törlése", „Ár frissítése az
árlistából"), a `PiszkozatKonfliktusDialog` kezdő fókusza (külön, már lezárt tétel), és minden
`AlertDialog.Trigger`-rel nyitott dialógus, ahol a Radix beépített visszafókuszálása már
helyesen működik.

## Decisions
- a meglévő `visszaFokuszRef` propot terjesztjük ki hívóhelyenként, nem egy komponensbe épített
  automatikus `activeElement`-mentést vezetünk be — mert az érintett hívóhelyek köre zárt (a
  fenti lista), és a prop kommentje már ezt a mintát dokumentálja.

## Verification
- [ ] tests — a `#/terv` „Piszkozat eldobása" ablakát Escape-pel zárva a fókusz a megnyitó
      gombon van (`document.activeElement`)
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y — a jsdom fókuszkezelése (Radix `onCloseAutoFocus` +
      valós Escape-esemény) nem fedi le megbízhatóan a valós böngészőt
