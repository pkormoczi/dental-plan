# Backlog 76. tétel — PDF oldalváz: fejléc/lábléc/oldalszám — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 76. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-070
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D356`–`D428`, `D582`, `D587` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A mai `pdf/TervDocument.tsx` négy fix `<Page>` elemből áll (1. oldal:
terv+ár, 2. oldal: fizetési feltételek, 3. oldal: garancia, 4. oldal:
nyilatkozat+aláírás). Ez két konkrét, reprodukálható hiányt okoz:

1. **Ha az 1. oldal tartalma túlcsordul** (sok fázis), a react-pdf a
   MainHeadert nem ismétli — csak a `fixed` lábléc jelenik meg minden
   fizikai oldalon, a kompakt fejléc (`MiniHeader`) NEM, mert az csak
   ott renderelődik, ahol új `<Page>` elem kezdődik. A folytatólagos
   fizikai oldal fejléc nélkül jön ki.
2. **A fizetési feltételek és a garancia külön fix oldalon van** — a
   redesign (D582) folyamatos tördelést kér a kettőre, a mai kód ezt
   nem engedi (mindkettő saját `<Page>`).
3. **Hosszú páciensnév a láblécben** (D426–D428) nem kezelt — a mai
   `footer` `position: 'absolute'`, fix `paddingBottom`, a név a saját
   sorában törhet, de a lábléc-terület mérete nem alkalmazkodik.

## Döntések

### 1. Három folyó blokk a mai négy fix `<Page>` helyett

A dokumentum három logikai blokkra tagolódik, mindegyik szabadon
túlfolyhat több fizikai oldalra:

```
[1. blokk: fejléc + páciensadatok + fogtérkép + fázisok + Összesítés]
══ explicit törés ══
[2. blokk: Fizetési feltételek + Garancia, folyamatosan egymás után]
══ explicit törés ══
[3. blokk: Nyilatkozat + aláírásblokk]
```

D420 (explicit törés az Összesítés után, mielőtt a dokumentum további
részei jönnének) és D582 (a fizetési feltételek és a garancia EGY
folyamban tördelhető, a nyilatkozat mindig új oldalon indul) ezt írja
elő. A mai 2. és 3. oldal (fizetési feltételek, garancia) egy blokká
olvad össze.

**Miért:** a react-pdf-ben egy `<Page>` határ MINDIG fizikai oldaltörés
— a folyamatos tördeléshez a tartalomnak EGY `<Page>` (vagy több,
egymást követő azonos-elrendezésű `<Page>`) `wrap`-elt gyermekei közt
kell élnie, nem külön `<Page>` elemekben.

### 2. Kompakt fejléc minden nem-első fizikai oldalon

A `MiniHeader` `fixed` propot kap, és a fő tartalom (nem csak a lábléc)
minden fizikai oldal tetején megjelenik, a `MainHeader` (nagy fejléc)
kizárólag az 1. blokk ELSŐ fizikai oldalán marad.

**Miért:** ma a `MiniHeader` a 2–4. oldal `<Page>` gyermekeként
renderelődik, ami csak az adott `<Page>` ELSŐ fizikai oldalán jelenik
meg — egy túlcsorduló 1. blokk (`MainHeader`-rel induló) folytatólagos
oldalai teljesen fejléc nélkül maradnak ma. A `fixed` prop garantálja,
hogy MINDEN fizikai oldalon megjelenjen, a blokkon belül is.

### 3. Lábléc: névhossz-alapú, dokumentum-szintű magasság (D426–D428)

A lábléc jobb blokkjának (páciensnév + árlista-dátum + oldalszám)
magassága a `plan.paciens.nev` hosszából egyszer, a dokumentum
renderelése előtt kiszámolt, MINDEN oldalon azonos érték — nem
oldalanként újraszámolt. A név max két sorba tördelhető, ellipszis
nélkül (D426); hosszú névnél az árlista-dátum + oldalszám külön sorra
kerül a név alá (D428).

**Kockázat, dokumentálva:** a `@react-pdf/renderer` nem ad
szövegmérést (nincs "mekkora ez a string ebben a fontban" API), ezért
a becslés karakterszám-heurisztika (pl. egy karakterenkénti szélesség-
közelítés a lábléc betűméretéhez). Egy rossz becslés tartalom-ütközést
okozhat (a név kilóg a lábléc-területből, vagy felesleges üres sor
marad). **Böngészős vizuális ellenőrzés kötelező** (a
`browser-validation` skill, kézzel indítva — a `.claude/skills/
browser-validation/` a `CLAUDE.md` szerint a valódi PDF-réteg
ellenőrzésének helye) legalább egy szélsőségesen hosszú páciensnévvel.

### 4. Folytatólagos szakaszcím csak ott, ahol natívan megy

- **D587 (Nyilatkozat – folytatás): MEGVALÓSUL.** A 3. blokk `render`
  propos `subPageNumber`-ét olvasva — ha `subPageNumber > 1`, egy
  „Nyilatkozat – folytatás" cím jelenik meg a blokk folytatólagos
  fizikai oldalának tetején. Ez működik, mert a 3. blokk EGY szakasz
  (a Nyilatkozat), tehát „hányadik fizikai oldala ennek a blokknak"
  pontosan „folytatás-e" kérdést válaszol meg.
- **D357 (fázis-folytatás), D363–D364 (leírás-folytatás), D415
  (megjegyzés-folytatás), D586 (fizetési feltételek/garancia-folytatás)
  EXPLICIT ELVETVE.** Az 1. és 2. blokk TÖBB fázist/szakaszt tartalmaz
  egyetlen folyamban — a react-pdf `render` propja csak a `<Page>`-en
  BELÜLI `subPageNumber`-t adja, nem árulja el, hogy egy adott fizikai
  oldal a blokkon belül MELYIK fázishoz/szakaszhoz tartozik. Ennek
  kifejezéséhez saját lapozómotor kellene (előre kiszámolni, mi hova
  esik) — hetes nagyságrendű munka, és minden layout-változás (fontméret,
  margó, új mező) újratörné a számítást.
- **Helyettük a natívan kifejezhető keep-together szabályok
  erősödnek** (`wrap={false}`, `break`, `minPresenceAhead`) — ezek a
  78./81./82. tételben (DP-072/075/076) valósulnak meg, és lefedik a
  D356/D360–D361/D365/D381/D414/D416–D419 szándékát (egyben-maradás,
  árva cím elleni védelem), anélkül hogy a react-pdf natív
  korlátaiba ütköznének.

### 5. `tervId` marad a láblécben

A D382 (footer szerkezet) nem sorolja fel explicit a `tervId`-t, de a
`docs/04-nyomtatvany-spec.md` „Lábléc" szakasza ezt indokolja: „a
tervazonosító ugyanaz, mint a mappanév — papírról vissza lehet keresni
a JSON-t." Ez a mai, dokumentált, jogilag is hasznos elem marad
változatlanul.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az 1. blokk BELSŐ tartalmának átrendezése (cím, páciensadatok,
  fogtérkép, fázisok sorrendje) — 77./78. tétel (DP-071/072).
- A 2. blokk (fizetési feltételek/garancia) TARTALMI döntései
  (placeholder-ellenőrzés kiterjesztése, cím-árvaság védelme) — 81.
  tétel (DP-075).
- A 3. blokk (nyilatkozat) árva-védelme az utolsó bekezdés és az
  aláírásblokk között (D584) — 82. tétel (DP-076), csak a D587
  folytatólagos cím-mechanizmusa tartozik ide.
- Az Összesítés blokk tartalmi/vizuális döntései — 79. tétel (DP-073).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pdf/TervDocument.tsx` — a négy `<Page>` szerkezet átalakítása
  három blokkra; `MiniHeader` `fixed`-esítése; a lábléc-magasság
  számítása.
