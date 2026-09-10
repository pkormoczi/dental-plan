// Megadott path-ok commitja és azonnali push-a: backlog-tétel (/idea, /plan), review-jelentés,
// docs, skill-szöveg, workflow-script. A kapu a pathok hatása szerint: docs-check, workflow-
// pathnál test:workflow is. App-kód nem mehet ezen az úton -- annak a teljes kapu jár (close.mjs
// egy futásban). Hatókör-őr: a körön kívül stage-elt változás megállít, mert a commit az egész
// indexet vinné. Futásjelző mellett commitol, de nem pushol (a run.mjs finish viszi fel).
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  run, parseArgs, WorkflowError, ROOT, CODE_PATHS, requireNoRebase, requireMaster, requirePublishable, readRun,
  git, gate, gateFor, commit, pushMaster, stagedFiles, underPaths,
} from './lib.mjs';

const HELP = `node scripts/workflow/commit-push.mjs -m "<tárgy>" [--body "<szöveg>"] [--trailer "<Kulcs: érték>"]... [--no-push] -- <path>...
  Megáll: app/ data/ assets/ alatti path (kódváltozás a close.mjs útja); a megadott path-okon kívül stage-elt
  változás; push előtt követett módosítás a körön kívül. Csak a megadott path-okat stage-eli (átnevezésnél a
  régi és az új path is kell); kapu: docs-check, scripts/ vagy .github/ pathnál test:workflow is; commit;
  git push origin master (nem-ff: rebase, kapu újra, push).
  --no-push: kapu + commit, push nélkül (több terv egy futásban; a záró sync.mjs viszi fel).
  Futásjelző mellett a --no-push automatikus.`;

run(() => {
  const a = parseArgs(process.argv.slice(2), { valued: ['body'], flags: ['no-push'] });
  if (a.help) return console.log(HELP);
  if (!a.m) throw new WorkflowError('hiányzik a -m "<tárgy>"');
  if (!a.paths.length) throw new WorkflowError('nincs path a `--` után');
  requireNoRebase();
  requireMaster();
  const code = a.paths.filter((p) => underPaths(p, CODE_PATHS));
  if (code.length) {
    throw new WorkflowError(`app-kód nem mehet docs-úton: ${code.join(', ')} -- tétel vagy /fix, close.mjs a futásban`);
  }
  const foreign = stagedFiles().filter((f) => !underPaths(f, a.paths));
  if (foreign.length) {
    throw new WorkflowError(
      `a megadott körön kívül stage-elt változás van, nem commitolok:\n  ${foreign.join('\n  ')}\n` +
        'Vedd ki a stage-ből (git restore --staged <fájl>) vagy commitold külön, aztán újra.',
    );
  }
  const steps = gateFor(a.paths);
  const inRun = Boolean(readRun());
  const noPush = a['no-push'] || inRun;
  if (!noPush) requirePublishable({ steps, except: a.paths });
  // Egy `git rm`-mel már törölt path se a munkafában, se az indexben nincs -- a `git add` fatal-t
  // adna rá; ha a HEAD-ben megvan, a törlése már stage-elt, csak kihagyjuk az add-ból.
  const addable = a.paths.filter((p) => {
    if (existsSync(path.join(ROOT, p)) || git(['ls-files', '--error-unmatch', '--', p], { allowFail: true }).status === 0) return true;
    if (git(['cat-file', '-e', `HEAD:${p}`], { allowFail: true }).status === 0) return false;
    throw new WorkflowError(`nem létező path: ${p}`);
  });
  if (addable.length) git(['add', '-A', '--', ...addable]);
  const staged = git(['diff', '--cached', '--name-status']).out;
  if (!staged) throw new WorkflowError('a megadott path-okon nincs változás, nincs mit commitolni');
  console.log(`stage-elve:\n${staged}`);
  gate(steps);
  const sha = commit({ subject: a.m, body: a.body, trailers: a.trailer });
  if (noPush) {
    console.log(`\ncommit ${sha.slice(0, 7)} helyben, push nélkül${inRun ? ' -- futás közben a run.mjs finish viszi fel' : ''}`);
    return;
  }
  const { rebased } = pushMaster({ regate: () => gate(steps), steps });
  console.log(`\ncommit ${sha.slice(0, 7)} fent az origin/master-en${rebased ? ' (rebase után)' : ''}`);
});
