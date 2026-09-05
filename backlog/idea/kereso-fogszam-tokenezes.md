# kereso-fogszam-tokenezes
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 3. megállapítás

A papírlistákról a doki „18 fogeltávolítás” alakban olvassa fel a kezelést, a kereső viszont nulla
találatot ad rá: a `nevEgyezik` (`app/src/domain/search.ts`) a TELJES keresőszöveget részsztringként
keresi a tétel nevében, a fogszámot nem választja le. Az egyetlen felkínált kiút a kiemelt „Egyedi
tétel felvétele: »18 fogeltávolítás«” — Enterre egy 0 Ft-os, ár nélküli sor keletkezik a tervben. A
szöveget István 18 Backspace-szel törölte, mert a keresőben nincs látható törlő X (az Escape kiürít,
de rejtett). Repro: bármelyik fázis keresőjébe „18 fogeltávolítás” → „Nincs találat.” + egyedi tétel.
Elvárt: a keresőszöveg 1–2 jegyű, fogszám-alakú tokenjei (`parseTeeth`) maradjanak ki az
egyezés-vizsgálatból, és a találat felvételekor kerüljenek a sor Fog mezőjébe („18 fogeltávolítás” →
Fogeltávolítás, Fog: 18); minimumként nulla találatnál egy nem választható tipp-sor („Próbáld fogszám
nélkül”), plusz egy törlő X a keresőmezőben. A `nevEgyezik` az EGYETLEN kétnyelvű keresési szabály —
az Árlista admin szűrője is hívja, a kétnyelvű egyezés nem sérülhet. Rokon, de külön tétel:
`kereso-fogszam-egyedi-tetel` (csupa szám gépelése) és `kereso-talalat-rangsor` (találati sorrend).
