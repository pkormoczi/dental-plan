# Böngészős validáció

Dátum: 2026-08-10
Eszköz: chrome-devtools MCP, izolált Chrome (`.mcp.json`, `chrome-devtools-mcp@1.6.0`)
Cél: azok a `docs/07-felulet-rendszer.md` / `docs/04-nyomtatvany-spec.md` szabályok, amiket a
36 fájlos vitest-készlet **strukturálisan nem tud** ellenőrizni (jsdom: nincs betöltött
stíluslap, nincs canvas 2D context, nincs `paint-order`, stubolt `ResizeObserver`/pointer
capture, mockolt `usePDF`).

Ez a fájl átmeneti munkatermék — a valódi találatok a `docs/08-backlog.md`-be
vándorolnak, utána ez törölhető (ugyanaz az életciklus, mint a
`2026-08-10-arch-react-review-2.md`-é).

## Összefoglaló

| Súlyosság | Darab |
|---|---|
| Kritikus | 0 |
| Közepes | 5 (2 javítva: K1, K2) |
| Apró | 1 (javítva: A1) |
| Megerősített, hibátlan | 9 terület |

A Közepes tételek mindegyike **rendszerszintű** (az egész appot érinti, nem egy
komponenst) — egyik sem trivi kis javítás, ezért nem lettek autonóm módon átírva,
K1 és K2 kivételével (lásd lent, a felhasználó explicit kérésére). K4 és K5 a K1
javítás utólagos böngészős visszaellenőrzése (2026-08-10, második menet) során
derült ki — nem az eredeti menet találatai.

---

## Közepes súlyosságú találatok

### K1 — `controlBorder` egyetlen Radix `Button`-ra sincs alkalmazva — JAVÍTVA (2026-08-10)

`docs/07-felulet-rendszer.md`: *"`controlBorder` — Minden interaktív kontroll (input,
gomb, chip, dropdown) kerete — 3,00:1, WCAG 1.4.11. Nem az `uiLine`, az ahhoz túl
halvány."*

A forráskódban a `t.controlBorder` (`app/src/design/tokens.ts:63`) kizárólag a kézzel
írt input mezőkön van bedrótozva: `NumberField.tsx:28`, `ItemPicker.tsx:174/251`,
`ErrorBoundary.tsx:97`, `PlanEditorPage.tsx` néhány egyedi mezője. **Egyetlen Radix
`Button` sem kapja meg** — sem a `variant="solid"`, sem a `variant="soft"` gombok,
sem a natív Radix `TextField`/`Checkbox` némelyike.

Böngészőben mért adatok (`getComputedStyle`, mind a 7 route + egy nyitott
`AlertDialog`):

| Route | Keret nélküli interaktív kontroll |
|---|---|
| `#/` | 4 (mind a 4 gomb) |
| `#/paciens` | 12 |
| `#/terv` | 7 |
| `#/arlista` | **244** |
| `#/tervek` | 9 |
| `#/beallitasok` | 17 |
| `#/elonezet` | 2 |
| Home „Minden adat törlése” dialógus | 2 (a „Mégse”/„Törlés” gomb is) |

Ez szó szerinti, egyértelmű szabálysértés, de rendszerszintű: érinti, hogy a Radix
`Button`-ök minden variánsa kapjon-e keretet (ütközhet a Radix saját vizuális
nyelvével egy `solid` gombnál, aminek amúgy is van kitöltés-kontrasztja), vagy csak a
kontraszt nélküli variánsok (`soft`, `ghost`). Ez tervezési döntés, nem mechanikus
patch — a `docs/08-backlog.md`-be javasolt.

