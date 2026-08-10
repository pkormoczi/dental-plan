# Backlog 20. tétel — Letöltési fájlnév: páciensnév + „PISZKOZAT" előtag — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 20. tételének („Letöltési fájlnév:
páciensnév + „PISZKOZAT" előtag") megbeszélt megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat (a lenti aláírás-szerű részletek csak
illusztrációk) — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

A `PreviewPage.tsx` és a `PlanHistoryPage.tsx` letöltési fájlnevei ma
kizárólag a `tervId`-t (egy 6 karakteres, véletlen azonosító) tartalmazzák
— pl. `kezelesi-terv-a3f9k2.pdf` vagy `kezelesi-terv-a3f9k2-2026-08-01_v1.pdf`.
Egy Letöltések mappában, sok páciens sok fájlja között, ez a névminta
szemre megkülönböztethetetlen — a doki csak a fájl megnyitásával tudja
eldönteni, melyik páciensé. Ez a rossz PDF e-mailhez csatolásának
forrása, és időveszteség a helyes fájl kikereséséhez.

## Döntések

### 1. Hatókör: mindkét letöltési hely (`PreviewPage` és `PlanHistoryPage`) egyaránt

Bár kódvizsgálat kiderítette, hogy a `PlanHistoryPage`-en megjelenő
összes mentett verzió MA mindig `statusz: 'VEGLEGES'` (a `storage.savePlan`-t
kizárólag a `PreviewPage.tsx` `doFinalize`-ja hívja, hardcode-olt
`statusz: 'VEGLEGES'`-szel — a PISZKOZAT-státuszú verziómappa egy külön,
még nem épített KÉSŐBB-tétel, lásd `backlog/BACKLOG.md` „Több félretett
terv" pontja), a `PISZKOZAT-` előtag logikáját MOST mindkét helyen
bevezetjük, nem csak a `PreviewPage`-en.

**Miért:** a backlog-szöveg szó szerint mindkét helyet említi. A
`PlanHistoryPage`-nek a 6. döntés miatt (lásd lent) úgyis bővülnie kell
egy per-verzió `nev`/`statusz` mezővel — a statusz-alapú előtag-döntés
gyakorlatilag ingyen belefér ugyanabba a bővítésbe, és a jövőbeli
piszkozat-verziómappa tétel emiatt nem kell, hogy visszatérjen ide.

### 2. „Piszkozat" jelzés forrása: a nyers `plan.statusz`, konzisztensen a meglévő jelvénnyel

`isDraft = plan.statusz !== 'VEGLEGES'` — sem a `PreviewPage`-en, sem a
`PlanHistoryPage`-en nem vezetünk be új, finomabb jelzést (pl. „ez a
tartalom EBBEN a munkamenetben lett-e mentve").

Ismert éleset, amit **tudatosan** nem kezelünk külön: ha a doki egy már
véglegesített tervet újranyit szerkesztésre, módosít rajta, de még nem
kattint újra „Véglegesítés és mentés"-t, a `plan.statusz` ilyenkor is
`'VEGLEGES'` marad (sem a betöltés, sem a szerkesztés nem állítja vissza)
— tehát a letöltés ilyenkor NEM kap `PISZKOZAT-` előtagot, holott a
tartalom már eltér a lemezen archivált változattól.

**Miért:** ez pontosan ugyanaz a jel és ugyanaz a hiányosság, mint a
`PlanEditorPage.tsx:381` fejlécében ma is látható „véglegesítve"/
„piszkozat" jelvény — egy jelzés, egy igazság a kódbázisban, nincs
duplikált/eltérő logika két helyen ugyanarra a kérdésre. Egy pontosabb
jelzés (pl. „módosult a betöltés óta") egy nagyobb, önálló tétel lenne
(a teljes szerkesztőre kellene kiterjednie, nem csak a fájlnévre), messze
meghaladná ennek a tételnek az 1–2 órás méretét.

### 3. Névalak a fájlnévben: kötőjeles vezetéknév-keresztnév, a mappanév mintája szerint

A `paciens.nev` (pl. „Kovács János") a fájlnévben **ugyanúgy** jelenik
meg, mint a páciensmappa nevében: `buildPatientDirName` mintája szerint
az első szóköznél vezetéknévre/keresztnévre bontva, mindkét rész
`sanitizeNamePart`-tal sanitizálva, kötőjellel összefűzve —
„Kovacs-Janos", NEM „Kovacs Janos" (a `sanitizeNamePart` önmagában a
szóközöket nem cseréli, ha a teljes nevet egyben adnánk át neki).

Ehhez a `buildPatientDirName`-ben ma "helyben" élő
split+sanitizálás+kötőjeles-összefűzés logikát egy **külön, exportált
segédfüggvénybe kell kiemelni** a `storage/paths.ts`-ben, amit mindkét
hívó (a meglévő `buildPatientDirName` ÉS az új letöltési fájlnév-építő,
lásd 5. döntés) használ — nem írjuk meg kétszer.

**Miért:** a doki a Fájlkezelőben a páciensmappa nevére keres (CLAUDE.md
„Páciensmappa-névben az ékezetek maradnak...") — ha a letöltött fájl neve
vizuálisan ugyanazt a mintát követi, könnyebben párosítja a fájlt a
mappával. A kiemelés (nem duplikálás) összhangban van a CLAUDE.md
„Meglévő segédfüggvények — használd, ne írd újra" elvével.

### 4. Fájlnév-sablon: a meglévő `kezelesi-terv-` és a suffixek (ajánlat/verziómappa) változatlanok, csak a névrész és az előtag új

```
[PISZKOZAT-]kezelesi-terv-<Vezetek-Kereszt>-<tervId>[-ajanlat|-<versionDir>].pdf
```

Példák:

- `PISZKOZAT-kezelesi-terv-Kovacs-Janos-a3f9k2.pdf` (piszkozat, teljes PDF)
- `kezelesi-terv-Kovacs-Janos-a3f9k2-ajanlat.pdf` (`PreviewPage`, „Csak
  ajánlat" mód, véglegesített terv)
- `kezelesi-terv-Kovacs-Janos-a3f9k2-2026-08-01_v1.pdf` (`PlanHistoryPage`,
  egy adott verzió letöltése)

A `tervId`-t a `PreviewPage`-en változatlanul `plan.tervId || 'uj'` adja
(új, még nem mentett tervnél a `tervId` üres string).

**Miért:** minimális diff a meglévő mintához képest — csak a névrész
ékelődik be a `kezelesi-terv-` és a `tervId` közé, az előtag pedig a
legelejére, a suffix-logika (ajánlat/verziómappa) egy karaktert sem
változik.

### 5. A megoldás helye: új export a `storage/paths.ts`-ben, primitív paraméterekkel

Új, exportált függvény a `storage/paths.ts`-ben (a `sanitizeNamePart` és a
3. döntésben kiemelt név-összefűző mellett), primitív paraméterekkel —
**nem** a `Plan` típust átvevő aláírással:

```
buildDownloadFileName(nev: string, opts: { tervId: string; isDraft: boolean; suffix?: string }): string
```

A hívó (`PreviewPage.tsx`/`PlanHistoryPage.tsx`) fejti vissza a `plan`-ból
(vagy a 6. döntés szerinti per-verzió meta-objektumból) a paramétereket,
beleértve az `isDraft` (2. döntés szerinti) számítást is.

**Miért:** a `paths.ts` ma egyetlen domain-típust sem importál, kizárólag
primitív string/szám paraméterekkel dolgozó, tiszta függvényeket
tartalmaz — ez a réteg-függetlenség érték, amit érdemes megtartani. Az
`isDraft` eldöntése (mi számít piszkozatnak) domain-döntés, a hívó
oldalon marad, nem temetődik el egy általános storage-segédfüggvényben.

### 6. `PlanHistoryPage` állapotbővítés: a meglévő `VersionTotal`/`totalsByVersion` bővül `nev` és `statusz` mezővel

A `PlanHistoryPage.tsx` MA IS betölti az ÖSSZES verzió teljes `Plan`
objektumát egy közös `useEffect`-ben (a végösszeg-oszlophoz, lásd a
`totalsByVersion`/`VersionTotal` meglévő kódot és a hozzá tartozó
kommentet a `backlog-11` háttérről) — csak `fizetendo`/`penznem` mezőt
őriz meg belőle state-ben. A letöltési fájlnévhez szükséges per-verzió
`nev` (`res.value.paciens.nev`) és `statusz` (`res.value.statusz`) mezőt
**ugyanabba a meglévő objektumba** (`VersionTotal`, átnevezve pl.
`VersionMeta`-ra) és **ugyanabba a már futó ciklusba** vesszük fel — nincs
új state-változó, nincs új storage-hívás.

A `downloadVersion(patientDir, versionDir, tervId)` a meglévő paraméterei
mellett a komponens state-jéből (closure) olvassa ki a hozzá tartozó
meta-objektumot (`versionKey`-vel indexelve, ugyanúgy, mint ma a
`totalsByVersion`-t a render-ciklus).

**Miért:** az adat már ott van a memóriában (a `planResults`/`plansByKey`
ugyanabban az effektben minden verzióhoz betölti a teljes `Plan`-t), csak
eddig két mezőt őriztünk meg belőle — a bővítés a lehető legkisebb diff,
nulla új hálózati/storage-hívással.

### 7. Hibás/olvashatatlan verzió-metaadat visszaesése

Ha egy adott verzió `terv.json`-ja nem olvasható (a `Promise.allSettled`
elutasítja, a verzió a `failed`-be kerül, a 6. döntés szerinti meta
objektum hiányzik rá), de a PDF-je külön hívással (`loadPlanPdf`) mégis
betölthető, a letöltés **nem hasal el csak emiatt**: a névhez a
páciens-szintű, a legfrissebb OLVASHATÓ verzióból származó nevet
(`namesByPatient[patientDir]`) használjuk, a státuszhoz `isDraft: false`-t
(a mai valóságot tükrözve — piszkozat-verziómappa ma úgysem létezik).

**Miért:** a letöltés-funkció ne váljon szigorúbbá, mint ma — jelenleg is
lehetséges egy olvashatatlan `terv.json` mellett is letölteni a PDF-et
(a végösszeg helyén „—" jelenik meg, de a letöltés gomb működik). A
páciens-szintű névvel ellátott fájlnév ekkor is hasznosabb, mint a puszta
`tervId`, még ha nem is a legpontosabb (ritka, hibaágra korlátozódó)
forrásból származik.

### 8. Tesztelés: unit tesztek a `paths.test.ts`-ben, drótozottság-ellenőrzés a két oldalon

A tényleges eseteket (üres név → `'Nevtelen'` rész, tiltott karakterek
cseréje, `isDraft: true` → `PISZKOZAT-` előtag, `isDraft: false` → nincs
előtag, `suffix` megjelenése a végén) a `paths.test.ts`-ben, tiszta
függvényként fedjük le — ez a fájl már ma is pontosan ilyen
függvényeket (`sanitizeNamePart`, `buildPatientDirName`,
`buildVersionDirName` stb.) tesztel.

A `PreviewPage.test.tsx` és a `PlanHistoryPage.test.tsx` csak egy-egy
asszerciót kap, ami igazolja, hogy a `download`/`a.download` ténylegesen
az új függvény kimenetét használja (a bekötés nem szállt el) — NEM
ismétli meg az összes sanitizálási esetet oldal-szinten is.

**Miért:** a logika lényegi része tiszta függvény, olcsóbb és gyorsabb
unit szinten minden szélsőértéket lefedni, mint egy React-oldal render-
ciklusán keresztül kikényszeríteni. A meglévő `paths.test.ts` már ad egy
bevált mintát ugyanehhez a kategóriához.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A PISZKOZAT-státuszú verziómappa tétele maga** (`backlog/BACKLOG.md`
  „Több félretett terv" KÉSŐBB-pont) — ez a tétel csak arról gondoskodik,
  hogy a `PlanHistoryPage` fájlnév-logikája már MOST helyesen viselkedjen,
  ha/amikor az a tétel megépül; a piszkozat-verziómappák listázása,
  megjelenítése stb. nem ennek a tételnek a kérdése.
- **„NEM VÉGLEGES" vizuális jelzés magán a PDF tartalmán/vízjelként**
  (`backlog/BACKLOG.md` KÉSŐBB lista) — az egy külön, a nyomtatvány
  TARTALMÁT érintő tétel; ez a tétel kizárólag a letöltéskor a
  fájlrendszerbe kerülő FÁJLNÉVről szól.
- **Az „újranyitott, véglegesített, de még nem újramentett" terv
  pontosabb jelzése** — lásd 2. döntés, tudatosan kihagyva; a meglévő
  `plan.statusz`-alapú jelvény hiányosságával konzisztens marad.
- **A `buildPatientDirName` egyéb, nem a névösszefűzéssel kapcsolatos
  viselkedése** (pl. a `patientId` hozzáfűzése a mappanévhez) —
  változatlan; a letöltési fájlnév a `tervId`-t külön, a saját sablonja
  szerint fűzi hozzá (4. döntés), nem a `buildPatientDirName` egészét
  hívja újra.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/storage/paths.ts`
  - A `buildPatientDirName`-ből kiemelt, exportált név-összefűző
    segédfüggvény (3. döntés).
  - Új export: a letöltési fájlnév-építő (5. döntés), a 4. döntés
    szerinti sablonnal.
- `app/src/storage/paths.test.ts` — a 8. döntésben leírt unit tesztek.
- `app/src/pages/PreviewPage.tsx`
  - A „Letöltés" `<a download=...>` attribútuma az új függvényt hívja,
    `isDraft: plan.statusz !== 'VEGLEGES'`-szel (2. döntés) és a meglévő
    `effectiveOfferOnly` alapú `suffix`-szel.
- `app/src/pages/PreviewPage.test.tsx` — a 8. döntésben leírt
  drótozottság-ellenőrzés.
- `app/src/pages/PlanHistoryPage.tsx`
  - `VersionTotal` átnevezése/bővítése `nev`/`statusz` mezővel (6.
    döntés), ugyanabban a meglévő betöltő effektben.
  - `downloadVersion` az új meta-objektumból olvassa ki a nevet/statuszt,
    a 7. döntés szerinti visszaeséssel hibás/olvashatatlan verziónál.
- `app/src/pages/PlanHistoryPage.test.tsx` — a 8. döntésben leírt
  drótozottság-ellenőrzés.
