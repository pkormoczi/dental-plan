# electron-navigacio-tiltas
Type: feature
Source: desktop-app-migration-plan-final.md §10.1 és §3.2 (navigáció)

A renderer hibás vagy kompromittált linkkel se navigálhasson idegen oldalra, és ne nyithasson
ellenőrizetlen új ablakot: a `will-navigate` a saját protokollon kívül tiltott, a
`setWindowOpenHandler` mindent elutasít, a `shell.openExternal` adatútvonalat sosem kap. Ez ütközik a
mai „megnyitás új lapon” úttal (`storage/openPlanPdfInNewTab.ts`, három hívó: Terv részletei, az
előnézet sikerképernyője, a Kezdőlap friss-terv kártyája): elutasított `window.open` mellett a doki a
böngészőnek szóló „engedélyezd a felugró ablakokat” üzenetet kapná, ami asztali appban értelmetlen. A
/plan dönti el, hogy a blob-PDF azonos biztonsági beállítású saját ablakban nyílik, vagy a
rendszer-PDF-olvasós „Megnyitás” megérkezéséig érthető üzenet áll a helyén. A Filerendszer fül
`target="_blank"` linkje demó-only, a demó lebontásával megy. Függ az `electron-hej-ablak`-tól.
