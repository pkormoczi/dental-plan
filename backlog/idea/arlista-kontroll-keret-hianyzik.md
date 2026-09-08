# arlista-kontroll-keret-hianyzik
Type: bug
Source: manual-checks all-szelet (2026-09-06), Közepes találat — docs/reviews/2026-09-06-manual-checks-all.md

A `#/arlista` oldalon 13 kontroll (pl. a „+ Új tétel” gomb, a „Keresés a tételek között” input, a
SegmentedControl/RadioGroup szűrő-chipek) a `visual-css` szelet mérése szerint keret és box-shadow
nélkül jelenik meg — a `controlBorder` invariáns (`app/src/CLAUDE.md`) minden interaktív kontrollnak
3:1 keretet ír elő. A jelenség NEM az `/implement-batch` négy tételének
(`konzol-buffer-is-not-defined`, `tervmappa-nev-nem-koveti-egyeni-cimet`, `seed-terv-datum-az-iment`,
`urlap-mezo-id-name`) hatása — az `id`/`name`/`autoComplete` attribútumok bizonyíthatóan nem hatnak
border/box-shadow computed style-ra —, csak korábban nem volt külön dokumentálva. Megjegyzés: a
`control-border-meres-radix-wrapper` tétel épp a mérőeszköz (`visual-css.md` snippet) hamis
nullázását javítja; ha a javított méréssel ez a 13 kontroll változatlanul keret nélkül marad, valódi
hiány, ha eltűnik, a mérési hiba tünete volt — a `/plan` induláskor érdemes ezt előbb ellenőrizni.
