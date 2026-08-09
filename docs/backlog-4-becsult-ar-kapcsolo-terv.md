# Backlog 4. tétel — Sor-szintű „becsült ár" (csillag) kapcsoló — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 4. tételének ("Sor-szintű „becsült ár"
(csillag) kapcsoló") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat —
az implementáció módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

A `Sor.savos` mező (`app/src/domain/types.ts:65`) már ma is boolean, és
már ma is generikusan vezérli a PDF csillagot és lábjegyzetet
(`pdf/TervDocument.tsx:241` a sortételen, `:351`/`:382` a
`hasRange`/lábjegyzet-feltételben) — de **ma sehol nincs UI, ami
kézzel állítaná**. Egyetlen forrása van: `sorMezokTetelbol`
(`PlanEditorPage.tsx:58-68`) `savos: ar.tipus === 'SAVOS'`-ként állítja be
egyszer, a sor felvételekor, kizárólag akkor, ha az árlistai tétel maga
SAVOS típusú. Egy fix árú tétel (pl. csontpótló anyag, membrán), aminek a
mennyisége csak a műtőben derül ki, nem kaphat csillagot — ez a
`docs/08-backlog.md` Függelék B) napi konkrét kockázata (fix számként
nyomtatott, valójában bizonytalan ár).

A `LineRow` (`PlanEditorPage.tsx` kb. 538-648. sor) ma a névcella
"else" ágában (nem `uj`, azaz már azonosított sor) feltételesen egy
olvasható szöveges "sávos" jelvényt jelenít meg, ha `line.savos === true`
(kb. 559-563. sor) — ha `false`, semmi nem látszik, tehát nincs is hely,
ahonnan bekapcsolható lenne.

## Döntések

### 1. A kapcsoló szabad és kétirányú, eredet-nyilvántartás nélkül

A `savos` egyetlen boolean mező marad, bármelyik soron bármelyik irányba
átbillenthető a szerkesztőben — attól függetlenül, hogy a sor egy
árlistai FIX vagy SAVOS tételből, fogtérkép-kattintásból, vagy (a 3.
backlog-tétel megépülése után) egyedi sorként jött-e létre. Egy ma is
SAVOS árlistai tételről is levehető a csillag.

