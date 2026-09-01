# Orvosi felhasználó-szimuláció — jelentés

```
Dátum: 2026-08-26
Forgatókönyv: admin — elavult ár frissítése, kezelés inaktiválása, rendelői beállítás módosítása rendelés előtti fél órában
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 11 (hiányos/elavult/inaktív kezelés az admin oldaláról), 20 (árlista/rendelői beállítás módosítása)
Bizonyosség-eloszlás: megfigyelt 6 / erős következtetés 0 / feltételezés 0
```

## 1. Napi munkamenet összefoglalója

A doki mindhárom adminfeladatot (árfrissítés, tétel-inaktiválás, új orvos felvétele) sikeresen és a vártnál gyorsabban elvégezte — a kereső és az inline szerkesztés kényelmesnek bizonyult, nem kellett külön oldalakat nyitogatni. Két, egymástól független, de rokon jellegű bizonytalanság maradt a menet végén: az ár mezőknél semmilyen védőháló nincs véletlen elgépelés (extra nulla, összefűződő számjegyek) ellen, és sem az árlistánál, sem a Beállításoknál nincs explicit "sikeresen mentve" visszajelzés, csak közvetett jelek. Egy korábbi jelentésben (uj-terv) már dokumentált kereső-hiba (kategórianévre nem lehet rákeresni) itt függetlenül, egy másik kategórián (Fogkőeltávolítás) ismét előjött — ez megerősítő jel, nem véletlen egyszeri eset. A tényellenőrzés során egy, a persona által csak bizonytalanul jelzett gyanú (az inaktiválás-gomb címkéje) teljes mértékben megerősített, valós akadálymentességi hibának bizonyult.

## 2. Legfontosabb megállapítások

### 1. Az árlista-adminban nincs védelem a véletlenül elgépelt, irreálisan nagy ár ellen

- Súlyosság: **magas**
- Gyakoriság: **ritka, de reális** — egyetlen elgépelés (egy extra nulla) elég hozzá
- Érintett folyamat: 11, 20
- Bizonyosség: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: a doki tudatos próbaként a "Komplett kezelés..." tétel HUF árát "2800000"-re írta (100-szorosa az eredetinek), és Tab-bal kilépett a mezőből. A rendszer szó nélkül elfogadta — a sor azonnal "2 800 000 Ft"-ra váltott, semmilyen megerősítő dialógus vagy figyelmeztetés nélkül, miközben az EUR ár változatlanul, nyilvánvaló ellentmondásban maradt (77,00 €). Kód-szinten megerősítve: `app/src/pages/priceListAdmin/ItemEditor.tsx:93-103` `setFixPrice()` közvetlenül patchel, semmilyen felső korlátot vagy relatív-eltérés ellenőrzést nem végez; a mögötte lévő `components/NumberField.tsx` `min` propja csak alsó korlátot támogat, felsőt nem.
- Orvosi elvárás: egy szokatlanul nagy (pl. 50%+-os) ármódosításnál legalább egy puha megerősítést várnék, mielőtt a változás érvénybe lép.
- Tapasztalt probléma: egyetlen elgépelés csendben, azonnal élesedik, és csak akkor derülne ki, amikor egy páciens ajánlatában abszurd összeg jelenik meg.
- Napi hatás: alacsony gyakoriságú, de magas súlyosságú kockázat — pénzügyi hiba, ami órák/napok múlva derülne ki.
- Jelenlegi kerülőút: minden ármódosítás után vizuálisan újra át kell néznie a beírt számot, mielőtt továbblép — ez plusz, manuális ellenőrzési lépés.
- Javasolt javítási irány: egy puha figyelmeztetés (nem feltétlenül blokkoló), ha egy ár egy adott százaléknál (pl. 50%) nagyobb mértékben tér el az előző értéktől, vagy ha a HUF/EUR arány szokatlanul eltér a korábbi aránytól.
- Siker mércéje: egy szokatlanul nagy ármódosítás legalább egy visszaigazoló lépést igényel, mielőtt érvénybe lép.

