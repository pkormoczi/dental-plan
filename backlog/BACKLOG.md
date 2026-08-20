# Backlog

A `docs/01` sérthetetlen keretei (`D<szám>` formátumban) egyik tételt sem sértik —
ahol ez nem nyilvánvaló, a tétel maga jelzi, melyik döntéssel fut össze.

**Számozás:** a tételek sorszáma stabil azonosító, nem prioritás. Lezárt
tétel száma véglegesen nyugdíjazva, soha nem osztható ki újra — az új tételek a sorozatot onnan folytatják,
ahol a legutóbb kiosztott szám állt.

**Sorrend:** a listákon belül hasznosság szerint — a napi fájdalom
mérete × gyakorisága, holtversenynél a kisebb munka előre. 

---
## KIDOLGOZOTT

### 52. tétel — Dokumentumnyelv és pénznem kiválasztása / öröklése
  (a `backlog/redesign/` redesign-döntéssorozat DP-031 tétele) — a
  nyelv/pénznem-kártya ma az első véglegesítés után véglegesen
  zárolva marad ("Új verzió" drafton), a `nemetEngedelyezve`
  funkciókapcsoló elrejti a kártyát, és a pénzformátum (`formatMoney`)
  csak a pénznemtől függ, a nyelvtől nem (DE+HUF ma tévesen `1 234 567
  Ft`-ot ír, nem `1.234.567 Ft`-ot). Ez a tétel feloldja a zárolást a
  teljes piszkozat-életciklusra, teljesen eltávolítja a funkciókapcsolót,
  és `formatMoney`/`formatPrice`-t nyelvfüggővé teszi (utóbbi kettő
  explicit user-döntés, mert ellentmond a ma dokumentált D21-nek). Az
  öröklési szabály (D534) feloldja a 47. tétel VÁRAKOZÓ döntését. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-52-nyelv-penznem-terv.md`

### 53. tétel — Kezelőorvos kiválasztása és öröklési szabályai
  (a `backlog/redesign/` redesign-döntéssorozat DP-032 tétele) —
  `Settings.orvosok` ma sima névlista, aktív/inaktív jelölés és
  per-terv választó UI nélkül; az egyetlen írás `orvosok[0]`. Ez a
  tétel additív módon (séma-bővítés nélkül) bevezeti az aktív/inaktív
  és alapértelmezett-orvos fogalmát, egy választó UI-t a Terv adatai
  lépésen, és a hozzá tartozó öröklési szabályokat (új lánc: mindig
  default; új verzió: örökli, ha aktív; másolás: mindig default) —
  ezzel feloldja a 47./48./49. tétel VÁRAKOZÓ orvos-döntéseit, plusz
  egy új finalizációs hard blockot ad hiányzó/inaktív orvosra. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-53-kezeloorvos-terv.md`

### 59. tétel — Kezelés keresés, quick items és hozzáadás
  (a `backlog/redesign/` redesign-döntéssorozat DP-042 tétele) — a
  kereső/gyorsgombok/hozzáadás nagyrészt már megfelel a redesignnak.
  A D99/D100 (fókusz a Fog mezőre tételhozzáadás után) EXPLICIT
  ELVETVE, mert ütközik a `docs/07`/`CLAUDE.md` „a kereső-ciklus nem
  törhet el" kötelező szabályával — a user ezt megkérdezve a mai
  ciklus megtartása mellett döntött. D101 (új fázis kereső-autofókusza)
  változatlanul bekerül. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-59-kezeles-kereses-terv.md`

### 60. tétel — Kezeléssor szerkesztése
  (a `backlog/redesign/` redesign-döntéssorozat DP-043 tétele) — az
  egyedi név/ár-eltérés jelzés ma csak német terven működik (magyaron
  sosem), és sehol nincs reset a névre/árra/leírásra. Ez a tétel
  nyelvfüggetlenné teszi a markereket és reset-vezérlőket ad
  mindháromhoz; a becsült ár `≈` widget marad (docs/07 nevesített
  kivétele), csak pozíciót vált. A javaslat „sorrend/mozgatás" és
  „accordion" scope-bulletjei explicit kizárva (nincs döntés mögöttük,
  előbbi ellentmond D102-nek). A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-60-kezelessor-szerkesztes-terv.md`

