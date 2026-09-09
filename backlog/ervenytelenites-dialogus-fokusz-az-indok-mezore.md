# ervenytelenites-dialogus-fokusz-az-indok-mezore
Type: bug
Source: implement-batch böngészős szelete közben mérve (2026-09-09)
Target: master
Baseline: 9d9ab5adcb8680e232a6282551e15d9dacd76716

## Goal
A verzió-érvénytelenítés dialógusa nyitáskor az indoklás-mezőbe teszi a fókuszt, nem a
„Mégse" gombra — a doki gépelni tud, amint a dialógus megjelenik.

## Current state
- `app/src/components/PatientPlanChains.tsx` — az érvénytelenítés `AlertDialog.Root` (806) és
  `AlertDialog.Content` (812); a `Field`-be zárt `TextField.Root` (818-821) id-je
  `ervenytelenites-indok`, a rajta álló `autoFocus` (821) hatástalan. A visszavonás külön
  `AlertDialog` (854-882), mezője nincs.
- A Radix `AlertDialog.Content` a saját `onOpenAutoFocus`-ában a `Cancel`-re fókuszál; a
  `@radix-ui/primitive` `composeEventHandlers` a HÍVÓ handlerét futtatja előbb, és
  `event.defaultPrevented` esetén a sajátját kihagyja. Az `onOpenAutoFocus` nincs kiszűrve sem
  a primitív `AlertDialogContentProps`-ból, sem a Themes `RemovedProps`-ából.
- Tesztek: `app/src/pages/demo/OsszesTervSection.test.tsx` „verzió érvénytelenítése" blokk —
  mindegyik eset `user.type(...)`-pal maga viszi a fókuszt a mezőre, ezért egyik sem bukott el
  a hibán.
- Precedens kontrollált dialógus kézi fókuszkezelésére:
  `app/src/pages/paciensek/UjPaciensDialog.tsx` (`visszaFokuszRef`, `zarasGuard`).

## Approach
Egyetlen alkalmazásfájl változik: `PatientPlanChains.tsx`. Az érvénytelenítés-dialógus
`AlertDialog.Content`-je kap egy `onOpenAutoFocus`-t, ami megszakítja az alapértelmezést és az
indoklás-mezőre fókuszál; a `TextField.Root` `autoFocus`-a törlődik. Új teszt az
`OsszesTervSection.test.tsx` meglévő blokkjába.

NEM tartozik ide: a visszavonás-dialógus (nincs mezője, marad a Cancel-fókusz); a dialógus
ZÁRÁSA utáni fókusz-visszaadás (külön tétel:
`dropdownmenu-alertdialog-fokusz-visszaadas`); az app többi dialógusa; a `⋯` menü
`onCloseAutoFocus` gátja.

## Decisions
- Marad az `AlertDialog`, `onOpenAutoFocus`-szal — mert a `Dialog`-ra váltás kívülre
  kattintásra is zárna, és a begépelt indok elveszne; ezt az `UjPaciensDialog` egy teljes
  záró-őrrel kerüli meg, ami itt aránytalan. A `veglegesitett-terv-ervenytelenitese` terv
  tudatos `AlertDialog`-döntése így érvényben marad.
- A mező kapja a fókuszt, nem a „Mégse" — a WAI-ARIA alertdialog „legkevésbé destruktív elem"
  szokása visszafordíthatatlan műveletre szól; itt a mentés üres indoknál tiltott (véletlen
  Enter nem indít semmit), és a jelölés ugyanabból a menüből visszavonható.
- Az `autoFocus` törlődik, nem marad tartaléknak — két egymásnak ellentmondó fókusz-deklaráció
  azt a hamis képet adná, hogy a mező magától is megkapná.
- A teszt a nyitás UTÁNI fókuszt nézi, gépelés nélkül — a meglévő esetek épp azért nem fogták
  meg a hibát, mert a `user.type()` maga fókuszál.

## Verification
- [ ] tests — a `⋯` → „Érvénytelenítés" megnyitása után a fókusz az indoklás-mezőn áll,
      gépelés nélkül; a meglévő érvénytelenítés- és visszavonás-esetek zöldek maradnak
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y — a valódi fókusz-sorrendet és a fókuszgyűrűt jsdom
      nem fedi, és a hibát is ott mértük
