# veglegesites-visszavonhatatlansag-jelzes
Type: feature
Source: doctor-review papirrol (2026-09-05), 7. megállapítás
Kerdes: Hányszor fordult elő, hogy egy kész tervet a kinyomtatás után még módosítanod kellett (elírás, ár)? Mit csináltál ilyenkor a már kiadott papírral?

A „Véglegesítés és mentés” gomb egyetlen kattintással, megerősítés nélkül zár le egy
visszavonhatatlan lépést (`attemptFinalize`, `app/src/pages/PreviewPage.tsx` — a megerősítő lánc
szándékosan szűnt meg a puha tételeknél). A doki utólag lepődött meg: „egy visszavonhatatlan
lépésnél számítottam volna rá”; a gomb neve „mentés”, ami a fejében visszavonható, a
„véglegesítés” szót először nem értette. Egy félrekattintás egy `_v1`-et hoz létre, amit csak új
verzióval lehet „javítani”, és a lánc megmarad. Nem feltétlenül dialógus: elég lehet a gomb
alatt egy sor („véglegesítés után a terv nem módosítható, csak új változat készíthető”), vagy
egyetlen megerősítés csak akkor, ha a doki az előnézetet még nem görgette végig. Kizárt scope: a
puha checklist-tételek megerősítő láncának visszahozása. Siker: a doki a kattintás előtt tudja,
hogy a lépés visszavonhatatlan.
