// Dokumentációs őr: olcsó, determinisztikus hibákat fog meg, szemantikai
// igazságot nem bizonyít. Öt szabály: (1) nincs D-szám hivatkozás, (2) nincs
// legacy-dokumentumra mutató hivatkozás, (3) az agent-context fájlok budgetje,
// (4) a context-fájlok path-qualified anchorai feloldhatók, (5) nincs
// elnémított/kiemelt teszt. Bármely találat exit 1.
//
// Futtatás: `node scripts/docs-check.mjs` a repó gyökeréből, vagy
// `npm run docs-check` az app/ alól -- a gyökeret a saját helyéből számolja.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- Konfiguráció -----------------------------------------------------------

const SCAN_ROOTS = [
  { dir: 'app/src', ext: ['.ts', '.tsx', '.css', '.md'], recursive: true },
  { dir: '.claude', ext: ['.md'], recursive: true },
  { dir: 'docs', ext: ['.md'], recursive: false },
];
const SCAN_FILES = ['CLAUDE.md', 'PRODUCT.md', 'README.md'];
const EXCLUDE_DIRS = [
  'app/src/assets',
  '.claude/worktrees',
  'docs/legacy',
  'docs/reviews',
  'node_modules',
  'dist',
];

// A régi dokumentációs modell fájljai: a migráció végéig a helyükön maradnak,
// utána docs/legacy/ alá kerülnek. Tartalmuk történeti, ezért nem scanneljük --
// a RÁJUK mutató hivatkozás viszont bárhol máshol hiba (LEGACY_PATTERNS).
const LEGACY_BOUND_DOCS = new Set([
  'docs/01-attekintes-es-dontesek.md',
  'docs/02-domain-modell.md',
  'docs/03-funkcionalis-spec.md',
  'docs/04-nyomtatvany-spec.md',
  'docs/05-technologia.md',
  'docs/07-felulet-rendszer.md',
  'docs/D-SZAM-FORRASKOD-LELTAR.md',
  'docs/PROBLEMS.md',
  'docs/agent-first-documentation-model_V2.md',
  'docs/agent-first-migracios-terv.md',
]);

// Valódi álpozitív tokenek (pl. egy fontnév), mindegyik mellé rövid indok.
const ALLOW_D_TOKENS = new Set([]);

const D_PATTERN = /\bD\d+\b|\bDP-\d+\b/g;

const LEGACY_PATTERNS = [
  /docs\/legacy/,
  /backlog\/done/,
  /BACKLOG_DONE/,
  /docs\/0[1-5]-/,
  /docs\/07-/,
  /D-SZAM-FORRASKOD/,
  /PROBLEMS\.md/,
  /agent-first-documentation-model/,
  /agent-first-migracios-terv/,
];

// Karakterben (nem byte-ban): a budget a betöltött context méretét méri.
const BUDGETS = [
  { match: (f) => f === 'CLAUDE.md', limit: 4000 },
  { match: (f) => f === 'PRODUCT.md', limit: 6000 },
  { match: (f) => /^app\/src\/.*CLAUDE\.md$/.test(f), limit: 2500 },
];

const isContextFile = (f) => f === 'CLAUDE.md' || f === 'PRODUCT.md' || /^app\/src\/.*CLAUDE\.md$/.test(f);
const isTestFile = (f) => /^app\/src\/.*\.test\.tsx?$/.test(f);

const SKIP_ONLY_PATTERN = /\b(?:it|test|describe)\.(?:skip|only)\(|\bx(?:it|describe|test)\(/;

// ---- Fájlbejárás ------------------------------------------------------------

const toRel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const isExcluded = (rel) => EXCLUDE_DIRS.some((d) => rel === d || rel.startsWith(d + '/'));

function collect({ dir, ext, recursive }) {
  const out = [];
  const walk = (abs) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const full = path.join(abs, entry.name);
      const rel = toRel(full);
      if (isExcluded(rel)) continue;
      if (entry.isDirectory()) {
        if (recursive) walk(full);
      } else if (ext.includes(path.extname(entry.name)) && !LEGACY_BOUND_DOCS.has(rel)) {
        out.push(rel);
      }
    }
  };
  const absRoot = path.join(ROOT, dir);
  if (statSync(absRoot, { throwIfNoEntry: false })?.isDirectory()) walk(absRoot);
  return out;
}

const files = [
  ...SCAN_ROOTS.flatMap(collect),
  ...SCAN_FILES.filter((f) => existsSync(path.join(ROOT, f))),
].sort();

const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf-8');

// ---- Szabályok --------------------------------------------------------------

const hibak = [];
const hiba = (file, line, rule, msg) => hibak.push({ file, line, rule, msg });

function dRef(file, lines) {
  lines.forEach((text, i) => {
    for (const m of text.matchAll(D_PATTERN)) {
      if (ALLOW_D_TOKENS.has(m[0])) continue;
      hiba(file, i + 1, 'd-ref',
        `${m[0]} -- a döntéstábla lezárt; írd le a lokális WHY-t, vagy hivatkozz PRODUCT.md / nested CLAUDE.md szakaszra`);
    }
  });
}

