# Backlog 87. tétel — Üres/whitespace sablon-validáció és hard-block navigáció — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 87. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek
kidolgozása a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat
DP-086 szelete. Az itt hivatkozott `C8`, `D578` a redesign saját
konfliktus-jegyzékéből/D1–D606 számozásából valók — NEM azonosak a
`docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

- `app/src/domain/templates.ts` `isPlaceholderTemplate(body)` ma
  KIZÁRÓLAG a `[PLACEHOLDER`/`[PLATZHALTER` jelölőt ismeri fel — C8
  másik felét (üres/csak-whitespace szöveg) nem. Ha a doki törli a
  nyilatkozat szövegét és üresen menti, ma NEM lép életbe a D23 zár.
- A nyilatkozat hard-block Callout (`PreviewPage.tsx:499-508`) ma
  csak SZÖVEGGEL utal a Beállítások → Nyomtatványok tabra, nincs
  kattintható link.
- (Tisztázva a tervezés során: a nyilatkozat hard blockja MÁR MA IS
  nyelv-független — a plan saját nyelvén betöltött szöveget vizsgálja,
  nem csak a DE-fallback esetét. Ez a rész MÁR MEGVAN, nem ennek a
  tételnek a munkája.)

## Döntések

### 1. `isPlaceholderTemplate()` kiegészül üres/whitespace felismeréssel

`isPlaceholderTemplate(body)` mostantól akkor is igazat ad, ha
`body.trim().length === 0`, a meglévő `[PLACEHOLDER`/`[PLATZHALTER`
jelölő-ellenőrzés MELLETT. Ez az EGYETLEN, közös predikátum-függvény,
tehát a bővítés automatikusan öröklődik minden hívási helyre
(nyilatkozat hard block, fizetési feltételek/garancia soft warning ÉS
a 81. tétel D581 saját-nyelvű kiterjesztése, `DemoStorage.ts`
`ensureSeedTemplates()`).

**Miért:** C8 explicit ezt a két feltételt (üres/whitespace VAGY
placeholder-jelölő) sorolja fel együtt — a mai kód csak a másodikat
implementálja.

### 2. Valódi, kattintható link a nyilatkozat hard-block Callout-ban

A nyilatkozat hard-block Callout valódi, kattintható `RouterLink`et
kap a Beállítások → Nyomtatványok tabra (az `EgyebTab.tsx` meglévő
linkmintájára), felváltva a mai puszta szöveges említést. Ez
KIZÁRÓLAG a kemény zárra vonatkozik — a fizetési feltételek/garancia
PUHA figyelmeztetése (D578) továbbra sem kap linket, változatlanul.

**Miért:** a user explicit megkérdezve, a valódi link mellett
döntött — a DP-086 forrás-scope explicit említi a navigációt, és ez
egy KEMÉNY blokk (nem a D578 által explicit link nélkülire kért PUHA
figyelmeztetés), tehát érdemben gyorsítja a javítást.

**Elvetett alternatíva:** marad puszta szöveg, a D578 szellemét a
kemény blokkra is kiterjesztve — elvetve; a user a DP-086 forrás
explicit bulletjét választotta.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A fizetési feltételek/garancia saját-nyelvű placeholder-kiterjesztés
  — MÁR a 81. tétel D581 döntése (automatikusan örökli az itt bővített
  `isPlaceholderTemplate()`-et).
- A puha figyelmeztetés (D576–D578) checklistbe kötése — MÁR a 67.
  tétel hatásköre, változatlan.
- A nyilatkozat saját-nyelvű hard block maga (D23) — MÁR MEGVAN,
  helyesen működik minden terv-nyelven, nincs új munka.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/templates.ts` `isPlaceholderTemplate()`.
- `app/src/pages/PreviewPage.tsx` a `nyilatkozatIsPlaceholder` Callout.

## Tesztelés (irányadó, nem kimerítő)

- Egy üresre/csak szóközre törölt nyilatkozat-szöveg mentése kiváltja
  a D23 zárat (a nyilatkozat+aláírás oldal kimarad, „Csak ajánlat”
  kényszerítve).
- A hard-block Callout linkje ténylegesen a Beállítások →
  Nyomtatványok tabra navigál.
- A fizetési feltételek/garancia puha figyelmeztetése (`sablonFallback`
  Callout) továbbra sem tartalmaz linket.