### 2. Egy inaktivált tétel újra-aktiváló gombjának képernyőolvasó-címkéje nem tükrözi a tényleges állapotot

- Súlyosság: **közepes**
- Gyakoriság: **minden inaktivált tételnél** (állandó, nem eseti)
- Érintett folyamat: 11, 20
- Bizonyosség: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: a "Fogékszer (kristály, arany, fehérarany)" tétel inaktiválása után a persona az akadálymentességi (a11y) fában azt észlelte, hogy a sor melletti gomb neve továbbra is "Aktív" maradt, annak ellenére, hogy a sor vizuálisan elszürkült — de ő maga bizonytalan volt, hogy ez tényleges hiba-e, vagy a snapshot-eszköz korábbi állapotot mutatott. **Pontosítás (2. fázis):** teljes mértékben megerősítve, tárgyi tévedés nem volt. Élő visszaellenőrzéssel: az "Inaktív" szűrőre kattintva a tétel valóban ott jelenik meg (a `aktiv: false` állapot ténylegesen elmentődött és tartós), DE a mellette lévő gomb `aria-label`-je ekkor is szó szerint "Aktív" — kód-szinten megerősítve: `app/src/pages/PriceListAdminPage.tsx:538-556`, az `aria-label="Aktív"` egy statikus, változatlan string, ami SOHA nem függ `it.aktiv`-tól; kizárólag az ikon (`EyeOpenIcon`/`EyeClosedIcon`) és a sor `opacity` stílusa (1 vagy 0.5) jelzi az állapotot vizuálisan, sighted felhasználóknak.
- Orvosi elvárás: egy képernyőolvasót használó kolléga (vagy én magam, ha valaha arra szorulnék) a gomb nevéből tudja, mit csinál a kattintás — jelenleg "Aktív"-ot mond egy már inaktív tételnél is, ami félrevezető ("aktívvá teszem" helyett azt sugallja, "ez most aktív").
- Tapasztalt probléma: a gomb accessible name-je nem különbözteti meg a két állapotot.
- Napi hatás: sighted felhasználónál nincs napi hatás (a vizuális jelzés elég); képernyőolvasó-használónál viszont teljesen félrevezető információ.
- Jelenlegi kerülőút: nincs — a vizuális jelzésre kell hagyatkozni.
- Javasolt javítási irány: az `aria-label` legyen `it.aktiv ? 'Inaktiválás' : 'Aktiválás'` (vagy hasonló, az akció-alapú megfogalmazás), az ikon-váltás mintájára.
- Siker mércéje: a gomb accessible name-je egyértelműen jelzi, hogy a tétel épp aktív-e, és mit csinál a rákattintás.

### 3. A kategórianévre keresés nulla találatot ad — ismételten, egy másik kategórián is

- Súlyosság: **magas**
- Gyakoriság: **valószínűleg gyakori**
- Érintett folyamat: 11, 20
- Bizonyosség: **megfigyelt**
- Dedup: **MÁR JELZETT** (`2026-08-25-doctor-review-uj-terv.md`, 1. megállapítás — ott a szerkesztő tétel-keresőjén, itt függetlenül az Árlista admin keresőjén, más kategórián: "fogkő" a "Fogkőeltávolítás" kategórián)
- Helyzet és reprodukció: az Árlista adminban "fogkő"-re keresve nulla találat, "Nincs találat erre: 'fogkő'. Próbálj más névre keresni, vagy válts szűrőt." üzenettel — annak ellenére, hogy "Fogkőeltávolítás" a listában látható kategórianév. Csak az "ultrahang" szóra keresve találta meg a tételt ("Komplett kezelés: ultrahang, sófúvás...").
- Orvosi elvárás: a kategórianévre rákeresve legalább utalást kapjak, hol keressem tovább.
- Tapasztalt probléma: hamis nulla találat, a hibaüzenet nem ajánl kilépési utat (pl. a Kategóriák böngészését).
- Napi hatás: időveszteség — vagy feladja a keresést és görgetéssel keres, vagy véletlenül rájön a pontos tételnévre.
- Jelenlegi kerülőút: a Kategóriák panel böngészése, vagy a tétel pontos nevének kitalálása.
- Javasolt javítási irány: lásd az uj-terv jelentés 1. megállapítását — a kereső terjedjen ki a kategórianévre is, vagy a nulla találatos üzenet ajánlja fel a Kategóriák böngészését.
- Siker mércéje: egy kategórianévre keresve a doki vagy közvetlen találatot kap, vagy egyértelmű utalást a helyes tételnevekre.

