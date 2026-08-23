# Backlog 73. tétel — Final fogtérkép navigáció — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 73. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-062
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D176`, `D266`–`D277` a redesign saját D1–D606 számozásából valók — NEM
azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Priority:** P3 — a forrásdokumentum (`03_dental-plan-implementacios-
backlog-javaslat.md`) saját besorolása szerint is alacsonyabb prioritású:
ritkábban használt kényelmi navigáció, nem blokkolja a szakasz többi,
P1-es részét (71./72./74./75. tétel önmagukban is teljes, használható
lapot adnak nélküle).

**Sorrendi függőség:** a 71. tételre (DP-060, a `key`-alapú
verzióváltás-reset minta) és a 72. tételre (DP-061, a sorok, amikhez a
kattintás navigál) épül.

## Probléma

Ma nincs read-only, kattintható fogtérkép-navigáció sehol az appban — a
`DentalChart.tsx` két meglévő interakciós módja (a plan-szintű
`onToothClick` a szerkesztőben, ill. a soronkénti `ToothPickerPopover`
`listbox`-módja) mindkettő ÍRÁSI célra épült (új sor felvétele / fogak
kiválasztása egy sorhoz), nem NAVIGÁCIÓRA egy már véglegesített,
read-only tartalmon belül.

## Döntések

### 1. Fogtérkép panel — alapból összecsukva

D266 explicit ezt kéri, a szerkesztő D71 mintájának megfelelően (ott is
alapból csukva van a fogtérkép-panel, még ha vannak is érintett fogak).

### 2. Kattintható, de READ-ONLY (nincs íráshatás)

A `DentalChart` `onToothClick` prop-pal, `selectedTeeth` NÉLKÜL hívva
MÁR MA IS `role="toolbar"` (button) módot ad — ez teljes billentyűzet-
navigációt (`←`/`→`/`↑`/`↓`/`Home`/`End`/`Enter`) biztosít INGYEN,
mert ez a mód a szerkesztőben már élesen használt, tesztelt kód
(`components/DentalChart.tsx:50-71`, `design/toothChartSvg.ts
makeInteractive()`).

**A `onToothClick` handler itt NEM ír semmit** (ellentétben a
szerkesztővel, ahol egy kezeletlen fogra kattintás új sort vesz fel) —
csak a helyi kijelölés-state-et módosítja (lásd 3. döntés).

### 3. Multi-select — a hiányzó egyetlen darab

Kattintás sima toggle-lel jelöl ki/le egy fogat, Ctrl nélkül (D268);
TÖBB fog is kijelölhető egyszerre.

**A `DentalChart` egyetlen hiányzó képessége.** A perzisztens
highlight-gyűrű (`is-picked` CSS osztály, `toothChartSvg.ts`) ma a
`listbox` (soronkénti fogválasztó) módhoz van kötve — `DentalChart.tsx`
csak akkor adja tovább a `selectedTeeth`-et a builder felé, ha
`listbox === true` (`interactive && selectedTeeth !== undefined`). A
`toolbar` (button, plan-szintű) módban ma NINCS mód több fog egyidejű
kiemelésére.

**Döntés:** `DentalChart.tsx` egy kis, célzott bővítést kap — a
`selectedTeeth` prop továbbadása a builder felé `toolbar` (`szerep:
'button'`) módban IS, a jelenlegi `listbox`-kényszer feloldásával. A
builder (`toothChartSvg.ts` `makeInteractive()`) ezt MÁR TÁMOGATJA — a
`selectedTeeth` és a `szerep` a függvényben egymástól FÜGGETLEN
paraméterek, csak a React-komponens szűkíti ma mesterségesen össze
őket.

**Miért nem a `listbox`/`aria-selected` szemantikát használjuk:** egy
`role="listbox"`/`aria-selected` az képernyőolvasónak azt sugallja, hogy
egy VÁLASZTÁST végzünk egy opciók közül (mint a soronkénti
fogválasztónál) — itt viszont egy SZŰRŐ/HIGHLIGHT-TOGGLE-ről van szó
(„mutasd, mely sorok érintik ezt a fogat”), aminek a `role="toolbar"` +
`aria-pressed` (gomb-szemantika) a pontosabb ARIA-illesztés.

**Ez a `toothChartSvg.ts` `makeInteractive()`-ot IS érinti, a fenti "MÁR
TÁMOGATJA" állítás csak a `selectedTeeth`/`is-picked` vizuális gyűrűre
igaz.** Ellenőrizve: a függvény ma `aria-selected`-et KIZÁRÓLAG
`szerep === 'option'`-nál ad (`ariaSelected = szerep === 'option' ? …
: ''`), `aria-pressed`-et sehol nem emit-el. Ha a fenti `role="toolbar"`
+ `aria-pressed` párost ténylegesen meg akarjuk valósítani, a
`makeInteractive()` kap egy kis, célzott bővítést: `szerep === 'button'`
ÉS `isPicked` esetén `aria-pressed="${isPicked}"` az `aria-selected` ág
mellé (nem helyette — az `option` mód ága változatlan marad). Ez
pontosítja az "Érintett helyek" alábbi `toothChartSvg.ts` sorát is —
NEM marad változatlan.

### 4. Csak az első kijelölés scrollingol

D269 explicit ezt kéri — a MEGLÉVŐ `PlanEditorPage.onToothClick`
scroll-mintájának (`scrollIntoView({block:'nearest'})` +
`csokkentettMozgas()` a `prefers-reduced-motion` tiszteletben
tartásához) újrafelhasználásával, stabil per-sor DOM-id-kre építve (a
72. tétel `SorReszlet` komponensének kell ilyen stabil `id`-t adnia,
pl. a szerkesztő `fog-<fazis>-<sor>` mintájára).

**Miért csak az első:** ha minden kattintás scrollingolna, egy 3+ fogas
multi-select mindig az UTOLSÓ kattintott fog sorára ugrana, elveszítve
a korábban kijelöltek kontextusát — az első kattintás viszi oda a
dokit, utána csak a highlight bővül/szűkül, a nézet stabil marad.

### 5. Highlight — unió, semleges szín, additív (nem kizáró)

A highlight a kijelölt fogak UNIÓJÁHOZ tartozó sorokon jelenik meg,
semleges accent színnel (D271, D273 — NEM a márka narancsa, CLAUDE.md
tiltja szövegszínként, itt highlight-ként sem indokolt). A NEM egyező
sorok NINCSENEK elhalványítva — csak a matchelők kapnak kiemelést
(D272, additív highlight, nem kizáró dimmelés).

### 6. Törlés

Esc + külön Clear gomb törli a teljes kijelölést (D270).

### 7. Panel összecsukása megtartja a kijelölést

D274 explicit ezt kéri — a panel összecsukása csak VIZUÁLISAN rejti a
fogtérképet, NEM unmountolja (a kijelölés és a darabszám React state,
ami túléli a `display:none`-szerű elrejtést).

### 8. Verzióváltás — teljes reset, a 71. tétel mintáján

D275–277 (kijelölés reset, scroll top, minden lokális detail-state
reset, fázisok újra alapból nyitva) — ez a 71. tétel (DP-060) `key={
`${planDir}/${versionDir}`}`-alapú tartalom-remount mintájával
TRIVIÁLISAN teljesül. **Ez a tétel NEM épít külön reset-logikát** —
a fogtérkép-komponens egyszerűen újra mountol verzióváltáskor, üres
kijelöléssel indulva.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- `buildToothVisualStates`/`resolveToothVisual`/a fog→sor
  visszahivatkozás (`FogKezeles{sor, fazisIndex, sorIndex}`) —
  MÁR MEGVAN (`domain/toothVisual.ts`), nincs új deriválás szükséges.
- A tejfogak (51–85) — a mai mintának megfelelően nem kerülnek a
  rajzra, csak szövegesen sorolódnak fel a fogtérkép alatt (konzisztens
  a PDF-fel és a szerkesztővel) — NEM interaktívak, ez a tétel nem
  bővíti ki rájuk a kattintást.
- A sorok/fázisok tényleges megjelenítése, amikhez a kattintás navigál
  — 72. tétel (DP-061).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/DentalChart.tsx` — a `selectedTeeth` `toolbar`
  módban való továbbadásának engedélyezése (3. döntés).
