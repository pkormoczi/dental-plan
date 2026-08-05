// A sablonszövegek egyszerű markdown-t használnak (egy "# Cím" sor +
// "- " listaelemek). Nem éri meg egy teljes markdown parsert behúzni ezért
// a pár soros szövegért -- ez a két kis függvény elég.

export function stripMarkdownHeading(md: string): string {
  return md.replace(/^#[^\n]*\n+/, '').trim();
}

export function extractBulletLines(md: string): string[] {
  return md
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}
