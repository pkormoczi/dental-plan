## Design rules

Ez a rész a felület és a nyomtatvány kinézetére vonatkozik. Kötelező,
nem javaslat. Ha valami ütközik vele, kérdezz, ne rögtönözz.

### Mi ez a termék

Belső klinikai eszköz egyetlen fogorvos napi használatára. Sűrű,
billentyűzet-központú, adattáblás munkafelület. NEM marketing oldal:
nincs hero, nincsenek szekciók, nincs scroll-animáció, nincs képanyag,
nincsenek dísz-illusztrációk.

### A két felület külön szabályrendszer

**1. Nyomtatvány (PrintPreview, PDF) — ezt a PÁCIENS látja.**
Kövesse a klinika weboldalának (drmandoki.hu) arculatát: ugyanaz a logó,
paletta és betűtípus. A páciens a weboldal után kapja kézhez ezt a papírt,
a kettő egy márkaélmény.

**2. App felület — ezt CSAK az orvos látja, naponta több órán át.**
Munkaeszköz. Semleges, hideg szürke skála (slate). A márka színe kizárólag
akcentusként jelenik meg: elsődleges gomb, kijelölt sor, fókusz gyűrű,
aktív fül. A felület háttere SOHA nem meleg krém, bézs vagy agyagbarna —
az fárasztó egy órákig nézett adattáblán.

### Márkatokenek (forrás: drmandoki.hu Elementor globals)

- primary:   #6EC1E4
- secondary: #54595F
- text:      #7A7A7A
- accent:    #61CE70
- betűtípus: Roboto
- Logó: az "átszínezett" (weboldalas) változat, NEM az eredeti navy.
  Nyomtatványra átlátszó hátterű PNG, 600 dpi-n raszterizálva.

Ezeket ne módosítsd, ne "hangold", ne generálj hozzájuk kiegészítő
palettát. Ha egy szín hiányzik valamihez, kérdezz.

### Komponensek

- Minden UI elem @radix-ui/themes komponensből jön. Ne írj kézzel gombot,
  inputot, selectet, dialógust, táblázatot. Ha hiányzik valami, kérdezz.
- Theme beállítás: radius="small", scaling="95%", grayColor="slate".
- Kivételek, amik kézzel írtak maradnak: a fogtérkép (funkcionális SVG
  adatvizualizáció) és a PrintPreview (A4 nyomtatvány).

### Szín, forma, sűrűség

- EGY akcentus az egész appban. Nincs második kiemelőszín.
- Státuszszín (piros, sárga, zöld) csak valódi állapotra: hiba,
  figyelmeztetés, sikeres mentés. Soha díszítésre.
- EGY radius rendszer mindenhol.
- EGY spacing skála: 4 / 8 / 12 / 16 / 24 px. Semmi közte.
- Nincs card doboz adat körül. A sorokat hajszálvonal választja el.
- Nincs árnyék, kivéve valódi elevációnál (dropdown, dialógus).
- Egy téma az egész appra. Sötét mód opcionális, de ha van, akkor
  mindenhol, és a kontrasztnak ott is teljesülnie kell.

### Tipográfia és számok

- Egy betűcsalád. Külön mono betű csak a technikai azonosítókra
  (terv azonosító, tétel id).
- Minden pénzérték és mennyiség jobbra igazítva, tabular-nums.
- Pénzösszeg soha nem tördelhető sortörésnél.
- HUF: egész szám, ezres szóközzel, "1 234 567 Ft".
- EUR: két tizedes, ezres pont, tizedes vessző, "1.234,56 €".
- Formázás fix függvényből pénznemenként, ne toLocaleString-gel ad hoc.

### Kötelező állapotok

Minden nézetnek van loading, empty és error állapota.
- Loading: skeleton a végleges elrendezés alakjában, ne pörgő spinner.
- Empty: mondja meg, mit tegyen a felhasználó, ne csak azt, hogy üres.
- Error: a hiba mellett jelenjen meg, mondja meg mi történt és mi a
  következő lépés. Nem toast, ha a hiba egy mezőhöz tartozik.

### Billentyűzet — ez az app fő versenyelőnye az Excellel szemben

- A teljes terv felvihető egérhasználat nélkül. Ha valahol elakad a
  Tab-sorrend, az hiba.
- Tételkereső: gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja
  a fókuszt. Ez a ciklus nem törhet el.
- Minden interaktív elemen látható fókusz gyűrű. Ne tüntesd el outline: none-nal.
- Escape zár dialógust és keresőt.

### Akadálymentesség (nem opcionális)

- Szövegkontraszt WCAG AA: 4.5:1 normál, 3:1 nagy szöveg (18px+).
- Gombfelirat kontrasztja a gomb hátterén is teljesüljön.
- Címke az input FÖLÖTT. Soha placeholder címke helyett.
- Hibaszöveg az input ALATT.
- prefers-reduced-motion tiszteletben tartva.

### Nyelv és szövegek

- Magyar UI szöveg.
- A gondolatjel (–) helyes magyar tipográfia, használható.
- A gombfelirat azt mondja, mi történik: "Terv mentése", nem "Küldés".
  Ugyanaz a művelet mindenhol ugyanazt a szót kapja.
- Nincs kitalált adat a felületen. Ha példa kell, jelöld példaként.

### Amihez ne nyúlj kérdés nélkül

- A PrintPreview elrendezése (külön specifikáció szabályozza).
- A terv.json és arlista.json sémák, mezőnevek, schemaVersion.
- Az útvonalak és a fájlrendszer mappastruktúrája.
- A tétel-azonosítók (soha nem használhatók újra).

### Amit soha ne csinálj ebben a projektben

- Ne alakítsd az árlistát vagy a tervtáblázatot carousellé, marquee-vé,
  scroll-snap pillekké vagy kártyaráccsá. Ez adattábla, listának kell
  maradnia.
- Ne tegyél animációt oda, ahol nincs visszajelzési funkciója.
- Ne generálj kép- vagy illusztrációs tartalmat.
- Ne vezess be második UI könyvtárat a Radix mellé.
- Ne írj kézzel SVG ikont. Ikon a @radix-ui/react-icons-ból jön.