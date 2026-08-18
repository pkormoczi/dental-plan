# Backlog 34. tétel — Kezdőlap új struktúrája — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 34. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-010
szelete (`backlog/redesign/03_dental-plan-implementacios-backlog-javaslat.md`
4. fejezet). Szintézis a redesign-interjú D-döntéseiből, nem új grill-me
session. Az itt hivatkozott `D13`/`D18`–`D20`/`D149`–`D152`/`D190`–`D192`
a redesign saját D1–D606 számozásából valók
(`backlog/redesign/01_dental-plan-redesign-dontesek.md`) — NEM azonosak a
`docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A `Home.tsx` MA NEM minimalista: a header után akár öt egymásra épülő
kártya/szekció is látszódhat egyszerre — hibakártya, sérült-piszkozat
kártya, aktív-draft kártya, egy fő akció-kártya HÁROM gombbal ("Új terv
indítása", "Korábbi tervek", **"Demó adat visszaállítása"**), és egy
"Adatvédelem" kártya a **"Minden adat törlése"** gombbal
(`Home.tsx:110–216`). **Nincs sehol recent-páciens lista.**

Az aktív-draft blokk (D149) és a "Continue az utolsó lépésre"/"Discard"
viselkedés (D150–D152) **MÁR TELJES EGÉSZÉBEN megoldva a (lezárt) 32.
tételben** (DP-004, `docs/01-attekintes-es-dontesek.md` D37,
`docs/03-funkcionalis-spec.md` § Autosave) — az ottani feltárás pontosan
ezt a hármat (last-step navigáció, trash-ikon a Home egészséges kártyáján
megerősítéssel, Home-on maradás discard után) azonosította hiányzó
munkaként. Ez a tétel ezt a munkát NEM ismétli meg, csak BEÉPÍTI a 32.
tétel eredményét a Kezdőlap új elrendezésébe, változatlanul.

**A valódi új hatókör ehhez a tételhez:**
- **D13** (fő CTA a páciensválasztóra visz) — MÁR MA IS így működik
  (`Home.tsx:171`, "Új terv indítása" → `/uj-terv`); csak a felirat kerül
  összhangba a D7 "stabil CTA" szövegével (lásd 1. döntés).
- **D18–D20, D190–D192** (5 recent páciens, jelentős aktivitás szerint) —
  **teljesen új**: sem UI, sem a mögötte szükséges adat (páciensenkénti
  wall-clock "utoljára mikor volt rajta tényleges munka" időbélyeg) nem
  létezik ma SEHOL. A `listPatients()` csak `{dirName, paciensId, nev}`-et
  ad (nincs időbélyeg); az egyetlen wall-clock időbélyeg a rendszerben a
  `piszkozatMentve` (egyetlen aktív draftra); a `PlanVersion.isoDate` a
  terv `keltezes` ÜZLETI dátuma (a doki által szabadon szerkeszthető,
  D22/`frissDatummal`), nem mentési időpont.
- **D20** implicit következménye: a "Demó adat visszaállítása" és a
  "Minden adat törlése" gombok/kártya NEM része a redesign Home-jának
  (a D20 felsorolása kizárólag "fő CTA + egy aktív draft + 5 recent
  páciens") — ezek demó-only eszközök, amiknek a 29. tétel (DP-001) már
  kialakított egy otthont (`/demo`), csak eddig nem lettek átmozgatva.

## Döntések

### 1. Fő CTA felirata a D7 stabil CTA-szövegére vált

A "Új terv indítása" felirat `+ Új kezelési terv`-re változik, a
redesign D7 ("Stabil CTA: `+ Új kezelési terv`") szövegével összhangban —
ugyanez a felirat jelenik meg majd a 30. tétel (DP-002) páciens-részletoldalán
is. A gomb célja (`/uj-terv`) és a draft-felülírás-guard (a 31. tétel/
DP-003 gate-jén át, ha van aktív draft) VÁLTOZATLAN.

**Miért:** a D7 explicit egy EGYSÉGES feliratot ír elő minden "új terv
indítása" CTA-ra az egész appban — ha a Kezdőlap gombja más szöveget
használna, két különböző felirat jelentené ugyanazt a cselekvést, ami a
`docs/07-felulet-rendszer.md` "a gombfelirat azt mondja, mi történik" elvét
sértené a konzisztencia oldaláról.

### 2. Új, megosztott "utolsó jelentős aktivitás" időbélyeg páciensenként

Új, opcionális mező a `paciens.json`-on (`PatientRecord`) — pl.
`utolsoAktivitas?: { tipus: 'letrehozva' | 'torzsadat-mentve' |
'terv-veglegesitve'; idopont: string }` (ISO wall-clock) — ami a MÁR
LÉTEZŐ írási pontokon frissül, ÚJ írási útvonal nélkül:
`DemoStorage.createPatient()`, `savePatientData()`, és a `doSavePlan()`
patient-index-rekord írása (ami MA IS megtörténik minden terv-mentésnél,
a `DemoStorage.ts:465–473` régiójában — csak eddig nem hordozott
időbélyeget). Csak a LEGUTÓBBI esemény marad meg (nem lista/napló).

**Miért:** ez a legolcsóbb hely, ahol egy wall-clock időbélyeg
bevezethető anélkül, hogy új írási útvonalat kellene nyitni — mindhárom
esemény MÁR ÍR egy patient-szintű rekordot, csak eddig nem hordozott
időt. **Elvetett alternatíva:** a `paciens-adatok.json`-ra tenni a mezőt
— elvetve, mert nem minden páciensnek van saját `paciens-adatok.json`-ja
(sokan csak terv-pillanatképből élnek élő fallbackként), és a terv-
véglegesítés eseménye nem ír `paciens-adatok.json`-t, tehát ott
rendszeresen hiányozna a frissítés. **Elvetett alternatíva:** minden
terv-verzió/`paciens-adatok.json` mentés wall-clock idejét külön
naplózni, és Home-on futásidőben a legfrissebbet kikeresni az összes
páciens összes tervéből — elvetve, mert ez N pácienst × M verziót
igényelne betöltésre minden Kezdőlap-megnyitáskor, miközben egy
denormalizált, egyetlen mezős "legutóbbi" jóval olcsóbb és pontosan azt
adja, amire a D18 "legutóbbi jelentős aktivitás" szövege kér.

### 3. "Jelentős aktivitás" = a 3 létező írási esemény, "megnyitás" sosem ír

A `utolsoAktivitas` KIZÁRÓLAG a 2. döntésben felsorolt három tényleges
tartalmi íráskor frissül — egy páciens vagy egy terv MEGNYITÁSA/megtekintése
sosem ír bele. Ez automatikusan teljesíti D19-et, mert a mögöttes írási
pontok már ma is csak tényleges commit-on futnak (nincs "draft
autosave"-szerű, minden billentyűzetre író esemény ezen a szinten).

**Miért:** D19 explicit ezt kéri ("tényleges tartalmi módosítás, nem
egyszerű megnyitás") — mivel a kiválasztott három írási pont MÁR MA is
csak explicit, sikeres mentéskor fut (nem minden billentyűzetre, mint a
piszkozat-autosave), nincs szükség külön "csak akkor írj, ha ez tényleg
tartalmi" logikára.

### 4. Recent lista: max 5, a 2. döntés mezője szerint rendezve, megosztott domain-helperben

Új, megosztott domain-helper (pl. `legutobbAktivPaciensek(patients,
limit)`, `app/src/domain/` alá) — az összes páciens `utolsoAktivitas`
mezője szerint csökkenő sorrendben, az első 5-öt adja vissza (D191).
Páciens `utolsoAktivitas` nélkül nem kerül a listába. A Home ÉS a 35.
tétel (DP-011, páciensválasztó 0–1 karakteres állapota, D224 "ugyanaz a
meaningful activity logika") EZT a közös helpert hívja — nem két
egymástól független implementáció.

**Miért:** D224 explicit ugyanazt a logikát kéri a selectorban, mint a
Home-on — egy közös helper garantálja, hogy a kettő sosem csúszik el
egymástól.

### 5. Recent sor tartalma: D190/D225 szerint, a `tipus` szöveges címkével

Egy recent sor: páciensnév + DOB + telefon (a 35. tétel D225-ös
"recent row" mintájával megegyezően, hogy a Home és a selector sora
egységes legyen) + az aktivitás típusának rövid szöveges címkéje és
relatív ideje (pl. "Új terv · 2 órája", "Törzsadat mentve · tegnap"). A
sorra kattintás a 30. tétel (DP-002) páciens-részletoldalára navigál, a
`Kezelési tervek` tabra (D192).

**Miért:** D190 explicit "activity type + idő"-t kér; a DOB/telefon
megjelenítés a 35. tételben (DP-011) is szükséges recent sor-tartalom,
ezért érdemes már itt egységesen dönteni róla, hogy a két hely (Home,
selector) vizuálisan ne térjen el.

### 6. A demó-only adatkezelő gombok átkerülnek a `/demo` oldalra

A "Demó adat visszaállítása" gomb (ma a fő akció-kártyában) és a teljes
"Adatvédelem"/"Minden adat törlése" kártya (`Home.tsx:181–194`) átkerül a
29. tételben (DP-001) már kialakított `/demo` oldalra — a Kezdőlapon
kizárólag a fő CTA, az aktív-draft blokk (32. tétel szerint) és az 5
recent páciens marad, pontosan a D20 felsorolása szerint. A sérült/
olvashatatlan piszkozat hibakártyája (`Home.tsx:123–139`) NEM kerül át —
az egy legitim, felhasználó felé szóló hibaállapot-kezelés, nem
demó-eszköz.

**Miért:** D20 kizárólag ezt a hármat sorolja fel Home tartalmaként; a
két érintett gomb már ma is "Demó adat"/mockup-only jellegű (a végleges
`FileSystemStorage`-nak nincs "minden adat törlése" megfelelője), és a
29. tétel már pontosan ezért hozta létre a `/demo` oldalt — ez a tétel
csak befejezi, amit az elkezdett.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Aktív draft blokk viselkedése (Continue/last-step, discard+confirmation,
  Home-on maradás) — 32. tétel (DP-004), már megoldva, csak beépítve
  (lásd Probléma szakasz).
- A páciensválasztó (`/uj-terv`) belső UX-e (keresés, keyboard nav,
  recents megjelenítés részletei) — 35. tétel (DP-011); ez a tétel csak
  a KÖZÖS domain-helpert biztosítja neki (4. döntés).
- A `paciens.json` D29-szerű "csak index" jellegének mélyebb
  felülvizsgálata — a 2. döntés szerinti `utolsoAktivitas` mező
  szervezési metaadat, nem klinikai/személyes adat, ezért nem sérti a
  D29 szellemét; ha ez lezáráskor másképp ítélendő meg, az a `docs/01`
  D-táblájának frissítésekor döntendő el, nem itt.
- A 30. tétel (DP-002) páciens-részletoldalának tartalma — csak
  navigációs célpontként hivatkozik rá (5. döntés).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` — `PatientRecord` bővítése `utolsoAktivitas?`
  mezővel (2. döntés).