### 61. tétel — Árlista-snapshot és explicit refresh
  (a `backlog/redesign/` redesign-döntéssorozat DP-044 tétele) — a
  soron ma nincs ár-követési komparátor és semmi nem diffel egy sort
  az aktuális árlistához. Ez a tétel egy `nevKoveti()` mintájú,
  derived ár-komparátort és mező-/sor-szintű explicit refresh UI-t
  vezet be, megerősítő előnézettel. Feloldja a 49. tétel 2./6.
  VÁRAKOZÓ döntését. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-61-arlista-snapshot-refresh-terv.md`

### 62. tétel — Többpénznemes listaár / ajánlati ár state
  (a `backlog/redesign/` redesign-döntéssorozat DP-045 tétele) — a
  `Sor` ma egyetlen implicit-pénznemű árpárt tart, a pénznemváltás
  DESTRUKTÍV (törli a sorokat), miközben az árlistai `Tetel.ar` már ma
  is mindkét pénznemet tartja. Ez a tétel additív „másik pénznem"
  stash-mezőt ad a sorhoz, nem-destruktívvá téve a váltást, séma-
  bővítés nélkül. A 63./64. tétel erre épül. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-62-tobbpenznemes-ar-terv.md`

### 63. tétel — Egyedi végösszeg
  (a `backlog/redesign/` redesign-döntéssorozat DP-046 tétele) — a
  „Kerek végösszeg" ma abszolút összeg (D25 szerint helyesen), de
  csak kedvezményre korlátozva, felár nélkül. Ez a tétel átnevezi
  „Egyedi végösszeg"-re, felár-irányt enged (önállóan eldöntve, mert a
  mai korlát hatókör-döntés volt, nem adatvédelem), és 0-összeg
  megerősítést + üres/autofókuszált bekapcsolást ad. A döntéseket lásd
  a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-63-egyedi-vegosszeg-terv.md`

### 64. tétel — Előleg és fennmaradó összeg
  (a `backlog/redesign/` redesign-döntéssorozat DP-047 tétele) — az
  Előleg ma SZÁZALÉK-alapú, tudatos drift-mentes indoklással; a
  redesign abszolút összeget kér, ami a mai automatikus 0-100%-os
  védelmet megszünteti. A user a redesign mellett döntött — ez a
  tétel a teljes deposit≤final validációs láncot nulláról építi fel.
  A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-64-eloleg-terv.md`

### 65. tétel — Manuális szövegek nyelvi review-ja
  (a `backlog/redesign/` redesign-döntéssorozat DP-048 tétele) —
  nyelvi review-metaadat (`authoredInLanguage`/`reviewedForLanguage`)
  sehol nem létezik; a meglévő `sorFallback` egy MÁSIK problémát old
  meg (árlistai fordítás-hiány, magyar terven nem is fut). Ez a tétel
  a doki saját, szabad szövegeinek nyelv-ellenőrzését építi ki,
  guided review-val, a meglévő mechanizmus mellett, nem helyette. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-65-nyelvi-review-terv.md`

### 66. tétel — Előnézet oldal layout és validation checklist
  (a `backlog/redesign/` redesign-döntéssorozat DP-050 tétele) — a mai
  Előnézet oldal egyoszlopos, a puha figyelmeztetések (0 Ft-os sorok,
  hiányzó leírás stb.) a Véglegesítés gomb megnyomásáig teljesen rejtve
  vannak, akkor szekvenciális "Folytatás" modalokkal bukkannak elő. Ez
  a tétel a PDF mellé egy állandó, read-only checklist panelt vezet be
  (D38/D39 szerint) — a modal-lánc user-döntéssel megszűnik, minden
  puha tétel előre látszik. A 67. tételre épül (a checklist a 67.
  tételben megszülető egységes modellt fogyasztja). A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-66-elonezet-checklist-terv.md`