function legacyRef(file, lines) {
  lines.forEach((text, i) => {
    for (const p of LEGACY_PATTERNS) {
      const m = p.exec(text);
      if (m) hiba(file, i + 1, 'legacy-ref', `"${m[0]}" -- a régi dokumentáció történeti, nem normatív; ne hivatkozz rá`);
    }
  });
}

function budget(file, content) {
  const rule = BUDGETS.find((b) => b.match(file));
  if (!rule) return;
  const n = [...content].length;
  if (n > rule.limit) {
    hiba(file, 1, 'budget',
      `${n} / ${rule.limit} karakter -- erősebb mechanizmust (teszt/típus/lint) vagy redundanciát keress, ne production-refactort`);
  }
}

function slug(heading) {
  return heading
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

let productSlugs = null;
function productHeadingSlugs() {
  if (productSlugs) return productSlugs;
  const abs = path.join(ROOT, 'PRODUCT.md');
  productSlugs = new Set();
  if (existsSync(abs)) {
    for (const line of readFileSync(abs, 'utf-8').split('\n')) {
      const m = /^#{2,3}\s+(.+?)\s*$/.exec(line);
      if (m) productSlugs.add(slug(m[1]));
    }
  }
  return productSlugs;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ANCHOR_GRAMMAR = /^(file|symbol|test|product):(\S*?)(?:#(.+))?$/;

function resolveAnchor(raw) {
  const m = ANCHOR_GRAMMAR.exec(raw);
  if (!m) return `hibás anchor-nyelvtan: "${raw}" (várt: file:<p> | symbol:<p>#<id> | test:<p>#<név> | product:#<slug>)`;
  const [, type, p, rest] = m;
  if (type === 'product') {
    if (p || !rest) return `product-anchor alakja product:#<slug>: "${raw}"`;
    if (!existsSync(path.join(ROOT, 'PRODUCT.md'))) return `nincs PRODUCT.md, a product-anchor feloldhatatlan: "${raw}"`;
    if (!productHeadingSlugs().has(rest)) return `nincs "${rest}" ##/### címsor a PRODUCT.md-ben`;
    return null;
  }
  if (!p || !existsSync(path.join(ROOT, p))) return `nem létező fájl: "${p}"`;
  if (type === 'file') return rest ? `file-anchor nem kap #-részt: "${raw}"` : null;
  if (!rest) return `${type}-anchor #-rész nélkül: "${raw}"`;
  const content = read(p);
  if (type === 'symbol') {
    return new RegExp(`\\b${escapeRe(rest)}\\b`).test(content) ? null : `nincs "${rest}" azonosító a(z) ${p} fájlban`;
  }
  return content.includes(rest) ? null : `nincs "${rest}" nevű teszt a(z) ${p} fájlban`;
}

// Anchor-lista csak akkor, ha a `→` után közvetlenül `<típus>:` áll -- a prózai
// nyíl („gépel → Enter") nem anchor. Egy elgépelt típus (`symbo:`) így is
// nyelvtani hibát ad, mert a szegmenst ellenőrizzük.
const ANCHOR_START = /^\s*[a-z]+:/;

function anchor(file, lines) {
  lines.forEach((text, i) => {
    const idx = text.indexOf('→');
    if (idx < 0) return;
    const tail = text.slice(idx + 1);
    if (!ANCHOR_START.test(tail)) return;
    for (const seg of tail.split(';')) {
      const raw = seg.trim();
      if (!raw) continue;
      const problem = resolveAnchor(raw);
      if (problem) hiba(file, i + 1, 'anchor', problem);
    }
  });
}

function skipOnly(file, lines) {
  lines.forEach((text, i) => {
    const m = SKIP_ONLY_PATTERN.exec(text);
    if (m) hiba(file, i + 1, 'skip-only', `${m[0].trim()} -- egy nem futó vagy kiemelt teszt specifikációnak látszik, de nem az`);
  });
}

// ---- Futás ------------------------------------------------------------------

for (const file of files) {
  const content = read(file);
  const lines = content.split('\n');
  dRef(file, lines);
  legacyRef(file, lines);
  budget(file, content);
  if (isContextFile(file)) anchor(file, lines);
  if (isTestFile(file)) skipOnly(file, lines);
}

hibak.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const h of hibak) console.log(`${h.file}:${h.line}  [${h.rule}]  ${h.msg}`);

const perRule = {};
for (const h of hibak) perRule[h.rule] = (perRule[h.rule] ?? 0) + 1;
const osszegzes = Object.entries(perRule).map(([r, n]) => `${r}: ${n}`).join(', ');
console.log(`\ndocs-check: ${files.length} fájl átnézve, ${hibak.length} hiba${osszegzes ? ` (${osszegzes})` : ''}`);
process.exitCode = hibak.length ? 1 : 0;
