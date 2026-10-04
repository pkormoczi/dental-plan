# Manual checks — `pdf` — 2026-10-04

```
Dátum: 2026-10-04
Szelet: pdf
Kiváltó: fogterkep-nyomtatasa-kapcsolo implementációja (/implement 2d) — „Ábra a nyomtatványon” kapcsoló az „Érintett fogak” gomb mellett; az ábra csak bekapcsolva kerül a nyomtatványra
Eszköz: chrome-devtools MCP (izolált, headless), Vite dev 5173, 1440×900
Route-ok: #/terv, #/elonezet (reset után új terv, egy sor: „Fogbél megnyitás + gyógyszeres zárás”, Fog: 36)
```

## Mit fedett

- Fogtérkép A/B valós PDF-bájtokon, ugyanazon a terven, csak a kapcsolót átbillentve. A PDF-blobot
  `initScript`-tel kaptam el, mindkét esetben `about:blank`-on át friss dokumentumon.

  | Kapcsoló | Képobjektum | Bájt | Oldal | „Érintett fogak” az 1. oldalon |
  |---|---|---|---|---|
  | ki (új terv alapállása) | 2 | 114 926 | 3 | nincs, a cím után az „1. fázis” jön |
  | be | 4 | 929 615 | 3 | megjelenik a színezett térképpel |

  A plusz két képobjektum a fogtérkép-kép és az átlátszósági maszkja; a másik kettő a logó.
- A kapcsoló új terven üres; bepipálás után a piszkozat menti, és az előnézet a következő
  betöltéskor az ábrával renderel.
- Fontok mindkét változatban: csak a két NotoSans-subset (`NotoSans-Regular`, `NotoSans-SemiBold`),
  `hasHelvetica: false`, `objStmCount: 0`, tehát a nyers regex-vizsgálat megbízható.
- Szerkesztő: az „Ábra a nyomtatványon” jelölőnégyzet a csukott „Érintett fogak” gomb mellett,
  vele egy sorban (15 px köz).
- Konzol: nincs hiba, React-figyelmeztetés vagy CSP-sértés. Egy Chrome-„issue” jött: két
  űrlapmezőnek nincs `id`/`name` attribútuma. Sem a `#/terv`, sem a `#/elonezet` DOM-jában nincs
  ilyen mező. A darabszám a beépített PDF-néző oldalszám- és nagyítás-mezőjére illik, az nem az
  alkalmazás része.

## Kritikus

—

## Közepes

—

## Apró

—

## Nem ellenőrizhető

- Placeholder-zár, glyph-próba és letöltés-instrumentálás: ebben a futásban kihagyva. A tétel nem
  érinti őket, a terv csak a fogtérkép A/B próbát rendelte el.

Futásidő: ~10 perc (böngészős rész).