**Javítva.** A `solid` variáns kivétel maradt (saját kitöltés-kontrasztja miatt),
minden más interaktív kontroll (Button `soft`/`ghost`, `IconButton`, natív Radix
`TextField`, `Checkbox`) kivétel nélkül megkapja a keretet, a sűrű Árlista-tábla
soronkénti ikon-kapcsolóit is beleértve. Egy globális CSS-szabály adja
(`app/src/index.css`, Radix saját `.rt-*` osztályaira célozva box-shadow-val, mert
Radix a keretet így rajzolja, nem `border`-rel) — ez minden jelenlegi ÉS jövőbeli
Button/TextField/Checkbox-ra automatikusan érvényes, nem call site-onkénti patch.
A `--control-border` CSS-változót `main.tsx` állítja be `tokens.ts`
`controlBorder`-jéből, egy forrás marad. A korábbi kézzel bedrótozott
`PlanEditorPage.tsx` két `TextField.Root` mezője (`borderColor`) mellékesen egy
valódi, önálló hibát is tartalmazott: Radix a mezőkeretet `box-shadow`-val
rajzolja, nem `border`-rel, tehát a `borderColor` felülírás — a hiba-állapotra
(piros keret üres/érvénytelen mezőnél) is — sosem volt látható; ez `boxShadow`-ra
lett javítva. Részletek: `docs/07-felulet-rendszer.md` `controlBorder` sora.
`tsc -b`, `oxlint` és a teljes 386 teszt zöld a javítás után.

**Böngészős visszaellenőrzés (2026-08-10, második menet).** A mechanizmus
igazoltan működik: mind a 7 route-on + a Home „Minden adat törlése”
`AlertDialog`-jában minden `soft`/`ghost` Button, `IconButton`, `TextField` és
`Checkbox` (`#/arlista`: mind a 237 érintett kontroll) pontosan
`rgb(136, 150, 171)` (`#8896AB`) `box-shadow`-t kap, a `solid` Button-ök
(pl. dialógus „Törlés”) és a letiltott kontrollok kivételével — utóbbira nem
volt élesben letiltott soft/ghost minta a menetben, de a CSS ugyanazt a
`[data-disabled]`/`:disabled` mintát használja, mint amit Radix saját maga is.
A `PlanEditorPage.tsx` `boxShadow`-ra javított hibaállapota élesben is igazolva:
üres tételnév és `99` érvénytelen fogszám mellett mindkét mező ténylegesen
piros (`rgb(179, 38, 30)` = `t.danger`) keretet kap, `aria-invalid="true"`-val
— korábban ez tényleg nem látszott. Konzol tiszta, nincs React hiba/warning.

Eközben **két új, a K1 hatókörén kívül eső találat** derült ki — lásd K4 és K5
lent. Egyik sem az imént leírt javítás hibája (a mechanizmus önmagában
pontosan a szándékolt `#8896AB` színt alkalmazza mindenhol), hanem a
`controlBorder` token és a `docs/07` szabály hatókörének saját, korábban rejtett
hiányossága, amit csak a most bekerült keret tett mérhetővé.

### K2 — Az elsődleges CTA-gombok fehér szövege 3,53:1-en fut a 4,5:1 helyett — JAVÍTVA (2026-08-10)

`docs/07-felulet-rendszer.md` azt állítja, hogy `ink` (`#2D2D2D`, 13,77:1) az
"Elsődleges gomb háttere". A valóságban a variant nélküli `<Button>` a Radix Theme
`accentColor="brown"` alapértelmezett `solid` színét örökli
(`App.tsx:27` — `<Theme accentColor="brown" ...>`), ami `rgb(173,127,88)` — **nem**
`t.ink`. Fehér szöveggel a mért kontraszt **3,53:1**, a WCAG AA 4,5:1 (normál szöveg)
helyett.

Előfordulás (kompozitált, valódi renderelt szín — nem a nyers Radix-token):

- Home „Új terv indítása” — 13,3px, 3,53:1
- PatientPage „Tovább a terv szerkesztőhöz” — 13,3px, 3,53:1
- PlanEditorPage „Előnézet” — 13,3px, 3,53:1
- PriceListAdminPage „+ Új tétel” — 13,3px, 3,53:1
- PlanHistoryPage „Megnyitás szerkesztésre” (×4 sor) — **11,4px**, 3,53:1 (kisebb
  méretnél ugyanaz a szín rosszabb élmény)
