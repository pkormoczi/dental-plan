# dropdownmenu-alertdialog-fokusz-visszaadas
Type: bug
Source: implement-batch böngészős szelete közben mérve (2026-09-09)

A `⋯` menüből nyíló megerősítő dialógusok zárása után a fókusz a `body`-ra esik, nem a
megnyitó gombra — pedig a `keyboard-a11y` szelet és az `app/src/CLAUDE.md`
akadálymentesség-szakasza is azt mondja ki, hogy a fókusz a megnyitó elemre tér vissza.
Billentyűzettel dolgozó dokinál ez elveszíti a helyet a listában: a következő Tab a lap
tetejéről indul újra. Repró izolált Chrome-ban, `#/demo/tervek`: egy verziósor `⋯` →
`Érvénytelenítés` → `Escape` → `document.activeElement` a `BODY`; ugyanez mentés után is,
és ugyanez a `PatientDetailPage` `⋯` → `Páciens törlése` → `Escape` úton. Elvárt: a
fókusz arra a `⋯` gombra kerül vissza, amelyikből a dialógus nyílt. Nem a 2026-09-09-i
batch okozta — a törlés-dialóguson ugyanígy reprodukálódik, közös ok a
`DropdownMenu.Content` `onCloseAutoFocus` gátja plusz az `AlertDialog`. NEM tartozik ide a
gát puszta eltávolítása: az szándékos, mert enélkül a Radix visszaveszi a fókuszt a
triggerre az ugyanabban a tickben nyíló dialógus elől, és a „Ugrás a legfrissebb verzióra"
görgetés utáni saját fókuszkezelést is elvinné.
