# kezdolap-es-paciensek-lista-kattintas
Type: bug
Source: review:2026-09-08-doctor-review-paciens-elott#2

A Kezdőlap és a Páciensek lista kattintás/keresés nélkül, azonnal megmutatja más páciensek
nevét, születési dátumát és telefonszámát — pedig ezt a képernyőt jellemzően a páciens
jelenlétében nyitja meg a doki.

Repró: reset utáni Kezdőlap, semmilyen interakció nélkül — a "Legutóbbi páciensek" blokk 5
páciens nevét, telefonszámát mutatja (`Home.tsx`). A "Páciensek" fülre kattintva a teljes
(jelen seeddel 23 fős) lista jelenik meg azonnal, szűrés nélkül, névvel, születési dátummal és
telefonszámmal (`PaciensekPage.tsx`).

Elvárt: amíg a keresett páciens nevét be nem gépeli, vagy explicit nem kér rá, a doki más
páciens személyes adatát ne lássa ezen a két képernyőn.

Nyitott kérdés (a jelentésből): nem a doki dönt egyedül arról, elfogadott-e ez a viselkedés —
tisztázni kell, hogy éles használatban valóban páciens előtt nyílik-e meg ez a két képernyő, és
ha igen, elrejtés/elhomályosítás vagy más megoldás a cél, amíg nincs explicit interakció
(kereső, "mutasd" gomb).