- SettingsPage „Mentés” — 13,3px, 3,53:1
- PreviewPage „Véglegesítés és mentés” — 13,3px, 3,53:1

Kizárva (jogosan, letiltott kontroll nem esik kontraszt-kötelezettség alá): SettingsPage
letiltott „Szöveg mentése” gomb, 1,88:1.

Ugyanaz a helyzet, mint K1-nél: a javítás nem egysoros — vagy a `Theme
accentColor`/gomb-szín kap sötétebb árnyalatot, vagy a `<Button>` explicit
`style={{ background: t.ink }}`-et kap mindenhol. Backlogba javasolt (ez meg is
történt, `docs/08-backlog.md`-ben élt, mielőtt ez a javítás törölte onnan).

**Javítva.** Nem call site-onként, hanem Radix saját accent-aliasát írja felül
egy globális CSS-szabály (`app/src/index.css`, a Radix `[data-accent-color=
'brown']` blokkját célozva): `--accent-9`/`--accent-10`/`--accent-contrast` a
`t.ink`/`t.text`/`t.onBrand` hármasra mutat, `main.tsx`-ből beírva (egy
forrás, `tokens.ts`). Menet közben kiderült egy MÁSODIK, eddig ismeretlen
előfordulás: a `Select.Content` alapértelmezett variánsa is `solid`, tehát a
kiemelt (hover/nyilazás alatti) dropdown-sor ugyanezt a 3,53:1-et futotta
mindhárom `Select` használatnál (`ToothChartPanel`, `UjTetelDialog`,
`PriceListAdminPage` kategória-választó) — ez a javítás ezt is lefedi,
ugyanabból az egy CSS-szabályból, hívási helyenkénti módosítás nélkül.

Szándékosan **nem** érinti: a `color="red"` gombokat (saját
`data-accent-color`-t kapnak az elemükön, ami felülírja az örökölt barnát —
pl. a „Törlés” megerősítő gombok változatlanul pirosak maradnak), a
Checkbox/Radio/RadioCards kitöltését (`--accent-indicator` közvetlenül
`--brown-9`-re mutat, nem `--accent-9`-re — szándékosan marad barna, grafikus
elem, a WCAG 1.4.11 3:1-ét enélkül is teljesíti), és a `soft`/`ghost` Button
és Badge megjelenését (külön `--accent-a*` alfa-skála).

Egy mellékhatás, amit érdemes ismerni, nem hiba: a `--focus-9`/`--focus-10`
is a `--accent-9`/`--accent-10`-ből öröklődik, és pontosan egy helyen van
élő fogyasztója — egy bejelölt + billentyűzet-fókuszált `RadioCardsItem`
(`PriceListAdminPage.tsx:901`, a kategória színválasztó) `::after` gyűrűje
barnáról (~3,3:1) `t.text`-re (17,4:1) vált. Szigorúan jobb, nem
regresszió, de egy jövőbeli visszaellenőrzésnél ne tűnjön véletlen eltérésnek.

`tsc -b`, `oxlint` és a teljes teszt-készlet zöld a javítás után (a
változtatás CSS-egyedi-tulajdonság-szintű, egyetlen teszt sem tölti be sem az
`index.css`-t, sem a `main.tsx`-et, tehát a vitest-készlet erre a rétegre
struktúrálisan vak — böngészős visszaellenőrzés szükséges, lásd lent, még
nincs elvégezve).

### K3 — A NotoSans-SemiBold sosem ágyazódik be a tényleges PDF-be

