// Baseline-drift: a tervezett tétel Baseline SHA-ja óta változott-e app-kód (app/, data/,
// assets/) vagy workflow-forrás (scripts/, .claude/, .github/) -- a kettő külön címkével, mert
// egy UI-tételnek az előbbi, egy workflow-tételnek az utóbbi a feltevése. Backlog- és
// docs-commit nem drift -- ezért nem SHA-egyezést nézünk. Csak jelez: a Baseline sosem íródik át.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { run, parseArgs, WorkflowError, ROOT, CODE_PATHS, git } from './lib.mjs';
import { findItem, listItems } from './backlogPath.mjs';

const HELP = `node scripts/workflow/drift.mjs <slug> | --all
  <slug>: a backlog[/later]/<slug>.md Baseline-ja és HEAD közti diff --stat app-kódra (app/ data/ assets/)
          és workflow-forrásra (scripts/ .claude/ .github/), külön. exit 0 = nincs drift; exit 2 = drift
          (a stat kiírva); exit 1 = hiba.
  --all:  minden tervezett tételre (gyökér és later/) egy sor: <slug> TAB ok|drift|hiba (fetch nélkül);
          exit 1, ha bármelyik tétel hibás (rossz vagy ismeretlen Baseline).`;

const WORKFLOW_PATHS = ['scripts', '.claude', '.github'];

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
  return {
    code: git(['diff', '--stat', `${sha}..HEAD`, '--', ...CODE_PATHS]).out,
    workflow: git(['diff', '--stat', `${sha}..HEAD`, '--', ...WORKFLOW_PATHS]).out,
  };
}

run(() => {
  const a = parseArgs(process.argv.slice(2), { flags: ['all'] });
  if (a.help) return console.log(HELP);
  if (a.all) {
    let failed = false;
    for (const { slug } of listItems().filter((i) => i.status === 'planned')) {
      try {
        const s = driftStat(baselineOf(slug));
        console.log(`${slug}\t${s.code || s.workflow ? 'drift' : 'ok'}`);
      } catch (e) {
        failed = true;
        console.log(`${slug}\thiba: ${e.message}`);
      }
    }
    if (failed) process.exitCode = 1;
    return;
  }
  const slug = a._[0];
  if (!slug) throw new WorkflowError('hiányzik a <slug> (vagy --all)');
  const sha = baselineOf(slug);
  const { code, workflow } = driftStat(sha);
  if (!code && !workflow) {
    console.log(`nincs drift: ${sha.slice(0, 7)}..HEAD nem érint app-kódot, sem workflow-forrást`);
    return;
  }
  const parts = [];
  if (code) parts.push(`app-kód:\n${code}`);
  if (workflow) parts.push(`workflow-forrás (scripts/ .claude/ .github/):\n${workflow}`);
  console.log(
    `drift ${sha.slice(0, 7)}..HEAD\n${parts.join('\n')}\n\nNézd át a plan Current state pointereit; ha állnak, folytasd -- a Baseline nem íródik át.`,
  );
  process.exitCode = 2;
});
