# manual-checks — `visual-css` szelet, 2026-09-07

Kiváltó: `/implement savos-ar-savon-beluli-ertek` 5b lépése. A tétel `Verification`-je azért
kérte ezt a szeletet, mert a Listaár cella egy számról egy sáv-tartományra (`38 000 Ft–65 000
Ft`) váltott, és a törés/kiszorítás kizárólag valódi kaszkáddal ellenőrizhető (jsdom alatt
nincs Radix CSS).

Környezet: izolált, headless Chrome (`.mcp.json`, `--isolated`), `npm run dev`, 1440×900 és
1280×720, seed demó adat. Futásidő: ~10 perc.

## A tételhez tartozó ellenőrzés — rendben

A sáv-tartomány a `#/terv` Listaár oszlopában **egy sorban marad**, a `whiteSpace: nowrap` a
`Text` elemen ül:

| mérés | 1440×900 | 1280×720 |
|---|---|---|
| szöveg szélessége / cella | 139 px / 154 px | 120 px / 154 px |
| tördelt (magasság > 1,5 sor) | nem | nem |
| bármely cella túlcsordul | nem | nem |
| tábla / oldal vízszintes túlcsordulás | nem | nem |

Járulékos, ugyanebben a menetben igazolt viselkedés: sávon belüli áron (55 000 Ft) nincs
eltérés-jelvény és nincs „Eltérés a listaártól" sor, a ↺ visszaállító gomb viszont látható
marad; sávon kívül (76 000 Ft) `+100%` jelvény a sáv aljához mérve és „Eltérés a listaártól:
+38 000 Ft"; a lezárt terv nézetén (Kovács János v1) a sávon belüli soron sem jelvény, sem
halvány listaár-sor nem jelenik meg. Konzol mindkét route-on tiszta (0 error/warn).

## Közepes — nem ehhez a tételhez tartozik, már felvett tétel fedi

### 1. Halvány slate szöveg 4,34:1

 (`rgb(100, 116, 139)`), a `#/terv` ár-cellái (köztük az új
sáv-tartomány, változatlan színnel és mérettel), a „Növelés"/„Csökkentés" léptető-feliratok,
és a Terv részletei ár-oszlopa. → `backlog/idea/terv-lap-halvany-szoveg-kontraszt.md`
- Döntés: javítva terv-lap-halvany-szoveg-kontraszt (2026-09-09)
### 2. Amber jelvény-feliratok 3,95:1

 (`rgb(171, 100, 0)`): a `+100%` eltérés-jelvény és a
„Becsült ár" jelvény. A felvett tétel kimondja, hogy a javítás a tokennél dől el, és
nevesíti a jelvényeket. → `backlog/idea/checklist-callout-szoveg-kontraszt.md`
- Döntés: javítva checklist-callout-szoveg-kontraszt (2026-09-09)

Egyik sem regresszió: mindkét szín és méret változatlan a tétel diffjéhez képest, a sáv-string
ugyanazt a `uiTextFaint` tokent használja, mint korábban az egyszámos listaár.

## Apró — triázsra vár, nincs felvéve

### 3. `control-no-border`: 10 kontroll

 keret és `box-shadow` nélkül a `#/terv`-en; a minta
döntően `solid` Button (`Előnézet`, sötét kitöltéssel) és Radix `TextField` belső
`<input>`-jei. Utóbbiaknál a látható keret a wrapperen ül, tehát a mérés a Radix
DOM-szerkezete miatt vélhetően téves pozitív; a `solid` Button esetét a szelet-fájl maga
nevesíti kivételként. Nem a tétel diffjéből ered. Eldöntéséhez a snippet pontosítása kellene
— a doki döntése, hogy megéri-e:
- Döntés: javítva control-border-meres-radix-wrapper (2026-09-09)

```
/idea control-border-meres-radix-wrapper docs/reviews/2026-09-07-manual-checks-visual-css.md
```

## Nem ellenőrizhető

`prefers-reduced-motion` — az `emulate` tool nem támogat CSS media-feature emulációt
(`SKILL.md`).
