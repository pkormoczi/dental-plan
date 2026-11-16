# product-adatvedelmi-szoveg
Type: chore
Source: desktop-app-migration-plan-final.md §10.0, doki döntés 2026-11-16

A tétel a PRODUCT.md egyik hard invariánsának megfogalmazását érinti, a tartalmát nem: az app
továbbra sem továbbít páciensadatot. Ma a „Páciens- és kezelési adat sosem hagyja el a helyi
gépet” mondat ellentmond annak, hogy a gyökérmappa Google Drive-val tükrözött, és a Drive a fájlt a
felhőben is tárolja. Az új szöveg: „Az alkalmazás nem továbbít páciensadatot: nincs backend,
telemetria, analytics, remote logging, külső AI/API. A rendelő által beállított Drive-kliens végzi
a felhőszinkront (My Drive, Tükrözés mód, Google Workspace DPA).” Ugyanekkor törlődik az
„append-only írás mellett nem keletkezik conflicted copy” állítás, bekerül a gépváltási szabály,
és a negyedéves külső másolat havira szigorodik. A root `CLAUDE.md` invariáns-sorát a `/plan`
vesse össze ugyanezzel; a PRODUCT.md budgetje szűk.