- `app/src/design/toothChartSvg.ts` `makeInteractive()` — a
  `selectedTeeth`/`is-picked` vizuális gyűrű kombinációja MÁR MEGVAN
  (`szerep`-től független), csak ellenőrzés/regressziós teszt kell rá;
  az `aria-pressed` emittálása `szerep === 'button'` esetén viszont ÚJ,
  kis bővítés (lásd 3. döntés kiegészítése).
- `app/src/pages/TervReszleteiPage.tsx` / új komponens (pl.
  `pages/tervReszletei/FogterkepPanel.tsx`) — a panel, a kijelölés-state,
  az Esc/Clear kezelés, a scroll-integráció a 72. tétel sor-komponenseivel.

## Tesztelés (irányadó, nem kimerítő)

- A panel alapból csukva; kinyitáskor a fogtérkép billentyűzettel
  navigálható (nyilak, Enter).
- Több fog egyidejű kattintása mindegyiket kiemeli (highlight-gyűrűvel),
  nem csak az utolsót; kijelölt fogaknál `aria-pressed="true"`.
- Az első kattintás a megfelelő sorra scrollingol; a második/harmadik
  NEM scrollingol újra.
- A nem érintett sorok NEM halványulnak el, csak az érintettek kapnak
  kiemelést.
- Esc VAGY a Clear gomb törli a teljes kijelölést.
- A panel összecsukása után újranyitva a kijelölés megmaradt.
- Verzióváltás után a fogtérkép üres kijelöléssel, összecsukott
  állapotban indul újra.
