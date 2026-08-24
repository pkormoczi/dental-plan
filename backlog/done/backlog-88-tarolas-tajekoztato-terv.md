# Backlog 88. tétel — Tárolás tájékoztató szöveg a DEMO oldalon — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 88. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek
kidolgozása a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat
DP-087 szelete, LESZŰKÍTETT hatókörrel — az eredeti scope-ja (valódi
mappa-választás, hard startup gate, D64–D66) a `CLAUDE.md` „Két fázisú
build” elve szerint a 2. fázis (`FileSystemStorage`) hatásköre.

## Probléma

- Ma NINCS semmilyen tárolás/mappa-hivatkozás UI a Beállításokban vagy
  máshol a normál üzleti felületen — ez helyes, mert a mockup
  (`app/`) `localStorage`-alapú `DemoStorage`-ra épül, a valódi
  fájlrendszer-hozzáférés a `docs/05-technologia.md` szerint a 2.
  fázis (`FileSystemStorage`) feladata.
- A `CLAUDE.md`-vel ütköző eredeti DP-087 scope (valódi mappa-
  választás + hard gate) implementálása előrehozná a 2. fázis
  funkcióját egy `FileSystemStorage` nélkül, amit védene.

## Döntések

### 1. Leszűkített hatókör: statikus tájékoztató szöveg a DEMO → Adatkezelés fülön — EXPLICIT ELTÉRÉS a DP-087 eredeti scope-jától

Egy rövid, statikus, NEM interaktív szövegblokk kerül a DEMO →
Adatkezelés fülre (nem a Beállításokba — D64 explicit kizárja a
„normál UI”-ból a tárolás-technikai felületeket, a DEMO oldal már ma
is ez a „nem normál UI” hely, az Adatkezelés fül már ma is a
`localStorage`/adatvédelem témát viszi). Tartalma: a mockup a
böngésző helyi tárolóját (`localStorage`) használja
rendszerállapotként, nincs valódi fájlrendszer-hozzáférés; a végleges
alkalmazásban a doki egy gyökérmappát jelöl ki, Google Drive-val
szinkronizálható (`docs/05-technologia.md`-re mutató rövid utalással).
**Nincs mappa-választó, nincs gate, nincs interakció** — pusztán
tájékoztatás.

**Miért:** a user explicit megkérdezve, a minimális informatív felület
mellett döntött a teljes funkció (nem ajánlott) és a teljes kihagyás
között — a `CLAUDE.md` fázishatárát tiszteletben tartva, de a DP-087
forrás-scope „user-centered státusz” szándékát egy mockup-megfelelő
formában mégis teljesítve.

**Elvetett alternatívák:**
- Teljes kihagyás (nulla új tartalom) — elvetve; a user szerint van
  értelme egy rövid magyarázatnak, hogy a doki (vagy egy jövőbeli
  validáló) értse, miért nincs mappa-választó a mockupban.
- Valódi File System Access API-alapú mappa-választás + hard gate most
  — elvetve, mert előrehozná a `CLAUDE.md` explicit 2. fázisú
  funkcióját egy `FileSystemStorage` nélkül, amit védene.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A tényleges `FileSystemStorage` implementáció, root-mappa
  kiválasztás, hard startup gate — mind a 2. fázis hatásköre,
  `docs/05-technologia.md` már dokumentálja.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/demo/AdatkezelesSection.tsx`.

## Tesztelés (irányadó, nem kimerítő)

- A DEMO → Adatkezelés fülön megjelenik a tárolás-tájékoztató szöveg,
  statikusan, interakció nélkül.
- Nincs új mappa-választó vagy gate sehol az appban.