### 4. Az ár mezők nem jelölik ki a teljes tartalmukat fókuszáláskor, ami véletlen számösszefűzéshez vezethet

- Súlyosság: **közepes**
- Gyakoriság: **gyakori** — minden ármódosításnál, ha a doki nem törli előbb kézzel a mezőt
- Érintett folyamat: 20
- Bizonyosség: **megfigyelt**
- Dedup: **ÚJ** (rokon, de nem azonos az `uj-terv` jelentés 3. megállapításával — az a commit-on-blur mechanizmus vezető-nulla tünetéről szólt, ez a fókuszáláskori kijelölés hiányáról)
- Helyzet és reprodukció: a HUF ár mezőbe kattintva, majd a régi érték törlése nélkül "28000"-et beírva a mező "2400028000"-et mutatott — a két szám egyszerűen összefűződött, nem cserélődött le. Kód-szinten megerősítve: sem a `components/NumberField.tsx`, sem a `priceListAdmin/BufferedFields.tsx` nem hív `select()`-et az `onFocus`-ban — a mező fókuszáláskor nem jelöli ki a teljes tartalmat.
- Orvosi elvárás: egy szám-mezőre kattintva, mint egy Excel-cellában, a teljes tartalom kijelölve várjon, hogy egyetlen gépeléssel felülírható legyen.
- Tapasztalt probléma: gyors javítás közben, ha valaki nem gondol a Ctrl+A-ra vagy a kézi törlésre, egy értelmetlenül nagy, hibás szám kerülhet be észrevétlenül.
- Napi hatás: közepes — ismétlődő, apró súrlódás, ami rossz esetben pontatlan árat eredményezhet (lásd 1. megállapítás, ha ehhez a felső-korlát hiánya is társul).
- Jelenlegi kerülőút: a mező tartalmának kézi kijelölése/törlése minden szerkesztés előtt.
- Javasolt javítási irány: a numerikus ármezők fókuszáláskor válasszák ki a teljes tartalmukat.
- Siker mércéje: egy ár mezőre kattintva és azonnal gépelve a régi érték felülíródik, nem összefűződik.

### 5. Sem az árlista-adminban, sem a Beállításokban nincs explicit "sikeresen mentve" visszajelzés

