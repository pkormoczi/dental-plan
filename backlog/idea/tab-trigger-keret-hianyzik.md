# tab-trigger-keret-hianyzik
Type: bug
Source: manual-checks visual-css szelet (2026-09-08), /implement-batch futásból — a control-border-meres-radix-wrapper wrapper-fix mellékhatásaként derült ki
Kerdes: a checklist-callout-szoveg-kontraszt és az arlista-kontroll-keret-hianyzik precedense szerint minden interaktív kontroll controlBorder-keretet kap — a role="tab" fülek (pl. DEMO, Beállítások oldal) is e szabály alá tartoznak, vagy a fülcsík elfogadott affordanciája a kiemelt háttér/aláhúzás, keret nélkül is?

## Fájdalom
A DEMO és a Beállítások oldal fülnavigációjában (`role="tab"`, pl. „Filerendszer”,
„Változásnapló”, „Nyomtatványok”, „Egyéb”) az inaktív fülek se kerettel, se elégséges
kitöltés-kontraszttal nem határolódnak — sem saját `border`/`box-shadow`, sem a
`controlBorder`-fallback nem fedi őket, a mérés `control-no-border`-ként jelzi mind a
két oldalon.

## Repro
`#/demo` (bármelyik almenete) vagy `#/beallitasok` — az inaktív fülgombokon (aktív fülön
kívül mind) nincs vizuálisan látható keret vagy elégséges hátér-kontraszt.

## Elvárt
Vagy a fülgombok is kapnak `controlBorder`-t (index.css bővítés, hasonlóan a
rádiógombok/RadioCards mintájához), vagy a doki kimondja, hogy a fülcsík saját, keret
nélküli affordanciája (kiemelt háttér/aláhúzás az aktívon) elfogadott — ez utóbbi esetben
a tétel elvethető, egy sorral a `docs/PRODUCT.md` Nem cél alá.
