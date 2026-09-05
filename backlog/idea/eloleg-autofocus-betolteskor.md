# eloleg-autofocus-betolteskor
Type: bug
Source: doctor-review papirrol (2026-09-05), 14. megállapítás

Oldalfrissítés (F5) vagy az előnézetből „Vissza a szerkesztőbe” után a kurzor az Előleg mezőbe
ugrik, a tartalma kijelölve, az oldal az aljára görget — a doki nem érti, miért, és egy véletlen
gépelés felülírja az előleget. Ok: az `autoFocus` a `NumberField`-en
(`app/src/pages/planEditor/ElolegBlokk.tsx`) a pipa bekapcsolásakor szándékos, de betöltött
előlegnél is tüzel. Repró: előleges piszkozat megnyitva → F5 → az Előleg mező fókuszban, a lap
az aljára görgetve. Irány: az `autoFocus` csak a doki bekapcsoló mozdulatához kötődjön, ne a
betöltéshez.
