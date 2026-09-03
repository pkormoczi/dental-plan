# Backlog 106. tétel — Mentés-visszajelzés az árlista tétel-soroknál — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 106. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

Az `app/src/pages/PriceListAdminPage.tsx` minden tétel-szerkesztést azonnal,
mezőnként a törzsadatba ír (`commit()` → `savePriceList`), de a művelet
kimenetéből kizárólag a **hiba** látszik: egy lap-szintű piros `Callout` a
táblázat fölött. Siker esetén semmi nem történik a képernyőn — a doki csak
közvetett jelekből következtethet (a fejléc „verzió …" dátuma a mai napra
vált). Az `app/src/pages/priceListAdmin/ItemEditor.tsx` teljesen
állapotmentes, kontrollált szerkesztő: egyetlen mentés-jelzést sem
rendereli, minden név-, leírás-, kategória-, csomag- és árírás némán
történik.

Ez a `docs/reviews/2026-08-26-doctor-review-admin.md` 5. megállapítása:
„bizonytalanság, ami két páciens közti gyors munkamenetben felesleges
visszaellenőrzésre vagy ismételt Mentés-kattintásra ösztönözhet". A
megállapítás Beállítások-fele azóta lezárult (mindhárom tab Mentés gombja
„Mentve ✓"-re vált), az árlista tétel-sorok fele maradt nyitva.

A hiány nem véletlen, hanem a mentési modell következménye: itt **nincs
Mentés gomb**, amire a meglévő „Mentve ✓" minta ráülhetne. A minta ma négy
helyen él (`pages/settings/RendeloTab.tsx`, `EgyebTab.tsx`,
`NyomtatvanyokTab.tsx`, `pages/priceListAdmin/KategoriaPanel.tsx`),
mindenhol ugyanúgy: egy lokális `saved` flag + 2000 ms-os `setTimeout`
cseréli a **gomb feliratát**. Az árlista tétel-soroknak ilyen gombja
nincs, és soha nem is lesz — a `docs/07-felulet-rendszer.md` § Komponensek
kimondja, hogy „a tétel-szerkesztés és a kategória létrehozása/törlése
ugyanazon a lapon VÁLTOZATLANUL autosave marad".

## Döntések

### 1. Egyetlen, sor-szintű jelzőhely: a táblasor

A visszajelzés a **tétel táblasorán** él, a sor jobb szélén — akkor is, ha
a szerkesztőpanel alatta épp nyitva van. Az `ItemEditor` nem kap új
fejlécet és nem kap saját jelzőt.

**Miért:** a szerkesztőpanel közvetlenül a táblasor ALATT nyílik, tehát a
sor a mezők fölött marad — egy jelzőhely mindkét állapotot (csukott sor,
nyitott szerkesztő) kiszolgálja. A lap fejléce ezzel szemben **nem
sticky**: egy „Kezelések és árak" cím melletti jelzés pont akkor csúszik ki
a képből, amikor egy lentebbi tételt szerkeszt a doki, vagyis a
visszajelzés a leggyakoribb esetben láthatatlan lenne.

Egyszerre **legfeljebb egy sor** jelez: az állapot az utoljára sikeresen
mentett tétel azonosítója. Ha a doki A tételről B tételre vált, A jelzése
azonnal átadja a helyét B-nek — nem marad több „Mentve ✓" a képernyőn
egyszerre.

A jelzésnek **nem szabad elmozdítania a sor többi tartalmát** a
megjelenésekor/eltűnésekor (a sor magassága és az ár-oszlopok pozíciója
maradjon állandó) — a hely mindig foglalt, csak a tartalma jelenik meg és
tűnik el.

Elvetett alternatíva — **két jelzőhely** (csukott sorban a soron, nyitott
állapotban egy új `ItemEditor`-fejlécben): két feltételes render-hely
ugyanarra az egy tényre, plusz egy új fejléc-elem egy amúgy is sűrű
panelben, miközben az előny (közelebb a mezőkhöz) elenyésző — a
szerkesztőpanel teteje ugyanúgy kigörgethető a képből, mint a sor.

Elvetett alternatíva — **mező-szintű jelzés** (minden mező alatt saját
„Mentve ✓"): a legpontosabb, de a legzajosabb; a panelben ma négy szöveges,
két–négy szám- és három egyéb vezérlő van, kilenc párhuzamos villogó
felirat helyett a tétel-szintű összegzés elegendő.

### 2. Tranziens „Mentve ✓", minden mentés újraindítja az órát

A felirat szövege szó szerint **„Mentve ✓"**, megjelenik a sikeres mentés
után, és kb. 2 másodperccel az utolsó mentés után eltűnik. Minden újabb
mentés újraindítja az órát.

**Miért:** a szöveg és az időzítés így pontosan a projekt már meglévő,
négy helyen élő mintája marad — a `docs/07-felulet-rendszer.md` § Nyelv és
szövegek szabálya („Ugyanaz a művelet mindenhol ugyanazt a szót kapja")
tiltja, hogy ugyanerre a tényre egy hatodik szóváltozat szülessen. A
„toast" irány eleve kizárt: a doktori review is rögzíti, hogy az app
szándékosan nem használ toastot.

Az óra-újraindítás közvetlen következménye, hogy a **szöveges mezők**
(`BufferedTextField`/`BufferedTextArea`, amik MINDEN leütésre mentenek)
gépelés közben végig egy **stabilan látszó** „Mentve ✓"-t adnak, nem
karakterenkénti villogást: a felirat az első leütésnél megjelenik, és az
utolsó után 2 másodperccel tűnik el. Ez a viselkedés őszinte is — a félig
begépelt név ténylegesen már a törzsadatban van.

Elvetett alternatíva — **debounce** (gépelés közben semmi, csak ~700 ms
csend után villan fel): új időzítési mechanizmust vezetne be, és pont a
leggyanakvóbb pillanatban (gépelés közben, amikor a doki azt kérdezi, „ez
most mentődik?") hallgatna.

Elvetett alternatíva — **csak a mező elhagyásakor jelezni** a szöveges
mezőknél: új `onBlur` propot követelne a `BufferedFields`-től, és azt
sugallná, hogy a mentés a blur pillanatában történik — pedig nem, minden
leütésre történik. A jelzés nem hazudhat a mentési modellről.

### 3. A jelzés csak a tényleges mentés feloldása után gyullad ki

A „Mentve ✓" kizárólag akkor jelenik meg, amikor a `savePriceList`
által visszaadott ígéret sikerrel feloldódott — soha nem az optimista,
memóriabeli állapotfrissítés pillanatában.

**Miért:** a `docs/01-attekintes-es-dontesek.md` D31 döntése szerint a
memóriabeli állapot a mentés ELŐTT, szinkron frissül, és sikertelen
mentésre **nem gördül vissza**. Egy az állapotfrissítéshez kötött jelzés
tehát pont abban az esetben mondaná azt, hogy „Mentve", amikor az írás
elhasalt — vagyis pontosan azt a bizalmat rombolná le, amiért a tétel
egyáltalán létezik. Ugyanez a szabály van már ma is tesztbe zárva a
Beállítások oldalon (a „Mentve ✓" nem jelenhet meg sikertelen mentésnél).

Ennek gyakorlati következménye, hogy a `PriceListAdminPage.tsx`
`patchItem`-jének a `commit()` által visszaadott ígéretet **fel kell
használnia** — ma eldobja. A `commit()` már ma is `Promise<boolean>`-t ad,
és minden írási útvonal rajta megy át, tehát nincs szükség új sikerpontra.

Gyors, egymást követő mentéseknél (gépelés) az utoljára feloldódott
mentés dönt — nincs szükség sorszámozásra vagy versenyhelyzet-kezelésre,
mert minden feloldás ugyanazt az egy állapotot állítja be ugyanarra az
értékre.

### 4. Hatókör: a közvetlen sor-szerkesztés, a dialógusos írások nem

A sor-jelzést kiváltja:

- a kinyitott `ItemEditor` MINDEN mezője (magyar/német megnevezés, magyar/
  német leírás, csomagtétel jelölő, kategória, ártípus váltó, HUF és EUR
  árak, „+ EUR ár hozzáadása", „EUR ár törlése"),
- a csukott sorban is elérhető két `IconButton` (gyakori csillag, aktív
  szem),
- a két megerősítő dialógusból induló írás (0 Ft-os tétel aktiválása,
  tétel deaktiválása) — ezek is ugyanarra az EGY sorra hatnak.

Nem váltja ki:

- a **Tömeges árváltoztatás**,
- az **Új tétel** dialógus,
- a **kategória létrehozása/törlése**, és a Kategóriák panel Mentés gombja.

**Miért:** a tétel a „mezőnkénti azonnali mentés némán történik" fájdalmat
orvosolja — egy dialógus mögül induló írásnak már ma is van saját,
egyértelmű lezárása. A Tömeges árváltoztatás akár száz sort érint: száz
egyszerre felvillanó felirat nem visszajelzés, hanem zaj, ráadásul a
dialógus előnézete már megmutatja, hány tétel változik. Az Új tétel
dialógus után a friss sor kinyílik és odagördül a lap — ez erősebb
visszajelzés, mint egy 2 másodperces felirat. A kategória-műveleteknek a
Kategóriák panel a helye, aminek a Mentés gombja már ma is „Mentve ✓"-t
mutat.

### 5. Hiba esetén a pozitív jelzés azonnal eltűnik

Ha egy írás hibára fut, a „Mentve ✓" azonnal eltűnik a sorról, és a
MEGLÉVŐ, lap-szintű piros `Callout` („A mentés nem sikerült: …") marad az
egyetlen jelzés. A tétel nem vezet be sor-szintű hibajelzést.

**Miért:** ez pontosan a Terv szerkesztő fejlécének már bevált mintája,
ahol a „Piszkozat mentve <idő>" sor kifejezetten elrejtőzik piszkozat-hiba
mellett, hogy a két jelzés ne mondjon ellent egymásnak. A jelen tétel a
SIKER visszajelzéséről szól; a hibakezelés bővítése (melyik sor írása
hasalt el) önálló kérdés, aminek a lap-szintű `Callout` szövegezését is
érintenie kellene.

Elvetett alternatíva — **sor-szintű „Nem mentve"** a hibás soron: többet
mondana (melyik írás veszett el), de kibővítené a tételt a hibakezelésre,
és két, egymással versengő hibajelzést hozna létre (sor + lap-szintű
`Callout`).

### 6. Halk szürke felirat, `aria-live="polite"` élő régióval

A jelzés apró, szürke szöveg (a Terv szerkesztő „Piszkozat mentve <idő>"
sorának vizuális hangsúlya), és **udvarias élő régióban** él, tehát a
képernyőolvasó is bemondja.

**Miért a szürke:** a `docs/07-felulet-rendszer.md` megengedné a zöld
státuszszínt sikeres mentésre, de az app ma a zöldet a véglegesítés
lezárásának (`PreviewPage` „A terv elmentve ✓" sikerképernyője) tartja
fenn — egy mezőnkénti autosave nem ugyanaz a súlyú esemény. A szürke
ráadásul nem versenyez a fölötte lévő piros hiba-`Callout`-tal, és
gépelés közben folyamatosan látva sem fárasztó.

**Miért az élő régió:** a projektben ma **egyetlen** `aria-live` van
(`pages/PaciensekPage.tsx` találat-számlálója), tehát erre nincs kialakult
szabály — ezért kell kimondani. Az `aria-live="polite"` nem szakítja félbe
a gépelést, csak sorba áll; és mivel a 2. döntés miatt a felirat szövege
gépelés közben végig változatlan „Mentve ✓", egy szerkesztési ülés alatt
egyszer szólal meg, nem karakterenként. A hangsúly-nélküli, tisztán
vizuális jelzés (`aria-hidden`) pont attól a felhasználótól tagadná meg a
visszajelzést, aki a legkevésbé tudja a közvetett jelekből (fejléc
verzió-dátuma) kikövetkeztetni.

### 7. A négyszer másolt „Mentve ✓" logika közös primitívbe kerül

A `saving` / `saved` / 2000 ms-os `setTimeout` hármas közös primitívbe
kerül, és a **négy meglévő hívási hely is rááll**
(`pages/settings/RendeloTab.tsx`, `EgyebTab.tsx`, `NyomtatvanyokTab.tsx`,
`pages/priceListAdmin/KategoriaPanel.tsx`), az árlista tétel-sorok pedig
ötödik hívóként használják.

**Miért:** a `CLAUDE.md` „Meglévő segédfüggvények — használd, ne írd újra"
elve ellen menne egy ötödik másolat. Ráadásul mind a négy meglévő példány
ugyanazt a hibát hordozza: a `setTimeout`-juk nem takarít unmountkor,
pedig a `pages/demo/AdatkezelesSection.tsx` már ma is mutatja a helyes
mintát (ref-ben tartott időzítő + cleanup effekt) — és épp ott, ahol egy
Radix tab-váltás az időzítőn belül unmountolhatja a komponenst, vagyis a
Beállítások három tabja pontosan ugyanennek a helyzetnek van kitéve. A
kockázat alacsony: a négy gomb **felirata nem változik**, tehát a
`SettingsPage.test.tsx` és a `PriceListAdminPage.test.tsx` meglévő,
`{ name: 'Mentve ✓' }` szerinti lekérdezései érintetlenül maradnak.

A primitívnek két, egymástól független fogyasztási módja lesz: a
gombfeliratos (négy meglévő hely, `Mentés` → `Mentés…` → `Mentve ✓`) és a
csupasz jelző (az új, sor-szintű hely). A sor-szintű helyen **nincs
„Mentés…" köztes állapot** — a demó `localStorage`-írása gyakorlatilag
azonnali, egy felvillanó „Mentés…" több zajt adna, mint információt; a
gombos helyeken a mai „Mentés…" viselkedés változatlan marad.

Elvetett alternatíva — **közös primitív, de csak az új hívóval**: szűkebb
diff, viszont a másolás és a hiányzó időzítő-takarítás ott maradna a négy
meglévő helyen, és létrejönne egy ötödik, önálló variáns.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A mentési modell megváltoztatása.** A tétel-szerkesztés autosave marad
  (`docs/07-felulet-rendszer.md` § Komponensek kimondja), a szöveges mezők
  továbbra is minden leütésre mentenek. Ez a tétel kizárólag a MEGLÉVŐ
  viselkedés láthatóvá tételéről szól.
- **Sor-szintű hibajelzés.** Lásd az 5. döntést — a lap-szintű piros
  `Callout` marad az egyetlen hibafelület.
- **A „verzió <dátum>" fejléc-jelzés.** A `arlistaVerzio` minden mentéskor
  a mai napra áll; ez a mai közvetett jel változatlanul megmarad, nem
  vonjuk össze az új jelzéssel és nem is töröljük.
- **A `NumberField` fókusz-viselkedése és az árak elgépelés-védelme.**
  A 96. és a 98. tétel ugyanezen a panelen dolgozik, de más kérdésre
  válaszol.
- **A táblasor két `IconButton`-jének `aria-label`-je.** A 99. tétel
  hatóköre — az új jelzés nem érinti a gombok szövegét.
- **Toast/snackbar mechanizmus bevezetése.** Kizárva; az app szándékosan
  nem használ ilyet.
- **A Tömeges árváltoztatás és az Új tétel dialógus saját
  visszajelzése.** Lásd a 4. döntést — ha ott is hiányt találunk, az
  önálló tétel.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PriceListAdminPage.tsx` — a `commit()` (104. sor körül)
  sikerága és a `patchItem()` (120. sor körül), ami ma eldobja a
  `commit()` által visszaadott ígéretet; a táblasor cellái (461. sor
  körül) a jelzés helyéhez; a meglévő `saveError` `Callout` (417. sor
  körül) az 5. döntés kölcsönös kizárásához.
- `app/src/pages/priceListAdmin/ItemEditor.tsx` — nem kap saját jelzőt
  (1. döntés), de az `onPatch` prop minden hívása a jelzés kiváltója.
- Új, megosztott primitív az `app/src/components/` alatt a
  `saving`/`saved`/időzítő hármashoz, unmount-takarítással.
- `app/src/pages/settings/RendeloTab.tsx`, `EgyebTab.tsx`,
  `NyomtatvanyokTab.tsx`, `app/src/pages/priceListAdmin/KategoriaPanel.tsx`
  — a négy meglévő hívási hely átállítása a primitívre, változatlan
  gombfeliratokkal.
- `app/src/pages/demo/AdatkezelesSection.tsx` — a helyes időzítő-takarítás
  mintája, forrásként.
- `app/src/pages/PriceListAdminPage.test.tsx`,
  `app/src/pages/SettingsPage.test.tsx` — a meglévő `{ name: 'Mentve ✓' }`
  lekérdezéseknek változatlanul kell működniük.

## Tesztelés (irányadó, nem kimerítő)

1. **Ármező.** Egy tétel kinyitva, a HUF ár átírva, Tab — a tétel során
   megjelenik a „Mentve ✓", és kb. 2 másodperc múlva eltűnik.
2. **Szöveges mező gépelés közben.** A magyar megnevezés mezőjébe
   folyamatosan gépelve a „Mentve ✓" végig stabilan látszik (nem villog),
   és csak a gépelés abbahagyása után ~2 másodperccel tűnik el.
3. **Csukott sor toggle-jei.** A csillagra kattintva (a sor kinyitása
   nélkül) ugyanaz a sor mutatja a „Mentve ✓"-t; ugyanígy a szem-ikonnal
   induló deaktiválás megerősítése után.
4. **Egyszerre egy sor.** Az A tétel szerkesztése után azonnal a B tételre
   váltva és ott is írva, csak B sora jelez — A jelzése eltűnik.
5. **Hiba.** Mesterségesen elhasaló mentésnél (pl. `localStorage`-kvóta) a
   sor NEM mutat „Mentve ✓"-t, és a lap-szintű piros `Callout` megjelenik.
   Egy már látszó „Mentve ✓" a hiba pillanatában eltűnik.
6. **Hatókör-kizárás.** A Tömeges árváltoztatás alkalmazása után egyetlen
   sor sem villan fel; az Új tétel dialógus mentése után sem — a friss sor
   a mai módon nyílik ki és gördül a képbe.
7. **Elrendezés.** A jelzés megjelenése/eltűnése nem tolja el a sor
   ár-oszlopait és nem változtatja a sor magasságát.
8. **Képernyőolvasó.** Egy szerkesztési ülés alatt a „Mentve" egyszer
   hangzik el, nem karakterenként, és nem szakítja félbe a gépelést.
9. **Regresszió a négy meglévő helyen.** A Beállítások három tabjának és a
   Kategóriák panelnek a Mentés gombja változatlanul `Mentés` → `Mentés…`
   → `Mentve ✓` sorrendben viselkedik, és sikertelen mentésnél továbbra
   sem mutat „Mentve ✓"-t.
10. `cd app && npm test && npm run build && npm run lint`.
