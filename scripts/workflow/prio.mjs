// A /backlog átsorolás determinisztikus része: a KIMONDOTT Prio a fejlécbe, a fájl a
// Prio-nak megfelelő mappába (later/ ⇔ Prio: later, git mv), majd commit + push a
// commit-push.mjs-en át (hatókör-őr, docs-check, push). Nem dönt: az értéket a hívó adja.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, parseArgs, WorkflowError, ROOT, git } from './lib.mjs';
import { findItem, itemPath } from './backlogPath.mjs';

const HELP = `node scripts/workflow/prio.mjs <slug> <now|next|later|none> [--trailer "<Kulcs: érték>"]...
  A fejléc Prio: sorát írja (none = törli), a fájlt a Prio szerinti mappába mozgatja
  (later/ ⇔ Prio: later, git mv), majd commit-push.mjs: "backlog: prio <slug> <érték>".
  Megáll, ha a tétel nem követett vagy módosított -- előbb commit-push.mjs.`;
const VALUES = ['now', 'next', 'later', 'none'];

// A fejléc-blokk az 1. sortól az első üres sorig; a Prio: sor ott íródik át, kerül be a
// blokk végére, vagy törlődik.
function setPrio(text, value) {
  const lines = text.split('\n');
  let end = 1;
  while (end < lines.length && lines[end].trim() !== '') end++;
  const idx = lines.findIndex((l, i) => i > 0 && i < end && /^Prio:/.test(l));
  if (value === 'none') {
    if (idx >= 0) lines.splice(idx, 1);
  } else if (idx >= 0) {
    lines[idx] = `Prio: ${value}`;
  } else {
    lines.splice(end, 0, `Prio: ${value}`);
  }
  return lines.join('\n');
}

run(() => {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) return console.log(HELP);
  const [slug, value] = a._;
  if (!slug) throw new WorkflowError('hiányzik a <slug>');
  if (!VALUES.includes(value)) throw new WorkflowError(`a Prio értéke ${VALUES.join(' | ')} lehet, nem "${value ?? ''}"`);
  const item = findItem(slug);
  if (!item) throw new WorkflowError(`nincs "${slug}" tétel a backlog négy mappájában (backlog[/later]/, backlog/idea[/later]/)`);
  if (git(['ls-files', '--error-unmatch', '--', item.path], { allowFail: true }).status !== 0) {
    throw new WorkflowError(`${item.path} nem követett -- előbb commit-push.mjs`);
  }
  if (git(['status', '--porcelain', '--', item.path]).out) {
    throw new WorkflowError(`${item.path} módosított -- előbb commitold (commit-push.mjs), aztán átsorolás`);
  }
  const target = itemPath({ status: item.status, later: value === 'later' }, slug);
  const abs = path.join(ROOT, item.path);
  writeFileSync(abs, setPrio(readFileSync(abs, 'utf-8'), value));
  if (target !== item.path) {
    const dir = path.dirname(path.join(ROOT, target));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    git(['mv', '--', item.path, target]);
  }
  const paths = target === item.path ? [item.path] : [item.path, target];
  const args = [path.join(path.dirname(fileURLToPath(import.meta.url)), 'commit-push.mjs'), '-m', `backlog: prio ${slug} ${value}`];
  for (const t of a.trailer) args.push('--trailer', t);
  args.push('--', ...paths);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (r.status !== 0) {
    throw new WorkflowError(
      `a commit-push megállt (exit ${r.status}) -- a fejléc és a mappa már átírva; javítás után: ` +
        `node scripts/workflow/commit-push.mjs -m "backlog: prio ${slug} ${value}" -- ${paths.join(' ')}`,
    );
  }
  console.log(`\n${item.path}${target !== item.path ? ` → ${target}` : ''}: Prio ${value}`);
});
