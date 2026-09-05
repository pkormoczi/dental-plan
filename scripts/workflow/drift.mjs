// Baseline-drift: a tervezett tétel Baseline SHA-ja óta változott-e app-kód (app/, data/,
// assets/). Backlog- és docs-commit nem drift -- ezért nem SHA-egyezést nézünk.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { run, parseArgs, WorkflowError, ROOT, git, head } from './lib.mjs';

const HELP = `node scripts/workflow/drift.mjs <slug> [--set] | --all
  <slug>: a backlog/<slug>.md Baseline-ja és HEAD közti diff --stat az app/ data/ assets/ alatt.
          exit 0 = nincs drift; exit 2 = drift (a stat kiírva); exit 1 = hiba.
  --set:  a Baseline sort HEAD-re írja (miután a plan feltevéseit átnézted).
  --all:  minden tervezett tételre egy sor: <slug> TAB ok|drift  (fetch nélkül).`;

const CODE_PATHS = ['app', 'data', 'assets'];

function baselineOf(slug) {
  const file = path.join(ROOT, 'backlog', `${slug}.md`);
  let text;
  try {
    text = readFileSync(file, 'utf-8');
  } catch {
    throw new WorkflowError(`nincs backlog/${slug}.md a gyökérben -- idea/ alatt van? előbb /plan`);
  }
  const m = /^Baseline:\s*([0-9a-f]{40})\s*$/m.exec(text);
  if (!m) throw new WorkflowError(`backlog/${slug}.md: nincs érvényes "Baseline: <40 hex>" sor`);
  return { file, text, sha: m[1] };
}

function driftStat(sha) {
  if (git(['cat-file', '-e', `${sha}^{commit}`], { allowFail: true }).status !== 0) {
    throw new WorkflowError(`a Baseline ${sha} nem ismert commit ebben a repóban`);
  }
  return git(['diff', '--stat', `${sha}..HEAD`, '--', ...CODE_PATHS]).out;
}

run(() => {
  const a = parseArgs(process.argv.slice(2), { flags: ['set', 'all'] });
  if (a.help) return console.log(HELP);
  if (a.all) {
    const items = readdirSync(path.join(ROOT, 'backlog'))
      .filter((f) => f.endsWith('.md') && f !== 'CLAUDE.md' && f !== 'README.md')
      .map((f) => f.slice(0, -3));
    for (const slug of items) {
      try {
        console.log(`${slug}\t${driftStat(baselineOf(slug).sha) ? 'drift' : 'ok'}`);
      } catch (e) {
        console.log(`${slug}\thiba: ${e.message}`);
      }
    }
    return;
  }
  const slug = a._[0];
  if (!slug) throw new WorkflowError('hiányzik a <slug> (vagy --all)');
  const { file, text, sha } = baselineOf(slug);
  if (a.set) {
    const now = head();
    writeFileSync(file, text.replace(/^Baseline:.*$/m, `Baseline: ${now}`));
    console.log(`Baseline ${sha.slice(0, 7)} → ${now.slice(0, 7)} (backlog/${slug}.md)`);
    return;
  }
  const stat = driftStat(sha);
  if (!stat) {
    console.log(`nincs drift: ${sha.slice(0, 7)}..HEAD nem érint app-kódot`);
    return;
  }
  console.log(`drift ${sha.slice(0, 7)}..HEAD:\n${stat}\n\nNézd át a plan Current state pointereit; ha állnak: drift.mjs ${slug} --set`);
  process.exitCode = 2;
});
