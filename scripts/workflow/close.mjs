// A /finish determinisztikus része: teljes kapu, a tételfájl törlése, commit, és azonnali
// push (masteren) vagy rebase + force-with-lease + PR (worktree-branchen). A kézi
// ellenőrzés ELŐTTE történik, a munkafán -- a master-push a Pages-re élesít.
//
// Két őr és egy folytatás-mód: (1) untracked fájl csak app/ docs/ data/ assets/ alól kerül a
// commitba, más untracked megállít; (2) a sima `git rm` a módosított tervfájlt megtagadja --
// a tervfájl változása külön commitot érdemel, nem csendes törlést; (3) ha a tervfájl már
// hiányzik, de van push-olatlan "<slug>: …" commit, nem új commit készül: kapu, majd a hiányzó
// publikálási lépés.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  run, parseArgs, WorkflowError, ROOT, git, gate, commit, head, currentBranch, isClean,
  requireNoRebase, fetchOrigin, ffPull, pushMaster, untrackedFiles, underPaths, closingCommit,
} from './lib.mjs';
import { findItem } from './backlogPath.mjs';

const HELP = `node scripts/workflow/close.mjs <slug> --title "<cím>" [--body "<1-2 mondat>"] [--trailer "<K: v>"]...
  masteren: fetch + ff; untracked csak app/ docs/ data/ assets/ alatt (más: megáll); build+lint+test+docs-check;
            git rm backlog[/later]/<slug>.md (módosított tervfájlnál megáll); követett módosítások + engedett untracked;
            commit "<slug>: <cím>"; push (nem-ff: rebase, kapu újra, push).
  branchen: ugyanaz, majd rebase origin/master-re (base-változásnál kapu újra), push --force-with-lease,
            gh pr create ha nincs PR (a gh hiánya/hibája nem hiba, a PR ilyenkor kézi).
  folytatás: ha a tervfájl már hiányzik, de van push-olatlan "<slug>: …" commit: kapu, majd csak a publikálás.`;

const ALLOWED_UNTRACKED = ['app', 'docs', 'data', 'assets'];

const gh = (args) => spawnSync('gh', args, { cwd: ROOT, encoding: 'utf-8', shell: process.platform === 'win32' });

function publishMaster(sha) {
  const { rebased } = pushMaster({ regate: gate });
  console.log(`\ncommit ${sha.slice(0, 7)} fent az origin/master-en${rebased ? ' (rebase után)' : ''} -- a Pages deploy indul`);
}

// Worktree-branch: rebase az origin/master-re, base-változásnál (vagy folytatás-módban) kapu, PR.
function publishBranch({ slug, branch, subject, body, needGate }) {
  let gated = false;
  const originHead = git(['rev-parse', 'origin/master']).out;
  if (git(['merge-base', 'HEAD', 'origin/master']).out !== originHead) {
    const r = git(['rebase', 'origin/master'], { allowFail: true, quiet: false });
    if (r.status !== 0) {
      throw new WorkflowError(
        `a rebase konfliktusba futott, félben marad.\n${r.err}\n` +
          `Oldd fel, git rebase --continue, majd újra: /finish ${slug} --worktree (folytatás-módban megy tovább)`,
      );
    }
    console.log('\nrebase kész -- a base változott, a kapu újra fut');
    gate();
    gated = true;
  }
  if (needGate && !gated) gate();
  git(['push', '--force-with-lease', '-u', 'origin', branch], { quiet: false });
  const view = gh(['pr', 'view', '--json', 'url', '-q', '.url']);
  if (view.status === 0 && view.stdout.trim()) {
    console.log(`\npush kész (${head().slice(0, 7)}), a PR már nyitva: ${view.stdout.trim()}`);
    return;
  }
  const create = gh(['pr', 'create', '--base', 'master', '--title', subject, '--body', body ?? subject]);
  if (create.error || create.status !== 0) {
    console.log(`\npush kész (${head().slice(0, 7)}); a gh nem elérhető vagy hibázott, a PR-t kézzel kell nyitni:\n${(create.stderr ?? '').trim()}`);
    return;
  }
  console.log(`\npush kész, PR: ${create.stdout.trim()}`);
}

run(() => {
  const a = parseArgs(process.argv.slice(2), { valued: ['title', 'body'] });
  if (a.help) return console.log(HELP);
  const slug = a._[0];
  if (!slug) throw new WorkflowError('hiányzik a <slug>');
  if (!a.title) throw new WorkflowError('hiányzik a --title "<cím>" (a Goal rövid alakja)');
  requireNoRebase();
  const branch = currentBranch();
  const onMaster = branch === 'master';
  // A tervezett tétel a gyökérben vagy a later/ alatt él (a Prio dönti el) -- a feloldás közös.
  const found = findItem(slug);
  if (found?.status === 'idea') {
    throw new WorkflowError(`${found.path}: még idea/ alatt van -- előbb /plan ${slug}`);
  }
  const item = found?.path ?? `backlog/${slug}.md`;
  const subject = `${slug}: ${a.title}`;

  fetchOrigin();
  if (onMaster) ffPull();

  let sha;
  let resumed = false;
  if (!existsSync(path.join(ROOT, item))) {
    const existing = closingCommit(slug);
    if (!existing) {
      throw new WorkflowError(`nincs backlog[/later]/${slug}.md, és nincs push-olatlan "${slug}: …" commit -- máshol már lezárták?`);
    }
    if (!isClean()) {
      throw new WorkflowError(`folytatás-mód: a lezáró commit ${existing.slice(0, 7)} már létezik, de a munkafa nem tiszta -- commitolatlan módosítással nem publikálok`);
    }
    console.log(`folytatás: a lezáró commit ${existing.slice(0, 7)} már létezik -- kapu, majd publikálás`);
    sha = existing;
    resumed = true;
  } else {
    if (git(['ls-files', '--error-unmatch', '--', item], { allowFail: true }).status !== 0) {
      throw new WorkflowError(`${item} nem követett -- a /plan commitolja; előbb commit-push.mjs`);
    }
    const foreign = untrackedFiles().filter((f) => !underPaths(f, ALLOWED_UNTRACKED));
    if (foreign.length) {
      throw new WorkflowError(
        `követetlen fájl a megengedett körön kívül (${ALLOWED_UNTRACKED.join('/ ')}/):\n  ${foreign.join('\n  ')}\n` +
          'Töröld, ignore-old, vagy commitold külön (commit-push.mjs), aztán újra.',
      );
    }
    gate();
    const rm = git(['rm', '-q', '--', item], { allowFail: true });
    if (rm.status !== 0) {
      throw new WorkflowError(
        `${item} törlése megtagadva (helyi módosítás?):\n${rm.err}\n` +
          `Ha a módosítás kell: node scripts/workflow/commit-push.mjs -m "backlog: plan ${slug} frissítve" -- ${item}\n` +
          `Ha nem: git checkout -- ${item}. Aztán újra.`,
      );
    }
    git(['add', '-u']);
    const rest = untrackedFiles();
    if (rest.length) git(['add', '--', ...rest]);
    console.log(`\nstage-elve:\n${git(['diff', '--cached', '--name-status']).out}`);
    sha = commit({ subject, body: a.body, trailers: a.trailer });
  }

  if (onMaster) {
    if (resumed) gate();
    publishMaster(sha);
  } else {
    publishBranch({ slug, branch, subject, body: a.body, needGate: resumed });
  }
});
