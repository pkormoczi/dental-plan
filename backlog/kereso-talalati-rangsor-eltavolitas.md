# kereso-talalati-rangsor-eltavolitas
Type: bug
Source: review:2026-09-09-doctor-review-elso-megnyitas#1
Target: master
Baseline: 8232c597ff7efce07874c66a7abc48122cdbb213

## Goal
Amíg van másik névtalálat, az „eltávolítás"-jellegű tétel nem lehet az Enter alapértelmezése:
„gyokertomes"-re a `Gyökértömés csatornaszámtól függően`, „koron"-ra egy korona-tétel kerül a sorba.

## Current state
- `app/src/domain/search.ts` `rangsoroltTetelTalalatok` — a komparátor `rang` → `gyakori` → `csomag`
  → árlista-index; a relevancia-szintet a `tetelNevRang`/`nyelviRang` adja (névkezdet > szóhatár >
  belső egyezés), a két nyelv jobbik rangjával.
- A seeden (`data/arlista.seed.json`): „gyokertomes" → `t015` és `t016` egyaránt rang 0, a sorrendet
  az árlista-index dönti el; „koron" → `t091` az egyetlen rang 0.
- `app/src/pages/planEditor/ItemPicker.tsx` — 1. szint a rangsorolt névtalálat, 2. szint a CSAK
  kategórianéven egyező tétel; az Enter mindig a `valaszthato[0]`, azaz a legjobb névtalálat.
- Az árlista-admin keresője (`app/src/domain/arlistaSzures.ts` `tetelIlleszkedik`) nem rangsorol.
- Meglévő, sorrendet rögzítő tesztek: `app/src/domain/search.test.ts` „a szóhatár-egyezés megelőzi a
  belső egyezést, az árlista-sorrend ellenére", „azonos rangon és jelölés nélkül a kapott
  árlista-sorrend marad"; `app/src/pages/planEditor/ItemPicker.test.tsx` „beírás után az Enter a
  legrelevánsabb találatot veszi fel, nem az árlistában elsőt".

## Approach
`app/src/domain/search.ts`: kulcsszó-alapú büntetés-jelző, és a komparátor ELSŐ kulcsaként a
relevancia elé kerül. Tesztek: `app/src/domain/search.test.ts`, plusz egy Enter-szintű eset az
`ItemPicker.test.tsx` „találat-rangsor" blokkjában.

NEM tartozik ide: találat szűrése vagy elrejtése; a kategória-blokk sorrendje és a kétszintű
felépítés; az árlista-admin keresője; a `Tetel` séma (nincs új mező); az árlista adatai
(tételnév-átírás, `gyakori` jelölés); a német összetett szavak felismerése.

## Decisions
- A büntetés a relevancia ELŐTT dönt — mert „koron"-nál az eltávolítás az egyetlen rang 0 találat,
  egy rang utáni tie-break ott semmit nem mozdítana.
- Csak külön tokenként álló kulcsszó büntet (`eltavolit`/`felvag`/`visszabont` token-prefix, a `norm`
  utáni alakon) — mert a `Fogeltávolítás`, `Fogeltávolítás emelővel/sebészi feltárással` és a
  `Fogkőeltávolítás` kategória önálló, elsődleges kezelés, nem egy pótlás ellentéte.
- Néma a büntetés, ha a keresőszöveg maga a kulcsszóra illeszkedik — mert aki „eltávolítás"-t gépel,
  azt keresi; egy szabály fedi mindkét irányt.
- A jelző mindkét nyelvi néven fut, de a német összetett alak (`Kronenentfernung`) nem tokenizálható:
  német néven a büntetés nem fog — vállalt korlát, a doki magyarul gépel.
- A helper a `domain/search.ts`-ben marad, nincs új modul — mert a rangsor egésze ott él.
- A `Tejfog eltávolítás` és a `Fogbél megnyitás, eltávolítás` is büntetést kap — mert a szabály
  szöveges, nem tétel-lista; „tejfog"-ra a `Tejfog tömés` kerül előre, az eltávolítás eggyel lejjebb.

## Verification
- [ ] tests — „gyokertomes"-re a `csatornaszámtól függően` az első és az `eltávolítása` közvetlenül
      utána marad a listában; „koron"-ra a `Korona felvágás eltávolítás /db` nem az első találat;
      „eltavolitas"-ra viszont igen; a `Fogeltávolítás` a „fog" keresésen nem kap büntetést; a
      meglévő rangsor-tesztek zöldek; ItemPicker: beírás + azonnali Enter a pótlás-tételt veszi fel
- [ ] typecheck/lint
- [ ] docs-check
