# terv-reszletei-viewer-teszt-villodzas
Type: chore
Source: /implement-batch futás (2026-09-07), a kapu kétszeri piros futása

A `TervReszleteiPage.test.tsx` „75. tétel: PDF nélküli verzión a viewer helyén üzenet” tesztje
villódzik. A teljes készlet terhelése alatt négyszer bukott el: háromszor a
`close.mjs`/`sync.mjs` kapujában a 497. sori `queryByTitle('A verzió mentett PDF-je')`-n,
egyszer a GitHub Actions `Run tests` lépésében (`34079745185` futás) a 496. sori
`getByText(/beépített demó-adatkészletből származik/)`-en — a bukás pontja vándorol, és nem a
lokális gép terhelése okozza. Az azonos app-kódot vivő következő push futása zöld lett;
önmagában futtatva 3/3, teljes készletként 11/11 zöld — reprodukálni nem sikerült.
Következmény: a kapu kétszer kért újrafuttatást, egy Pages-deploy elmaradt, és a villódzó kapu
a „csak futtasd újra”-hoz szoktat, ami valódi regressziót is átenged. A teszt egyetlen
`findByTestId('terv-reszletei-fejlec')`-et vár be, utána szinkron állításokat tesz olyan
elemekre, amiket a `usePlanPdfObjectUrl` aszinkron effektje vezérel — ez a leggyakoribb
villódzás-alak. Gyanúsított, nem bizonyíték: a `vite.config.ts` teszt-blokkjában nincs
`restoreMocks`/`clearMocks`, és ez a fájl `afterEach` visszaállítás nélkül írja felül az
`URL.createObjectURL`/`revokeObjectURL`-t. Elvárt: a kapu terhelés alatt is determinisztikus
legyen. Nem ide tartozik a `docs/reviews/2026-09-05-tesztelesi-modszertan-review.md` többi
megállapítása — azok külön tételek.
