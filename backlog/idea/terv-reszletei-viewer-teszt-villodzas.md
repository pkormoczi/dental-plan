# terv-reszletei-viewer-teszt-villodzas
Type: chore
Source: /implement-batch futás (2026-09-07), a kapu kétszeri piros futása

A `TervReszleteiPage.test.tsx` „75. tétel: PDF nélküli verzión a viewer helyén üzenet” tesztje
villódzik: a `expect(screen.queryByTitle('A verzió mentett PDF-je')).not.toBeInTheDocument()`
állítás a TELJES készlet párhuzamos terhelése alatt háromszor elbukott (mindháromszor a
`close.mjs`/`sync.mjs` kapujában, ahol a `build`+`lint` után indul a `test`), önmagában futtatva
3/3, teljes készletként 11/11 zöld — reprodukálni nem sikerült. Következmény: a kapu kétszer
kért újrafuttatást, és egy villódzó kapu előbb-utóbb ahhoz szoktat, hogy „csak futtasd újra”,
ami valódi regressziót is átenged. A teszt egyetlen `findByTestId('terv-reszletei-fejlec')`-et
vár be, utána szinkron NEGATÍV állítást tesz egy olyan elemre, amit a `usePlanPdfObjectUrl`
aszinkron effektje vezérel — ez a leggyakoribb villódzás-alak. Nevesített gyanúsított, de nem
bizonyíték: a `vite.config.ts` teszt-blokkjában nincs `restoreMocks`/`clearMocks`, és ez a fájl
globálisan felülírja az `URL.createObjectURL`/`revokeObjectURL`-t `afterEach` visszaállítás
nélkül (fájlon belül csak a későbbi teszteket érintheti). Elvárt: a kapu terhelés alatt is
determinisztikus legyen. Nem ide tartozik a `docs/reviews/2026-09-05-tesztelesi-modszertan-review.md`
többi megállapítása (lassú fixture-ök, történeti tesztnevek, coverage) — azok külön tételek.