`pdf/fonts.ts` regisztrálja a `NotoSans` családot 400 és 600 súllyal
(`Font.register({ family: 'NotoSans', fonts: [{...400}, {...600}] })`), és a
hálózati kérés (`list_network_requests`/`performance`) igazolja, hogy mindkét TTF
ténylegesen letöltődik (~59-60 KB, valódi tartalom).

A **valódi generált PDF bájtjait** vizsgálva (fetch a blob URL-ről, `%PDF-1.3`
fejléc, nincs objektum-stream/cross-reference-stream tömörítés, tehát a nyers
reguláris kereséssel minden objektum látható):

```
allBaseFonts: ["Helvetica", "VKQQKN+NotoSans-Regular", "VKQQKN+NotoSans-Regular"]
fontFile2Count: 1        // csak EGY beágyazott TTF (a Regular)
"SemiBold" előfordulás: 0
```

A `fontWeight: 600`-at kérő stílusok (`TervDocument.tsx`: `headerTitle`,
`phaseTitle`, `phaseTotalValue`, `summaryTotalLabel/Value`, `h2`) csendben
Regular vastagságra esnek vissza — a glyph-lefedettség nem sérül (a Regular is
tartalmazza az ő/ű-t), csak a tipográfiai súlyozás vész el. Emellett van egy
használaton kívülinek tűnő `/Helvetica` Type1 objektum a fájlban (1×,
`14 0 obj`) — nem azonosítottam, hogy ténylegesen hivatkozik-e rá bármelyik oldal
tartalomfolyama.

Ez pontosan az a hibaosztály, amire ez az egész validációs réteg épült — a
`pdf/fonts.ts` fejléc-kommentje szó szerint kimondja: *"ez csak a végleges
PDF-en látszik, a HTML előnézeten nem"*. `@react-pdf/renderer` verzió: `^4.5.1`.
A gyökérokot (fontkit súly-feloldás, TTF metaadat, vagy `Font.register` API
használat) nem vizsgáltam tovább — ez implementáció-szintű nyomozást igényel,
nem böngészős ellenőrzést. Backlogba javasolt, `@react-pdf/renderer` verzió
frissítés / font-fájl csere kipróbálásával kezdve.

### K4 — `controlBorder` (`#8896AB`) valós felületeken 2,4–2,96:1-en fut a mondott 3,00:1 helyett

A `tokens.ts` fejléckommentje és a `docs/07` táblázata "3,00:1 fehéren" —
ez pontosan igaz, de **nulla tartalékkal**: `#8896AB` fehér (`#FFFFFF`) hátteret
feltételez, miközben az app UI-ja sehol nem tesz ki kontrollt tiszta fehér
háttérre. A K1 javítás böngészős visszaellenőrzése során, most hogy a keret
ténylegesen megjelenik és mérhető, minden mért előfordulás a névleges alá esett:

| Háttér | Példa | Mért kontraszt |
|---|---|---|
| `t.page` (`#F1F5F9`, appháttér) | Home `soft` gombok, `#/terv` fázis-gombok | 2,40:1 |
| `Card`/`Table.Cell` (majdnem fehér, de nem az) | `#/paciens` TextField-ek, `#/arlista` sorok | 2,74–2,96:1 |

Egyik sem véletlen mérési hiba — a `box-shadow` színe minden esetben igazoltan
pontosan `rgb(136, 150, 171)`, a `#8896AB` maga fut kontraszthiányban a
tényleges (nem fehér) hátterek felett. Ez azt jelenti, hogy a K1 javítás **a
`docs/07` betűje szerint helyes** (a keret jelen van), de a mögötte álló WCAG
1.4.11-célt (3:1) a jelenlegi tokenérték a gyakorlatban **sehol nem éri el**,
legfeljebb 0,04–0,60-dal marad alatta.

