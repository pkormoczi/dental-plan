# Backlog 32. tétel — Aktív draft lifecycle és autosave — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 32. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-004
szelete (`redesign`
3. fejezet). Szintézis a redesign-interjú D-döntéseiből, nem új grill-me
   session. Az itt hivatkozott `D21`/`D22`/`D37`/`D148`–`D153`/`D165`–`D169`
a redesign saját D1–D606 számozásából valók
   (`redesign`) — NEM azonosak a
`docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A projektnek MÁR MA is van egy jelentős piszkozat-perzisztencia rétege
(a korábbi, lezárt 1. tétel eredménye, `docs/03-funkcionalis-spec.md` §
Autosave, `docs/05-technologia.md` § Piszkozat-autosave): `DraftStorage`
interfész + `DemoDraftStorage`, egyetlen `dp:piszkozat` kulcs, tartalmi
változásra azonnal (debounce nélkül) mentő `AppState.tsx` `useEffect`
(`AppState.tsx:225–247`). Ez a tétel ezért NEM egy hiányzó funkció
felépítése, hanem egy **feltárás alapján pontosan behatárolt, kis
kiegészítés** — a redesign D-döntéseinek nagy része már ma is teljesül,
csak néhány konkrét pont hiányzik.

Feltárás alapján a tényleges állapot:

**Már ma is teljesen megvalósítva** (ez a tétel csak formalizálja/
dokumentálja, kódot nem igényel):
- **D21** (pontosan egy aktív draft) — egyetlen `dp:piszkozat` kulcs, egy
  memóriabeli `plan` slot.
- **D22** (guard új szerkesztési task indításakor) — `runOrConfirm()`
  mindhárom terv-létrehozó akción a `PlanHistoryPage.tsx:321–362,832–861`
  és a `NewPlanPage.tsx:98–128,206–231` oldalon, `AlertDialog`-gal,
  akciónkénti szöveggel.
- **D37** (szabad kilépés, autosave megőrzi) — a fenti `useEffect`,
  `piszkozatTartalmas(plan)` őrrel (üres draftot nem perzisztál).
- **D153** (quick-created páciens túléli a discard-ot) — architekturálisan
  igazolt elkülönülés: `DemoStorage.createPatient()` és
  `DemoDraftStorage.clear()` teljesen külön kulcsokat érintenek
  (`StorageContext.tsx:44,53,63`, explicit "testvér-doboz" komment).
- **D165–D169** (atomikus véglegesítés, lock, verziószám nem vész el,
  draft csak igazolt siker után törlődik) — a `PreviewPage.tsx`
  `doFinalize()` (`:285–323`) EGYETLEN `storage.savePlan()` hívást indít,
  ami a `DemoStorage.ts:461–526`-ban egy közös try/catch-ben írja a
  plan+PDF kulcsokat, hibánál explicit rollbackkal ("Semmi nem íródott
  félkészen"); a `verzio` (`nextVersionNumber`) a MEGLÉVŐ mappákból
  származtatott, nem perzisztált számláló, tehát hibás írás esetén nem
  "fogy el"; a draft-törlés (`markPlanSaved` → `drafts.clear()`) csakis a
  sikeres `savePlan` ÉS az azt követő visszaolvasás (`loadPlan`) UTÁN fut;
  a `savingRef` + gomb `disabled={busy}` + a storage-szintű `enqueue()`
  sorosított írás-queue HÁROM független rétegben zárja ki a dupla indítást.
  **Ez a tétel — és a redesign-javaslat külön DP-053 tétele is, ami
  ugyanezekre a D-számokra hivatkozik — erre a részre nézve NEM igényel
  új kódot**, csak a lezáráskor a D-táblába való formalizálást; ha
  DP-053 triázsra kerül, ezt a talált tényt onnan érdemes átvenni, nehogy
  duplikált munka induljon.

**Ténylegesen hiányzik** (ez a tétel valódi hatóköre):
1. **D150** (Continue az utolsó lépésre visz) — a Home "Piszkozat
   folytatása" kártyájának "Megnyitás" gombja ma NEM tudja, melyik
   workflow-lépésen járt a doki: egy névkitöltés-heurisztikával TALÁLGAT
   `/paciens` és `/terv` között (`Home.tsx:156`,
   `navigate(plan.paciens.nev.trim() ? '/terv' : '/paciens')`), és sosem
   céloz `/elonezet`-re. Sehol nincs perzisztált "utolsó route" mező (a
   `DraftRecord` — `DraftStorage.ts:11–24` — kizárólag
   `{ schemaVersion, mentve, plan }`-t tartalmaz).
2. **D148, teljes körűen** (autosave státusz látható) — pozitív
   visszajelzés ma KIZÁRÓLAG a Home-on létezik (`Home.tsx:151–155`,
   "Utolsó módosítás: …"); a szerkesztőben (`PlanEditorPage.tsx:312–319`)
   csak HIBA esetén jelenik meg piros `Callout`, sikeres mentésnél a doki
   a szerkesztőben dolgozva semmilyen visszajelzést nem lát.
3. **D151, "az editorban" fele** (draft discard trash-ikon a
   szerkesztőben) — nem létezik. A `PlanEditorPage.tsx`-ben egyetlen
   `IconButton` sem a TELJES draft eldobására szolgál (a meglévők
   sor-/mennyiség-/becsültár-szintűek).
4. **D151, "Home-on overflow" fele** — a Home EGÉSZSÉGES "Piszkozat
   folytatása" kártyáján (`Home.tsx:143–160`) nincs eldobás-lehetőség
   egyáltalán. Létezik ugyan egy "Piszkozat elvetése" gomb, de az egy
   MÁSIK, külön kártyán (`Home.tsx:125–141`, csak akkor jelenik meg, ha a
   perzisztált draft SÉRÜLT/olvashatatlan), és annak nincs megerősítő
   dialógusa — D151 megerősítést vár el.

## Döntések

### 1. `DraftRecord` additív bővítése: `patientDir` + `lastRoute`

A `DraftStorage.ts:11–24` `DraftRecord` típusa két új, OPCIONÁLIS mezőt
kap: `patientDir?: string` (melyik páciens-mappához tartozik az aktív
draft, ha ismert) és `lastRoute?: '/paciens' | '/terv' | '/elonezet'`
(melyik workflow-lépésen járt a doki utoljára). Mindkettő additív, nincs
`DraftRecord.schemaVersion` emelés (ugyanaz a minta, mint a `Sor`
`mennyisegKezi`/`csomag` mezőinél — hiányzó mező régi draftnál biztonságosan
"ismeretlen"-ként kezelhető, nem hibás állapot).

**Miért:** ez a két mező hiányzik ahhoz, hogy a D150 (utolsó lépés) és a
D152 (páciens terveihez visszatérés discard után) egyáltalán
megválaszolható legyen — a `DraftRecord` ma kizárólag a `Plan`-t és egy
időbélyeget tart, semmilyen navigációs/azonosító metaadatot. **Elvetett
alternatíva:** ezt a két mezőt magára a `Plan`-ra (domain-objektumra)
tenni — elvetve, mert ezek tisztán UI/workflow-metaadatok, nem a terv
tartalmi része (nem kerülnek papírra, nem `terv.json`-adat), a
`DraftStorage` (UI-oldali, nem system of record) a helyes réteg rájuk,
ugyanúgy, ahogy a `mentve` időbélyeg is ott él, nem a `Plan`-on.

### 2. `lastRoute` írása: a terv-workflow héjból (D36)

A `lastRoute` mezőt a közös workflow-héj (`TervWorkflowShell`,
`docs/03-funkcionalis-spec.md` § Terv-workflow héj, D36) írja, egy kis
effektussal, minden route-váltáskor a három workflow-oldal között —
mert az a komponens tudja MA IS, melyik lépésen áll a doki (route-alapon,
lásd D36). A `patientDir`-t azok a MEGLÉVŐ helyek töltik ki, ahol a draft
indításakor már ismert (pl. `NewPlanPage.tsx` "Meglévő páciens keresése"
ága, `PlanHistoryPage.tsx` "Új verzió"/"Másolás új tervbe"/"Új terv"
akciói) — ezek MA IS tudják, melyik páciensről van szó, csak eddig nem
adták tovább a draftnak.

**Miért:** a workflow-héj már pontosan ott van, ahol a route ismert —
felesleges lenne három helyen (mindhárom oldalon külön) duplikálni a
route-figyelést. A `patientDir` kitöltését NEM ez a tétel vezeti be mint
új mechanizmust, csak összeköti a MÁR ISMERT adatot egy MÁR LÉTEZŐ
mezővel.

### 3. `patientDir` kitöltése: "ahol már ismert", nem kimerítő audit minden belépési ponton

Ez a tétel NEM vállalja, hogy a `patientDir` minden lehetséges
draft-indítási úton garantáltan kitöltött legyen — csak ott tölti ki,
ahol a hívó MA IS ismeri (lásd 2. döntés). Ahol nem ismert (pl. a Home
"Új terv indítása" → `/uj-terv` → "Vadonatúj páciens" ág, ahol a páciens
még nem is létezik a draft indításakor), a `patientDir` egyszerűen
hiányzik, és a 4. döntés szerinti fallback lép életbe.

**Miért:** egy kimerítő, minden jövőbeli draft-indítási utat lefedő audit
szétfeszítené ezt a tételt (a redesign-javaslat több más tétele — DP-011,
DP-012, DP-021, DP-022 — még csak ezután épül/finomodik, mindegyik saját
maga is érinti majd, hol indul a draft). **Elvetett alternatíva:** egy
kötelező, blokkoló "válassz pácienst" lépés bevezetése minden
draft-indításnál, hogy garantáltan legyen `patientDir` — elvetve, mert ez
egy létező, működő flow-t (pl. "Vadonatúj páciens") tenne nehézkesebbé,
ártalmatlan hiányosság pótlásáért cserébe.

### 4. Discard utáni navigáció: `patientDir` esetén a 30. tétel oldalára, egyébként a pácienslistára

D152 szerint a szerkesztőből (`PlanEditorPage.tsx`) történő discard után
"a páciens terveihez" térünk vissza — ez a 30. tétel (DP-002) egyesített
páciens-részletoldalára navigálást jelenti (`Kezelési tervek` tab), HA a
draft `patientDir`-je ismert. Ha nem ismert, a pácienslistára
(`/paciensek`) navigálunk — ésszerű, ismert célpont, nem hibaállapot.

**Miért:** ez a legjobb elérhető viselkedés a 3. döntés által tudatosan
vállalt hiányos lefedettség mellett — a doki mindig egy értelmes,
navigálható helyre kerül, sosem törött linkre vagy üres oldalra.

### 5. Pozitív autosave-jelzés a szerkesztőben: a meglévő hiba-Callout bővítése

A `PlanEditorPage.tsx:312–319` MEGLÉVŐ, csak hiba esetén látszó piros
`Callout` mellé (nem helyette) egy semleges, halvány "Piszkozat mentve
{HH:MM}" szöveg kerül, amíg nincs hiba — ugyanazt a `piszkozatMentve`
időbélyeget használva, amit a Home már ma is megjelenít
(`Home.tsx:151–155`), csak itt, a szerkesztőben, ahol a doki ténylegesen
dolgozik.

**Miért:** D148 explicit "látható" státuszt vár, nem csak hibajelzést; a
`piszkozatMentve` adat MÁR LÉTEZIK az `AppState`-ben, csak eddig csak a
Home olvasta — ez tisztán megjelenítési kiegészítés, nincs mögötte új
adatréteg. **Elvetett alternatíva:** külön toast/spinner minden egyes
mentésnél — elvetve, mert a mentés debounce nélkül, minden billentyűzetre
fut (`AppState.tsx:225–247` komment szerint tudatos döntés), egy toast
akkor zajos, villódzó UI-t adna; egy csendes, folyamatosan frissülő
időbélyeg-szöveg elég.

### 6. Trash-ikon a szerkesztőben: megerősítéssel, a meglévő `resetPlanDraft()`-ra építve

Új `IconButton` a `PlanEditorPage.tsx` fejlécében (a "Sor törlése" mintát
követve stílusban, de a TELJES draftra vonatkozóan) — kattintásra
`AlertDialog` kér megerősítést, elfogadás esetén a MÁR LÉTEZŐ
`resetPlanDraft()`-ot hívja (`AppState.tsx:275–292`, ami már ma is
blank-re állítja a draftot ÉS törli a `DraftStorage`-t), majd a 4. döntés
szerint navigál.

**Miért:** a `resetPlanDraft()` már pontosan azt csinálja, amire a discard
akciónak szüksége van — nincs ok egy párhuzamos törlési útvonalat
építeni. **Elvetett alternatíva:** a törlést a `PreviewPage.tsx`
`savedRef`-mintájára egy külön "megerősítő" oldalra vinni — elvetve,
mert D151 kifejezetten egy inline `AlertDialog`-ot ír elő, nem külön
navigációs lépést.

### 7. Eldobás-lehetőség a Home egészséges "Piszkozat folytatása" kártyáján, megerősítéssel

A `Home.tsx:143–160` kártya egy overflow-menüt/másodlagos gombot kap
("Piszkozat elvetése"), `AlertDialog` megerősítéssel — elfogadás esetén
`discardPersistedDraft()` (a MÁR LÉTEZŐ, a sérült-draft kártyán is
használt handler, `Home.tsx:137`), a doki a Home-on marad (D152).

**Miért:** ez a hiányzó darab — MA a healthy-draft kártyán semmilyen
eldobás nincs. A sérült-draft kártya MEGLÉVŐ, megerősítés NÉLKÜLI
"Piszkozat elvetése" gombja SZÁNDÉKOSAN VÁLTOZATLAN marad: egy olvashatatlan
piszkozatnál nincs mit érdemben "elveszíteni" (a doki úgysem látja a
tartalmát, hogy mérlegelje), így a megerősítés kevesebb védelmi értéket ad
— ez a tétel nem terjeszti ki rá D151-et, csak az egészséges esetre, amit
D151 szövege ("Home-on overflow") ténylegesen céloz.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A `TervWorkflowShell` (31. tétel) tényleges felépítése — ez a tétel
  csak egy kis effektust told bele (2. döntés), nem alakítja át.
- A 30. tétel (DP-002) páciens-részletoldalának tartalma — csak
  navigációs célpontként hivatkozik rá (4. döntés).
- `patientDir` kimerítő, minden entry pointra kiterjedő biztosítása —
  lásd 3. döntés; a redesign-javaslat DP-011/DP-012/DP-021/DP-022
  tételei saját maguk is érintik majd a saját belépési pontjaikat.
- Finalizáció ÜZLETI validációja (hiányzó orvos, PLACEHOLDER-őr stb.) —
  redesign-javaslat DP-051 (Finalization validation engine); ez a tétel
  a MŰSZAKI atomicitást dokumentálja (már kész), nem az üzleti szabályokat.
- PDF preview generálás/invalidálás életciklusa — redesign-javaslat
  DP-052.
- A finalizáció atomicitásának ÚJRAÉPÍTÉSE — SZÁNDÉKOSAN nem történik,
  lásd a Probléma szakasz "már ma is teljesen megvalósítva" listáját;
  ha a redesign-javaslat DP-053 tétele (Atomikus finalization PDF+JSON)
  triázsra kerül, ott is ezt a tényt kell átvenni, nem újratervezni.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/storage/DraftStorage.ts:11–24` — `DraftRecord` bővítése
  `patientDir?`/`lastRoute?` mezőkkel (1. döntés).
