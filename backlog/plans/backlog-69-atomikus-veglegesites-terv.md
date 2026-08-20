# Backlog 69. tétel — Atomikus véglegesítés (PDF+JSON) — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 69. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-053
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D163`–`D171`, `C7`, `C9` a redesign saját D1–D606 számozásából valók —
NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

**Konkrét, kódban azonosított hiba — nem csak hiányzó feature.** A
`doFinalize()` (`app/src/pages/PreviewPage.tsx:323-373`) EGYETLEN `try`
blokkban fut:

```
storage.savePlan(finalPlan, bytes)   -- durable commit
  → storage.loadPlan(ref)             -- durable read-back
    → markPlanSaved(persisted)        -- ebben: drafts.clear() (best-effort cleanup)
      → setSavedRef(ref)              -- csak EZUTÁN mutatja a sikeres állapotot
```

Ha a `storage.savePlan`/`loadPlan` már SIKERESEN lefutott — a
verziómappa TARTÓSAN létrejött a storage-ban, D4/D165 szerint helyesen —,
de a `markPlanSaved()` belsejében futó `drafts.clear()` (piszkozat
best-effort törlése) BÁRMIÉRT dobna, a KÜLSŐ `catch` ág lefut,
`saveError`-t állít be, és a doki egy **„A mentés nem sikerült” piros
hibaüzenetet lát egy valójában sikeresen, tartósan mentett verzió
mellett** — soha nem éri el a `setSavedRef(ref)`-et, tehát a „A terv
elmentve ✓” sikerképernyőt sem látja.

Ez direkt ellentmond D168/D169-nek: „draft csak durable final successig
törlődik” + „ha commit sikeres, de draft cleanup hibázik, finalization
SIKERESNEK SZÁMÍT; cleanup később automatikusan”.

**Miért rejtve marad ma.** A `DemoStorage`/`DemoDraftStorage` mögötti
`drafts.clear()` (`storage/DemoDraftStorage.ts:72-74`)
`localStorage.removeItem(...)`, ami gyakorlatilag sosem dob — ezért a hiba
ma latens, nem észlelhető manuális teszteléssel. Ez pontosan a projekt
korábban is dokumentált mintája (lásd D31 indoklása a `PlanStorage.ts`-ben:
„ma ártalmatlan (`localStorage`), a `FileSystemStorage`-váltásnál
(`docs/05-technologia.md`, 2. fázis) válik éles kockázattá, ahol egy
`createWritable`/`write`/`close` írás nem atomi”) — az IndexedDB-alapú
végleges `DraftStorage` (2. fázis) alatt a `clear()` már ténylegesen
dobhat (tranzakció-hiba, kvóta, böngésző-korlátozás). Éppen ezért érdemes
MOST, a mockup-fázisban megelőzni, amíg a hiba ára alacsony (egyetlen
try/catch-átszervezés).

## Döntések

### 1. A durable commit és a best-effort cleanup két külön hibazónába kerül

A `doFinalize()` szétválik:

1. **Durable zóna:** `storage.savePlan()` + `storage.loadPlan()`. Ha ez a
   szakasz hibázik, a mai viselkedés MARAD (a doki `saveError`-t lát, nem
   történt tartós mentés — ez helyes, D165 szerint).
2. **Best-effort cleanup zóna:** `markPlanSaved(persisted)` (ami a
   `drafts.clear()`-t hívja) — ha EZ hibázik, a doki MINDENKÉPP a
   sikeres „A terv elmentve ✓” állapotot látja (`setSavedRef(ref)` a
   cleanup hibájától FÜGGETLENÜL lefut), a cleanup hibája legfeljebb egy
   halk, NEM blokkoló jelzést kaphat (vagy néma marad — a pontos UX a
   megvalósító döntése), SOHA nem `saveError`-ként.

**Miért:** D168/D169 explicit ezt a megkülönböztetést kéri — a doki
szemszögéből a véglegesítés attól a pillanattól „sikeres”, hogy a
verziómappa tartósan létrejött a storage-ban; a piszkozat-törlés csupán
házon belüli takarítás, aminek elmaradása (a piszkozat egy darabig még
ott marad) NEM üzleti hiba. D169 explicit kimondja: „cleanup később
automatikusan” — vagyis egy elmaradt törlés nem VÉGLEGES adatvesztés,
csak egy elhalasztott takarítási lépés.

**Elvetett alternatíva:** a `markPlanSaved` hibáját a mai módon egységesen
kezelni (egy közös try/catch) — elvetve, mert ez pont a D168/D169-et
sértő, azonosított hibát hagyná életben.

### 2. A többi D165–171 pont már MEGVAN — dokumentálva, nincs új munka

- **D165 (atomikus PDF+JSON mentés, rollback hibánál, partial cleanup).**
  MEGVAN — `DemoStorage.doSavePlan()` (`storage/DemoStorage.ts:477-539`)
  try/catch-ben írja a plan/pdf/patientRecord kulcsokat, hiba esetén
  törli a frissen írt plan/pdf kulcsot (a `patientRecord`-ot szándékosan
  nem, mert az `setItem` szinkron+atomi kulcsonként, lásd a kód saját
  kommentjét).
- **D166 (hiba nem fogyaszt verziószámot).** MEGVAN — a `verzio`
  (`nextVersionNumber`) a MEGLÉVŐ, perszisztált verziókból számol, egy
  sikertelen írás után semmi nem került lemezre, tehát egy retry
  UGYANAZT a számot kapja.
- **D167 (lock/idempotence, gomb progress alatt disabled).** MEGVAN — a
  `savingRef.current` dupla-kattintás elleni ref-guard (P0-1 komment) +
  a `busy = saving || pdfStale` letiltja a gombot mentés közben.
- **D170 (PDF nem nyílik meg automatikusan a mentés után).** MEGVAN — a
  sikeres állapot csak a „A terv elmentve ✓” panelt mutatja, nem nyit
  PDF-et.
- **D171 (egyszeri success banner).** MEGVAN — „A terv elmentve ✓” +
  útvonal + két gomb (`Új terv indítása`/`Korábbi tervek`).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A PDF-generálási hiba (`pdfError`) retry-mechanizmusa — 68. tétel
  (DP-052); ez egy MÁSIK hibatípus (generálási, nem mentési).
- A checklist UI, ami a hard/soft validációt mutatja MIELŐTT a doki
  megnyomná a gombot — 66./67. tétel (DP-050/051); ez a tétel a gomb
  megnyomása UTÁNI, technikai mentési hibakezelésről szól.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PreviewPage.tsx` `doFinalize()` — a try/catch
  szétválasztása a fenti 1. döntés szerint.

## Tesztelés (irányadó, nem kimerítő)

- Sikeres `savePlan`+`loadPlan` UTÁN egy mesterségesen hibáztatott
  `drafts.clear()` (pl. teszt dupla-mock) mellett a doki MÉGIS a „A terv
  elmentve ✓” sikerképernyőt látja, NEM `saveError`-t.
- Egy sikertelen `storage.savePlan()` (pl. kvótahiba) után a mai
  viselkedés VÁLTOZATLAN — a doki `saveError`-t lát, a verzió nem jött
  létre, egy újrapróbálkozás ugyanazt a verziószámot kapja.
- Dupla-kattintás a „Véglegesítés és mentés” gombra mentés közben nem
  indít második mentést.
