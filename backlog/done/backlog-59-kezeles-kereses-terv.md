# Backlog 59. tétel — Kezelés keresés, quick items és hozzáadás — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 59. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-042
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D84`, `D99`–`D101`, `D107`–`D111` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Kulcs user-döntés:** a `D99`/`D100` (fókusz a Fog mezőre tételhozzáadás
után, Enter a Fog mezőben vissza a keresőre) **EXPLICIT ELVETVE** — lásd
1. döntés. Ez a döntés a jelen tétel EGÉSZ hatókörét meghatározza: a
„fókusz-flow" forrás-tartomány nagy része emiatt VÁLTOZATLAN marad.

## Probléma

- **D84 (kereső + gyakori tételek) MEGVAN.** `ItemPicker`
  (`pages/planEditor/ItemPicker.tsx`) ékezetfüggetlen kereséssel,
  billentyűzet-ciklussal, max. 12 találattal + „+N további" jelzéssel,
  egyedi-tétel pszeudo-opcióval. A `gyakori: true` tételek quick
  gombként a kereső ALATT, fázisonként (`PlanEditorPage.tsx:691-706`,
  `frequent` lista GLOBÁLISAN számolva `:183`, de a gombok fázisonként
  renderelnek és az adott fázisba adnak hozzá).
- **D107/108/111 MIND MEGVANNAK.** Ugyanaz a tétel többször felvehető
  (`addLine` feltétel nélküli `push`, `:218-229`); nincs sor-duplikáló
  akció (a sor-akciók kimerítő listája: leírás-toggle, mennyiség-⟳,
  becsült-ár-≈, törlés); inaktív tétel nem választható sem a keresőben,
  sem a gyorsgombok közt (`available = priceList.tetelek.filter(x =>
  x.aktiv && x.ar[currency])`, `:179-183`, ez az EGYETLEN forrás mindkét
  UI-elemhez).
- **D99 (fókusz a Fog mezőre hozzáadás után) EXPLICIT ELLENTMOND a mai,
  dokumentált fő UX-ciklusnak.** A `docs/07-felulet-rendszer.md:270-271`
  és a `CLAUDE.md` „A UX kritikus pontja" szakasza kimondja: „Tételkereső:
  gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a fókuszt. Ez
  a ciklus NEM TÖRHET EL." Ez az app dokumentált „fő versenyelőnye az
  Excellel szemben". A mai kód (`ItemPicker.tsx:110-115`
  `finishPick()`) pontosan ezt teszi, és 1 teszt közvetlenül assertálja
  (`PlanEditorPage.test.tsx:89-93`).
- **D100 (Enter a Fog mezőben vissza a keresőre) NEM LÉTEZIK** — a Fog
  mezőn nincs `onKeyDown` (`PlanEditorPage.tsx:886-898`).
- **D101 (új fázisnál kereső autofókusz) NEM LÉTEZIK** — az
  add-phase handler (`:403-412`) nem állít fókusz-célt.

## Döntések

### 1. D99/D100 elvetve — a mai fókusz-ciklus VÁLTOZATLAN marad (user-döntés)

Tételhozzáadás után a fókusz MARAD a (kiürült) keresőn — NEM ugrik a
Fog mezőre. A Fog mezőn Enter NEM navigál vissza a keresőre (a mai,
egyszerű `onChange`-only viselkedés marad). A doki a Fog mezőt Tabbal
éri el, ha ki akarja tölteni.

**Miért:** a `docs/07-felulet-rendszer.md` fejléce explicit kimondja:
„Ha valami ütközik vele, kérdezz, ne rögtönözz" — a user megkérdezve
a mai ciklus megtartása mellett döntött. A `gépel → nyíl → Enter →
gépel tovább` ciklus a CLAUDE.md szerint az app egyetlen legfontosabb
UX-pontja („ezt kell elsőként tesztelni, a PDF generálás előtt") —
egy ennyire központi, tesztelt, dokumentált viselkedés felcserélése
csak explicit user-jóváhagyással történhetett volna.

**Elvetett alternatíva:** D99/D100 szerinti csere — user által explicit
elvetve.

### 2. D101 (új fázis → kereső autofókusz) MEGTARTVA, MERT NEM ÜTKÖZIK

Új fázis hozzáadásakor az ÚJ fázis keresője automatikusan fókuszt kap
— ugyanazzal a mechanizmussal, mint az 57. tétel (D104) friss-piszkozat
autofókusza.

**Miért:** D101 célja MINDIG a kereső (nem a Fog mező) — ez teljesen
összhangban van az 1. döntéssel (a keresőre visszatérő ciklus
megtartásával), sőt ERŐSÍTI azt: minden új fázis a kereséssel indul,
ahogy a meglévő ciklus is a keresőn él.

**Megvalósítás iránya:** az 57. tétel (57. tétel/DP-040 2. döntése)
`fokuszCel` mechanizmusának újrahasznosítása — az add-phase handler az
új fázis picker-jét jelöli ki célként.

### 3. D84/D107/D108/D111 — rögzítés, nincs kódváltozás

Ezek MÁR MA IS pontosan a redesign kívánt állapotát tükrözik — a tétel
csak dokumentálja, kódot nem módosít rajtuk.

**Miért:** ugyanaz az elv, mint az 57. tételnél (rögzítés vs. hallgatás
— egy jövőbeli olvasó ne higgye tévesen nyitottnak ezeket a pontokat).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A friss piszkozat autofókusza (D104) — 57. tétel (DP-040), ahonnan
  ez a tétel a `fokuszCel` mechanizmust újrahasznosítja.
- A fázis-szintű mechanikák (összecsukás, sorrend, törlés, átnevezés,
  megjegyzés) — 58. tétel (DP-041).
- A sor mezőinek szerkesztése (a felvett sor NÉV/ár/leírás mezői) — 60.
  tétel (DP-043).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanEditorPage.tsx` — az add-phase handler (`:403-412`)
  bővítése a `fokuszCel` beállításával (2. döntés).
- `app/src/pages/planEditor/ItemPicker.tsx` `finishPick()` (`:110-115`)
  — VÁLTOZATLAN marad (1. döntés, rögzítés).
- `app/src/pages/PlanEditorPage.test.tsx:89-93` — a meglévő teszt a
  ciklusra VÁLTOZATLAN marad, nem törlendő/invertálandó.

## Tesztelés (irányadó, nem kimerítő)

- Tétel hozzáadása után a kereső üresen, fókuszban marad (a meglévő
  teszt továbbra is zöld).
- A Fog mezőn Enter NEM navigál sehova (nincs regresszió a mai
  viselkedéshez képest).
- Új fázis hozzáadásakor az új fázis keresője azonnal fókuszban van.
- Ugyanaz a tétel többször felvehető; nincs sor-duplikáló akció;
  inaktív tétel sem a keresőben, sem a gyorsgombok közt nem jelenik meg.
