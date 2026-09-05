# preview-callout-p-egymasban
Type: bug
Prio: now
Source: agent-first migráció F10 böngészős ellenőrzése
Target: master
Baseline: c55c7e34009dc5bcb26822ad60bd9c2e00ed6516

## Goal
A véglegesítés-csekklista részlet-sorai érvényes DOM-mal, változatlan megjelenéssel jelennek meg,
és a böngésző konzolján nincs nesting-hiba — a hibaosztály pedig gépi őrt kap, hogy ne térhessen
vissza máshol.

## Current state
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx` 100. sor: a `reszletek` sorok
  `<Text as="p" size="1" mt="1">`-ek a `Callout.Text` belsejében. A Radix `Callout.Text`
  `<Text as="p" className="rt-CalloutText">`, `asChild` hard-kódolva `false` — a `<p>` nem
  kerülhető meg. Ez a repó EGYETLEN érvénytelen nesting-je; a többi `Callout.Text` hívás
  stringet, `<Text weight="bold">`-ot (span) vagy `<Link>`-et (a) kap.
- `app/src/pages/previewPage/VeglegesitesChecklist.test.tsx` és
  `app/src/pages/PreviewPage.test.tsx` (1506. sor) a címet és a részlet-sort KÜLÖN
  `getByText`-tel kérdezi — az RTL alap-illesztése csak a saját szöveg-gyerekeket nézi, tehát a
  két elemet nem szabad összeolvasztani.
- `app/src/test-setup.ts` ma nem figyeli a `console.error`-t; a `vite.config.ts` `globals: true`,
  egyetlen setupFile. A repóban egyetlen `console.error` hívó van
  (`app/src/components/ErrorBoundary.tsx`), teszt nem spy-ol rá.

## Approach
- `VeglegesitesChecklist.tsx`: a részlet-sor `as="p"` → `as="span"` + `style={{ display: 'block' }}`,
  a `size="1"`/`mt="1"` változatlan. A `<span>` phrasing content, tehát érvényes a `<p>`-ben; a
  `display: block` miatt a `mt="1"` (4px) ugyanúgy hat, a `.rt-Text` osztályok ugyanazok →
  pixelre azonos. Külön elem marad, tehát a két `getByText` sértetlen. WHY-komment jelzi, miért
  nem `as="p"`, hogy egy későbbi „rendrakás" ne állítsa vissza.
- `test-setup.ts`: `console.error` becsomagolása — az `In HTML, ` kezdetű React-üzenetek
  gyűjtése, `afterEach` buktatja a tesztet. Ez a négy React 19 nesting-üzenet közös prefixe, más
  React- vagy app-log nem kezdődik így.
- NEM tartozik ide: a többi `Callout` hívás átírása (mind érvényes), a `Callout.Text`
  kiváltása/wrappelése, a `reszletek` kiemelése a `Callout.Root` testvérévé (a grid `row-gap`
  8px-e felváltaná a mai 4px-et → megváltozna a megjelenés), és bármilyen általános
  `console.error`-szigorítás a nesting-en túl.
- Ha az őr a VeglegesitesChecklist-en KÍVÜL is talál sértést, azt a záró jelentés sorolja fel és
  külön `/idea` kapja — ez a tétel nem tágul.

## Decisions
- `as="span"` + `display: block`, nem `as="div"` — a `div` ugyanúgy érvénytelen a `<p>`-ben;
  a `<Text as="label" style={{ display: 'block' }}>` minta már él
  (`app/src/pages/PaciensekPage.tsx` 133. sor).
- Az őr a `console.error` üzenet-prefixére szűr, nem minden `console.error`-ra — az
  `ErrorBoundary` szándékos logja és a jövőbeli hibakezelés-tesztek nem eshetnek el tőle.
- A komponens saját tesztje DOM-alakot állít (nincs `<p>` a `<p>`-ben), nem a konzol-figyelőre
  támaszkodik — a React fájlonként CSAK EGYSZER figyelmeztet ugyanarra a nesting-párra, tehát egy
  konzol-alapú állítás a fájl második tesztjétől kezdve hamisan zöld lenne.

## Verification
- [ ] tests — a részlet-sor szövege továbbra is külön kérdezhető a cím mellett, ÉS a
      csekklistában nincs `<p>` `<p>`-ben; a test-setup őre a teljes készleten zöld
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a részlet-sorok tördelése/térköze változatlan, a konzol
      tiszta
