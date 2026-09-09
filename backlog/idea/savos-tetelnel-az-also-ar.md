# savos-tetelnel-az-also-ar
Type: bug
Source: review:2026-09-05-doctor-review-nagy-terv#2; review:2026-09-05-doctor-review-papirrol#3

`SAVOS` tételnél a sor mindig a sáv alsó (`min`) árával kerül be, csatornaszám-kérdés nélkül
(`app/src/domain/money.ts`). Ha a doki a sávon BELÜL írja át az ajánlati árat (pl.
38 000 → 65 000 Ft egy 38 000–65 000 sávú tételnél), az eltérés-jelvény ezt tévesen "+71%"
felárnak jelzi, "Felár: X Ft" sort kap a Mindösszesen alá, és az előnézet "Kézzel felülírt
ajánlati ár" figyelmeztetést ad — holott ez a sáv saját, listaárban szereplő értéke, nem
felár. A jelzés torzítja az árazást: megfigyelt eset, hogy a doki emiatt inkább az alsó árat
hagyta egy második sávos tételnél is, "ne legyen még egy felár". A nyomtatványon a felár nem
jelenik meg (csak a `*` lábjegyzet), de ezt a szerkesztő sehol nem mondja ki.

Ok: az eltérés-jelvény (`sorElteres.ts`) a lista- és ajánlati ár puszta különbségéből számol,
a sáv felső határát nem ismeri.

Javasolt irány: (a) sávon belüli ajánlati ár ne kapjon felár-jelvényt — a sornak ismernie
kell a sáv `min`/`max` pillanatképét is (ugyanaz, mint a `savos-felso-hatar-nyomtatvanyon`
tételnél); (b) "Felár" helyett "Eltérés a listaártól"; (c) az előnézeti figyelmeztetés mondja
ki, hogy nem kerül nyomtatványra.

NEM ez: a sáv felső határának nyomtatása — a `savos-felso-hatar-nyomtatvanyon` külön tétel.
