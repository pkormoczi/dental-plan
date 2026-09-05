# pdf-verzioszam-mentett-verzio
Type: bug
Source: doctor-review elso-megnyitas (2026-09-05), 1. megállapítás

A véglegesített terv PDF-jén eggyel kisebb verziószám áll, mint amit a program mutat: az első
kiadott papíron „v0”, a képernyőn „v1”; egy v1→v2→v3 láncnál a papírokon v0, v1, v2. Repro: új
páciens, két tétel → Előnézet → „Véglegesítés és mentés” → Korábbi tervek → Megnézés →
Megnyitás külön; a tervlap „Verzió v1”-et, a mentett PDF fejléce „· v0 ·”-t mutat. Oka: a
véglegesítés az előnézethez már legenerált PDF bájtjait menti el változatlanul
(`app/src/pages/PreviewPage.tsx`), a verziószámot viszont a tároló osztja ki utána
(`nextVersionNumber`), a fejléc pedig a piszkozat `verzio` mezőjét írja ki
(`app/src/pdf/tervDocument/Chrome.tsx`). Elvárt viselkedés: a mentett PDF fejlécében pontosan
az a verziószám áll, amit a verziósor és a Terv részletei lap mutat — a papír utólag
párosítható a gépben lévő verzióval. Ugyanebben a fejlécsorban: új tervnél a `tervId` üres,
ezért a sor egy különálló „·” jellel kezdődik; ez is javítandó. A kidolgozásnak számolnia kell
azzal, hogy ma a jóváhagyott előnézet bájtjai archiválódnak — ugyanez a szabály a
`nem-vegleges-jelzes-pdf` tétel nyitott kérdése is.
