# Backlog 57. tétel — Kezelésszerkesztő oldal alaplayout és fogtérkép — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 57. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-040
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D70`–`D74`, `D92`–`D104` a redesign saját D1–D606 számozásából valók —
NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Fontos keretezés:** D70 explicit kimondja, hogy a kezelésszerkesztő
„alapvetően AS-IS" — a `docs/03-funkcionalis-spec.md` § 3 ma is
részletesen dokumentálja a jelen felületet, ez egy érett, leszállított
képernyő. A feltárás szerint ennek a tételnek a hatóköre (a
fázis-szintű mechanikáktól — összecsukás/sorrend/törlés/átnevezés/
megjegyzés — élesen elválasztva, azok az 58. tételbe tartoznak) döntő
többségben RÖGZÍTÉS, egyetlen genuinly hiányzó darabbal (D104).

## Probléma

- **D71 fogtérkép alapból csukva**: MÁR MA IS így van
  (`components/ToothChartPanel.tsx:31`, `useState(false)`), feltételes
  renderrel (nem csak CSS-sel rejtve, `:67-83`), így Tab-sorrendből is
  teljesen kiesik csukott állapotban.
- **D92 összegzés csak a lista végén**: MÁR MA IS így van
  (`PlanEditorPage.tsx:417-457`, a fázis-lista és a „Fázis hozzáadása"
  gomb UTÁN, a `Summary`/`KerekVegosszegBlokk`/`ElolegBlokk` egy közös
  blokkban). Sehol máshol (fejléc, workflow-héj) nincs végösszeg.
- **D104 friss draft: első fázis nyitva + kereső autofókusz**: az
  „első fázis nyitva" fele triviálisan teljesül (fázis-összecsukás ma
  egyáltalán nem létezik, lásd 58. tétel). Az AUTOFÓKUSZ fele
  HIÁNYZIK: az `ItemPicker` `autoFocus` propja alapból `false`
  (`pages/planEditor/ItemPicker.tsx:58,78`), és a fázis-szintű
  picker-példány (`PlanEditorPage.tsx:682-689`) nem adja át. A fájlban
  MÁR LÉTEZIK egy újrahasznosítható minta: a `fokuszCel` state +
  render-utáni fókusz-effekt (`:154-172`), ami ma csak SORON belüli
  picker/Fog-mezőkre céloz (fogtérkép-kattintásból), a fázis-szintű
  picker `id` propja pedig egyáltalán nincs beállítva (`ItemPicker.tsx:
  66-67` létezik a lehetőség, `PlanEditorPage.tsx:682` nem él vele).

## Döntések

### 1. D70/D71/D92 — rögzítés, nincs kódváltozás

A fogtérkép csukott alapállapota és az összegzés lista-végi
elhelyezése MÁR MA IS a redesign kívánt állapotát tükrözi. Ez a tétel
csak dokumentálja ezt, kódot nem módosít ezen a két ponton.

**Miért:** a tétel-nyitás célja a redesign D-döntések és a mai
implementáció közötti eltérések feltárása és lezárása — ahol nincs
eltérés, azt explicit rögzíteni kell, hogy egy jövőbeli olvasó ne
gondolja tévesen nyitott kérdésnek.

### 2. D104 autofókusz — a meglévő `fokuszCel` minta bővítése

Egy vadonatúj (üres) piszkozat megnyitásakor a fázis-szintű
`ItemPicker` automatikusan fókuszt kap — a MEGLÉVŐ `fokuszCel`
render-utáni fókusz-mechanizmus bővítésével, NEM egy második,
párhuzamos fókusz-kezelő bevezetésével. A „vadonatúj piszkozat"
detektálása a MEGLÉVŐ `piszkozatTartalmas()` (`domain/piszkozat.ts:
56-61`) segítségével dönthető el.

**Miért:** D104 explicit ezt kéri; a `fokuszCel` minta már pontosan
erre a célra való (DOM-id alapú, render utáni fókuszálás), csak eddig
nem terjedt ki a fázis-szintű picker-re, mert annak nem volt `id`-je
kiosztva.

**Elvetett alternatíva:** egy külön `useEffect` a komponens
tetején, `document.querySelector`-ral — elvetve, mert a `fokuszCel`
minta már létezik pontosan erre, egy második mechanizmus
indokolatlan duplikáció lenne.

**Fontos korlát:** az autofókusz KIZÁRÓLAG az ELSŐ fázis keresőjére
vonatkozik, egy VADONATÚJ (még tartalmatlan) piszkozaton — egy
visszatöltött, már tartalmas terv (pl. „Új verzió" megnyitása) NEM
kaphat automatikus fókuszt, mert az elvinné a doki figyelmét egy már
kitöltött listáról.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Fázis-szintű összecsukás, sorrendezés, törlés, átnevezés, megjegyzés
  — 58. tétel (DP-041); ez a tétel a D70–74/D92–104 forrás-tartományból
  KIZÁRÓLAG az oldal-szintű alaplayoutot és a fogtérképet fedi.
- A tételkereső, gyorsgombok, fókusz-flow tételhozzáadás UTÁN — 59.
  tétel (DP-042).
- A sor mezőinek szerkesztése — 60. tétel (DP-043).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/planEditor/ItemPicker.tsx` — az `id` prop tényleges
  átadása a fázis-szintű példányon (2. döntés).
- `app/src/pages/PlanEditorPage.tsx:154-172` (`fokuszCel` mechanizmus),
  `:682-689` (fázis-szintű `ItemPicker` példány) — bővítés (2. döntés).
- `app/src/domain/piszkozat.ts` `piszkozatTartalmas()` — a „vadonatúj
  piszkozat" detektálás újrahasznosítása (2. döntés).

## Tesztelés (irányadó, nem kimerítő)

- Egy vadonatúj (üres) piszkozat megnyitásakor a fázis-szintű kereső
  azonnal fókuszban van.
- Egy visszatöltött, tartalmas terv (pl. „Új verzió") megnyitásakor
  NINCS automatikus fókusz.
- A fogtérkép-panel továbbra is alapból csukva nyílik.
- Az összegzés-blokk továbbra is kizárólag a fázis-lista végén jelenik
  meg.
