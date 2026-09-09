# nincs-kedvezmeny-szazalek-mezo-mar
Type: feature
Source: review:2026-09-08-doctor-review-paciens-elott#3
Target: master
Baseline: b47ee13503bce9d3e3635d30a28afc6d914d2336

## Goal
Az Ajánlati ár oszlop fejlécében egy halvány súgósor mondja ki, hogy a mező százalékot is
elfogad — a doki az első használat előtt látja, hogy a papíron álló „10% kedv." fejszámolás
nélkül begépelhető.

## Current state
- `app/src/pages/planEditor/PhaseSection.tsx` — az `Ajánlati ár ({penznemJel})`
  `Table.ColumnHeaderCell` (148 px széles), a súgó helye.
- `app/src/pages/planEditor/LineRow.tsx` `szazalekosAr`, a `NumberField` `parseAlternativ`
  propjára kötve az `arId(pi, li)` mezőn — a működő, de néma képesség.
- `app/src/components/NumberField.tsx` — az ármezőn a `value` sosem üres
  (`formatForDisplay` mindig számot ad), ezért HTML `placeholder` itt sosem látszana; a
  `...rest` csak a `NumberFieldProps`-ban deklarált attribútumokat engedi át.
- `app/src/pages/planEditor/elemIdk.ts` — a fázis-szintű id-helperek mintája
  (`fazisPanelId`, `fazisKeresoId`).
- `app/src/pages/PlanEditorPage.sorok.test.tsx` — a `-10%` / csupasz `10%` / `+10%`
  viselkedés tesztjei; a fejléc szövegét az `Ajánlati ár (€)` állítás teljes szövegre nézi.

## Approach
Változik: `PhaseSection.tsx` (a fejléccella kap egy második, halvány sort), `elemIdk.ts`
(`arSugoId(pi)`), `NumberField.tsx` (`aria-describedby` átengedése), `LineRow.tsx` (a súgó
id-jének átadása az ármezőnek).
NEM változik: a `szazalekosAr` és a parse-szabályok; a többi `NumberField` (árlista admin,
előleg) viselkedése; a `Sor` séma; a nyomtatvány.
Hatókör-határ: nincs új kedvezmény-mező és nincs soronkénti Ft/% módváltó — a képesség
ugyanaz marad, csak láthatóvá válik.

## Decisions
- Fejléc-súgó, nem placeholder — mert az ármező sosem üres, placeholder sosem látszana.
- „% is beírható (pl. -10%)" — a doki választott szövege: előbb a képességet nevezi meg,
  aztán példát ad.
- ASCII kötőjel a példában, nem a jelvény `−` jele (`sorElteres.ts` `MINUSZ`) — mert a
  `szazalekosAr` regexe csak ASCII `+`/`-`-t fogad el; a `−`-t mutató súgó másolva néma
  kudarcot adna.
- A `Ajánlati ár ({penznemJel})` szöveg-node érintetlen marad, a súgó külön elem — mert a
  meglévő fejléc-teszt teljes szövegre illeszt.
- `aria-describedby` a fejléc-súgóra minden sor ármezőjéről — űrlap-módban a képernyőolvasó
  nem mondja fel az oszlopfejlécet; ehhez a `NumberField` átengedi az attribútumot,
  viselkedés-változás nélkül.
- Fázisonként egyszer, a fejlécben — nem soronkénti és nem fókusz-időzített súgó: a sűrű
  táblában soronként ismétlődő szöveg zaj, az abszolút pozíciójú fókusz-súgó pedig a
  `NumberField` „Érvénytelen érték — az előző maradt" jelzésének helyére kerülne.

## Verification
- [ ] tests — a fázistábla Ajánlati ár fejlécében megjelenik a százalékos súgó, a sor
      ármezője rá hivatkozik, és a `-10%` / `10%` / `+10%` bevitel viselkedése változatlan
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a súgó halvány, de olvasható, és nem tördeli szét a
      148 px-es oszlopot; keyboard-a11y — a képernyőolvasó felmondja a súgót az ármezőn
