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

**1. Nyomtatvány (`app/src/pdf/TervDocument.tsx`, prototípus:
`ui/PrintPreview.jsx`) — ezt a PÁCIENS látja.**
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
| `ink` | `#2D2D2D` | Elsődleges gomb háttere (a honlap gombszíne), 13,77:1 |
| `text` | `#1A1A1A` | Törzsszöveg, mindkét felület használja |
| `uiTextMuted` / `uiTextFaint` | `#475569` / `#64748B` | App-oldali halvány szöveg (slate-600/500) |
| `uiLine` / `uiLineStrong` | `#E2E8F0` / `#CBD5E1` | App-oldali díszítő hajszálvonal — **csak** sorelválasztóra, nem interaktív keretre |
| `controlBorder` | `#8896AB` | Minden interaktív kontroll (input, gomb, chip, dropdown) kerete — 3,00:1, WCAG 1.4.11. Nem az `uiLine`, az ahhoz túl halvány |
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
- Lenyíló/összecsukható panel (pl. a tervszerkesztő „Érintett fogak"
  fogtérkép-panelje, `components/ToothChartPanel.tsx`): egy `useState`
  boolean + feltételes render, Radix Themes `Button` triggerrel
  (`aria-expanded` + `aria-controls`). Nincs `@radix-ui/react-collapsible`
  vagy hasonló hozzáadva — a `@radix-ui/themes@3`-ban amúgy sincs
  Collapsible/Accordion komponens, ez a minta nem igényel újat. A trigger
  csukott/nyitott állapotot chevron ikonnal jelzi
  (`ChevronRightIcon`/`ChevronDownIcon`), nincs nyitás/csukás-animáció
  (lásd „Amit soha ne csinálj").

### Szín, forma, sűrűség

- EGY akcentus az egész appban. Nincs második kiemelőszín. **Nevesített
  kivétel: a fogtérkép kezelés-kategóriánkénti palettája**
  (`app/src/design/treatmentVisuals.ts`) — ott a szín információt hordoz
  (melyik fogat milyen kezelés érinti), nem díszítés. Ez a paletta EGYETLEN
  helyen, ebben a fájlban él, a szerkesztő és a nyomtatvány is innen olvas
  — ne vezess be hozzá második definíciót.
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
- Ne írj kézzel SVG ikont. Ikon a `@radix-ui/react-icons`-ból jön. **Egyetlen
  nevesített kivétel:** a soronkénti fogválasztó gombja (`Fog` mező mellett,
  `components/ToothPickerPopover.tsx`) és az „Érintett fogak" panel triggere
  (`components/ToothChartPanel.tsx`) 🦷 emojit használ — a
  `@radix-ui/react-icons`-ban nincs fog ikon, a korábbi `GridIcon` (rács)
  félrevezető volt. Az emoji `aria-hidden`, a gomb akadálymentes neve mindig
  szöveges (`aria-label` vagy a gomb felirata). Ne terjeszd ki más ikonra —
  minden más helyen `@radix-ui/react-icons` marad kötelező.
