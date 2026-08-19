# 56. tétel — „Új terv indítása": legutóbbi páciensek 15-ös, egysoros lista (D56)

## Probléma

Az `/uj-terv` köztes páciensválasztó „Legutóbbi páciensek" listája 5
elemre volt korlátozva (`RECENT_PACIENS_LIMIT`, ugyanaz a konstans, mint a
Kezdőlapon), és minden sor két sorban jelent meg (név, alatta az
aktivitás-szöveg). Ez a lista a doki elsődleges belépési pontja egy
visszatérő pácienshez — egy szűk 5-ös korlát túl gyakran kényszerítette
gépelésre, holott a cél épp a gépelés elkerülése.

## Döntés

- Új, önálló konstans `UJ_TERV_RECENT_LIMIT = 15`
  (`app/src/domain/paciensAktivitas.ts`), a Kezdőlap `RECENT_PACIENS_LIMIT`
  (5) mellett — ugyanaz a `legutobbAktivPaciensek()` helper, más
  `limit`-paraméterrel hívva. A Kezdőlap érintetlen.
- A sor kétsoros elrendezése (`flexDirection: 'column'`) egysorosra vált
  (`justifyContent: 'space-between'`, `alignItems: 'center'`): a név
  balra, az aktivitás-szöveg jobbra, ugyanazon a soron. Tipográfia/szín
  változatlan (`Text size="2"` név, `Text size="1" color="gray"`
  aktivitás) — csak a konténer flex-iránya változott.
- Nincs új scroll-konténer: a `Flex` wrapper korábban sem volt
  magasság-korlátozva, a lista ma is egyszerűen megnöveli az oldal
  magasságát; a meglévő `scrollIntoView({ block: 'nearest' })`
  billentyűzet-navigáció enélkül is működik.

## Elvetett alternatívák

- **A meglévő `RECENT_PACIENS_LIMIT` értékének módosítása** — elvetve: ez
  a Kezdőlapot is megváltoztatta volna, a kérés kifejezetten csak az
  `/uj-terv` képernyőre vonatkozott.
- **Belső scroll-konténer bevezetése** (`maxHeight` + `overflow-y`) a
  15 sorhoz — elvetve: a doki nem kérte, és az egysoros elrendezés
  már jelentősen tömörebb, mint a korábbi 5×kétsoros; a meglévő
  `scrollIntoView` mechanizmus konténer nélkül is helyesen görgeti az
  oldalt.

## Hatás

- `app/src/domain/paciensAktivitas.ts` — új exportált konstans.
- `app/src/pages/NewPlanPage.tsx` — import + `useMemo` limit-csere, a
  recents/találati sor `style`-jának 3 tulajdonsága.
- `app/src/pages/NewPlanPage.test.tsx` — 2 adatvezérelt teszt limit-
  hivatkozása + egy komment-szó frissítve; a `Home.test.tsx`,
  `Home.tsx`, `paciensAktivitas.test.ts` (a helper generikus tesztje)
  érintetlen.
- `docs/01-attekintes-es-dontesek.md` — új D56 sor, D40 pontosítva.
- `docs/03-funkcionalis-spec.md` — § „Új terv indítása" bullet frissítve.

**Automatikus ellenőrzés:** `npm run lint`, `npm test`, `npm run build` —
mind lefutott, hibátlanul.

## Kézi teszt-terv

1. `/uj-terv`, 0 karakter: akár 15 sor is megjelenhet a demó-adatban.
2. Minden sor egy soron: név balra, aktivitás-szöveg jobbra, változatlan
   szín/betűméret.
3. `↓`/`↑`/`Enter`/`Esc` a 15 soron is végigmegy, a kiemelés-sáv minden
   soron látszik.
4. Kereséskor (2+ karakter) a találati sorok (nincs aktivitás-szöveg)
   vizuálisan változatlanok.
