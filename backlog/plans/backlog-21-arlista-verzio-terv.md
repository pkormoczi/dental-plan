# Backlog 21. tétel — `arlistaVerzio` léptetése admin-mentéskor — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 21. tételének („`arlistaVerzio` léptetése
admin-mentéskor") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat
(a lenti aláírás-szerű részletek csak illusztrációk) — az implementáció
módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

A nyomtatvány lábléce (`docs/04-nyomtatvány-spec.md`) a `plan.arlistaVerzio`
mezőt írja ki „melyik árlistából készült" audit-adatként — ez a mező egy
ÚJ terv létrehozásakor a `blankPlan.ts` a live `priceList.arlistaVerzio`-ból
másolja át (D7-pillanatkép, ezt a tétel NEM érinti). A gond a FORRÁS: a
`PriceListAdminPage.tsx` `commit()` függvénye ma minden mentéskor
frissíti a `modositva` mezőt, de az `arlistaVerzio`-hoz soha nem nyúl —
tehát ez a mező a kezdeti seed-értéken (`2026-07-01`) fagyva marad
örökre, minden admin-árszerkesztés után is. Vitánál a lábléc a
hivatkozási pont — ha az mindig ugyanazt a (hamis) dátumot mondja, az
audit-ígéret üres.

## Döntések

### 1. Hatókör: minden `commit()`-hívás tartalmi változásnak számít, feltétel nélkül

Az adminban MINDEN mező szerkeszthető ugyanazon az egy `commit()`
függvényen keresztül (`Tetel.nev`, `ar`, `kategoriaId`, `sorrend`,
`aktiv`, `gyakori`; `Kategoria.nev`, `sorrend`, `szin`; kategória/tétel
hozzáadása/törlése/átrendezése). Az `arlistaVerzio` **minden**
`commit()`-hívásra a mai dátumra áll, ugyanúgy és ugyanakkor, mint a
`modositva` — nincs mezőnkénti különbségtevés, nincs régi/új
`PriceList`-összehasonlítás.

