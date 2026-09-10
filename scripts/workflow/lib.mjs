// Közös git/npm réteg a workflow-parancsokhoz. Minden parancs a repó gyökeréből fut
// (`node scripts/workflow/<parancs>.mjs`), a minőségi kapu az app/ alatt.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// WORKFLOW_ROOT / WORKFLOW_GATE_CMD: teszt-varratok -- a workflow.test.mjs ideiglenes repón
// futtatja a parancsokat, a kapu helyett egy marker-parancsot. Éles futásban nincsenek beállítva.
export const ROOT = process.env.WORKFLOW_ROOT
  ? path.resolve(process.env.WORKFLOW_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
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
  const override = process.env.WORKFLOW_GATE_CMD;
  const r = override
    ? spawnSync(override, { cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, WORKFLOW_GATE_STEP: script } })
    : spawnSync(`npm run ${script}`, { cwd: APP, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    throw new WorkflowError(`npm run ${script} piros -- javítsd, és futtasd újra ezt a parancsot`);
  }
}

export const docsCheck = () => npm('docs-check');
export const FULL_GATE = ['build', 'lint', 'test', 'docs-check'];
export function gate(steps = FULL_GATE) {
  for (const s of steps) npm(s);
}

// A kapu a publikálandó diff hatása szerint választódik: app-kód a teljes kaput kéri, a
// workflow-scriptek a saját átmenettesztjeiket, a docs/backlog/skill-szöveg csak docs-checket.
// Gyökér-szintű fájl (CLAUDE.md, .gitignore, .mcp.json) nem app-bemenet: az app az app/ alatt
// él, a saját package.json-jával. Ismeretlen hatású path a teljes kaput kapja.
export const CODE_PATHS = ['app', 'data', 'assets'];
export const WORKFLOW_PATHS = ['scripts', '.github'];
const DOCS_PATHS = ['docs', 'backlog', '.claude'];
export function gateFor(files) {
  const code = files.some((f) => underPaths(f, CODE_PATHS));
  const workflow = files.some((f) => underPaths(f, WORKFLOW_PATHS));
  const docsOnly = files.every((f) => underPaths(f, DOCS_PATHS) || underPaths(f, WORKFLOW_PATHS) || !f.includes('/'));
  const steps = code || !docsOnly ? [...FULL_GATE] : ['docs-check'];
  if (workflow) steps.push('test:workflow');
  return steps;
}
export const changedFiles = (range) => git(['diff', '--name-only', range]).out.split('\n').filter(Boolean);

export const head = () => git(['rev-parse', 'HEAD']).out;
export const currentBranch = () => git(['branch', '--show-current']).out;
export const unpushed = () => git(['log', 'origin/master..HEAD', '--oneline']).out;
export const stagedFiles = () => git(['diff', '--cached', '--name-only']).out.split('\n').filter(Boolean);
// A futásjelző mappája sosem „idegen” untracked fájl, .gitignore nélküli repóban (teszt) sem.
export const untrackedFiles = () =>
  git(['ls-files', '--others', '--exclude-standard']).out.split('\n').filter((f) => f && !underPaths(f, ['.workflow']));
// Követett fájlok staged vagy unstaged módosítása (átnevezésnél mindkét path). A `git()` trimmel,
// ezért az első sor vezető státusz-szóköze hiányozhat -- a státuszmezőt mintával vágjuk le.
export const trackedChanges = () =>
  git(['status', '--porcelain', '--untracked-files=no']).out
    .split('\n')
    .filter(Boolean)
    .flatMap((l) => l.replace(/^[ MADRCU!]{1,2}\s+/, '').split(' -> '));

// Egy path-lista alá tartozik-e a fájl (a path lehet könyvtár is).
export const underPaths = (file, paths) =>
  paths.some((p) => {
    const dir = p.replace(/\/+$/, '');
    return file === dir || file.startsWith(`${dir}/`);
  });

// A már létező, push-olatlan lezáró commit egy tételhez -- a close.mjs ebből tudja, hogy a
// tétel ebben a futásban már lezárult, nem kell újra commitolni.
export function closingCommit(slug) {
  const line = git(['log', 'origin/master..HEAD', '--format=%H%x09%s']).out
    .split('\n')
    .find((l) => l.split('\t')[1]?.startsWith(`${slug}: `));
  return line ? line.split('\t')[0] : null;
}

// Futásjelző: az /implement és a /fix tételenként commitol, de csak a futás végén, egy teljes
// kapu után pushol. Amíg a jelző létezik, egyetlen parancs sem publikálhat -- a köztes commit
// nem bizonyított állapot. Untracked és ignore-olt: végrehajtási adat, nem a repó része.
export const RUN_FILE = '.workflow/run.json';
const runPath = () => path.join(ROOT, RUN_FILE);
export const readRun = () => (existsSync(runPath()) ? JSON.parse(readFileSync(runPath(), 'utf-8')) : null);
export function writeRun(run) {
  mkdirSync(path.dirname(runPath()), { recursive: true });
  writeFileSync(runPath(), `${JSON.stringify(run, null, 2)}\n`);
}
export const clearRun = () => rmSync(runPath(), { force: true });

