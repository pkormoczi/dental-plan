# fazis-osszecsukas-megorzese-es-osszegzo
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 7. megállapítás

A fázisfejléc nyilára kattintva a doboz összecsukható, és a fejlécben megjelenik „N tétel ·
összeg” (`app/src/pages/planEditor/PhaseSection.tsx`) — ez a legjobb válasz a „mennyi a 2. szakasz
külön” kérdésre, de csak véletlenül fedezhető fel (a nyíl feliratlan), és a csukott állapot egy
komponens-lokális `useState<Set<number>>` (`PlanEditorPage.tsx` `fazisCsukva`), ami Előnézet →
Vissza a szerkesztőbe navigációnál elvész — minden fázis újra kinyílik. Négy hosszú fázisnál a
doki a páciens előtt görgetéssel vagy négy összecsukással jut a válaszhoz. Repro: fázis
összecsukása → „3 tétel · 290 000 Ft” látszik → Előnézet → Vissza a szerkesztőbe → mind nyitva.
Elvárt: a Mindösszesen blokkban egy állandó, fázisonkénti részösszeg-sor (görgetés nélkül
látható); és/vagy a csukott állapot megőrzése a piszkozat élete alatt (perzisztens `fazisCsukva`,
ugyanúgy, ahogy a piszkozat maga is túléli a navigációt). A „N tétel” felirat sorokat számol, nem
kezeléseket (16 sorba tömörített 26 kezelésnél félrevezető) — ha a fő javítás mellé belefér, „N
sor” vagy fogszámmal számolt „N kezelés” pontosabb volna, de nem blokkolja a tételt.
