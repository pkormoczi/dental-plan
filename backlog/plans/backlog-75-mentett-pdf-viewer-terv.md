# Backlog 75. tétel — Mentett PDF viewer / külön megnyitás — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 75. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-064
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D255`–`D259`, `D597`–`D599` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Sorrendi függőség:** a 71. tételre (DP-060) épül — a lap akciósávjába
és layout-jába illeszkedik.

## Probléma

A mai `PatientPlanChains.tsx` `viewVersion()` a mentett PDF-et NEM
BEÁGYAZVA, hanem egy ÚJ böngészőlapon nyitja meg (`window.open('',
'_blank')` + `win.location.href = URL.createObjectURL(blob)`) — a 71.
tétel ezt a gombot ÁTHUZALOZZA route-navigációra (az új „Terv részletei”
oldalra), tehát a PDF-megjelenítésnek MOST kell egy ÚJ, beágyazott
otthont találnia.

## Döntések

### 1. Beágyazott PDF-viewer

A mentett final PDF beágyazva jelenik meg a strukturált tartalom UTÁN
(D255–256), kb. 70–80vh natív böngésző-viewer (D257) — a MEGLÉVŐ
`PreviewPage.tsx` iframe-mintájának (méret, keretezés, `border`/
`borderRadius`) újrafelhasználásával, DE `loadPlanPdf()` (MÁR LÉTEZŐ
`PlanStorage` hívás) forrásból: bytes → `Blob` → object URL, a MEGLÉVŐ
`viewVersion()` konverziós logikájának kiemelésével egy megosztott
helyre.

**Miért nem `usePDF()`:** a `PreviewPage.tsx` a DRAFT PDF-jét ÉLŐBEN
generálja (`@react-pdf/renderer` `usePDF`); ez a lap egy MÁR LÉTEZŐ,
mentett bájtsorozatot jelenít meg (D598 — „korábbi finalizált tervnél a
lementett PDF-et mutatjuk”), tehát csak egy `<iframe src={objectUrl}>`
kell, nem újragenerálás.

### 2. Object URL életciklus — új figyelem

A mai „nyisd meg új lapon” út a böngészőre bízza a létrehozott object
URL felszabadítását (a lap bezárásakor a böngésző elengedi). Egy
BEÁGYAZOTT iframe-nél a komponensnek MAGÁNAK kell `URL.revokeObjectURL()`-t
hívnia, amikor már nincs rá szükség — különben minden verzió-megtekintés
egy fel nem szabadított Blob URL-t hagy a memóriában.

**Döntés:** a `useEffect` cleanup-ja hívja a `revokeObjectURL`-t,
unmountkor ÉS verzióváltáskor. A 71. tétel `key={`${planDir}/
${versionDir}`}`-alapú tartalom-remountja ezt TERMÉSZETESEN
kikényszeríti (a régi PDF-viewer komponens ténylegesen unmountol
verzióváltáskor, a cleanup lefut) — nincs szükség külön, manuális
verzióváltás-figyelésre ebben a komponensben.

### 3. „Megnyitás külön” — a MEGLÉVŐ logika áthelyezése

A lap tetejének akciósávjában (a 71. tétel konténerébe) egy „Megnyitás
külön” gomb — a MEGLÉVŐ `viewVersion()` (popup-blocker guard, új lap,
`window.open`) logikájának ÁTHELYEZÉSE ide, a `PatientPlanChains.tsx`
„Megnézés” gombjáról (ami a 71. tétel szerint mostantól route-navigációt
csinál, nem PDF-et nyit).

**Nincs duplikált „megnyitás” akció a viewer KÖRNYÉKÉN** (D258–259) — ez
az EGYETLEN ilyen gomb az egész oldalon, a lap tetején (nem egy második,
a beágyazott iframe mellett).

### 4. „Letöltés” top action

A MEGLÉVŐ `downloadVersion()`/`buildDownloadFileName()` (`storage/
paths.ts`) hívásának újrahasznosítása — a fájlnév-logika VÁLTOZATLAN.

### 5. Hiányzó/olvashatatlan PDF hibaállapot

MÁR MEGVAN a mintaszinten: a `loadPlanPdf()` `null`-t ad, ha nincs
mentett PDF a verzióhoz, és a `PatientPlanChains.tsx`
`viewVersion`/`downloadVersion` MÁR ma is explicit „Ehhez a verzióhoz
nincs mentett PDF.” hibaágat futtat (D599, a 68. tétel — DP-052 — plan
dokumentuma is rögzítette ezt MEGVAN-ként). Ez a tétel UGYANEZT a
mintát alkalmazza az új helyen: a beágyazott viewer helyén egy hibaüzenet
jelenik meg, NINCS regenerálási kísérlet, és a strukturált JSON-alapú
tartalom (a 71–74. tétel: header, fázisok, összegzés) a hiba ELLENÉRE is
TOVÁBBRA IS olvasható marad (D599 explicit ezt kéri — egy hiányzó PDF
nem teheti használhatatlanná a többi, JSON-ból származó információt).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A draft-oldali (`PreviewPage.tsx`) PDF-életciklus (generálás,
  invalidálás, retry hiba esetén) — 68. tétel (DP-052), VÁLTOZATLAN; ez
  a tétel kizárólag a HISTORICAL (már mentett) oldalt fedi.
- A lap héja, header, akciósáv KONTÉNERE — 71. tétel (DP-060); ez a
  tétel csak a KÉT PDF-specifikus gombot (Megnyitás külön, Letöltés)
  helyezi bele.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/TervReszleteiPage.tsx` (71. tétel) — a beágyazott PDF-
  viewer szekció + a két akciógomb.
- `app/src/components/PatientPlanChains.tsx` — `viewVersion()`/
  `downloadVersion()` kiemelése megosztott modulba/hookba (ha a 71.
  tétel még nem tette meg a workflow-akciókkal párhuzamosan; ez a tétel
  a PDF-specifikus felet emeli ki).
- `app/src/storage/paths.ts` `buildDownloadFileName()` — újrafelhasználás,
  változatlan.

## Tesztelés (irányadó, nem kimerítő)

- Egy véglegesített verzió „Terv részletei” oldalán a mentett PDF
  beágyazva látszik, a strukturált tartalom alatt.
- „Megnyitás külön” új lapon nyitja meg UGYANAZT a PDF-et.
- „Letöltés” a MEGLÉVŐ fájlnév-konvenció szerint tölti le.
- Verzióváltás (Prev/Next) után a beágyazott viewer az ÚJ verzió PDF-jét
  mutatja, a régi object URL felszabadul (nincs memóriaszivárgás —
  ellenőrizhető böngésző dev toolsszal, `browser-validation` skill).
- Egy hiányzó/olvashatatlan PDF-hez tartozó verziónál a viewer helyén
  hibaüzenet jelenik meg, DE a header/fázisok/összegzés továbbra is
  látszik.
