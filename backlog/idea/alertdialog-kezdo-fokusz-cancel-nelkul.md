# alertdialog-kezdo-fokusz-cancel-nelkul
Type: bug
Source: /implement-batch futás (2026-09-08) manual-checks keyboard-a11y szelete

A "A piszkozat két helyen változott" ablak megnyitásakor a fókusz kívül marad: a
billentyűzetes doki a nyitó elemen áll, és egy Tab kell, mire az ablakba jut. Repró
(izolált Chrome, 2026-09-08): a `components/PiszkozatKonfliktusDialog.tsx` két sima
`Button`-t rak az `AlertDialog.Content`-be, `AlertDialog.Cancel` nélkül; a Radix
`onOpenAutoFocus`-a ilyenkor `preventDefault`-ol, majd egy üres `cancelRef`-re
fókuszálna — így semmi nem kap fókuszt. Elvárt: nyitáskor a fókusz az ablakon belülre
kerül, ahogy a repó 13 másik `AlertDialog`-jánál. A fókuszcsapda és az Escape egyébként
működik. Ez az ablak adatvesztés-közeli döntést kér (melyik piszkozat maradjon), ezért a
néma fókusz itt különösen zavaró. Ugyanezt a hibát a `patientPage/TorzsadatSyncCard.tsx`-en
a `41a7d68` már javította — a minta onnan másolható. NEM tartozik ide: a sima `Dialog`-ok
(azok a tartalmat fókuszálják), és az elsődleges gomb `AlertDialog.Action`-né alakítása (a
beépített auto-close elrontaná a hibakezelést, lásd `UjPaciensDialog.tsx` kommentjét).
