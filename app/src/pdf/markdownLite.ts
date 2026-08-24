// A sablonszövegek egyszerű markdown-t használnak (egy "# Cím" sor + üres
// sorokkal elválasztott bekezdések, "- " listaelemek, "1. " számozott
// listaelemek és `**félkövér**` inline jelölés). Nem éri meg egy teljes
// markdown parsert behúzni ezért a pár bekezdéses szövegért -- ez a pár kis
// függvény elég.

export function stripMarkdownHeading(md: string): string {
  return md.replace(/^#[^\n]*\n+/, '').trim();
}

export type MdBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: Array<{ marker: string; text: string }> };

/**
 * A sablonszöveg (cím nélküli) törzsét bekezdésekre és felsorolásokra
 * bontja, üres sorok mentén. Egy szakasz `ul`, ha MINDEN sora "- "-tal
 * kezdődik, `ol`, ha MINDEN sora számmal és ponttal kezdődik (pl. "1. "),
 * egyébként `p` -- a sorai szóközzel összefűzve, hogy egy forrásban kézzel
 * tördelt hosszú mondat a PDF-en normál bekezdésként törjön újra, ne a
 * forrás sortörésein.
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
    const orderedMatches = lines.map((line) => /^(\d+)\.\s+(.*)$/.exec(line));
    const isOrdered = orderedMatches.length > 0 && orderedMatches.every(Boolean);
    if (isOrdered) {
      return {
        kind: 'ol',
        // A beírt sorszám (`marker`) jelenik meg, nem 1-től újraszámolt --
        // egy üres sorral kettévágott lista második fele így nem ugrik
        // vissza 1-re a PDF-en.
        items: orderedMatches.map((m) => ({ marker: m![1], text: m![2] })),
      };
    }
    return { kind: 'p', text: lines.join(' ') };
  });
}

export type MdSpan = { text: string; bold: boolean };

/**
 * Egy bekezdés/listaelem szövegét `**félkövér**` szakaszokra bontja. Egy
 * párosítatlan `**` literálként marad -- a `fillPlaceholders` "ismeretlen
 * kulcs látható marad" elvének megfelelően egy elgépelés nem tűnhet el
 * némán egy szerződéses szövegből.
 */
export function parseInline(text: string): MdSpan[] {
  const spans: MdSpan[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index), bold: false });
    spans.push({ text: m[1], bold: true });
    last = re.lastIndex;
  }
  if (last < text.length) spans.push({ text: text.slice(last), bold: false });
  return spans.length > 0 ? spans : [{ text, bold: false }];
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
