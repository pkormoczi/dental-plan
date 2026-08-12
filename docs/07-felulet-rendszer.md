# 7. Felület-rendszer

Ez a fejezet a felület és a nyomtatvány kinézetére vonatkozik. Kötelező,
nem javaslat. Ha valami ütközik vele, kérdezz, ne rögtönözz.

(Korábban `Design.md` a repo gyökerén — ha kódkommentben `Design.md`
hivatkozást látsz, ez a fájl az utódja.)

### Mi ez a termék

Belső klinikai eszköz egyetlen fogorvos napi használatára. Sűrű,
billentyűzet-központú, adattáblás munkafelület. NEM marketing oldal:
nincs hero, nincsenek szekciók, nincs scroll-animáció, nincs képanyag,
nincsenek dísz-illusztrációk.

### A két felület külön szabályrendszer

**1. Nyomtatvány (`app/src/pdf/TervDocument.tsx`) — ezt a PÁCIENS látja.**
Kövesse a klinika weboldalának (drmandoki.hu) arculatát: ugyanaz a logó,
paletta és betűtípus. A páciens a weboldal után kapja kézhez ezt a papírt,
a kettő egy márkaélmény. Részletes specifikáció: `docs/04-nyomtatvany-spec.md`.

**2. App felület — ezt CSAK az orvos látja, naponta több órán át.**
Munkaeszköz. Semleges, hideg szürke skála (slate). A márka színe kizárólag
akcentusként jelenik meg: elsődleges gomb, kijelölt sor, fókusz gyűrű,
aktív fül. A felület háttere SOHA nem meleg krém, bézs vagy agyagbarna —
az fárasztó egy órákig nézett adattáblán.

### Márkatokenek (forrás: drmandoki.hu, lásd `app/src/design/tokens.ts`)