Rendszerszintű: a `controlBorder` érték módosítása minden meglévő
felhasználását (Button/TextField/Checkbox a mai javításból, plusz a korábbi
kézzel bedrótozott `NumberField`/`ItemPicker`/`ErrorBoundary`/
`PlanEditorPage`-előfordulások) egyszerre érintené, tehát vizuális
súly-döntés, nem mechanikus patch. Backlogba javasolt — a döntés: sötétebb
érték választása annyi tartalékkal, hogy a legvilágosabb ténylegesen
előforduló háttéren (`t.page`) is teljesüljön a 3:1, vagy a szabály
újrafogalmazása háttérfüggő értékre.

### K5 — A `ChipGroup` (Radix `SegmentedControl`) nincs a K1 hatókörében, keret nélküli marad

A `docs/07` `controlBorder` sora név szerint négy kontrolltípust sorol fel:
"input, gomb, **chip**, dropdown". A K1 grillezés során egyeztetett hatókör
(Button/IconButton/TextField/Checkbox) nem tartalmazta a "chip"-et, mert az
eredeti K1-mérés nem talált ilyet — de a `PatientPage`/`SettingsPage`/
`PriceListAdminPage` nyelv-, pénznem- és alapértelmezett nyelv-váltója mind a
közös `ChipGroup.tsx`-en (Radix `SegmentedControl.Root`/`.Item`) megy át, ami
**nem** `Button`, tehát a mai globális CSS-szabály nem éri el.

Böngészőben mérve (`#/paciens`): `.rt-SegmentedControlRoot`/`.Item`
`box-shadow: none` — nulla keret, ugyanaz a hibaosztály, mint K1 eredetileg
volt. Rendszerszintű abban az értelemben, hogy egy új CSS-szabály (vagy a
meglévő kiterjesztése) + a K4 alatti szín-döntés együtt dől el — ezért nem
lett autonóm módon bővítve a mai javítás, csak jelentve. Backlogba javasolt,
K1-hez hasonló megoldással (`.rt-SegmentedControlRoot`-ra célzó box-shadow
override).

---

## Apró találat — javítva

### A1 — A betöltő állapotok szöveget mutatnak skeleton helyett

`docs/07-felulet-rendszer.md` "Kötelező állapotok": *"Loading: skeleton a végleges
elrendezés alakjában, ne pörgő spinner."* `app/src/App.tsx:68` (`PreviewLoading`,
a lazy-loaded `@react-pdf/renderer` ~1,5 MB chunk betöltése alatt) és
`app/src/pages/PreviewPage.tsx:425` (PDF-generálás alatt) középre igazított
szöveget rendereltek ("Az előnézet-motor betöltése…", "PDF előállítása…").

**Javítva** — mindkét hely most a végleges elrendezés alakját követő, Radix
`Skeleton`-nal becsomagolt doboz (a `#/elonezet` végleges tartalma egy 80vh
magas, lekerekített téglalap — `PreviewPage.tsx:415-423`), ugyanazzal a
mintával, amit a `PlanHistoryPage.tsx` `HistorySkeleton`-ja már használ.
`tsc -b`, `oxlint` és a teljes 386 teszt zöld a javítás után.

*Nem sikerült* screenshot-tal elkapni a tényleges tranziens skeleton-keretet:
mind a `navigate_page`, mind a `click` MCP-tool kivárja az oldal
"megnyugvását", mielőtt visszatér — így egy köztes betöltési állapot
screenshot-olása ezekkel az eszközökkel strukturálisan nem megbízható, még
`Slow 4G` hálózat-fojtással és a valódi ~1,45 MB-os production chunkkal sem.
A javítás helyessége forráskód-szinten (a `Skeleton` egy már bevált,
másutt is használt komponens) és a teszteken keresztül van igazolva, nem
vizuálisan.

---

## Megerősített, hibátlan területek

Ezek konkrét, böngészőben lefuttatott ellenőrzések — nem feltételezés:

1. **`#f77409` mint szövegszín** — nulla előfordulás mind a 7 route-on
   (`getComputedStyle(el).color`-alapú seprés).
