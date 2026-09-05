# preview-callout-p-egymasban
Type: bug
Source: agent-first migráció F10 böngészős ellenőrzése

A `PreviewPage` `VeglegesitesChecklist` amber `Callout`-ja `<p>`-t renderel `<p>`-be — a React
konzolon nesting-hiba. Elvárt: a Callout szövege érvényes DOM-mal jelenik meg, konzolhiba nélkül,
változatlan megjelenéssel.
