# eloleg-autofocus-betolteskor
Type: bug
Source: doctor-review papirrol (2026-09-05), 14. megállapítás
Target: master
Baseline: 746e8d70e11146e1f5e2ccaf3b9a198a4f40d22d

## Goal
Előleges piszkozat megnyitása (F5, vagy „Vissza a szerkesztőbe” az előnézetből) után a kurzor ott
marad, ahol volt: az Előleg mező nem kap fókuszt, a tartalma nincs kijelölve, az oldal nem görget
az aljára. A bekapcsoló mozdulatra és a Ft/% módváltásra a fókusz változatlanul odaugrik.

## Current state
`app/src/pages/planEditor/ElolegBlokk.tsx` — az `on` state `useState(() => elolegOsszeg != null)`
kezdőértékkel indul, így betöltött előlegnél már az első renderben megjelenik a `NumberField`, és
a rajta lévő `autoFocus` tüzel. Ugyanez az `autoFocus` szolgálja ki a két szándékos esetet: a
pipa bekapcsolását, és a `key="osszeg"`/`key="szazalek"` miatt új DOM-node-ot létrehozó
módváltást (a `key`-ek indoka a fájl kommentjében áll). Az `elolegOsszeg`-re figyelő `useEffect`
külső prop-változásnál (terv betöltése/másolása) szintén `setOn(true)`-t hívhat.
Meglévő tesztek: `app/src/pages/planEditor/ElolegBlokk.test.tsx` „bekapcsoláskor üresen,
fókuszáltan jelenik meg, előtöltés nélkül” és „módváltáskor a %-mező üresen, fókuszáltan jelenik
meg, a meglévő összeg változatlan marad” — mindkettőnek zöldnek kell maradnia.

## Approach
`ElolegBlokk.tsx`-en belül az `autoFocus` a doki mozdulatához kötődjön (pipa bekapcsolása,
módváltás), ne a mező puszta megjelenéséhez — mounton és külső prop-változásból eredő
megjelenéskor ne tüzeljen. Nem tartozik ide: a `NumberField` maga, a szülő `PlanEditorPage`
görgetés-/fókuszkezelése, és az előleg bármely számítási vagy validációs viselkedése.

## Decisions
- nincs

## Verification
- [ ] tests — betöltött előleggel mountolva (`elolegOsszeg` kezdőértékként nem `null`) az Előleg
      mező NEM kap fókuszt; a bekapcsolás és a módváltás meglévő fókusz-tesztjei zöldek maradnak
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
