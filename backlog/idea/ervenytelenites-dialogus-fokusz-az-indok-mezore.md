# ervenytelenites-dialogus-fokusz-az-indok-mezore
Type: bug
Source: implement-batch böngészős szelete közben mérve (2026-09-09)

A verzió-érvénytelenítés dialógusa nyitáskor a „Mégse" gombra fókuszál, nem a kötelező
indoklás-mezőre — a `PatientPlanChains.tsx` `TextField.Root`-ján ott álló `autoFocus`
hatástalan, mert a Radix `AlertDialog` a WAI-ARIA alertdialog-minta szerint a `Cancel`-re
viszi a fókuszt. Repró izolált Chrome-ban, `#/demo/tervek`: verziósor `⋯` →
`Érvénytelenítés` → a nyitott dialógusban `document.activeElement` a „Mégse", a mező egy
Shift+Tab-bal érhető el. A doki első dolga itt mindig a gépelés, a lap pedig
billentyűzet-központú, a kód pedig mást állít, mint ami történik. Elvárt: nyitáskor az
indoklás-mező kapja a fókuszt. Nem azonos a
`dropdownmenu-alertdialog-fokusz-visszaadas` tétellel: az a dialógus ZÁRÁSA utáni
fókuszról szól, más okkal. Eldöntendő a tervezésnél, hogy az `onOpenAutoFocus`
megszakítása a helyes út, vagy a szövegbevitel miatt eleve nem `AlertDialog` való ide —
utóbbi ütközne a `veglegesitett-terv-ervenytelenitese` tervének döntésével, ami tudatosan
`AlertDialog`-ot írt elő.
