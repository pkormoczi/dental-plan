# pdf-nezegeto-google-drive-gomb
Type: chore
Source: doctor-review nagy-terv (2026-09-05), 14. megállapítás

A böngésző beépített PDF-nézegetőjének saját eszköztárában egy „Save to Google Drive” gomb áll a
kezelési terv fölött — ezt nem az app teszi oda (a mockup-fázis Chrome-PDF-viewerének natív
eleme), de a képernyőn az app részének látszik, és a doki szerint „rendelőben ez zavaró és
adatvédelmileg kérdéses”. Ma nincs teendő az app-kódban — ez a mockup-fázis korlátja, ugyanúgy,
ahogy az UUID-cím is az (`belso-kodok-helyett-nevek`). Elvárt hosszú távon: az Electron-fázisban
saját PDF-nézegető, vagy a Chromium PDF-viewer eszköztárának letiltása (`#toolbar=0` az
iframe/nézegető URL-jén) — a „Letöltés” gomb az app sajátja marad, az nem érintett. Nem ide
tartozik a jelenlegi mockup-fázisban bármilyen kódmódosítás.
