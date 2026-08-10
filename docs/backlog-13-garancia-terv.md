# Backlog 13. tétel — Garancia szakasz a nyomtatványon — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 13. tételének ("Garancia szakasz a
nyomtatványon") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat —
az implementáció módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

Az első körös doktor-nap narratíva C) napi review egyik konkrét, ma
megválaszolatlan pácienskérdése: „Van rá garancia?" A nyomtatványon ma
nincs semmilyen garanciális tartalom, és a doki ezt fejben, szóban mondja
el a páciensnek.

A backlog-tétel explicit módon a fizetési feltételek mai
sablon-mechanizmusának újrahasznosítását írja elő
(`app/src/storage/seed/templates.ts`, `app/src/pdf/markdownLite.ts`,
`app/src/pages/SettingsPage.tsx` sablonszerkesztője, `PreviewPage.tsx`
betöltés + `TervDocument.tsx` megjelenítés) — ez a döntéssorozat ennek a
mechanizmusnak a pontos, harmadik szakaszkénti bekötését rögzíti.

## Döntések

### 1. Tartalom modell: statikus, terv-független szöveg

A Garancia szakasz szövege — pontosan úgy, mint a fizetési feltételeké —
EGYETLEN, a Beállításokban szerkeszthető HU/DE szövegblokk, ami minden
tervnél változatlanul jelenik meg, függetlenül attól, milyen tételek/
kategóriák szerepelnek az adott tervben. Nincs kategóriánkénti dinamikus
logika (pl. "csak akkor jelenjen meg az implantátum-garancia mondat, ha
van implantátum sor").

**Miért:** ez illeszkedik a backlog saját méretbecsléséhez (fél nap kód)
és az explicit "ugyanaz a sablon-mechanizmus, mint a fizetési
feltételeknél" instrukcióhoz. A kategóriafüggő változat új adatmodellt
(garanciaidő kategóriánként, `Tetel`/`Sor` bővítés) igényelne, ami messze
túlmutatna ezen a tételen — ha a doki később ezt akarja, az egy külön,
nagyobb tétel (hasonló a KÉSŐBB listán szereplő "valódi összetett
csomag-tétel" gondolatmenethez).

### 2. Elhelyezés: új, önálló oldal

A Garancia egy ÚJ `<Page>`, közvetlenül a fizetési feltételek oldala UTÁN
és a nyilatkozat+aláírás oldal ELŐTT:

```
1. oldal: Terv és ár
2. oldal: Fizetési feltételek
3. oldal: Garancia            <- új
4. oldal: Nyilatkozat + aláírás (csak teljes módban)
```

**Miért:** a doki választása — nem ráfűzve a fizetési feltételek oldalára,
hogy a szakasz mindig egyben, tördelési meglepetés nélkül jelenjen meg (a
`Footer` oldalszámozása amúgy is dinamikus render-propból jön, lásd
`pdf/TervDocument.tsx:282-291`, tehát az eltolódó oldalszám sehol nincs
hardkódolva).

### 3. Látszik „Csak ajánlat" módban is

A Garancia oldal NEM esik a `{!offerOnly && ...}` feltétel alá — mindkét
módban (aláírandó teljes dokumentum ÉS hazavihető, csak-ajánlat verzió)
megjelenik, ugyanúgy, ahogy ma a fizetési feltételek oldala is mindkét
módban látszik, és csak a nyilatkozat+aláírás oldal marad ki
csak-ajánlatnál.

**Miért:** a doki választása — a garancia tájékoztató jellegű, nem maga az
aláírás tárgya, és pont a hazavitt példánynál kérdezné rá a páciens
legvalószínűbben.

### 4. Szövegstílus: normál, mint a fizetési feltételek

A Garancia szöveg a `s.paragraph`/`s.bulletText` stílust kapja (9.5pt),
NEM a nyilatkozat `s.legalParagraph`/`s.legalBulletText` szorosabb, jogi
kinézetű stílusát (8.5pt).

**Miért:** a doki választása — nem jelezzük vizuálisan jogilag kötelező
ígéretnek, tájékoztató szakaszként fest, mint a fizetési feltételek.

### 5. Sablon-mechanizmus: új `garancia` alapnév, a meglévő infrastruktúra újrahasznosításával

Új alapnevek: `garancia-hu`, `garancia-de` — ugyanabban a mintában, mint
`nyilatkozat-hu`/`fizetesi-feltetelek-hu` stb. Ehhez:

- `TEMPLATE_HEADINGS` bővül `'garancia-hu': 'Garancia'` és
  `'garancia-de': 'Garantie'` bejegyzésekkel (`storage/seed/templates.ts`).
- `SettingsPage.tsx` `TemplateSlotKey` uniója és `TEMPLATE_SLOTS` tömbje
  kap egy harmadik bejegyzést (`{ key: 'garancia', label: 'Garancia',
  rows: ~9 }`) — a betöltő/mentő/dirty-tracking logika már generikusan a
  `TEMPLATE_SLOTS`/`templateBase()` fölött iterál, ezért ott NEM kell más
  kódváltozás.
- `PreviewPage.tsx` egy harmadik `loadOrFallback` hívást kap
  (`garancia-${plan.nyelv}` → `garancia-hu` fallback), a meglévő
  nyilatkozat/fizetési feltételek mintájával megegyezően; a
  `sablonFallback` jelző a harmadik betöltés `fellback`-jét is figyelembe
  veszi.
- `storage/DemoStorage.ts` `DEFAULT_TEMPLATES` tömbje két új sort kap
  (`garancia-hu-v1.md`, `garancia-de-v1.md`) — az `ensureSeedTemplates()`
  és `loadLatestTemplateByBase()` már generikusak, nincs bennük
  szükséges kódváltozás, csak adatbővítés.

**Miért:** ez a meglévő infrastruktúra pontosan erre lett építve (két
sablon helyett három) — a backlog fél napos becslése ezen a
felismerésen alapul, és a kutatás megerősítette, hogy a betöltő/mentő
logika egyik helyen sincs kétre hardkódolva.

### 6. Nincs verzió-pinnelés a `Plan` sémában

A Garancia a fizetési feltételek mintáját követi: NINCS hozzá tartozó
`Plan`-mező (szemben a nyilatkozattal, amit a `sablonVerzio` pinnel
véglegesítéskor). Mindig a legfrissebb elérhető `garancia-{nyelv}`
sablon jelenik meg generáláskor — sem a `domain/types.ts` `Plan`
interfésze, sem a `schemaVersion` nem változik.

**Miért:** a doki választása, a meglévő aszimmetria (a fizetési
feltételek verziója ma sincs pinnelve, csak a nyilatkozaté) mentén — ez a
tétel nem vezet be új mintát, csak követi a másik, már létező,
nem-pinnelt sablon precedensét. A tényleges aláírt PDF bájtjai amúgy is
rögzülnek a verziómappában (`storage.savePlan`), ami D4 szempontjából a
releváns garancia — a `sablonVerzio` mező csak kiegészítő metaadat, nem
az egyetlen forrás, ami alapján egy régi terv PDF-je valaha újragenerálódna.
Egy `garanciaSablonVerzio` mező bevezetése nagyobb tétel lenne (új
state a `PreviewPage`-en, pinnelés a `doFinalize`-ban), mint amit a fél
napos becslés indokol.

### 7. Seed-tartalom: a magyar szöveg a dokitól/jogásztól való, a német egyelőre placeholder

Az eredeti Excelben nincs garancia-szakasz — ezzel szemben a
nyilatkozat/fizetési feltételek szövege szó szerint onnan jön. A magyar
`GARANCIA_HU_V1` seedet a doki adja meg (kezeléstípusonkénti
garanciaidők, kivételek — pl. "fogpótlásra 3 év, implantátumra 5 év,
tömésre 1 év, a páciens mulasztásából eredő károsodásra nem vonatkozik" —
ILYEN JELLEGŰ, de a tényleges, jogilag vállalható szöveget nem az
implementáció találja ki). A német `GARANCIA_DE_V1` — a másik két sablon
mai gyakorlatával megegyezően — placeholder marad
(`[PLATZHALTER — Übersetzung ausstehend]`), amíg jogi lektorálás nem
történik.

**⚠️ Nyitott pont az implementáció előtt:** a tényleges magyar
garanciaszöveg ebben a munkamenetben NEM került megadásra. Az
implementáció megkezdése előtt (vagy legkésőbb a `GARANCIA_HU_V1` konstans
megírásakor) be kell szerezni a dokitól — addig egy magyar placeholder
használható átmenetileg, ugyanazzal a jelöléssel, mint a német sablonoknál
(`[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]`).

**Miért:** a `savosFootnote`/`kiskoruNote`-hoz hasonló "JOGI SZÖVEG —
lektorálandó" elv — nem az implementáció dolga jogilag kötelező érvényű
garanciavállalást megfogalmazni.

### 8. Nincs külön "készültség" jelző a Beállításokban

A Beállítások "A német tartalom készültsége" blokkja (`SettingsPage.tsx`
~287-316. sor) ma KIZÁRÓLAG a nyilatkozat DE állapotát emeli ki
névvel/"kész"/"placeholder" jelzéssel — a fizetési feltételek DE
placeholder állapota ma NEM kap ilyen kiemelt sort, csak a generikus
"Jelenleg: `<fájlnév>`" szöveg jelenik meg a szerkesztődoboz alatt minden
sablon-szegmensnél (`TEMPLATE_SLOTS.map` ág). A Garancia ugyanezt az
utóbbi, generikus utat kapja — NEM kap saját kiemelt készültség-sort.

**Miért:** következetesség a fizetési feltételek már létező (nem
kiemelt) precedensével — a nyilatkozat kiemelése minden jel szerint azért
kivétel, mert az az egyetlen, aminek a verziója ma pinnelődik is
(`sablonVerzio`), tehát ott indokolt volt külön névvel/állapottal
megjeleníteni. Ha a doki később mind a hármat egyformán kiemelt
állapotjelzővel akarja látni, az egy külön, kisebb UI-tétel, nem ennek a
résznek a hatásköre.

### 9. Tesztelés

- `pdf/TervDocument.test.tsx` bővítése: a `garanciaMd` prop átadásával a
  Garancia oldal saját címmel és szövegtörzzsel megjelenik, magyarul és
  németül is (a meglévő nyilatkozat/csillag-tesztek mintájára, lásd a 4.
  backlog-tétel `TervDocument.test.tsx`-e). Külön eset arra, hogy
  `offerOnly=true` mellett a Garancia oldal MARAD, miközben a nyilatkozat+
  aláírás oldal eltűnik — ez a tétel ténylegesen megkülönbözteti a
  Garanciát a nyilatkozattól, ezért ezt kell bizonyítani, nem csak azt,
  hogy a szöveg megjelenik.
- `pages/SettingsPage.test.tsx` bővítése: a harmadik sablon-szegmens
  (Garancia) is szerkeszthető és menthető, új verziófájlt hoz létre —
  ugyanazon a mintán, mint a meglévő nyilatkozat-szerkesztési tesztek.

**Miért:** a projekt eddigi gyakorlata (lásd a 4. tétel PDF-oldali
tesztje) — a UI-szintű állapotváltás önmagában nem bizonyítja, hogy a
tényleges nyomtatványra is kikerül a tartalom a várt helyen/módon.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Placeholder-őr véglegesítéskor** (`docs/08-backlog.md` 6. tétel,
  jelenleg NYITOTT) — a Garancia sablon, ha még placeholder (akár HU, akár
  DE), NEM blokkolja a véglegesítést, pontosan úgy, ahogy ma a nyilatkozat/
  fizetési feltételek placeholder állapota sem blokkolja. Ha a 6. tétel
  megépül, annak a guard-jának generikusan kell végigfutnia mindhárom
  sablonon (nyilatkozat, fizetési feltételek, garancia) — ez a tétel csak
  előkészíti a terepet azzal, hogy a Garancia ugyanabba a
  `loadLatestTemplateByBase`/`isPlaceholderBody`-mintázatba illeszkedik.
- **Kategóriánkénti/tételenkénti garanciaidő adatmodellje** — lásd 1.
  döntés; ha a doki ragaszkodna hozzá, külön tétel.
- **`Plan.sablonVerzio`-hoz hasonló pinnelés a Garanciára** — lásd 6.
  döntés, tudatosan kihagyva.
- **A "német tartalom készültsége" blokk kiegészítése egy Garancia-sorral**
  — lásd 8. döntés, tudatosan kihagyva a fizetési feltételek precedense
  miatt.
- **`schemaVersion` emelés** — nem szükséges, a `Plan` séma nem változik.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/storage/seed/templates.ts` — `TEMPLATE_HEADINGS` bővítése,
  `GARANCIA_HU_V1`/`GARANCIA_DE_V1` új exportok.
- `app/src/storage/DemoStorage.ts` — `DEFAULT_TEMPLATES` tömb bővítése két
  új `[fájlnév, tartalom]` sorral; nincs egyéb kódváltozás.
- `app/src/pages/SettingsPage.tsx` — `TemplateSlotKey` unió és
  `TEMPLATE_SLOTS` bővítése egy `'garancia'` bejegyzéssel.
- `app/src/pdf/labels.ts` — `PdfLabels` interfész + `PDF_LABELS.hu`/`.de`
  bővítése egy `garanciaCim` mezővel (`'Garancia'` / `'Garantie'`).
- `app/src/pdf/TervDocument.tsx`
  - `TervDocumentProps` bővítése `garanciaMd: string`-gel.
  - `garanciaBlocks = parseBlocks(fillPlaceholders(garanciaMd, placeholderValues))`
    számítás a nyilatkozat/fizetési feltételek blokkjaihoz hasonlóan.
  - Új `<Page>` a fizetési feltételek oldal (2.) és a nyilatkozat oldal
    (jelenlegi 3.) közé, `MiniHeader` + `s.h2` cím (`L.garanciaCim`) +
    `MdBlocks blocks={garanciaBlocks}` (NEM `legal`) + `Footer` — a
    fizetési feltételek oldal felépítésének másolata.
  - A fájl tetején lévő oldal-térkép komment (4-10. sor) frissítése az új
    oldalszámozásra.
- `app/src/pages/PreviewPage.tsx`
  - Új `garanciaMd` state + harmadik `loadOrFallback` hívás a `useEffect`-ben.
  - `sablonFallback` számítás bővítése a harmadik `fellback`-kel.
  - `garanciaMd` átadása a `<TervDocument>`-nek és felvétele a
    `updatePdf`-et újrafuttató `useEffect` dependency-listájára
    (166. sor környéke) — enélkül a Garancia szöveg némán kimaradna a
    letöltött PDF-ből, ugyanaz a hiba-osztály, amit a fájl kommentje a
    nyilatkozatnál/fizetési feltételeknél már dokumentál.
  - Az amber `sablonFallback` `Callout` szövegének bővítése — ma csak
    "nyilatkozat/fizetési feltételek szövege" szerepel benne, a garanciát
    is meg kell említenie.
- `app/src/pdf/TervDocument.test.tsx` — új eset(ek) a Garancia oldalra és
  az `offerOnly` melletti láthatóságára.
- `app/src/pages/SettingsPage.test.tsx` — a harmadik sablon-szegmens
  szerkesztési/mentési tesztje.
- `app/src/domain/types.ts` — **nincs változás** (lásd 6. döntés).
