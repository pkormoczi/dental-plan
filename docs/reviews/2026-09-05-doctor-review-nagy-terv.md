# Doctor-review — `nagy-terv` — 2026-09-05

```
Dátum: 2026-09-05
Forgatókönyv: nagy-terv — Németh Gábor négyszakaszos, 26 kezeléses teljes szanálásának felvitele, a végösszeg és a 2. szakasz külön összegének ellenőrzése
User-teszt készültség: javítás után mehet (0 blokkoló, 2 súlyos)
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 5, 8, 14 részben
Megállapítások lencsénként: István 11 / vizuális 3 / rontás 4 / a11y 0
Bizonyosság-eloszlás: megfigyelt 18 / erős következtetés 2 (a 16. mappanév-megjegyzése és a 17. forrása, másodlagos mezők) / feltételezés 1 (a 14. tényleges feltöltése, másodlagos mező)
Képernyőképek: docs/reviews/screens/2026-09-05-nagy-terv (52 persona-kép + r01–r04 reprodukciós kép, .gitignore-olt)
```

## 1. Napi munkamenet összefoglalója

István a Kezdőlapról az „+ Új kezelési terv" gombbal indult, a páciens-keresőbe beírta, hogy
„Németh", Entert nyomott, és azonnal Németh Gábor terv-adatlapján volt. Címet adott („Teljes
szanálás"), a „Tovább a terv szerkesztőhöz" gombnál felugró „Törzsadat létrehozása" ablakot nem
értette és kihagyta. A szerkesztőben a kereső → Enter → fogszám ritmust néhány sor után
megtanulta, felfedezte, hogy egy sorba több fogszám írható és a darabszám magától követi, az
„1. kezelés" fázisnevet átírta, három további fázist adott hozzá, és **mind a 26 kezelést
felvitte 16 sorban** (a persona nem mondta ki, hogy elég volt). Közben egy egyedi-tétel
zsákutcába futott („18 fogeltávolítás"), egy rossz tételt vett fel Enterrel (a „gyökértömés"
első találata a régi gyökértömés eltávolítása volt), amit törölt, és a sávos árú gyökértömésnél
kézzel írta be a 3 csatornás 65 000 Ft-ot, amitől az app „+71%" és „Felár: 81 000 Ft" jelzést
adott. Frissítette az oldalt, mert nem volt biztos a mentésben — semmi nem veszett el.

A végösszeget (1 346 000 Ft) fejben ellenőrizte és stimmelt; a 2. szakasz külön összegét
(290 000 Ft) a fázisdobozok összecsukásával találta meg, véletlenül. Az Előnézetet megnyitotta,
a négy oldalt végiglapozta, a böngésző Vissza gombjával megijesztette magát (hibaoldal a
dokumentum helyén), majd az app gombjával visszament a szerkesztőbe. **Nem véglegesített** —
a feladat nem kérte, és a „felár" meg a „Garancia kimarad" figyelmeztetés miatt előbb kollégát
kérdezne.

A napló záró bekezdése szó szerint:

> Magát a felvitelt igen — a kereső + Enter + fogszám-vessző ritmusát megtanultam, és a
> mentéstől már nem félek. Amiben elakadnék: (1) a sávos árak — nem tudom, hogyan kell
> „3 csatorna 65 000"-et úgy beírni, hogy ne „felár"-nak nézzen ki, és nem tudom, mi
> nyomtatódik; (2) minden Enter előtt el kell olvasnom a találatokat, mert az első gyakran nem a
> jó; (3) a „törzsadat" ablak és a „Garancia kimarad" figyelmeztetés — ezeket továbbra sem
> értem, és nem tudom, melyik állít meg és melyik csak szól; (4) a böngésző Vissza az
> előnézeten megijeszt. Ha a fejlesztő két mondatban elmondja a sávos árat és a „felár"
> jelentését, holnap egyedül is megcsinálom; ha nem, a véglegesítés előtt kollégát hívnék.

A fő ügynök a persona bejárása után véglegesítette a tervet (a rontás-próba részeként): a mentett
`_v1` négy fázist, 16 sort, 1 346 000 Ft végösszeget és a „Teljes szanálás" címet tartalmazza,
a három becsült sor `*`-gal, a „felár" a nyomtatványon nem szerepel — a dokumentum tartalma helyes.

## 2. Legfontosabb megállapítások

### 1. Az Enter mindig az első találatot veszi be, és az első találat háromból háromszor nem a keresett tétel volt

- Súlyosság: **Súlyos** (továbbjut, de rossz sorral — egy 20 000 Ft-os „Gyökértömés
  eltávolítása" a „gyökértömés" helyett egy szerződéses dokumentumon; István csak azért vette
  észre, mert a listaárat olvasta)
- Gyakoriság: **naponta többször**
- Lencse: István
- Érintett folyamat: 5, 6
- Bizonyosság: **megfigyelt** (`19-kereso-gyokertomes.png`, `20-rossz-gyokertomes-sor.png`,
  `31-kereso-neodent.png`, `33-kereso-implantatumfej.png`, `36-kereso-ideiglenes.png`; a fő
  ügynök reprodukálta: a „gyökértömés" listája ma is „Gyökértömés eltávolítása /csatorna" →
  „Gyökértömés csatornaszámtól függően" sorrendű. Kód: a tételkereső a névtalálatokat az árlista
  sorrendjében, rangsor nélkül listázza — `app/src/pages/planEditor/ItemPicker.tsx`
  `nevTalalat = available.filter(...)`; a `gyakori` jelölés a sorrendet nem befolyásolja)
