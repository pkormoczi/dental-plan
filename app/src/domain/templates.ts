// A sablon (nyilatkozat/fizetési feltételek/garancia) jogi-lezáratlanság jelölője --
// EGYETLEN forrás, hogy egy sablon szövege mikor számít még jogilag le nem
// zártnak (lásd docs/03-funkcionalis-spec.md § Sablon-placeholder őr). A
// zárójeles forma a kanonikus -- a seed szövegek mindig
// "[PLATZHALTER ...]"/"[PLACEHOLDER ...]" alakban kezdik a jelölést, egy
// jövőbeli, a szót csak emlegető, de valódi szövegen ez nem üt félre.

/** Igaz, ha a sablon törzse még a jogi-munka helykitöltőt tartalmazza. */
export function isPlaceholderTemplate(body: string): boolean {
  return body.includes('[PLACEHOLDER') || body.includes('[PLATZHALTER');
}
