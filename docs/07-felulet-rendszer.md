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
| `controlBorder` | `#64748B` | Minden interaktív kontroll (input, gomb, chip, dropdown) kerete — WCAG 1.4.11, 3:1. A keret `inset` box-shadow, tehát **két szomszédja van**: kívül a szülőfelület, belül a kontroll saját kitöltése (pl. egy `soft` gomb `accent-a3`/`a4`/`a5` washe) — utóbbi a szigorúbb mérce, mert sötétebb, mint a lap háttere. Nem az `uiLine`, az ahhoz túl halvány. **Kivétel 1: a `solid` Button variáns** — saját kitöltése már 3:1 fölött van a lap hátterével szemben, a határa keret nélkül is látszik. **Kivétel 2 (2026-08-10, tudatos vizuális döntés): minden `IconButton`** — ezekre a WCAG 1.4.11 3:1 SZÁNDÉKOSAN nem teljesül, méretüktől és elhelyezkedésüktől függetlenül; egy `size="1"` IconButton glyph-nyi dobozán, több egymás mellett egy sűrű sorban, a kötelező keret vizuálisan túl súlyosnak (feketés dobozkeretnek) bizonyult, és a `controlBorder` értéke már a legvilágosabb WCAG-megfelelő szín (lásd fent) — nincs lejjebb vinni való. **Kivétel 3 (2026-08-11, tudatos vizuális döntés): a Button `ghost` variánsa** — ugyanaz a jelenség, mint a Kivétel 2-nél, csak a Buttonon: a `ghost` variánsnak nincs saját kitöltése, kizárólag szövegszintű kapcsolóként használjuk sűrű sorokban (pl. `components/PatientPlanChains.tsx` lánc-fejléc toggle, `PlanEditorPage.tsx` „Leírás"/„+ leírás"), ahol a kötelező hajszálvonal ugyanúgy feketés dobozkeretnek hat. Minden más interaktív kontrollra (Button `soft`, `TextField`, `Checkbox`, `SegmentedControl` — a `ChipGroup` és a közvetlen használat is —, `Select.Trigger` `surface`/`soft`/`ghost` variánsa) kivétel nélkül vonatkozik — lásd a globális CSS-szabályt (`app/src/index.css`, Radix `.rt-*` osztályaira célozva, mert Radix a keretet box-shadow-val rajzolja, nem border-rel) |
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
- Egy szekciócímes kártya-blokk (`Card` + félkövér, `t.brand` színű cím
  fölötte) a `components/Section.tsx` közös primitívje — korábban öt
  helyen volt másolat-beillesztve (Terv adatai lap mindegyik szekciója,
  Beállítások Rendelő adatai/Orvosok/Ajánlat és nyelv tabjai). Ne írj hozzá
  hatodik másolatot, és ne tegyél `Card`-ot egy `Section` köré (dupla
  keret).
- Theme beállítás (`app/src/App.tsx`): `accentColor="brown" grayColor="slate"
  radius="small" scaling="95%"`.
- A sikeres mentés „Mentve ✓” jelzése egy megosztott `saving`/`saved`
  primitívre épül (`components/useMentesJelzo.ts`) — korábban négyszer
  másolat-beillesztve, egy időzítő-takarítási hibával mindegyikben (egy
  Radix tab-váltás unmountolhatta a komponenst a 2 másodperces `setTimeout`
  belül). Két, egymástól független fogyasztási mód: **gombfeliratos**
  (`Beállítások` mindhárom tabja, Árlista admin Kategóriák panelje —
  alap → „Mentés…” → „Mentve ✓”, a felirat szó szerint ismétlődik minden
  hívási helyen, `docs/07-felulet-rendszer.md` § Nyelv és szövegek elve
  szerint) és **csupasz jelző** (Árlista admin tétel-táblázata — a sor
  jobb szélén, halk szürke szöveg, `saving` köztes állapot nélkül, mert az
  írás gyakorlatilag azonnali). Minden sikeres jelzés újraindítja a 2
  másodperces órát; a jelzés a memóriabeli állapotfrissítés helyett
  KIZÁRÓLAG a tényleges mentés sikeres lefutása után gyullad ki (D31).
  Szándékosan nem zöld — az app a zöldet a véglegesítés lezárásának
  tartja fenn (`PreviewPage` sikerképernyője). Egy lap-szintű,
  `aria-live="polite"` élő régió (Radix `VisuallyHidden`) kíséri, a
  `pages/PaciensekPage.tsx` egyetlen meglévő `aria-live`-mintáján — nem
  soronkénti/mezőnkénti régió, hogy egy dinamikusan beszúrt élő régiót ne
  hagyjon ki a képernyőolvasó, és hogy gépelés közben ne karakterenként
  szólaljon meg.