- Dedup: **ÚJ** (rokon: `2026-09-05-doctor-review-elso-megnyitas.md`, 11. megállapítás — a
  „koron" keresésre a végleges koronák nem az első képernyőn vannak; ott a javasolt irány
  ugyanez, a jelenség itt háromszor, Enterrel bevitt rossz sorral ismétlődött)
- Helyzet és reprodukció: „gyökértömés" → első találat „Gyökértömés eltávolítása /csatorna
  20 000 Ft", Enter → a rossz sor bekerül. „neodent" → első az „All-on-X csomagok" alatti
  „Neodent implantátum csomagban", a sima „Neodent implantátum" a harmadik.
  „implantátumfej" → első „Straumann implantátumfej". „ideiglenes" → nyolc találat, az
  „Ideiglenes korona rendelői" csak görgetve.
- Orvosi elvárás: „Amit a leggyakrabban használok, az legyen elöl; vagy az Enter csak akkor
  vegyen be valamit, ha egyértelmű."
- Tapasztalt probléma: az első tíz sor után az Enter reflexszé vált (mindig az első volt a jó),
  a 11. sornál a reflex rossz tételt vitt be. Utána István minden találatot végigolvasott és
  egérrel kattintott — a billentyűzetes ciklus előnye elveszett.
- Napi hatás: minden sornál egy plusz olvasás, vagy egy rossz sor a páciens kezében.
- Jelenlegi kerülőút: egérrel kattintás, olvasás után; a rossz sor törlése (a „Sor törölve —
  Visszavonás" sáv ehhez jó).
- Javasolt javítási irány: rangsorolás a névtalálatokon belül — pontos szó-eleji egyezés
  („Gyökértömés…") előrébb, mint a szó közepén találó; `gyakori` tételek előre; csomag-kategóriák
  („All-on-X csomagok") hátrébb. Alternatíva: ha az első és a második találat különböző
  kategóriájú, az Enter ne válasszon automatikusan, csak a nyíl után.
- Siker mércéje: a „gyökértömés", „neodent", „implantátumfej", „ideiglenes" keresésekre a
  kiemelt első találat a listán szereplő tétel.
- Backlog: `kereso-talalat-rangsor`

### 2. Sávos tételnél az alsó ár kerül be kérdés nélkül, a sávon belüli 3 csatornás ár pedig „+71%" és „Felár: 81 000 Ft" jelzést kap

- Súlyosság: **Súlyos** (a felvitel megvan, de István a „felár" miatt nem mer véglegesíteni,
  és nem tudja, mi kerül a papírra — a kerülőutat, a kézi árbeírást, megtalálta, de a
  következményét nem érti)
- Gyakoriság: **naponta többször** (minden sávos tételnél: gyökértömés, fogbél megnyitás,
  minden „csatornaszámtól függő" ár)
- Lencse: István
- Érintett folyamat: 8, 14
- Bizonyosság: **megfigyelt** (`23-savos-gyokertomes-sor.png`: a sor 38 000-rel jön be,
  „≈" bekapcsolva; `24-gyokertomes-16-65000.png`: „átírt", „+71%"; `43-mind-a-negy-fazis-kesz.png`:
  „Felár: 81 000 Ft" a Mindösszesen alatt; `46-elonezet.png`: „Néhány sor ára eltér a mai
  árlistától — Kézzel felülírt ajánlati ár". Kód: a sávos tétel egységára a `min`
  (`app/src/domain/money.ts` — „SAVOS típusnál a `min` az egységár alapértéke"); az eltérés-jelvény
  a lista- és ajánlati ár puszta különbségéből számol (`app/src/domain/sorElteres.ts`), a sáv
  felső határát nem ismeri. A nyomtatványon a felár NEM jelenik meg, a `*` lábjegyzet igen —
  `app/src/pdf/TervDocument.tsx`.)
- Dedup: **ÚJ** (rokon, de más: `backlog/idea/savos-felso-hatar-nyomtatvanyon.md` a felső
  határ nyomtatásáról szól; itt a szerkesztőbeli beírás és a jelzés a gond)
- Helyzet és reprodukció: „gyökértömés" → „Gyökértömés csatornaszámtól függően
  38 000 Ft–65 000 Ft" kiválasztása → a sor 38 000-rel jön be, a csatornaszámot nem kérdezi.
  Az Ajánlati ár mezőbe 65000 → „+71%" jelvény a név mellett, „Felár: 27 000 Ft" (egy fognál),
  „Felár: 81 000 Ft" (három fognál) a Mindösszesen alatt, az előnézeten sárga figyelmeztetés.
- Orvosi elvárás: „A 3 csatornás ár az árlista saját sávjában van, ez nem felár. Kérdezze meg,
  hány csatorna, vagy legalább ne hívja felárnak."
- Tapasztalt probléma: „én nem felárat adtam, hanem a saját árlistám 3 csatornás árát" — a
  jelvény, a „Felár" sor és az előnézeti figyelmeztetés együtt bizalomrombolóak, és István nem
  tudta, rákerül-e a papírra (nem kerül, de ezt sehol nem mondja neki). A második sávos tételnél
  (fogbél megnyitás) inkább az alsó árat hagyta, hogy „ne legyen még egy felár" — azaz a jelzés
  már torzította az árazást.
- Napi hatás: minden sávos tételnél vagy alulárazott sor, vagy egy ijesztő jelzés, amit a
  páciens előtt a képernyőn lát; a véglegesítés kollégára vagy fejlesztőre várva csúszik.
- Jelenlegi kerülőút: kézi ár, a jelzés tudomásulvétele; vagy az alsó ár meghagyása.
- Javasolt javítási irány: (a) sávos tételnél a sávon BELÜLI ajánlati ár ne kapjon
  felár/kedvezmény jelvényt és ne számítson „eltérésnek" (a sor a sáv `min`/`max` pillanatképét
  is tárolja — ugyanaz a feltétel, mint a `savos-felso-hatar-nyomtatvanyon` ötletnél); (b) a
  „Felár" szó helyett „Eltérés a listaártól: +81 000 Ft"; (c) az előnézeti figyelmeztetés
  mondja ki, hogy a felár a nyomtatványra nem kerül; (d) hosszabb távon csatornaszám-választó
  a sávos tételen.
- Siker mércéje: 65 000 Ft beírása a 38 000–65 000 sávú tételen nem ad „+71%" jelvényt, nem
  ad „Felár" sort, és az előnézet nem sorolja „kézzel felülírt ár"-ként.
- Backlog: `savos-ar-savon-beluli-ertek`

### 3. A fogszámmal együtt gépelt keresés („18 fogeltávolítás") nulla találatot ad, és egyetlen kiútja az ár nélküli egyedi tétel

- Súlyosság: **Közepes** (lassít és a 0 Ft-os egyedi sor felé terel; István észrevette és
  18 Backspace-szel törölte a szöveget)
- Gyakoriság: **naponta többször** (a papírlisták „18 fogeltávolítás" formában vannak)
- Lencse: István
- Érintett folyamat: 5, 6, 7
- Bizonyosság: **megfigyelt** (`11-kereso-18-fogeltavolitas.png`; a fő ügynök reprodukálta:
  `r01-18-fogeltavolitas-nincs-talalat.png` — „Nincs találat." és narancssárgán kiemelt „Egyedi
  tétel felvétele: »18 fogeltávolítás«". Kód: `app/src/domain/search.ts` `nevEgyezik` a teljes
  keresőszöveget részsztringként keresi a névben, a számot nem választja le.)
- Dedup: **ÚJ** (rokon: `2026-09-05-doctor-review-elso-megnyitas.md`, 4. megállapítás — a
  csupa számból álló keresés „egyedi tételt" kínál; itt a szám + szó kombináció a gond)
- Helyzet és reprodukció: bármelyik fázis keresőjébe „18 fogeltávolítás" → nincs találat,
  csak az egyedi tétel; Enterre egy „18 fogeltávolítás" nevű, 0 Ft-os sor keletkezne (nem
  próbálta ki — erős következtetés).
- Orvosi elvárás: „Hagyja figyelmen kívül a számot, vagy tegye a számot a Fog mezőbe."
- Tapasztalt probléma: a kereső a listáról felolvasott természetes formát nem érti; a
  keresőben nincs látható törlő X, a szöveget karakterenként kellett törölni.
- Napi hatás: sietve egy Enter → ár nélküli egyedi sor a tervben.
- Jelenlegi kerülőút: a szám kitörlése, újrakeresés, fogszám a Fog mezőbe.
- Javasolt javítási irány: a keresőszöveg 1–2 jegyű, fogszám-alakú tokenjeit a
  keresésből kihagyni és a találat felvételekor a sor Fog mezőjébe írni („18 fogeltávolítás"
  → Fogeltávolítás, Fog: 18); vagy nulla találatnál egy sor: „Próbáld fogszám nélkül".
  Emellett egy törlő X a keresőben.
- Siker mércéje: „18 fogeltávolítás" keresésre a Fogeltávolítás tételek megjelennek.

### 4. A böngésző Vissza gombja az előnézeten a beágyazott PDF-nézegetőt lépteti vissza: a dokumentum helyén angol hibaoldal, az app az Előnézeten marad

- Súlyosság: **Közepes** (bizonytalanít, „elveszett a dokumentum" érzés; adat nem vész el,
  a „Vissza a szerkesztőbe" gomb működik)
- Gyakoriság: **hetente** (a persona-viselkedés szerint a böngésző Vissza reflex)
- Lencse: István
- Érintett folyamat: 14, 21
- Bizonyosság: **megfigyelt** (`51-bongeszo-vissza-utan.png`; a fő ügynök reprodukálta:
  `r03-bongeszo-vissza-elonezeten.png` — a `navigate_page back` 10 s-os időtúllépéssel tért
  vissza, az URL `#/elonezet` maradt, az iframe helyén a Chrome „szomorú fájl" ikonja és „It may
  have been moved, edited, or deleted.")
- Dedup: **ÚJ** (a `2026-09-05-doctor-review-elso-megnyitas.md` a böngésző Vissza gombját
  a sikerképernyőnél említi, az előnézeti iframe-viselkedést nem)
- Helyzet és reprodukció: Előnézet megnyitása, a PDF betöltődik, böngésző Vissza → a
  beágyazott nézegető egy korábbi, már felszabadított blob-URL-re lép, hibaoldalt mutat.
- Orvosi elvárás: „Vissza = a Kezelések lap."
- Tapasztalt probléma: angol hibaüzenet a szerződéses dokumentum helyén, a páciens előtt.
- Napi hatás: ijedtség, felesleges kattintások; a páciens előtt kínos.
- Jelenlegi kerülőút: „Vissza a szerkesztőbe" gomb (István megtalálta).
- Javasolt javítási irány: az iframe blob-URL-váltása ne kerüljön a böngésző előzményeibe
  (pl. `location.replace` az iframe-en belül, vagy a nézegető újra-mountolása `key`-jel
  `src` csere helyett); és/vagy a Vissza az app előző lépésére vigyen.
- Siker mércéje: az előnézetről a böngésző Vissza a Kezelések lapra visz, hibaoldal nélkül.

### 5. A „Törzsadat létrehozása" ablak a szerkesztőbe lépéskor felugrik, és István nem érti, mit kérdez

- Súlyosság: **Közepes** (blokkolja az utat, amíg a doki nem választ; aki nem érti, mindig
  kihagyja)
- Gyakoriság: **minden olyan páciensnél, akinek nincs önálló törzsadata**
- Lencse: István
- Érintett folyamat: 4, 10
- Bizonyosság: **megfigyelt** (`03-kereso-enter-utan.png` — a lap alján a „Páciens törzsadata"
  doboz szövege; `06-torzsadat-dialogus.png`)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-nemet-euro.md`, 1. megállapítás — ott
  az ismétlődő felugrás volt a fő gond; itt az első alkalom érthetetlensége)
- Helyzet és reprodukció: Németh Gábor kiválasztása → „Tovább a terv szerkesztőhöz" → a
  dialógus: „Ennek a páciensnek még nincs önálló törzsadata — a mezők egyelőre a terv adataiból
  látszanak. Létrehozod most, a lapon jelenleg látott adatokból?"
- Orvosi elvárás: „Vagy ne kérdezze itt, vagy mondja meg laikusul: a páciens adatai még csak
  ebben a tervben vannak, mentsem a kartonjára is? És mi történik, ha kihagyom."
- Tapasztalt probléma: az „önálló törzsadat" és „a terv adataiból" kifejezéseket nem érti;
  a kevésbé elkötelező „Kihagyás"-t nyomja.
- Napi hatás: egy plusz döntés minden új páciens tervénél, a funkció kihasználatlan.
- Jelenlegi kerülőút: „Kihagyás, tovább lépek".
- Javasolt javítási irány: laikus szöveg, a következmény kimondásával („Később is
  megteheted a páciens lapján"); vagy a kérdést a véglegesítéshez kötni, nem a lépésváltáshoz.
- Siker mércéje: a persona egy következő futásban kimondja, mit jelent a kérdés, mielőtt választ.

### 6. Az előnézeten a „Véglegesítés és mentés" gomb szürkén, magyarázat nélkül vár, amíg a nyomtatvány készül

- Súlyosság: **Közepes** (bizonytalanít: „valami hiba miatt nem enged"; pár másodperc után
  magától megoldódik)
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 14
- Bizonyosság: **megfigyelt** (`46-elonezet.png`: szürke gomb, alatta üres szürke doboz,
  nincs „Letöltés"; `47-elonezet-varakozas-utan.png`: kész. Kód: a gomb `disabled={busy ||
  !!pdfError || vanKemenyBlokk(csekklista)}`, a „PDF frissítése…" felirat csak a `pdfStale`
  ágon jelenik meg, az első rendereléskor nincs szöveg — `app/src/pages/PreviewPage.tsx`)
- Dedup: **ÚJ**
- Helyzet és reprodukció: Előnézet gomb → a nagy tervnél kb. 3–5 s-ig szürke gomb és üres
  doboz.
- Orvosi elvárás: „Írja ki, hogy készül."
- Tapasztalt probléma: nincs betöltés-jelzés; a szürke gomb és a sárga figyelmeztetések
  együtt azt sugallják, hogy a figyelmeztetések tiltják a véglegesítést.
- Napi hatás: felesleges kattintgatás, gyanú.
- Jelenlegi kerülőút: várni.
- Javasolt javítási irány: „Nyomtatvány készül…" felirat a szürke gomb mellett és az üres
  dobozban, ugyanúgy, ahogy a frissítéskor már van „PDF frissítése…".
- Siker mércéje: az első megnyitáskor a szürke gomb mellett látszik, miért szürke.

### 7. A fázisok összecsukott áttekintése (n tétel · összeg) a legjobb válasz a „mennyi a 2. szakasz külön" kérdésre, de csak véletlenül található meg, és a szerkesztőbe visszatérve minden fázis újra kinyílik

- Súlyosság: **Közepes** (lassít a forgatókönyv fő kérdésénél; a „Fázis összesen" sor a nyitott
  fázis alján is ott van, de négy hosszú fázisnál sok görgetéssel)
- Gyakoriság: **minden nagy tervnél**
- Lencse: István
- Érintett folyamat: 5, 14
- Bizonyosság: **megfigyelt** (`44-elso-fazis-osszecsukva.png`, `45-negy-fazis-osszecsukva.png`,
  `52-vissza-a-szerkesztobe.png`. Kód: a csukott állapot `useState<Set<number>>` a
  `PlanEditorPage`-ben, navigációnál elvész)
- Dedup: **ÚJ**
- Helyzet és reprodukció: a fázisfejléc nyilára kattintva a doboz összecsukódik, a fejlécben
  „3 tétel · 290 000 Ft" jelenik meg; Előnézet → Vissza a szerkesztőbe → mind a négy nyitva.
- Orvosi elvárás: „Egy állandó összegző, ahol a négy szakasz összege egymás alatt látszik,
  görgetés nélkül; és ha összecsuktam, maradjon úgy."
- Tapasztalt probléma: a nyíl felirat nélküli, az összegzés csak a csukott fejlécben van; a
  „3 tétel" a soraimat számolja, nem a 7 beavatkozást (a persona 26 kezelést 16 sorba tömörített).
- Napi hatás: a páciens előtti „mennyi a második szakasz" kérdésre görgetés vagy négy
  kattintás.
- Jelenlegi kerülőút: mind a négy fázis összecsukása.
- Javasolt javítási irány: a Mindösszesen blokkban fázisonkénti részösszeg-sor (négy sor, a
  fázisnévvel); a csukott állapot megőrzése a piszkozat élete alatt; a fejlécben „5 sor" a
  „5 tétel" helyett, vagy fogszámot is számolva „7 kezelés".
- Siker mércéje: a szerkesztő alján, görgetés nélkül látszik a 2. szakasz külön összege.

### 8. A „Garancia kimarad" figyelmeztetés nem mondja meg, mit tegyen, és nem derül ki, megállít-e

- Súlyosság: **Közepes** (István emiatt is kollégát kérdezne a véglegesítés előtt)
- Gyakoriság: **minden tervnél**, amíg a garancia-szöveg placeholder
- Lencse: István
- Érintett folyamat: 14
- Bizonyosság: **megfigyelt** (`46-elonezet.png`)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 10. megállapítás;
  `2026-08-25-doctor-review-uj-terv.md`, 6. megállapítás); a szöveg hiánya **MÁR TERVEZETT**
  (`backlog/idea/arlista-nap.md`)
- Helyzet és reprodukció: az előnézet első sárga doboza: „A szakasz szövege hiányzik, vagy
  még jogi lektorálásra vár — a címével együtt kimarad a nyomtatványból. Kimaradó szakaszok:
  Garancia", gomb: „Nyomtatvány szövegei".
- Tapasztalt probléma: „nem én írom a garanciaszöveget; nem tudom, ez megállít-e vagy csak
  szól; a gombot nem mertem megnyomni."
- Javasolt javítási irány: mint a korábbi jelentésben — a doki felől fogalmazva, a
  „csak szól / megállít" különbség kimondva (a sárga = csak szól, piros = megállít színkód
  ma nincs megnevezve).

### 9. A fázis alapneve „1. kezelés", miközben a gombok „Fázis"-t mondanak; a név átírhatósága nem látszik, az Enter nem csinál semmit; a sorok sorrendje nem mozgatható

- Súlyosság: **Kis**
- Gyakoriság: **minden többfázisú tervnél**
- Lencse: István
- Érintett folyamat: 5, 9
- Bizonyosság: **megfigyelt** (`07-kezelesek-lap.png`, `17-fazis-atnevezve-enter.png`;
  a sor-mozgatás hiánya kód-szinten is: `PlanEditorPage.tsx`-ben csak `movePhase` van,
  sor-mozgató nincs)
- Dedup: **ÚJ** (a `2026-08-25-doctor-review-uj-terv.md` 8. validációs kérdése a fázis-
  sorrendre kérdez; a sor-sorrend és a névmező új)
- Pontosítás: a fázisnév mező keretes beviteli mező (látszik a képen), a persona
  „próbából" jött rá — ceruza-ikon vagy „átnevezés" felirat nincs. Az Enter a mezőben
  szándékosan nem lép tovább (a név azonnal mentődik) — visszajelzés nélkül ez „nem történt
  semmi"-nek tűnik.
- Tapasztalt probléma: „1. kezelés" mint fázisnév furcsa („szakasznak hívnám"); a listán a
  fogbél-megnyitás a gyökértömés előtt van, a tervben a végére került, és nem talált sor-mozgatót.
- Javasolt javítási irány: alapnév „1. szakasz" vagy „1. fázis" (egyeztetve a gombokkal);
  a mezőben placeholder-szerű halvány „Fázis neve — kattints az átíráshoz"; Enter a mezőben
  ugorjon a fázis keresőjébe; sor fel/le nyilak a fázisokéhoz hasonlóan.

### 10. „Piszkozat mentve HH:MM" — nem derül ki, hogy ez automatikus és folyamatos

- Súlyosság: **Kis** (István frissítette az oldalt, hogy megbizonyosodjon; utána már bízott benne)
- Gyakoriság: **minden tervnél az első napokban**
- Lencse: István
- Érintett folyamat: 21
- Bizonyosság: **megfigyelt** (`09-panorama-enter-utan.png`, `29-frissites-utan.png`,
  `30-ujratoltes-utan.png`)
- Dedup: **ÚJ** mint szövegezés (a `2026-09-05-doctor-review-elso-megnyitas.md` „Ami jól
  működik" szakasza az automatikus mentést pozitívumként említi)
- Javasolt javítási irány: „Automatikusan mentve 19:51" — egyetlen szó.

### 11. Feliratlan ikonok a soron: fogtérkép-célkereszt, „≈" becsült ár, Db nyilak; a Fog és Db mező egymáshoz közel

- Súlyosság: **Kis**
- Gyakoriság: **minden sornál**
- Lencse: István
- Érintett folyamat: 8
- Bizonyosság: **megfigyelt** (`14-fog-18-tab-utan.png`, `35-cirkon-becsult-gomb.png`,
  `40-fogszam-db-mezobe.png`)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 12. megállapítás —
  a fogtérkép-célkereszt és a „≈"); a Fog/Db közelség **ÚJ**
- Tapasztalt probléma: a Tab a Fog mező után a célkeresztre ugrik, István nem tudta, mi az;
  a „kb." jelölést a gyökértömésnél véletlenül vette észre (magától bekapcsolva), a cirkonnál
  próbából nyomta meg; „11, 21"-et a Db mezőbe gépelte — az app „Érvénytelen érték — az előző
  maradt" üzenettel visszautasította (ez jól működött).
- Javasolt javítási irány: mint korábban — rövid felirat vagy szélesebb közök; a „≈"
  mellett „becsült" szó a sávos soron, ahol magától bekapcsol.

### 12. Levágott szövegek a sor- és fázisnév-mezőkben, és a jelvényes sor eltérő elrendezése

- Súlyosság: **Kis**
- Gyakoriság: **minden tervnél**
- Lencse: vizuális
- Érintett folyamat: 5, 8
- Bizonyosság: **megfigyelt** (`16-bolcsesseg-38-48.png`: „Bölcsességfog műtéti eljárással
  (seb." és „Komplett kezelés: ultrahang, sófúvás" a Beavatkozás mezőben levágva;
  `45-negy-fazis-osszecsukva.png` és `r01-18-fogeltavolitas-nincs-talalat.png`: „2. szakasz —
  gyökérkeze", „4. szakasz — koronák, tö" a fázisnév-mezőben levágva; `24-gyokertomes-16-65000.png`,
  `44-elso-fazis-osszecsukva.png`: az „átírt" + „+71%" jelvényes soron a névmező keskenyebb, a
  „+ leírás" a mező alá tördelődik, a sor magasabb a többinél)
- Dedup: **ÚJ**
- Tapasztalt probléma: a hosszú tételnév a mezőben csak görgetve olvasható; az összecsukott
  áttekintésben a fázisnevek csonkák, pont ott, ahol az áttekintés lenne a cél.
- Javasolt javítási irány: a fázisnév-mező szélessége kövesse a tartalmat (vagy legyen a
  fejléc teljes szélessége); csukott fejlécben a név statikus szövegként, nem mezőben; a
  jelvények a névmező alá vagy fölé, ne a mező rovására.

### 13. „9000 Ft" tagolás nélkül a „24 000 Ft" mellett

- Súlyosság: **Kis**
- Gyakoriság: **minden 10 000 alatti tételnél**
- Lencse: vizuális
- Érintett folyamat: 8
- Bizonyosság: **megfigyelt** (`09-panorama-enter-utan.png`, `43-mind-a-negy-fazis-kesz.png`)
- Dedup: **ÚJ**
- Pontosítás: ez a `hu-HU` locale szabálya (négyjegyű számot nem tagol — `toLocaleString('hu-HU')`,
  `app/src/domain/money.ts`), a nyomtatványon is így van; nem hiba, de a képernyőn
  egymás alatt következetlennek látszik. Istvántól megkérdezendő, zavarja-e a papíron.

### 14. A Chrome PDF-nézegető saját fejléce: UUID címként, „Save to Google Drive" gomb a szerződéses dokumentum fölött

- Súlyosság: **Közepes** (a „Save to Google Drive" egy kattintással páciensadatot küldene
  külső szolgáltatásba — nem az app teszi, de a képernyőn az app részének látszik)
- Gyakoriság: **minden előnézetnél**
- Lencse: vizuális
- Érintett folyamat: 14
- Bizonyosság: **megfigyelt** a gomb jelenléte (`47-elonezet-varakozas-utan.png`,
  `r02-elonezet-betoltes.png`, az a11y-fában „Save to Google Drive"); a tényleges feltöltés
  **feltételezés** (nem kattintottuk meg)
- Dedup: az UUID-cím **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 9.
  megállapítás); a Google Drive gomb **ÚJ**
- Tapasztalt probléma: István: „rendelőben ez zavaró és adatvédelmileg kérdéses, nem tudom,
  az app vagy a böngésző teszi oda."
- Javasolt javítási irány: ez a Chrome beépített nézegetője (a mockup-fázis korlátja);
  az Electron-fázisban saját nézegető vagy a Chromium PDF-viewer eszköztárának letiltása
  (`#toolbar=0`), addig a jelentésben rögzítve. A „Letöltés" gomb az app sajátja, az marad.

### 15. Két fülön nyitva ugyanaz a piszkozat: az utolsó író nyer, egyik fül sem szól

- Súlyosság: **Közepes**
- Gyakoriság: **ritka helyzet**
- Lencse: rontás
- Érintett folyamat: 21
- Bizonyosság: **megfigyelt** (második lapon a Konzultáció Db 1→2, „1 356 000 Ft"; az első
  lapon továbbra is 1 346 000 Ft és Db 1 látszott, ott a Panoráma Db 1→2 → a tárolóban a
  Konzultáció Db visszaállt 1-re; a második lap ezután is a saját 1 356 000 Ft-ját mutatta,
  figyelmeztetés nélkül)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 14. megállapítás)

### 16. Frissítés a véglegesítés kellős közepén: a mentés befejeződik, de a doki egy üres terv előnézetét kapja, piros hibákkal

- Súlyosság: **Kis** (adat nem veszett el: a `_v1` teljes és helyes; de nincs „elmentve"
  visszajelzés, helyette „A páciens neve kötelező" és „1 üres fázis" piros dobozok egy másik,
  üres piszkozatra)
- Gyakoriság: **ritka helyzet**
- Lencse: rontás
- Érintett folyamat: 14
- Bizonyosság: **megfigyelt** (`r04-frissites-veglegesites-kozben.png`; a tárolóban
  `Németh-Gábor_nemega/Korona és hídpótlások_pvc528/2026-09-05_v1/terv.json` + `pdf`,
  `statusz: VEGLEGES`, 4 fázis, 1 346 000 Ft, a piszkozat törölve)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 15. megállapítás)
- Megjegyzés (**erős következtetés**, kódból): a terv mappaneve „Korona és hídpótlások_pvc528"
  lett, pedig a doki „Teljes szanálás" címet adott — a mappanév a domináns kategóriából
  képződik (`app/src/storage/DemoStorage.ts` `buildPlanDirName(javasoltTervCim(...))`), a cím
  külön `terv-cimke.json`-ban él. A felületen ez most nem látszik (a DEMO Fájlok fülön igen),
  az Electron-fázis fájlböngészőjében viszont a doki a saját címét keresné.

### 17. Konzol: „Buffer is not defined" figyelmeztetés 14–19-szer az előnézet renderelése közben

- Súlyosság: **Kis** (a doki nem látja; a PDF elkészül)
- Gyakoriság: **minden előnézetnél**
- Lencse: rontás
- Bizonyosság: **megfigyelt** az előfordulás (persona konzol: `[warn] Buffer is not defined
  [19 times]`; fő ügynök: `[14 times]` az újratöltés után); a forrás **erős következtetés** —
  a böngészőben futó PDF-renderelő (`@react-pdf`) Node-`Buffer` hiányára fut, a keresett
  szöveg a csomagok `lib` mappáiban nem található, tehát futásidejű `typeof Buffer` ág
- Dedup: **ÚJ**
- Javasolt javítási irány: a figyelmeztetés forrásának azonosítása a devtools-ban (stack),
  és vagy egy `Buffer` polyfill a Vite configban, vagy annak igazolása, hogy ártalmatlan.

### 18. Konzol: „A form field element should have an id or name attribute" (2, ill. 32 mező)

- Súlyosság: **Kis**
- Lencse: rontás
- Bizonyosság: **megfigyelt**
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 16. megállapítás)
- Megjegyzés: a szerkesztőben 16 sornál a szám 32-re nő — soronként két mező (valószínűleg a
  Fog és az Ajánlati ár, vagy a Beavatkozás és a Fog) `name`/`id` nélkül.

### Rontás-próba, ami rendben volt

- **Gyors dupla kattintás a „Sor törlése" gombon:** egy sor törlődött, egy „Sor törölve —
  Visszavonás" sáv jelent meg; a második kattintás nem ért el semmit. Rendben. (A
  visszavonás ablaka 8 s — `PhaseSection.tsx` —, ezt a persona nem tesztelte; a fő ügynök
  automatizálási késleltetése miatt a sáv lejárt, a sort újra felvettük.)
- **Platform-felirat:** a forrásban nincs felhasználónak szánt `Ctrl`/`Cmd`/`⌘` felirat;
  egyedül az „Enterrel/szóközzel" szerepel a fogtérkép képernyőolvasó-címkéjében, ami
  platformfüggetlen. Rendben.

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- **Fázis-sorrend nyilak (↑ ↓) a fázis fejlécében** — megtalálta-e: **nem**; a naplóban nem
  említi, miközben azt írja, „a sorok sorrendjét sem tudom mozgatni". A nyilak feliratlanok,
  halványak. (Sor-mozgatás valóban nincs — 9. megállapítás.)
- **„Érintett fogak" panel a szerkesztő tetején és a fogtérkép-célkereszt a Fog mező
  mellett** — megtalálta-e: **nem** (a célkeresztet a Tab miatt észlelte, nem nyomta meg).
  A fogtérkép a fogszám-bevitel és az áttekintés fő segítsége lenne egy 26 kezeléses tervnél.
- **Fázisok összecsukása → fejlécben „n tétel · összeg"** — megtalálta-e: **igen**, a
  bejárás végén, egy próbából (1 próbálkozás), és ezzel válaszolta meg a 2. szakasz kérdését.
- **Fázisnév átírása** — megtalálta-e: **igen**, próbából (1 próbálkozás); nem látszott rajta.
- **Több fogszám egy sorban → Db automatikusan** — megtalálta-e: **igen**, a placeholder
  („pl. 16, 17, 26") alapján, a 3. sornál; ez lett a leghasznosabb felfedezése.
- **„≈" becsült ár kapcsoló** — megtalálta-e: **igen**, véletlenül (a sávos soron magától be
  volt kapcsolva), majd a cirkonnál tudatosan használta; a jelentését (`*` + lábjegyzet a
  nyomtatványon) nem tudta.
- **Az Ajánlati ár mező melletti „⟲ visszaállítás a listaárra"** — megtalálta-e: **nem**;
  a felár-jelzés megszüntetésére ez lett volna a kiút, de nem tudta, mit csinál.
- **A találati lista kategória-fejlécei** („Szájsebészet", „All-on-X csomagok") —
  megtalálta-e: látta, de nem használta a szűrésre; a csomag-kategória pont az első
  találatot adta rosszul.
- **A „Nyomtatvány szövegei" gomb a Garancia-figyelmeztetésen** — megtalálta-e: látta, nem
  merte megnyomni.

## 4. Ami jól működik

- **Enter a páciens-keresőben egyből a pácienshez visz** — nulla találati lista, nulla plusz
  kattintás („gyors volt").
- **A tétel-felvitel ciklusa**: gépel → Enter → a sor bekerül, a kereső ürül, a kurzor marad —
  16 sor felvitele után István „megtanulta a ritmust", és ezt nevezte a fő oknak, amiért
  holnap egyedül is menne.
- **Több fogszám egy sorban, Db és összeg automatikusan** — „Excelben ezt kézzel szoroztam".
- **Sor törlése megerősítés nélkül, Visszavonás-sávval** — „arányos, nem lassít"; dupla
  kattintásra is egyszer töröl.
- **Érvénytelen Db-érték visszautasítása üzenettel** („Érvénytelen érték — az előző maradt")
  — a rossz mezőbe gépelés nem rontott el semmit, és megértette.
- **Automatikus mentés**: F5 és böngésző-újratöltés után minden megmaradt, az átírt ár és a
  fázisnevek is.
- **A háromlépéses fejléc-csík** (Terv adatai → Kezelések → Előnézet) — „tudom, hol vagyok".
- **A Fog mező placeholderje „pl. 16, 17, 26"** — ebből értette meg a formátumot (a
  `2026-08-25-doctor-review-uj-terv.md` 4. megállapítása szerinti „pl." előtag bevált).
- **A végösszeg stimmelt** (238 + 290 + 405 + 413 = 1 346 ezer), és a mentett dokumentum
  tartalma is helyes: négy fázis, `*` a becsült sorokon, felár nem nyomtatódik.
- **Fázis hozzáadása után a kurzor az új fázis keresőjében.**

## 5. Nem javítandó, hanem Istvántól megkérdezendő

1. A napi munkádban mindig egy pácienstől indulsz, vagy előfordul, hogy a korábbi terveket
   keresed, páciens nélkül?
2. Sávos árnál (gyökértömés 38–65 ezer) hogyan írtad be eddig az Excelbe a konkrét árat —
   csatornaszám alapján te választottad, vagy a sávot írtad a papírra? Mutasd meg egy régi terven.
3. A papírlistádon hogyan áll egy kezelés: „18 fogeltávolítás" (szám elöl), „fogeltávolítás 18",
   vagy a fogszám külön oszlopban? (A 3. megállapítás iránya ettől függ.)
4. Az Excelben egy sorban írtad a „16, 26, 36 gyökértömés"-t, vagy három külön sorban? A
   nyomtatványon melyiket szeretnéd látni?
5. Mit írtál eddig a szakaszok fölé: „1. kezelés", „1. szakasz", „1. ülés", vagy a tartalmat
   („előkészítés")? Mutass egy régi tervet.
6. Melyik tíz kezelést viszed fel a leggyakrabban? (A kereső rangsorához és a „gyakori"
   jelöléshez.)
7. Amikor félbehagyott egy nagy tervet, mikor és hogyan tért vissza hozzá — ugyanazon a napon,
   vagy napokkal később?
8. Az Excelen kívül vezettél páciens-adatlapot (név, TAJ, telefon egy helyen)? Ha igen, hol —
   ez dönti el, mit jelent neked a „törzsadat".
9. A páciens előtt a képernyőt mutatod, vagy csak a kinyomtatott papírt? (A „Felár: 81 000 Ft"
   sor és a „+71%" jelvény láthatósága.)
10. Zavar-e, hogy a papíron „9000 Ft" áll tagolás nélkül a „24 000 Ft" mellett?

## 6. Nem ellenőrizhető

- **A PDF-nézegető belseje** (a 2. szakasz 290 000 Ft-ja és a Mindösszesen a dokumentumon):
  a képernyőképek (`48-elonezet-2-oldal.png`) a 3–4. szakaszt és a `*` lábjegyzetet mutatják, az
  Összesítés-blokk a képen levágva. A mentett `terv.json` tartalma (4 fázis, 1 346 000 Ft) és a
  `TervDocument.tsx` kódja alapján a dokumentum végösszege helyes — **erős következtetés**.
- **A „Letöltés" gomb tényleges lemezre írása** — izolált profil; a persona nem töltött le.
- **A „Save to Google Drive" gomb tényleges viselkedése** — nem kattintottuk meg; Chrome
  beépített nézegető, a mockup-fázis korlátja (14. megállapítás).
- **Valódi fájlrendszeres tárolás** — a mockup `DemoStorage`-t használ; a mappanév-
  megfigyelés (16. megállapítás) a `localStorage`-kulcsokból származik.
- **`prefers-reduced-motion`**, **Mac-billentyűk** — a futás Windows-Chrome-ban ment.
