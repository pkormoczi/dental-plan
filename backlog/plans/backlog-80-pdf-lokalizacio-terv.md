# Backlog 80. tétel — PDF lokalizáció, dátum- és pénzformázás — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 80. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-074
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D434`–`D455`, `C4` a redesign saját D1–D606 számozásából valók — NEM
azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A DP-074 forrásköre (D436–D441, C4) NAGYRÉSZT egy másik, MÁR ELDÖNTÖTT
tétel (52. tétel, nyelv/pénznem-öröklés) hatáskörébe tartozik — a
nyelvfüggő ezres tagolás és a pénznem-alapú tizedesjegy-szám ott dől
el. A vizsgálat során három VALÓDI, a mai kódtól/dokumentációtól eltérő
rés maradt, amit ez a tétel zár:

1. **`D438` szó szerint `EUR` szöveges pénznemjelet ír elő**, a mai kód
   (`domain/money.ts`) és a `docs/04-nyomtatvany-spec.md`
   „Számformátum" táblázata `€` szimbólumot használ.
2. **`D451` szerint a német TAJ-címke szó szerint `TAJ` marad**
   (nem ragozott/fordított alak), a mai `pdf/labels.ts`
   `PDF_LABELS.de.kvTaj` értéke `'TAJ-Nr.'`.
3. **`D454`/`D455` szerint az alapértelmezett (sosem kézzel átírt)
   terv-cím és fázisnév egy német terven lokalizálódna** — a mai
   `javasoltTervCim()` (51. tétel) és `generaltFazisNev()` (58. tétel)
   MINDIG magyar szöveget ad vissza, a szerkesztő UI-jának magyar
   jellege miatt szándékosan.

## Döntések

### Már máshol lefedett / már megvan, nincs teendő

- **C4 / D436–D437 (nyelvfüggő ezres tagolás, pénznem-alapú
  tizedesjegy)** → **52. tétel** hatásköre, ott dől el.
- HU/DE fix szövegek (`pdf/labels.ts`), dátumformátum (D434/D435,
  `formatShortDate`/`formatLongDate`) — MÁR nyelvfüggő és megfelel.
- D439/D440 (NBSP + no-wrap) — a `domain/money.ts` már U+00A0-t
  használ ezres elválasztóként és a pénznem-jel előtt (lásd a fájl
  kommentje), ez már véd a sortörés ellen.
- D442–D450 (Db középre, Fog balra, leírás behúzva/halványan,
  tételsorok közt nincs elválasztó, fázisköz mértéke) — mind megvan
  változtatás nélkül.
- D441 (tabular nums) — a regisztrált NotoSans számjegyei alapból
  egyenlő szélességűek (nincs proporcionális variáns regisztrálva),
  nincs teendő.
- D452 (páciensadat-értékek nem fordulnak, exact snapshot) — már
  megvan, a `Kv` komponens a nyers `Paciens` mezőket írja ki.
- D453 (minden rendszer-generált statikus szöveg lokalizált,
  brand/user/snapshot szöveg változatlan) — a `labels.ts`
  szerkezetéből már következik.

### 1. `EUR` szöveges pénznemjel a `€` szimbólum helyett (D438)

Explicit átállás — a `formatMoney` (`domain/money.ts`) EUR-ágának
`' €'` végződése `' EUR'`-ra vált, NBSP-vel elválasztva (D439-cel
konzisztensen: a pénznemjel nem szakadhat el az összegtől
sortörésnél). A `docs/04-nyomtatvany-spec.md` „Számformátum"
táblázata ennek megfelelően frissül a tétel lezárásakor.

**Függőség a 52. tételre:** a `formatMoney` UGYANEZEN EUR-ágát az
52. tétel (nyelv/pénznem-öröklés, még nem implementált) terve is
módosítja — ott a nyelvfüggő ezres tagolás kerül be. A két
változtatás NEM ütközik (különböző karaktereket érint: az ezres
elválasztó formátuma, illetve a pénznem-jel szövege), de egy
implementátornak FIGYELNIE kell, hogy mindkettőt alkalmazza, amikor a
`formatMoney` EUR-ágát módosítja — egy fél-implementáció (csak az
egyik tétel átvezetve) némán felülírhatja a másikat, ha nem egyeztetik
a diffet.

### 2. Német TAJ-címke szó szerint `TAJ` (D451)

`pdf/labels.ts` `PDF_LABELS.de.kvTaj`: `'TAJ-Nr.'` → `'TAJ'`. Kis,
biztonságos, egysoros változás.

### 3. Új, PDF-csak lokalizáló réteg az alapértelmezett terv-címhez és fázisnévhez (D454/D455)

Két új segédfüggvény kerül a `pdf/` alá (a `labels.ts` mintájára) — a
`javasoltTervCim()`/`generaltFazisNev()` MAGUK NEM változnak, mert a
szerkesztő UI-ja (`Korábbi tervek` fa, terv-mappa névjavaslat, a
fázis-hozzáadás gomb) változatlanul, szándékosan magyar marad:

- **PDF-címfeloldó:** ha a ténylegesen megjelenített cím (a 77. tétel
  `tervCim` propja) PONTOSAN megegyezik a `javasoltTervCim(plan,
  priceList)` élő javaslattal (azaz a doki sosem írta át kézzel), a
  domináns kategória nevét `resolveNev(kategoria.nev, plan.nyelv)`-vel
  oldja fel a terv nyelvén, nem a hardkódolt `.hu`-t adja vissza.
  Kézzel átírt cím esetén a tárolt szöveg VÁLTOZATLAN marad (a
  redesign D454 második fele: „manual title változatlan user text").
- **PDF-fázisnév-feloldó:** ha `fazisNevGeneralt(fazis.megnevezes,
  pos)` igaz (a fázisnév PONTOSAN a `pos` pozícióhoz tartozó generált
  minta), egy német mintát ad vissza (pl. „2. Behandlung"), egyéb
  esetben (kézzel átnevezett fázis) a tárolt `megnevezes`-t
  változtatás nélkül.

**A „dátummal együtt" (D454) rész KIMARAD** — a mai alapértelmezett
cím sosem tartalmaz dátumot (`javasoltTervCim()` csak a domináns
kategória nevét adja vissza), ennek bevezetése új scope lenne, amit az
51. tétel nem döntött el; ha a doki igényli, külön backlog-tétel.

**Miért nem a `javasoltTervCim()`/`generaltFazisNev()` MAGA kap
`nyelv` paramétert:** ezek a szerkesztő UI-jában (Korábbi tervek fa,
terv-mappa névjavaslat, fázis-hozzáadás gomb) is használt függvények,
amik szándékosan MINDIG magyarok maradnak (a `CLAUDE.md` „UX kritikus
pontja" szerint a doki magyar, magyarul dolgozik akkor is, ha német
terven dolgozik) — egy `nyelv` paraméter bevezetése ott hívási
helyenként helytelen alapértéket eredményezhetne, ha valaki elfelejti
kitölteni. A PDF-specifikus wrapper elkülöníti a két felelősséget: a
szerkesztő logikája nem változik, csak a PDF-nek van egy saját,
opcionális lokalizáló rétege felette.

A német fázisnév-minta és a kategórianév-fordítás (`resolveNev`
`de`-ága, ha hiányzik, HU-visszaesésre esik, a meglévő mechanizmus
szerint) **AI-fordítás jellegű, nem lektorált** — ugyanaz a fenntartás
vonatkozik rá, mint a `nev.de` és a sablonszövegek mai állapotára
(`docs/04-nyomtatvany-spec.md` „Nyelv" szakasz).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A `formatMoney`/`formatPrice` nyelvfüggő ezres tagolása és a HU+HUF/
  HU+EUR/DE+HUF/DE+EUR négy kombinációja — 52. tétel, MÁR eldöntött
  hatáskör; ez a tétel csak az EUR-ág pénznemjelét cseréli, nem a
  teljes formázási logikát.
- A terv-cím MEZŐ bevezetése/tárolása — 51. tétel (`terv-cimke.json`),
  MÁR eldöntött hatáskör.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/money.ts` `formatMoney` — EUR-ág pénznemjelének
  cseréje `' €'` → `' EUR'`; koordinálandó az 52. tétel
  implementációjával (lásd fenti függőség).
