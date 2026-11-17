# electron-telepitesi-proba
Type: doki
Source: desktop-app-migration-plan-final.md §10.1 (Kész)

A doki mindkét gépén — Windows és macOS — a teszt-release-ből, a README lépései szerint telepíti és
elindítja az appot; ahol a SmartScreen vagy a Gatekeeper másként viselkedik, mint a README írja, az
eltérést jelzi, és az a README-be visszakerül. Egy fiktív páciensen tervet visz végig az előnézetig és
a véglegesítésig: a PDF-előnézet működik, a letöltött PDF-en az ékezetes betűk (ő, ű) és a logó
látszanak. Kizárólag fiktív adattal: a héj még a demó `localStorage`-tárolóján fut, valódi
páciensadat csak az éles indulás kapuja után kerülhet az appba. Függ az `electron-release-workflow`
első futásától.