### 67. tétel — Finalization validation engine
  (a `backlog/redesign/` redesign-döntéssorozat DP-051 tétele) — a mai
  véglegesítés-őr (`veglegesitesOr.ts`) ad hoc, egymástól eltérő alakú
  mezőket ad vissza; ez a tétel egységes, navigálható
  hard/soft/info-tétel listává alakítja, emeli a hiányzó/eltérő német
  tételnevet PUHÁRÓL KEMÉNY blokkra (D133, explicit user-döntés, a mai
  dokumentált spec-cel szemben), és új kemény blokkot ad a fogtérképen
  ténylegesen látszó, hiányzó német kategórianévre (D404). A döntéseket
  lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-67-veglegesitesi-validacio-terv.md`

### 68. tétel — PDF előnézet generálás és invalidálási életciklus
  (a `backlog/redesign/` redesign-döntéssorozat DP-052 tétele) — a
  D598–606 tételes ellenőrzése szerint a mai `usePDF()`-alapú előnézet
  többsége már megfelel a redesignnak (auto-generálás, stale-görgetés,
  historical PDF elkülönítve); az egyetlen valódi hiány egy explicit
  "Újrapróbálás" gomb PDF-render hiba esetén. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-68-pdf-elonezet-eletciklus-terv.md`

### 69. tétel — Atomikus véglegesítés (PDF+JSON)
  (a `backlog/redesign/` redesign-döntéssorozat DP-053 tétele) — kódban
  azonosított hiba: a `doFinalize()` egyetlen try blokkban futtatja a
  tartós mentést (`savePlan`/`loadPlan`) ÉS a piszkozat best-effort
  törlését (`markPlanSaved`) — egy sikeres mentés után hibázó törlés ma
  hamis "A mentés nem sikerült" üzenetet mutatna, D168/D169-et sértve.
  Ez a tétel a két hibazónát szétválasztja. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-69-atomikus-veglegesites-terv.md`

### 70. tétel — „Csak ajánlat" mód
  (a `backlog/redesign/` redesign-döntéssorozat DP-054 tétele) — a
  "Csak ajánlat" kapcsoló ma kizárólag `PreviewPage.tsx` helyi React
  state-je, nincs `Plan`-mezője — sem perzisztencia (navigáció
  visszaállítja), sem öröklés Új verziónál (D554), sem badge-adat a
  véglegesített verzióhoz (D558) nem lehetséges. Ez a tétel additív
  `Plan.csakAjanlat` mezőt vezet be, a meglévő draft-state/autosave
  útvonalba kötve. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-70-csak-ajanlat-terv.md`

### 71. tétel — Final terv részletei alapnézet és verziónavigáció
  (a `backlog/redesign/` redesign-döntéssorozat DP-060 tétele) — ma
  EGYÁLTALÁN NEM létezik strukturált, read-only "Terv részletei" nézet:
  a "Megnézés" akció a nyers, mentett PDF-blobot nyitja meg egy új
  lapon, nincs hozzá route, a verziósorok nem linkek. Ez a tétel új
  route-ot és oldal-héjat épít (header, historical páciens-snapshot
  diff, verziónavigáció, akciósáv) — a 72–75. tétel mind erre épül. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-71-terv-reszletei-alapnezet-terv.md`

### 72. tétel — Final fázis- és kezeléssor megjelenítés
  (a `backlog/redesign/` redesign-döntéssorozat DP-061 tétele) — a 71.
  tétel oldal-héjának "phases" layout-slotját tölti fel: read-only
  fázis-szekciók, stabil oszlopok, ajánlati/listaár másodlagos
  megjelenítés, leírás-kibontás, 4+ fázisnál ugró navigáció +
  scrollspy. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-72-final-fazis-sor-terv.md`

