# linerow-kereso-mod-komment
Type: chore
Source: review:2026-11-16-manual-checks-keyboard-a11y-keresolista#1
Target: master
Baseline: 1912e9ba075905fd553a6551579da0c6eaaff6e3

## Goal
Nincs doki-látható változás: a `LineRow.tsx` kommentje igazat mond arról, mikor indul egy sor kereső
módban, tiltott hivatkozás nélkül, és egy teszt rögzíti ezt a viselkedést.

## Current state
- `app/src/pages/planEditor/LineRow.tsx` `azonositatlan` fölötti komment: „A fogtérkép-kattintással
  létrehozott, még meg nem nevezett sor -- ez az EGYETLEN eset…”, plusz egy régi backlog-döntésre
  hivatkozás. A közvetlenül alatta álló komment szerint egy egyedi sor kiürített neve menet közben
  szándékosan nem kapcsolja vissza a keresőt (`useEffect` csak kikapcsol).
- `app/src/pages/PlanEditorPage.tsx` `onToothClick`: csak navigál, kezeletlen fognál semmit nem tesz;
  éles kód nem hoz létre név és tétel nélküli sort.
- A kereső mód tehát akkor indul, amikor egy név és tétel nélküli sor megjelenik: kiürített nevű
  egyedi sor a következő megjelenéskor (lapváltás, újratöltés), vagy kívülről érkező piszkozat.
- Nincs teszt arra, hogy az azonosítatlan sor kereső módban indul.

## Approach
- A komment átírása a fenti, kódból igazolt okra, a backlog-hivatkozás nélkül (root `CLAUDE.md`
  Kommentek).
- Egy teszt a tervszerkesztőben: név és tétel nélküli sort tartalmazó piszkozatnál a sor a névmező
  helyett a soron belüli keresőt mutatja.
- NEM tartozik ide: a kereső mód viselkedésének változtatása, a fogtérkép-kattintás, a kiürített név
  menet közbeni kezelése.

## Decisions
- A kereső mód induló ága marad — mert a kiürített nevű egyedi sor és a kívülről érkező piszkozat
  ma is előállítja; az ág nélkül egy ilyen sor üres névmezővel jelenne meg, azonosítási út nélkül.

## Verification
- [ ] tests — név és tétel nélküli sort tartalmazó piszkozat megnyitásakor ez a sor a soron belüli
      tételkeresővel jelenik meg, a megnevezett sorok névmezővel
- [ ] typecheck/lint
- [ ] docs-check
