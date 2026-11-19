# Mandoki Dental — telepítés

Az alkalmazás telepítőit a GitHub-kiadás (Release) oldala tartalmazza:

- Windows: `Mandoki-Dental-Setup-<verzió>.exe`
- Mac (Apple Silicon és Intel): `Mandoki-Dental-<verzió>-universal.dmg`

Frissítés nincs automatikusan: új változatnál ugyanezeket a lépéseket kell megismételni. Hogy mi
változott, azt az alkalmazás Kezdőlapján a Változásnapló mutatja.

> **Próbaüzem.** Az alkalmazás már a kiválasztott adatmappába ír, de az éles indulásig csak
> kitalált páciensekkel dolgozz, valódi páciensadatot ne írj bele.

## Windows

### Telepítés

1. Töltsd le a `Mandoki-Dental-Setup-<verzió>.exe` fájlt, és indítsd el.
2. A Windows kék ablakban figyelmeztet, hogy védelmet nyújtott a számítógépnek („SmartScreen”). Ez
   azért jelenik meg, mert az alkalmazás nincs fizetős tanúsítvánnyal aláírva. Kattints a
   **„További információ”** feliratra, majd a megjelenő **futtatás** gombra.
3. A telepítés rendszergazdai jelszó nélkül, magától lefut. Utána az alkalmazás a Start menüben és
   az asztalon **Mandoki Dental** néven található.

### Frissítés

Töltsd le az új telepítőt, és futtasd ugyanígy. A SmartScreen minden új változatnál újra
figyelmeztet.

### Eltávolítás

Beállítások → Alkalmazások → Telepített alkalmazások → **Mandoki Dental** → Eltávolítás. Az
eltávolítás az alkalmazás gépen tárolt adatait (a félkész tervet is) törli.

## Mac

Egyetlen Mac-telepítő van: ugyanaz a fájl Apple Silicon (M1, M2…) és Intel processzoros Macen is
működik. macOS 13 (Ventura) vagy újabb rendszer kell hozzá — hogy melyik van a gépen, az Apple
menü → **Erről a Macről** ablakban látszik.

### Telepítés

1. Töltsd le a `Mandoki-Dental-<verzió>-universal.dmg` fájlt, és nyisd meg.
2. A megnyíló ablakban húzd a **Mandoki Dental** ikont az **Alkalmazások** (Applications) mappára.
3. Indítsd el az Alkalmazások mappából. A Mac először nem engedi megnyitni, mert az alkalmazás nincs
   az Apple-nél hitelesítve: a figyelmeztetést zárd be (**Kész**, ne „Kidobás”).
4. Nyisd meg: Rendszerbeállítások → **Adatvédelem és biztonság**. Görgess le a **Biztonság** részig:
   ott áll, hogy a „Mandoki Dental” meg lett akadályozva. Kattints a mellette lévő **megnyitás**
   gombra, és erősítsd meg a jelszavaddal vagy Touch ID-val.
5. Az alkalmazás elindul. Ezután már dupla kattintással nyílik.

A 3–5. lépést **minden frissítés után egyszer** meg kell ismételni.

**Ha a fenti út nem működik:** nyisd meg a Terminált (Alkalmazások → Segédprogramok → Terminál),
másold be az alábbi sort, és nyomj Entert:

```
xattr -dr com.apple.quarantine "/Applications/Mandoki Dental.app"
```

### Frissítés

Lépj ki az alkalmazásból, nyisd meg az új dmg-t, és húzd az ikont ismét az Alkalmazások mappára
(a régit cserélje le). Utána a telepítés 3–5. lépése.

### Eltávolítás

1. Húzd a **Mandoki Dental** alkalmazást az Alkalmazások mappából a Kukába.
2. A Finderben: Ugrás → Ugrás mappához…, írd be: `~/Library/Application Support/mandoki-dental`, és
   ezt a mappát is töröld. Ebben él az alkalmazás gépen tárolt adata (a félkész terv is), a Mac
   ezt magától nem törli.

## Első indítás: az adatmappa kiválasztása

Az alkalmazás minden adatot — az árlistát, a beállításokat, a nyomtatvány-szövegeket és a páciensek
terveit — egy általad kiválasztott mappába ír, ezt a mappát a Google Drive viszi át a másik gépedre.
Első indításkor az alkalmazás ezt a mappát kéri.

