# arlista-sor-fejlec-keret-hianyzik
Type: bug
Source: manual-checks visual-css szelet (2026-09-08), /implement-batch futásból — a control-border-meres-radix-wrapper wrapper-fix mellékhatásaként derült ki
Kerdes: a checklist-callout-szoveg-kontraszt és az arlista-kontroll-keret-hianyzik precedense szerint minden interaktív kontroll controlBorder-keretet kap — a `#/arlista` sornevek (`<th role="button">`, szerkesztésre nyitnak) is e szabály alá tartoznak, vagy egy táblázat-sor kattintható fejléce eltérő, keret nélküli affordancia (a sor hover/fókusz-kiemelése elég)?

## Fájdalom
A `#/arlista` táblázatában minden tétel sorneve `<th role="button">`-ként kattintható
(szerkesztő mezőt nyit), de sem saját `border`/`box-shadow`, sem a `controlBorder`-
fallback nem fedi — a mérés mind a ~118 sornévnél `control-no-border`-ként jelzi, a
Radix saját sor-elválasztó box-shadow-ja (ami VAN, de csak dekoratív, `rt-TableCell`
alsó vonala) nem helyettesíti.

## Repro
`#/arlista` — bármelyik kategória bármelyik sorának neve (pl. „Konzultáció/fél
óránként”) nem kap látható keretet vagy elégséges hátér-kontrasztot, csak a
kattinthatóságot jelző kurzor/hover.

## Elvárt
Vagy a sornév-fejléc is kap `controlBorder`-t (vagy legalább fókusz-/hover-állapotban
erősebb, mért kontrasztú kiemelést), vagy a doki kimondja, hogy egy táblázat-sor
kattintható fejléce nem esik a `controlBorder`-szabály alá — ez utóbbi esetben a tétel
elvethető, egy sorral a `docs/PRODUCT.md` Nem cél alá.