### 73. tétel — Final fogtérkép navigáció
  (a `backlog/redesign/` redesign-döntéssorozat DP-062 tétele,
  alacsonyabb prioritású, a 71./72. tételre épül) — a
  `DentalChart`/`toothChartSvg` interaktív infrastruktúrája nagyrészt
  MÁR MEGVAN (a plan-szintű `onToothClick` már ma is teljes
  billentyűzet-navigációt ad ingyen); az egyetlen hiányzó darab egy
  kis, célzott bővítés, hogy a perzisztens highlight-gyűrű `toolbar`
  (button) módban IS működjön több egyidejűleg kijelölt fogra, nem
  csak a soronkénti `listbox`-módban. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-73-final-fogterkep-terv.md`

### 74. tétel — Final pénzügyi összesítés
  (a `backlog/redesign/` redesign-döntéssorozat DP-063 tétele) — a
  forrásdokumentum D307–346 tartománya nagyrészt a 62–64. tételhez van
  rendelve, de a SOR-szintű kedvezmény/felár-jelvény (D308–311,
  D329–341) egyik meglévő tervben sem szerepel — ez a tétel új,
  megosztott classifiert épít rá (mellékesen a szerkesztő mai,
  csak-kedvezményre szűkített jelvényét is kiegészítve felárral), és a
  plan-szintű végösszeget közvetlenül `plan.osszesitok`-ból olvassa
  (D7), az eddig csak piszkozat-betöltéskor futó `osszesitokElter()`
  újrahasznosításával. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-74-final-penzugyi-osszesites-terv.md`

### 75. tétel — Mentett PDF viewer / külön megnyitás
  (a `backlog/redesign/` redesign-döntéssorozat DP-064 tétele) — a
  mentett final PDF a 71. tétel oldalán beágyazva jelenik meg (a mai
  "Megnézés"-ről ide áthuzalozott PDF-megnyitási logikával), object
  URL életciklus-kezeléssel; a "Megnyitás külön" és "Letöltés" a
  meglévő logika áthelyezésével/újrahasznosításával épül. A
  döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-75-mentett-pdf-viewer-terv.md`

### 76. tétel — PDF oldalváz: fejléc/lábléc/oldalszám
  (a `backlog/redesign/` redesign-döntéssorozat DP-070 tétele) — a mai
  `TervDocument.tsx` négy fix `<Page>`-je három folyó blokkra vált
  (kezelési rész / fizetési feltételek+garancia / nyilatkozat+aláírás),
  D420/D582 szerint — mindhárom szabadon túlfolyhat, a kompakt fejléc
  minden nem-első fizikai oldalon megjelenik (ma csak `<Page>`-kezdetnél
  jelent meg). A lábléc névhossz-alapú, dokumentum-szintű magasságot kap
  (D426–D428). A folytatólagos szakaszcím (D357/D363–D364/D415/D586)
  EXPLICIT ELVETVE — a react-pdf folyam-modellje ezt nem tudja kifejezni
  egy blokkon belüli fázis-/szakaszhatáron; helyette a natívan
  kifejezhető keep-together szabályok (`wrap`/`break`/`minPresenceAhead`)
  erősödnek a 78./81./82. tételben. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-76-pdf-oldalvaz-terv.md`

