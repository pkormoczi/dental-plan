# manual-checks — all — 2026-09-06

Kontextus: az `/implement-batch` négy tétele után (`konzol-buffer-is-not-defined`,
`tervmappa-nev-nem-koveti-egyeni-cimet`, `seed-terv-datum-az-iment`,
`urlap-mezo-id-name`), commit-lánc `1629183..f2f652b`, push előtt.

Környezet: `npm run dev` (Vite, `http://localhost:5175/dental-plan/`), izolált
`chrome-devtools-mcp@1.6.0 --isolated --headless=true`, 1440×900. Determinisztikus
reset minden szcenárió előtt (`localStorage` `dp:` kulcsok törlése + `about:blank` →
teljes újratöltés).

---

## `pdf` szelet

Szcenárió: `+ Új kezelési terv` → `+ Új páciens` "Tőkés Ödönné" → `#/terv` sor
"Gyökértömés csatornaszámtól függően" (ő/ű, sávos), fog 26 → `#/elonezet`.

- **`konzol-buffer-is-not-defined` közvetlen ellenőrzése**: `list_console_messages` az
  előnézet-renderelés után — **nincs "Buffer is not defined" figyelmeztetés** (sem a
  kezdeti renderen, sem a véglegesítés utáni sikerképernyőn). Ez a jsdom-vakfolt, amit
  a vitest-készlet nem tud lefedni; a shim élesben bizonyítottan működik.
- Fontok ténylegesen letöltődtek: `NotoSans-Regular.ttf` (59 840 B), `NotoSans-SemiBold.ttf`
  (59 908 B).
- Nyers PDF-bájtok (`Blob`-elfogás `initScript`-tel): `%PDF-1.3`, 923 935 B, 3 oldal,
  `objStmCount: 0` (a regex-vizsgálat megbízható). `allBaseFonts`: 2× `BOBPSB+NotoSans-Regular`,
  2× `PLFYLA+NotoSans-SemiBold` ténylegesen beágyazva (`fontFile2Count: 2`) — a magyar
  szöveg ezekkel rendereli az ő/ű-t. `hasHelvetica: true` is jelen van (a könyvtár
  alapértelmezett/nem használt referenciájaként) — nem jelez hibát, a látott szöveg
  végig NotoSans.
- `imageXObjects: 4` — fogtérkép + fejléc-logó a 3 oldalon.
- Glyphek vizuálisan (screenshot): "Gyökérkezelés", "Tőkés Ödönné", "Gyökértömés
  csatornaszámtól függően" — az ő/ű mindenhol helyesen renderel, fogtérkép a 26-os
  fogat sárgával jelöli.
- Konzol a teljes menetben (előnézet renderelés, véglegesítés, sikerképernyő): **1
  visszatérő `[issue]` — "A form field element should have an id or name attribute
  (count: 2)"**. A főkeretben (`document.querySelectorAll('input,textarea,select')`)
  **0 mező** van ezeken az oldalakon — a 2 találat a beágyazott, natív Chrome
  PDF-nézegető (`chrome-extension://…/index.html`) saját "Page number"/"Zoom level"
  mezőiből jön, nem az app kódjából. Ez a `urlap-mezo-id-name` tétel hatókörén kívül
  esik (böngésző-saját UI), és nem az app hibája.
- Placeholder-zár / letöltés-instrumentálás: nem futtattam le ebben a menetben (a
  batch egyik tétele sem érinti ezt a logikát) — ezt egy jövőbeli, ide vágó tételnél
  érdemes lefedni.

## `tervmappa-nev-nem-koveti-egyeni-cimet` — élő végpontig futtatott ellenőrzés

Ugyanabban a menetben: a "Terv adatai" lapon a Terv címe mezőbe **"Gyökérkezelési
konzultáció"** kézzel beírva (a domináns kategória "Gyökérkezelés" lett volna
automatikusan), majd véglegesítve.

- Sikerképernyő: `Tőkés-Ödönné_k13tkp / Gyökérkezelési konzultáció_5l1cwl /
  2026-09-06_v1` — **a mappanév a beírt címet tükrözi, nem a domináns kategóriát.**
- "Korábbi tervek" lista ugyanazt a címet mutatja a lánc fejléceként.
- Nincs konzolhiba a mentés/betöltés során.

Ez a jsdom-teszteken túl, valódi böngészőben, végponttól végpontig igazolja a
tételt.

## `seed-terv-datum-az-iment` — Kezdőlap élő ellenőrzése

- Kezdőlap "Legutóbbi páciensek" (friss demó, betöltés után azonnal): a lista
  legfrissebb tagja "Gál Hanna … 15 perce" — **egyetlen "az imént" bejegyzés sincs.**
- Kiss Márta az `/uj-terv` bővebb (top-20) listában **"Terv véglegesítve · 2 napja"**
  címkével jelenik meg — az elvárt offset szerint, nem a régi 30 másodperces "az
  imént" sávban.

## `urlap-mezo-id-name` — mezőnkénti id/autoComplete ellenőrzés élő DOM-on

