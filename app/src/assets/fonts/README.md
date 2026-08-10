# Betűtípus a PDF-hez

`@react-pdf/renderer` beépített Helvetica-ja nem tartalmazza az `ő`/`ű`
karaktereket, és variable fontot nem tud regisztrálni -- lásd
`docs/05-technologia.md` "Fontok" és CLAUDE.md. Ezért egy statikus,
Unicode-kompatibilis fontra van szükség.

## Forrás és licenc

**Noto Sans**, SIL Open Font License 1.1 (`OFL.txt` mellékelve).
Forrás: https://github.com/google/fonts/tree/main/ofl/notosans (variable font).

## Hogyan készült

A Google Fonts repóban a Noto Sans csak variable fontként (`wght`, `wdth`
tengelyekkel) érhető el, statikus `static/` mappa nélkül. A statikus
instance-eket a `fontTools` csomaggal állítottam elő, majd a fájlméret
csökkentéséért a teljes Noto Sans glyph-készletet (cirill, görög, vietnami
stb.) egy magyar/német szöveghez elegendő Unicode-tartományra szűkítettem:

```bash
python3 -m fontTools.varLib.instancer \
  -o NotoSans-Regular.ttf NotoSans-variable.ttf wght=400 wdth=100
python3 -m fontTools.varLib.instancer \
  -o NotoSans-SemiBold.ttf NotoSans-variable.ttf wght=600 wdth=100

UNICODES="U+0000-00FF,U+0100-017F,U+2000-206F,U+20A0-20CF,U+2190-21FF"
python3 -m fontTools.subset NotoSans-Regular.ttf \
  --output-file=NotoSans-Regular.ttf --unicodes="$UNICODES" --layout-features='*'
python3 -m fontTools.subset NotoSans-SemiBold.ttf \
  --output-file=NotoSans-SemiBold.ttf --unicodes="$UNICODES" --layout-features='*'
```

Ellenőrizve (`fontTools.ttLib` cmap-on keresztül), hogy mindkét fájl
tartalmazza: `ő ű Ő Ű` (magyar kettős ékezet), `ö ü ß` (a jövőbeli német
nyelvhez, D10), `€`, en/em dash.

Eredmény: ~60 KB fájlonként a 2 MB-os variable forrás helyett.

## Fontos: a name-tábla nem frissül automatikusan

A `varLib.instancer` az `OS/2.usWeightClass`-t helyesen állítja be
(400/600), de a name-táblát (nameID 1/2/4/6) **nem** nevezi át -- mindkét
instance name-rekordjai a forrás variable font alapértelmezését, `Regular`/
`NotoSans-Regular`-t mondják. `@react-pdf/pdfkit` a beágyazott fontok
cache-ét éppen ezzel a postscriptName-mel (nameID 6) kulcsolja
(`_fontFamilies[this._font.name]`), tehát a SemiBold-ot csendben a már
beágyazott Regularral helyettesíti -- ez csak a valódi PDF bájtjain
látszik (`docs/reviews/2026-08-10-browser-validation.md` K3 találata).

Ezért a fenti instancer+subset lépések UTÁN, minden nem-Regular súlyú
instance-nál explicit át kell írni a name-táblát, pl.:

```python
from fontTools.ttLib import TTFont

font = TTFont('NotoSans-SemiBold.ttf')
names = font['name']
for name_id, value in {
    1: 'Noto Sans SemiBold',
    2: 'Regular',
    3: '2.015;GOOG;NotoSans-SemiBold',
    4: 'Noto Sans SemiBold',
    6: 'NotoSans-SemiBold',
    16: 'Noto Sans',
    17: 'SemiBold',
}.items():
    names.setName(value, name_id, 3, 1, 0x409)
font.save('NotoSans-SemiBold.ttf')
```

A `glyf`/`OS/2`/`hmtx`/`cmap`/`head` táblákhoz ez nem nyúl -- azok már
helyesek az instancer után. A 16/17 (typographic family/subfamily)
hozzáadása konvenció, hogy a SemiBold ne jelenjen meg önálló családként a
súly-utótagos 1-es family mellett; a react-pdf beágyazási hibának
kizárólag a nameID 6 az oka.

## Frissítés

Ha a forrás variable font frissül, vagy több karakterre van szükség
(pl. új Unicode-tartomány), a fenti parancsokat kell újrafuttatni egy
frissen letöltött `NotoSans[wdth,wght].ttf`-fel.
