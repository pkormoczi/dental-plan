// Közös git/npm réteg a workflow-parancsokhoz. Minden parancs a repó gyökeréből fut
// (`node scripts/workflow/<parancs>.mjs`), a minőségi kapu az app/ alatt.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const APP = path.join(ROOT, 'app');

export class WorkflowError extends Error {
  constructor(msg, code = 1) {
    super(msg);
    this.code = code;
  }
}

export function git(args, { allowFail = false, quiet = true } = {}) {
  const r = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'pipe'],
  });
  const out = (r.stdout ?? '').trim();
  const err = (r.stderr ?? '').trim();
  if (r.status !== 0 && !allowFail) {
    throw new WorkflowError(`git ${args.join(' ')} sikertelen:\n${err || out}`);
  }
  return { status: r.status, out, err };
}

// npm-et shell-en át hívjuk: Windowson az npm .cmd, amit a spawn shell nélkül nem indít.
// Az argumentum fix script-név, nem felhasználói bemenet.
export function npm(script) {
  console.log(`\n▶ npm run ${script}  (app/)`);
  const r = spawnSync(`npm run ${script}`, { cwd: APP, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    throw new WorkflowError(`npm run ${script} piros -- javítsd, és futtasd újra ezt a parancsot`);
  }
}

export const docsCheck = () => npm('docs-check');
export function gate() {
  for (const s of ['build', 'lint', 'test', 'docs-check']) npm(s);
}

export const head = () => git(['rev-parse', 'HEAD']).out;
export const currentBranch = () => git(['branch', '--show-current']).out;
export const unpushed = () => git(['log', 'origin/master..HEAD', '--oneline']).out;

export function requireNoRebase() {
  for (const d of ['rebase-merge', 'rebase-apply']) {
    if (existsSync(path.resolve(ROOT, git(['rev-parse', '--git-path', d]).out))) {
      throw new WorkflowError(
        'félbehagyott rebase van a repóban -- oldd fel a konfliktust, `git rebase --continue`, ' +
          'majd `node scripts/workflow/sync.mjs --gate` (a base változott, a kapu újra kötelező)',
      );
    }
  }
}

export function requireMaster() {
  const b = currentBranch();
  if (b !== 'master') throw new WorkflowError(`az aktuális branch "${b}", nem master`);
}

export function fetchOrigin() {
  git(['fetch', 'origin']);
}

const isAncestor = (a, b) => git(['merge-base', '--is-ancestor', a, b], { allowFail: true }).status === 0;

// Fetch után: ha az origin előrébb jár, ff-merge (nem `pull`, mert az a pull.rebase beállítás
// miatt tiszta munkafát követelne); ha a helyi jár előrébb, az push-teendő; ha egyik sem, divergencia.
export function ffPull() {
  const remote = git(['rev-parse', 'origin/master']).out;
  if (remote === head() || isAncestor(remote, 'HEAD')) return;
  if (!isAncestor('HEAD', remote)) {
    throw new WorkflowError(
      'a helyi master és az origin/master divergál -- nézd meg: git log --oneline --graph master origin/master; ' +
        'a script nem rebase-el helyetted',
    );
  }
  const r = git(['merge', '--ff-only', 'origin/master'], { allowFail: true });
  if (r.status !== 0) {
    throw new WorkflowError(`az origin/master ff-merge-e nem sikerült (commitolatlan módosítás ütközik?):\n${r.err}`);
  }
  console.log('helyi master frissítve az origin/master-re (ff)');
}

// Sima push; ha az origin közben előrelépett: pull --rebase, majd a kapu ÚJRA (a base
// változott), csak utána push. Konfliktusnál a rebase félben marad, nincs --abort.
export function pushMaster({ regate }) {
  let r = git(['push', 'origin', 'master'], { allowFail: true });
  if (r.status === 0) return { rebased: false };
  if (!/non-fast-forward|fetch first|rejected/i.test(r.err)) {
    throw new WorkflowError(
      `a push megbukott (hálózat? jogosultság?):\n${r.err}\nHa rendbe jött: node scripts/workflow/sync.mjs`,
    );
  }
  console.log('\norigin/master előrelépett -- fetch + rebase origin/master-re (autostash)');
  git(['fetch', 'origin']);
  r = git(['rebase', '--autostash', 'origin/master'], { allowFail: true, quiet: false });
  if (r.status !== 0) {
    throw new WorkflowError(
      'a rebase konfliktusba futott, félben marad (nincs --abort, nincs automatikus feloldás).\n' +
        `${r.err}\nOldd fel, git rebase --continue, majd: node scripts/workflow/sync.mjs --gate`,
    );
  }
  console.log('\ntiszta rebase -- a base változott, a kapu újra fut a push előtt');
  regate();
  r = git(['push', 'origin', 'master'], { allowFail: true });
  if (r.status !== 0) throw new WorkflowError(`a push a rebase után is megbukott:\n${r.err}`);
  return { rebased: true };
}

export function commit({ subject, body, trailers }) {
  const args = ['commit', '-m', subject];
  if (body) args.push('-m', body);
  for (const t of trailers) args.push('--trailer', t);
  git(args, { quiet: false });
  return head();
}

// Minimális argumentum-értelmező: kapcsolók, értékes kapcsolók, ismételhető `--trailer`,
// pozicionális szavak, és a `--` utáni path-lista.
export function parseArgs(argv, { valued = [], flags = [] } = {}) {
  const res = { _: [], paths: [], trailer: [] };
  for (const f of flags) res[f] = false;
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--') {
      res.paths = argv.slice(i + 1);
      break;
    }
    if (a === '--trailer') {
      res.trailer.push(argv[++i]);
    } else if (a === '-m') {
      res.m = argv[++i];
    } else if (a.startsWith('--') && valued.includes(a.slice(2))) {
      res[a.slice(2)] = argv[++i];
    } else if (a.startsWith('--') && flags.includes(a.slice(2))) {
      res[a.slice(2)] = true;
    } else if (a === '--help' || a === '-h') {
      res.help = true;
    } else if (a.startsWith('-')) {
      throw new WorkflowError(`ismeretlen kapcsoló: ${a}`);
    } else {
      res._.push(a);
    }
    i++;
  }
  return res;
}

export function run(main) {
  try {
    main();
  } catch (e) {
    if (e instanceof WorkflowError) {
      console.error(`\n✗ ${e.message}`);
      process.exitCode = e.code;
    } else {
      throw e;
    }
  }
}
