// Baseline-drift: a tervezett tétel Baseline SHA-ja óta változott-e app-kód (app/, data/,
// assets/). Backlog- és docs-commit nem drift -- ezért nem SHA-egyezést nézünk. Csak jelez:
// a Baseline sosem íródik át (a módosított tervfájl a lezárást akasztaná meg).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { run, parseArgs, WorkflowError, ROOT, git } from './lib.mjs';
import { findItem, listItems } from './backlogPath.mjs';

const HELP = `node scripts/workflow/drift.mjs <slug> | --all
  <slug>: a backlog[/later]/<slug>.md Baseline-ja és HEAD közti diff --stat az app/ data/ assets/ alatt.
          exit 0 = nincs drift; exit 2 = drift (a stat kiírva); exit 1 = hiba.
  --all:  minden tervezett tételre (gyökér és later/) egy sor: <slug> TAB ok|drift  (fetch nélkül).`;

const CODE_PATHS = ['app', 'data', 'assets'];

function baselineOf(slug) {
  const item = findItem(slug);
  if (!item || item.status !== 'planned') {
    throw new WorkflowError(`nincs tervezett backlog[/later]/${slug}.md -- idea/ alatt van? előbb /plan`);
  }
  const text = readFileSync(path.join(ROOT, item.path), 'utf-8');
  const m = /^Baseline:\s*([0-9a-f]{40})\s*$/m.exec(text);
  if (!m) throw new WorkflowError(`${item.path}: nincs érvényes "Baseline: <40 hex>" sor`);
  return m[1];
}

function driftStat(sha) {
  if (git(['cat-file', '-e', `${sha}^{commit}`], { allowFail: true }).status !== 0) {
    throw new WorkflowError(`a Baseline ${sha} nem ismert commit ebben a repóban`);
  }
  return git(['diff', '--stat', `${sha}..HEAD`, '--', ...CODE_PATHS]).out;
}

run(() => {
  const a = parseArgs(process.argv.slice(2), { flags: ['all'] });
  if (a.help) return console.log(HELP);
  if (a.all) {
    const items = listItems().filter((i) => i.status === 'planned').map((i) => i.slug);
    for (const slug of items) {
      try {
        console.log(`${slug}\t${driftStat(baselineOf(slug)) ? 'drift' : 'ok'}`);
      } catch (e) {
        console.log(`${slug}\thiba: ${e.message}`);
      }
    }
    return;
  }
  const slug = a._[0];
  if (!slug) throw new WorkflowError('hiányzik a <slug> (vagy --all)');
  const sha = baselineOf(slug);
  const stat = driftStat(sha);
  if (!stat) {
    console.log(`nincs drift: ${sha.slice(0, 7)}..HEAD nem érint app-kódot`);
    return;
  }
  console.log(
    `drift ${sha.slice(0, 7)}..HEAD:\n${stat}\n\nNézd át a plan Current state pointereit; ha állnak, folytasd -- a Baseline nem íródik át.`,
  );
  process.exitCode = 2;
});