// Publikálás előfeltétele: a kapu azt a tartalmat igazolja, ami a commitban van. Követett
// módosítás mellett (a hívó által épp commitolandó pathokon kívül) nincs push; a kapu bemenetét
// adó könyvtárakban untracked fájl sem állhat, ha a kapu app-kódot is futtat.
export function requirePublishable({ allowRun = false, steps = FULL_GATE, except = [] } = {}) {
  const run = readRun();
  if (run && !allowRun) {
    throw new WorkflowError(
      `futás van folyamatban (${RUN_FILE}: ${run.slugs.join(', ')}) -- amíg tart, csak a \`run.mjs finish\` publikál.\n` +
        'Állapot: node scripts/workflow/run.mjs status',
    );
  }
  const tracked = trackedChanges().filter((f) => !underPaths(f, except));
  if (tracked.length) {
    throw new WorkflowError(
      `követett módosítás a munkafában -- a kapu nem azt igazolná, ami a commitba kerül:\n  ${tracked.join('\n  ')}\n` +
        'Commitold (futásban close.mjs, egyébként commit-push.mjs), vagy tedd félre (git stash), aztán újra.',
    );
  }
  if (steps.some((s) => s !== 'docs-check')) {
    const inputs = [...CODE_PATHS, ...WORKFLOW_PATHS];
    const stray = untrackedFiles().filter((f) => underPaths(f, inputs) && !underPaths(f, except));
    if (stray.length) {
      throw new WorkflowError(
        `untracked fájl a kapu bemenetében (${inputs.join(', ')}) -- a kapu mást futtatna, mint ami a commitban van:\n  ${stray.join('\n  ')}\n` +
          'Vidd be a commitba (close.mjs --add), töröld, vagy ignore-old, aztán újra.',
      );
    }
  }
}

export function requireNoRebase() {
  for (const d of ['rebase-merge', 'rebase-apply']) {
    if (existsSync(path.resolve(ROOT, git(['rev-parse', '--git-path', d]).out))) {
      throw new WorkflowError(
        'félbehagyott rebase van a repóban -- oldd fel a konfliktust, `git rebase --continue`, ' +
          'majd `node scripts/workflow/sync.mjs` (a base változott, a kapu újra fut a push előtt)',
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
// miatt tiszta munkafát követelne); ha a helyi jár előrébb, az push-teendő; ha mindkettő
// (divergencia), azt a push-lépés rebase-e oldja fel -- itt csak jelezzük.
export function ffPull() {
  const remote = git(['rev-parse', 'origin/master']).out;
  if (remote === head() || isAncestor(remote, 'HEAD')) return;
  if (!isAncestor('HEAD', remote)) {
    console.log('a helyi master és az origin/master divergál -- a push előtt rebase és kapu lesz');
    return;
  }
  const r = git(['merge', '--ff-only', 'origin/master'], { allowFail: true });
  if (r.status !== 0) {
    throw new WorkflowError(`az origin/master ff-merge-e nem sikerült (commitolatlan módosítás ütközik?):\n${r.err}`);
  }
  console.log('helyi master frissítve az origin/master-re (ff)');
}

// Sima push; ha az origin közben előrelépett: fetch + rebase, majd a kapu ÚJRA (a base
// változott), csak utána push. Konfliktusnál a rebase félben marad, nincs --abort.
export function pushMaster({ regate, steps = FULL_GATE, allowRun = false }) {
  requirePublishable({ allowRun, steps });
  let r = git(['push', 'origin', 'master'], { allowFail: true });
  if (r.status === 0) return { rebased: false };
  if (!/non-fast-forward|fetch first|rejected/i.test(r.err)) {
    throw new WorkflowError(
      `a push megbukott (hálózat? jogosultság?):\n${r.err}\nHa rendbe jött: ismételd ugyanezt a parancsot`,
    );
  }
  console.log('\norigin/master előrelépett -- fetch + rebase origin/master-re');
  git(['fetch', 'origin']);
  r = git(['rebase', 'origin/master'], { allowFail: true, quiet: false });
  if (r.status !== 0) {
    throw new WorkflowError(
      'a rebase konfliktusba futott, félben marad (nincs --abort, nincs automatikus feloldás).\n' +
        `${r.err}\nOldd fel, git rebase --continue, majd ismételd ugyanezt a parancsot (a kapu újra fut a push előtt)`,
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

// Minimális argumentum-értelmező: kapcsolók, értékes kapcsolók, ismételhető `--trailer` és
// tetszőleges `repeated` kapcsolók (ugyanaz a gyűjtő minta), pozicionális szavak, és a `--`
// utáni path-lista.
export function parseArgs(argv, { valued = [], flags = [], repeated = [] } = {}) {
  const res = { _: [], paths: [], trailer: [] };
  for (const f of flags) res[f] = false;
  for (const r of repeated) res[r] = [];
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
    } else if (a.startsWith('--') && repeated.includes(a.slice(2))) {
      res[a.slice(2)].push(argv[++i]);
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