### 77. tétel — PDF első oldal: cím + páciensadatok + fogtérkép
  (a `backlog/redesign/` redesign-döntéssorozat DP-071 tétele) — a
  fogtérkép elhagyja a mai kéthasábos elrendezést (ahol az összegzés
  mellett állt) és a páciensadatok alá kerül, a fázisok elé (D387); a
  terv címe (az 51. tétel `terv-cimke.json`-jából, séma-változás nélkül,
  új propon át) megjelenik a page1 tartalomban (D386). A páciensblokk
  két fix szemantikus oszlopra vált (bal: Név/Született/TAJ/Lakcím, jobb:
  Telefon/E-mail), üres mező teljesen kimarad `—` helyett, rebalance
  nélkül (D431/D389/D432). A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-77-pdf-elso-oldal-terv.md`

### 78. tétel — PDF fázisok és kezeléstáblák
  (a `backlog/redesign/` redesign-döntéssorozat DP-072 tétele) — üres
  `Fog` mező `—`-t kap; a becsült-ár csillag a tételnév utánról az
  Egységár mellé költözik (D376, explicit átállás a mai
  `docs/04-nyomtatvany-spec.md` elhelyezéséről); a sávos lábjegyzet
  szövege D378 magjára rövidül, a mai, a származtatott összegekre (D15
  jogi védelme) kiterjesztett tartalommal megtartva. Új keep-together
  szabályok: `Fázis összesen`+`Megjegyzés` egyben marad (D414), a
  fáziscím+táblázatfejléc+első sor árva-védett (D361/D356); a tételsor
  alapja egyben marad, de a hozzá tartozó leírás — ha nagyon hosszú —
  törhet (D362 enyhítve). A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-78-pdf-fazisok-kezelestablak-terv.md`

### 79. tétel — PDF pénzügyi összesítés
  (a `backlog/redesign/` redesign-döntéssorozat DP-073 tétele) — az
  Összesítés blokk `Összesítés` címet kap (C6), a PDF-feliratok
  `Fizetendő`→`Végösszeg` és `Kezelések összesen`→`Kezelések összege`
  (D350/D351) — a KÉPERNYŐS átnevezés már a 74. tétel hatásköre, ez
  csak a `pdf/labels.ts`-t viszi, hogy a két felület ne csússzon szét.
  A számítási forrás marad `tervVegosszeg()` (nincs átállás a mentett
  `plan.osszesitok`-ra — a 74. tétel indoklása szerint ez a PDF-en
  biztonságos). Új: három vizuális szint az Előleg/Fennmaradó rész
  sorokhoz (D368–D369). A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-79-pdf-penzugyi-osszesites-terv.md`

### 80. tétel — PDF lokalizáció, dátum- és pénzformázás
  (a `backlog/redesign/` redesign-döntéssorozat DP-074 tétele) — a
  nyelvfüggő ezres tagolás (C4) már az 52. tétel hatásköre, ez csak a
  fennmaradó réseket zárja: `EUR` szöveges pénznemjel a `€` szimbólum
  helyett (D438, `domain/money.ts`-t is érinti, koordinálandó az 52.
  tétel implementációjával), a német TAJ-címke szó szerint `TAJ` marad
  `TAJ-Nr.` helyett (D451), és egy új, kizárólag PDF-oldali lokalizáló
  réteg az alapértelmezett (sosem kézzel átírt) terv-cím és fázisnév
  német megjelenítéséhez (D454/D455) — a szerkesztő UI-ja (`javasoltTervCim`/
  `generaltFazisNev`) MAGA változatlanul magyar marad. A döntéseket lásd
  a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-80-pdf-lokalizacio-terv.md`

