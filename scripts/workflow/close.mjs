// A /finish determinisztikus része: teljes kapu, a tételfájl törlése, commit, és azonnali
// push (masteren) vagy rebase + force-with-lease + PR (worktree-branchen). A kézi
// ellenőrzés ELŐTTE történik, a munkafán -- a master-push a Pages-re élesít.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  run, parseArgs, WorkflowError, ROOT, git, gate, commit, head, currentBranch,
  requireNoRebase, fetchOrigin, ffPull, unpushed, pushMaster,
} from './lib.mjs';

const HELP = `node scripts/workflow/close.mjs <slug> --title "<cím>" [--body "<1-2 mondat>"] [--trailer "<K: v>"]...
  masteren: fetch + ff-only (ha utána nincs backlog/<slug>.md: máshol lezárták), build+lint+test+docs-check,
            git rm backlog/<slug>.md, git add -A, commit "<slug>: <cím>", push (nem-ff: rebase, kapu újra, push).
  branchen: ugyanaz, majd rebase origin/master-re (base-változásnál kapu újra), push --force-with-lease,
            gh pr create ha nincs PR (a gh hiánya nem hiba).`;

const gh = (args) => spawnSync('gh', args, { cwd: ROOT, encoding: 'utf-8', shell: process.platform === 'win32' });

run(() => {
  const a = parseArgs(process.argv.slice(2), { valued: ['title', 'body'] });
  if (a.help) return console.log(HELP);
  const slug = a._[0];
  if (!slug) throw new WorkflowError('hiányzik a <slug>');
  if (!a.title) throw new WorkflowError('hiányzik a --title "<cím>" (a Goal rövid alakja)');
  requireNoRebase();
  const branch = currentBranch();
  const onMaster = branch === 'master';
  const item = `backlog/${slug}.md`;

  fetchOrigin();
  if (onMaster) {
    ffPull();
    const pending = unpushed();
    if (pending) console.log(`push-olatlan commit a masteren, a záró push viszi:\n${pending}`);
  }
  if (!existsSync(path.join(ROOT, item))) {
    throw new WorkflowError(`${item} nincs meg -- máshol már lezárták, vagy még idea/ alatt van`);
  }
  if (git(['ls-files', '--error-unmatch', item], { allowFail: true }).status !== 0) {
    throw new WorkflowError(`${item} nem követett -- a /plan commitolja; előbb commit-push.mjs`);
  }

  gate();

  git(['rm', '-q', item]);
  git(['add', '-A']);
  const staged = git(['diff', '--cached', '--name-status']).out;
  console.log(`\nstage-elve:\n${staged}`);
  const subject = `${slug}: ${a.title}`;
  const sha = commit({ subject, body: a.body, trailers: a.trailer });

  if (onMaster) {
    const { rebased } = pushMaster({ regate: gate });
    console.log(`\ncommit ${sha.slice(0, 7)} fent az origin/master-en${rebased ? ' (rebase után)' : ''} -- a Pages deploy indul`);
    return;
  }

  // Worktree-branch: rebase az origin/master-re, base-változásnál kapu újra, PR.
  const base = git(['merge-base', 'HEAD', 'origin/master']).out;
  const originHead = git(['rev-parse', 'origin/master']).out;
  if (base !== originHead) {
    const r = git(['rebase', 'origin/master'], { allowFail: true, quiet: false });
    if (r.status !== 0) {
      throw new WorkflowError(
        `a rebase konfliktusba futott, félben marad.\n${r.err}\nOldd fel, git rebase --continue, majd újra: /finish ${slug} --worktree`,
      );
    }
    console.log('\nrebase kész -- a base változott, a kapu újra fut');
    gate();
  }
  git(['push', '--force-with-lease', '-u', 'origin', branch], { quiet: false });
  const view = gh(['pr', 'view', '--json', 'url', '-q', '.url']);
  if (view.error) {
    console.log(`\npush kész (${head().slice(0, 7)}); a gh nem elérhető, a PR-t kézzel kell nyitni`);
    return;
  }
  if (view.status === 0 && view.stdout.trim()) {
    console.log(`\npush kész, a PR már nyitva: ${view.stdout.trim()}`);
    return;
  }
  const create = gh(['pr', 'create', '--base', 'master', '--title', subject, '--body', a.body ?? subject]);
  if (create.status !== 0) throw new WorkflowError(`gh pr create sikertelen:\n${create.stderr}`);
  console.log(`\nPR: ${create.stdout.trim()}`);
});
