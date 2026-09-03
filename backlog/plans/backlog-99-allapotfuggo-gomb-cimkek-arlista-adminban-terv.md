# Backlog 99. tétel — Állapotfüggő gomb-címkék az árlista adminban — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 99. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

Az `app/src/pages/PriceListAdminPage.tsx` táblasorán két `IconButton` toggle
van: a „Gyakori tétel" csillag (`it.gyakori`) és az „Aktív" szem-ikon
(`it.aktiv`). Mindkettő `aria-label`-je statikus szöveg, ami nem függ a
tétel tényleges állapotától — egy inaktivált tételnél a képernyőolvasó
ugyanúgy „Aktív"-ot mond, mint egy aktívnál, a csillag pedig mindig „Gyakori
tétel"-t hall, sosem azt, mit fog eredményezni a kattintás. Az állapotot
vizuálisan csak az ikon-alak (`StarFilledIcon`/`StarIcon`,
`EyeOpenIcon`/`EyeClosedIcon`) és a sor áttetszősége (`opacity: it.aktiv ? 1
: 0.5`) jelzi — képernyőolvasóval ez nem érhető el.

Ehhez kapcsolódik egy a döntési interjú során felszínre került, önmagában is
fennálló hiány: a `docs/07-felulet-rendszer.md` „Soronkénti akciók" szakasza
szerint egy lista-jellegű sor TELJES sorra ható akció-gombjának
`aria-label`-je tartalmazza a SOR azonosítóját is — a `RendeloTab.tsx`
Orvosok-listájának `aria-label={\`${sorNeve} aktív\`}` a kimondott minta
(D67). Az Árlista admin táblasora pont ilyen lista-jellegű sor (több tétel,
azonos szerkezetű sorokban), de a mai két gomb egyike sem tartalmazza a
tétel nevét — két inaktivált tétel gombja képernyőolvasóval
megkülönböztethetetlen egymástól.

## Döntések

### 1. A tételnév bekerül mindkét label-be, a D67 mintáján

Mindkét gomb `aria-label`-je a tétel nevével kezdődik, utána az
állapotfüggő igenévi szerkezet — `<tételnév> <akció>` alakban, ELVÁLASZTÓ
JEL NÉLKÜL (nem gondolatjellel/kötőjellel tagolva), pontosan a
`RendeloTab.tsx` `aria-label={\`${sorNeve} törlése\`}`/`\`${sorNeve}
feljebb\`` mintáját követve.

**Miért:** a docs/07 „Soronkénti akciók" szabálya ma is érvényes, és a mai
implementáció megsérti — a 99. tétel kimondottan a két gomb szövegét
állítja helyre, logikus, hogy egy menetben mindkét hiányt (állapotfüggőség
ÉS soros azonosítás) megszünteti, nem generál egy második, közeli jövőben
esedékes takarítási tételt ugyanarra a két gombra. Az elválasztó nélküli
forma azért a helyes, mert ez a kódbázisban MÁR bevett, egységes alak (négy
másik `aria-label` is ugyanígy, kötőjel nélkül fűzi a nevet az akcióhoz) —
egy új, gondolatjeles változat egy hatodik, önálló konvenciót vezetne be két
db azonos jelentésű minta helyett.

