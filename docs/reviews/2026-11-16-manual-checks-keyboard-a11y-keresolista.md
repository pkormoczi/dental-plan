# manual-checks — `keyboard-a11y` szelet, 2026-11-16 (kereső-lista mérése)

Kiváltó: `/implement manual-checks-keresolista-ellenorzes` 2d lépése. A tétel a szelet-leírást
(`.claude/skills/manual-checks/keyboard-a11y.md`) javította: a tételkereső találati listájának
nyitottságát a lebegő Radix-elem helyett a kereső mező utáni listakonténer látható szövegén méri,
és a „Popover-geometria” szakaszt a soron belüli, portál-módú keresőre szűkíti
(`review:2026-11-16-manual-checks-keyboard-a11y-megerosito-ablak#2`).

Környezet: izolált, headless Chrome (`.mcp.json`, `--isolated`), `npm run dev`
(`http://localhost:5173/dental-plan/`), 1440×900 és 1280×720, seed demó adat, determinisztikus
reset a menet elején. Futásidő: ~10 perc.

## A tételhez tartozó ellenőrzés — rendben

Az új `listaNyitva` mérés a fázis alatti keresőn:

| Állapot | `listaNyitva` | Várt |
|---|---|---|
| „Fognyaki” begépelve, a lista látható | `true` | ✅ nyitott |
| Enter után, a Fog-megállón (a fókusz nem a keresőn) | `false` | ✅ zárt |
| Második Enter után, az üres keresőn | `false` | ✅ zárt |
| „Esztét” begépelve | `true` | ✅ nyitott |
| Escape után (üres kereső, a fókusz a keresőn) | `false` | ✅ zárt |

A régi jel (`[data-radix-popper-content-wrapper]`) ugyanebben a helyzetben nyitott listánál is
hamis volt (előző menet, 2026-11-16), az új mérés tehát valóban megkülönbözteti a két állapotot.

Popover-geometria a soron belüli, portál-módú keresőn (azonosítatlan sor, a leírásba felvett
előkészítéssel: a demó piszkozatba szúrt, név és tétel nélküli sor, majd teljes újratöltés),
„Korona” begépelve:

| Ablakméret | `nonZero` | `inViewport` | `hitInsideWrapper` |
|---|---|---|---|
| 1440×900 | ✅ true | ✅ true | ✅ true |
| 1280×720 | ✅ true | ✅ true | ✅ true |

A soron belüli kereső ugyanazt a „Tétel keresése” helyőrzőt használja, mint a fázis alatti; az
új `listaNyitva` mérés rá `false`-t ad (portál-módban a mező után nincs listakonténer), ezért a
nyitottságát a geometria-snippet méri. A leírás ezt kimondja.

Konzol: 0 hiba, 0 figyelmeztetés.

## Kritikus

Nincs.

## Közepes

Nincs.

## Apró

### 1. A `LineRow.tsx` kommentje szerint a kereső módú sort a fogtérkép-kattintás hozza létre, ez már nem igaz

Érintett: `app/src/pages/planEditor/LineRow.tsx` (`azonositatlan` fölötti komment). A komment szerint
a név és tétel nélküli, kereső módban induló sort a fogtérkép-kattintás hozza létre, és ez az
egyetlen ilyen eset. A `app/src/pages/PlanEditorPage.tsx` `onToothClick` viszont csak navigál
(kezeletlen fognál semmit nem tesz), összhangban a `docs/PRODUCT.md` Nem cél szakaszával, és éles
kód nem hoz létre név és tétel nélküli sort. A menetben ilyen sort a demó piszkozatba szúrva kellett
előállítani. A komment állítása hamis: a kódból olvasva a kereső mód induló ága ma akkor él, ha a
doki egy egyedi sor nevét kiüríti, és a sor újra megjelenik (lapváltás vagy újratöltés után), vagy
kívülről érkező piszkozatnál — ezt az utat a menet nem próbálta ki. A szelet-leírás a fogtérképes
példát használta, azt ez a tétel javította.
- Döntés: backlog linerow-kereso-mod-komment (2026-11-16)
