# fokuszgyuru-kontraszt-szovegmezokon
Type: bug
Source: /implement-batch futás (2026-09-08) manual-checks visual-css+keyboard-a11y szelete
Kerdes: a Radix brown accentjéből örökölt halvány fókuszgyűrű tudatos vizuális döntés volt, vagy egyszerűen sosem került mérés alá — ahogy az `--accent-a11` szövegszín is csak utólag kapott override-ot ugyanezért?

Az `app/src/CLAUDE.md` látható fókuszgyűrűt és WCAG AA-t vár, de a szövegmezők gyűrűje
2,09:1 — a 3:1 alatt. A `.rt-TextFieldRoot` `:focus-visible` outline-ja
`2px solid var(--focus-8)`, ami a Radix `--accent-8` → `--brown-8` (`#cea37e`) láncból jön,
és az app — az `--accent-a11`-gyel ellentétben (`index.css` + `main.tsx` override ugyanezért
a kontrasztokért) — sosem írja felül. A gyűrű létezik és helyesen `:focus-visible`-höz
kötött, csak halvány. Repro: `#/paciens`, Enter vagy Tab a Név mezőre — a
`.rt-TextFieldRoot` `outlineColor` `rgb(206,163,126)` az `rgb(241,245,249)` lapháttéren,
2,09:1. Most lett terhelőbb: a `terv-cim-enter` és az `uj-paciens-enter-mentes`
Enter-láncai mezőről mezőre ugratják a fókuszt, ilyenkor a gyűrű az egyetlen jelzés arról,
hova került. Elvárt: a `--focus-8`/`--focus-a8` is kap 3:1-et elérő override-ot a meglévő
`--accent-a11`-minta szerint, vagy a doki kimondja, hogy a lágy gyűrű elfogadott — ekkor a
tétel elvethető, egy sorral a PRODUCT.md Nem cél alá. Nem tartozik ide a nyugalmi állapot
hiányzó kontroll-kerete (`arlista-sor-fejlec-keret-hianyzik`, `tab-trigger-keret-hianyzik`).
