// Megadott path-ok commitja és azonnali push-a: backlog-tétel (/idea, /plan),
// review-jelentés, docs-skill. Commit előtt docs-check; rebase után docs-check újra.
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  run, parseArgs, WorkflowError, ROOT, requireNoRebase, requireMaster, git, docsCheck, commit, pushMaster,
} from './lib.mjs';

const HELP = `node scripts/workflow/commit-push.mjs -m "<tárgy>" [--body "<szöveg>"] [--trailer "<Kulcs: érték>"]... -- <path>...
  Csak a megadott path-okat stage-eli (átnevezésnél a régi és az új path is kell), docs-check,
  commit, git push origin master (nem-ff: rebase, docs-check újra, push).`;

run(() => {
  const a = parseArgs(process.argv.slice(2), { valued: ['body'] });
  if (a.help) return console.log(HELP);
  if (!a.m) throw new WorkflowError('hiányzik a -m "<tárgy>"');
  if (!a.paths.length) throw new WorkflowError('nincs path a `--` után');
  requireNoRebase();
  requireMaster();
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
  docsCheck();
  const sha = commit({ subject: a.m, body: a.body, trailers: a.trailer });
  const { rebased } = pushMaster({ regate: docsCheck });
  console.log(`\ncommit ${sha.slice(0, 7)} fent az origin/master-en${rebased ? ' (rebase után)' : ''}`);
});