- `app/src/storage/DemoDraftStorage.ts` — a bővített `DraftRecord`
  szerializálása/deszerializálása (a meglévő 3-lépéses validáció
  mintájában).
- Új effektus a 31. tétel `TervWorkflowShell`-jében — `lastRoute` írása
  route-váltáskor (2. döntés).
- `app/src/pages/NewPlanPage.tsx`, `app/src/pages/PlanHistoryPage.tsx` —
  a `patientDir` továbbadása a draft indításakor, ahol már ismert
  (3. döntés).
- `app/src/pages/Home.tsx:143–160` — a "Megnyitás" gomb `lastRoute`
  alapú navigációja (heurisztika-fallback régi drafthoz), új
  eldobás-akció megerősítéssel (7. döntés).
- `app/src/pages/PlanEditorPage.tsx:312–319` környéke — pozitív
  autosave-jelzés (5. döntés); új trash `IconButton` + `AlertDialog` +
  navigáció (6. döntés).
- `app/src/state/AppState.tsx:275–292,320–336` — `resetPlanDraft()`/
  `markPlanSaved()` reuse, nincs módosítás (6. döntés).
- `docs/03-funkcionalis-spec.md` § Autosave, `docs/05-technologia.md` §
  Piszkozat-autosave — lezáráskor a `DraftRecord` bővítés és a "már ma is
  megvalósítva" tények dokumentálása.

