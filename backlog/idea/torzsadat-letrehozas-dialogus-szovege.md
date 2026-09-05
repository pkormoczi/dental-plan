# torzsadat-letrehozas-dialogus-szovege
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 5. megállapítás

Amikor egy páciensnek még nincs önálló törzsadata, a szerkesztőbe lépéskor felugró „Törzsadat
létrehozása” ablak (`app/src/pages/patientPage/TorzsadatSyncCard.tsx`) fejlesztői fogalmakkal
kérdez: „Ennek a páciensnek még nincs önálló törzsadata — a mezők egyelőre a terv adataiból
látszanak. Létrehozod most, a lapon jelenleg látott adatokból?” A doki nem érti az „önálló
törzsadat” / „a terv adataiból” különbségtételt, sem a következményt, ha kihagyja — ezért mindig a
kevésbé elkötelező „Kihagyás”-t nyomja, és a funkció kihasználatlan marad. Repro: új páciens →
„Tovább a terv szerkesztőhöz” → a dialógus felugrik. Elvárt: laikus szöveg, a következmény
kimondásával („A páciens adatai eddig csak ebben a tervben vannak. Mentsem a kartonjára is? Ezt
később, a páciens lapján is megteheted.”); vagy a kérdés a lépésváltás helyett a véglegesítéshez
kötve. Nem ide tartozik a dialógus ismétlődő felugrása lépések közti oda-vissza navigációnál (más,
azóta megfigyelt, de még nem backlogolt hiba — `2026-09-05-doctor-review-nemet-euro.md` 1.
megállapítás) — ez a tétel csak az első alkalom szövegére szorítkozik.
