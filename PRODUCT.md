# PRODUCT.md — termékszándék

Ez a fájl azt mondja ki, amit a kódból és a tesztekből nem lehet levezetni: miért létezik az app, kinek,
mi nem cél, és milyen adat-/jogi korlát nem tárgyalható. Az aktuális viselkedés forrása a kód + a futó
tesztek; ez a fájl szándékot rögzít.

## Mi ez

Egyetlen rendelő (Mándoki Dental), egyetlen fogorvos belső eszköze kezelési terv és árajánlat
készítésére — nem termék, nincs több rendelő, nincs bejelentkezés. Az Excel-alapú elődöt váltja, mert:

- az árlookup `INDEX()`-szel, sorindex alapján ment — egy beszúrt sor minden korábbi tervben némán más
  árat mutatott, egy páciens által aláírt dokumentumban;
- a tábla LinkedCell-jei szétestek („A 4. sor nem működik, ezért kihagyva!”);
- kemény limit: max 3 fázis, fázisonként 7–9 sor;
- nincs tervtörténet és verziókövetés.

## Napi flow

1. Páciens kiválasztása vagy létrehozása (törzsadat), majd a terv adatai (nyelv, pénznem, orvos, dátumok).
2. Tételfelvitel billentyűzettel: gépel → `↑`/`↓` → `Enter` hozzáad → a kereső kiürül és visszakapja a
   fókuszt → gépel tovább. Ez a ciklus dönti el, hogy gyorsabb-e az Excelnél; egér nélkül kell működnie.
3. Előnézet + véglegesítési checklist → PDF letöltés/mentés új verzióként.
4. Korábbi terv új verzióra nyitása: a keltezés/érvényesség a betöltés pillanatában frissül, a többi
   mező pillanatkép.

## Adat- és deployment-korlátok

- A terv tartalma (név, születési idő, lakcím, TAJ, beavatkozások) **GDPR 9. cikk szerinti különleges
  adat**. A fejlesztő semmilyen minőségben nem kerül az adatkezelési láncba.
- **Páciens- és kezelési adat sosem hagyja el a helyi gépet.** Nincs backend, adatbázis, telemetria,
  analytics, remote logging, külső AI/API hívás. Gépi őr: CSP az `index.html`-ben (Vite-plugin) és
  oxlint-tiltás a hálózati globálisokra; ezek nem lazíthatók.
- A doki egy **gyökérmappát** jelöl ki — ez a teljes rendszerállapot, Google Drive-val tükrözve. A
  Drive **Tükrözés** módban legyen, nem Streamelésben; append-only írás mellett nem keletkezik
  `conflicted copy`.
- Rendelői teendők: Google Workspace (van DPA), nem ingyenes Gmail; a gyökérmappa ne a `Letöltések`
  (OneDrive-ra szinkronizálhat); BitLocker; a Drive nem backup — negyedévente külső másolat.
- Windows 260 karakteres útvonalkorlát → rövid mappanevek. A páciensmappa nevében **az ékezetek
  maradnak** (a doki a Fájlkezelőben névre keres); csak a tiltott `/ \ : * ? " < > |` cserélődik.

## Két fázis

1. **Mockup** (ez él): GitHub Pages, `localStorage`-alapú tároló, demó adat — valódi páciensadat nem
   kerül bele. Cél: a doki validálja a UX-et.
2. **Végleges**: Electron + `FileSystemStorage` a `PlanStorage` interfész mögött; minden más (domain,
   UI, PDF) változatlan. Egy Chromium mindkét platformon = bájtra azonos PDF. Terv:
   `docs/06-veglegesites-terv.md`.

## A nyomtatvány szerződéses dokumentum

Az aláírt PDF-ből következő szabályok — jogi, nem stíluskérdések:

- **Sávos ár** csak `*` + lábjegyzettel, sosem csupasz szám (fix szám kötelező érvényű ajánlat lenne). A
  sor `savos` mezője dönt, nem az árlista ártípusa — a doki kézzel is jelölhet becsültnek.
- **Kedvezmény** csak a szerkesztőben látszik, a nyomtatványon soha (sem összeg, sem százalék).
- **Placeholder-jelölésű vagy üres nyilatkozat** mellett a nyilatkozat + aláírás oldal nem kerülhet PDF-be:
  a „csak ajánlat” mód kényszerített. A véglegesített terv rögzíti, hogy a kiadott PDF tartalmazta-e.
  Placeholder fizetési feltételek/garancia a címével együtt kimarad.
- **Mentett terv pillanatkép**: sosem rajzolódik újra az élő árlistából; az `osszesitok` a fájlból igaz,
  eltérésnél figyelmeztetés. Verziómappa sosem íródik felül, csak `_v<n+1>` keletkezik.
- **Pénz egész szám** a pénznem alapegységében (HUF forint, EUR cent). Szám sosem `toLocaleString()`:
  elválasztó a nyelvtől, tizedes és jel a pénznemtől (`1 234 567 Ft`, `1 234,56 €`, `1.234.567 Ft`,
  `1.234,56 €`). Rövid dátum kézzel formázva (a `de-DE` Intl vezető nulla nélkül adna, a lábléc jogi
  metaadat).
- **Német terven** lefordítatlan tételnév vagy a fogtérképen megjelenő kategória blokkolja a véglegesítést.
  A tétel-leírás hiányzó német fordítása némán elmarad, nem esik magyarra (vegyes nyelvű leírás rosszabb
  a hiánynál).
- **Unicode font** (NotoSans) regisztrálva: a beépített Helvetica nem tud ő/ű — csak a kész PDF-en látszik.
- **Márka** a drmandoki.hu-t követi (`#976445` / `#f77409`); a narancs soha nem szövegszín (fehéren 2,82:1).

## Nem cél

- Multi-tenancy, felhasználókezelés, auth a fő flow-ban.
- Mobil felület.
- Automatikus HUF↔EUR átváltás — minden ár pénznemenként, kézzel; a pénznemváltás munkaállapota sosem
  kerül nyomtatványra.
- Statisztika, riport (a „gyakori” jelölés kézi, nem használati adatból).
- Szerveroldali komponens bármilyen formában.
- EESZT-integráció és e-mail-küldés az appból: legfeljebb távlati backlog-ötlet, nem az MVP része.
- A `Fog` mező jegyzetmezővé válása elfogadott (szabadszöveget elbír, automatika ekkor nem indul).

## Szándékos hiányok és nyitott kérdések

- A német tételnevek **orvosi**, a nyilatkozat és a fizetési feltételek **jogi lektorálása** nyitott:
  ma AI-fordítás, a doki 2026-08-10-i döntésére jelölés nélkül élesítve. A PDF fix mondatai
  (`pdf/labels.ts`) a lektorálás review-artefaktuma.
- A garancia-szakasz mindkét nyelven placeholder — a doki adja meg a Beállításokban.
- Az EUR árak egyszeri árfolyam-becslés; véglegesítésük a doki adatmunkája.
- A `terv.json` PDF-be ágyazása a 2. fázis része, ma nincs.
- Cégadatok a lábléchez (adószám, cégjegyzékszám) hiányoznak.
- `paciens.json` és `terv-cimke.json` csak kereső-index, sosem system of record; a
  `paciens-adatok.json` viszont az a saját mezőire — nincs automatikus szinkron a terv `paciens`
  pillanatképével egyik irányban sem.
