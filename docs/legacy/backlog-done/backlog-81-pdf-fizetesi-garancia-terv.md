# Backlog 81. tétel — PDF fizetési feltételek és garancia — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 81. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-075
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`C7`–`C9`, `D576`–`D578`, `D581`–`D582`, `D585`, `D595`–`D596` a
redesign saját D1–D606 számozásából/konfliktus-listájából valók — NEM
azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A DP-075 forrásköre (C7–C9) egy MAI, dokumentált mechanizmust ír felül:
a `Plan.sablonVerzio` mezőt (`types.ts:129`), amit `PreviewPage.tsx`
véglegesítéskor pinnel (`finalPlan.sablonVerzio = nyilatkozatVerzio`),
és amiről a `docs/04-nyomtatvany-spec.md` „4. oldal" szakasza azt
állítja, hogy „megmondja, melyik szövegváltozat volt érvényes". A
redesign (C7/D595–D596) explicit ellentmond ennek: „A terv.json nem
tartalmaz `sablonVerzio`-t... A mentett final PDF elegendő történeti
dokumentum."

Ellenőrizve: a mezőt SEMMI nem olvassa vissza történeti célra (nincs
„töltsd be a v1 sablont" logika sehol a kódban) — tisztán írott, sosem
olvasott nyomkövető adat, tehát a törlése biztonságos.

Emellett egy, a redesign-től FÜGGETLEN, a vizsgálat során talált rés:
a placeholder-ellenőrzés (`isPlaceholderTemplate`) ma csak a
cross-language HU-visszaesés ágán fut
(`plan.nyelv !== 'hu' ? isPlaceholderTemplate(...) : undefined`,
`PreviewPage.tsx`) — egy MAGYAR nyelvű terven, ha a garancia sablon
maga is placeholder-jelölésű (ami ma a `GARANCIA_HU_V1` seed
tényleges állapota, lásd `backlog/BACKLOG.md` „NEM FEJLESZTÉS" 24.
tétel), a nyers `[PLACEHOLDER — a garanciafeltételek még nincsenek
megadva]` szöveg kerülne rá egy éles PDF-re.

## Döntések

### Már máshol lefedett / már megvan

- **D576–D578 (hiányzó fizetési feltételek/garancia soft warning)** →
  **67. tétel** hatásköre — a mai `sablonFallback`-alapú Callout MÁR
  MEGVAN (`PreviewPage.tsx`), a 67. tétel csak a megjelenítését
  olvasztja be az egységes checklistbe.
- **C9 (draft/preview és finalizáció mindig az aktuális globális
  sablont használja, ugyanazok a PDF-byte-ok mentődnek, mint amit a
  doki utoljára látott)** → strukturálisan MÁR MEGVAN (a
  `PreviewPage` React state-je a forrás mindkét úton) és a 68./69.
  tétel (PDF előnézet életciklus, atomikus véglegesítés) hatásköre —
  ez a tétel nem nyúl hozzá.
- **D582 (fizetési feltételek + garancia egy folyó tördelésben)** →
  76. tétel (DP-070) 3-blokkos vázában strukturálisan megoldva (2.
  blokk).

### 1. `Plan.sablonVerzio` mező törlése a sémából (C7/D595–D596)

A mező TELJESEN eltűnik: `app/src/domain/types.ts` `Plan.sablonVerzio`
mező törlődik; `app/src/domain/blankPlan.ts` már nem írja bele a
`Plan`-be (a `sablonVerzioFor(nyelv)` függvény MAGA megmaradhat, ha
más célra még kell, csak a `Plan`-re írás szűnik meg);
`app/src/pages/PatientPage.tsx` nyelvváltás-szinkronja
(`next.sablonVerzio = sablonVerzioFor(nyelv)`) törlődik;
`app/src/pages/PreviewPage.tsx` finalizációs pinnelése
(`sablonVerzio: nyilatkozatVerzio`) törlődik; a `storage/seed/plans.ts`
seed-adatokból a `sablonVerzio: 'nyilatkozat-hu-v1'` mezők törlődnek.

`schemaVersion` NEM emelkedik (D18 — csak MAGASABB verzió betöltését
kell megtagadni; egy elhagyott opcionális mező régi, localStorage-ban
élő terveken ártalmatlanul benne marad, senki nem olvassa vissza).

**Miért nem marad inert mezőként:** a C7/D595–D596 explicit, konkrét
döntés — nem finomhangolás, hanem a teljes template-verziózási modell
elvetése. Egy „marad, de senki nem olvassa" kompromisszum megtévesztő
maradna: a mező NEVE (`sablonVerzio`) és a `docs/04` mai mondata
(„megmondja, melyik szövegváltozat volt érvényes") folyamatosan
téves elvárást keltene egy jövőbeli olvasóban, holott a valódi
történeti forrás mindig a mentett PDF.

### 2. Placeholder-ellenőrzés kiterjesztése a terv SAJÁT nyelvére is (D581)

Az ellenőrzés kiterjed: a ténylegesen felhasznált sablonszöveg
(bármelyik nyelven, a HU-fallback UTÁN, azaz a végső, ténylegesen
PDF-re kerülő tartalom) placeholder-e — ha igen, a teljes szekció
(a cím sorral együtt, D581) kimarad a PDF-ből, NEM CSAK a
cross-language HU-visszaesés esetén, hanem a SAJÁT nyelvi placeholder
esetén is.

**Miért itt, nem külön tételként:** a mechanizmus (az
`isPlaceholderTemplate` predikátum alkalmazása egy adott szövegre,
majd a szekció feltételes renderelése) technikailag ugyanaz, mint a
D581 üres-szekció-kihagyás implementálásához amúgy is szükséges kód —
egy plusz `if` ág (a HU nyelv esetét is ellenőrizni, nem csak a
nem-HU-t) elhanyagolható többletmunka egy már úgyis módosuló
kódrészben. A meglévő puha figyelmeztetés (67. tétel checklist)
ettől függetlenül továbbra is jelzi a dokinak a hiányt — ez a döntés
csak a PDF-re KERÜLŐ tartalmat védi, nem helyettesíti a figyelmeztetést.

### 3. Cím-árvaság védelme `minPresenceAhead`-del (D585)

A `Fizetési feltételek`/`Garancia` cím a 78. tételben (DP-072)
bevezetett mechanizmussal (fáziscím-védelem mintájára) védett, hogy ne
maradjon árván az oldal alján az első bekezdés nélkül.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A hiányzó fizetési feltételek/garancia soft warning UI-ja és a
  checklistbe olvasztása — 67. tétel, MÁR eldöntött hatáskör.
- A PDF előnézet életciklusa és az atomikus véglegesítés — 68./69.
  tétel, MÁR eldöntött hatáskör.
- A garancia-szöveg TÉNYLEGES megírása (a magyar placeholder
  lecserélése valódi tartalomra) — `backlog/BACKLOG.md` „NEM
  FEJLESZTÉS" 24. tétel (adattisztítási ülés), változatlanul; ez a
  tétel csak a PDF-generálás VISELKEDÉSÉT javítja placeholder-tartalom
  esetén, nem magát a tartalmat írja meg.
- A dokumentum blokk-szerkezete (3 folyó blokk, `<Page>`-váltás) — 76.
  tétel (DP-070).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` — `Plan.sablonVerzio` mező törlése.
- `app/src/domain/blankPlan.ts` — a `Plan`-re írás törlése (a
  `sablonVerzioFor` függvény megtartása mérlegelendő, ha másutt nem
  kell, törölhető).
- `app/src/pages/PatientPage.tsx` — a nyelvváltás-szinkron
  `next.sablonVerzio` sorának törlése.
- `app/src/pages/PreviewPage.tsx` — a finalizációs pinnelés törlése;
  a placeholder-ellenőrzés kiterjesztése a HU-ágra is.
- `app/src/storage/seed/plans.ts` — a `sablonVerzio` mezők törlése a
  seed-adatokból.
- `app/src/pdf/TervDocument.tsx` — a fizetési feltételek/garancia
  szekció feltételes renderelése (placeholder esetén teljes kihagyás,
  címmel együtt); `minPresenceAhead` a címekre.
- `docs/04-nyomtatvany-spec.md` „2. oldal"/„3. oldal" szakasz és a
  `sablonVerzio`-ra hivatkozó mondat frissítése/törlése a tétel
  lezárásakor (KÉSŐBB, nem most).

## Tesztelés (irányadó, nem kimerítő)

- Egy frissen létrehozott, majd véglegesített terv `terv.json`-ja NEM
  tartalmaz `sablonVerzio` mezőt.
- Egy régi (a mező bevezetése előtti, mockupban `localStorage`-ban élő)
  terv betöltése és megnyitása NEM okoz hibát (a mező hiánya
  ártalmatlan).
- Egy magyar nyelvű terven, ha a garancia sablon placeholder-jelölésű,
  a PDF-en a `Garancia` cím és a szekció teljes egészében kimarad
  (nem csak a szöveg üresedik ki a cím alatt).
- Egy német nyelvű terven, ha a német garancia-sablon placeholder és
  a magyar visszaesés is placeholder, a szekció szintén teljesen
  kimarad.
- Egy német nyelvű terven, ha a német garancia-sablon placeholder, de
  a magyar visszaesés NEM az, a magyar szöveg jelenik meg (a mai
  HU-visszaesés viselkedése változatlan).
- A `Fizetési feltételek` cím nem marad árván az oldal alján az első
  bekezdés nélkül.
