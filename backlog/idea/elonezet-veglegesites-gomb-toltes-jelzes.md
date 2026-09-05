# elonezet-veglegesites-gomb-toltes-jelzes
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 6. megállapítás

Az Előnézet első megnyitásakor (nagyobb tervnél kb. 3–5 s-ig) a „Véglegesítés és mentés” gomb
szürkén, magyarázat nélkül vár, a PDF helyén üres szürke doboz áll. Ok: a gomb
`disabled={busy || !!pdfError || vanKemenyBlokk(csekklista)}` (`app/src/pages/PreviewPage.tsx`),
de a „PDF frissítése…” felirat csak a KÉSŐBBI, `pdfStale` frissítés-ágon jelenik meg — az ELSŐ
renderelésnél, amíg `pdfInstance.url` még nincs, sem gomb-felirat, sem letöltés-gombcsoport nem
látszik (az egész `<Button>` blokk `pdfInstance.url &&` mögé van zárva). A doki a szürke gombot és
a sárga checklist-figyelmeztetéseket együtt látva azt hiszi, a figyelmeztetések tiltják a
véglegesítést. Repro: Előnézet megnyitása egy több fázisos, sok soros tervnél. Elvárt: „Nyomtatvány
készül…” felirat a szürke gomb mellett és az üres dobozban, amíg `pdfInstance.url` még nincs —
ugyanaz a minta, ami a `pdfStale` ágon már létezik. Nem ide tartozik a checklist-figyelmeztetések
szövegezése (`checklist-figyelmeztetes-szovege`).
