# 3. Funkcionális specifikáció

## Képernyők

1. Indítás
2. Terv adatai — itt dől el a terv nyelve és pénzneme (D21), hat szekcióra
   tagolva (D61)
3. **Terv szerkesztő** — a legfontosabb
4. Előnézet és véglegesítés
5. Terv-láncok és verziók — elsődleges gazdája a 10. képernyő `Kezelési
   tervek` tabja; a DEMO oldal „Összes terv" füle (D54) a másodlagos,
   több-pácienses áttekintő
6. Kezelések és árak (árlista admin)
7. Beállítások
8. Filerendszer — demó-only, a leendő fájlrendszeres architektúra vizualizációja, a DEMO oldal egyik füle
9. Páciensek — élő, terv-mentéstől független törzsadat (D33)
10. Páciens részletei — URL-lel címezhető, két tabbal (D35)
11. Terv részletei — egy véglegesített verzió read-only nézete, URL-lel
    címezhető

### Fő navigáció (D34)

A fenti számozott lista a képernyők tartalmát írja le, nem a navigációs
sávot. A végleges, öt tételes fő navigáció:
`Kezdőlap | Páciensek | Kezelések és árak | Beállítások | DEMO`.

A `DEMO` menüpont öt fület fog össze, mindegyik URL-címezhető
(`/demo/:tab`, D54): **Funkciók** (ez a dokumentum felhasználó-szemszögű
megfelelője, `FEATURES.md`), **Összes terv** (a globális, több-pácienses
terv-lánc/verzió fa, lásd § 5, D54 — ez az EGYETLEN kivétel: valódi
terv-adatot mutat, és a rajta lévő akciók — Új terv, Új verzió, Másolás,
Letöltés — élesek), **Filerendszer** (a fenti 8. képernyő),
**Változásnapló** (`CHANGELOG.md`) és **Adatkezelés** (a Kezdőlapról
D39-cel átköltöztetett „Demó adat visszaállítása"/„Minden adat törlése")
— a `/tervek` URL erre a fülre (`/demo/tervek`) redirectel.

A `Páciens`/`Terv szerkesztő`/`Előnézet`/`Korábbi tervek` képernyők (2–5.)
korábban átmenetileg saját nav-linkkel is elérhetők voltak — ezt a
terv-workflow héj (lásd alább, D36) váltotta fel, a linkek megszűntek.

### Terv-workflow héj (D36)

A `Terv adatai`/`Terv szerkesztő`/`Előnézet és véglegesítés` (2–4.
képernyő) közös héjban él (`app/src/components/TervWorkflowShell.tsx`),
ami mindhárom oldal fölött állandó:

- **Breadcrumb** — `Páciensek > [páciens neve]`. A `Páciensek` szegmens a
  pácienslistára (9. képernyő) linkel. A páciens-név szegmens a piszkozat
  ismert `patientDir`-je (D37) esetén a páciens-részletoldalára (10.
  képernyő) linkel, egyébként csak szöveg — a `patientDir` nem minden
  belépési ponton ismert (pl. egy funkció előtti perzisztált piszkozat; a
  "+ Új páciens" ág a quick-create dialógus (D41) sikeres mentése óta
  már ismeri). Üres névnél a "Új páciens" tartalék-címke látszik.
- **Stepper** — szabadon kattintható, 3 lépés: `Terv adatai → Kezelések →
  Előnézet és véglegesítés`. Az aktuális lépés a route-ból dől el
  (`/paciens`/`/terv`/`/elonezet`), nincs hozzá külön `Plan`/state-mező.
  Validáció és blokkolás nélkül bármelyik lépésre át lehet ugrani — ez a
  meglévő, laponkénti "Tovább a terv szerkesztőhöz"/"Előnézet" gombok
  MELLETT él, nem helyettük. Minden route-váltáskor a héj a piszkozat
  `lastRoute` metaadatát (D37) is frissíti — ebből tudja a Kezdőlap
  "Piszkozat folytatása" kártyája, melyik lépésre navigáljon vissza (lásd
  lent, § Autosave).
- **Lépés-elhagyási ajánlat** (D48) — a stepper Kezelések/Előnézet linkjei
  és a Terv adatai lap "Tovább" gombja MEGELŐZI a tényleges navigációt egy
  elfogási ponttal (`components/LepesGuardContext.tsx`), amit KIZÁRÓLAG a
  Terv adatai lap "Páciens adatai" szekciója (`TorzsadatSyncCard.tsx`)
  használ, amíg mountolva van — a stepper Terv adatai (visszafelé) linkje,
  a breadcrumb és a NavBar-navigáció (D46, külön mechanizmus) nem érintett.
  Lásd § 2. "Páciens adatai" alszakasz, "Páciens törzsadata (D48)" bekezdés.

A sikeres véglegesítés utáni "A terv elmentve ✓" sikerpanel (lásd § 4)
felett a héj továbbra is látszik.

---

## 1. Indítás

Első futáskor a doki kijelöl egy gyökérmappát. Ez a `PlanStorage`
inicializálása. A böngészős implementációnál a hozzájárulást
munkamenetenként újra kell kérni — ez egy kattintás, de számolni kell vele.

### Kezdőlap tartalma (D39)

A Kezdőlap (`app/src/pages/Home.tsx`) minimalista: pontosan három blokk,
ebben a sorrendben.

- **Sérült-piszkozat kártya** és **aktív-draft kártya** — a piszkozat-
  autosave belépési pontja, lásd lent § Autosave. Legitim hibaállapot,
  illetve folyamatban lévő munka jelzése — nem demó-eszköz, nem tartozik a
  lenti recent listához.
- **Fő CTA**: `+ Új kezelési terv` — az `/uj-terv` köztes páciens-
  választóra visz (lásd § 5 „Új terv indítása"), feltétel nélkül (a
  piszkozat-felülírás-őr ott dől el).
