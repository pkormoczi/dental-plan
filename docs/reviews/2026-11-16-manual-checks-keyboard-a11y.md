# manual-checks — `keyboard-a11y` szelet, 2026-11-16

Kiváltó: `/implement newplanpage-uj-paciens-teszt-villodzik` 2d lépése. A tétel a közös
záráskori fókusz-visszaadást (`app/src/components/fokuszVisszaadas.ts`) érintette: a visszaadás
kimarad, ha közben egy másik, a célt nem tartalmazó modális ablak nyílt. A `keyboard-a11y`
szelet a fókusz-/Tab-kezelés változásához tartozik (`SKILL.md` táblázata).

Környezet: izolált, headless Chrome (`.mcp.json`, `--isolated`), `npm run dev`
(`http://localhost:5173/dental-plan/`), 1440×900, seed demó adat, determinisztikus reset a
menet elején. Futásidő: ~15 perc.

## A tételhez tartozó ellenőrzés — rendben

| Út (`#/uj-terv`, mentetlen piszkozattal) | Eredmény |
|---|---|
| „+ Új páciens” → „Új páciens, piszkozat elvetésével”, 400 ms várakozás kattintás nélkül | ✅ a fókusz az „Új páciens” ablak Név mezőjében |
| Ezután kattintás nélkül gépelve: „Teszt Elek” (szóközzel) | ✅ a Név mező értéke „Teszt Elek”, megerősítő ablak nem nyílt újra |
| Kitöltött ablakon Escape → „Nem mentett adat” kérdés → Mégse (egymásba ágyazott eset) | ✅ a fókusz visszatér a Név mezőbe, a beírt név megmarad |
| Kitöltött ablak elvetése („Bezárás, a begépelt adat elvetésével”) | ✅ a fókusz a keresőmezőn (a lap saját szabálya) |
| „+ Új páciens” → megerősítő ablak → Mégse (zárás után nem nyílik másik ablak) | ✅ a fókusz a „+ Új páciens” gombon |

Konzol: 0 hiba; egy figyelmeztetés, lásd lent (nem a tétel zárási útjához tartozik).

## Járulékos, ugyanebben a menetben igazolt viselkedés — rendben

- Tételfelvitel-ciklus a `#/terv` lapon 3× egér nélkül: minden körben megállt a Fog mezőn, majd a
  kiürült keresőn, popover zárva.
- Egyedi sor: a nulla katalógus-találatot igénylő eset helyett az első kör hozta létre (lásd az
  1. megállapítást), `egyedi` jelöléssel, megáll a Fog mezőn.
- Fogszámot nem kívánó tétel („Konzultáció/fél óránként”): egy Enter után rögtön a kiürült kereső.
- Escape a keresőn (van szöveg, nyitott popover): a mező kiürül, a popover zárva, a fókusz a
  keresőn marad.
- Fogtérkép: csukott panelnél nincs a DOM-ban; nyitva `role="toolbar"` `tabIndex` 0, 32 fog, 0
  önálló Tab-megálló; Tab-bal rálépve `outline-style: solid`, a kurzor `display: inline`, ink
  körvonal (`rgb(45, 45, 45)`).
- Soronkénti fogválasztó (16-os fog kijelölve): `.is-picked .tooth-fill` `paint-order: stroke`,
  körvonal az akcentus (`rgb(247, 116, 9)`), szövegszín nem az akcentus; a popover nem nulla
  méretű és a látótéren belül van; Escape zárja, a fókusz a nyitó gombra tér vissza (a
  megmaradó popper a gomb tooltipje).
- `prefers-reduced-motion`: nem ellenőrizhető ezzel az eszközzel.

## Kritikus

Nincs.

## Közepes

Nincs.

## Apró

### 1. A szelet-leírás „ArrowDown, majd Enter” lépése ma az egyedi sort veszi fel

Érintett: `.claude/skills/manual-checks/keyboard-a11y.md` „A kritikus ciklus”;
`app/src/pages/planEditor/ItemPicker.tsx`. Gépeléskor a kereső már az első katalógus-találatot
emeli ki, így a leírt `ArrowDown` a következő opcióra, az „Egyedi tétel felvétele” sorra lép, és
az `Enter` egyedi sort vesz fel („Fognyaki”, nem „Fognyaki tömés”). A ciklus megállói ettől
helyesek, de a szelet leírása így nem azt méri, amit állít. Javaslat: a leírásban a katalógus-tétel
körei `Enter`-rel induljanak, az egyedi sor ellenőrzése maradjon külön lépés.
- Döntés: javítva manual-checks-keyboard-szelet-leiras (2026-11-16)

### 2. „Blocked aria-hidden” Chrome-figyelmeztetés a megerősítő ablak nyitásakor az Új terv lapon

Érintett: `app/src/pages/NewPlanPage.tsx`, `app/src/components/PlanVersionActionDialog.tsx`.
Repro: a quick-create ablak elvetése után a fókusz a „Meglévő páciens keresése” mezőn áll; a
„+ Új páciens” gombra kattintva a megerősítő ablak megnyílik, és a konzolban egyszer megjelenik:
„Blocked aria-hidden on an element because its descendant retained focus” (fókuszban:
`#meglevo-paciens-kereso`, `aria-hidden` ős: `#root`). A megnyitás pillanatában a fókusz még a
háttérben van, amikor a Radix elrejti a gyökeret; felolvasó szoftvernél ez egy pillanatra
rejtett elemen hagyhatja a fókuszt. Nem a most módosított zárási út; a tétel diffje nem érinti.
- Döntés: backlog megerosito-ablak-aria-hidden-figyelmeztetes (2026-11-16)
