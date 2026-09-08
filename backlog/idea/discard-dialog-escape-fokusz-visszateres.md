# discard-dialog-escape-fokusz-visszateres
Type: bug
Source: /implement-batch futás (2026-09-08) manual-checks keyboard-a11y szelete

A `#/terv` „Piszkozat eldobása" ablakát Escape-pel zárva a fókusz a `<body>`-ra esik, nem a
megnyitó gombra: a billentyűzetes doki elveszíti a helyét, a következő Tab a lap elejéről
indul. A `keyboard-a11y` szelet elvárása szó szerint: „Escape minden dialógust/popovert zár,
a fókusz a megnyitó elemre tér vissza".

Repró: `#/terv`, a „Piszkozat eldobása" gombra Tabbal, Enter, majd Escape — a
`document.activeElement` a `<body>`. Elvárt: a „Piszkozat eldobása" gomb.

Ok: az ablak kontrollált, `AlertDialog.Trigger` nélküli (`PlanEditorPage.tsx` inline
`AlertDialog.Root`), így a Radix beépített visszafókuszálása `triggerRef.current` null-ra fut
— ezt a `DiscardChangesDialog.tsx` `visszaFokuszRef` propjának kommentje már ki is mondja. A
kerülőút tehát megvan, de egyedül az `UjPaciensDialog.tsx` köti be; a többi trigger nélküli
hívóhely (a `PlanEditorPage` inline ablaka, `NavBar`, `PatientDetailPage`, `KategoriaPanel`,
`SettingsPage`, `NyomtatvanyokTab`) nem. Csak a `#/terv` esete van ténylegesen mérve — a
tervnek végig kell néznie, melyik hívóhelyet érinti valóban.

NEM tartozik ide: a `PiszkozatKonfliktusDialog` kezdő fókusza (külön, már lezárt tétel).