`document.querySelectorAll('input,textarea,select')` + duplikált-id ellenőrzés,
route-onként:

| Route/felület | Mezők | Hiányzó id/name | Duplikált id |
|---|---|---|---|
| `#/paciens` (Terv adatai, PII) | 8 | 0 | — |
| `#/terv` (LineRow, 1 sor) | 6 (`mennyiseg-0-0`, `ar-0-0`, `nev-0-0`, `fog-0-0`, `fazis-nev-0`, `kereso-fazis-0`) | 0 | 0 |
| `#/arlista` (kereső, listázott állapotban) | 1 | 0 | — |
| `#/arlista` (nyitott SAVOS tétel, `t016`) | 9 (`huf-ar-tol-t016`, `huf-ar-ig-t016`, `eur-ar-tol-t016`, `eur-ar-ig-t016`, `nev-hu-t016`, `nev-de-t016`, `leiras-hu-t016`, `leiras-de-t016`, kereső) | 0 | 0 |
| `#/beallitasok` (Rendelő adatai) | 7 (`rendelo-*` × 6, `orvos-nev-0`) | 0 | 0 |
| `#/beallitasok?tab=nyomtatvanyok` | 3 (`sablon-nyilatkozat`, `sablon-fizetesi-feltetelek`, `sablon-garancia`) | 0 | — |
| `#/beallitasok` Egyéb tab | 1 (`ajanlat-ervenyesseg-nap`) | 0 | — |
| Új páciens dialógus (`UjPaciensDialog`) | 3 (`uj-paciens-nev`, `uj-paciens-szuletesiido`, `uj-paciens-telefon`) | 0 | — |

- PII mezők `autoComplete` attribútuma élesben ellenőrizve (`#/paciens`):
  `paciens-nev`, `paciens-szuletesiido`, `paciens-taj`, `paciens-lakcim`,
  `paciens-telefon`, `paciens-email` mind `autocomplete="off"`. `terv-cime` és
  `terv-ervenyes-eddig` (nem PII) helyesen `null`.
- Vizuálisan (screenshot, nyitott SAVOS tétel): a form elrendezés változatlan, az új
  `id` attribútumok nem hatottak a layoutra/stílusra.
- A billentyűzetes tételfelvitel-ciklus (gépel → ArrowDown → Enter → kereső ürül,
  fókusz marad) a menet közben ténylegesen lezajlott (a "Gyökértömés
  csatornaszámtól függően" sor felvétele) — töretlen.

---

## Találatok

### Közepes
- **`control-no-border`** (`visual-css` szelet öröksége, NEM ennek a batchnek a
  hatása): `#/arlista` oldalon 13 kontroll (pl. `+ Új tétel`, "Keresés a tételek
  között" input, a `SegmentedControl`/`RadioGroup` szűrő-chipek) box-shadow/border
  nélkül mérve a snippet szerint. Az `id`/`name`/`autoComplete` attribútumok
  bizonyíthatóan NEM hatnak border/box-shadow computed style-ra, tehát ez nem
  ennek a batchnek a regressziója — de nem is volt korábban külön dokumentálva.
  Javaslat: `/idea arlista-kontroll-keret-hianyzik docs/reviews/2026-09-06-manual-checks-all.md`
  (dedup: `ls backlog backlog/later backlog/idea backlog/idea/later` — nincs ilyen
  slug vagy `Source:` még).

### Apró
- Nincs.

### Nem ellenőrizhető
- `prefers-reduced-motion` — a `emulate` tool nem támogat CSS media-feature
  emulációt (lásd `SKILL.md`).
- Placeholder-zár valós bájtokon, letöltés-instrumentálás, popover-geometria,
  fókuszgyűrű/`paint-order` mélyellenőrzés — ebben a menetben nem futtattam, mert
  egyik batch-tétel sem érinti ezeket a kódutakat; a `keyboard-a11y`/`visual-css`
  szeletek részletes checklistjét egy azokat érintő jövőbeli tételnél érdemes
  lefuttatni.

## Összegzés

A négy tétel mindegyike élő böngészőben, valódi PDF-bájtokon és valódi DOM-on
megerősítve:
- `konzol-buffer-is-not-defined`: a figyelmeztetés ténylegesen eltűnt.
- `tervmappa-nev-nem-koveti-egyeni-cimet`: a mappanév a kézi címet követi,
  végpontig futtatva.
- `seed-terv-datum-az-iment`: a Kezdőlapon nincs "az imént" bejegyzés.
- `urlap-mezo-id-name`: minden ellenőrzött route/dialógus minden mezőjének van
  id-je/name-je, nincs duplikáció, a PII mezők `autoComplete="off"`-ot kapnak; az
  egyetlen fennmaradó "form field…" konzol-jelzés a natív Chrome PDF-nézegető
  saját UI-jából jön, nem az appból.

Egy találat sem `Kritikus`, egy `Közepes` (pre-existing, nem e batch hatása).

Futásidő: kb. 25 perc.
