# Backlog 110. tétel — Apró szövegezési csiszolások — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 110. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

Három, egymástól független szövegezési hiba, közös jellemzővel: mindegyik
a doki képernyőjén megjelenő szöveg, egyik sem érinti a domain-logikát, a
tárolt sémát vagy a nyomtatványt.

**(a) Az ár-frissítő gomb tooltipje visszavonhatatlan műveletet ígér.** A
`pages/planEditor/LineRow.tsx` Listaár cellájában álló `⟳` gomb tooltipje
ma azt mondja, „a kézzel megadott ajánlati ár törlődik" — mintha a
kattintás azonnal, visszavonhatatlanul végrehajtaná a cserét. A gomb
valójában csak jelez (`onRequestArFrissites`), és a `PlanEditorPage.tsx`
`AlertDialog`-ja nyílik meg, ami a régi → új listaárat, a tervre gyakorolt
összeghatást és — kizárólag akkor, ha a soron tényleg volt kézi ár — a
felülírás tényét is kiírja, Mégse/Frissítés gombpárral. A tooltip tehát
kétszeresen félrevezet: sürgetőbbnek mutatja a műveletet, mint amilyen, és
feltétel nélkül állít olyasmit, amit a dialógus feltételesen mond.

**(b) A Fog mező placeholdere valós fogszámoknak látszik.** Ugyanott a
Fog `TextField` placeholdere `16, 17, 26` — csupasz FDI-számok, „pl."
előtag nélkül, középre igazítva, egy oszlopban a ténylegesen kitöltött
sorok valós fogszámai mellett. Egy sorra pillantva nem különböztethető
meg, hogy a mező üres-e vagy három fogat tartalmaz.

**(c) A `--` gondolatjel-helyettesítő átszivárgott a felületre.** A
kódbázis kommentjeiben bevett szokás a `--` írásmód, és ez ~30 helyen
a felhasználónak megjelenő szövegekbe is átkerült — hibaüzenetekbe,
megerősítő dialógusokba, magyarázó bekezdésekbe —, miközben a felület
máshol valódi em dash-t használ (pl. a `LineRow.tsx` üres-ár jelölése
`—`). A 110. tétel eredetileg egyetlen dialógust nevez meg, de a
felderítés kimutatta, hogy a közvetlen szomszédja (ugyanabban a fájlban,
33 sorral fentebb) ugyanígy néz ki.

## Döntések

### 1. Az ár-frissítő tooltip a művelet nevére rövidül

A `title` új értéke `Ár frissítése az árlistából` — szó szerint azonos a
gomb már meglévő `aria-label`-jével és a megnyíló `AlertDialog` címével.
A következmény-mondat teljesen kikerül a tooltipből. Az `aria-label` és
az `onClick` változatlan.

