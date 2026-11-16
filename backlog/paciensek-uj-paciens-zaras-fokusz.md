# paciensek-uj-paciens-zaras-fokusz
Type: bug
Source: review:2026-11-16-manual-checks-keyboard-a11y-megerosito-ablak#1
Target: master
Baseline: 98eae4a4e016918949dfa0004ab9a0ea05434a76

## Goal
Repro: a Páciensek lapon „+ Új páciens” → Escape vagy Mégse: az ablak bezárul, a fókusz a lap
törzsére esik. Elvárt: mentés nélküli záráskor a fókusz a „+ Új páciens” gombra tér vissza, akkor
is, ha a begépelt adat elvetését előbb meg kellett erősíteni.

## Current state
- `app/src/pages/PaciensekPage.tsx`: a „+ Új páciens” `Button` ref nélkül; az `UjPaciensDialog`
  `zarasFokuszCel` nélkül kap `onOpenChange={setNewOpen}`-t. A sikeres mentés
  (`handleCreatePatient`) és a meglévő páciens választása (`onUseExisting`) a páciens adatlapjára
  navigál, tehát ott nincs a lapon belüli fókuszcél.
- `app/src/pages/paciensek/UjPaciensDialog.tsx` `zarasFokuszCel`: zárás utáni fókuszcél, a dialógus
  tényleges eltűnése után adja vissza (`components/fokuszVisszaadas.ts` `fokuszVisszaadasOnClose`);
  cél nélkül a záráskori automatikus fókusz le van tiltva.
- `app/src/pages/NewPlanPage.tsx` ugyanezt a propot már használja (a keresőmezővel).
- `app/src/pages/PaciensekPage.test.tsx`: a „"+ Új páciens" mentés után a részletoldalra navigál…” és a
  névegyezéses teszt fedi a sikeres ágakat; zárás utáni fókuszra nincs teszt.

## Approach
- `PaciensekPage.tsx`: ref a „+ Új páciens” gombra, és ez a ref az `UjPaciensDialog`
  `zarasFokuszCel`-je.
- NEM tartozik ide: az `UjPaciensDialog` és a `fokuszVisszaadas.ts` változtatása, a sikeres mentés
  utáni fókusz az adatlapon, más dialógusok fókuszcélja.

## Decisions
- Sikeres mentés után nincs külön fókuszcél a Páciensek lapon — mert mindkét sikeres ág az adatlapra
  navigál; a tételfájl erre vonatkozó nyitott kérdése ezzel megválaszolt.
- Nincs böngészős szelet — mert ugyanezt a zárás utáni mechanizmust a
  `docs/reviews/2026-11-16-manual-checks-keyboard-a11y-megerosito-ablak.md` menete valódi Chrome-ban
  igazolta; ez a tétel csak egy új hívót ad, a fókuszcélt a jsdom-teszt igazolja.

## Verification
- [ ] tests — Escape és Mégse után a „+ Új páciens” gomb fókuszban van; begépelt névnél az elvetés
      megerősítése („Bezárás, a begépelt adat elvetésével”) után is; a meglévő sikeres-ág tesztek zöldek
- [ ] typecheck/lint
- [ ] docs-check