- `app/src/pdf/labels.ts` — ha a „Nyilatkozat – folytatás" felirathoz
  új kulcs kell (HU+DE).
- `docs/04-nyomtatvany-spec.md` — az oldalszerkezet leírásának
  frissítése (négy fix oldal → három folyó blokk) a tétel lezárásakor
  (CLAUDE.md „Backlog-tétel lezárása" 2. lépése, KÉSŐBB, nem most).

## Tesztelés (irányadó, nem kimerítő)

- Sok fázisú/hosszú tervnél az 1. blokk túlcsordul: a folytatólagos
  fizikai oldal tetején megjelenik a kompakt fejléc.
- A fizetési feltételek és a garancia szövege együtt, megszakítás
  nélkül folyik át egy oldaltörésen, ha a tartalom hosszú.
- Rövid és nagyon hosszú páciensnévvel is a lábléc mindkét sora
  olvasható marad, a tartalom nem lóg ki és nem fedi egymást
  (böngészős vizuális ellenőrzéssel is, nem csak automata teszttel).
- A Nyilatkozat több oldalra törő szövege esetén a 2. fizikai oldal
  tetején megjelenik a „Nyilatkozat – folytatás" cím, az 1. fizikai
  oldalon nem.
- A lábléc `tervId`-je és oldalszáma minden fizikai oldalon jelen van,
  a teljes dokumentumon folyamatosan növekvő oldalszámmal.