- Súlyosság: **alacsony-közepes**
- Gyakoriság: **minden mentésnél**
- Érintett folyamat: 20
- Bizonyosség: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: sem az árlista-tétel szerkesztésekor (mezőnkénti azonnali mentés), sem a Beállítások "Mentés" gombjának megnyomásakor nem jelenik meg semmilyen explicit visszaigazolás (toast, pipa, felirat) — csak közvetett jelek (a verzió-dátum a mai napra vált, a Mentés/Mégse gombok inaktívvá válnak). **Pontosítás:** ez nem egyedi hiba, hanem szándékos, dokumentált tervezői döntés (`docs/07-felulet-rendszer.md`: a hibák nem toastként jelennek meg, hanem a mező mellett) — az app egészében nincs toast-mechanizmus. A doki nyers tapasztalata ettől függetlenül valós marad: a közvetett jelekre kell hagyatkoznia.
- Orvosi elvárás: egy adminisztratív mentés után egyértelmű, egyértelmű visszajelzést várnék, hogy tényleg megtörtént.
- Tapasztalt probléma: bizonytalanság, ami két páciens közti gyors munkamenetben felesleges visszaellenőrzésre vagy ismételt Mentés-kattintásra ösztönözhet.
- Napi hatás: alacsony-közepes — inkább kognitív teher, mint tényleges adatvesztés, mivel a mentés ténylegesen megtörténik.
- Jelenlegi kerülőút: a közvetett jelek (dátum, gomb-állapot) figyelése.
- Javasolt javítási irány: nem feltétlenül toast (az app szándékosan nem használ ilyet) — egy rövid, a gomb helyén megjelenő "Mentve" felirat is elég lehetne, a meglévő minimalista stílushoz igazítva.
- Siker mércéje: egy mentés után a doki explicit, egyértelmű jelet kap, nem csak közvetett következtetésre hagyatkozik.

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- A tétel-inaktiválás sorban közvetlenül elérhető (szem-ikon), nem kell kinyitni a teljes szerkesztőpanelt hozzá — ezt a persona gyorsan felfedezte és hasznosnak találta.
- Apró tipográfiai megfigyelés: az inaktiválás megerősítő dialógusának szövegében szimpla dupla kötőjel ("--") szerepel gondolatjel helyett — funkcionálisan nem hibás, csak esztétikai apróság.

## 4. Fejlesztési lehetőségek

1. **Bizalom-növelés / pénzügyi kockázat csökkentése** — puha figyelmeztetés szokatlanul nagy ármódosításnál az árlista-adminban (1. megállapítás). Ez a legmagasabb súlyosságú, valódi pénzügyi kockázatot hordozó találat.
2. **Akadálymentesség** — az "Aktív" gomb `aria-label`-jének állapot-függővé tétele (2. megállapítás).
3. **Gyors UX-javítás** — a kereső kiterjesztése kategórianévre, vagy utalás nulla találatnál (3. megállapítás — immár másodszor felmerülő, megerősített találat).
4. **Gyors UX-javítás** — a numerikus ár mezők teljes tartalmának kijelölése fókuszáláskor (4. megállapítás).
5. **Bizalom-növelés** — rövid, a meglévő stílushoz igazodó mentés-visszajelzés az árlista-adminban és a Beállításokban (5. megállapítás).

## 5. Ami jól működik

- A tétel-inaktiválás megerősítő dialógusa arányos és informatív: elmagyarázza a következményt ("nem lesz választható a tervezőben"), és megnyugtat, hogy visszafordítható ("bármikor visszakapcsolható") — se nem ijesztget feleslegesen, se nem hagyja tájékozatlanul a dokit.
- Az inline szerkesztés (sorra kattintva kinyíló panel) és a keresés együtt gyors munkafolyamatot ad, amikor a doki tudja a tétel pontos nevét — nem kell külön oldalakat nyitogatni.
- A Beállítások "Nem mentett módosítás" jelzése egyértelműen mutatja a piszkozat-állapotot új orvos felvételekor, mielőtt a doki menteni.
- Az egyes tétel `id`-jének megjelenítése ("soha nem használjuk újra, a régi tervek erre hivatkoznak") megnyugtató kontextust ad: a doki tudja, hogy a módosítás nem érinti a már kiadott, régi terveket.

## 6. Következő validációs kérdések

1. Előfordult-e már, hogy egy árlistai tételnél véletlenül elgépelt egy nullát vagy számjegyet? Ha igen, mikor és hogyan vette észre?
2. Használ-e valaha képernyőolvasót vagy más akadálymentességi segédeszközt az alkalmazással, vagy tud-e olyan kollégáról, aki használna?
3. Mennyire zavarja, ha egy mentés után nem lát explicit visszaigazolást — figyeli-e tudatosan a gomb állapotát vagy a dátumot?
4. Mesélje el, legutóbb hogyan keresett rá egy kezelésre az árlista-adminban — a kategória neve vagy a konkrét tétel neve alapján indult-e el?
5. Milyen gyakran inaktivál kezelést az árlistában, és mi alapján dönt úgy, hogy inkább inaktiválja, mintsem törölje?
