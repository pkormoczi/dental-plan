# Backlog 82. tétel — PDF nyilatkozat és aláírásblokk — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 82. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-076
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D541`–`D557`, `D583`–`D584`, `D587` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

## Probléma

A mai nyilatkozat+aláírás oldal (`pdf/TervDocument.tsx` 4. `<Page>`,
`!offerOnly &&`-del feltételes) és aláírásblokk (`signatureBlock`)
nagyrészt megfelel a redesignnak (AS-IS layout, csak orvosnév
dinamikus, Budapest fix, lokalizált feliratok, `wrap={false}` az
aláírásblokkon). Két konkrét eltérés maradt:

1. **A `offerOnly` forrása ma helyi React state** (`PreviewPage.tsx`
   `useState(false)`) — a 70. tétel ezt `plan.csakAjanlat` mezőre
   állítja át, aminek a PDF-oldali fogyasztását ez a tétel viszi.
2. **Nincs folytatólagos „Nyilatkozat – folytatás" cím** egy hosszú
   nyilatkozat több oldalra törésekor (D587), és nincs árva-védelem
   az utolsó bekezdés és az aláírásblokk között (D584) — ha az
   aláírásblokk nem fér ki az oldal aljára, az egész átkerül a
   következő oldalra, de az UTOLSÓ TELJES BEKEZDÉS árván maradhat az
   előző oldal alján, az aláírástól elszakítva.

## Döntések

### Már máshol lefedett / már megvan

- **`Plan.csakAjanlat` mező bevezetése, perzisztenciája, öröklési
  szabályai (Új verzió örökli, Másolás nem)** → **70. tétel**
  hatásköre, MÁR eldöntött és megtervezett. Ez a tétel a MEGLÉVŐ
  `offerOnly` propot fogyasztja a `TervDocument`-ben — a
  `PreviewPage.tsx` adja át `plan.csakAjanlat`-ot (vagy az
  `effectiveOfferOnly` derivált értéket, ha a placeholder-kényszer
  ott is megmarad) a mai React `useState` helyett. A `TervDocument`
  BELSŐ logikája (`{!offerOnly && (<Page>...</Page>)}`) NEM változik.
- **D550 (csak ajánlat módban a nyilatkozati blokk teljesen elmarad)**
  → már megvan.
- **D541/D542/D543/D545/D546/D547/D548/D549 (aláírásblokk AS-IS
  layout, csak orvosnév dinamikus, Budapest fix, lokalizált feliratok
  és dátum)** → már megvan (`signatureBlock`, `alairasSor`,
  `L.megbizott`/`L.megrendelo` stb.), nincs teendő.
- **D557 (nincs digitális aláírás)** → nincs teendő, a mai állapot
  már megfelel (nincs is ilyen mechanizmus, és nem is lesz).
- **C7/C9 sablonmodell (`Plan.sablonVerzio` törlése)** → lásd 81.
  tétel (DP-075) 1. döntése — ugyanaz a döntés vonatkozik a
  nyilatkozat sablonjára is (a `nyilatkozatVerzio` state és a
  `finalPlan.sablonVerzio` pinnelés egyben a nyilatkozatra is
  vonatkozik), nem duplikáljuk itt — az implementáció a 81. tételben
  történik, mert ott van a mező törlésének teljes érintett-hely
  listája.

### 1. D587 (Nyilatkozat – folytatás) megvalósul

A 3. blokk (Nyilatkozat + aláírás, a 76. tétel 3-blokkos vázában) a
`render` propos `subPageNumber`-ét olvasva — ha `subPageNumber > 1`, a
folytatólagos fizikai oldal tetején egy „Nyilatkozat – folytatás"
(HU) / megfelelő német felirat jelenik meg. Ez az EGYETLEN eset a
teljes PDF-en, ahol a folytatólagos-cím mechanizmus natívan
megvalósul (lásd 76. tétel, DP-070, 4. döntése) — mert a 3. blokk
pontosan EGY szakaszt (a Nyilatkozatot) tartalmaz, tehát „hányadik
fizikai oldala ennek a blokknak" pontosan azt válaszolja meg, hogy
folytatás-e.

### 2. D583 már megvan, D584 új

A MEGLÉVŐ `wrap={false}` a `signatureBlock`-on MÁR TELJESÍTI D583-at
(az aláírásblokk mindig egyben marad, nem szakad szét dátumsor és
aláírás-oszlopok között).

**D584 új:** ha az aláírásblokk nem fér ki az oldal aljára, az utolsó
TELJES nyilatkozat-bekezdés is átkerül vele együtt a következő
oldalra — nem maradhat egyedül árván az előző oldal alján, az
aláírástól elszakítva. Ez `minPresenceAhead`-del valósul meg a
nyilatkozat utolsó bekezdése és az aláírásblokk között, a 78./81.
tételben bevezetett árva-védelem mintájára (fáziscím, fizetési
feltételek/garancia cím).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A `Plan.csakAjanlat` mező bevezetése, perzisztenciája és öröklési
  szabályai — 70. tétel, MÁR eldöntött hatáskör.
- A `Plan.sablonVerzio` mező törlése — 81. tétel (DP-075), MÁR
  eldöntött hatáskör ebben a batch-ben; a nyilatkozatra vonatkozó
  `PreviewPage.tsx` `nyilatkozatVerzio` state/pinnelés ott törlődik.
- A markdown-alszintaxis bővítése, az admin-szerkesztő UX-e, sablon-
  preview a Beállításokban (D588–D594) — ez a `Nyomtatványszövegei`
  admin-szerkesztő hatásköre (jövőbeli DP-085, a 11. „Admin /
  settings" fejezet), NEM a PDF-generálás; a `pdf/markdownLite.ts` a
  formátumot már ma is támogatja (bekezdés, `**félkövér**`, lista).
- A placeholder-őr (`isPlaceholderTemplate`, D23, C8) — VÁLTOZATLAN,
  ez a mai, meglévő mechanizmus (`domain/templates.ts`), ide csak a
  4. oldal (3. blokk) renderjének feltételeként kapcsolódik, ahogy ma
  is.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pdf/TervDocument.tsx` — a 3. blokk (Nyilatkozat+aláírás)
  `render` propos folytatólagos cím-logikája; `minPresenceAhead` az
  utolsó bekezdés és az aláírásblokk között.
- `app/src/pdf/labels.ts` — új kulcs a „Nyilatkozat – folytatás"
  felirathoz (hu+de).
- `app/src/pages/PreviewPage.tsx` — az `offerOnly` prop forrásának
  cseréje `plan.csakAjanlat`-ra (a 70. tétel implementációjával
  együtt/koordinálva).

## Tesztelés (irányadó, nem kimerítő)

- Egy hosszú nyilatkozat-szöveg, ami több oldalra törik, a 2. és
  további fizikai oldal tetején „Nyilatkozat – folytatás" címet
  mutat; az 1. fizikai oldalon (a nyilatkozat kezdetén) NEM.
- Ha az aláírásblokk nem férne ki egy oldal aljára, az utolsó teljes
  nyilatkozat-bekezdés is átkerül vele együtt a következő oldalra —
  az előző oldal alján NEM marad árva bekezdés az aláírás nélkül.
- Csak ajánlat módban véglegesített terven a 3. blokk (nyilatkozat+
  aláírás) TELJESEN kimarad a PDF-ből, `plan.csakAjanlat` alapján
  (nem a régi React state alapján).
- Egy nem csak-ajánlat módú terven a nyilatkozat+aláírás oldal
  megjelenik, az orvos neve és a dátum helyesen, lokalizáltan
  jelenik meg.