Ez azt jelenti, hogy egy tisztán `Tetel.gyakori`-csillagozás (pl. a 8.
tétel „árlista-napi" tömbszerű csillagozási munkamenete) is bump-olja a
verziót, holott a `gyakori` mező dokumentáltan tiszta UI-kényelem (a
szerkesztő gyorsgombjai közé kerül vele egy tétel), nem nyomtatványon
vagy áron megjelenő tartalom.

**Miért:** a kockázat aszimmetrikus. A mai, TÖRÖTT állapot hibája
**alul-jelzés** (a lábléc hazudik, mindig ugyanazt a régi dátumot
mutatja) — ez a tétel ezt oldja meg. Egy feltétel nélküli bump legrosszabb
esetben **túl-jelzés** (a lábléc dátuma néha egy kicsit frissebb a
valósnál, mert egy `gyakori`-only szerkesztés is bump-olt) — ez
ártalmatlan, nem jogi/audit kockázat. A `gyakori`-csillagozás emellett a
gyakorlatban egyszeri, tömbszerű esemény (nem napi rutin), tehát a
túl-jelzés kockázata is elhanyagolható. Egy mezőnkénti diff-alapú
finomítás (csak a `gyakori`-t kizárva) mélyebb régi/új-összehasonlítást
igényelne minden mentéskor, ami túllépné az 1 órás méretbecslést, egy
olyan pontosságért, aminek a hiánya nem okoz valódi kárt.

### 2. Implementáció: egy közös `todayIso()` hívás mindkét mezőhöz

A `commit()` a mai, ad hoc `new Date().toISOString().slice(0, 10)`
számítást (amit ma csak a `modositva`-hoz használ) lecseréli a meglévő
`todayIso()` domain-segédfüggvényre (`domain/date.ts` — CLAUDE.md szerint
„az EGYETLEN forrás a mai napra", ezt hívja pl. a `createBlankPlan()` is),
és EGYETLEN `ma = todayIso()` értéket ad mindkét mezőnek:

```
const ma = todayIso();
savePriceList({ ...next, modositva: ma, arlistaVerzio: ma });
```

**Miért:** mivel az 1. döntés szerint a két mező mostantól minden
mentéskor ugyanazt az értéket kapja, egyetlen közös számítás
egyszerűbb, és garantáltan kizárja azt az elméleti élesetet, amikor két
külön `new Date()`-hívás egy éjféli határon szétcsúszna. Emellett
kitisztítja a meglévő, a `todayIso()`-t megkerülő duplikált
dátumszámítást — a CLAUDE.md „Meglévő segédfüggvények — használd, ne
írd újra" elve szerint.

### 3. A logika helye: a `PriceListAdminPage.tsx` meglévő `commit()`-jában marad, NEM a storage rétegben

A `DemoStorage.savePriceList` (és a jövőbeli `FileSystemStorage`
megfelelője) változatlanul egy dumb passthrough marad — pontosan azt
menti el, amit kap. A dátumbélyegzés logikája (2. döntés) a HÍVÓ oldalon
(`PriceListAdminPage.tsx`) marad, ugyanott, ahol a `modositva` bélyegzése
ma is történik.

**Miért:** ez követi a `PlanStorage` interfész meglévő elvét (CLAUDE.md
„a `PlanStorage` interfész csak a *hogyan*-t rögzíti, a *mikor*-t minden
oldal maga dönti el") — a storage réteg dolga a perzisztencia, nem az,
hogy eldöntse, mikor „tartalmi" egy változás. Ez pontosan a `modositva`
ma is bevált mintája, nincs ok elválasztani a két mező kiszámításának
helyét.

### 4. A terv-oldali `arlistaVerzio`-átvétel változatlan marad

A `blankPlan.ts` `arlistaVerzio: priceList.arlistaVerzio` sora nem
változik — egy ÚJ terv továbbra is a terv létrehozásának pillanatában
érvényes (élő) árlista-verziót veszi át, pillanatkép-szerűen (D7). Ez a
tétel csak azt javítja, hogy ez a live érték a valóságot tükrözze admin-
szerkesztés után is; a snapshot-mechanizmus maga érintetlen.

**Miért:** ez már ma is helyesen működik — a hiba kizárólag a FORRÁS
(`priceList.arlistaVerzio`) befagyásában volt, nem az átvétel logikájában.

### 5. Tesztelés: egy új eset a meglévő `PriceListAdminPage.test.tsx`-ben

Egy tetszőleges admin-szerkesztés (pl. egy tétel `gyakori`-csillagának
átbillentése, vagy egy ár módosítása — a meglévő fájl EUR-ár-tesztjének
mintájára) után:

- a `readPriceList()` (meglévő teszt-segédfüggvény) szerint a mentett
  `arlistaVerzio` értéke `todayIso()`-val egyezik (nem hardcode-olt
  dátummal — a teszt így a valós rendszerórától függetlenül stabil marad);
- a fejlécben megjelenő „verzió {priceList.arlistaVerzio}" szöveg
  (`PriceListAdminPage.tsx:205`) is frissül ugyanerre az értékre —
  ugyanabban a tesztben, mert ez már ma is látható, renderelt szöveg.

**Miért:** ez a két asszerció (perzisztált érték + renderelt szöveg)
ugyanazt a mintát követi, mint a fájl meglévő EUR-ár-tesztje (`readPriceList()`
+ `screen.findByText`), és lefedi mind a perzisztencia, mind a UI-
visszajelzés oldalát egyetlen, olcsó teszttel — nincs szükség
mock-időzítésre (`vi.useFakeTimers`), mert a teszt a valós `todayIso()`-t
hívja össze­hasonlításként, nem egy hardcode-olt dátumot.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Mezőnkénti (pl. csak `gyakori`-t kizáró) finomítás** — lásd 1. döntés,
  tudatosan elvetve a méret/haszon arány miatt.
- **`resetDemoData()` útja** — ez a demo-adat visszaállítást a seed
  értékre teszi (`arlistaVerzio: '2026-07-01'`), nem a `commit()`/
  `savePriceList` útján megy, ezt a tétel nem érinti (a meglévő
  `DemoStorage.test.ts` „resetDemoData wipes edits back to the seed"
  tesztje változatlanul igaz marad).
- **A `modositva` mező megjelenítése a felületen** — ma sehol nem
  jelenik meg (write-only mező), ez a tétel nem vezet be hozzá UI-t; csak
  az `arlistaVerzio` (ami már ma is látszik a fejlécben) kap helyes
  értéket.
- **Egy kézi „árlista-verzió kiadása" gomb/fogalom** — a backlog-szöveg
  kifejezetten elveti, egyszemélyes rendelőben felesleges szertartás
  lenne.
- **A `FileSystemStorage` (2. fázis) `savePriceList`-implementációja** —
  a 3. döntés szerint a logika a hívó oldalon marad, tehát ott
  automatikusan öröklődik majd, nincs hozzá külön teendő ebben a
  tételben.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PriceListAdminPage.tsx`
  - `commit()` bővítése: `todayIso()` import (`domain/date.ts`), egy
    közös `ma` érték mindkét mezőhöz (2. döntés).
- `app/src/pages/PriceListAdminPage.test.tsx` — az 5. döntésben leírt új
  eset.
