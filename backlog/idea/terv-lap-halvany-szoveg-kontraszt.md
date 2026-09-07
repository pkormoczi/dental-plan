# terv-lap-halvany-szoveg-kontraszt
Type: bug
Source: manual-checks visual-css szelet (2026-09-07), /implement-batch futásból

A `#/terv` lapon a halvány slate szöveg a sávos sorháttéren 4,34:1 kontrasztot ad, az
`app/src/CLAUDE.md` szerint nem opcionális WCAG AA 4,5:1 alatt. Mért érték: szövegszín
`rgb(100, 116, 139)`, effektív háttér `rgb(241, 245, 249)`. Érintett elemek a mérés szerint:
a sorok ár-cellái („38 000 Ft”, „45 000 Ft”, 13,3 px), a „Becsült ár” felirat (13,3 px), és a
darabszám-léptető „Növelés”/„Csökkentés” feliratai (7 px). A doki órákig nézi ezt a táblát
rendelői laptopon — pont az árak azok, amiket félreolvasva rossz számot mond ki a páciensnek.
Elvárt: a felsorolt szövegek elérjék a 4,5:1-et a SÁVOS sorháttéren is (a fehér háttéren ma is
megvan) — a token vagy a sáv-háttér módosításával, nem elemenkénti kézi színnel. jsdom alatt ez
strukturálisan nem fogható (nincs Radix CSS a tesztkészletben), tehát a bizonyíték a
`/manual-checks visual-css` szelete. Nem tartozik ide az előnézet amber Calloutjainak
kontrasztja (külön tétel) és a letiltott kontrollok, amikre a WCAG kivételt ad.
