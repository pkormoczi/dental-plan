# Backlog 85. tétel — Alapértelmezett dokumentum-pénznem — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 85. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek
kidolgozása a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat
DP-084 szelete. Az itt hivatkozott `D59` a redesign saját D1–D606
számozásából való — NEM azonos a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

**Kapcsolódó, lezárt tétel:** részleges átfedés az 52. tétellel
(Dokumentumnyelv és pénznem, `docs/01-attekintes-es-dontesek.md` D63) —
az 52. tétel eltávolította a nyelv-default köré épített
`nemetEngedelyezve` gate-et, de nem ad Settings-mezőt a pénznem-
defaultnak.

## Probléma

- `Settings.alapertelmezettNyelv` már ma is létezik, UI-val (`EgyebTab
  .tsx` ChipGroup, gate nélkül).
- A pénznemnek NINCS ilyen mezője: `blankPlan.ts:83` hardkódoltan
  `penznem: oroklott?.penznem ?? 'HUF'`-ot ír, dokumentált indoklással
  (az EUR árak lektorálatlanok, a HUF biztonságosabb kiindulás).
- D59 explicit „egymástól független defaultok”-at kér nyelvre ÉS
  pénznemre — ma csak a nyelv oldala teljesül.

## Döntések

### 1. Új, konfigurálható `Settings.alapertelmezettPenznem` mező

Új `Settings.alapertelmezettPenznem: Penznem` mező, alapérték `HUF` (a
mai biztonsági indoklás MEGMARAD, csak az érték válik szerkeszthetővé).
Az Egyéb tabon egy ChipGroup (HUF/EUR) a nyelv-default melletti, azzal
szimmetrikus elrendezésben.

**Miért:** a user explicit megkérdezve, a konfigurálhatóság mellett
döntött a hardkódolt-HUF alternatívával szemben — D59 szimmetriaelve
(nyelv és pénznem egymástól független, mindkettő konfigurálható)
mellett.

**Elvetett alternatíva:** a pénznem marad hardkódolt HUF, dokumentált
indoklással — elvetve; a user a konfigurálhatóságot választotta.

### 2. `blankPlan.ts` a hardkódolt HUF helyett a Settings-mezőt olvassa

`blankPlan.ts` a hardkódolt `'HUF'` helyett `oroklott?.penznem ??
settings.alapertelmezettPenznem`-et olvas — új láncnál (nincs öröklés)
ez lesz a forrás; meglévő pácienshez induló új láncnál változatlanul a
legutóbb véglegesített terv pénzneme örököl (D52, változatlan
precedencia).

**Miért:** ez a mechanikus következménye az 1. döntésnek — a meglévő
öröklési sorrend (előbb `oroklott`, utána a globális default) a D52
mintáját követi, nem vezet be új precedenciát.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A nyelv-default ChipGroup gate-mentesítése (`nemetEngedelyezve`
  eltávolítása) — LEZÁRVA az 52. tétellel (D63); ez a tétel a pénznem-
  ChipGroupot melléteszi, nem duplikálja a nyelv-oldali munkát.
- `ervenyessegNap` — már ma is létezik, változatlan.
- A nyelv/pénznem ÖRÖKLÉSI szabályai meglévő pácienshez — D52,
  változatlan.
- A tényleges nyelv/pénznem-VÁLASZTÓ a „Terv adatai” lépésen — D63,
  változatlan.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` `Settings`.
- `app/src/pages/settings/EgyebTab.tsx` — új ChipGroup.
- `app/src/domain/blankPlan.ts:83`.

## Tesztelés (irányadó, nem kimerítő)

- Az Egyéb tabon a pénznem-default ChipGroup HUF/EUR között választható,
  Mentés/Mégse-vel (a tab meglévő explicit mentési modellje szerint).
- Egy vadonatúj páciens első terve az aktuális `alapertelmezettPenznem`
  értékét kapja.
- Meglévő pácienshez induló új lánc továbbra is a legutóbb véglegesített
  terv pénznemét örökli, nem a globális defaultot.