### 81. tétel — PDF fizetési feltételek és garancia
  (a `backlog/redesign/` redesign-döntéssorozat DP-075 tétele) — a
  `Plan.sablonVerzio` mező törlődik a sémából (C7/D595–D596): a mezőt
  ma semmi nem olvassa vissza történeti célra, a mentett final PDF a
  történeti forrás, nem egy JSON-ba pinnelt sablonazonosító. A
  vizsgálat során talált, a redesign-től független rés is itt záródik:
  a placeholder-ellenőrzés (`isPlaceholderTemplate`) ma csak a
  cross-language HU-visszaesésnél fut — egy magyar terven a még
  placeholder-jelölésű garancia-szöveg szó szerint rákerülne a PDF-re;
  az ellenőrzés kiterjed a terv saját nyelvére is, placeholder esetén a
  teljes szekció kimarad címmel együtt (D581). A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-81-pdf-fizetesi-garancia-terv.md`

### 82. tétel — PDF nyilatkozat és aláírásblokk
  (a `backlog/redesign/` redesign-döntéssorozat DP-076 tétele) — a
  `Plan.csakAjanlat` mezőre állás már a 70. tétel hatásköre, ez a
  MEGLÉVŐ `offerOnly` prop forrását cseréli React state-ről a mentett
  mezőre, a PDF-oldali logikát (`{!offerOnly && ...}`) változatlanul
  hagyva. Az aláírásblokk AS-IS elrendezése, a nyilatkozat folytatólagos
  „– folytatás" címe (D587, a react-pdf `subPageNumber`-ével — az
  EGYETLEN hely, ahol a 76. tétel elvetett folytatólagos-cím mechanizmusa
  mégis natívan megvalósul), és egy új árva-védelem az utolsó bekezdés és
  az aláírásblokk között (D584) kerül be. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-82-pdf-nyilatkozat-alairas-terv.md`

### 83. tétel — Kezeléslista/editor: aktiválási modell és deaktiválás megerősítése
  (a `backlog/redesign/` redesign-döntéssorozat DP-080 tétele) — a
  jelenlegi, `docs/03`-ban dokumentált azonnali-aktiválás (Új tétel
  dialógus után a tétel rögtön `aktiv: true`, 0 Ft-tal) helyett a
  redesign D127–D131 óvatosabb modelljére tér át: a tétel kezdetben
  inaktívként jön létre, és csak a HUF ár mező első commitja aktiválja
  (automatikusan, ha >0; explicit megerősítéssel, ha 0 marad) — az
  „még soha nem aktivált” állapot tranziens, nincs séma-bővítés. A
  deaktiválás (aktív→inaktív) mostantól megerősítést kér (D124), a
  reaktiválás marad azonnali. Új, puha D113 véglegesítés-figyelmeztetés
  a deaktivált tételre hivatkozó sorokhoz, a MÁR meglévő (67. tétel)
  egységes checklistbe kötve. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-83-kezeleslista-aktivalas-terv.md`

### 84. tétel — Kategóriakezelés: mentési modell és hiányzó német név jelzése
  (a `backlog/redesign/` redesign-döntéssorozat DP-081 tétele) — a
  kategória-attribútumszerkesztés (név, szín, sorrend) a ma
  dokumentált „az Árlista admin marad autosave” elvtől eltérve (D49)
  explicit Mentés/Mégse + dirty guardra vált (D52) — a kategória
  létrehozása/törlése marad azonnali. A panel bekapcsolódik a D46
  `NavGuardContext`-be. A lecsukott kategória-sor is kap egy „nincs DE
  név” jelvényt (D405), ugyanúgy mint a tétel-táblázat. A döntéseket
  lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-84-kategoriakezeles-terv.md`