- `app/src/storage/DemoStorage.ts:465–473,647–657` és a
  `savePatientData()` implementáció — a három írási pont kiegészítése az
  új mező írásával (2. döntés).
- Új `app/src/domain/legutobbAktivPaciensek.ts` (vagy hasonló, a
  `planFolders.ts` mintájára) — a megosztott rendező/limitáló helper
  (4. döntés).
- `app/src/pages/Home.tsx:110–216` — a kártya-sorrend átalakítása: fő CTA
  (1. döntés) + aktív draft (változatlan, 32. tétel) + recent lista (új,
  3–5. döntés); a demó-gombok/kártya eltávolítása (6. döntés).
- `app/src/pages/DemoPage.tsx` (29. tétel eredménye) — a "Demó adat
  visszaállítása" gomb és a "Minden adat törlése" kártya átköltöztetése
  ide (6. döntés).

## Tesztelés (irányadó, nem kimerítő)

- Egy páciens létrehozása/törzsadat-mentése/terv-véglegesítése után
  megjelenik a Home recent listáján, a megfelelő aktivitás-típus
  szöveggel.
- Egy páciens MEGNYITÁSA (kattintás, megtekintés, mentés nélkül) NEM
  emeli a listára/nem frissíti a sorrendjét.
- A recent lista max 5 elemű, a legutóbbi aktivitás szerint csökkenő
  sorrendben.
- Egy recent sorra kattintva a 30. tétel páciens-részletoldalára
  navigál, `Kezelési tervek` tabon.
- A Kezdőlapon nem látszik "Demó adat visszaállítása" gomb sem "Minden
  adat törlése" kártya; mindkettő elérhető és működik a `/demo` oldalon.
- Az aktív-draft blokk viselkedése (Continue, discard) a 32. tétel
  szerint változatlan.
