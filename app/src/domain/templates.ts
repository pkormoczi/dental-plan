// A sablon (nyilatkozat/fizetési feltételek/garancia) jogi-lezáratlanság jelölője --
// EGYETLEN forrás, hogy egy sablon szövege mikor számít még jogilag le nem
// zártnak (lásd docs/03-funkcionalis-spec.md § Sablon-placeholder őr). A
// zárójeles forma a kanonikus -- a seed szövegek mindig
// "[PLATZHALTER ...]"/"[PLACEHOLDER ...]" alakban kezdik a jelölést, egy
// jövőbeli, a szót csak emlegető, de valódi szövegen ez nem üt félre.

import { stripMarkdownHeading } from '../pdf/markdownLite';

/**
 * Igaz, ha a sablon törzse még a jogi-munka helykitöltőt tartalmazza, VAGY
 * a doki egyszerűen kiürítette a szöveget. Az ürességet a markdown-címsor
 * levágása UTÁN mérjük -- a `NyomtatvanyokTab` mentéskor mindig kiírja a
 * "# Cím" sort, tehát egy ténylegesen kiürített szöveg törzse önmagában
 * sosem lenne `''`.
 */
export function isPlaceholderTemplate(body: string): boolean {
  return (
    body.includes('[PLACEHOLDER') ||
    body.includes('[PLATZHALTER') ||
    stripMarkdownHeading(body) === ''
  );
}

/**
 * Igaz, ha a sablon törzse ténylegesen nyomtatható PDF-re. A `TervDocument.tsx`
 * a fizetési feltételek/garancia szekció (címmel együtt történő) kihagyásához
 * hívja a MÁR feloldott (HU-visszaesés utáni) szövegre -- lásd
 * docs/03-funkcionalis-spec.md § Sablon-placeholder őr.
 */
export function sablonNyomtathato(body: string): boolean {
  return !isPlaceholderTemplate(body);
}
