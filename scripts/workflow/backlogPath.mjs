// A backlog négy mappája EGY helyen: a státusz a mappa (idea/ = ötlet, gyökér = tervezett),
// és mindkettő alatt `later/` a `Prio: later` tételeké. Minden szkript innen oldja fel a
// slugot -- a mappaszabály ne éljen négy különböző literálban (a docs-check őrzi, hogy a
// fájl helye és a Prio sora egyezzen).
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, WorkflowError } from './lib.mjs';

export const DIRS = [
  { dir: 'backlog', status: 'planned', later: false },
  { dir: 'backlog/later', status: 'planned', later: true },
  { dir: 'backlog/idea', status: 'idea', later: false },
  { dir: 'backlog/idea/later', status: 'idea', later: true },
];
// A gyökér két nem-tétel fájlja: a modell leírása és a flow-doksi.
const NOT_ITEM = new Set(['CLAUDE.md', 'README.md']);

export const itemPath = ({ status, later }, slug) =>
  `backlog/${status === 'idea' ? 'idea/' : ''}${later ? 'later/' : ''}${slug}.md`;

export function listItems() {
  const items = [];
  for (const d of DIRS) {
    const abs = path.join(ROOT, d.dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (!f.endsWith('.md') || (d.dir === 'backlog' && NOT_ITEM.has(f))) continue;
      items.push({ slug: f.slice(0, -3), path: `${d.dir}/${f}`, status: d.status, later: d.later });
    }
  }
  return items;
}

// null, ha nincs; hiba, ha egy slug két mappában is él -- egy tétel egy helyen, az
// állapotváltás git mv (a docs-check ugyanezt piros hibaként adja).
export function findItem(slug) {
  const hits = listItems().filter((i) => i.slug === slug);
  if (hits.length > 1) {
    throw new WorkflowError(`a "${slug}" slug több helyen él: ${hits.map((h) => h.path).join(', ')} -- egy tétel egy helyen, git mv`);
  }
  return hits[0] ?? null;
}