**Miért:** ez a legkisebb, a backlog saját méretbecslését ("már létezik a
mező, csak UI kapcsoló kell", ~2 óra) igazoló megoldás. Az alternatíva
(zárolás árlistai-SAVOS eredetű soron) megkövetelné, hogy a sor
megjegyezze az eredetét — vagy új mezővel (séma-bővítés, amit a backlog
mérete nem indokol), vagy a mai árlista aktuális állapotából
visszakeresve a `tetelId` alapján, ami **D7-et sértené** (a sor pillanatkép,
nem szabad az aktuális árlistából újrarajzolni). A projekt egyébként is
szabadon engedi a tényleges egységár felülírását ugyanezen a soron —
ugyanaz a bizalmi modell vonatkozik a csillagra is.

### 2. Vezérlő: csillag-ikon, az admin `gyakori`-mintájának megfelelően

Nem új komponens-minta, hanem a `PriceListAdminPage.tsx:207-221` már
meglévő megoldásának másolata: `IconButton` (`variant="ghost"`,
`color="gray"`, `size="1"`), tartalma `StarFilledIcon` bekapcsolva /
`StarIcon` kikapcsolva, szín `t.warn` be- / `t.uiTextFaint` kikapcsolt
állapotban. Statikus `aria-label="Becsült ár"` (nem állapotfüggő szöveg —
ugyanígy statikus az admin `aria-label="Gyakori tétel"`-je is).　Mindig
látszik, mindkét állapotban, nem csak bekapcsolva.

**Miért:** a `docs/07-felulet-rendszer.md` "Komponensek" szabálya szerint
minden UI elem Radix-ból jön, és a projekt már megoldotta ugyanezt a
UI-mintát (boolean sor-jelző, csillaggal) egy másik táblázatban — nincs ok
új mintát bevezetni. A mindig-látható ikon oldja fel azt, hogy ma
kikapcsolt állapotban semmi nem jelzi, hova kellene kattintani a
bekapcsoláshoz.

### 3. A mai szöveges "sávos" jelvény megszűnik

Bekapcsolt állapotban a betöltött, `t.warn` színű csillag-ikon önmagában
adja az állapotjelzést; a mai `<Text size="1" ... >sávos</Text>` jelvény
(kb. 559-563. sor) törlődik.

**Miért:** a szöveg redundáns lenne az ikon mellett egy már ma is sűrű
sorban, és az `aria-label` adja a szöveges (kereshető/felolvasható)
magyarázatot. **Következmény:** ez eltöri a meglévő
`PlanEditorPage.test.tsx:105` tesztet
(`expect(screen.getByText('sávos')).toBeInTheDocument()`), amit át kell
írni az ikon állapotára/aria-labeljére.

### 4. Elhelyezés: a Beavatkozás cellán belül, a névszöveg után

Nincs új táblázatoszlop. Az ikon a névszöveg UTÁN kerül, ugyanabban a
cellában, mint ma a (megszűnő) "sávos" jelvény — a `HuChip`/kedvezmény-
badge elé, közvetlenül a név mellé, mert ez a legszorosabban a névhez
kötődő állapotjelző.

**Miért:** a `docs/07-felulet-rendszer.md` szerint a táblázat sűrű
adattábla, nem bővíthető szabadon új oszloppal egy kis, soronkénti
kapcsolóért; a meglévő cellán belüli elhelyezés nem növeli a táblázat
szélességét.

**Hatókör:** a kapcsoló csak az azonosított soron (a `LineRow` "else"
ágában, nem az `uj`/`ItemPicker` ágban) jelenik meg — ugyanott, ahol ma a
"sávos" jelvény és a kedvezmény-badge is látszik. Ez ma kizárólag
árlistai tételből felvett sorokra vonatkozik, mert `tetelId === ''` sor
ma mindig az `uj` (kereső) ágban van, amíg tétel nem választódik. Ha a 3.
backlog-tétel (szerkeszthető sornév + egyedi sor) megépül, ugyanez a
kapcsoló változtatás nélkül fog megjelenni az akkor létrejövő egyedi
sorokon is — a 3. tétel döntési dokumentuma (`docs/backlog-3-sornev-egyedi-sor-terv.md`
7. döntés) ma explicit `savos: false`-ra zárja az egyedi sort, ezt majd a
3. tétel implementálásakor kell feloldani erre a kapcsolóra hivatkozva.

### 5. Nincs hatás a számításra, csak a megjelenítésre

A `savos` mező ma sehol nem szerepel összegzési/kerekítési logikában
(`domain/totals.ts`, `domain/money.ts`) — kizárólag a PDF csillag/
lábjegyzet (`hasRange`, `pdf/TervDocument.tsx:351`) és a szerkesztőbeli
`tenylegesEgysegar` mező keret-színe (`borderColor: discount ||
line.savos ? t.brand : t.controlBorder`, kb. 626. sor) olvassa. Ez a
tétel egyik meglévő olvasási helyet sem módosítja, csak az írási utat
(kézi kapcsoló) adja hozzá.

**Miért:** ezt a kutatás konkrétan megerősítette (nincs `savos`
hivatkozás `totals.ts`/`money.ts`-ben) — nincs rejtett mellékhatás, amit
kezelni kellene.

### 6. Tesztelés

A méretbecslés (~2 óra) mellett is három teszt indokolt:

- A törött `PlanEditorPage.test.tsx:105` javítása az ikon állapotára/
  aria-labeljére.
- Új interakció-teszt: egy FIX árú (nem árlistai-SAVOS) soron kattintás a
  csillagra bekapcsolja (ikon állapot/szín változik), újra kattintás
  kikapcsolja — mindkét irány.
- Új (vagy kibővített) PDF-oldali teszt, ami igazolja, hogy egy
  **manuálisan** bekapcsolt, nem árlistai-SAVOS-eredetű soron is
  megjelenik a nyomtatványon a csillag és a lábjegyzet — ez a tétel
  tényleges célja (D15 kiterjesztése), ezért ne csak a UI-kattintást,
  hanem a nyomtatványig érő hatást is bizonyítsa.

**Miért:** a interakció-teszt önmagában csak azt bizonyítaná, hogy a mező
frissül — a tétel valódi értéke (jogi védelem olyan soron is, ami nem
árlistai SAVOS) csak a PDF-oldali teszttel bizonyított.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Egyedi sor (`tetelId === ''`, gépelt névvel) `savos`-kapcsolása** — a
  3. backlog-tétel hatóköre; ez a tétel csak előkészíti (a kapcsoló
  ugyanabban a cellaágban él, ahova az egyedi sor is kerül majd), de nem
  módosítja a `docs/backlog-3-sornev-egyedi-sor-terv.md` 7. döntését.
- **`schemaVersion` emelés** — nem szükséges, a `Sor.savos` mező már ma is
  létezik, ez a tétel csak egy meglévő mezőhöz ad írási UI-t.
- **Tömeges/árlista-szintű "becsült" jelölés** — ez a tétel kizárólag
  soronkénti, terv-példányra vonatkozó kapcsoló; nem írja vissza az
  árlistai tétel `ar.tipus`-át.

## Érintett helyek (tájékoztató, nem kimerítő -- a végleges elhelyezésért lásd az Utóirat)

- `app/src/pages/PlanEditorPage.tsx`
  - Import kiegészítése: `StarIcon`, `StarFilledIcon` a
    `@radix-ui/react-icons`-ból (ma csak `Cross1Icon`, `InfoCircledIcon`
    van importálva, kb. 22. sor).
  - `LineRow` névcella (kb. 556-570. sor) — a mai feltételes "sávos"
    `<Text>` cseréje egy mindig látható `IconButton`-ra, ami
    `onPatch({ savos: !line.savos })`-t hív; a `patchLine` (kb. 145-149.
    sor) már létező mechanizmus erre.
- `app/src/pages/PlanEditorPage.test.tsx:93-106` — a "shows a SAVOS
  (sávos) price range..." teszt asszerciójának cseréje szövegkeresésről
  ikon-állapot/aria-label keresésre.
- `app/src/pdf/TervDocument.tsx` — nincs kódmódosítás (a `hasRange`/
  csillag/lábjegyzet már ma is generikusan a `savos` mezőt olvassa),
  csak az ezt igazoló teszt bővül/készül.

## Utóirat (2026. augusztus 9., még aznap) — a 2. és 4. döntés felülírása

A fenti terv szerint valósult meg elsőként a kapcsoló, de két, ugyanazon a
napon történt iteráció felülírta a 2. és 4. döntést:

1. **Első iteráció** (`a7323d3`): a csillag-ikon a névcellából átkerült egy
   "≈ Becsült" szövegű, pirula alakú `Button`-ra, az immár "Ajánlati ár"-ra
   átnevezett ár-cellába (`LineRow` ár-cella, az ár `NumberField` mellett,
   az oszlop 112px → 200px szélesedett) — mert a névcellás csillag
   összetéveszthető volt a `PriceListAdminPage.tsx` "gyakori"-csillagával.
2. **Második iteráció** (grill-me munkamenet, ugyanaznap): a pirula túl
   széles volt a 200px-es oszlopban, szorongatta az ár `NumberField`-et. A
   vezérlő visszatért a 2. döntésben leírt ghost `IconButton`-mintához
   (nincs kitöltött háttér, csak a glyph színe jelez), de tartalma nem
   `StarFilledIcon`/`StarIcon`, hanem egy `≈` szövegglyph (nem SVG ikon,
   nem sérti a `docs/07-felulet-rendszer.md` "csak `@radix-ui/react-icons`"
   szabályát) — a csillag ugyanis már ki volt zárva a "gyakori"-jelöléssel
   való összetéveszthetőség miatt. Az oszlopszélesség 200px → 148px.

**Végleges állapot:** `LineRow` ár-cella (`PlanEditorPage.tsx` kb. 691-724.
sor), ghost `IconButton` (`variant="ghost"`, `color="gray"`, `size="1"`),
tartalom `≈`, szín `t.warn` be- / `t.uiTextFaint` kikapcsolt állapotban,
`aria-label="Becsült ár"` és a `title` szöveg változatlan az eredeti (1.
iterációt megelőző) tervhez képest. A "Beavatkozás" (név) oszlop fix
`width` nélküli, a felszabaduló hely oda folyik.