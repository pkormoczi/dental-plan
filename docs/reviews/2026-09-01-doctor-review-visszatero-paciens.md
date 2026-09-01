# Doctor-review — `visszatero-paciens`

Dátum: 2026-09-01
Forgatókönyv: visszatero-paciens — Nagy Éva (visszatérő, véglegesített tervű páciens) korábbi tervének megkeresése, PDF letöltése, új verzió nyitása, majd másolás új tervbe
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 16 (korábbi terv megkeresése, megtekintése, PDF letöltése), 17 (új verzió), 18 (másolás új tervként)
Bizonyosság-eloszlás: megfigyelt 2 / erős következtetés 0 / feltételezés 0

## 1. Napi munkamenet összefoglalója

A persona a Pácienslistán ékezetfüggetlen kereséssel gyorsan megtalálta Nagy
Évát, és jól illeszkedő alapértelmezéssel egyenesen a „Kezelési tervek" fülre
került. A két terv-lánc közül a kétverziós „Tömések" láncot nyitotta meg,
ahol azonnal belefutott abba, hogy a seed-elt, korábban véglegesített
verziókhoz nincs letölthető/megtekinthető PDF — ezt egy másik páciensnél
(Kovács János) is reprodukálta, tehát rendszerszintű, nem Nagy Éva-specifikus
jelenség. Ezután sikeresen nyitott egy új verziót (v3) a legfrissebb
verzióra — ez a folyamat gördülékenyen, jó tájékoztatással és valódi,
letölthető PDF-fel zárult. A menet csúcspontja a „Másolás új tervbe"
kipróbálása volt: a persona a másolat Név mezőjébe egy MÁSIK, ténylegesen
létező páciens nevét („Kiss Márta") írta be, abban a feltételezésben, hogy
ezzel a másolatot arra a páciensre irányítja át. Ehelyett egy, a mentés
után is fellelhető, súlyos adatkeveredés jött létre: a mentett terv Nagy
Éva páciensmappájában, Nagy Éva `paciensId`-jával jött létre, „Kiss Márta"
névvel, de Nagy Éva valódi telefonszámával, e-mail címével, lakcímével és
TAJ-számával. Ezt a fő ügynök a böngésző `localStorage`-ának közvetlen
kiolvasásával firsthand megerősítette (lásd 1. megállapítás).

## 2. Legfontosabb megállapítások

### 1. „Másolás új tervbe" + egy másik, létező páciens nevének begépelése → páciens-identitás keveredés egy véglegesíthető dokumentumon

- **Súlyosság:** Kritikus (adatvédelmi/jogi kockázat — GDPR 9. cikk szerinti
  különleges adat, D2; téves páciens-azonosítású, aláírásra kész dokumentum)
- **Gyakoriság:** Ritka, de reális — bármikor előfordulhat, amikor a doki egy
  meglévő tervet sablonként szeretne felhasználni egy másik, akár már
  ismert páciensnél, vagy elgépeli/összekeveri két hasonló ügyfél nevét
- **Érintett folyamat:** 18 (másolás új tervként)
- **Bizonyosság:** megfigyelt (a persona reprodukálta a böngészőben, a fő
  ügynök a mentés utáni `localStorage`-tartalmat közvetlenül kiolvasva
  megerősítette)
- **Dedup:** ÚJ
- **Helyzet és reprodukció:** Nagy Éva véglegesített „Tömések" v3 tervén a
  verziósor `⋯` menüjéből „Másolás új tervbe"-t választva a persona a Terv
  adatai lapra került, ahol a Név mező már kitöltve állt „Nagy Éva"-val,
  minden más mező (telefon, e-mail, lakcím, TAJ) is Nagy Éva adataival. A
  Név mezőt „Kiss Márta"-ra írta át — egy a seedben ténylegesen létező,
  önálló páciensre. A „Páciens törzsadata" panel ekkor „1 mező eltér a
  páciens törzsadatától" jelzést adott, de a diff-dialógus KIZÁRÓLAG a Név
  mezőt hasonlította össze, „Törzsadat: Nagy Éva" vs „Terv adata: Kiss
  Márta" formában — vagyis nem a beírt névhez tartozó valódi Kiss Márta
  rekordjával vetett össze semmit, hanem a MÁSOLÁS FORRÁSÁVAL (Nagy Éva
  törzsadatával). A breadcrumb szövege „Kiss Márta"-ra váltott, de a link
  célja (`href`) a `piszkozatPatientDir`-ből épül
  (`app/src/components/TervWorkflowShell.tsx`), ami a másoláskor Nagy Éva
  mappájára állt be és onnantól nem követi a Név mező szerkesztését — a
  látott felirat és a tényleges navigációs cél emiatt szétvált. A tervet
  végigvitte az Előnézetig (a checklist csak egy INFO-szintű, nem blokkoló
  sort adott: „A páciens törzsadata 1 mezőben eltér a terv adataitól
  (Név)."), majd véglegesítette. A mentés után a fő ügynök közvetlenül
  ellenőrizte a `localStorage`-t: a terv ténylegesen
  `dp:paciensek/Nagy-Éva_n4e8w1/Tömések_766zwt/2026-09-01_v1/terv.json`
  alatt jött létre, tartalma `{"paciensId":"n4e8w1","paciens":{"nev":"Kiss
  Márta","szuletesiIdo":"1990-11-02","lakcim":"2100 Gödöllő, Petőfi Sándor
  utca 8.","telefon":"+36 20 555 1234","email":"nagy.eva@example.hu","taj":
  "234 567 891",...}}` — vagyis a `paciensId` és minden azonosító mező Nagy
  Éváé, kizárólag a megjelenített Név lett átírva „Kiss Márta"-ra. A
  valódi Kiss Márta páciensmappájában (`Kiss-Márta_kissma`) ez a terv
  EGYÁLTALÁN NEM jelenik meg — ott csak az eredeti „Szájsebészet" lánca
  látszik. Kódszinten ez a `domain/planCopy.ts` `planMasolatKent()`
  szándékos viselkedéséből következik: a `paciensId` a forrás tervből jön,
  és a `docs/03-funkcionalis-spec.md` § „Terv másolása új tervként" is
  explicit kimondja, hogy a „Másolás új tervbe" a `paciensId` VÁLTOZATLAN
  átvitelével a valódi A/B alku-változat eset — vagyis ez a funkció
  tervezetten UGYANAHHOZ a pácienshez készít alternatív ajánlatot, nem egy
  másik páciensnek szánt másolatot. A felület viszont ezt sehol nem mondja
  ki: a Név mező szabad szöveg, nincs kereső/autocomplete a meglévő
  páciensek felé, és a gomb felirata („Másolás új tervbe") könnyen
  érthető úgy is, hogy „másik páciensnek szánt másolat".
- **Orvosi elvárás:** Ha egy másik, létező páciens nevét írom be egy
  másolt tervbe, vagy a rendszer figyelmeztet, hogy ez nem egy létező
  páciensre irányít át (mert a funkció nem erre való), vagy — ha a
  szándék tényleg átirányítás — ténylegesen a helyes páciensrekordhoz
  köti a tervet, helyes törzsadat-összevetéssel.
- **Tapasztalt probléma:** Egyik sem történik: a mentett dokumentum egy
  harmadik, egyik érintett páciens nézetéből sem könnyen megtalálható
  helyen létezik, téves névvel párosított valódi személyes/egészségügyi
  azonosító adatokkal (telefon, e-mail, lakcím, TAJ-szám).
- **Napi hatás:** Ha ez éles használat közben, figyelmetlenségből
  történne meg (pl. a doki azt hiszi, sablonként másol egy tervet egy új
  páciensnek, és nem veszi észre, hogy a törzsadat-panel valójában a
  forrás pácienssel hasonlít össze), a kinyomtatott/kiadott dokumentum egy
  páciens nevét egy MÁSIK páciens telefonszámával, e-mail címével,
  lakcímével és TAJ-számával adná ki — ez GDPR 9. cikk szerinti
  adatszivárgás és orvosjogi kockázat, nem csak UX-kényelmetlenség.
- **Jelenlegi kerülőút:** A persona szerint a „Másolás új tervbe" gombot
  soha nem használná úgy, hogy csak átírja a nevet — helyette az „Új terv
  indítása" köztes páciens-választón (meglévő páciens keresése /
  quick-create) menne végig kézzel, vagy kétszer ellenőrizné telefonon.
- **Javasolt javítási irány:** (a) A „Másolás új tervbe" gomb feliratában
  vagy egy melléírt segédszövegben egyértelműsíteni, hogy ez UGYANAHHOZ a
  pácienshez készít alternatív ajánlatot, a `paciensId` nem változik; (b)
  ha a Név mezőt a doki egy, a törzsadatban is létező MÁSIK páciens
  nevére írja át, erre külön, hangsúlyos (nem INFO-szintű) figyelmeztetés
  jöjjön — hogy „ez a terv továbbra is X páciens rekordjához lesz mentve,
  nem Y-éhoz"; (c) fontolóra venni, hogy a törzsadat-diff dialógus a
  ténylegesen beírt névhez tartozó VALÓS páciensrekordot is felajánlja
  összevetésre, ha ilyen létezik, nem csak a forrás pillanatképét.
- **Siker mércéje:** A doki a „Másolás új tervbe" használatakor a mentés
  ELŐTT egyértelmű jelzést kap arról, melyik páciensrekordhoz fog a terv
  kötődni, és nem tud véletlenül egy másik létező páciens nevét viselő,
  de az eredeti páciens azonosító adataival mentett dokumentumot
  létrehozni anélkül, hogy erről explicit figyelmeztetést kapna.

### 2. Seed-elt, korábban véglegesített terveknél nincs mentett PDF — a hibaüzenet nem különbözteti meg a demó-korlátot egy valódi hibától

- **Súlyosság:** Közepes (nem adatvesztés, de demózás/bemutatás közben
  bizalomvesztést okozhat, és éles rendszerben félreérthető lenne)
- **Gyakoriság:** Gyakori — minden, a demó seedjéből származó,
  „korábban véglegesített" tervnél jelentkezik (Nagy Éva mindkét
  verziója, Kovács János terve is)
- **Érintett folyamat:** 16 (korábbi terv megtekintése, PDF letöltése)
- **Bizonyosság:** megfigyelt (a persona két különböző páciensnél
  reprodukálta; a forráskód/tesztek — `pages/demo/OsszesTervSection.
  test.tsx`, `pages/TervReszleteiPage.test.tsx` — megerősítik, hogy ez a
  demó-adat szándékos, dokumentált tulajdonsága: a seed csak
  `terv.json`-t tartalmaz, PDF-blobot nem)
- **Dedup:** ÚJ
- **Helyzet és reprodukció:** Nagy Éva „Tömések" láncának mindkét
  (seed-ből származó) verzióján a „Letöltés" gomb inaktív, és a „Mentett
  PDF" szekció alatt: „Ehhez a verzióhoz nincs mentett PDF." A
  „Megnyitás külön" gomb sem nyit új lapot ilyenkor, hanem ugyanezt a
  hibaszöveget jeleníti meg egy piros sávban az oldalon belül. Ugyanez
  Kovács János „Korona és hídpótlások" tervénél is megismétlődött.
- **Orvosi elvárás:** Egy már véglegesítettként jelölt, korábbi tervnél
  számítok arra, hogy a hozzá tartozó dokumentumot vissza tudom nézni
  vagy ki tudom adni a páciensnek.
- **Tapasztalt probléma:** A hibaüzenet semleges, technikai jellegű, nem
  mondja meg, hogy ez a DEMÓ-adat velejárója (mert a seed nem tartalmaz
  PDF-bájtokat), nem pedig egy tényleges, éles hiba. Egy dokinak, aki nem
  tudja, hogy demóban van, ez megijesztő lenne: „elveszett" egy korábban
  kiadott dokumentum.
- **Napi hatás:** Demó/bemutató közben minden seed-elt korábbi tervnél
  megjelenik ez a jelenség, ami rontja az első benyomást és felesleges
  magyarázkodást igényel; éles rendszerben (ahol minden véglegesített
  terv valódi PDF-fel jönne létre) ez a konkrét eset nem fordulna elő,
  de a hibaüzenet szövege önmagában nem különböztetné meg a két
  helyzetet, ha mégis előfordulna egy sérült/hiányzó fájl miatt.
- **Jelenlegi kerülőút:** Nincs — a persona egyszerűen tudomásul vette,
  hogy ezekhez a verziókhoz nem fér hozzá PDF-ben.
- **Javasolt javítási irány:** A mockup-fázisban maradva sem lenne nagy
  beavatkozás a seed-hez egy rövid, statikus disclaimer-szöveget fűzni
  („ez egy demó-adat, nincs hozzá mentett PDF"), vagy a hibaüzenetet
  kontextusfüggővé tenni (`DemoStorage` tudja, hogy a hiányzó PDF a
  seed-forrásból jön-e).
- **Siker mércéje:** A doki a hibaüzenetből egyértelműen tudja, hogy ez a
  mockup/demó korlátja, nem egy elveszett dokumentum jele.

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- A „Páciens törzsadata" eltérés-jelző (`TorzsadatSyncCard`, D48) valós,
  hasznos funkció, de a jelen menetben félrevezető információt adott,
  mert a mögötte álló összevetés mindig a `paciensId`-hoz (nem a
  megjelenített névhez) kötött törzsadatot nézi — ez a funkció léte és
  a mögötte lévő tényleges logika között van egy rejtett, a felületről
  nem felismerhető rés (lásd 1. megállapítás).
- A verziósor „Megnyitás külön" gombja PDF megléte esetén feltehetően
  külön lapot nyit (kódból: sikeres esetben más ágra fut, mint a hibaüzenet)
  — ezt a persona nem tudta kipróbálni, mert egyik vizsgált seed-verziónál
  sem volt PDF; a funkció maga emiatt gyakorlatilag felfedezhetetlen maradt
  ebben a menetben.

## 4. Fejlesztési lehetőségek

1. **Bizalom-növelés / adatvédelmi védőháló** — a „Másolás új tervbe"
   funkció és a Név mező szabad szerkesztése közötti félreérthetőség
   feloldása (lásd 1. megállapítás javasolt iránya). Ez az egyetlen olyan
   tétel ebben a jelentésben, ami közvetlen jogi/adatvédelmi kockázatot
   hordoz, ezért kiemelt prioritású.
2. **Gyors UX-javítás** — a seed/demó eredetű, PDF nélküli véglegesített
   verzióknál a hibaüzenet meséljen a demó-korlátról, ne technikai
   hibaként hasson.
3. **Bizalom-növelés** — a törzsadat-diff dialógus fejlécében/szövegében
   explicit jelezze, MELYIK páciensrekordhoz (`paciensId`) van kötve a
   most szerkesztett terv, függetlenül attól, mi áll a Név mezőben — ez
   önmagában sok félreértést megelőzne, a mögöttes logika módosítása
   nélkül is.
4. **További kutatást igénylő kérdés** — érdemes lenne megvizsgálni, hogy
   a „Másolás új tervbe" gomb felirata/elhelyezése (verziósoronkénti `⋯`
   menü) egyértelműen kommunikálja-e a dokik felé, hogy ez egy
   ugyanahhoz a pácienshez tartozó „A/B alku-változat", nem egy másik
   páciensnek szánt sablon-másolat — ez terminológiai kérdés, amit érdemes
   lehet valódi dokikkal (nem szimulált personával) leellenőrizni.

## 5. Ami jól működik

- A Pácienslista ékezetfüggetlen keresése gyors és pontos volt („nagy ev"
  → azonnal egyetlen találat, „1 találat a 23 páciensből" visszajelzéssel).
- A páciensoldal alapértelmezetten a „Kezelési tervek" fülre nyit —
  pontosan azt mutatja, amire egy visszatérő páciensnél elsőként szükség
  van.
- A korábbi, nem-legfrissebb verziónál (v1) nincs „Új verzió" gomb, csak a
  lánc legfrissebb verziójánál — ez logikusan védi az elágazó
  verziózástól, a persona ezt kifejezetten pozitívumként említette.
- Az „Új verzió" workflow zökkenőmentes: előretöltött tételek, jól időzített
  tájékoztató sáv a mai dátumbélyegről, „A törzsadat és a terv adatai
  megegyeznek" megnyugtató jelzés, érthető, nem blokkoló figyelmeztetések
  az Előnézeten, és sikeres véglegesítés után valódi, beágyazott PDF
  jelenik meg a Terv részletei oldalon.
- A sikeres véglegesítés utáni „A terv elmentve ✓" visszajelzés egyértelmű.

## 6. Következő validációs kérdések

1. Volt-e már olyan valós eset, hogy egy doki egy meglévő terv másolatát
   szándékosan egy MÁSIK, ténylegesen létező páciensnek szánta (nem csak
   A/B alku-változatnak ugyanannak a páciensnek)? Ha igen, hogyan oldotta
   meg jelenleg (papíron újragépelve, Excelből, vagy valahogy mégis ezzel
   a funkcióval)?
2. A „Másolás új tervbe" elnevezés a dokik fejében ténylegesen az „ugyanaz
   a páciens, alternatív ajánlat" fogalmat hívja-e elő, vagy inkább
   „bármilyen páciensnek szánt sablon-másolat"-ként értelmezik?
3. Éles (nem demó) használatban minden véglegesített tervhez ténylegesen
   mindig keletkezik mentett PDF, vagy elképzelhető olyan hibaágban egy
   valódi, sérült/hiányzó PDF-állapot, ami ugyanezt az „Ehhez a
   verzióhoz nincs mentett PDF" üzenetet adná?
4. Mekkora gyakorisággal fordulhat elő a rendelőben, hogy két különböző
   páciens neve véletlenül megegyezik vagy nagyon hasonló (ez a
   forgatókönyv csak a seed miatt szimulálta ezt Nagy Éva/Kiss Márta
   nevével — valós páciensadatoknál mennyire reális ez)?
5. A törzsadat-eltérés INFO-szintű, nem blokkoló jelzés véglegesítéskor —
   ez a doki tapasztalata szerint elegendő figyelemfelhívás, vagy inkább
   átsiklik rajta rutinból (ahogy ebben a menetben is történt)?

---

*Ez a jelentés átmeneti munkatermék. A valódi találatok a
`backlog/BACKLOG.md`-be vándorlása után törölhető.*
