# newplanpage-uj-paciens-teszt-villodzik
Type: chore
Source: CI deploy-futás 2026-11-16 17:20 (run 43917358722), demo-export-akcio implementálása közben talált
Target: master
Baseline: 825f971c0280da911d511193c2f527e63f192290

## Goal
Nincs doki-látható változás: a „+ Új páciens” megerősítés utáni quick-create tesztek determinisztikusan
zöldek, egy villódzó teszt nem buktat el egy pusht és vele a Pages-deployt.

## Current state
- `app/src/pages/NewPlanPage.test.tsx` „"+ Új páciens" megerősítést kér mentetlen piszkozatnál -- Mégse
  megtartja”: a megerősítő ablak („Új páciens, piszkozat elvetésével”) bezárása után `findByRole('dialog',
  { name: 'Új páciens' })`, név begépelése, majd szinkron `within(dialog).getByRole('button', { name:
  'Mentés' })`. A 2026-11-16 17:20-as CI-futásban ez nem találta a gombot; előtte és utána zöld.
- Ugyanez az átmenet (megerősítő ablak bezárása → quick-create dialógus) a „végigvitt quick-create
  mentetlen piszkozattal: nincs második megerősítő dialógus” tesztben is; a többi
  `within(dialog).getByRole('button', { name: 'Mentés' })` (`PaciensekPage.test.tsx`,
  `PriceListAdminPage*.test.tsx`, a `NewPlanPage.test.tsx` megerősítés nélküli esetei) előtt nincs
  modális ablak.
- `app/src/pages/paciensek/UjPaciensDialog.tsx`: a „Mentés” felirata fix, csak a mentés közbeni
  ellenőrzés alatt tiltott; `app/src/components/PlanVersionActionDialog.tsx` a megerősítő `AlertDialog`.
- Valószínű ok: két egymást követő Radix-modális ablak közt a bezáródó ablak a környezetét
  ideiglenesen `aria-hidden`-nel jelöli, és a szerep szerinti szinkron keresés ilyenkor nem látja a
  gombot.

## Approach
- Előbb reprodukálás: a két érintett teszt ismételt futtatása terhelés mellett, hogy a hiba oka
  igazolt legyen, ne feltételezett.
- Javítás csak a `NewPlanPage.test.tsx` két érintett tesztjében: a „Mentés” gomb várakozó keresése a
  frissen lekérdezett quick-create dialógusban, miután a megerősítő ablak elrejtése megszűnt.
- NEM tartozik ide: alkalmazáskód, a többi teszt azonos keresési mintája, `testTimeout` emelése,
  újrapróbálkozó tesztfuttatás (`retry`).

## Decisions
- Csak tesztváltozás — mert az ok egy modálisból modálisba váltás átmeneti állapota a tesztkörnyezetben;
  ha a reprodukció alkalmazás-oldali okot mutat (a gomb a dialógus megnyílta után tartósan
  elérhetetlen), a tétel kimarad, és `bug`-ként újratervezendő.
- A két, ugyanazon az átmeneten átmenő teszt együtt javul, a többi `Mentés`-keresés nem — mert azok
  előtt nincs bezáródó modális ablak, ott a minta nem villódzik.
- Nem `retry` és nem nagyobb timeout — mert az elfedné a villódzást, nem szüntetné meg.

## Verification
- [ ] tests — a két érintett teszt ismételt (legalább 20-szori) futtatása zöld, és a teszt továbbra is
      ugyanazt bizonyítja: a megerősítés után létrejön a páciens, és a piszkozat-oldal megnyílik
- [ ] typecheck/lint
- [ ] docs-check
