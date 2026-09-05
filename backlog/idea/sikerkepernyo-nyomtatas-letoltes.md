# sikerkepernyo-nyomtatas-letoltes
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 2. megállapítás (a 15. is ide fut)

A „Véglegesítés és mentés” utáni sikerképernyőn nincs se PDF, se Nyomtatás, se Letöltés — pont
abban a pillanatban, amikor a páciens az asztal túloldalán ül és várja a papírt. A képernyő a
mentés helyét belső kódokkal és a figyelmeztetéseket ismétli, de a doki egyetlen tényleges
következő lépését nem kínálja fel; a böngésző Vissza gombja ugyanezen a képernyőn hagy. A
nyomtatható laphoz ma három kattintás vezet, amit a persona csak próbálgatással talált meg:
Korábbi tervek → Megnézés → Megnyitás külön (vagy Letöltés). Elvárt: a most mentett verzió egy
kattintással nyomtatható vagy letölthető a sikerképernyőről — ugyanaz a két művelet, ami a Terv
részletei lapon már létezik (`app/src/pages/TervReszleteiPage.tsx`); a sikerképernyő a `savedRef`
ág az `app/src/pages/PreviewPage.tsx`-ben. Ide fut a jelentés 15. megállapítása is: aki a mentés
közbeni frissítés miatt nem látta a sikerképernyőt, egy „az imént véglegesített terv” kártyáról
jusson ugyanezekhez a gombokhoz — különben újra véglegesít, és fölös verzió keletkezik. Nem ide
tartozik: a sikerképernyő belső kódjainak (mappanév, UUID) laikus szövegre cserélése.
