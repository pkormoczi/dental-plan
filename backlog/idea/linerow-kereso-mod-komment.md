# linerow-kereso-mod-komment
Type: chore
Source: review:2026-11-16-manual-checks-keyboard-a11y-keresolista#1

Az `app/src/pages/planEditor/LineRow.tsx` `azonositatlan` fölötti kommentje szerint a név és tétel
nélküli, kereső módban induló sort a fogtérkép-kattintás hozza létre, és ez az egyetlen ilyen eset.
Ez már nem igaz: a `PlanEditorPage.tsx` `onToothClick` csak navigál, kezeletlen fognál semmit nem
tesz (`docs/PRODUCT.md` Nem cél), és éles kód nem hoz létre ilyen sort. A kódból olvasva a kereső
mód induló ága ma akkor él, ha a doki kiüríti egy egyedi sor nevét, és a sor újra megjelenik, vagy
kívülről érkező piszkozatnál. A komment ráadásul egy régi backlog-döntésre hivatkozik, amit a root
`CLAUDE.md` Kommentek szabálya tilt. Elvárt: a komment a mai, igazolt okot mondja ki, hivatkozás
nélkül; ha a kiürített nevű egyedi sor útja nem áll fenn, a tervezés döntse el, kell-e még az ág.
Doki-látható változás nincs.