- `app/src/pdf/labels.ts` `PDF_LABELS.de.kvTaj` — `'TAJ-Nr.'` →
  `'TAJ'`.
- `app/src/pdf/` — új fájl(ok) a PDF-csak cím-/fázisnév-lokalizáló
  segédfüggvényeknek (a `labels.ts` mintájára, importálhatóság
  szempontjából ugyanazzal a `pdf/`-alatti korlátozással).
- `docs/04-nyomtatvany-spec.md` „Számformátum" táblázat — `€` → `EUR`
  a tétel lezárásakor (KÉSŐBB, nem most).

## Tesztelés (irányadó, nem kimerítő)

- Egy EUR-pénznemű terv PDF-jén az összegek `EUR` szöveggel zárulnak,
  nem `€` szimbólummal, a nyelvtől függetlenül.
- Egy német nyelvű terv PDF-jén a TAJ-mező felirata `TAJ`, nem
  `TAJ-Nr.`.
- Egy soha át nem írt terv-címmel rendelkező, német nyelvű terv
  PDF-jén a cím a domináns kategória NÉMET nevét mutatja (ha van), nem
  a magyart.
- Egy kézzel átírt terv-címmel rendelkező, német nyelvű terv PDF-jén a
  kézzel beírt szöveg VÁLTOZATLANUL jelenik meg, nem fordul le.
- Egy soha át nem nevezett fázis („2. kezelés") egy német terven „2.
  Behandlung"-ként (vagy a választott minta szerint) jelenik meg; egy
  kézzel átnevezett fázis a tárolt nevén, változatlanul.