2. **Fókuszgyűrű** — minden mintavételezett fókuszálható elem (nav linkek, Home
   gombjai) látható `outline`-t vagy Radix `box-shadow`-gyűrűt kap fókuszkor;
   sehol nincs `outline: none` felülírás.
3. **ő/ű/ö glyphek a valódi PDF-ben** — `Tőkés Ödönné` (páciensnév) és
   `Gyökérkezelés felső őrlőfogon` (egyedi sornév) hibátlanul renderel a
   letöltött PDF-en (screenshot-tal vizuálisan ellenőrizve).
4. **Fogtérkép canvas→PNG útja** — először tesztelve valódi böngészőben (jsdom
   alatt `renderToothChartPng()` mindig `null`-t ad). A/B: fogakkal rendelkező
   terv → színezett fogtérkép + jelmagyarázat a PDF-ben; fogak nélküli terv →
   térkép teljesen hiányzik, az összesítő teljes szélességet kap — pontosan a
   dokumentált leépített viselkedés.
5. **D23 placeholder-zár valódi PDF-bájtokon** — eddig csak mockolt `usePDF`
   mellett, a JSX-fán volt tesztelve. Most: `[PLACEHOLDER` törzsű nyilatkozat →
   a „Csak ajánlat” checkbox kényszerítve bejelölve és letiltva, az oldalszám
   3-ról 2-re csökken a TÉNYLEGES PDF-ben (nem csak a UI-n).
6. **Letöltés — blob-URL kezelés** — mind a `PreviewPage` saját `<a>` linkje
   (helyes `download` fájlnév, `blob:` href), mind a `PlanHistoryPage`
   JS-vezérelt letöltése (`URL.createObjectURL`/`revokeObjectURL`/`a.click()`
   in-page instrumentálással) pontosan egy blobot hoz létre és szabadít fel
   kattintásonként, nincs URL-szivárgás. *(Első menetben duplikáltnak tűnt —
   ez a saját instrumentáló szkriptem egymásra rakódásából jött egy nem
   újratöltött SPA-navigáción át, nem valódi app-hiba; friss oldalbetöltés
   után tiszta eredmény.)*
7. **Billentyűzetes tételfelvitel ciklusa** — gépel → nyíl → Enter → kereső
   kiürül és visszakapja a fókuszt, **háromszor egymás után, egér nélkül**,
   focus-trap regresszió nélkül; az egyedi sor felvitele (nulla találat →
   Enter) is hibátlan; Escape zár és fókuszt tart.
8. **Fogtérkép Tab-sorrend** — csukott panel: a térkép ténylegesen hiányzik a
   DOM-ból (nem CSS-sel rejtett). Nyitott panel: pontosan EGY Tab-stop
   (`tabIndex=0` a `role="toolbar"` wrapperen), a 32 fog egyike sem külön
   fókuszálható, `aria-activedescendant` viszi a roving kurzort, nyílbillentyű
   helyesen lépteti.
9. **`paint-order: stroke`** (jsdom nem implementálja) — az aktív fog gyűrűje
   `ink`-kel, a kiválasztott fog gyűrűje `accent`-tel fut, **mindkettő
   `stroke`-ként**, a kiválasztott fog `color`-a NEM accent — pontosan a
   `docs/07` egyetlen nevesített accent-kivétele. Az `ItemPicker` portál-módú
   találati listája (a `Table.Root` `ScrollArea` levágása ellen) is
   igazoltan teljesen látótéren belüli és eltakarás-mentes.

---

## Nem ellenőrizhető (dokumentálva, nem próbálkoztam megkerülni)

- `prefers-reduced-motion` emulálása — a chrome-devtools MCP `emulate` tool-ja
  nem támogat CSS media-feature emulációt (csak `colorScheme`,
  `cpuThrottlingRate`, `networkConditions`, `geolocation`, `userAgent`,
  `viewport`).
- A letöltött fájl tényleges lemezre kerülése — izolált profil, nincs
  download-inspection tool.