- A mappa a Google Drive **„Saját meghajtó”** (My Drive) részén legyen, **„Fájlok tükrözése”**
  módban szinkronizálva — ne megosztott meghajtón (Shared Drive).
- Ne a Letöltések mappát válaszd: az a OneDrive-ra is szinkronizálhat.
- **Az első gépen** hozz létre egy új, üres mappát (például `Mandoki Dental adatok`), és azt válaszd:
  az alkalmazás felépíti benne az adatmappát.
- Ha a demóban már beállítottad az árlistát, a rendelő adatait és a nyomtatvány-szövegeket, az üres
  mappa kiválasztása után a **Van egy exportált fájlom a demóból** gombbal az adatmappa a demó
  exportjából épül fel (lásd lent: Átvitel a demóból).
- **A második gépen** várd meg, hogy a Google Drive letöltse ezt a mappát, és ugyanezt válaszd ki. Ha a
  mappa még üresnek látszik, ne hozz létre benne új adatmappát: várd meg a letöltést.

A kiválasztott mappa később a Beállítások → **Adattárolás** fülön látszik és cserélhető. Ha induláskor
a mappa nem érhető el (például a Drive még nem indult el), az alkalmazás ezt kiírja: várd meg a
Drive-ot, majd **Újrapróba**. Az adatmappához az alkalmazás eltávolítása nem nyúl.

## Átvitel a demóból

A demóban beállított árlista, rendelőadatok és nyomtatvány-szövegek átvihetők a telepített
programba. Páciensadat nem kerül át: a demó páciensei kitaláltak.

1. A böngészős demóban a **Beállítások** oldal **Adatkezelés** fülén exportáld az adatokat. A fájl
   (`kezelesi-terv-export-<dátum>.json`) a Letöltések mappába kerül.
2. A telepített programban első indításkor válassz egy üres mappát, és kattints a **Van egy
   exportált fájlom a demóból** gombra; vagy egy már használt adatmappánál a Beállítások →
   **Adattárolás** fülön, az **Átvitel a demóból** résznél ugyanerre a gombra.
3. Válaszd ki az exportált fájlt. A program írás előtt összegzi, mi kerül át, és csak a
   megerősítés után ír.

Egy már használt adatmappánál az átvitel a mostani árlistát és beállításokat lecseréli, az exportban
szereplő nyomtatvány-szövegeket felülírja; a páciensek és a tervek nem változnak. Ha a mostani
árlistára még szükséged lehet, előbb készíts biztonsági mentést.

## Gépváltás

Egyszerre mindig csak az egyik gépen dolgozz. Gépváltáskor:

1. Zárd be az alkalmazást ezen a gépen.
2. Várd meg, hogy a Google Drive ikonja jelezze: a feltöltés befejeződött.
3. A másik gépen várd meg, hogy a Google Drive letöltse a változásokat.
4. Csak ezután nyisd meg ott az alkalmazást.

Ha a munkamenetben mentettél, az alkalmazás bezáráskor erre röviden emlékeztet.

## Biztonsági mentés és visszaállítás

A Google Drive nem biztonsági mentés: ha egy fájl elromlik vagy törlődik, a Drive a hibát is
átviszi a másik gépre. Ezért **havonta** készíts mentést: Beállítások → **Adattárolás** →
**Biztonsági mentés ZIP-be**. Az alkalmazás az egész adatmappát egyetlen ZIP-fájlba menti; ha 30
napnál régebbi az utolsó mentés, a Kezdőlap emlékeztet.

> **A mentésben páciensadat van.** Csak titkosított külső lemezre tedd (Windowson BitLocker To Go,
> Macen titkosított lemez). Az adatmappába nem menthető: ott nem lenne független másolat.

Visszaállítás:

1. Hozz létre egy új, üres mappát. Ha a visszaállított adatokkal mindkét gépen dolgozni fogsz,
   a Google Drive „Saját meghajtó” részén legyen.
2. Bontsd ki bele a ZIP-et (Windowson jobb kattintás → **Összes kibontása**, Macen dupla kattintás,
   majd a kibontott tartalmat másold a mappába).
3. Az alkalmazásban: Beállítások → **Adattárolás** → **Mappa váltása**, vagy ha az alkalmazás
   induláskor nem éri el a régi mappát, **Másik mappa kiválasztása**. Válaszd ki a kibontott mappát.
4. Az alkalmazás felismeri az adatmappát, és megnyitja.
