# Backlog 84. tétel — Kategóriakezelés: mentési modell és hiányzó német név jelzése — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 84. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek
kidolgozása a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat
DP-081 szelete. Az itt hivatkozott `D51`/`D52`/`D76`/`D405` a redesign
saját D1–D606 számozásából valók — NEM azonosak a
`docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

- A `KategoriaPanel`/`KategoriaEditor` (`PriceListAdminPage.tsx`) ma
  autosave (D31-minta): minden sorrendezés/névváltás/színválasztás
  azonnal ír, nincs Mentés/Mégse, nincs dirty guard — ez `docs/07-
  felulet-rendszer.md`/`docs/01` D38-leírása szerint EXPLICIT
  dokumentált, szándékos állapot („Az Árlista admin marad autosave
  (D31)”).
- A lecsukott kategória-sor SEMMILYEN jelzést nem ad a hiányzó német
  névről — csak a kinyitott `KategoriaEditor` placeholder szövege
  utal rá.

## Döntések

### 1. Explicit Mentés/Mégse + dirty guard, DE csak az attribútum-szerkesztésre — EXPLICIT ELTÉRÉS a ma dokumentált autosave-elvtől

Csak a kategória-ATTRIBÚTUM-szerkesztés (név HU/DE, szín, sorrend)
kerül puffereltbe, egy közös Mentés/Mégse gombpárral a panel alján
(`useDirtyDraft` mintáján, D52). Az „+ Kategória” (létrehozás) és az
üres-kategória törlése (trash ikon) MARAD AZONNALI — identitás-
változtató műveletek (új `id`-foglalás `nextKategoriaId()`-vel, végleges
törlés), amik nem illenek egy Mégse-vel visszavonható draft-modellbe.

**Miért:** a user explicit megkérdezve, a D52 mellett döntött a ma
dokumentált autosave-elvvel szemben, DE a hatókört a saját javaslata
szerint az attribútum-szerkesztésre szűkítette — a létrehozás/törlés
autosave marad, mert ezek nem revertálhatók értelmesen egy pufferelt
draftban.

**Elvetett alternatíva:** a teljes panel (létrehozással/törléssel
együtt) egy draftba kerül — elvetve, a user a szűkebb kört választotta.

**Dokumentáció-hatás a tétel lezárásakor:** a `docs/07`/`docs/01`
D38-leírás jelenlegi „Az Árlista admin marad autosave (D31)” mondata
pontosításra szorul — az állítás innentől csak a tétel-szerkesztésre és
a kategória létrehozás/törlésre igaz, a kategória-attribútum-
szerkesztésre nem.

### 2. Panel összecsukása dirty állapotban ugyanazt a discard-megerősítést kéri, mint egy explicit Mégse

A panel összecsukása (a meglévő `useState` boolean + feltételes render
minta, `docs/07`) piszkozat esetén ugyanazt a discard-megerősítést kéri
— a Settings-tabok unmount-kezelésének mintáján (D49).

**Miért:** a panel összecsukása ténylegesen unmountolja a draft
tartalmát (feltételes render, nem CSS-elrejtés) — enélkül a doki némán
elveszítené a szerkesztését.

### 3. NavGuardContext bekapcsolása (D46)

A kategória panel dirty állapota bekapcsolódik a D46
`NavGuardContext`-be (`useNavGuard(dirty)`) — ez az ELSŐ D46-hívás a
`PriceListAdminPage.tsx`-en; a NavBar-navigáció nem mentett kategória-
módosítással mostantól megerősítést kér, ugyanúgy mint a
`PatientDetailPage`/`SettingsPage`-en.

**Miért:** a user explicit ezt választotta — mivel most valódi „nem
mentett módosítás” fogalom keletkezik ezen az oldalon, konzisztens a
D46 többi vagy­ónélküli felületével.

### 4. D405 bekerül: hiányzó DE név jelvény a lecsukott soron

A lecsukott kategória-sor is kap egy szürke „nincs DE név” jelvényt, ha
`nev.de` hiányzik — ugyanaz a vizuális minta, mint a tétel-táblázat
során.

**Miért:** D405 explicit ide (DP-081) van utalva a MÁR LEZÁRT 67. tétel
tervdokumentuma szerint is.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A tétel-attribútum-szerkesztés autosave modellje — 83. tétel
  (DP-080), változatlan.
- Az árlista-snapshot/refresh a tervekben — 61. tétel (DP-044).
- Kategória törlésének megerősítése — explicit KIVÉVE, nincs mögötte
  D-döntés, marad azonnali.
- Duplikált kategória-szín jelzése — explicit KIVÉVE, nincs mögötte
  D-döntés, a fogtérkép ütközési prioritása (D28) amúgy is felold egy
  ilyen esetet a gyakorlatban.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PriceListAdminPage.tsx` `KategoriaPanel`/
  `KategoriaEditor`/`moveCategory`/`addCategory`/`deleteCategory`.
- `useDirtyDraft` bevezetése a kategória panelhez.
- `NavGuardContext` hook bevezetése a `PriceListAdminPage.tsx`-en.
- A lecsukott kategória-sor render (D405 badge).
- `docs/07-felulet-rendszer.md`/`docs/01` D38-leírás pontosítása
  lezáráskor (1. döntés dokumentáció-hatása).

## Tesztelés (irányadó, nem kimerítő)

- Kategória névváltás/színváltás/sorrendezés nem ír azonnal — csak a
  Mentés gombra.
- Mégse visszaállítja az utolsó mentett állapotot.
- Panel összecsukása dirty állapotban megerősítést kér.
- NavBar-navigáció dirty kategória-draft mellett megerősítést kér.
- „+ Kategória” és az üres-kategória törlése továbbra is azonnali,
  nem érinti a draft állapotot.
- Egy `nev.de` nélküli kategória lecsukott sora „nincs DE név” jelvényt
  mutat.
