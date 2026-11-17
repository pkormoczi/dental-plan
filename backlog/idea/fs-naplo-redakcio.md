# fs-naplo-redakcio
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a

A telepített app diagnosztikai naplót ír (`userData/naplo/io.log` + `io.1.log`, ~1 MB-os forgatással, `fsync` nélkül), hogy egy fájlrendszeri hiba utólag kivizsgálható legyen, páciensadat kiszivárgása nélkül. Minden I/O-hiba két útvonalat hordoz: a teljeset csak a felület látja, a naplóba csak a redaktált kerül, ahol a páciens- és a tervmappa olvasható része az id-szuffixumra cserélődik (`paciensek/#ab12cd/#x9k2m1/2026-09-05_v3/terv.json`). A redaktált útvonal külön típus, a naplózó csak azt fogadja (nyers string fordítási hiba); a naplóba errno-kód és syscall kerül, az OS nyers üzenete és a `Plan` soha. Induláskor fejléc-sor: app-verzió, OS, a gyökérmappa útvonala. A Beállítások Adattárolás szekciójában „Napló megnyitása” (a szekció maga a `gyokermappa-varazslo` része). Teszt: redaktált útvonal, nincs nyers OS-üzenet, nincs tervmappa-név. Migrációs terv §5.2.