Elvetett alternatíva — **csak az állapotfüggőség, névesítés nélkül**: a
tétel szó szerinti kérését („akció-alapú, állapotfüggő címke") teljesítené,
de a docs/07-hiányt nyitva hagyná — egy következő, erre a két gombra
irányuló munka ugyanezt a kódrészt nyitná meg újra, ugyanazon sorok
módosításával. Mivel a döntési interjú alatt ez a hiány explicit
felszínre került, a nyitva hagyása tudatos adósság-hagyás lenne, indoklás
nélkül.

### 2. „Aktív" gomb: „aktiválása" / „inaktiválása"

A szem-ikon `aria-label`-je aktív tételnél `<tételnév> inaktiválása`,
inaktívnál `<tételnév> aktiválása`.

**Miért:** ez pontosan a meglévő megerősítő dialógus címének szótöve
(„Tétel aktiválása 0 Ft-tal?", „Tétel inaktiválása",
`PriceListAdminPage.tsx` 595/628. sor) — nincs harmadik szóváltozat
ugyanarra a domain-fogalomra a felületen.

Elvetett alternatíva — „elrejtése"/„megjelenítése" (a szem-ikon vizuális
metaforáját követve): eltérne a meglévő megerősítő dialógus szóhasználatától,
és a `docs/03-funkcionalis-spec.md` § „Törlés helyett inaktiválás" is
következetesen az „aktivál"/„inaktivál" domain-igét használja, nem a
„megjelenít"/„elrejt" UI-metaforát.

### 3. „Gyakori tétel" gomb: „megjelölése gyakorinak" / „gyakori jelölés törlése"

A csillag `aria-label`-je nem-gyakori tételnél `<tételnév> megjelölése
gyakorinak`, gyakori tételnél `<tételnév> gyakori jelölés törlése`.

**Miért:** a `gyakori` a séma-mező neve (`CLAUDE.md` „Domain szókincs" —
ne fordítsuk le), a „megjelölés"/„jelölés törlése" pár ugyanezt a
domain-szót viszi át emberi olvasható szövegre, konzisztensen a séma-
szóhasználattal.

Elvetett alternatíva — „gyakorivá tétel"/„gyakori jelölés visszavonása": a
„visszavonása" szó máshol a kódbázisban nem szerepel hasonló
kontextusban (törlés-jellegű akcióknál mindig „törlése"/„inaktiválása" a
mai konvenció, pl. `RendeloTab.tsx` `aria-label={\`${sorNeve} törlése\`}`) —
egy új szóváltozat bevezetése indokolatlan.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Vizuális tooltip.** A kódbázisban sehol nincs Radix `Tooltip` egy
  `IconButton` fölött (sem ezen az oldalon, sem máshol) — ez a tétel nem
  vezet be ilyet, marad `aria-label`-only, ahogy ma is.
- **A többi Árlista admin `IconButton` (pl. a fázisfejléc ↑/↓/kuka a
  `KategoriaPanel.tsx`-en, a docs/07 „NÉVESÍTETT KIVÉTEL" bekezdése).** Azok
  külön komponensben élnek, és nem az „Aktív"/„Gyakori tétel" gomb, amit a
  99. tétel megnevez — ha ott is van hasonló hiány, az önálló tétel.
- **A `ItemEditor.tsx` sor kinyitása utáni, MÁR állapotfüggő vezérlők**
  (ártípus váltó, aktív/gyakori mezők a nyitott szerkesztőben). A 99. tétel
  kizárólag a táblasor két, csukott állapotban is látható `IconButton`-jára
  vonatkozik.
- **A megerősítő dialógusok szövege** (`Tétel aktiválása 0 Ft-tal?`, `Tétel
  inaktiválása`). Ezek már ma is állapot-/akció-alapúak, változatlanul
  maradnak — ez a tétel csak a szóhasználatukat veszi át forrásként a
  gombokhoz.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PriceListAdminPage.tsx` — a „Gyakori tétel" (469. sor
  körül) és az „Aktív" (539. sor körül) `IconButton` `aria-label` propja.
- `app/src/pages/PriceListAdminPage.test.tsx` — a jelenlegi tesztek
  `within(rowDiv).getByLabelText('Aktív')`/`getByLabelText('Gyakori
  tétel')` statikus szöveggel keresik meg a gombokat (pl. 149, 167, 179,
  183, 300, 304, 305, 509, 584, 866. sor) — ezeknek az új, tétel-
  névvel/állapottal bővült label-re kell állniuk.

## Tesztelés (irányadó, nem kimerítő)

1. **Állapotfüggőség.** Egy aktív tétel szem-ikonja „<név> inaktiválása"-t
   mond (képernyőolvasóval/`aria-label`-lel ellenőrizve); inaktiválás után
   ugyanaz a gomb „<név> aktiválása"-ra vált.
2. **Gyakori-jelölés.** Egy nem-gyakori tétel csillaga „<név> megjelölése
   gyakorinak"-ot mond; bejelölés után „<név> gyakori jelölés törlése"-re
   vált.
3. **Két azonos nevű vagy két különböző tétel megkülönböztethető.** Két
   különböző tétel (pl. „Tömés" és „Fogkőeltávolítás") szem-ikonjának
   `aria-label`-je nem egyezik — mindkettő tartalmazza a saját nevét.
4. **Regresszió.** A gombok kattintható viselkedése (aktiválás/deaktiválás
   megerősítő dialógussal, gyakori toggle azonnal) nem változik — csak a
   szöveg.
5. `cd app && npm test && npm run build && npm run lint`.
