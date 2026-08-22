import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// A D-szám-termelés leállításának gépi őre — lásd CLAUDE.md "Komment-
// szabályzat" és "Backlog-tétel lezárása": a `docs/01` D-táblája lezárt,
// történeti napló, sem új sor nem kerülhet bele, sem meglévő D-szám nem
// hivatkozható új helyen. Ez a modul csak a kétirányú tilalmat méri —
// nem tudja, MI a helyes pótlás (docs-anchor/próza), csak azt, hogy a
// baseline-hoz képest nőtt-e a D-szám-készlet vagy a hivatkozások száma.

// A repó gyökere: ez a fájl `app/src/` alatt van, két szinttel feljebb.
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export const MARKER_PATTERN = /\bD\d+\b|\bDP-\d+\b/g;

const SCAN_ROOTS: ReadonlyArray<{ dir: string; extensions: readonly string[] }> = [
  { dir: 'app/src', extensions: ['.ts', '.tsx', '.css', '.md'] },
  { dir: 'docs', extensions: ['.md'] },
  { dir: '.claude', extensions: ['.md'] },
];

const SCAN_ROOT_FILES: readonly string[] = ['CLAUDE.md'];

// A guard saját fájljai kizárva, különben a `\bD\d+\b` mintát tartalmazó
// baseline-számok és e fájl saját dokumentációs példái önmagukra
// illeszkednének.
const EXCLUDED_RELATIVE_PATHS = new Set([
  'app/src/dokumentacioGuard.ts',
  'app/src/dokumentacioGuard.test.ts',
  'app/src/dokumentacioGuard.baseline.json',
]);

function toRepoRelative(absolutePath: string): string {
  return path.relative(REPO_ROOT, absolutePath).split(path.sep).join('/');
}

function collectFiles(root: string, extensions: readonly string[]): string[] {
  const absoluteRoot = path.join(REPO_ROOT, root);
  const results: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (extensions.includes(path.extname(entry.name))) {
        results.push(full);
      }
    }
  };

  if (statSync(absoluteRoot, { throwIfNoEntry: false })?.isDirectory()) {
    walk(absoluteRoot);
  }

  return results;
}

export interface MarkerCounts {
  [relativePath: string]: number;
}

export function countMarkers(): MarkerCounts {
  const absoluteFiles = [
    ...SCAN_ROOTS.flatMap(({ dir, extensions }) => collectFiles(dir, extensions)),
    ...SCAN_ROOT_FILES.map((file) => path.join(REPO_ROOT, file)),
  ];

  const counts: MarkerCounts = {};

  for (const absoluteFile of absoluteFiles) {
    const relativePath = toRepoRelative(absoluteFile);
    if (EXCLUDED_RELATIVE_PATHS.has(relativePath)) continue;

    const content = readFileSync(absoluteFile, 'utf-8');
    const matches = content.match(MARKER_PATTERN);
    if (matches && matches.length > 0) {
      counts[relativePath] = matches.length;
    }
  }

  return counts;
}

export interface DecisionTableState {
  rowCount: number;
  maxNumber: number;
}

const DECISION_ROW_PATTERN = /^\| D(\d+) /gm;

export function readDecisionTableState(): DecisionTableState {
  const filePath = path.join(REPO_ROOT, 'docs', '01-attekintes-es-dontesek.md');
  const content = readFileSync(filePath, 'utf-8');

  let rowCount = 0;
  let maxNumber = 0;
  for (const match of content.matchAll(DECISION_ROW_PATTERN)) {
    rowCount += 1;
    maxNumber = Math.max(maxNumber, Number(match[1]));
  }

  return { rowCount, maxNumber };
}

export interface MarkerGrowth {
  relativePath: string;
  baselineCount: number;
  currentCount: number;
}

export function findMarkerGrowth(
  baseline: MarkerCounts,
  current: MarkerCounts,
): MarkerGrowth[] {
  const growth: MarkerGrowth[] = [];

  for (const [relativePath, currentCount] of Object.entries(current)) {
    const baselineCount = baseline[relativePath] ?? 0;
    if (currentCount > baselineCount) {
      growth.push({ relativePath, baselineCount, currentCount });
    }
  }

  return growth.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