## Tesztelés (irányadó, nem kimerítő)

- Egy `/elonezet`-en félbehagyott draft "Piszkozat folytatása" gombja
  `/elonezet`-re navigál (ma sosem tenné meg).
- Egy `lastRoute` nélküli, régi (funkció előtti) perzisztált draft a mai
  névkitöltés-heurisztikával nyílik meg (nem törik el).
- A szerkesztőben sikeres mentés után egy semleges "Piszkozat mentve
  HH:MM" szöveg látszik; hiba esetén továbbra is a piros `Callout`.
- A szerkesztő trash-ikonjára kattintva `AlertDialog` kér megerősítést;
  elfogadás után a draft üres, és a doki a `patientDir` szerinti célra
  (30. tétel oldala vagy `/paciensek`) navigál.
- A Home egészséges "Piszkozat folytatása" kártyáján az eldobás gomb
  megerősítést kér, elfogadás után a doki a Home-on marad, a kártya
  eltűnik.
- A sérült/olvashatatlan draft kártyájának meglévő, megerősítés nélküli
  "Piszkozat elvetése" gombja változatlanul működik.
- Egy teljes véglegesítési kör (siker) után a draft törlődik, a
  verziószám helyes, párhuzamos dupla-kattintás nem hoz létre két
  verziót — regressziós teszt a MÁR MEGLÉVŐ viselkedésre (nem új kód,
  csak igazolás, hogy ez a tétel nem törte el).
