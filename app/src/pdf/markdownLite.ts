// A sablonszövegek egyszerű markdown-t használnak (egy "# Cím" sor + üres
// sorokkal elválasztott bekezdések és "- " listaelemek). Nem éri meg egy
// teljes markdown parsert behúzni ezért a pár bekezdéses szövegért -- ez a
// pár kis függvény elég.

export function stripMarkdownHeading(md: string): string {
  return md.replace(/^#[^\n]*\n+/, '').trim();
}

export type MdBlock = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };

/**
 * A sablonszöveg (cím nélküli) törzsét bekezdésekre és felsorolásokra
 * bontja, üres sorok mentén. Egy szakasz `ul`, ha MINDEN sora "- "-tal
 * kezdődik, egyébként `p` -- a sorai szóközzel összefűzve, hogy egy
 * forrásban kézzel tördelt hosszú mondat a PDF-en normál bekezdésként
 * törjön újra, ne a forrás sortörésein.
 */
export function parseBlocks(md: string): MdBlock[] {
  const body = stripMarkdownHeading(md);
  const chunks = body
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.map((chunk) => {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const isList = lines.length > 0 && lines.every((line) => line.startsWith('- '));
    if (isList) {
      return { kind: 'ul', items: lines.map((line) => line.slice(2).trim()) };
    }
    return { kind: 'p', text: lines.join(' ') };
  });
}

/**
 * `{{kulcs}}` alakú helyőrzőket cserél a megadott értékekre (pl. a
 * nyilatkozat "megbízom {{orvos}} fogszakorvost" mondatában). Ismeretlen
 * kulcsot változatlanul hagy -- egy elgépelés így látható marad a PDF-en,
 * nem tűnik el némán.
 */
export function fillPlaceholders(md: string, values: Record<string, string>): string {
  return md.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match,
  );
}