**Miért:** a következmény helye a dialógus, ahol feltételesen és a
konkrét összegekkel együtt már ki is íródik — a tooltipben megismételve
egyrészt fölösleges, másrészt hamis, mert nem ismeri a sor állapotát. A
`title` = `aria-label` egyezés nem újítás: a fájlban ott a precedens (a
„Név visszaállítása az árlistaira" reset-gomb mindkét propja azonos
szöveg). Elvetett alternatíva: a tooltip mondja ki, hogy megerősítést kér
(pl. „— előnézettel, megerősítés után") — elvetve, mert egy tooltipnek
nem az a dolga, hogy a felület saját megerősítő mechanikáját magyarázza;
a `docs/07-felulet-rendszer.md` szerint az akció felirata azt mondja, mi
történik, a „hogyan" a dialógus dolga. Elvetett alternatíva: a
következmény-mondat feltételessé tétele a tooltipben is (csak ha
`tenylegesEgysegar !== listaEgysegar`) — elvetve, mert ugyanazt a
szabályt két rétegben tartaná karban, egy hover-szövegért.

### 2. A Fog mező placeholdere „pl." előtagot kap

Az új érték: `pl. 16, 17, 26`. A három fogszám és a vesszős felsorolás
formája megmarad.

**Miért:** a „pl." előtag az egyetlen jel, ami a placeholdert példaként
és nem tartalomként olvastatja; a három szám megtartása amellett szól,
hogy a mező több fogszámot is fogad (`parseTeeth`), és ez a
placeholderből derül ki a leggyorsabban. Elvetett alternatíva: rövidebb
`pl. 16, 17` vagy `pl. 16` — elvetve, mert a 132px-es mezőben a hosszabb
alak is elfér, a rövidítéssel viszont a többes felsorolás lehetősége
halványul vagy eltűnik. Az `aria-label` hozzáadása a mezőhöz
SZÁNDÉKOSAN nem része a döntésnek — lásd „Kapcsolódó, de ebbe a tételbe
NEM tartozó dolgok".

### 3. A `--` → `—` csere a teljes, felhasználónak látszó szövegkészletre kiterjed

Nem csak a tételben megnevezett egy dialógusra: minden olyan `--`, ami
renderelt szövegként a képernyőre kerül (JSX szöveg-csomópont, `title`,
`placeholder`, `aria-label`, `Callout`/`AlertDialog` szöveg, dobott hiba-
és megerősítés-üzenet stringje), valódi em dash-re (`—`) cserélődik. Ez
~30 előfordulás 18 fájlban. Az érintett stringekre asszertáló tesztek
szövegét ugyanebben a körben kell igazítani.

**Miért:** a tétel a `--`-t hibaként azonosítja; ha csak a megnevezett
egy sor javul, a közvetlen szomszédja (ugyanaz a fájl, 33 sorral
fentebb, ugyanaz a képernyő) továbbra is a hibás alakot mutatja — a
javítás önmagát tenné értelmetlenné. A csere mechanikus és
kockázatmentes: nem érint viselkedést, sémát, tárolt adatot. Elvetett
alternatíva: csak a `PriceListAdminPage.tsx` két dialógusa — elvetve,
mert ugyanez az érv a következő képernyőn megismétlődne, és a maradék
~28 hely külön tételként való visszahozása aránytalan adminisztráció egy
karaktercseréhez. Elvetett alternatíva: szó szerint csak a tételben
megnevezett egy string — ugyanezért elvetve.

### 4. A csere határa: renderelt szöveg, nem forráskód

Érintetlen marad:

- **minden kódkomment és JSDoc** — a `--` ott bevett, konzisztens
  házi konvenció, több száz helyen; a `CLAUDE.md` komment-szabályzata
  szerint meglévő kommentet nem módosítunk egy nem kapcsolódó
  változtatás mellékhatásaként;
- **CSS custom property-k** (`var(--radix-…)`, `--control-border`,
  `--tr-fejlec-magassag`, `--table-row-box-shadow` stb.) — ezekben a `--`
  szintaxis, nem írásjel;
- **teszt-leírások** (`describe`/`it` szövegei) — ezek a fejlesztőnek
  szólnak, nem renderelt felület.

**Miért:** a „renderelt szöveg vs. forráskód" határ egyszerű, egy
kereséssel ellenőrizhető és nem igényel esetenkénti mérlegelést, hogy ki
az olvasó. Egy naiv, teljes fájlra menő `--` → `—` csere ezzel szemben
elrontaná a CSS változókat és a `i--` alakú kódtokeneket.

### 5. A `storage/paths.ts` invariáns-hibaüzenete is bekerül a cserébe

A `paths.ts` D4-invariáns-sértésre dobott `Error`-üzenete (`… írunk felül
… -- ez hiba a hívó kódban …`) fejlesztőnek szól, mégis a cserébe
tartozik.

**Miért:** dobott üzenet, ami az `ErrorBoundary`-n át a doki képernyőjére
kerülhet — a 4. döntés határa („renderelt szöveg") tudatosan nem a
szándékolt olvasó szerint húzódik, hanem aszerint, hogy a string
megjelenhet-e a felületen. Elvetett alternatíva: a dev-célú üzeneteket
kivenni a körből — elvetve, mert esetenkénti mérlegelést kívánna, és a
haszna nulla.

### 6. A nyomtatvány (`pdf/`) nem érintett

Ellenőrizve: a `pdf/` alatt `--` kizárólag kommentekben és
teszt-leírásokban fordul elő, a PDF-re kerülő feliratokban
(`pdf/labels.ts`) és szövegekben nem. A `docs/04-nyomtatvany-spec.md`
szerinti nyomtatvány-réteg tehát változatlan marad, és a tétel nem
igényel vizuális PDF-ellenőrzést.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A Fog mező `aria-label`-je.** A mezőt ma csak a `Fog` oszlopfejléc
  azonosítja, saját `aria-label` nincs. Ez valós akadálymentességi
  kérdés, de nem szövegezési csiszolás, és a `docs/07-felulet-rendszer.md`
  soronkénti akcióknál előírt „a név tartalmazza a sor azonosítóját"
  szabályával együtt kellene végiggondolni — külön tétel dönthet róla.
- **A tooltipek gondolatjel-típusa.** A `LineRow.tsx` három tooltipje
  en dash-t (`–`) használ (313., 348., 420. sor), négy másik em dash-t
  (`—`). A 348. sor a tooltip rövidítésével magától megszűnik, a maradék
  két en dash NEM része a 3. döntés seprésének — az `--` írásmód javítása
  a tétel tárgya, nem az en/em dash közti választás egységesítése.
- **Az ár-frissítő dialógus szövege és viselkedése**
  (`PlanEditorPage.tsx:597–639`) változatlan — a tétel csak a tooltipet
  érinti.
- **A `--` írásmód a kommentekben** — lásd 4. döntés.
- **A többi placeholder az alkalmazásban** — a tétel a Fog mezőre
  szűkül, nem placeholder-átvilágítás.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/planEditor/LineRow.tsx` — a `⟳` gomb `title`-je
  (jelenlegi 348. sor), a Fog `TextField` `placeholder`-e (265. sor), és
  az FDI-hibaüzenet `--`-je (284. sor).
- `app/src/pages/PriceListAdminPage.tsx` — mindkét dialógus (jelenlegi
  598. és 631. sor).
- A 3. döntés seprésének további fájljai: `pages/TervReszleteiPage.tsx`,
  `pages/PatientPage.tsx`, `pages/PreviewPage.tsx`,
  `pages/NewPlanPage.tsx`, `pages/Home.tsx`, `pages/PatientDetailPage.tsx`,
  `pages/priceListAdmin/UjTetelDialog.tsx`,
  `pages/patientPage/TorzsadatSyncCard.tsx`,
  `pages/paciensek/UjPaciensDialog.tsx`,
  `pages/settings/NyomtatvanyokTab.tsx`,
  `pages/demo/AdatkezelesSection.tsx`,
  `pages/demo/fileTree/FileContentPanel.tsx`,
  `domain/planVersionActions.ts`, `storage/DemoDraftStorage.ts`,
  `storage/DemoStorage.ts`, `storage/paths.ts`.
- Az érintett stringekre asszertáló `*.test.tsx`/`*.test.ts` fájlok — a
  szöveg-asszerciók igazítása, nem új teszteset.
- Változatlanul marad: `app/src/pages/PlanEditorPage.tsx` (a dialógus),
  `app/src/pdf/` egésze, `app/src/domain/arKoveti.ts`.

## Tesztelés (irányadó, nem kimerítő)

- A `⟳` gomb továbbra is a hatás-előnézetes `AlertDialog`-ot nyitja, a
  Mégse nem módosít semmit, a Frissítés az új listaárra állítja a sort —
  a meglévő, `aria-label`-re (`Ár frissítése az árlistából`) kereső
  tesztek változtatás nélkül futnak.
- Az üres Fog mező placeholdere `pl. 16, 17, 26`, és a 132px-es
  oszlopban nem vágódik le (böngészős ránézés).
- Kitöltött Fog mezőnél a placeholder nem látszik — az oszlopra
  pillantva egyértelmű, melyik sorban van tényleges fogszám.
- `npm run build` + `npm test` hibátlanul lefut az érintett tesztek
  szöveg-asszercióinak igazítása után.
- A seprés után az `app/src` alatt renderelt szövegben nincs több `--`;
  a kommentekben, a CSS custom property-kben és a teszt-leírásokban
  viszont változatlanul ott van.
