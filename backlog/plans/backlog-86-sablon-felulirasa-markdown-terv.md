# Backlog 86. tétel — Nyomtatványszöveg-sablonok felülírása + markdown-bővítés — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 86. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek
kidolgozása a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat
DP-085 szelete. Az itt hivatkozott `D571`–`D574`, `D588`–`D591`, `C7`,
`C9` a redesign saját D1–D606 számozásából/konfliktus-jegyzékéből
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

## Probléma

- `DemoStorage.saveTemplate()` ma minden mentésnél ÚJ `-vN.md` fájlt
  hoz létre (D4-mintájú verziózás) — ez `docs/03-funkcionalis-spec.md`
  § Nyomtatványok dokumentált, tesztelt, szándékos viselkedése. A
  redesign C7/D573 ezt EXPLICIT megfordítja: „nincs
  dokumentumsablon-verziózás… mentéskor az aktuális fájl felülíródik”.
- A `Plan.sablonVerzio` mező törlését a MÁR LÉTEZŐ 81. tétel már
  eldöntötte, de a `saveTemplate()` tényleges felülírásra-váltása
  eddig sehol nem volt lefedve.
- `pdf/markdownLite.ts` `parseBlocks()` a mai kódban EXPLICIT
  kommenttel indokoltan ÖSSZEFŰZI egy bekezdésen belül a sorokat
  szóközzel (`lines.join(' ')`) — ez az ELLENTÉTE a forrás D590/D591
  „egy Enter = sortörés” elvárásának.
- `MdBlock` típusnak nincs `'ol'` (számozott lista) ága, és a
  bekezdés-szövegben a `**félkövér**` jelölés nincs inline renderelve
  — mindkettő a D588 markdown-alkészletének része, de hiányzik.

## Döntések

### 1. Sablon-mentés felülírásra vált (C7/D573) — EXPLICIT ELTÉRÉS a ma dokumentált/tesztelt viselkedéstől

`DemoStorage.saveTemplate()` a jelenlegi legfrissebb `-vN.md` fájlt
írja felül ezután, nem hoz létre újat — a MEGLÉVŐ fájlnevek nem
átnevezve (D574), csak a tartalmuk cserélődik. A történeti igazság
innentől kizárólag a mentett PDF (C9), amit a `Plan.sablonVerzio`
törlése (MÁR a 81. tételben eldöntve) is feltételez.

**Miért:** a user explicit megkérdezve, megerősítette a redesign C7/C9
irányát — a `Plan.sablonVerzio` már törölve lesz (81. tétel), tehát a
verziófájlok további létrehozása amúgy sem lenne semmihez pinnelve.

**Elvetett alternatíva:** marad a mai verziózás, csak a `Plan`
oldalról törölve a pin — elvetve; a user a teljes C7-irány mellett
döntött, nem egy féloldalas megoldás mellett.

### 2. „Jelenleg: ...md” technikai fájlnév-metaadat MARAD

A metaadat (D571/D572, read-only) megmarad — akkor is, ha az érték
innentől állandó marad egy adott base-hez.

**Miért:** a user explicit a D571/D572 „AS-IS marad” döntése mellett
állt — a jövőbeli `FileSystemStorage`-váltás alatt is hasznos lehet
jelezni, MELYIK fájlt írja felül a mentés.

### 3. Kézi sortörés-megőrzés EXPLICIT ELVETVE

A D590/D591 („egy Enter = sortörés a PDF-en”) elvetve — a mai,
kommenttel indokolt szoft-tördelő viselkedés (`parseBlocks()`
`lines.join(' ')`-je egy bekezdésen belül) VÁLTOZATLAN marad; csak
üres sor választ szét bekezdést.

**Miért:** a user explicit a kockázatmentes utat választotta — a
megfordítás a 6 seed-sablon és a doki eddigi szövegeinek renderelését
megváltoztatta volna, nem szándékolt sortörésekkel.

### 4. Félkövér + számozott lista támogatás bekerül (D588 másik fele)

A `MdBlock` típus kap egy `'ol'` ágat (a mai `'ul'` `- `-mintájára,
`1. `-tal kezdődő sorokra), és a bekezdés-szöveg belsejében a
`**...**` szakaszok félkövérként renderelődnek a PDF-en. A
`#`/`##`/`###` fejléc-szintek VÁLTOZATLANUL nem támogatottak — a mai
`stripMarkdownHeading()` csak az ELSŐ sort kezeli speciálisan, a
törzsben megjelenő `#`/`##` sorok literál szövegként maradnak (D589,
már ma is megfelel).

**Miért:** a user explicit mindkettő bekerülése mellett döntött — ez a
D588 dokumentált markdown-alkészletének hiányzó fele, alacsony
kockázatú additív bővítés (nem érinti a meglévő `- ` listákat vagy
bekezdéseket).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- `Plan.sablonVerzio` mező törlése — MÁR a 81. tételben eldöntve.
- A placeholder-ellenőrzés (üres/whitespace/`PLACEHOLDER`)
  kiterjesztése/hard block — 87. tétel (következő) és a 81. tétel
  D581-döntése.
- HU/Deutsch közös nyelvváltó, nem mentett HU/DE form-state
  megmaradása, közös Mentés/Mégse, egyszerű textarea (nincs rich
  text) — MÁR MEGVAN, nincs új munka.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/storage/DemoStorage.ts` `saveTemplate()`.
- `app/src/pdf/markdownLite.ts` `parseBlocks`/`MdBlock` (`'ol'` ág,
  inline bold).
- `app/src/pdf/TervDocument.tsx` `MdBlocks` renderer (bold span +
  számozott lista renderelés).

## Tesztelés (irányadó, nem kimerítő)

- Egy sablonszöveg mentése a MEGLÉVŐ `-vN.md` fájlt írja felül, nem
  hoz létre `-v(N+1).md`-t.
- A „Jelenleg: ...md” metaadat továbbra is látszik, állandó értékkel.
- Egy bekezdésen belüli kézi sortörés a PDF-en TOVÁBBRA IS
  szóközzel összefűzve jelenik meg (nem hard break).
- `**szöveg**` a PDF-en félkövérként jelenik meg.
- `1. `-tal kezdődő sorok számozott listaként renderelődnek.
- `##`-tal kezdődő törzsbeli sor literál szövegként jelenik meg.