### 85. tétel — Alapértelmezett dokumentum-pénznem
  (a `backlog/redesign/` redesign-döntéssorozat DP-084 tétele) — a
  nyelv-defaultnak már ma is van Settings-mezője és UI-ja (az 52.
  tétel oldja fel a `nemetEngedelyezve` gate-jét), de a pénznemnek
  nincs: a `blankPlan.ts` ma hardkódoltan mindig HUF-fal indít egy
  vadonatúj láncot. Ez a tétel egy új, konfigurálható
  `Settings.alapertelmezettPenznem` mezőt vezet be (alapérték HUF), az
  Egyéb tabon egy ChipGroup-pal a nyelv-default mellett. A döntéseket
  lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-85-penznem-default-terv.md`

### 86. tétel — Nyomtatványszöveg-sablonok felülírása + markdown-bővítés
  (a `backlog/redesign/` redesign-döntéssorozat DP-085 tétele) — a
  C7/D573 szerint a sablon-mentés a ma dokumentált, verziózó
  (`DemoStorage.saveTemplate()` minden mentésnél új `-vN.md` fájlt hoz
  létre) viselkedésről felülírásra vált: a mentés a jelenlegi
  legfrissebb fájlt írja felül, a történeti igazság innentől
  kizárólag a mentett PDF (C9). A markdown-alrendszer
  (`pdf/markdownLite.ts`) kiegészül félkövér (`**szöveg**`) inline
  rendereléssel és számozott listával (D588) — a kézi
  sortörés-megőrzés (D590/D591) explicit ELVETVE, marad a mai
  szoft-tördelés. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-86-sablon-felulirasa-markdown-terv.md`

### 87. tétel — Üres/whitespace sablon-validáció és hard-block navigáció
  (a `backlog/redesign/` redesign-döntéssorozat DP-086 tétele) — az
  `isPlaceholderTemplate()` ma csak a `[PLACEHOLDER`/`[PLATZHALTER`
  jelölőt ismeri fel, üres/csak-whitespace szöveget nem (C8 hiányzó
  fele) — egy törölt nyilatkozat-szöveg ma nem váltaná ki a D23 zárat.
  Ez a tétel kiegészíti a predikátumot, és a nyilatkozat hard-block
  Callout-ja valódi, kattintható linket kap a Beállítások →
  Nyomtatványok tabra. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-87-sablon-ures-placeholder-terv.md`

### 88. tétel — Tárolás tájékoztató szöveg a DEMO oldalon
  (a `backlog/redesign/` redesign-döntéssorozat DP-087 tétele,
  leszűkített hatókörrel) — a forrás eredeti scope-ja (valódi
  mappa-választás, hard startup gate) a `CLAUDE.md` „Két fázisú build”
  elve szerint a 2. fázis (`FileSystemStorage`) hatásköre; ez a tétel
  EHELYETT egy rövid, statikus tájékoztató szöveget vezet be a DEMO →
  Adatkezelés fülre, ami elmagyarázza a mockup `localStorage`-alapú
  tárolását és a végleges alkalmazás mappa-modelljét — nincs
  interaktív elem. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-88-tarolas-tajekoztato-terv.md`

---
## NEM FEJLESZTÉS

### 24. tétel: Árlista-nap: közös ülés a dokival (adattisztítás és hiányzó szövegek)

**Nem kódtétel — tisztán adattisztítás és információkérés a dokitól.**
Fél nap, egyetlen ülésen begyűjthető, nincs hozzá tervdokumentum:

- a `gyakori` csillagozás (ma mind a 118 tétel `false`)
- a két `SAVOS` tétel alsó-határának visszaigazolása
- a `docs/06-arlista-import.md` „Ismert szennyeződés" táblázatában maradt,
  valódi ár-/kategorizálási döntést igénylő tételek (pl. `t072`/`t073`
  azonos ára, `t078` „Sín" kategóriája)
- a `k04`/`k05`/`k06`/`k12` fogtérkép-színe (ma mind alap szürke,
  `docs/06-arlista-import.md`)
- a nyomtatvány garancia-szakaszának magyar szövege — kezeléstípusonkénti
  garanciaidők, kivételek; a `GARANCIA_HU_V1` seed egyelőre
  `[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]`, a doki a
  Beállítások → Nyomtatvány szövegei alatt adja meg (a német verzió eddig
  is placeholder maradt volna, most már azért is, mert nincs mit
  AI-fordítani, amíg a magyar forrás maga is helykitöltő)
- a tétel-leírás (docs/02-domain-modell.md § Tétel-leírás) `csomag`-jelöléseinek
  és leírás-szövegeinek begyűjtése (docs/06-arlista-import.md)

---