- **Legutóbbi páciensek** — max 5 páciens, a legutóbbi JELENTŐS
  aktivitásuk szerint csökkenő sorrendben. „Jelentős aktivitás" a páciens
  létrehozása, a törzsadat mentése vagy egy terv véglegesítése — egy
  páciens/terv puszta MEGNYITÁSA sosem számít bele. Az időbélyeg a
  `paciens.json` új, opcionális `utolsoAktivitas` mezőjén él
  (`{ tipus, idopont }`, `docs/02-domain-modell.md` § Páciens- és
  terv-mappa) — puszta index, akárcsak a mező többi tartalma (D29): egy
  sérült/ismeretlen érték némán kimarad a listából, nem hibát dob. Egy sor
  a páciens nevét, születési dátumát, telefonját (a lezárt törzsadatból,
  vagy — ha az még nincs — a legutóbbi terv `paciens` pillanatképéből,
  `megjelenitettTorzsadat()`) és az aktivitás típusát + relatív idejét
  mutatja (pl. „Terv véglegesítve · 2 órája"); kattintásra a páciens
  részletoldalára navigál, a `Kezelési tervek` tabra (D192, alapértelmezett
  tab, nincs hozzá explicit `location.state`).

A korábbi „Demó adat visszaállítása"/„Minden adat törlése" gomb és a
„Korábbi tervek" gomb NEM része ennek a három blokknak — mindkettő a DEMO
oldalra költözött (D54): előbbi kettő az Adatkezelés fülre, utóbbi (a
globális, több-pácienses terv-lánc/verzió fa) az „Összes terv" fülre
(`/demo/tervek`), lásd fent § Fő navigáció.

A nyelvválasztás nem itt, hanem a Terv adatai lapon van (2. képernyő) —
lásd ott.

---

## 2. Terv adatai

### Szekciók (D61)

A lap hat, vizuálisan elkülönített szekcióra tagolódik, ebben a
sorrendben: **Terv címe** → **Páciens adatai** (a személyes adatok +
beágyazva a „Páciens törzsadata” diff) → **Dokumentum nyelve** →
**Pénznem** → **Kezelőorvos** → **Dátumok**. A Dokumentum nyelve/Pénznem
szekció mindig látszik, feltétel nélkül (52. tétel, D63); a Kezelőorvos
szekció szerkeszthető választó, lásd lent (D67).

### Terv címe (D61)

Szerkeszthető mező, két írási útvonallal a lánc állapotától függően:

- **Már mentett lánc** (`plan.tervId !== ''`): a mező a `terv-cimke.json`
  tartalmát mutatja; ha a beírt érték eltér a tároltól, egy „Mentés” gomb
  jelenik meg (Enter is ment) — ugyanaz a mechanizmus, mint a „Terv-láncok
  és verziók” (5. képernyő) ceruza-ikonja, csak egy második belépési
  ponttal. Írási hiba esetén piros hibasáv jelenik meg, ami a következő
  mentési kísérletig látszik.
- **Vadonatúj lánc** (`plan.tervId === ''`): nincs hova azonnal írni (a
  `terv-cimke.json` `patientDir`+`planDir` azonosítót igényel) — a beírt
  érték a piszkozat UI-workflow metaadatában él, túléli a `/paciens` →
  `/terv` → `/elonezet` navigációt, és a véglegesítéskor (§ 4) íródik ki.
  Egy ekkori írási hiba NEM jelenti azt, hogy a mentés sikertelen — a terv
  ekkor már a lemezen van, a hiba a siker-képernyőn egy külön, amber
  jelzésként jelenik meg, a cím utólag a „Terv-láncok és verziók” (5.
  képernyő) ceruza-ikonjával pótolható.

Mindkét ágon a mező üresen az élő auto-javaslatot (`javasoltTervCim()`,
D27) mutatja placeholderként. A mappanév-képzés (`storage.savePlan()`)
ettől függetlenül VÁLTOZATLANUL az élő javaslatból képződik (D29) — a
kézzel beírt cím sosem befolyásolja a fizikai mappanevet.

### Dokumentum nyelve / Pénznem (D21, D63)

Két külön szekció, ami **mindig látszik**, feltétel nélkül — a német
nyelv választásához nincs engedélyező kapcsoló (52. tétel, D63). A két
szekció egymástól **független** kétállású kapcsolót tart:

- **Nyelv** (`hu` / `de`) — a nyomtatvány szövege: a tételnevek (ha
  van hozzájuk fordítás), a PDF fix feliratai, a dátumformátum, a
  sablonszövegek (nyilatkozat, fizetési feltételek, garancia), és a
  pénzösszegek ezres/tizedes elválasztója (D63).
- **Pénznem** (`HUF` / `EUR`) — melyik `Tetel.ar` kulcsot nézi a
  szerkesztő, és a pénzösszeg tizedesjegyeinek száma/pénznemjele. A
  kereső MINDEN aktív tételt megmutat, függetlenül attól, van-e ára a
  kiválasztott pénznemben (D71) — egy beárazatlan tétel `—` listaárral,
  kézzel megadható ajánlati árral vehető fel.

A német páciens a legvalószínűbb ok, amiért ez a kettő szétválik: sokan
Magyarországon, forintban fizetnek. Alapértéke ezért `HUF`, még német
nyelvű ajánlatnál is — hacsak a pácienshez nincs korábbi véglegesített
terv, lásd alább.

**Öröklés meglévő pácienshez induló új láncnál (D52):** ha a pácienshez
van legalább egy VÉGLEGESÍTETT terve, az új lánc ennek a nyelvét/
pénznemét veszi át kiinduló értékként (a doki utólag szabadon
módosíthatja). Csak PISZKOZAT-státuszú tervek, vagy egyetlen korábbi
terv híján a fenti globális alapérték marad érvényben.

**A teljes piszkozat-életciklus alatt szabadon módosítható** (D63) —
a technikai autosave/mentés nem fagyasztja ezeket az értékeket, csak a
véglegesítés hozza létre az immutable pillanatképet. Egy már
véglegesített verzió megtekintésének nincs ezen a lapon szerkeszthető
útja — a „Korábbi tervek” listáról induló „Megnézés” a mentett PDF-et
nyitja meg, nem ezt a lapot; az itt szerkeszthető nyelv/pénznem mindig egy
draft (PISZKOZAT-státuszú) tervhez tartozik. A lap Kezelőorvos szekciója
(lásd lent, D67) ugyanígy szabadon szerkeszthető marad.

**Nyelváltás (fagyás előtt) megőrzi a kézzel szerkesztett sorneveket**
(D24): egy `tetelId`-hez kötött sor neve **csak akkor** frissül az új
nyelv szerinti árlistai névre, ha a váltás előtti nyelven még pontosan az
árlistai nevet viselte (`nevSnapshot === tetel.nev[nyelv]`, nyers érték,
nem hu-visszaeséses). Ha a doki kézzel pontosította, a név **változatlan
marad** — a nyelváltás sosem ír felül némán egy kézzel írt szöveget. Az
egyedi (`tetelId` üres) sorokat a nyelváltás sosem érinti, mert nincs
mihez viszonyítani. Ha a tervben már vannak sorok, a nyelváltás
megerősítő párbeszéde **előre kiírja a tényleges hatást**: hány sor
frissül az új nyelvre és hány marad változatlan, nem egy általános
figyelmeztető mondat.

Ha a kiválasztott nyelven/pénznemen hiányos a tartalom, a kártya alatt
figyelmeztetés jelenik meg (hány aktív tételnek nincs neve az adott
nyelven, illetve hogy a kiválasztott pénznemben van-e egyáltalán
beárazott tétel) — ez a „ne a szerkesztőben legyen meglepetés" elve.

**Pénznemváltás NEM törli a sorokat** (D71): minden sor a másik
pénznemben utoljára ismert árát (`Sor.masikPenznemAr`) tartja meg
váltáskor — visszaváltáskor egy korábban kézzel átírt ajánlati ár
változatlanul visszaáll, nem íródik felül némán az árlistával. Ha egy
sornak még nincs mentett állapota az új pénznemben, az árlistából
szedődik újra (`tetel.ar[újPénznem]`); ha a tétel abban a pénznemben
nem beárazott (vagy a sor egyedi), a sor „hiányzó ár" állapotba kerül
(`0`, kézzel kitöltendő), törlés nélkül. Ha a tervben már vannak sorok,
a váltás megerősítő párbeszéde előre kiírja a tényleges hatást (hány sor
kapja vissza a mentett árát, hány frissül az árlistából, hány marad ár
nélkül) — a nyelváltás dialógusának mintájára. Nincs automatikus
HUF↔EUR átváltás egyik irányban sem (D11).

### Páciens adatai

A „Páciens adatai” szekció két részből áll: a személyes adatok mezői, majd
alattuk, elválasztóval, beágyazva a „Páciens törzsadata” eltérés-jelzés
(lásd lent) — a kettő korábban két külön kártya volt, ma egy szekció
(D61).

**Személyes adatok.** Mezők: név, születési idő, lakcím, telefon, e-mail,
TAJ, „kiskorú" jelölő. Ha kiskorú, megjelenik a törvényes képviselő neve
és elérhetősége.

Csak a **név** kötelező (ebből képződik a mappanév). A többi hiánya
véglegesítéskor figyelmeztetést ad, de nem blokkol — a doki néha
gyorsan akar árajánlatot adni.

**Páciens törzsadata (D48).** A `paciens-adatok.json` (D33) és az
AKTUÁLIS terv-piszkozat `paciens` blokkja közötti mezőszintű
összevetés/szinkron, kártyakeret nélkül, a személyes adatok alatt. Csak
akkor jelenik meg, ha a piszkozat páciensmappája ismert
(`feloldPatientDir()`, `app/src/domain/torzsadatBetoltes.ts`); ha nem, ez
a rész kimarad.

- **Lezárt törzsadatnál**: az eltérő mezők száma, és KÉT külön gomb —
  „Frissítés a törzsadatból” (master → piszkozat) és „Törzsadat frissítése a
  tervből” (piszkozat → master) — soha nem egy közös „Szinkronizálás” gomb.
  Mindkettő ugyanazt a mezőszintű, checkboxos dialógust nyitja
  (`components/TorzsadatDiffDialog.tsx`), csak a kijelölt mezőket alkalmazva;
  alapból SEMMI nincs kijelölve, „Összes kijelölése” mindent bejelöl.
  Eltérés hiányában semleges szöveg, gombok nélkül.
- **Törzsadat nélkül (fallback)**: információs blokk (nem hiba-szín) jelzi,
  hogy a páciensnek még nincs önálló törzsadata, egy gombbal, ami AZONNAL
  létrehozza a piszkozat aktuális adataiból.
- **A „Tovább a terv szerkesztőhöz” gomb és a workflow-stepper Kezelések/
  Előnézet linkjei** (lásd lent, § Terv-workflow héj) a lépés elhagyásakor
  egyszer felkínálják a törzsadat-frissítést, ha VALÓDI ütközés áll fenn — két
  eltérő, MINDKÉT oldalon kitöltött érték. Egy üres mező puszta pótlása (a
  leggyakoribb eset: egy vadonatúj páciensnél a törzsadat a quick-create után
  még csak a nevet tartalmazza, a doki itt tölti ki a többit) NEM számít
  ütközésnek, nem szakítja félbe a workflow-t. Ugyanarra az eltérésre a
  prompt a workflow-n belül nem jelenik meg újra, amíg a diff nem változik.
  Ha nincs törzsadat, ugyanez a lépés egy (alapból kijelöletlen) opciót ad a
  törzsadat azonnali létrehozására.
- **Írási hiba** (kizárólag a piszkozat → master irányban) esetén a dialógus
  nyitva marad, a hibaüzenet mellett „Újra” (ugyanaz az írás újra) vagy —
  csak a lépés-elhagyási prompt módban — „Folytatás írás nélkül” (a
  piszkozat érintetlenül a workflow folytatódik) választással.

### Kezelőorvos (D67)

Egy legördülő választó (`plan.orvos`), ami csak a Beállításokban
jelenleg **aktív** orvosok neveit listázza. Ha a terv egy időközben
deaktivált vagy törölt névre hivatkozik (árva hivatkozás), a választó
ezt a nevet is mutatja, elkülönítve a lista alján, és egy figyelmeztető
sáv jelzi, hogy a véglegesítés blokkolva lesz, amíg a doki nem választ
aktív orvost — a draft ettől függetlenül szabadon szerkeszthető marad
(lásd § 4. Előnézet és véglegesítés).

A mező a fenti Dokumentum nyelve/Pénznem szekciókhoz hasonlóan a teljes
piszkozat-életciklus alatt szabadon szerkeszthető, egy már mentett lánc
draftján is.

**Öröklési szabályok:**
- **Új terv-lánc**: mindig a Beállításokban megjelölt globális
  alapértelmezett orvos, a páciens korábbi tervétől függetlenül.
- **„Új verzió”**: a forrás verzió orvosát örökli, HA az még aktív;
  ha időközben deaktiválták, a globális alapértelmezett orvosra esik
  vissza, és a szerkesztő a betöltéskori dátum-info sávban (§ Korábbi
  terv új verzióra nyitása) egy második mondattal jelzi ezt.
- **„Másolás új tervbe”**: mindig a globális alapértelmezett orvossal
  indul — a forrás verzió orvosa SOSEM másolódik át.

**Beállítások → Rendelő adatai** (§ 7.): az orvos-lista soronként tart
egy nevet, egy aktív/inaktív kapcsolót és egy „alapértelmezett”
jelölőt. Az éppen alapértelmezett orvos deaktiválása, ha van másik
aktív orvos, azonnali újraválasztást kényszerít (modális választó); ha
nincs másik aktív orvos, a deaktiválás a dialógus megnyitása nélkül,
azonnal engedett, figyelmeztetéssel. Egy orvos név **törölhető** (nem
csak deaktiválható) — a `plan.orvos` a mentéskor rögzült NÉV-pillanatkép,
nem `id`-hivatkozás, ezért egy korábbi terv olvashatósága a törlés
után is érintetlen marad.

### Dátumok (D62)

Két mező: **Kiadás dátuma** (`keltezes`) — marad olvasható, automatikusan
számolt (D22, a betöltés pillanatában bélyegzett, sosem kézi); és
**Érvényes eddig** (`ervenyesIg`) — szerkeszthető, alapértéke
`keltezes + beallitasok.ervenyessegNap`. Kiürítve, a mező elhagyásakor
(blur) automatikusan visszaáll az alapértékre — az `ervenyesIg` soha nem
maradhat üresen (lásd CLAUDE.md „Sérthetetlen szabályok”). Az
alapértéktől eltérő érték mellett egy „Vissza az alapértelmezettre”
gomb jelenik meg; ha az érvényesség vége a kiadás dátuma elé esik, semleges
figyelmeztetés jelzi.

Egy kézzel átírt `ervenyesIg`-et a következő „Új verzió” (D22,
`frissDatummal`) változatlanul némán felülír — a kézi ablak szándékosan
nem öröklődik verziónyitáskor.

---

## 3. Terv szerkesztő

Ez dönti el, hogy az app gyorsabb-e az Excelnél. Megvalósítás:
`app/src/pages/PlanEditorPage.tsx`.

### Fogtérkép (kattintható)

A fogtérkép a **beavatkozás lista fölött**, egy lenyíló panelben van —
alapból **csukva**, akkor is, ha a tervben már vannak érintett fogak
(D59); a csukott gomb felirata egyszerűen „Érintett fogak", darabszám
nélkül. Kattintásra nyílik ki. Kinyitva nemcsak áttekintés, beviteli eszköz is —
kezelés-kategóriánként színezve (lásd `app/src/design/treatmentVisuals.ts`).

- **Kattintás egy már érintett fogra** a hozzá tartozó sorra ugrik
  (fókusz + görgetés a „Fog" mezőre). Ha több sor is érinti (pl.
  gyökérkezelés és korona ugyanazon a fogon), az ismételt kattintás a
  következő érintett sorra lép, körbe.
- **Kattintás egy kezeletlen fogra** új, tétel nélküli sort vesz fel a
  kiválasztott fázisban, a fogszámmal már kitöltve, és a sor
  „Beavatkozás" cellájában megjelenő keresőre fókuszál — ugyanazzal a
  gépel → nyíl → Enter ciklussal, mint a fázis alatti keresőnél. A
  választás a sort **a helyén tölti ki**, nem fűz újat. (A panel nyitva
  marad, hogy a fókusz odaugorhasson.)
- **Fázisválasztó** csak nyitott panelen, és csak akkor jelenik meg, ha
  egynél több fázis van — eldönti, melyik fázisba kerüljön az új sor.
- **Soronkénti fogválasztó**: a „Fog" mező melletti 🦷 ikongomb egy felugró
  fogtérképet nyit, ahol kattintással jelölhetők ki a sor fogai (a mező
  szabadszöveges marad — ha nem FDI-formátumú tartalmat talál, pl. „jobb
  felső", megerősítést kér felülírás előtt, nem ír felül némán).
- **Billentyűzet**: csukva a panel gombja egy sima Tab-megálló; nyitva a
  fogtérkép **is** egyetlen Tab-megállóként érhető el, nyilakkal lépked a
  fogak közt (`←`/`→` az állcsonton belül, `↑`/`↓` állcsontot vált
  ugyanabban a pozícióban), `Enter`/`Szóköz` aktivál.
- A darabszám (`Db`) automatikusan követi a sor fogainak számát, amíg a doki
  kézzel felül nem írja (D32) — lásd „Sor mezői" és „Figyelmeztetés" lentebb.
  A fogtérkép-kattintással felvett új sor (fent) is ezen az úton indul.

### Tételkereső

- **Csak keresés, nincs kategória böngésző.**
- Ékezetfüggetlen: `gyoker` → *Gyökérkezelés*, `esztetikus` →
  *Esztétikus tömés*. Normalizálás:
  `s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')`
- A találatok kategória szerint csoportosítva jelennek meg, az ár a sor
  jobb szélén — ha a tételnek nincs ára az aktuális pénznemben, `—`
  jelenik meg helyette (D71), a tétel attól még találat és felvehető.
- Csak `aktiv: true` tételek — a pénznem NEM szűr a találatokra (D71):
  egy beárazatlan tétel is megjelenik, kézi ajánlati árral vehető fel.
- A keresés **mindkét nyelven megy, mindig** — a doki magyar, magyarul
  gépel akkor is, ha német ajánlatot állít össze. Csak a *megjelenített*
  és a felvételkor *rögzített* név nyelvfüggő (lásd alább, „Hiányzó
  fordítás"); ha a tétel német neve hiányzik, a magyar névre esik vissza,
  jól látható `HU` jelöléssel a találati soron és a felvett soron is.
- A lista **legfeljebb 12 találatot** mutat. Ha ennél több egyezik, a
  lista alján egy nem választható, tájékoztató sor jelzi: „+N további
  találat — pontosíts a kereséssel". Pontosan 12 (vagy kevesebb) találatnál
  nincs jelzés — a lista ilyenkor teljes. A 12-es megjelenítési limit
  szándékosan **nem** emelkedik: a nagyobb limit csak elodázná, hogy a
  doki pontosítson.
- Billentyűzet: `↑ ↓` navigál, `Enter` hozzáad, `Esc` bezár. A csonkítás-
  jelző sor **nem** része a ciklusnak.
- **Hozzáadás után a kereső kiürül és visszakapja a fókuszt.** Ez a
  ciklus a lényeg: gépel → nyíl → Enter → gépel tovább, egérhasználat
  nélkül.
- **Nulla találat esetén** az Enter nem tesz semmit üresen — a gépelt
  szöveget veszi fel egyedi sorként (lásd „Egyedi sor" lent). Ha **van**
  találat, de egyik sem megfelelő, a lista alján egy „Egyedi tétel
  felvétele: „…"" pszeudo-opció is végigjárható ugyanazzal a `↑ ↓`/`Enter`
  ciklussal, a valódi találatok után.
- **Friss piszkozat autofókusza (D59):** egy vadonatúj, még soha nem
  mentett terv-láncon (nincs `tervId`), amíg egyetlen fázisnak sincs sora,
  az első fázis keresője a lap betöltésekor automatikusan fókuszt kap —
  a doki egérhasználat nélkül azonnal gépelhet. Ez KIZÁRÓLAG a lap
  betöltésekor, az első fázis keresőjére vonatkozik, és megszűnik, amint
  az első sor bekerül; egy betöltött („Új verzió", „Másolás új tervbe")
  terven — akkor is, ha még nincs sora — szintén nincs automatikus
  fókusz, hogy ne vigye el a figyelmet a lap tetején megjelenő
  tájékoztató Callout-okról.
- **Új fázis autofókusza (D64):** a „Fázis hozzáadása" gombra kattintva
  az ÚJ fázis keresője automatikusan fókuszt kap és a lap odagördül a
  fázishoz — kattintás nélkül azonnal gépelhető a következő tétel. Ez
  minden fázisra vonatkozik (nem csak az elsőre), és nem törli a többi
  fázis alatt épp begépelt keresőszöveget.
- **Hozzáadás után NEM a Fog mező kap fókuszt.** A fókusz a fenti ciklus
  szerint a (kiürült) keresőn marad; a Fog mezőn Enter sem navigál sehova
  — ez szándékos (D64): a fő UX-ciklus (gépel → nyíl → Enter → gépel
  tovább) nem törhet meg. A fogszám kitöltése Tabbal érhető el.

### Gyorsgombok

Az `arlista.json`-ban `gyakori: true` jelölésű tételek chipként
megjelennek a kereső alatt. Egy kattintás = hozzáadás. Ugyanaz a szűrt
halmaz (`aktiv: true` ÉS az aktuális pénznemben árazott) a forrása a
keresőnek és a gyorsgomboknak is — egy inaktív vagy az adott pénznemben
árazatlan tétel egyikben sem jelenik meg.

Ugyanaz a tétel (kereséssel vagy gyorsgombbal) tetszőlegesen sokszor
felvehető — a hozzáadás sosem dedup-ol, és a felvett soroknak nincs
külön „duplikálás" akciójuk (a sor-akciók: leírás-toggle, mennyiség-⟳,
becsült-ár-≈, törlés).

### Sor mezői

| Mező | Viselkedés |
|---|---|
| Beavatkozás | **Szerkeszthető** szövegmező, alapból a felvételkor rögzített (árlistai vagy egyedi) névvel kitöltve — a doki pontosíthatja, elgépelt/rövidített árlistai nevet javíthat. Az átírás megtartja a `tetelId`-t: az ár, a fogtérkép kategória-színe és a német-fallback ellenőrzés változatlanul az árlistai tételen át működik, csak a megjelenő szöveg (`nevSnapshot`) más. Üresen a sor véglegesítéskor kemény blokk (lásd „Kitöltetlen sor" lent). Egy `tetelId`-hez kötött soron, ha a `nevSnapshot` kézzel eltér a felvételkori árlistai névtől, egy „átírt" jelvény és egy kompakt reset-vezérlő jelenik meg — a reset a `tetel.nev`-et a terv nyelvén állítja vissza (`domain/nev.ts` `nevAtirt()`, D65); ez a jelzés NYELVFÜGGETLEN (magyar terven is működik), a fordítás-hiányt jelző `HU` jelvénytől (`sorFallback`) FÜGGETLENÜL, akár egyszerre is megjelenhet mindkettő. Ha a kézzel írt szöveg nyelvi review-ja mismatch-et jelez, egy `HU szöveg`/`DE szöveg` jelvény + „Nyelv ellenőrizve" vezérlő is megjelenik (D72, lásd lent) |
| Fog | Szabad szöveg, felsorolás. Nem kötelező. A beírt *számokat* validáljuk (lásd lent), a folyószöveges jegyzet (pl. „jobb felső") változatlanul megengedett |
| Db | Automatikusan követi a Fog mezőben felsorolt (dedupolt) fogszámot, amíg a doki kézzel be nem írja — attól kezdve a sor levált, egy ⟳ ikongomb jelenik meg a mező mellett, amire kattintva egy lépésben visszaáll a fogak számára és újra követővé válik (`Sor.mennyisegKezi`, docs/02-domain-modell.md § Fogszám kezelés, D32). Alapérték 1, minimum 1 |
| Listaár | Csak megjelenítés, halványan. Sávos tételnél `35 000–55 000` formában, kiemelve. Egyedi sornál, illetve a terv pénznemében beárazatlan tételnél `—` (nincs árlistai referenciaár, D71). Ha a sor `listaEgysegar`-ja eltér a MAI árlistától, egy ⟳ ikongomb jelenik meg mellette (D70) |
| Ajánlati ár | Szerkeszthető. Alapértéke a listaár (sávosnál a `min`, egyedi sornál `0`). EUR pénznemű tervnél a mező **euróban** fogad be és jelenít meg szöveget (pl. `35,50`), a tárolás változatlanul centben történik — ugyanaz a `NumberField` `unit` mechanizmus, ami az árlista adminban már véd az euró/cent tévesztéstől. Ez tisztán UI-réteg felirat, nem pénzösszeg-formázás, ezért nem indokol közös `domain/money.ts` segédfüggvényt. Ha eltér a listaártól, egy kompakt reset-vezérlő állítja vissza a listaárra (D65) |
| Becsült ár (≈) | Soronkénti, szabad és kétirányú kapcsoló az Ajánlati ár mező ALATT (ghost ikongomb, `≈` szövegglyph, D65 — korábban a mező mellett volt) — bármelyik soron be- és kikapcsolható, függetlenül attól, hogy a sor árlistai FIX, SAVOS, fogtérkép-kattintásos vagy egyedi eredetű. Bekapcsolva a nyomtatványon `*` + lábjegyzetet kap (D15). Csak megjelenítést vezérel, az összegzésbe nem szól bele; nincs eredet-nyilvántartás, a sor nem jegyzi meg, honnan jött, és az aktuális árlistából sem kérdezzük vissza (D7) |
| Összeg | `tenylegesEgysegar * mennyiseg` |
| Leírás | Összecsukható, a Beavatkozás mező melletti „+ leírás"/„Leírás" jelvényre kattintva nyílik ki, teljes szélességben, a sor alatt (docs/02-domain-modell.md § Tétel-leírás). Bármelyik sor kaphat leírást, árlistai vagy egyedi is. Ha a sor egy `csomag: true` tételre hivatkozik és üres a leírás, a trigger amber jelzést kap — korai figyelmeztetés, mielőtt a véglegesítés-őr megerősítést kérne. Ha egy `tetelId`-hez kötött, VAN árlistai leírással rendelkező sor leírása kézzel eltér attól, „átírt leírás" jelvény + reset jelenik meg a leírás-sáv alján (`domain/nev.ts` `leirasKoveti()`/`arlistaiLeiras()`, D65) — hiányzó árlistai leírásnál (D27: nincs HU-visszaesés) nincs mire visszaállítani, ilyenkor sem jelvény, sem reset. A leírás nyelvi review-jelvénye ugyanúgy megjelenhet a sáv alján (D72) |

A „Listaár"/„Ajánlati"/„Összeg" oszlopfejléc a terv pénznemét is jelzi
(`(Ft)` / `(€)`), hogy egyetlen oszlop se tűnjön „biztonságosnak" a
pénznem-összetévesztéssel szemben.

Ha `tenylegesEgysegar < listaEgysegar`, a soron megjelenik egy zöld `−X%`
jelölés; ha `tenylegesEgysegar > listaEgysegar`, egy amber `+X%` felár-
jelölés (D65). **Mindkettő csak a szerkesztőben látszik, a nyomtatványon
nem** (D9).

Sávos tételnél a listaár helyén a sáv látszik, és az ajánlati ár mező ki
van emelve — jelzi, hogy itt dönteni kell.

A Listaár ⟳ gombja megerősítő előnézetet nyit (D70): a régi→új listaár, ha
volt kézi ajánlati ár, egy jelzés, hogy az törlődik, és egy „Hatás a
tervre" összegzés (Kezelések összege, aktív Kerek végösszeg esetén a
Fizetendő is, régi→új). Elfogadáskor a sor listaára ÉS ajánlati ára is a
mai árlistai értékre áll, a kézi felülírás törlődik — a sor visszaáll a
default-following állapotba. Az árlista admin-mentése ettől függetlenül
SOHA nem módosít automatikusan egy már megnyitott/mentett tervet — a
frissítés mindig a doki explicit, soronkénti döntése.

Német nyelvű terven, `tetelId`-hez kötött soron a Beavatkozás mező mellett
két, egymást kizáró jelvény jelenhet meg: `HU`, ha a tételnek nincs német
neve az árlistában, vagy „átírt", ha van német neve, de a sor szövege attól
eltér (kézzel pontosítva). Egyedi sor egyiket sem kaphatja, hiszen nincs
árlistai tétel, amihez viszonyítani lehetne (lásd lent, „Egyedi sor").
Magyar terven egyik sem jelenik meg (a doki magyarul gépel, ott nincs mit
jelezni, D21).

**Nyelvi review a kézzel írt szövegeken (D72)** — SZÁNDÉKOSAN külön a fenti
két jelvénytől (mindkét terv-nyelven és egyedi soron is működik, szemben a
`sorFallback`-kal, docs/02-domain-modell.md § Nyelvi review a kézzel írt
szövegeken). Ha a Beavatkozás vagy a Leírás mező kézzel írt szövege
mismatch-elt (a szöveg egy MÁSIK nyelven íródott, mint a terv aktuális
nyelve, és nincs rá explicit elfogadás), a mező mellett egy `HU szöveg`/
`DE szöveg` jelvény és egy „Nyelv ellenőrizve" ghost ikongomb jelenik meg
— a gombra kattintva a figyelmeztetés eltűnik, NINCS „✓ ellenőrizve"
sikerjelvény. A szöveg puszta szerkesztése (akár a helyes nyelvre teljesen
átírva) ÖNMAGÁBAN nem oldja fel a mismatch-et, kizárólag ez az explicit
akció. A név-/leírás-reset (fent) a review-metaadatot is törli.

Sor törlése azonnali — nincs megerősítő dialógus egyetlen sorra (szemben
a fázis törlésével, ami több sort is elvihet egyszerre, lásd lent,
„Fázisok") —, de a törölt sor helyén egy „Visszavonás" felirat jelenik
meg rövid ideig, amire kattintva a sor visszakerül az eredeti
pozíciójába (D60).

### Egyedi sor

Ha a tételkeresőben nincs (megfelelő) találat, a gépelt szöveg egyedi
sorként vehető fel — lásd fent, „Tételkereső". Az egyedi sor:

- **Nincs árlistai hivatkozása** (`tetelId` üres) — a Beavatkozás mező
  mellett egy semleges „egyedi" jelvény jelzi.
- **Egy ármező van rajta**, nincs külön „listaár" — az Ajánlati ár
  szerkesztése a listaárat is vele együtt írja, ezért egyedi soron
  **sosem** jelenik meg kedvezmény-jelölés.
- **A „becsült ár" jelölő ugyanúgy működik rajta**, mint bármelyik más
  soron — bekapcsolva a nyomtatványon csillagot és lábjegyzetet kap.
- Német nyelvű ajánlaton egy **kitöltött** egyedi sor is bekerül a
  véglegesítés megerősítő listájába, de **saját, harmadik felsorolás**
  alá („Egyedi, szabad szöveges sor — a nyelvét te írtad"), nem a „nincs
  német nevük az árlistában" alá — nem hiányzó fordításról van szó, hanem
  arról, hogy szabad szöveghez nincs mihez viszonyítani, a doki bármelyik
  nyelven írhatta. A szerkesztőben nem kap `HU` jelvényt.
- Nem kötelező kitölteni azonnal: a fogtérkép-kattintással létrehozott,
  még névtelen sor is ugyanezt a mechanizmust használja (lásd fent,
  „Fogtérkép"), csak addig kereső módban marad, amíg a doki tételt nem
  választ vagy egyedi nevet nem ad neki.
- **Leírást is kaphat**, ugyanúgy, mint egy árlistai sor (docs/02-domain-modell.md
  § Tétel-leírás) — mivel nincs háttér-tétel, mindig szabadon beírt szöveg,
  nyelváltás nem érinti, „átírt"/`HU` jelvénynek nincs értelme rajta.

### Kitöltetlen sor

Egy **meg nem nevezett** sor (üres Beavatkozás mező) a véglegesítésnél
kemény blokk — nem folytatható, amíg a doki tételt nem választ, egyedi
nevet nem ad, vagy nem törli a sort. Az ár lehet `0` egy kitöltött nevű
soron, ez önmagában nem blokkol (`app/src/domain/kitoltetlen.ts`
`kitoltetlenSorok`).

### Figyelmeztetés (nem blokkoló)

Két, egymástól független figyelmeztetés él a `Fog` mező alatt, egyik sem
blokkol, egyik sem jelenik meg a nyomtatványon:

- **Darabszám-eltérés**: ha a mező N érvényes FDI számot tartalmaz és
  `mennyiseg !== N`, halvány jelzés a sor alatt (`docs/02-domain-modell.md`
  `parseTeeth()`). Ez ma csak levált (kézzel felülbírált) soron fordulhat elő
  — a Db mező automatikusan követi a fogakat, amíg a doki kézzel be nem ír
  (D32); levált soron a jelzés a Db cella melletti ⟳ visszakapcsoló gomb
  mellett második, szöveges megerősítés.
- **FDI-formátum**: ha a mező tartalmaz egy olyan tokent, ami *számjegyekből
  áll, de nem érvényes FDI kód* (pl. elgépelt `99`), piros keret a mezőn +
  „Nem érvényes FDI fogszám: 99 — …" hibaszöveg alatta
  (`app/src/domain/teeth.ts` `invalidFdiTokens()`). Ez a betűs, nem
  számjegyekből álló tokeneket (pl. „jobb", „felső") **nem** érinti — a
  folyószöveges jegyzet (pl. „jobb felső") ettől függetlenül érvényes
  tartalom marad, nincs rá figyelmeztetés. A kettő ugyanabban a mezőben
  egymástól függetlenül jelentkezhet: „16, 99, jobb felső" mezőn csak a
  `99` kap hibajelzést.

### Fázisok

- Tetszőleges számú fázis, átnevezhető, összecsukható, sorrendezhető,
  törölhető (D60). Minden fázis fejlécén egy chevron egymástól
  függetlenül nyitja/csukja — alapból mind nyitva; csukott fejléc a
  fázis nevét, a sorok számát és a fázisösszeget mutatja. Ugyanitt két
  nyíl (↑/↓) mozgatja a fázist a listán belül — a szélen a megfelelő
  irányú nyíl letiltva. Ha az áthelyezett fázis neve még a generált
  „N. kezelés" mintát viseli, a szám a mozgatás után a fázis új
  pozíciójára frissül; egy kézzel átírt fázisnevet a mozgatás nem bánt.
  A „Fázis törlése" kuka-ikon csak akkor jelenik meg, ha 1-nél több
  fázis van. Sorral rendelkező fázis törlése megerősítő dialógust kér
  (a fázis összes sora vele törlődik, ez a szerkesztő egyetlen
  egy-kattintásos, többsoros, helyreállíthatatlan adatvesztési útja);
  üres fázis törlése egy kattintás marad, dialógus nélkül —
  újralétrehozása két kattintás. A „Fázis hozzáadása" gomb az új fázis
  keresőjére automatikusan fókuszál és odagördít (D64, lásd fent
  „Tételkereső" § „Új fázis autofókusza").
- Fázisonként egy szabad szöveges **megjegyzés** sor, ami a nyomtatványon
  is megjelenik. Ide megy az időzítés: *„az implantáció beépülési ideje
  után, kb. 3 hónappal"*. A mező progresszíven rejtett — alapból csukva,
  ha üres, nyitva, ha már van tartalma —, a sor „+ leírás" jelvényének
  mintáját követve.
- Mind a fázisnév, mind a fázis-megjegyzés kap nyelvi review-jelzést, a sor
  Beavatkozás/Leírás mezőjével azonos szabály szerint (D72, lásd fent
  „Sor mezői" és docs/02-domain-modell.md § Nyelvi review a kézzel írt
  szövegeken) — a fázis-megjegyzés triggere amber színt kap, ha mismatch
  van, akkor is, ha a sáv épp csukva van.
- Fázisonkénti összeg, alul mindösszesen. A „Mindösszesen" doboz eltérés
  esetén egy kisebb alszöveget mutat: kedvezménynél „Kedvezmény: X",
  **felárnál „Felár: X"** (az ajánlati árnak nincs felső korlátja, tehát a
  tényleges ár a listaár fölé is emelhető). A kettő kizárja egymást, és
  ugyanazt a zöld színt kapja — ez semleges ténymegállapítás, nem
  hibajelzés, a doki dolgozhat felárral is (pl. sietős munka).
- A terv-szintű összegzés (Mindösszesen/Egyedi végösszeg/Előleg/Tétel-
  leírások nyomtatása, lásd lent) **kizárólag** a fázislista végén, a
  „Fázis hozzáadása" gomb alatt jelenik meg — sem a szerkesztő
  fejlécében, sem a workflow-héjban nincs végösszeg (D59).
- A szerkesztő maga nem tiltja a sor nélküli fázist (üres fázis törlése
  egyetlen kattintás, lásd fent), de egy 0 soros fázissal a véglegesítés
  KEMÉNY blokk (D78, lásd lent „Előnézet és véglegesítés") — a
  nyomtatvány a `fazisok` tömböt feltétel nélkül végigrendereli, egy
  üres fázis üres fejlécként kerülne a papírra.

### Egyedi végösszeg

A „Mindösszesen" doboz alatt, még az Előleg fölött egy kapcsoló: *„Egyedi
végösszeg beállítása"*. Bekapcsolva egy „Egyedi végösszeg" mező jelenik
meg **üresen, azonnali fókusszal** — nincs `0`/a sorok nyers összegével
való előtöltés, mert az azt sugallná, hogy a doki már eldöntött valamit
(D69). A mező commitkor (blur/Enter) egyszer kiszámolja és fix, ELŐJELES
eltérésként tárolja a kedvezményt (`kedvezmenyOsszeg`, `domain/types.ts`)
— nem magát a beírt végösszeget (D25). A mező alatt élőben kiírva a
belőle adódó kedvezmény vagy felár összege. Nincs felső korlát: a beírt
végösszeg a sorok nyers összege fölé is állítható, ilyenkor a mező alatti
szöveg „→ X felár"-ra vált (D69, D25 bővítése — korábban a mező csak
kedvezményre volt szorítva).

A kötelező-mező hiba (ha a kapcsoló be van kapcsolva, de a mező üresen
marad) csak a mező elhagyása (blur) UTÁN jelenik meg, nem azonnal a
kapcsoló bekapcsolásakor — a frissen bekapcsolt, még be nem gépelt mező
nem hibaállapot.

A `0` végösszeg (a tételek teljes elengedése) üzletileg valid, de EGYSZERI
explicit megerősítést kér egy dialóguson keresztül, elgépelés ellen védve
— a megerősítés addig érvényes, amíg a beírt végösszeg `0` marad, egy
`0 → más érték → 0` váltás újra megerősítést kér.

Mivel a kedvezmény/felár fix összeg, egy utólagos sortörlés a sorok
összege fölé emelheti a kedvezmény-ágat — ilyenkor a „Végösszeg" 0-ra
padlózódik (soha nem negatív), és a blokk figyelmeztet, hogy a végösszeget
újra be kell írni.

A „Mindösszesen" doboz „Kedvezmény: X"/„Felár: X" alszövege (fent) ettől a
ponttól kezdve a sorszintű ÉS a terv-szintű eltérés ÖSSZEGÉT mutatja,
összevonva — az egyedi végösszeg blokk saját sora adja meg külön a saját
részét, ha a doki forrás szerint akarja látni. A kedvezmény/felár összege
a nyomtatványon itt sem jelenik meg (D9), csak a „Végösszeg" változik; az
előleg (lásd lent) ebből a módosított összegből számol.

### Előleg (D66)

A „Mindösszesen" doboz alatt egy kapcsoló: *„Ez a terv fogtechnikai
munkát tartalmaz — előleg feltüntetése"*. Bekapcsolva egy összeg-mező
jelenik meg **üresen, azonnali fókusszal**, előtöltés nélkül — a doki
tudatosan gépeli be az előleg abszolút összegét (nincs értelmes
alapérték egy fix összegnél). A mező alatt a fennmaradó rész, a
**tényleges** végösszegből (kedvezménnyel/felárral már csökkentett/
növelt) kiszámolva, élőben követve a sorok változását.

A kapcsoló állapotát és a committált értéket egyetlen mező hordozza
(`elolegOsszeg`, `null` = kikapcsolva); a "bekapcsolva, de a doki még nem
írt be összeget" állapot kizárólag a szerkesztő komponensének lokális
állapota, nem kerül a `Plan`-re. A kötelező-mező hiba csak blur vagy
véglegesítési kísérlet UTÁN jelenik meg, nem azonnal bekapcsoláskor. Ha a
doki explicit `0`-t ír be, blur/Enter után a kapcsoló automatikusan
kikapcsol (a mező eltűnik) — egy `0` összegű „előleg” valójában nincs
előleg.

Mivel az összeg fix (nem élőben számolt százalék), egy utólagos
sortörlés/módosítás az előleget a fizetendő FÖLÉ viheti. Ilyenkor az érték
NEM vágódik le automatikusan: a mezőn inline hard error jelenik meg, a
fennmaradó rész helyén „—” áll, és ez a véglegesítés-őr KEMÉNY blokkja
(lásd lent) — a doki tudatosan rendezi. Ha az előleg pontosan egyenlő a
fizetendővel, a fennmaradó rész explicit `0`, ez legitim állapot.

Bekapcsolva a nyomtatvány terv-és-ár blokkja két új sort kap, és a
fizetési feltételek szövege is ugyanezt az összeget mondja (lásd
`docs/04-nyomtatvany-spec.md`).

Az összeg mellett a doki százalékban is megadhatja az előleget — egy
Ft/% módváltó dönti el, melyik mező látszik. A százalék KIZÁRÓLAG
beviteli segéd: a bevitel pillanatában a Fizetendőből (a terv-szintű
egyedi végösszeggel már korrigált értékből) abszolút összeggé
konvertálódik, felfelé kerekítve a legközelebbi 1000 pénznem-
alapegységre (HUF: 1000 Ft, EUR: 1000 cent = 10 €) — a `Plan`-en
továbbra is kizárólag ez a számolt összeg tárolódik, sem a mód, sem a
beírt százalék nem perzisztálódik. A módváltó a szerkesztő komponensének
lokális állapota: újratöltés, verziónyitás vagy másolás után a blokk
mindig összeg-módból indul, a mentett összeggel. Módváltáskor a %-mező
üresen, azonnali fókusszal jelenik meg, a már beírt összeg és a
fennmaradó rész addig változatlan marad. A %-bevitel 0–100 közé
szorítva; a felkerekítés emiatt még mindig a Fizetendő fölé viheti az
összeget — ilyenkor ugyanaz az inline hard error és véglegesítési blokk
lép be, mint egy kézzel beírt, túl magas összegnél. A `0` százalék
ugyanúgy a kapcsoló automatikus kikapcsolását váltja ki, mint a `0`
összeg. Amíg a tervnek nincs egyetlen kezelési sora sem (a Fizetendő
`0`), a módváltó nem jelenik meg — csak az összeg-mező, egy rövid
magyarázó szöveggel.

### Tétel-leírások nyomtatása

Az Előleg blokk alatt egy kapcsoló: *„Tétel-leírások nyomtatása"* —
alapból bekapcsolva. Kikapcsolva egyetlen sor `leirasSnapshot`-ja sem
kerül a nyomtatványra (`docs/04-nyomtatvany-spec.md` § Tételtáblázat), és a
véglegesítés-őr hiányzó csomag-leírás figyelmeztetése (lásd lent) sem fut
le — ha úgysem nyomtatódik, a hiánya sem érdemel figyelmeztetést. Ugyanúgy
pillanatkép-jellegű, mint `nyelv`/`penznem` (docs/02-domain-modell.md §
Tétel-leírás): betöltéskor és terv-másoláskor öröklődik, nem áll vissza
alapértékre.

### Autosave

A piszkozat egy `DraftStorage` interface mögött mentődik folyamatosan,
minden tartalmi módosításra azonnal (debounce nélkül) — mockupban
`localStorage` (`app/src/storage/DemoDraftStorage.ts`, `dp:piszkozat`
kulcs), a végleges alkalmazásban IndexedDB. **Ez nem system of record** —
csak azért van, hogy frissítés vagy összeomlás ne törölje a félbeszakadt
tervet. A fájlrendszerre csak véglegesítéskor írunk, a piszkozat pedig
sikeres véglegesítéskor törlődik.

Ez a védelem `plan.statusz`/`tervId`-től függetlenül minden aktív
szerkesztésre vonatkozik — egy visszatérő páciens régi, `VEGLEGES` tervének
új verzióra nyitása is védett, amíg újra nem véglegesítik. Az érintetlen,
üres piszkozatot (ami megegyezik egy friss tervvel) nem perzisztálja, csak
az első tartalmi módosítás után kezd írni. A visszaállítás csendes és
memóriabeli — a Kezdőlap „Piszkozat folytatása” kártyája a belépési pont
hozzá; a Kezdőlap „+ Új kezelési terv” gombja maga feltétel nélkül navigál
(a köztes `/uj-terv` választóra, D29 — lásd § 5 „Új terv indítása”), de
MINDEN tényleges terv-létrehozó akció megerősítést kér, mielőtt felülírná:
az `/uj-terv` mindkét ága („Meglévő páciens keresése…”, „+ Új
páciens”) és a terv-lánc fa mindhárom akciója („Új verzió”, „Másolás új
tervbe”, „Új terv”) — egyik sem kivétel. A megerősített felülírás
pillanatában a perzisztált piszkozat **azonnal** törlődik, nem a
következő írási triggerre vár.

Ha az automatikus mentés elhasal (pl. localStorage-kvóta), a hiba a Terv
szerkesztőben is látszik, nem csak a Kezdőlapon — ott dolgozik a doki.
Sikeres mentésnél a Terv szerkesztő fejlécében egy semleges „Piszkozat
mentve HH:MM” szöveg jelenik meg (a hiba-Callout MELLETT, nem helyette) —
a Kezdőlap ugyanezt az időbélyeget „Utolsó módosítás” címkével mutatja.

A perzisztált piszkozat HÁROM, a `Plan`-től független UI-workflow
metaadatot hordoz (`DraftMeta`): melyik páciens-mappához tartozik
(`patientDir`, ahol ismert, D37), melyik workflow-lépést látta utoljára a
doki (`lastRoute`, a terv-workflow héj írja route-váltáskor, lásd fent),
és — vadonatúj lánchoz — a „Terv adatai” lap Terv címe mezőjébe beírt
érték (`tervCim`, D61). Egyik sem kerül papírra, mindhárom puha
navigációs/UI segédlet. A Kezdőlap „Piszkozat folytatása” kártyájának
„Megnyitás” gombja ismert `lastRoute` esetén oda navigál; ha nem ismert
(funkció előtti piszkozat), a régi névkitöltés-heurisztika a fallback
(üres név → Terv adatai lap, egyébként Terv szerkesztő).

**Ismert rés:** egy piszkozat, amiben a doki EDDIG kizárólag a Terv címe
mezőt töltötte ki (semmi mást), nem perzisztálódik — az autosave-őr
(`piszkozatTartalmas()`) szándékosan nem tekinti tartalmasnak a puszta
cím jelenlétét, mert a mező más forrásból (páciensnév, kezelések) függő
diszkriminátorra épül. A beírt cím ettől függetlenül túléli a lapon
belüli navigációt (memóriában marad), csak egy frissítést (F5) nem.

A piszkozat két helyről dobható el:
- A Terv szerkesztő fejlécében egy kuka-ikon a TELJES piszkozatra
  vonatkozik (nem sor-/fázisszintű) — megerősítést kér, elfogadás után a
  doki a piszkozat `patientDir`-je szerinti páciens-részletoldalára (10.
  képernyő) navigál, ismert `patientDir` nélkül a pácienslistára.
- A Kezdőlap egészséges „Piszkozat folytatása” kártyáján egy „Piszkozat
  elvetése” gomb, szintén megerősítéssel — elfogadás után a doki a
  Kezdőlapon marad, a kártya eltűnik.

Ez a két megerősítéssel védett út különbözik a Kezdőlap SÉRÜLT
(olvashatatlan) piszkozat-kártyájának „Piszkozat elvetése” gombjától, ami
megerősítés NÉLKÜL fut — egy olvashatatlan piszkozatnál nincs mit érdemben
mérlegelni, mert a doki úgysem látja a tartalmát.

---

## 4. Előnézet és véglegesítés

- A `PrintPreview` komponens rendereli a három blokkot.
- Kapcsoló: **„csak ajánlat"** — ilyenkor a nyilatkozat és aláírás blokk
  kimarad. Ez a hazavitt példány. A garancia blokk ettől függetlenül
  mindig megjelenik. A kapcsoló a `Plan.csakAjanlat` mezőn él
  (`docs/02-domain-modell.md` § Csak ajánlat mód, D75), nem helyi
  képernyő-állapot — navigáció oda-vissza és az autosave is megőrzi,
  „Új verzió" nyitásakor öröklődik, „Másolás új tervbe" viszont mindig
  visszaáll kikapcsolt állapotra. Véglegesítéskor a mentett érték a
  ténylegesen kiadott PDF-et tükrözi (a placeholder-kényszer is belekerül,
  lásd lentebb a Sablon-placeholder őrt) — egy már véglegesített verzió
  verziósora (§ 5) ez alapján mutat „Csak ajánlat" jelvényt.
- Véglegesítéskor:
  1. `tervId` generálás (új terv) vagy verzió növelés (meglévő)
  2. PDF generálás, a `terv.json` beágyazásával
  3. `pdf` + `json` kiírás az új verziómappába
  4. A piszkozat törlése az IndexedDB-ből

A 3. és a 4. lépés két külön hibazóna (D74): az 1–3. tartós mentés, a 4.
best-effort takarítás. Ha a 3. lépés UTÁN a piszkozat törlése hibázik, a
véglegesítés attól még SIKERESNEK számít — a doki a szokásos sikerképernyőt
látja, legfeljebb egy halk jelzéssel, hogy a takarítás elmaradt.

Meglévő terv szerkesztése **soha nem írja felül** a korábbi verziómappát
(D4).

### Elrendezés (D79)

Egyoszlopos, minden breakpointon: felül a véglegesítési checklist, alatta
egy sorban a „Csak ajánlat” kapcsoló (balra) és a Letöltés/Véglegesítés
gombsor (jobbra), legalul a PDF-előnézet — a doki fentről lefelé olvassa
végig a checklistet, a kapcsoló/gomb ott van a végén, mielőtt a hosszú
PDF-iframe-hez érne: a validációs állapotot előbb kell látni, mint magát a
dokumentumot.

### Véglegesítési checklist (D76)

A tartalmi validáció egységes, navigálható, `hard`/`soft`/`info`
súlyosságú tétel-lista (`veglegesitesDiagnozis()`,
`app/src/domain/veglegesitesOr.ts`), MINDIG látható — nem csak a
„Véglegesítés és mentés" gombnyomás UTÁN. Nincs szekvenciális
„Folytatás" modal-lánc: a `soft`/`info` tételek nem blokkolnak és nem
kérnek külön megerősítést, a doki már a gombnyomás ELŐTT látja őket. A
gomb kizárólag `hard` tétel jelenlétekor letiltott. Minden tétel
kattintható/navigálható a releváns workflow-lépésre.

**Kemény (`hard`) tételek — blokkolják a véglegesítést:**

- **Hiányzó páciensnév.**
- **Hiányzó vagy nem aktív kezelőorvos (D68):** a terv `orvos` mezője
  üres, vagy nem szerepel a jelenleg aktív orvosok között (a
  Beállításokban időközben deaktiválták vagy törölték) — az
  aláírás-blokkban szereplő kezelőorvos-név jogilag releváns, nem
  maradhat üresen vagy egy már érvénytelen névvel. A Terv adatai lapra
  navigál.
- **Kitöltetlen sor:** a fogtérképről kattintással felvett sor tétel
  nélkül maradt — névtelen, 0 Ft-os sor sose kerülhessen az aláírandó
  dokumentumra. A tétel megnevezi a fázist és a fogszámot; a
  szerkesztőbe navigál. Az Előnézet maga nem blokkolódik, csak a
  véglegesítés.
- **Üres fázis (D78):** egy 0 soros fázis üres fejlécként kerülne a
  nyomtatványra (lásd fent „Fázisok"). A szerkesztőbe navigál.
- **Előleg meghaladja a fizetendőt (D66):** a bekapcsolt előleg összege
  nagyobb, mint a terv tényleges (kedvezménnyel/felárral már
  csökkentett/növelt) végösszege — jellemzően egy sortörlés/módosítás
  utóhatása. Az előleg értéke a szerkesztőn MARAD, nem vágódik le
  automatikusan; a tétel az Előleg blokkhoz navigál, ahol inline hard
  error jelzi a problémát (lásd fent, „Előleg").
- **Beárazatlan sor (D71):** egy névvel ellátott sor tétele nincs
  beárazva a terv pénznemében (`Tetel.ar[penznem] == null`), ÉS a doki
  még nem adott meg hozzá kézi ajánlati árat (az ára `0` maradt) — a
  tétel strukturálisan nem ajánlható ebben a pénznemben ár nélkül, ez
  nem elgépelés, mint a lenti puha 0 összegű eset. Kézi ajánlati ár
  megadása (vagy másik pénznemre váltás) feloldja a blokkot.
- **Hiányzó/nem igazolt német tételnév (D77):** német nyelvű terven
  minden látható sornak igazolt német neve kell legyen — vagy az
  árlistai nevet követi (D21/D24), vagy a D72 nyelvi review-metaadat
  szerint igazoltan németre íródott. A tétel két csoportot mutat: „nincs
  német nevük az árlistában" és „kézzel írt/átírt, nyelvileg nem
  ellenőrzött" — utóbbi a mezőn megjelenő „Nyelv ellenőrizve" akcióval
  oldható fel (lásd D72), előbbi az Árlista adminban pótolható. A tétel
  a szerkesztőbe navigál.
- **Hiányzó német kategórianév (D77):** a fogtérkép-legendán ténylegesen
  megjelenő kategóriának nincs `nev.de`-je — a tervben NEM használt
  kategória hiányzó neve nem blokkol. Az Árlista adminba (Kategóriák
  panel) navigál.

**Puha (`soft`) tételek — látszanak, de nem blokkolnak:**

- **Hiányzó egyéb páciensadat** (nem kötelező, de a nyomtatványon
  üresen marad).
- **Nyelvi ellenőrzésre váró szövegek (D72):** a tervben van kézzel írt
  szöveg (sornév, sorleírás, fázisnév, fázis-megjegyzés), aminek a
  nyelvi review-ja mismatch-elt (docs/02-domain-modell.md § Nyelvi
  review a kézzel írt szövegeken) — SZÁNDÉKOSAN külön a fenti német
  tételnév-tételtől (az az ÁRLISTAI fordítás/igazolás hiányát jelzi, ez
  a doki SAJÁT szövegeinek nyelvét). A tétel felsorolja az érintett
  mezőket mezőfajtánként (Fázis neve/Fázis megjegyzése/Sor neve/Sor
  leírása), és egy „Irányított ellenőrzés" gombot kínál — ez elindítja a
  nem-modális guided review-t (`NyelviReviewContext`/`NyelviReviewBar`),
  ami a szerkesztőbe navigál és sorban végigvezet a még ellenőrizetlen
  szövegeken, a VALÓDI mezőkhöz fókuszálva (nem egy duplikált
  modal-szerkesztőhöz).
- **0 összegű sor:** a tervben van névvel ellátott, de 0 összegű sor
  (`tenylegesEgysegar * mennyiseg === 0`) — jellemzően egy elgépelés +
  reflexes Enter terméke a gépel→↑/↓→Enter cikluson (nulla találatra a
  kereső egyedi sort vesz fel, 0 Ft kezdőértékkel), de lehet szándékos
  is (pl. ingyenes kontroll), ezért nem kemény blokk. A tétel címe a
  terv pénznemét követi (HUF: „0 Ft-os tétel(ek)", EUR: „0,00 €-s
  tétel(ek)").
- **Hiányzó csomag-leírás:** a tervben `csomag: true` tételre hivatkozó,
  üres leírású sor van (docs/02-domain-modell.md § Tétel-leírás). Ez a
  tétel kimarad, ha a terv `leirasokMutatasa` kapcsolója ki van
  kapcsolva — ilyenkor a leírás úgysem kerül a nyomtatványra.
- **Árlista-eltérés (D70):** a tervben van sor, aminek `listaEgysegar`-ja
  eltér a mai árlistától (elavult pillanatkép), vagy aminek ajánlati ára
  kézzel eltér a listaártól (kedvezmény/felár). A tétel a két okot külön
  csoportban mutatja („Elavult árlistai pillanatkép" / „Kézzel felülírt
  ajánlati ár"). Nem kemény blokk: az árlista-eltérés (szándékos
  kedvezmény, felár, vagy egyszerűen elavult, de még nem frissített
  pillanatkép) legitim állapot lehet.
- **Sablon HU-visszaesés:** a tervhez tartozó nyilatkozat/fizetési
  feltételek/garancia sablon nem érhető el a megfelelő nyelven (lásd
  lent „Sablon-placeholder őr") — helyette a magyar szöveg jelenik meg a
  nyomtatványon.

**Info (`info`) tételek — csak tájékoztatnak:**

- **Nyilatkozat még lektorálásra vár:** a MEGJELENÍTETT nyilatkozat
  placeholder (lásd lent „Sablon-placeholder őr") — ilyenkor a
  nyilatkozat és aláírás blokk garantáltan kimarad, a „Csak ajánlat"
  mód kényszerítve/letiltva. Ez a tétel csak a TÉNYt jelzi; a kényszer
  maga a D23-zár, a `PreviewPage.tsx` nyilatkozat blokk renderjéhez
  tartozik.
- **Páciens törzsadat-eltérés (D48):** ha a páciensnek van lezárt
  törzsadata (`paciens-adatok.json`, D33), és az eltér a terv `paciens`
  pillanatképétől, a tétel felsorolja az eltérő mezőket, a Terv adatai
  lapra navigál. A véglegesítés önmagában nem kényszerít
  szinkronizálást (D9/D33 elve marad). A mastert a rendszer
  véglegesítéskor újraolvassa, hogy a tétel a legfrissebb állapotot
  mutassa — a mentett `terv.json` `paciens` blokkja ettől függetlenül a
  piszkozat pillanatképe marad (D7).

A technikai/infrastrukturális hibák — sablon betöltési hiba, PDF-render
hiba, mentési hiba — NEM checklist-tételek, hanem önálló, tranziens
Callout-ok a `PreviewPage.tsx`-en: nem a dokumentum TARTALMÁRÓL szólnak,
hanem az alkalmazás aktuális working-state-jéről. A PDF-generálási hiba
(D73) ezek közül kiemelt: ha a `@react-pdf/renderer` `usePDF()`-je hibára
fut, az Előnézet oldal a hibaüzenettel és egy explicit „Újrapróbálás”
gombbal marad a képernyőn — a gomb újra meghívja a PDF generálását
ugyanazokkal a propokkal, amikkel a hiba keletkezett. A könyvtár a hibán
át megőrzi az utolsó sikeresen renderelt PDF `url`-jét, ezért a korábbi
előnézet beszürkítve látható marad, DE amíg a hiba fennáll, sem a
„Letöltés” (helyette letiltott „Elavult PDF” gomb), sem a „Véglegesítés
és mentés” nem érhető el — egy a képernyőn látott tervvel már nem egyező
PDF nem hagyhatja el a gépet.

### Sablon-placeholder őr

Egy sablon (nyilatkozat, fizetési feltételek vagy garancia) akkor számít
jogilag lezáratlannak, ha a törzse `[PLACEHOLDER` vagy `[PLATZHALTER`
jelölőt tartalmaz (zárójellel — a jelölő nélküli szóemlítés nem elég).
Ez **egyetlen predikátum**, egyetlen helyen (`app/src/domain/templates.ts`
`isPlaceholderTemplate`); a sablonszerkesztő készültség-jelzése, a
seed-feltöltés és a véglegesítés-őr mind ezt hívja.

- **Nyilatkozat placeholder → kemény zár.** Ha a ténylegesen betöltött
  nyilatkozat placeholder, a „csak ajánlat" kapcsoló automatikusan
  bepipálva és **letiltva** jelenik meg, tehát a nyilatkozat és aláírás
  blokk garantáltan kimarad minden PDF-ből — letöltésből és
  véglegesítésből egyaránt, mert mindkettő ugyanabból a renderelt
  példányból dolgozik. Piros figyelmeztetés jelzi az okot és hogy hol
  kell javítani (Beállítások → Nyomtatvány szövegei). **Nincs „Folytatás
  mindenképp"** — ez blokk, ugyanabban a súlyban, mint a kitöltetlen sor
  (D23).
- **Fizetési feltételek placeholder → HU-visszaesés, nem zár.** A
  fizetési feltételek szakasz „csak ajánlat" módban is mindig
  nyomtatódik, ezért ott a kényszerített ajánlat-mód nulla védelmet
  adna; helyette a hiányzó sablonnál is használt HU-visszaesés fut le (a
  magyar szöveg jelenik meg), sárga figyelmeztetéssel.
- **Garancia placeholder → HU-visszaesés, nem zár.** Ugyanaz a viselkedés,
  mint a fizetési feltételeknél — a garancia szakasz „csak ajánlat"
  módban is mindig nyomtatódik, tehát nála sincs mit védeni egy
  kényszerített ajánlat-móddal. A magyar szöveg ma is placeholder (a doki
  még nem adta meg), ezért a HU-visszaesés magyar nyelvű terven nem fut
  le (a placeholder szöveg magyarul nyomtatódik, sárga figyelmeztetés
  nélkül — nincs mire visszaesni), csak német nyelvű tervnél jelez.

### Terv címének kiírása vadonatúj lánchoz (D61)

Ha a lánc vadonatúj (`plan.tervId === ''`) ÉS a doki írt be egyedi címet a
„Terv adatai” lap Terv címe mezőjébe, a `doFinalize()` a `storage.savePlan()`
UTÁN, saját, a mentéstől ELKÜLÖNÍTETT try/catch-ben ír a
`storage.savePlanLabel()`-lel. Már mentett lánchoz ez a lépés sosem fut —
ott a cím a lapon, azonnal íródott. Az elkülönítés korrektségi kérdés, nem
stílus: a terv EKKOR MÁR a lemezen van, egy itteni hiba nem jelentheti a
dokinak, hogy „a mentés nem sikerült” — egy hibás értelmezésű
újrapróbálás fölösleges, D4-et sértő üres v2 verziómappát hozna létre. A
hiba a siker-képernyőn egy külön, amber jelzésként jelenik meg, a cím
utólag a „Terv-láncok és verziók” (5. képernyő) ceruza-ikonjával pótolható.

### Sikeres véglegesítés

A mentés után a terv-workflow héj (D36) fölött megjelenő "A terv elmentve
✓" panel (`app/src/pages/PreviewPage.tsx`) a mentett terv útvonalát
(`patientDir / planDir / versionDir`) mutatja, két gombbal:

- **„Új terv indítása"** — az `/uj-terv` köztes páciens-választóra visz
  (lásd § 5 „Új terv indítása").
- **„Korábbi tervek"** — a MOST mentett páciens részletoldalára
  (10. képernyő, `Kezelési tervek` tab) navigál, nem a DEMO „Összes terv"
  fülére (§ 5, D54) — az utóbbi a teljes, több-pácienses áttekintő,
  másodlagos a napi munkához képest.

### Letöltési fájlnév

A „Letöltés" gomb (ez a képernyő) és a terv-lánc fa verziósorának „⋯"
menüje egyaránt a `buildDownloadFileName(nev, opts)`
(`app/src/storage/paths.ts`) kimenetét adja fájlnévnek, hogy egy
Letöltések mappában sok páciens sok fájlja között a doki a fájlnévről
lássa, kié:

```
[PISZKOZAT-]kezelesi-terv-<Vezetéknév-Keresztnév>-<tervId>[-<suffix>].pdf
```

A névrész a `buildPatientNameSlug` kimenete — ugyanaz a szlugosítás, mint
a páciensmappa nevéé (`docs/02-domain-modell.md` „Mappanév szabályok"),
hogy a fájl és a mappa neve vizuálisan párosítható legyen. A
`PISZKOZAT-` előtag a nyers `plan.statusz !== 'VEGLEGES'`-ből jön —
ugyanaz a jelzés, mint a szerkesztő fejlécének „véglegesítve"/„piszkozat"
jelvényéé. Egy már véglegesített terv „Új verzió" gombbal való
újranyitásakor a `statusz` a betöltés pillanatában PISZKOZAT-ra áll
(D53, lásd „Korábbi terv új verzióra nyitása" lentebb) — a letöltés így
azonnal `PISZKOZAT-` előtagot kap, amíg a doki újra nem véglegesíti.

---

## 5. Terv-láncok és verziók

Ez a szakasz a `components/PatientPlanChains.tsx` komponens — a
páciensenkénti terv-lánc/verzió fa és a hozzá tartozó akciók — MEGOSZTOTT
specifikációja. Két hívója van, és **elsődleges gazdája a páciens
részletoldal (§ 10) `Kezelési tervek` tabja** (D35/D44): a doki napi
munkája mindig egy konkrét páciensen keresztül fut, a fa ott, a törzsadat
mellett, `embedded` fejléccel jelenik meg. A `paciensek/` fa TELJES,
több-pácienses beolvasása (`standalone` fejléccel, D54) a DEMO oldal
„Összes terv” fülén él (`/demo/tervek`), mint másodlagos áttekintő — nem
napi munkaeszköz, hanem a doki-validáció közbeni teljes-listás betekintés
(lásd „Fő navigáció (D34)” fent).

A lenti leírás (a fa, a címke, a `⋯` menü, a négy terv-létrehozási út, az
aktív-draft blokk) mindkét felületre egyaránt vonatkozik, a fejléc-eltérés
kivételével (lásd „Aktív draft a listán” alatti bekezdés és „A négy
terv-létrehozási út” táblázata).

Az „Összes terv” fülön (`standalone` fejléc) a `paciensek/` fa beolvasása,
kereshető listával. Páciensnév szerint csoportosítva, alatta a terv-láncok
(D29), azon belül a verziók dátummal és **végösszeggel**. Egy terv
nélküli, csak `paciens-adatok.json`-nal rendelkező páciens (a Páciensek
képernyőn, § 9, terv nélkül felvéve) itt NEM jelenik meg — ez a nézet a
kezelési előzményekről szól, nem a törzsadatról. Minden páciensnév mellett
egy „Páciens adatai” kereszt-link navigál a páciens-részletoldalra
(§ 10), ugyanahhoz a pácienshez, a `Páciens adatai` tabbal előválasztva —
ezen a fülön a páciensnév az EGYETLEN páciens-címke, a kereszt-link pedig
az EGYETLEN út a részletoldalra. Ugyanez a fa a részletoldalba beágyazva
(`embedded` fejléc) név és kereszt-link NÉLKÜL renderel (D44, § 10).

Az összecsukás **lánc-szintű** (D51, nem páciens-szintű): minden terv-lánc
fejléce önálló, tiszta toggle (nem navigáció), és alapból CSAK a
legfrissebb VÉGLEGESÍTETT dátumú lánc van nyitva (lásd lent a
lánc-rendezésnél) — a többi csukva, több lánc egyszerre is nyitható.
Egyverziós lánc is megtartja a lánc→verzió hierarchiát, nem lapul össze
egyetlen sorrá. Ez a viselkedés MINDKÉT hívón azonos — a részletoldalba
beágyazva (§ 10, D44) sincs külön páciens-szintű "N terv" burkoló, csak a
névfejléc és a "Páciens adatai" kereszt-link marad el, a lánc-szintű
összecsukás ott is érvényes. A lánc-fejléc (nyitottságtól FÜGGETLENÜL
mindig renderel) a lánc LEGFRISSEBB verziójának adatait mutatja (dátum,
verziószám), csukott állapotban a lánc végösszegét is — nyitva ez az
utóbbi elmarad, mert redundáns a lent következő legfrissebb verziósor
azonos értékével. A lánc legfrissebb verziósora, ha a láncnak 2+ verziója
van, „Legutóbbi” jelvényt kap (egyverziós láncon nem, funkciótlan dísz
lenne). Egy „csak ajánlat” módban véglegesített verzió (`plan.csakAjanlat
=== true`, docs/02-domain-modell.md § Csak ajánlat mód, D75) során
ugyanígy egy semleges „Csak ajánlat” jelvény jelenik meg — a MÁR
betöltött verzió-adatból, nincs hozzá külön storage-hívás. A böngésző-
"vissza" navigációnál a lánc-nyitottság és a keresőszöveg is visszaáll
(`components/useListStateMemory.ts`).

A láncok a bennük lévő legfrissebb VÉGLEGESÍTETT verzió dátuma szerint
csökkenő sorrendben jelennek meg — NEM a lánc létrehozási (legkorábbi
verzió) dátuma szerint: egy régen indult, de nemrég frissített lánc
előrébb kerül, mint egy korábban lezárt, azóta nem frissült lánc.

Minden terv-lánc fejlécén egy **címke** áll: `<tervCim> · <a lánc
legfrissebb verziójának dátuma/verziószáma>`. A címke a doki által
bármikor szabadon átírható (`terv-cimke.json`, `docs/02-domain-modell.md`
§ Páciens- és terv-mappa) — egy már véglegesített terv címkéjének
átírása NEM hoz létre új verziót. Amíg a doki nem ír át semmit, a mező
egy élő auto-javaslatot mutat (a terv domináns kategóriájának neve,
`javasoltTervCim()`). A ceruza-ikon itt a MÁSODIK belépési pont ehhez az
íráshoz — az első a „Terv adatai” lap Terv címe mezője (§ 2, D61).

### Aktív draft a listán

Ha az EGYETLEN globális, mentetlen piszkozat (D21) a megjelenített
pácienshez tartozik, két helyen jelenik meg: (1) a hozzá tartozó terv-lánc
fejlécén egy nem-kattintható „Piszkozat” jelzés (a fejléc-toggle egyetlen
kattintási zónája marad, a jelzés nem hoz létre második, beágyazott
kattintható elemet), és (2) egy önálló blokk a láncok TETEJÉN, a
finalizált láncok fölött: a draft kontextusa („Új terv” vagy „Új verzió —
<lánc címke>”, ha a `tervId` egy meglévő lánccal egyezik), az aktuális
workflow-lépés, az utolsó módosítás időbélyege, és a jelenlegi végösszeg
előleg nélkül — tétel-/fázisszám nélkül, és HA a piszkozatban egyetlen
sor sincs, összeg nélkül. A teljes blokk kattintható, a piszkozat utolsó
workflow-lépésére navigál, plusz egy külön „Folytatás” gomb — EGYIK sem
megy át a piszkozat-felülírás-őrön, mert a saját draft folytatása nem
felülírás.

A verziósoron megjelenő összeg a verzió saját `terv.json`-jából jött
`osszesitok.fizetendo` (a ténylegesen fizetendő, nem a listaáras
`kezelesekOsszesen`), a verzió saját pénznemében — a doki nyitás nélkül
látja, mennyiért adta azt az ajánlatot. A mentett érték az igazság,
nincs újraszámolás: az `osszesitok` eltérés-őre ott fut, ahol
ténylegesen kockázatos (szerkesztőbe töltéskor). Ha egy verzió
`terv.json`-ja nem olvasható, csak annál a sornál „—” áll az összeg
helyén, és a páciens megkapja a meglévő „⚠ néhány verziója nem
olvasható” jelzést.

A verziósor „⋯" menüjének „Letöltés" pontja ugyanazt a
`buildDownloadFileName`-et hívja, mint az Előnézet (§ 4. Előnézet és
véglegesítés „Letöltési fájlnév") — a névhez és a `PISZKOZAT-`
előtag-döntéshez a verzió saját, már betöltött `terv.json`-ját használja,
a suffix a verziómappa neve. Olvashatatlan `terv.json`-nál a letöltés nem
hasal el emiatt: a névhez a páciens-szintű nevet, előtaghoz
`isDraft: false`-t használja — a letöltés nem válik szigorúbbá, mint a
puszta PDF-betöltés.

Ez a legerősebb indoka a fájlrendszer-hozzáférésnek — nem a mentés, hanem
a betöltés. Egy visszatérő pácienshez ne kelljen újragépelni 12 tételt.

Betöltés a `terv.json`-ból. Ha csak PDF van (kézzel átmozgatott fájl),
a beágyazott JSON-ból is menjen.

#### A négy terv-létrehozási út és a gombfeliratok rendszere

A képernyőkről négy úton indul terv, és a köztük lévő különbség nem
kényelmi kérdés, hanem az, hogy az eredmény **melyik terv-láncba (és
melyik páciens-mappába, D29)** kerül:

| Gomb | Hol | Mit visz át | Mentéskor |
|---|---|---|---|
| **„Új verzió"** | verziósor legfrissebb során, látható elsődleges gombként (D53/D58) | mindent, a `tervId`-t is | ugyanabba a terv-mappába `<ma>_v<n+1>` (D4) |
| **„Másolás új tervbe"** | verziósor `⋯` menüjében | mindent az azonosító/állapot/dátum kivételével, PLUSZ a `paciens` blokk az ÉLŐ törzsadatból, ha van (D57) | **új** terv-mappa a MEGLÉVŐ páciens-mappában, `<ma>_v1` (D26/D29) |
| **„Új terv"** | a páciensnév mellett, balra | csak a `paciens` blokkot | **új** terv-mappa a MEGLÉVŐ páciens-mappában, `<ma>_v1` (D26/D29) |
| **„+ Új kezelési terv"** | Kezdőlap, az `/uj-terv` köztes választón át (lásd „Új terv indítása — a köztes páciens-választó" lentebb) | „Meglévő páciens keresése": a kiválasztott páciens `paciens` blokkja; „+ Új páciens": a quick-create dialógusban megadott név + opcionális születési dátum/telefon (D41) | **új** terv-mappa — a kiválasztott MEGLÉVŐ vagy a quick-create dialógussal frissen létrehozott páciens-mappában, `<ma>_v1` (D26/D29) |

Ebből következik a feliratok kötelező rendszere: **minden új tervláncot
indító akció felirata az „új terv" fogalmát hordozza — szó szerint („Új
terv", „Másolás új tervbe") vagy a D7 szerinti stabil Kezdőlap-CTA
szövegével („+ Új kezelési terv", D39) —, és egyedül a meglévő láncot
folytató akció feliratában szerepel a „verzió" szó („Új verzió").** Egy
„Megnyitás…" típusú, a mechanizmust (és nem az eredményt) megnevező
felirat elrejtené azt az egyetlen különbséget, amit a dokinak kattintás
előtt látnia kell — lásd `docs/07-felulet-rendszer.md` („a gombfelirat azt
mondja, mi történik"). Ugyanezt mondja ki egy rövid, szürke magyarázó sor a
lista tetején, a kereső alatt.

**Kimondott kivétel (D55):** az `/uj-terv` köztes választó „+ Új páciens"
gombja NEM hordozza a „új terv" fogalmat a feliratában, szemben a fenti
szabállyal. Ezen a képernyőn a fogalmat a képernyő fejléce („Új terv
indítása") mondja ki egyszer, a doki belépésekor — ahogy a kereső
találati sorai (a „Meglévő páciens keresése…" ág) sem hordozzák
felirat-szinten, pedig azok is új tervláncot indítanak. A „+ Új páciens"
felirat itt szándékosan szó szerint azonos a `PaciensekPage.tsx` „+ Új
páciens" gombjával (lásd lentebb), hogy a két képernyő azonos akciója
felismerhető maradjon.

**A verziósoron a lánc legfrissebb verziója két látható gombot kap, egy
historical (nem legfrissebb) soron nincs látható gomb, csak `⋯` (D58).**
A legfrissebb soron elsődleges `Új verzió` + másodlagos `Megnézés` (soft,
gray) áll a `⋯` mellett — pontosan a `docs/07-felulet-rendszer.md`
„legfeljebb két látható gomb egy adatsoron" határán belül, mert láncon
belül LEGFELJEBB EGY sor kap „Új verzió"-t (D53). Ott a `⋯` menü
Letöltésre és Másolás új tervbére szűkül. Egy historical soron a `⋯`
tartalmazza mind a négy elemet: `Megnézés`, `Letöltés`, elválasztó,
`Másolás új tervbe`, `Ugrás a legfrissebb verzióra`. Elöl a csak-olvasó
művelet áll (a könnyebb, fájlt sem hagyó `Megnézés` a `Letöltés` előtt),
utána a terv-létrehozó `Másolás új tervbe`, végül a navigációs `Ugrás a
legfrissebb verzióra` — ez utóbbi NEM tervlétrehozó akció (nem hoz létre
sem új láncot, sem új verziót), ezért a feliratrendszer „verzió szó
kizárólag a meglévő láncot folytató akción" szabálya rá nem vonatkozik,
a „verzió" szó itt a navigáció CÉLJÁT nevezi meg, nem egy létrehozott
dokumentumot. Az `Új verzió` gomb KIZÁRÓLAG a lánc legfrissebb
verziósorán jelenik meg, se gombként, se menüpontként nem érhető el
máshol (D53) — a régi verzióból induló módosítás helyes útja a `Másolás
új tervbe` (explicit új lánc, nem a meglévő lánc jelöletlen
elágaztatása).

Egy historical verzió másolásakor, ha a láncnak van a másolt verziónál
frissebbje, egy figyelmeztető dialógus jelzi ezt a másolás megerősítése
előtt — a megosztott piszkozat-felülírás-őr
(`domain/planVersionActions.ts` `kellMegerosites`/`megerositesTartalom` +
`components/PlanVersionActionDialog.tsx`) bővítése, FÜGGETLENÜL attól,
van-e mentetlen piszkozat. Ugyanezt a megosztott réteget hívja a § 11.
Terv részletei lap is, hogy a szöveg/feltétel ne térjen el a két felület
között. A pontos (exact) másolás a figyelmeztetés elfogadása után is
lefut; a dialógus piros gombja csak akkor jelenik meg, ha VALÓBAN
piszkozat vész el, mert a historical-másolás önmagában nem
adatvesztés-kockázat. Az „Ugrás a legfrissebb verzióra" azonos oldalon
belüli scroll+fókusz a lánc dobozára, majd a lánc-fejléc toggle gombjára —
nincs hozzá önálló route, a lánc a menü megnyitásához már úgyis nyitva
van.

A `Megnézés` a § 11. „Terv részletei" nézetre navigál — a verzió mentett
PDF-jének új böngészőlapon való megnyitása (`loadPlanPdf`, popup-blokkoló
elleni szinkron `window.open`) onnan, a „Megnyitás külön" akcióval érhető
el.

A `⋯` `IconButton` `aria-label`-jében benne van a terv címkéje ÉS a
verziószám (`Fogpótlás — v2 — további műveletek`): egy páciensblokkban
több terv-lánc is lehet (D29), és mindegyik saját `v1`-gyel indul — a
puszta verziószám önmagában nem lenne egyedi, sem a szemnek, sem a
képernyőolvasónak.

A páciensszintű `Új terv` az egyetlen látható gomb a PÁCIENS fejlécén,
**balra, közvetlenül a páciensnév mellett** — de a névfejlécen KÍVÜL,
mert a páciensnév címke, a gomb akció (a lánc verziósorainak D58 szerinti
látható gombjai más hatókörben, a saját soruk mellett élnek, ez a
szabály nem érinti őket). A rövid felirat nem mondja ki, hogy a
páciensadatot átviszi; ezt az elhelyezés hordozza. A gomb `soft` accent
(nem szürke), a páciensnév `t.brand` színével egy családban; a
`#f77409`-hez nem nyúlunk (docs/07: soha nem szövegszín). Ez a leírás a
DEMO „Összes terv" fülének `standalone` fejlécére vonatkozik (D44) — a
részletoldalba (§ 10) beágyazva ugyanez a gomb teljes értékű CTA,
névfejléc nélkül.

### Korábbi terv új verzióra nyitása

Egy korábbi (jellemzően `VEGLEGES`) terv „Új verzió" gombbal — KIZÁRÓLAG
a lánc legfrissebb verziósorán érhető el (D53/D58) — való megnyitásakor a
`keltezes` a mai napra, az `ervenyesIg` ebből és az **aktuális**
`beallitasok.ervenyessegNap`-ból újraszámolva íródik — nem a régi terv
megőrzött érvényességi ablak-hossza (D22). A bélyegzés **a betöltés
pillanatában** történik, nem véglegesítéskor: az előnézet a `plan`
state-ből rendereli a PDF-et, egy késői írás a mentett JSON-t és a már
renderelt PDF-blobot szétcsúsztatná. A sorok ára, `nevSnapshot`,
`listaEgysegar`, `tetelId`, `arlistaVerzio` és a `tervId` (a lánc-
hovatartozás jele) érintetlen marad — a dátumfrissítés dokumentum-
metaadat, nem újraárazás (D7). A `statusz` viszont ugyanekkor PISZKOZAT-ra
áll (D53): a betöltött piszkozat a folytatás állapotát tükrözi, nem a
forrás verzió lezárt állapotát — a szerkesztő fejléce ettől kezdve
„piszkozat”-ot mutat, és a letöltés `PISZKOZAT-` előtagot kap, amíg a
doki újra nem véglegesíti. Közvetlenül a `Kezelések` workflow-lépésre
navigál, a `Terv adatai` lépés a stepperen keresztül elérhető marad.

A szerkesztő egy **semleges színű** tájékoztató sávban jelzi az új
dátumot és érvényességet, és kimondja, hogy a tételek ára változatlan. Az
amber sáv a valódi anomáliának (mentett vs. újraszámolt `osszesitok`
eltérése) van fenntartva — ugyanaz a szín itt félrevezető lenne.

**Kezelőorvos-öröklés (D67):** a forrás verzió orvosát örökli, HA az még
aktív a Beállításokban; ha időközben deaktiválták vagy törölték, a
globális alapértelmezett orvosra esik vissza. Ez utóbbi esetben a
szerkesztő ugyanabba a semleges színű sávba egy második mondatot tesz
(nem külön csatornát nyit), ami megnevezi a régi és az új orvost.

### Terv másolása új tervként

Két transzformáció, három belépési ponton — a gombok/útvonalak elhelyezése
az adatkör-különbséget követi, nem kényszeríti egy szintre:

- **A páciens ELÉRHETŐ legjobb adataiból — csak a páciensadat.** Két
  belépési pontja van, ugyanazzal az eredménnyel, közös forráskiválasztással
  (`ujTervForrasPaciensbol()`, `app/src/state/planIndulas.ts`, D33):
  - **„Új terv"** — a terv-lánc fa `standalone` fejlécén (DEMO „Összes
    terv" fül), a páciensnév mellett balra, páciensszinten (nem egy
    konkrét verzióhoz kötve).
  - **„Meglévő páciens keresése…"** — a Kezdőlap „+ Új kezelési terv"
    gombja utáni `/uj-terv` köztes választón (lásd lentebb).

  Mindkét belépési pont ugyanazt a sorrendet követi: ha a pácienshez van
  lezárt törzsadat (`paciens-adatok.json`, § 9. Páciensek), onnan indul
  (`planUjTorzsadattal`); egyébként a doki által látott LEGUTÓBB MÓDOSÍTOTT
  terv-lánc legfrissebb verziójának `paciens` adatából
  (`latestVersionAcrossPlans()`, `app/src/domain/planFolders.ts` +
  `planUjPaciensselTervhez`). Ez utóbbi forrás híján (terv nélküli, de
  törzsadattal rendelkező páciensnél a törzsadat pótolja) korábban hibát
  adott — a törzsadat bevezetése óta egy csak törzsadattal rendelkező
  páciens is választható itt.

  Mindkét esetben minden más mező (`orvos`, `fazisok`, `elolegOsszeg`,
  `kedvezmenyOsszeg`) a mai `createBlankPlan()` friss alapértéke —
  pontosan úgy, mintha a doki egy „+ Új páciens" tervet indítana,
  csak a páciens mezők (és a `paciensId`) már ki vannak töltve. A
  **`nyelv`/`penznem` kivétel** (D52, § 2. „Dokumentum nyelve / Pénznem” fent): ha a
  pácienshez van legalább egy VÉGLEGESÍTETT terve, `ujTervForrasPaciensbol()`
  ennek nyelvét/pénznemét adja tovább `createBlankPlan()`-nak, mindkét
  forráságon (törzsadat és a legutóbbi `paciens` pillanatkép) egységesen —
  a `paciens`-adatok forrásától függetlenül ugyanaz a legutóbbi
  VÉGLEGES verzió dönti el, melyik lánchoz tartozzon is az.
- **`planMasolatKent` — a szakmai tartalom átjön, a páciensadat frissül.**
  Egyetlen belépési pontja a **„Másolás új tervbe"**, minden verzió-sor
  `⋯` menüjében, mert konkrétan AZT a verziót másolja, sorokkal együtt
  (egy régebbi verzió sorai eltérhetnek a legfrissebbtől). A
  `paciensId`, `nyelv`, `penznem`, `elolegOsszeg` és a
  `kedvezmenyOsszeg` változatlanul átjön — ugyanaz a snapshot-elv, mint
  egy meglévő terv új verzióra nyitásakor. Ez a valódi A/B alku-változat
  használati eset: a doki utána csak azt módosítja, ami eltér a két
  ajánlat között, nem gépeli be újra az egészet. Négy mező KIVÉTEL: az
  **`orvos`** (D67) — MINDIG a mai globális alapértelmezett orvos, a
  forrás orvosa SOSEM másolódik át; a **sorok és az `arlistaVerzio`**
  (D70) — azok a sorok, amik a forrásban PONTOSAN követték az akkori
  árlistát (ár ÉS név ÉS leírás is), a másolás pillanatában az AKTUÁLIS
  árlistára frissülnek, a kézzel felülírt sorok érintetlenek maradnak, a
  másolat `arlistaVerzio`-ja az aktuális árlistáé lesz, és nem indul
  elavult árakkal; a **`csakAjanlat`** (D75) — MINDIG `false`-ra áll,
  a forrás „csak ajánlat” állapota SOSEM másolódik át, a másolat mindig
  teljes dokumentumból indul; és a **`paciens` blokk** (D57) — ha a
  pácienshez van lezárt törzsadat (`paciens-adatok.json`), onnan jön,
  nem a forrás verzió pillanatképéből — a másolás pillanatában a doki a
  páciens JELENLEGI adatát várja az új ajánlatba, nem egy esetleg
  elavult telefonszámot/címet. Törzsadat híján a forrás pillanatképe
  marad. Emiatt a `/paciens` lépésre érkező másolat a D48
  törzsadat-kártyán már egyező adatot lát, nem indul felesleges
  ütközés-prompt. Olvashatatlan törzsadatnál a másolás hibaüzenettel áll
  meg (D33). Egy historical (nem a lánc legfrissebb) verzió másolásakor
  a doki külön figyelmeztetést kap, ha időközben újabb verzió is
  született (D58, lásd fent § 5 „A verziósoron…"). Az **`orvos`** (D67)
  — MINDIG a mai globális alapértelmezett orvos, a forrás verzió orvosa
  SOSEM másolódik át.

Mindhárom út a meglévő `frissDatummal` (D22) hívásával bélyegzi a
`keltezes`/`ervenyesIg`-et a mai napra, és a másolat `osszesitok`-ja a
saját (átvett) soraiból újraszámolva indul, nem a forrás mentett
értékének másolata (D26) — a forrás `osszesitok`-ja az EREDETI, már
mentett terv fájl-igazsága (D7), nem a most keletkező piszkozaté. A
`tervId`/`verzio`/`statusz` mindhárom esetben nullázódik/`PISZKOZAT`-ra
áll — a másolat sosem csúszhat be verzióként egy meglévő láncba (D4).

Mindhárom út a **Terv adatai lapra** navigál, nem egyenesen a
szerkesztőbe — ugyanúgy, mint egy teljesen új terv indításakor. A doki itt
látja és pontosíthatja az átvett páciensadatot (pl. időközbeni
címváltozás), és ez a tranzitív lépés önmagában is jelzi, hogy ez egy ÚJ
terv indítása, nem egy meglévő verzió folytatása — nincs hozzá külön,
tisztázó megerősítő dialógus, csak a meglévő piszkozat-felülírás-őr fut le
mindegyiknél, ha van mentetlen munka. A megkülönböztetés másik fele a
feliratokban van (lásd fent, „A négy terv-létrehozási út"): mindegyik
tartalmazza az „új terv" kifejezést, a láncot folytató akció pedig az
egyetlen, amiben a „verzió" szó szerepel.

A másolat rögtön MENTETLEN piszkozatnak számít (a „Piszkozat folytatása"
kártya azonnal megjelenik a Kezdőlapon), mert még soha nincs elmentve a
saját `tervId` alatt — más, mint egy `loadPlanIntoDraft`-tal betöltött,
már mentett terv. Mentéskor az átvitt `paciensId` miatt (D29) a
`storage.savePlan` a MEGLÉVŐ páciens-mappában nyit új terv-mappát — nem
egy másikban. A „+ Új páciens" ág (lásd lentebb) ettől eltérően: a
quick-create dialógus (D41) sikeres mentése hoz létre egy ÚJ
páciens-mappát, MIELŐTT a Terv adatai lap megnyílna — a `paciensId` ott
sem üres, csak a keletkezés pillanata más.

### „Új terv indítása" — a köztes páciens-választó (D29)

A Kezdőlap „+ Új kezelési terv" gombja nem egyenesen a Terv adatai lapra
navigál, hanem egy köztes kereső/választó lépésre (`/uj-terv`,
`app/src/pages/NewPlanPage.tsx`) — a teljesen friss, Home-ról induló útnál
a doki még nem gépelt be semmit, tehát itt (és csak itt) van
kétértelműség, hogy melyik páciensről van szó. A lépés fentről lefelé
olvasva a doki tényleges döntési sorrendjét követi (D55): előbb dől el,
hogy új vagy visszatérő páciensről van szó, csak utána a konkrét személy.

- **„+ Új páciens" (D41/D55)** — a kereső kártya FÖLÖTT álló, mindig
  látható, elsődleges gomb (megjelenésben és feliratban szó szerint azonos
  a `PaciensekPage.tsx` „+ Új páciens" gombjával, lásd § 9), a
  `PaciensekPage.tsx`-szel közös quick-create dialógust nyitja meg
  (`app/src/pages/paciensek/UjPaciensDialog.tsx`): kötelező név +
  opcionális születési dátum/telefon. A dialógus Mégse/Escape-je a
  köztes választón hagyja a dokit, a keresőszöveg megmarad (D205), a
  fókusz visszakerül a keresőmezőre. A duplikáció-detektálás (D42)
  kétfázisú: gépelés közben a begépelt névre pontos vagy hasonló
  (token-alapú) egyezésű páciensek jelennek meg javaslatként (max 3,
  „+N további" kibontással), a szűk jelölt-körre betöltött születési
  dátum/telefon szűrve tovább — ellentmondó adatnál a hasonló-nevű
  javaslat kiesik, a pontos névegyezés viszont jelöléssel bennmarad. Egy
  javaslat „Ezt a pácienst választom" gombja a begépelt adatokat eldobva
  a MEGLÉVŐ páciensre folytatja a flow-t (D203/D204); ha a talált adatok
  ELTÉRNEK a begépeltektől, egy megerősítő dialógus kéri a végső
  jóváhagyást. A Mentés gomb javaslat hiányában is mindig lefuttatja
  ugyanezt az ellenőrzést a végleges adatokra, mielőtt tényleg ment — ha
  talál ütközést, „Mégis új páciens létrehozása" explicit megerősítést
  kér. Csak sikeres mentés után jön létre a valódi páciensrekord ÉS
  navigál a Terv adatai lapra — a felső, mindig látható gomb ÜRESEN nyitja
  a dialógust; a kártyán belüli no-match „Új páciens" opció (lásd lent) a
  begépelt névvel előtöltve nyitja ugyanezt.
- Egy „vagy" feliratú vonalas elválasztó tagolja a két utat, alatta a
  kereső kártya:
- **„Meglévő páciens keresése…"** — névre kereső mező a páciens-index
  (`storage.listPatients()`) alapján, ékezetfüggetlenül (`norm()`),
  automatikusan fókuszban a lépés megnyílásakor (D40). Kétállású (D40):
  0–1 karakternél a „legutóbbi páciensek" listája, max 15 elemig (D56, a
  Kezdőlap D39 5-ös limitjétől szándékosan eltérve, ugyanaz a
  `legutobbAktivPaciensek()` helper, más `limit`-paraméterrel) — a sor
  egysoros: a név balra, tőle jobbra ugyanazon a soron az aktivitás-szöveg
  (`aktivitasSzoveg()`), szemben a Kezdőlap kétsoros elrendezésével (D47);
  2+ karaktertől a `paciensTalalatok()` (`domain/paciensKereses.ts`) relevancia szerinti
  rendezése (teljes név eleje > valamelyik szótöredék eleje > belső
  egyezés, azon belül alfabetikus). A lista a tételkeresővel
  (`ItemPicker.tsx`) azonos gépel → nyíl → Enter/Esc ciklust követi
  (`ArrowDown`/`ArrowUp` mozgatja a kiemelést, `Enter` kiválaszt,
  `Escape` kiüríti a keresőt). Nulla találatnál egy közvetlen „Új
  páciens: „…"" opció jelenik meg a begépelt névvel, a fenti „+ Új
  páciens" ágat indítja el, a quick-create dialógust a begépelt névvel
  előtöltve. Kiválasztás után a közös forráskiválasztáson (lásd fent,
  D33) előtöltve nyílik a Terv adatai lap — a nyelv/pénznem is a
  kiválasztott páciens legutóbb véglegesített tervéből örökölve (D52,
  fent § 2), ugyanazon a közös forráson keresztül.

A piszkozat-felülírás-őr a köztes lépésen fut le (mindkét ágon), NEM a
Kezdőlap gombján — a Kezdőlap gombja feltétel nélkül navigál ide, mert a
piszkozat itt még nem veszik el. A „+ Új páciens" ágon ez a megerősítés a
quick-create dialógus MEGNYITÁSA előtt fut le; a dialógus saját
Mégse/Escape-je (fent) ettől független, külön lépés.

A terv-lánc fa saját „Új terv"/„Másolás új tervbe" gombjai (lásd fent)
**nem** ide navigálnak — azoknál a célpáciens már adott a forrás tervből,
nincs kétértelműség.

---

## 6. Kezelések és árak (árlista admin)

Megvalósítás: `app/src/pages/PriceListAdminPage.tsx`.

### Tábla

Kategóriánként csoportosítva, oszlopok: gyakori jelölő (csillag),
megnevezés, HUF ár, EUR ár, aktív jelölő (szem ikon).

**Egy tábla, két ár oszlop** — nem külön magyar és német nézet. Így egy
pillantás megmutatja, hol hiányzik az EUR ár.

### Árlista-verzió

A fejlécben („verzió …") megjelenő `arlistaVerzio` MINDEN mentéskor a mai
napra áll, tartalmi megkülönböztetés nélkül (D30) — ez a forrása a
nyomtatvány láblécén megjelenő „árlista …" audit-adatnak
(`docs/04-nyomtatvany-spec.md`). Egy már mentett terven lévő
`arlistaVerzio` ettől függetlenül pillanatkép (D7): a terv a saját
létrehozásakori értékét viseli, nem frissül utólag.

### Keresés és szűrők

A keresőmező **mindkét nyelven illeszt** (`nev.hu` és `nev.de`), ugyanazzal
a szabállyal, mint a tervszerkesztő tétel-keresője — egy csak németül
elnevezett vagy csak a német nevében elgépelt tétel is megtalálható. A
találati sor változatlanul a magyar nevet mutatja; nincs külön jelzés
arra, hogy a találat a német névből jött.

`Mind` · `Nincs EUR ár` · `Sávos ár` · `Inaktív` · `Gyakori`

A `Nincs EUR ár` szűrő **maga a német bevezetés munkalistája**.

### Új tétel felvitele

A „+ Új tétel" gomb a lista TETEJÉN (a Kategóriák panel sorában) ÉS a lista
alján is megjelenik — hosszú listánál a felső a megtalálható, az alsó a
kéznél lévő. Mindkettő ugyanazt a felugró ablakot nyitja
(`pages/priceListAdmin/UjTetelDialog.tsx`).

A dialógus csak a névre és a kategóriára kérdez:

- Megnevezés (magyar) — kötelező, nem lehet üres/csak szóköz
- Bezeichnung (német) — opcionális
- Kategória — kötelező, **nincs alapértelmezett kitöltés** (a doki mindig
  tudatosan választ, nem esik némán az első kategóriába)

A Mentés gomb nem tiltott: kattintásra, ha valamelyik kötelező mező
érvénytelen, a mező alatt megjelenik a hibaszöveg, és a dialógus nyitva
marad. Ha egy már meglévő (aktív VAGY inaktív) tétel nevével ékezetfüggetlenül
pontosan egyezik a beírt név, egy nem blokkoló figyelmeztetés jelzi ezt — egy
inaktív tétel bármikor visszakapcsolható (D17), ezért hasznosabb, ha a doki
azt fontolja meg duplikálás helyett.

A dialógus Mégse gombja és az Escape is nyomtalanul eldobja a piszkozatot,
megerősítés-kérés nélkül — a törzsadatba semmi nem kerül a Mentés
megnyomásáig, és tétel-id sem foglalódik le.

Mentés után a tétel a listában, az ártípus `FIX` és a HUF ára `0` kezdőértékkel
jön létre (`aktiv: true`, `gyakori: false`, nincs EUR ára), a lista a friss
sorhoz görget, a sor kinyílik, és a fókusz a HUF ár mezőre kerül — a többi
mező (ártípus, HUF/EUR ár, gyakori, aktív) az alábbi „Sor kinyitása" szerinti
szerkesztőben állítható be.

### Sor kinyitása

Kattintásra a sor lenyílik, és ott van minden mező:

- magyar név, német név
- leírás (magyar, német) — „mi van benne?" (docs/02-domain-modell.md §
  Tétel-leírás), többsoros szövegmező
- csomagtétel jelölő — a véglegesítés-őr csak ennél a jelölésnél
  figyelmeztet hiányzó leírásra
- kategória (legördülő — **ezzel mozgatható át a tétel**, ez a takarítás
  fő eszköze)
- ártípus váltó: `FIX` / `SAVOS`
- HUF ár (vagy min/max), EUR ár (vagy min/max)
- aktív, gyakori

A `min`/`max` mezőpárra nincs betöltési szintű validáció (`validate.ts`
csak azt nézi, véges szám-e mindkettő) — ha a doki a „tól" mezőbe nagyobb
számot ír, mint az „ig"-be, a mezőpár alatt puha, amber figyelmeztetés
jelenik meg (`savosHatarForditott()`, `domain/money.ts`), de a mentés
ettől még lefut. Kemény tiltás azért nincs, mert gépelés közben (a „tól"
mező kitöltve, az „ig" még nem) a fordított állapot átmeneti.

Minden mezőszerkesztés (a szöveges mezők minden leütésre, a szám- és
egyéb mezők commit-onként) a `priceList`-et updateren át, a mentés ELŐTT
szinkron frissíti (D31, `docs/05-technologia.md`) — két, gyorsan egymást
követő szerkesztés (akár két különböző sor, akár ugyanannak a sornak két
mezője) emiatt nem üti ki egymást.

### Törlés helyett inaktiválás

A szem ikon inaktivál. Törölni nem lehet, és az `id`-t **soha nem
használjuk újra** (D17) — ezen múlik, hogy a régi tervek évek múlva is
értelmezhetők maradnak.

### Kategóriák panel

Összecsukható panel a tétel-táblázat FÖLÖTT. Kategória létrehozása,
átnevezése, színezése (kurált palettából, `KATEGORIA_PALETTA`), fel/le
sorrendezése; **törlés csak üres kategórián** — ha van rajta tétel, előbb
át kell mozgatni (a tétel-táblázat sorának kinyitása → kategória legördülő,
lásd „Sor kinyitása" fent).

A kategória sorrendje nem csak megjelenítési sorrend: a fogtérkép
ütközési prioritása is ebből olvas (docs/07-felulet-rendszer.md § Szín,
forma, sűrűség, D28) — egy fogon több kezelés esetén a listában előrébb
álló kategória színe nyer.

Az új kategória `id`-je a `nextKategoriaId()` max-alapú számításával
készül — a `nextTetelId` párja, ugyanaz a D17-szerű elv (soha nem
hossz-alapú, soha nem újrahasznosított).

---

## 7. Beállítások

Három tab (Radix `Tabs`, CONTROLLED — a tab-váltást a D38/D46
elhagyás-guardnak el kell kapnia, `docs/07-felulet-rendszer.md` §
Komponensek): **Rendelő adatai** (alapértelmezett) | **Nyomtatványok** |
**Egyéb** (D49). A Radix `Tabs.Content` unmountolja az inaktív tabot,
tehát egyszerre csak egy tab draftja él a memóriában.

**Mentési modell (D49, felváltja a korábbi D31 leütésenkénti autosave-ot
ezen a lapon)**: mindhárom tab pufferelt draftot vezet
(`components/useDirtyDraft.ts`), saját explicit Mentés/Mégse gombpárral.
A Rendelő adatai és az Egyéb tab Mégse gombja azonnali (nincs
megerősítés, mert csak a látható mezőket veszíti el); a Nyomtatványok
Mégse gombja megerősítést kér (lásd lent). Gyökérmappa kijelölése /
váltása — a 2. fázis (`docs/05-technologia.md`) tartalma, ma nem
implementált.

Tab-váltás (vagy NavBar-navigáció, D46) nem mentett módosítással
megerősítő dialógust nyit — megerősítés után a piszkozat **ténylegesen
elvész**, a Radix a tab tartalmát unmountolja.

### Rendelő adatai

- Rendelő adatai a nyomtatvány fejlécéhez és láblécéhez
  (Név/Cím/Telefon/E-mail/Adószám/Cégjegyzékszám)
- **Orvosok** (D67): soronkénti lista — név, aktív/inaktív kapcsoló,
  ↑/↓ sorrendezés, törlés — „+ Orvos hozzáadása" gombbal bővíthető. A
  lista alatt egy „Alapértelmezett orvos" választó, csak az aktív
  nevekkel. Az éppen alapértelmezett orvos deaktiválása, ha van másik
  aktív orvos, egy modális dialógusban azonnali újraválasztást
  kényszerít; ha nincs másik aktív orvos, a deaktiválás a dialógus
  megnyitása nélkül, azonnal engedett, egy figyelmeztető sávval, hogy
  az új tervek orvos nélkül indulnak és a véglegesítésük blokkolva
  lesz. Két azonos nevű orvos nem menthető (a `plan.orvos` NÉV-
  pillanatkép, nem `id`-hivatkozás, ezért feloldhatatlan lenne) — a
  Mentés gomb ilyenkor nem tiltott, kattintásra mutatja a hibát. Egy
  orvos név feltétel nélkül törölhető — explicit eltérés a D17 „csak
  deaktiválható" szabályától (D67) —, a korábbi terveken lévő
  név-pillanatkép ettől függetlenül érintetlen marad.

### Nyomtatványok

Sablonszövegek szerkesztése — a nyilatkozat, a fizetési feltételek és a
garancia, saját nyelvváltóval (Magyar/Deutsch, ha a német engedélyezve
van). **Mentéskor új verziófájl keletkezik** (`nyilatkozat-hu-v2.md`), a
régi marad, mert a korábbi tervek arra hivatkoznak — a mentés a
véglegesítéskor épp aktuális (legfrissebb) verziót pinneli a tervre. A
nyilatkozat szövegében a `{{orvos}}` helyőrző a kezelőorvos nevére
cserélődik a nyomtatványon. A szerkesztőmezők tartalma elnavigálásig sem
vész el: egy `dp:sablon-piszkozat` localStorage-kulcs base-enként
cache-eli, néma visszaállítással, és sikeres mentéskor base-enként
törlődik. **Ez tudatosan nem a `DraftStorage` bővítése** — az kizárólag
`Plan`-ra típusozott, egyetlen felelősséggel; a `dp:` prefix miatt a
„Minden adat törlése"/„Demó adat visszaállítása" ezt is elsöpri, külön
kód nélkül. A „Szöveg mentése" gomb `useRef`-alapú in-flight zárat visel,
mert a `disabled` prop önmagában megkerülhető egy render előtti második
kattintással.

**„Mégse" gomb** (D38) a „Szöveg mentése" mellett, dirty állapotban
engedélyezett — MEGERŐSÍTÉST kér (ellentétben a Rendelő adatai/Egyéb tab
azonnali Mégse-jével), mert egyszerre minden nyelv/szlot piszkozatát
elveti, nem csak a jelenleg látszó nyelvet, és a `dp:sablon-piszkozat`
cache-bejegyzést is törli minden érintett base-hez — enélkül a
piszkozat egy F5 után visszatérne. Ugyanez a cache-törlés fut le akkor
is, ha a doki dirty állapotban másik Beállítások-tabra vagy a NavBar-on
át máshova navigál, és a tab-váltás/D46 megerősítő dialógusban az
elvetést választja.

### Egyéb

- Ajánlat érvényessége napokban (alapérték 90)
- **Alapértelmezett nyelv** (`alapertelmezettNyelv`) kapcsolója — ez lesz
  az új tervek nyelve, öröklés híján (D52). Feltétel nélkül látszik (D63),
  nincs hozzá engedélyező kapcsoló. Alatta a **német tartalom
  készültsége**, szintén feltétel nélkül: hány aktív tételnek van már
  német neve, hány tételnek van EUR ára, és a `nyilatkozat-de-v1.md`
  státusza (placeholder, amíg a jogi fordítás el nem készül) — link a
  Kezelések és árak oldalra, ahol a „Nincs EUR ár" szűrő a munkalista. A
  nyilatkozat státuszát a tab saját maga tölti be, függetlenül a
  Nyomtatványok tabtól.

---

## 8. Filerendszer

**Kizárólag a mockup-fázisra való, demó-only nézet, a `DEMO` oldal
Filerendszer füle** — a végleges asztali alkalmazásban a doki a valódi
Fájlkezelőt használná erre, ez a képernyő nem feltétlenül él tovább a
`FileSystemStorage`-váltás (2. fázis) után. Célja, hogy a doki és a
fejlesztő közösen lássa, mit írna az app a gyökérmappába — a
`docs/02-domain-modell.md` "Mappastruktúra" élő, kattintható vetülete a
mockup `localStorage`-adatából.

- **Read-only fa**: mappa/fájl diszklózúra, a gyökér és az első szint
  (`sablonok/`, `paciensek/`, a két root JSON) alapból nyitva, mélyebb
  szintek (páciens-/terv-/verziómappák) csukva. Semmilyen törlés/
  átnevezés/írás nincs ezen a képernyőn — a meglévő útvonalak (Összes
  terv, Kezelések és árak, Beállítások) változatlanok.
- **Egy fájlra kattintva** a ténylegesen tárolt tartalom jelenik meg alatta:
  JSON fájloknál pretty-printelve, sablon-`.md` fájloknál nyers szöveggel
  (a `[PLACEHOLDER`/`[PLATZHALTER` jelöléssel együtt), a `kezelesi-terv.pdf`-nél
  egy "Megnyitás új lapon" linkkel a ténylegesen elmentett PDF-bájtokból
  épített ideiglenes URL-re.
- **Csak az valóban ott van, ami ténylegesen mentve lett** — a demó seed
  tervekhez (a „Demó adat visszaállítása" gomb után) egyelőre nincs PDF,
  az csak egy tényleges véglegesítés-és-mentés után jelenik meg a
  verziómappában; a fa nem mutat kitalált tartalmat.
- **A piszkozat-cache-ek (`dp:piszkozat`, a terv-autosave; és a
  sablonszerkesztő `dp:sablon-piszkozat`-ja, lásd fent § 7. Beállítások)
  soha nem jelennek meg** — a végleges architektúrában ezek IndexedDB,
  nem fájl, tehát a fa nem róluk szól.
- Üres tároló esetén ("Minden adat törlése" — bár ez a gombsorrend miatt
  ma mindig újra-seedel is, lásd Kezdőlap) semleges üres állapot, hiba
  esetén a hiba szövege — a `docs/07-felulet-rendszer.md` "Kötelező
  állapotok" szabálya szerint.

---

## 9. Páciensek

Tiszta navigációs lista a páciens-részletoldalhoz (§ 10) — funkcionálisan
külön a terv-lánc/verzió fától (§ 5): az a kezelési előzmény/verziók
tartalma, ez a páciens-azonosítás/keresés képernyője. Mindkettő ugyanoda,
a páciens-részletoldalra vezet — ez a lista a sor kattintásával, a DEMO
„Összes terv" füle a „Páciens adatai" kereszt-linkkel. A törzsadat-
szerkesztő (`paciens-adatok.json`, D33) EGYETLEN helye a § 10 `Páciens
adatai` tabja — a szerkesztő mezői/mentés-szabályai ott vannak leírva
(D43).

- **Lista**: `storage.listPatients()` + a törzsadat/fallback eager
  betöltésével (`loadTorzsadatok()`, `domain/torzsadatBetoltes.ts` — az
  `OsszesTervSection` végösszeg-betöltésének mintájára) minden látható
  sorra egyszerre, nem soronkénti lusta betöltéssel. Alfabetikus
  (`localeCompare('hu')` a megjelenített néven).
- **Sor tartalma**: oszlopos táblázat (Radix `Table`, `pages/paciensek/
  PatientTableRow.tsx`, D47) — Név / Született / Telefon fejléccel, félkövér,
  `t.brand` színű oszlopcímekkel (az Árlista admin kategória-fejlécével
  azonos stílus). A Kezdőlap „Legutóbbi páciensek”
  sora (`components/PatientListRow.tsx`) SZÁNDÉKOSAN külön komponens (D47) —
  az eltérő elrendezés (táblázat vs. az aktivitás-szöveget hordozó kompakt
  sor) miatt. A két NORMÁL állapot („van már lezárt törzsadata” / „egyelőre
  csak élő fallback”) NEM kap semmilyen jelvényt; a törzsadat-betöltés
  hibája egy összevont, a Született+Telefon oszlopot átfogó cellában
  jelenik meg (`⚠ adat nem olvasható`). Hiányzó születési dátum vagy
  telefon az app „—” hiányzó-érték jelölését kapja. A sor egérrel bárhol
  kattintható (a névcella egy valódi `<a>`-t tartalmaz, középső gombbal/
  „megnyitás új lapon”-nal is elérhető), hoverre/fókuszra a teljes sor
  háttere `accentWash`-ra vált.
- **Keresés**: névre (ékezetfüggetlen, mint korábban), ÉS — 2+ begépelt
  számjegytől — a születési dátumra/telefonszámra is, elválasztójeltől
  függetlenül (`keresoKulcs()`/`torzsadatEgyezik()`,
  `domain/paciensKereses.ts`; a telefon-egyezéshez a D42
  `telefonKulcs()`-előtag-normalizálását is felhasználva). A mezőnek
  látható „Keresés” címkéje van a mező fölött (`docs/07`: címke soha nem
  csak placeholder), a lista fölött egy találatszám sor mutatja a
  szűrt/teljes arányt (`„N találat az M páciensből”`, szűrés nélkül
  `„M páciens”`).
- **Sor megnyitása**: a sorra kattintás a páciens-részletoldalra (§ 10)
  navigál — alapértelmezetten a `Kezelési tervek` tabra (a § 10
  alapértelmezése), NEM nyílik ki helyben szerkesztő.
- **Állapot-megőrzés**: a listáról egy sorra navigálva, majd böngésző-
  „vissza”-val visszatérve a keresőszöveg és a görgetési pozíció megmarad
  (`components/useListStateMemory.ts`) — KIZÁRÓLAG ezen az úton; egy friss
  belépés (pl. a NavBar „Páciensek” linkjéről) mindig tiszta listát ad.
  Munkamenetre szűkített (nem böngészőtár), lapfrissítés után nem marad meg.
- **Új páciens**: „+ Új páciens” gomb, mezős dialógus (kötelező Név +
  opcionális Született/Telefon — a többi adat a mentés után, a
  részletoldal `Páciens adatai` tabján adható meg, az `UjTetelDialog.tsx`
  mintájára). A Született mezőnél jövőbeli dátum blokkolóan hibát ad
  (D45, ugyanaz a szabály, mint a `PatientEditorPanel`-en), a Mentés
  gomb ilyenkor nem hoz létre pácienst. Ugyanez a dialógus
  (`UjPaciensDialog.tsx`) szolgálja az „Új terv indítása” köztes
  páciensválasztó „+ Új páciens” ágát is (D41), a duplikáció-
  detektálás (D42) mindkét belépési ponton azonos (lásd fent, „Új terv
  indítása”). `storage.createPatient(nev, kezdoAdatok?)` mindkét
  gyökér-fájlt (`paciens.json` + `paciens-adatok.json`) létrehozza, terv
  nélkül, majd a mentés a páciens-részletoldalra, SZERKESZTÉS módban
  előválasztott `Páciens adatai` tabra navigál (D45). Az így felvitt
  páciens a DEMO „Összes terv" fülén NEM jelenik meg (§ 5) — csak akkor
  kerül oda, ha legalább egy terve is lesz.
- A nyomtatvány (PDF) nem változik: ez a képernyő SOHA nem forrása a
  PDF-nek (D7, D33).
- **Törlés** (D50): a lista élőben (`storage.listPatients()`) tölt be,
  tehát egy törölt páciens a törlés után azonnal eltűnik innen is —
  magát a törlés akcióját lásd § 10, ez a képernyő nem kínálja soronként.

---

## 10. Páciens részletei

URL-lel címezhető (`/paciensek/:patientDir`, D35), két tabbal: `Páciens
adatai | Kezelési tervek`. Megvalósítás: `app/src/pages/PatientDetailPage.tsx`.
Ez a képernyő a törzsadat-szerkesztést (§ 9) és a terv-lánc/verzió fát
(§ 5) FOGADJA BE két tabként — a `Kezelési tervek` tab az ELSŐDLEGES
gazdája a § 5 tartalmának (D54), a DEMO „Összes terv" füle másodlagos,
több-pácienses áttekintő. A `Páciens adatai` tab tartalma
(`components/PatientEditorPanel.tsx`) itt van az EGYETLEN hívási helyén
(D43) — a § 9 Pácienslistája tiszta navigációs lista, nem tartalmazza. A
`Kezelési tervek` tab tartalma (`components/PatientPlanChains.tsx`)
ellenben KÉT hívási helyen közös: itt ÉS a DEMO „Összes terv" fülének
(§ 5) páciensenkénti listasorában, hogy egyik felület se duplikálja a
másikat. A fejléce viszont hívónként eltér (D44, lásd lent): itt
beágyazva (`header: 'embedded'`), a DEMO fülön önállóan
(`header: 'standalone'`). A `Páciensek` lista és a DEMO „Összes terv"
füle önmagukban változatlanul elérhetők maradnak — csak a bennük lévő
kereszt-linkek mutatnak ide.

- **Sticky fejléc**: név + születési dátum + telefon, görgetéskor a lap
  tetején marad. Adatforrása a `megjelenitettTorzsadat()` (§ 9-cel azonos
  logika: lezárt törzsadat, vagy ha nincs, élő fallback a legutóbb
  módosított terv-lánc legfrissebb `paciens` pillanatképéből).
- **Alapértelmezett tab**: `Kezelési tervek` — a hívó (a két lista
  kereszt-linkje) `location.state`-ben jelezheti, hogy helyette a
  `Páciens adatai` tabbal nyisson (pl. teljes pácienslétrehozás után).
- **`Páciens adatai` tab**: a `PatientEditorPanel` — nincs rajta „Új terv”
  gomb, az kizárólag a `Kezelési tervek` tabhoz tartozik. Kétállású (D45):
  megnyitáskor alapból READ-ONLY nézet (`ReadOnlyField`-ekkel, a mentett
  adatból, sosem egy piszkozatból), egy „Szerkesztés” gombbal az input-
  mezős nézetre váltva — a puszta megtekintés így sosem indít piszkozatot.
  A kitöltetlen mezők READ-ONLY nézetben az app meglévő „—” hiányzó-érték
  jelölését kapják (nem egy külön szöveget). Ha a páciensnek nincs még
  `paciens-adatok.json`-ja, a mezők (Név / Született+TAJ / Lakcím /
  Telefon+E-mail / Kiskorú + feltételes Törvényes képviselő) a legutóbb
  módosított terv-láncának legfrissebb `paciens` pillanatképéből előre
  kitöltve nyílnak (READ-ONLY nézetben is), egy rövid sor jelzi, hogy ez az
  adat még nem önálló — mentéssel válik azzá. Szerkesztés módban explicit
  „Mentés”/„Mégse” gombpár, NEM leütésenkénti autosave (ellentétben pl. a
  Beállítások rendelő-mezőivel) — az első mentés szemantikus állapotváltás
  (fallback → lezárt törzsadat), ezt a dokinak szándékosan kell kiváltania;
  a „Mégse” gomb módosítás nélkül is elérhető, hogy vissza lehessen lépni
  READ-ONLY nézetbe. Az e-mail mező (ha kitöltött) szintaktikai formátumát
  és a Született mező jövőbeli dátumát a Mentés gomb blokkolóan ellenőrzi
  (hibaszöveg a mező alatt, a Mentés gomb kattintható marad); a Mentés
  gomb sikeres mentés után visszalép READ-ONLY nézetbe. Tab-váltáskor, ha
  szerkesztés módban van nem mentett módosítás, megerősítést kér (lásd
  lent) — a tab-váltás egyben READ-ONLY nézetre is visszaállítja a panelt.
  A Mentés gomb a duplikáció-detektálást (D42) is lefuttatja a végleges
  adatokra, mielőtt tényleg ment — ha egy MÁSIK páciensre pontos vagy
  hasonló találatot ad, egy megerősítő dialógus („Hasonló nevű páciens már
  létezik”) kéri a jóváhagyást, javaslat-lista/„Ezt a pácienst választom”
  akció nélkül (ez itt átnevezés, nem választás — a doki már egy konkrét,
  nyitott páciens adatlapján van). A `PaciensekPage.tsx` „+ Új páciens”
  sikeres mentése után a tab kivételesen SZERKESZTÉS módban nyílik (a
  hívó `location.state.mod: 'szerkesztes'`-t jelez) — a doki épp csak a
  nevet adta meg, valószínűleg tovább akarja tölteni a többi mezőt; egy
  MEGLÉVŐ páciens kiválasztása (kereszt-link, „Ezt a pácienst választom”)
  ellenben READ-ONLY nézetben nyit.
- **`Kezelési tervek` tab**: a `PatientPlanChains` (§ 5 fa/verzió/akció
  szabályai szerint), de a fejléce beágyazott (D44): a páciensnév és a
  „Páciens adatai” kereszt-link elmarad, mert a sticky fejléc és a
  tabsor már hordozza mindkettőt — csak az „Új terv” akció marad,
  teljes értékű CTA-ként, ugyanolyan hangsúllyal, mint a lenti üres
  állapoté. Ha a páciensnek még nincs egyetlen olvasható terv-verziója
  sem, a fa helyett egy „Új terv” CTA jelenik meg — ez az EGYETLEN eset,
  ahol ez a képernyő ilyen üres állapotot mutat, mert a DEMO „Összes terv”
  füle (§ 5) egy ilyen pácienst eleve ki sem listáz.
- A `Páciens adatai` tab „Korábbi tervek” gombja — ami korábban a
  `PatientEditorPanel` alján állt — megszűnt (D44): a tabok közti váltás
  egyetlen helye a tabsor. A `Kezelési tervek` tab tartalma emiatt sem
  tart saját „Páciens adatai” utat.
- **Tab-váltási guard** (D38): a Radix `Tabs` unmountolja az inaktív tabot,
  tehát a `Páciens adatai` tabon félbehagyott, nem mentett szerkesztés
  egyébként némán elveszne egy tabváltásnál (`Tabs.List` kattintás — ez az
  EGYETLEN útja a tab-váltásnak ezen az oldalon, D44). A megosztott
  primitíven (`useDiscardGuard`/`DiscardChangesDialog`) megy át —
  megerősítést kér, a `Kezelési tervek` tab felé váltás irányban.
- **Páciens törlése** (D50): a sticky fejléc jobb szélén egy `⋯` menü
  (`components/PatientDetailHeader.tsx` `actions` propja) EGYETLEN
  ponttal, „Páciens törlése” — ez az EGYETLEN elérési pont az egész
  appban, nincs a Pácienslista sorain vagy a terv-lánc fa verziósorainak
  `⋯` menüjén. A pont csak akkor aktív, ha a páciensnek
  nincs véglegesített terve, nincs rá mutató aktív, mentetlen piszkozata,
  és minden terv-lánca/verziója olvasható volt; egyébként tiltott, alatta
  egy rövid indoklással („Véglegesített terve van” / „Aktív piszkozat
  tartozik hozzá” / „Néhány terve nem olvasható”). Kattintásra egy
  megerősítő `AlertDialog` nevezi meg a pácienst és mondja ki, hogy a
  művelet végleges; megerősítés után a teljes páciensmappa törlődik
  (`storage.deletePatient()`), és a doki a Pácienslistára kerül. Nincs
  „kuka”, nincs helyreállítás, nincs páciens-összevonás.

## 11. Terv részletei (véglegesített verzió)

URL-lel címezhető (`/paciensek/:patientDir/tervek/:planDir/:versionDir`).
Megvalósítás: `app/src/pages/TervReszleteiPage.tsx`. Egy KIZÁRÓLAG
véglegesített (`statusz === 'VEGLEGES'`) verzió read-only, strukturált
nézete — a § 5 terv-lánc fa „Megnézés" akciója ide navigál, a nyers,
mentett PDF-blobot megnyitó korábbi viselkedés helyett (az utóbbi erről a
lapról, „Megnyitás külön" néven érhető el). NEM a terv-workflow héj
(`TervWorkflowShell`, § 2–4) alatt él: a héj a PISZKOZAT szerkesztés 3
lépéséé, egy immutable, lezárt dokumentum nem workflow-lépés.

**Elrendezés, fentről lefelé**: kattintható „Hol vagyok" útvonal (Páciensek
› páciensnév › terv címke · verzió); sticky fejléc (páciensnév + születési
dátum — SZÁNDÉKOSAN szűkebb, mint a páciens-részletoldal sticky fejléce,
mert a telefont is tartalmazó teljes pillanatkép lejjebb, összecsukva
jelenik meg) + akciósáv; verziónavigáció (‹ előző / „Összes verzió" /
következő ›); majd a tényleges tartalom, ABBAN a sorrendben, ami a
véglegesített dokumentum logikus olvasási sorrendje: pénzügyi összesítés,
fázisok és kezelési sorok, végül a terv metaadata (cím, verzió, dátumok,
nyelv, pénznem, kezelőorvos, „Véglegesített"/„Csak ajánlat" jelvény), a
páciens-pillanatkép, és legvégül a beágyazott mentett PDF.

**Akciósáv**: a lánc legfrissebb verzióján elsődleges „Új verzió", egy
historical verzión helyette „Ugrás a legfrissebbre" (a legfrissebb verzió
route-jára navigál); mindegyiken „Megnyitás külön" (a mentett PDF új
böngészőlapon, popup-blokkoló elleni szinkron `window.open`-nel, ugyanaz a
mechanizmus, mint korábban a „Megnézés"-é), „Letöltés" (a MEGLÉVŐ
`buildDownloadFileName()` fájlnév-konvenciója, `isDraft: false`, mert a lap
csak `VEGLEGES` verziót renderel — betöltés alatt/hiányzó PDF-nél letiltva,
hogy az akciósáv szélessége ne ugráljon) és „Másolás új tervbe". A
„Megnyitás külön"/„Másolás új tervbe" a `domain/planVersionActions.ts` +
`components/PlanVersionActionDialog.tsx` megosztott réteget hívja —
ugyanazt, amit a § 5 terv-lánc fája is használ, hogy a piszkozat-
felülírás-őr szövege/feltétele ne térjen el a két felület között.

**Mentett PDF**: a strukturált tartalom UTÁN, ~80vh natív böngésző-
viewerben (`<iframe>`, a draft-előnézet `PreviewPage.tsx` iframe-stílusát
követve) beágyazva jelenik meg a ténylegesen véglegesítéskor mentett
bájtsorozat — sosem generálódik újra (nem `usePDF()`, mert ez már lezárt,
mentett dokumentum). A bájtok → Blob → object URL átalakítást és annak
életciklusát a megosztott `usePlanPdfObjectUrl` hook kezeli: az object URL
verzióváltáskor és a lap elhagyásakor felszabadul, hogy egy beágyazott
`<iframe>` (szemben a korábbi, böngészőre bízott „új lapon" úttal) ne
hagyjon fel nem szabadított Blob URL-t a memóriában. Hiányzó vagy
olvashatatlan mentett PDF esetén a viewer helyén egy üzenet jelenik meg,
regenerálási kísérlet NÉLKÜL — a lap többi, JSON-ból származó tartalma
(fejléc, pénzügyi összesítés, fázisok, metaadat, páciens-pillanatkép) a
hiba ELLENÉRE is olvasható marad.

**Verziónavigáció**: a lánc verziói dátum/verziószám szerint csökkenő
sorrendben; a prev/next gombok a szomszédos verzió route-jára navigálnak,
mindig `replace`-es navigációval — a láncon belüli lépegetés oldalirányú
mozgás egy nézeten belül, nem új „hely" a history-ban, különben az „Összes
verzió" böngésző-visszalépése a köztes verzióra vinne vissza, nem a
listára. „Összes verzió" a lánc listájára navigál vissza: közvetlen
link/frissítés (nincs history-előzmény) esetén a páciens-részletoldalra, a
`Kezelési tervek` tabbal; egyébként böngésző-"vissza" (POP) navigációval,
amit a § 5/§ 10 meglévő `useListStateMemory`-alapú scroll-/lánc-
nyitottság-visszaállítása is tud kezelni.

**Teljes lokális state-reset verzióváltáskor**: a tartalom-blokk (pénzügyi
összesítés, fázisok, metaadat, páciens-pillanatkép) egy `key={\`${planDir}/
${versionDir}\`}` wrapperben él — ez az oldal alapmintája, verzióváltáskor
a React a teljes alfát unmountolja/remountolja, így minden lokális
UI-állapot (nyitott blokkok, kijelölések) magától alapállapotba áll,
anélkül hogy minden új interaktív elemet külön reset-listába kellene
kötni. A lap emellett explicit a tetejére görget verzióváltáskor.

**Pénzügyi összesítés**: minden kiírt szám a mentett `plan.osszesitok`-ból
jön, sosem a sorokból újraszámolt értékből — egy lezárt dokumentumnak az
aláírt papírral kell egyeznie. A feliratok a nyomtatvány szókincsét
követik (Kezelések összege / Végösszeg / Előleg / Fennmaradó rész), nem a
szerkesztőét. A `Kezelések összege` referenciasor csak akkor jelenik
meg, ha a mentett összesítő szerint van eltérés a listaártól
(`osszesitok.kedvezmeny !== 0`) — egymást nettóban kiegyenlítő sor-szintű
kedvezmény és felár mellett is igaz, hogy ez más kérdésre válaszol, mint
a domináns `Végösszeg` sor. Alatta, ha van legalább egy `savos` sor, egy
halk, nem kattintható info-sor jelzi a becsült tételek számát. Az
„Előleg"/„Fennmaradó rész" csak akkor jelenik meg (saját, csak ekkor
kiírt „Fizetés" alcímmel), ha a tervnek van mentett `elolegOsszeg`-je, a
STORED `Végösszeg`-ből számolva — a fennmaradó rész „—", ha az előleg
meghaladja a fizetendőt. Az `osszesitokElter()` (eddig kizárólag
piszkozat-betöltéskor futó) ellenőrzés itt is lefut: ha a mentett
összesítő nem egyezik a mentett sorokból újraszámolt értékkel, egy
info-szintű (nem blokkoló) figyelmeztetés jelzi — szándékosan semleges
színnel, nem a szerkesztő amber jelzésével, mert egy lezárt dokumentumon
a dokinak nincs mit tennie, csak tudnia kell róla.

**Fázisok és kezelési sorok**: a fázis-szekciók alapból NYITVA vannak,
összecsukhatók, a fázis-cím pedig NEM sticky, de minden fázisnak saját
táblafejléce van, ami sticky marad görgetéskor (a globális lap-fejléc alatt
tapad meg — 4+ fázisnál a fázis-ugró nav alatt, lásd lentebb). Az oszlopok
stabilak: Beavatkozás / Fog / Db / Egységár / Összeg, a szöveg balra, a
szám jobbra igazítva, tabular-nums. A darabszám mindig `×N` alakban
jelenik meg, `N=1`-nél is. A fog mező a sor eredeti szabadszöveges
tartalmát mutatja (nem a nyomtatvány normalizált alakját), hiányzó
fogszámnál „—". Az egységár-cellában, ha a listaár megegyezik az ajánlati
árral, egy érték látszik; eltérésnél az ajánlati elsődleges, a listaár
alatta, kisebb, halványabb másodlagos érték. Egy sor leírása csak explicit
kibontásra nyílik, egyszerre több sor leírása is nyitva lehet, és egy
fázis összecsukása/kinyitása NEM veszíti el a már kibontott leírások
állapotát (ez a nyitottság a szülő blokkban él, nem magában a soron belül,
hogy a fázis-törzs feltételes renderje ne unmountolja el vele együtt). A
`savos` sorokon egy statikus „Becsült ár" jelvény jelzi a bizonytalan
árat — itt nincs átbillenthető kapcsoló, mert a nézet olvasásra való. Ha
a sor ajánlati ára eltér a listaártól, egy semleges (szürke) jelvény
jelzi a kedvezmény/felár mértékét — a szerkesztő zöld/amber jelvényétől
szándékosan eltérő szín, mert itt ténymegállapítás, nem cselekvésre hívó
jelzés (`domain/sorElteres.ts`, lásd `docs/02-domain-modell.md` § „Sor-
szintű ár-eltérés osztályozása"). A fázismegjegyzés nyitva mindig látszik, csukott fázis fejlécén egy halk
jelvény jelzi a meglétét. 4 vagy több fázisnál egy fázis-ugró legördülő
(ordinal + a tényleges fázisnév) jelenik meg, ami görgetés közben
scrollspy-vel követi az aktuálisan látható fázist, és kattintásra a
célfázist — ha csukva volt — kinyitja, majd oda görget és a fázis
chevron-gombjára fókuszál. Minden sor gyökéreleme stabil, egyedi DOM
`id`-t kap, hogy egy másik felület (pl. egy fogra kattintás) a hozzá
tartozó sorra tudjon görgetni.

**„Érintett fogak" panel**: a „Kezelési fázisok" szekció tetején, a
fázis-ugró nav fölött, alapból csukva (a szerkesztő fogtérkép-panelének
mintája) — csak akkor jelenik meg, ha a tervben van legalább egy fogra
térképezhető sor. Read-only: kattintással TÖBB fog is kijelölhető
egyszerre (nem kizáró toggle), de egy kezeletlen (egyetlen sor által sem
érintett) fogra kattintás nem csinál semmit — a panel célja a
kezelősorokhoz navigálás, nem egy önmagában is jelentéssel bíró
kijelölés. A kijelölt fogak UNIÓJÁHOZ tartozó sorok additív, semleges
(`accentWash`) háttérkiemelést kapnak, a nem érintett sorok nincsenek
elhalványítva; egy csukott fázisba eső kijelölés automatikusan kinyitja
azt a fázist, hogy a kiemelés látható legyen. Csak az ELSŐ kijelölés
görget a hozzá tartozó sorra — egy 3+ fogas kijelölésnél a további
kattintások nem viszik el a nézetet a korábban kijelöltek kontextusából.
`Escape`, illetve egy explicit „Kijelölés törlése" vezérlő törli a teljes
kijelölést; a panel összecsukása csak vizuálisan rejti el (a kijelölés a
szülő komponensben él, túléli), verzióváltáskor viszont a lap meglévő
`key`-alapú remountja mindent alaphelyzetbe állít. A `DentalChart` ehhez
egy explicit `szerep: 'button' | 'option'` propot kapott — a soronkénti
fogválasztó (`ToothPickerPopover`) ettől függetlenül, változatlanul
`szerep="option"`-t ad, a `listbox`/`aria-selected` szemantikáját ez a
panel nem érinti.

**Páciens-pillanatkép**: a „Páciens adatai a véglegesítéskor" szekció
alapból összecsukva, a `masterSnapshotDiff()`
(`domain/masterSnapshotDiff.ts`) eltérés-számával jelezve, ha a páciens
jelenlegi törzsadata azóta módosult. Kibontva mind a 8 `Paciens` mező
látszik, eltérésnél egy read-only, két-oszlopos táblázat (törzsadat vs. a
terv adata) — SZINKRON-AKCIÓ NÉLKÜL: egy véglegesített terv `paciens`
blokkja pillanatkép, amit a rendszer soha nem ír felül utólag, a diff itt
tisztán tájékoztató. Ha még nincs lezárt törzsadat-fájl, a pillanatkép
önmagához képest nem mutat eltérést. Egy olvashatatlan (sérült) törzsadat-
fájl nem viszi el a lap egészét — a pillanatkép-szekcióban egy halk sor
jelzi, hogy az összevetés kimaradt.