A márka 2026-08-06 óta a klinika nyilvános honlapját követi (arculatváltás,
lásd `docs/04-nyomtatvany-spec.md` „Márka"). Az alábbi táblázat a
`tokens.ts` tényleges exportjait tükrözi — ha eltérést látsz, a kód az
igazság, ezt a táblázatot kell utána igazítani.

| Token | Érték | Szerep |
|---|---|---|
| `brand` | `#976445` | Címsorok, vonalak. Fehéren 4,97:1 — épphogy WCAG AA fölött, színes háttéren újraszámolandó |
| `accent` | `#f77409` | **Soha nem szövegszín** — fehéren 2,82:1, kis méretben olvashatatlan. Csak díszítővonal |
| `ink` | `#2D2D2D` | Elsődleges gomb háttere (a honlap gombszíne), 13,77:1. A Radix `solid` variáns nem magától ilyen: a `brown` accent step-9-e (`#ad7f58`) fehér felirattal 3,53:1 volt, ezért egy globális CSS-szabály (`app/src/index.css`, a Radix `[data-accent-color='brown']` blokkját írja felül) az `--accent-9`/`--accent-10`/`--accent-contrast` aliast erre a tokenre irányítja — ez a `solid` Button mellett a `Select.Content` kiemelt sorát is fedi. Hover: `text`. A `color="red"` gombok saját accent-skálát kapnak, rájuk nem vonatkozik; a checkbox/rádió/RadioCards kitöltése `--accent-indicator`-t használ, az szándékosan marad barna (grafikus elem, WCAG 1.4.11 3:1) |
| `text` | `#1A1A1A` | Törzsszöveg, mindkét felület használja; egyben az elsődleges gomb hover-háttere (lásd `ink`) |
| `uiTextMuted` / `uiTextFaint` | `#475569` / `#64748B` | App-oldali halvány szöveg (slate-600/500) |
| `uiLine` / `uiLineStrong` | `#E2E8F0` / `#CBD5E1` | App-oldali díszítő hajszálvonal — **csak** sorelválasztóra, nem interaktív keretre |
| `controlBorder` | `#64748B` | Minden interaktív kontroll (input, gomb, chip, dropdown) kerete — WCAG 1.4.11, 3:1. A keret `inset` box-shadow, tehát **két szomszédja van**: kívül a szülőfelület, belül a kontroll saját kitöltése (pl. egy `soft` gomb `accent-a3`/`a4`/`a5` washe) — utóbbi a szigorúbb mérce, mert sötétebb, mint a lap háttere. Nem az `uiLine`, az ahhoz túl halvány. **Kivétel 1: a `solid` Button variáns** — saját kitöltése már 3:1 fölött van a lap hátterével szemben, a határa keret nélkül is látszik. **Kivétel 2 (2026-08-10, tudatos vizuális döntés): minden `IconButton`** — ezekre a WCAG 1.4.11 3:1 SZÁNDÉKOSAN nem teljesül, méretüktől és elhelyezkedésüktől függetlenül; egy `size="1"` IconButton glyph-nyi dobozán, több egymás mellett egy sűrű sorban, a kötelező keret vizuálisan túl súlyosnak (feketés dobozkeretnek) bizonyult, és a `controlBorder` értéke már a legvilágosabb WCAG-megfelelő szín (lásd fent) — nincs lejjebb vinni való. **Kivétel 3 (2026-08-11, tudatos vizuális döntés): a Button `ghost` variánsa** — ugyanaz a jelenség, mint a Kivétel 2-nél, csak a Buttonon: a `ghost` variánsnak nincs saját kitöltése, kizárólag szövegszintű kapcsolóként használjuk sűrű sorokban (pl. `PlanHistoryPage.tsx` „N terv", `PlanEditorPage.tsx` „Leírás"/„+ leírás"), ahol a kötelező hajszálvonal ugyanúgy feketés dobozkeretnek hat. Minden más interaktív kontrollra (Button `soft`, `TextField`, `Checkbox`, `SegmentedControl` — a `ChipGroup` és a közvetlen használat is —, `Select.Trigger` `surface`/`soft`/`ghost` variánsa) kivétel nélkül vonatkozik — lásd a globális CSS-szabályt (`app/src/index.css`, Radix `.rt-*` osztályaira célozva, mert Radix a keretet box-shadow-val rajzolja, nem border-rel) |
| betűtípus | Roboto | `@fontsource/roboto` |
| Logó | átszínezett (weboldalas) lockup | Az eredeti navy **nem** ez — lásd `docs/04-nyomtatvany-spec.md` „Logó", 300 dpi, 2662×666 px |

A PDF-oldal (`pdf/*.tsx`) és az app-felület (`components/`, `pages/`)
tudatosan **külön tokenkészletet** használ ugyanarra a szerepre (pl.
`textMuted` a PDF-en, `uiTextMuted` az appban) — ne keverd össze őket, a
`tokens.ts` fejléckommentje ezt részletesen indokolja.

Ezeket ne módosítsd, ne "hangold", ne generálj hozzájuk kiegészítő
palettát. Ha egy szín hiányzik valamihez, kérdezz.

### Komponensek

- Minden UI elem `@radix-ui/themes` komponensből jön. Ne írj kézzel gombot,
  inputot, selectet, dialógust, táblázatot. Ha hiányzik valami, kérdezz.
- Theme beállítás (`app/src/App.tsx`): `accentColor="brown" grayColor="slate"
  radius="small" scaling="95%"`.
- Kivételek, amik kézzel írtak maradnak: a fogtérkép (funkcionális,
  kattintható/billentyűzetes SVG adatvizualizáció ÉS beviteli eszköz —
  lásd `components/DentalChart.tsx`, `design/toothChartSvg.ts`) és a
  nyomtatvány (`pdf/TervDocument.tsx`, A4 layout).
- Soronkénti akciók: **legfeljebb két látható gomb egy adatsoron** (nulla
  is rendben van), a többi Radix Themes `DropdownMenu`-ba. A trigger `⋯`
  (`DotsHorizontalIcon`) `IconButton`, és az `aria-label`-jének
  tartalmaznia kell a SOR azonosítóját (pl. `Fogpótlás — v2 — további
  műveletek` — a Korábbi tervek verziósorán a terv-lánc címkéje IS kell,
  mert egy páciensnek több lánca is lehet, mindegyik saját `v1`-gyel
  indulva, D29), nem lehet csupasz „További műveletek" — egy listában
  több sor is van, azonos accessible name-mel képernyőolvasóval
  megkülönböztethetetlenek. Ez a lista-jellegű sorokra vonatkozik (pl.
  `PlanHistoryPage` verziósora), ahol a gombok a TELJES sorra ható
  akciók. A szerkesztő `LineRow`-jának saját mezőjéhez kötött vezérlői
  (a Fog mező melletti fogválasztó, az Ajánlati ár melletti `≈` becsült-ár
  kapcsoló, a Db mező melletti ⟳ visszakapcsoló, D32) nem esnek e szabály
  alá — mindegyik a saját cellájának mezőjét szerkeszti, nem a sorra ható
  akció.
  A menü első eleme a kockázatmentes/olvasó művelet, utána — elválasztóval
  — a többi, gyakoriság szerint. Hosszú, didaktikus feliratot csak menüben
  használj (ott egymás alatt állnak); egy sorban egymás mellett rövidnek
  kell lenniük. A menüből nyíló megerősítő dialógusnál a
  `DropdownMenu.Content` `onCloseAutoFocus`-át meg kell előzni, különben a
  záró menü visszaveszi a fókuszt a dialógus elől (lásd
  `pages/PlanHistoryPage.tsx`).
- Lenyíló/összecsukható panel (pl. a tervszerkesztő „Érintett fogak"
  fogtérkép-panelje, `components/ToothChartPanel.tsx`): egy `useState`
  boolean + feltételes render, Radix Themes `Button` triggerrel
  (`aria-expanded` + `aria-controls`). Nincs `@radix-ui/react-collapsible`
  vagy hasonló hozzáadva — a `@radix-ui/themes@3`-ban amúgy sincs
  Collapsible/Accordion komponens, ez a minta nem igényel újat. A trigger
  csukott/nyitott állapotot chevron ikonnal jelzi
  (`ChevronRightIcon`/`ChevronDownIcon`), nincs nyitás/csukás-animáció
  (lásd „Amit soha ne csinálj").
- Mezős felugró ablak (pl. az Árlista admin „Új tétel" dialógusa,
  `pages/priceListAdmin/UjTetelDialog.tsx`): Radix Themes `Dialog`
  (`Dialog.Root/Content/Title/Description/Close`), NEM `AlertDialog` — az
  utóbbi megerősítésre való, nincs benne mező. Explicit Mentés + „Mégse"
  gombpár (a „Mégse" felirat és a `variant="soft" color="gray"` stílus
  ugyanaz a projektszintű konvenció, mint az `AlertDialog.Cancel`-nél),
  Escape és a Mégse gomb is nyomtalanul eldobja a piszkozatot — semmi nem
  kerül a törzsadatba a Mentés gomb megnyomása előtt. Hibaszöveg az input
  ALATT jelenik meg (lásd „Akadálymentesség"), a Mentés gomb nem tiltott —
  kattintásra mutatja meg a hibákat, hogy legyen mit mondania.
- Megerősítő dialógus (Radix Themes `AlertDialog`): `Cancel` mindig
  „Mégse" (`variant="soft" color="gray"`). Ha a törlést/felülírást kérő
  trigger-gomb listázott elemenként ismétlődik (pl. soronkénti „Fázis
  törlése"), és a dialógus nyitva léte alatt is a DOM-ban marad a többi
  sor triggere, az `Action` gombnak **nem szabad** a trigger feliratát
  megismételnie — accessible name-mel megkülönböztethetetlen lenne a még
  látható triggerektől. Rövidebb, egyértelmű felirat (pl. „Törlés") elég,
  ha a dialógus címe már egyértelművé teszi, mi történik
  (`pages/PlanHistoryPage.tsx`, `pages/PlanEditorPage.tsx`).

### Szín, forma, sűrűség

- EGY akcentus az egész appban. Nincs második kiemelőszín. **Nevesített
  kivétel: a fogtérkép kezelés-kategóriánkénti színezése** — ott a szín
  információt hordoz (melyik fogat milyen kezelés érinti), nem díszítés.
  A tényleges szín az árlista `Kategoria.szin` mezőjén él (a Kategóriák
  panelen szerkeszthető, kurált palettából, `docs/03-funkcionalis-spec.md`
  § 6. Árlista admin); a *választható* paletta (`KATEGORIA_PALETTA`) és az
  eltévedt hivatkozás fix tartalék-színe (`ISMERETLEN_KATEGORIA`) viszont
  EGYETLEN helyen, `app/src/design/treatmentVisuals.ts`-ben él — a
  szerkesztő és a nyomtatvány is innen (illetve az árlista-adatból) olvas,
  ne vezess be hozzá második definíciót. Egy fogon több kezelés esetén a
  legkisebb `sorrend`-ű kategória színe nyer — a kategórialista sorrendje
  egyben az ütközési prioritás (D28, `resolveToothVisual`).
  Ugyanígy nevesített kivétel a fogtérkép kattintható módjának
  kurzor-/kijelölés-gyűrűje (`.is-active`/`.is-picked`,
  `design/toothChartSvg.ts`): `ink` (semleges, billentyűzetes kurzor) és
  `accent` (kijelölés a soronkénti választóban) `stroke`-ként, SOSEM
  szövegszínként — ez a `accent` egyetlen engedélyezett felhasználási
  módja a díszítővonalon kívül.
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
- A HUF/EUR számformátum pontos szabálya és a `toLocaleString()` tiltása:
  lásd `docs/04-nyomtatvany-spec.md` „Számformátum" — egy szerződéses
  formátumszabálynak egy forrása van, ne duplikáld itt.

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
- A fogtérkép (kattintható módban) EGY Tab-megállóként érhető el, nem
  32-ként — a fogak közti mozgás nyilakkal (roving kurzor,
  `aria-activedescendant`), `Enter`/`Szóköz` aktivál. 32 külön Tab-megálló
  szétverné a Tab-sorrendet egy már amúgy is sűrű oldalon.
- A tervszerkesztőben a fogtérkép egy csukott panel mögött van (lásd
  „Komponensek"): csukva a panel triggere az egyetlen Tab-megálló, a
  fogtérkép feltételes renderrel teljesen kiesik a Tab-sorrendből (nem
  csak CSS-sel rejtett); nyitva a fenti egy-Tab-megálló szabály él.

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

- A nyomtatvány elrendezése (`docs/04-nyomtatvany-spec.md` szabályozza).
- A `terv.json` és `arlista.json` sémák, mezőnevek, `schemaVersion`.
- Az útvonalak és a fájlrendszer mappastruktúrája.
- A tétel-azonosítók (soha nem használhatók újra).

### Amit soha ne csinálj ebben a projektben

- Ne alakítsd az árlistát vagy a tervtáblázatot carousellé, marquee-vé,
  scroll-snap pillekké vagy kártyaráccsá. Ez adattábla, listának kell
  maradnia.
- Ne tegyél animációt oda, ahol nincs visszajelzési funkciója.
- Ne generálj kép- vagy illusztrációs tartalmat.
- Ne vezess be második UI könyvtárat a Radix mellé.
- Ne írj kézzel SVG ikont. Ikon a `@radix-ui/react-icons`-ból jön. A
  soronkénti fogválasztó gombja (`Fog` mező mellett,
  `components/ToothPickerPopover.tsx`) a `Crosshair2Icon`-t használja —
  nincs kivétel, a `@radix-ui/react-icons` marad kötelező mindenhol.
  **Nevesített kivétel:** a soronkénti „Becsült ár" kapcsoló (`LineRow`
  ár-cella) tartalma egy `≈` **szövegglyph** ghost `IconButton`-ban, nem
  SVG ikon — ez nem ikon, tehát nem sérti a fenti szabályt, de tudatos: a
  csillag-ikon szándékosan ki van zárva, mert összetéveszthető lenne az
  Árlista admin „gyakori" csillagával. Ne cseréld SVG-re.

### Ellenőrzés valódi böngészőben

A fenti szabályok egy része a vitest-készlettel **strukturálisan nem**
ellenőrizhető: a tesztkészlet (`app/src/test-setup.ts`) nem tölti be a Radix
Themes CSS-t és a Robotót, tehát egyetlen computed style sem a kaszkádból
származik benne — a kontraszt, a `controlBorder` és a fókuszgyűrű szabályok
lefedettsége jsdom alatt nulla. Ugyanígy: `paint-order` nincs jsdom-ban
implementálva, a `ResizeObserver`/pointer capture stubolt (Radix
popover-geometria nem tesztelhető), és a valódi PDF/canvas→PNG fogtérkép út
mockolt/`null`-t ad minden tesztben.

Ezeket a `.claude/skills/browser-validation/` skill ellenőrzi, kézzel
indítva, izolált Chrome-ban (chrome-devtools MCP) — lásd a skill `SKILL.md`-jét
a protokollért és a `checklist.md`-t a konkrét ellenőrzésekért. Nem CI-ban fut,
nem helyettesíti a vitest-készletet, csak azt a réteget fedi, amit az
strukturálisan nem tud elérni.