- Kivételek, amik kézzel írtak maradnak: a fogtérkép (funkcionális,
  kattintható/billentyűzetes SVG adatvizualizáció ÉS beviteli eszköz —
  lásd `components/DentalChart.tsx`, `design/toothChartSvg.ts`) és a
  nyomtatvány (`pdf/TervDocument.tsx`, A4 layout).
- A `components/NumberField.tsx` fókuszáláskor a teljes tartalmát kijelöli
  (Excel-cella jelleg — rövid, egyben lecserélendő atomi érték), hogy a régi
  érték törlése nélküli gépelés ne fűzze a beírt számjegyeket a meglévő
  érték végéhez. Ez SZÁNDÉKOSAN nem terjed ki a
  `pages/priceListAdmin/BufferedFields.tsx` (`BufferedTextField`/
  `BufferedTextArea`, tétel név/leírás) mezőire — ott a doki tipikusan egy
  mondat KÖZEPÉBE kattint egy elgépelés javításához, ahol a teljes kijelölés
  többet ártana, mint használna.
- `Table.Root` sűrűsége a sor szerepétől függ: `size="1"` a sűrű
  szerkesztőrácsokon (Árlista admin tétel-/kategória-táblázata, a
  tervszerkesztő sortáblázata), `size="2"` a letapogatásra/kattintásra
  szánt navigációs listákon (Pácienslista, D47) — utóbbi ~42px sormagasságot
  ad kézi érték nélkül. Az oszlopfejléc félkövér, `t.brand` színnel — ugyanaz
  a stílus, mint az Árlista admin kategória-fejlécén (`Text weight="bold"
  style={{ color: t.brand }}`), a méret nem nő vele (`size="2"`, a
  Radix-alapértelmezett félkövérrel egybeesik). A sor hover/fókusz háttere
  `accentWash` (az app
  meglévő „kijelölt sor" tokenje) a Radix `--table-row-background-color`
  változóján át felülírva (`index.css`, `main.tsx` írja be `tokens.ts`
  `accentWash`-ából) — egy `<tr>`-re tett közvetlen `background` a cellák
  saját háttere MÖGÉ kerülne, mert a Radix soronként, cellánként rajzol.
- Soronkénti akciók: **legfeljebb két látható gomb egy adatsoron** (nulla
  is rendben van), a többi Radix Themes `DropdownMenu`-ba. A trigger `⋯`
  (`DotsHorizontalIcon`) `IconButton`, és az `aria-label`-jének
  tartalmaznia kell a SOR azonosítóját (pl. `Fogpótlás — v2 — további
  műveletek` — a terv-lánc fa verziósorán a terv-lánc címkéje IS kell,
  mert egy páciensnek több lánca is lehet, mindegyik saját `v1`-gyel
  indulva, D29), nem lehet csupasz „További műveletek" — egy listában
  több sor is van, azonos accessible name-mel képernyőolvasóval
  megkülönböztethetetlenek. Ez a lista-jellegű sorokra vonatkozik (pl.
  `PatientPlanChains` verziósora), ahol a gombok a TELJES sorra ható
  akciók — ugyanez a szabály vonatkozik egy szerkeszthető lista soronkénti
  checkboxára is (pl. a Beállítások Orvosok listájának „Aktív" checkboxa,
  `aria-label={\`${nev} aktív\`}`, D67), nem csak az `IconButton`-okra. Egy
  ilyen soron belüli **állapotváltó** toggle (pl. az Árlista admin
  „Aktív"/„Gyakori tétel" `IconButton`-ja) `aria-label`-je azt az AKCIÓT
  nevezi meg, amit a kattintás a jelenlegi állapotból kivált (`<név>
  inaktiválása`/`<név> aktiválása`), nem magát az állapotot — egy statikus
  „Aktív" felirat egy már inaktivált tételnél is „Aktív"-ot mondana,
  miközben az állapotot csak az ikon-alak és a sor áttetszősége jelzi,
  ami képernyőolvasóval nem érhető el. A szerkesztő `LineRow`-jának saját mezőjéhez kötött vezérlői (a Fog mező
  melletti fogválasztó, az Ajánlati ár mező alatti `≈` becsült-ár
  kapcsoló, a Db mező melletti ⟳ visszakapcsoló, D32, valamint a név/ár/
  leírás mezőnkénti reset-vezérlők, D65) nem esnek e szabály alá —
  mindegyik a saját cellájának mezőjét szerkeszti, nem a sorra ható
  akció. NÉVESÍTETT KIVÉTEL: a tervszerkesztő fázisfejléce (`PhaseSection`,
  `pages/planEditor/PhaseSection.tsx`) ↑/↓ sorrendező nyilat ÉS kuka-ikont is
  mutat egyszerre (három látható gomb) — ez NEM lista-jellegű adatsor, hanem
  szekciófejléc egy fix számú (jellemzően 1-3 elemű) listában, ugyanaz a
  besorolás, mint az Árlista admin kategória-sora
  (`pages/priceListAdmin/KategoriaPanel.tsx`), ami már ma is ugyanezt a
  hármat mutatja.
  A menü első eleme a kockázatmentes/olvasó művelet, utána — elválasztóval
  — a többi, gyakoriság szerint. Hosszú, didaktikus feliratot csak menüben
  használj (ott egymás alatt állnak); egy sorban egymás mellett rövidnek
  kell lenniük. A menüből nyíló megerősítő dialógusnál a
  `DropdownMenu.Content` `onCloseAutoFocus`-át meg kell előzni, különben a
  záró menü visszaveszi a fókuszt a dialógus elől (lásd
  `pages/demo/OsszesTervSection.tsx`).
- Egy-entitásos (nem sorbeli) `⋯` menü (pl. a páciens-részletoldal sticky
  fejlécének törlés-menüje, D50, `pages/PatientDetailPage.tsx`): ugyanaz a
  `DropdownMenu` felépítés, de az `aria-label` SZÁNDÉKOSAN NEM a fenti
  soros-akció „...további műveletek” végződésű konvencióját követi (itt
  nincs több azonos-nevű sor, amitől meg kellene különböztetni) — elég
  egyedi, de úgy, hogy NE illeszkedjen a sorbeli minta tesztjeinek
  `/további műveletek$/` lekérdezésére (`testQueries.ts` `verzioMenupont`)
  — két találat lenne egy oldalon. Egy
  feltételesen letiltott, kockázatos menüpont (pl. „Páciens törlése", ha a
  törlési feltétel nem teljesül) `DropdownMenu.Item disabled` marad
  látható állapotban — nem tűnik el —, alatta egy `DropdownMenu.Separator`
  + `DropdownMenu.Label` rövid indoklással, hogy a doki lássa, miért nem
  törölhető, nem csak azt, hogy nem törölhető. A destruktív menüpont
  `color="red"`.
- Lenyíló/összecsukható panel (pl. a tervszerkesztő „Érintett fogak"
  fogtérkép-panelje, `components/ToothChartPanel.tsx`, és a Terv részletei
  read-only megfelelője, `pages/tervReszletei/FogterkepPanel.tsx`): egy
  `useState` boolean + feltételes render, Radix Themes `Button` triggerrel
  (`aria-expanded` + `aria-controls`). Nincs `@radix-ui/react-collapsible`
  vagy hasonló hozzáadva — a `@radix-ui/themes@3`-ban amúgy sincs
  Collapsible/Accordion komponens, ez a minta nem igényel újat. A trigger
  csukott/nyitott állapotot chevron ikonnal jelzi
  (`ChevronRightIcon`/`ChevronDownIcon`), nincs nyitás/csukás-animáció
  (lásd „Amit soha ne csinálj"). A `DentalChart` (`components/
  DentalChart.tsx`) ARIA-módját egy explicit `szerep: 'button' | 'option'`
  prop dönti el, NEM a `selectedTeeth` megléte — a `selectedTeeth` mindkét
  módban értelmes (a kijelölés-gyűrű vizuális, a `szerep`-től független),
  csak az `aria-selected`/`aria-pressed` közti választás jön a `szerep`-ből.
  A soronkénti fogválasztó (`ToothPickerPopover`) explicit `szerep="option"`-t
  ad; a plan-szintű térképek (szerkesztő és Terv részletei) az
  alapértelmezett `'button'`-t.
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
  (`components/PatientPlanChains.tsx`, `pages/PlanEditorPage.tsx`).
- Explicit Mentés/Mégse gombpárral szerkesztett mezőkészlet (D38): a
  dirty-detektálás közös hookon (`components/useDirtyDraft.ts`
  `useDirtyDraft`/`draftDirty`), a szerkesztett elem elhagyása előtti
  megerősítés közös komponensen (`components/DiscardChangesDialog.tsx`
  `useDiscardGuard`/`DiscardChangesDialog`) megy át — nem bespoke
  `JSON.stringify`-összehasonlítás és másolat-beillesztett `AlertDialog`
  hívási helyenként. A guard hatóköre a Mégse gomb, a lapon belüli
  elem-váltás (sor-/tab-váltás) ÉS a NavBar-navigáció (D46,
  `components/NavGuardContext.tsx` — a védett felület egy plusz
  `useNavGuard(dirty)` hívással regisztrál, a NavBar a MEGLÉVŐ
  `useDiscardGuard`-ot hívja újra a megosztott jelzőre); NINCS
  böngésző-/router-szintű navigáció-blokkolás (böngésző vissza/előre, F5,
  URL-sáv átírás — ehhez data router kellene, a `HashRouter` nem
  támogatja). Hívó felületek: `components/PatientEditorPanel.tsx` (a
  `pages/PatientDetailPage.tsx`-en át), `pages/SettingsPage.tsx` mindhárom
  tabja (D49 — `pages/settings/RendeloTab.tsx`/`NyomtatvanyokTab.tsx`/
  `EgyebTab.tsx`, a lap egyetlen közös `dirty` state-jén át). Az Árlista
  admin Kategóriák paneljének attribútum-szerkesztése (HU/DE név, szín,
  sorrend) szintén ezen a primitíven megy át
  (`pages/priceListAdmin/KategoriaPanel.tsx` `KategoriaPanel`/`KategoriaPanelBody`) —
  a panel becsukása a tab-váltáshoz hasonlóan ténylegesen eldobja a
  draftot, ezért kér megerősítést. A tétel-szerkesztés és a kategória
  létrehozása/törlése ugyanazon a lapon VÁLTOZATLANUL autosave marad —
  ezek nem illenek egy Mégse-vel visszavonható draft-modellbe.
- Mezőnkénti összevető/szinkron-dialógus (D48, `components/TorzsadatDiffDialog.tsx`)
  — a fenti „Mezős felugró ablak” mintájának checkbox-listás változata:
  Radix Themes `Dialog`, mert tényleges mezőválasztás történik benne, nem
  puszta megerősítés. Alapból SEMMI nincs kijelölve, egy „Összes kijelölése”
  checkbox fölötte. **Külön guard-mechanizmus a D38/D46 fenti
  „van nem mentett módosítás” primitívjétől**
  (`components/LepesGuardContext.tsx`) — az egy AJÁNLATOT ad
  (frissítenéd a törzsadatot, mielőtt továbblépsz?), nem adatvesztés elleni
  blokkot; a terv-piszkozat úgyis autosave-el (D37), tehát a D38 dirty-
  fogalma itt nem értelmezhető. Csak a Terv adatai lap "Tovább" gombja és a
  workflow-stepper Kezelések/Előnézet linkjei hívják — a NavBar-navigációt a
  D46 guard fedi, a kettő nem keveredik egy felületen.
- Checkbox-listás dialógus, FORDÍTOTT alapállapottal (Tömeges árváltoztatás,
  `pages/priceListAdmin/TomegesArDialog.tsx`, `docs/03-funkcionalis-spec.md`
  § 6. Kezelések és árak): a fenti „Alapból SEMMI nincs kijelölve” szabály
  alól tudatos kivétel — itt alapból MINDEN módosítható sor ki van pipálva,
  a soronkénti pipa kivétel-jelölő (opt-out), nem beleegyezés (opt-in). A
  különbség oka: a mezőnkénti összevető/szinkron-dialógusnál a dialógus MAGA
  az ajánlat — a program veti fel, hogy két adatforrás eltér, és az üres
  kiindulás védi a dokit egy nem kért felülírástól. A Tömeges
  árváltoztatásnál fordított a helyzet: a szándékot a doki már kimondta a
  kör-választóval (pl. „az egész Implantológia +5%”), a dialógus csak
  végrehajtja — egy 118 tételes körnél az üres kiindulás azt jelentené,
  hogy az első kattintás mindig az „Összes kijelölése”, ami rítus, nem
  védelem.
- Read-only label+érték adatnézet (D45): `components/Field.tsx`
  `ReadOnlyField` — a `FieldGroup`-ra épül (NEM a `Field`-re, lásd a
  `Field.tsx` fejléckommentjét: egy `<label>` statikus szöveg köré téve
  elrontaná az accessible name számítást). A halvány címke/erős érték
  kontraszt a Radix `color="gray"` propból jön, nem külön tokenből. Az
  app EGYETLEN hiányzó-érték jelölése az em dash (`—`) — ezt használja a
  `ReadOnlyField` is, nem egy külön „Nincs megadva”-szerű szöveget, hogy
  ne éljen két versengő „nincs adat” nyelv egymás mellett
  (`components/PatientPlanChains.tsx`, `pdf/TervDocument.tsx` ugyanezt
  a jelölést használja).
- Fülek (Radix Themes `Tabs`): a `DemoPage.tsx` (backlog-29) UNCONTROLLED
  (`defaultValue`, nincs URL-/state-szinkron); a `PatientDetailPage.tsx`
  (backlog-30) és a `SettingsPage.tsx` (D49) CONTROLLED (`value`/
  `onValueChange`) — utóbbiak azért, mert a tab-váltási guard (D38, lásd
  § 10) kell tudja elfogni, mielőtt ténylegesen megtörténik (a
  `PatientDetailPage.tsx`-nél emellett a kezdő tabot is a hívó,
  `location.state`, vezérli; a `SettingsPage.tsx` mindig a `Rendelő
  adatai` tabon nyit). **Teszt-gotcha**: a
  `Tabs.Trigger` egy második, csak CSS-sel (`visibility: hidden`) takart
  span-t is renderel a felirat mellé (szélesség-tartalék, hogy a kijelölt/
  nem kijelölt vastagság ne tördelje újra a sávot) — a vitest-készlet nem
  tölti be a Radix Themes CSS-t, ezért az accessible name jsdom alatt
  duplázva számít ki (pl. „FunkciókFunkciók"). A `getByRole('tab', ...)`
  ezért mindig regexet kapjon névre (`{ name: /Funkciók/ }`), nem pontos
  stringet — lásd `DemoPage.test.tsx`/`PatientDetailPage.test.tsx`/
  `SettingsPage.test.tsx`.
- Több felületen közös komponens BEÁGYAZOTT példánya (pl.
  `components/PatientPlanChains.tsx` a páciens-részletoldal `Kezelési
  tervek` tabjában, D44) nem ismételheti meg azt, amit a körülvevő felület
  már kimond: az entitás nevét, ha van sticky fejléc, és egy navigációs
  célt, ha ugyanoda a tab-sáv vagy a fő navigáció is elvisz. A változatot a
  hívó adja meg egy explicit, KÖTELEZŐ propon — alapértelmezés nélkül,
  mert melyik alak a helyes, kizárólag a körülvevő felületből következik —,
  nem a komponens találgatja `useLocation()`-nel vagy hasonlóval.
- Breadcrumb + workflow stepper (`components/TervWorkflowShell.tsx`,
  D36): a `@radix-ui/themes@3`-ban nincs Breadcrumb/Stepper primitív, ezért
  `Flex`/`Link`/`Badge`/`Text`-ből épül, nem kézzel írt HTML-ből. Mindkettő
  saját `<nav aria-label="…">` landmark, az aktív stepper-lépésen
  `aria-current="step"`. A lépések react-router **linkek, nem gombok** —
  natív "megnyitás új lapon" és normál Tab-sorrend, nem a fogtérkép
  roving-kurzoros mintája. A sorszám-`Badge` `aria-hidden`, a link saját
  `aria-label`-je a tiszta lépésfelirat — enélkül a Badge számjegye
  belefolyna az accessible name-be (pl. „1Terv adatai”), és a „Kezelések”
  lépés ütközne a NavBar „Kezelések és árak” linkjével.
- Nem-modális, session-jellegű, több oldalon átívelő állapotsáv (pl.
  `components/NyelviReviewBar.tsx`, 65. tétel, D72): a `TervWorkflowShell.tsx`
  rendereli, a workflow-stepper ALATT, `position: sticky; top: 0`, `t.page`
  háttér helyett `t.accentWash`-sal (a `PatientDetailHeader.tsx` sticky
  mintája, de vizuálisan megkülönböztethető tőle — ez nem entitás-fejléc,
  hanem egy folyamatban lévő, félbeszakítható munkafolyamat jelzése). SOHA
  nem modal/AlertDialog — a normál navigáció (más route-ra kattintás)
  végig engedett, a sáv csak követi a dokit, nem zárja el az utat.
- Entitás-fejléc + akciósáv EGY sticky sávban (`pages/TervReszleteiPage.tsx`,
  § 11): a `PatientDetailHeader.tsx` mintáján (`position: sticky; top: 0`,
  `t.page` háttér), de a fejléc mellett közvetlenül a lap akciógombjait is
  hordozza — nem külön sáv, mert itt nincs tabsor/workflow-stepper, aminek a
  helyet át kellene adnia.

### Szín, forma, sűrűség

- EGY akcentus az egész appban. Nincs második kiemelőszín. **Nevesített
  kivétel: a fogtérkép kezelés-kategóriánkénti színezése** — ott a szín
  információt hordoz (melyik fogat milyen kezelés érinti), nem díszítés.
  A tényleges szín az árlista `Kategoria.szin` mezőjén él (a Kategóriák
  panelen szerkeszthető, kurált palettából, `docs/03-funkcionalis-spec.md`
  § 6. Kezelések és árak); a *választható* paletta (`KATEGORIA_PALETTA`) és az
  eltévedt hivatkozás fix tartalék-színe (`ISMERETLEN_KATEGORIA`) viszont
  EGYETLEN helyen, `app/src/design/treatmentVisuals.ts`-ben él — a
  szerkesztő és a nyomtatvány is innen (illetve az árlista-adatból) olvas,
  ne vezess be hozzá második definíciót. Egy fogon több kezelés esetén a
  legkisebb `sorrend`-ű kategória színe nyer — a kategórialista sorrendje
  egyben az ütközési prioritás (D28, `resolveToothVisual`).
  Ugyanígy nevesített kivétel a fogtérkép kattintható módjának
  kurzor-/kijelölés-gyűrűje (`.is-active`/`.is-picked`,
  `design/toothChartSvg.ts`): `ink` (semleges, billentyűzetes kurzor) és
  `accent` (kijelölés) `stroke`-ként, SOSEM szövegszínként — ez a `accent`
  egyetlen engedélyezett felhasználási módja a díszítővonalon kívül. A
  kurzor kétrétegű: az `ink` mag köré egy fehér kontraszt-réteg kerül, hogy
  a fog fekete vonalrajza mellett is elváljon — mindkét réteg (és a
  kijelölés-gyűrű is) képernyő-állandó CSS-pixelben vastag
  (`vector-effect:non-scaling-stroke`), nem a rajz viewBox-egységében, hogy
  a soronkénti választó (340 px) és a plan-szintű panelek (480 px) között
  ne térjen el. Egy egyszerre fókuszált ÉS kijelölt fogon mindkét gyűrű
  egyszerre látszik, koncentrikus sávokként, egymást nem takarva — a fog a
  MÁR felvett fogain lépkedve ez a leggyakoribb eset. A kurzor csak a
  fogtérkép billentyűzet-fókuszában (`:focus-visible`) jelenik meg, hogy
  egy soha meg nem érintett fogtérképen ne üljön tartós, kijelölésnek
  olvasható jelölés a kezdő fogon.
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
- Az „Új terv indítása" köztes páciensválasztó (D40,
  `docs/03-funkcionalis-spec.md` § Új terv indítása) ugyanezt a gépel ->
  nyíl -> Enter/Esc ciklust követi — a találati/recents sorok viszont
  valódi Radix `Button`-ok maradnak (nem `ItemPicker`-stílusú, Tab-
  sorrendből kieső div-ek), a nyíl-navigáció egy vizuális kiemelés-réteg
  fölöttük.
- Minden interaktív elemen látható fókusz gyűrű. Ne tüntesd el outline: none-nal.
- Escape zár dialógust és keresőt.
- A fogtérkép (kattintható módban) EGY Tab-megállóként érhető el, nem
  32-ként — a fogak közti mozgás nyilakkal (roving kurzor,
  `aria-activedescendant`), `Enter`/`Szóköz` aktivál. 32 külön Tab-megálló
  szétverné a Tab-sorrendet egy már amúgy is sűrű oldalon. A wrapper a
  Radix minden más kontrolljával egyező `--focus-8` fókuszgyűrűt kapja
  (`:focus-visible`), nem a böngésző alapértelmezését.
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
