// A workflow-scriptek állapotátmeneteinek integrációs tesztje ideiglenes git-repókon
// (bare origin + klón). A kapu helyett a WORKFLOW_GATE_CMD marker-parancs fut, ami a
// GATE_LOG-ba írja a lépés nevét -- így látszik, mikor futott (vagy nem futott) a kapu.
// Futtatás: `npm run test:workflow` az app/ alól, vagy `node --test scripts/workflow/` a gyökérből.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WF = path.dirname(fileURLToPath(import.meta.url));
const GATE_OK = `node -e "require('fs').appendFileSync(process.env.GATE_LOG, process.env.WORKFLOW_GATE_STEP + '\\n')"`;
const GATE_FAIL = 'node -e "process.exit(1)"';

function sh(cwd, cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf-8', env: { ...process.env, ...env } });
  return { status: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}
const g = (cwd, ...args) => {
  const r = sh(cwd, 'git', args);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} -> ${r.err}`);
  return r.out;
};

function repo() {
  const tmp = mkdtempSync(path.join(tmpdir(), 'wf-'));
  const origin = path.join(tmp, 'origin.git');
  const work = path.join(tmp, 'work');
  g(tmp, 'init', '--bare', '-b', 'master', origin);
  g(tmp, 'init', '-b', 'master', work);
  g(work, 'config', 'user.name', 'T');
  g(work, 'config', 'user.email', 't@t');
  g(work, 'config', 'core.autocrlf', 'false');
  mkdirSync(path.join(work, 'app', 'src'), { recursive: true });
  mkdirSync(path.join(work, 'backlog', 'idea'), { recursive: true });
  writeFileSync(path.join(work, 'app', 'src', 'a.txt'), 'a\n');
  writeFileSync(path.join(work, 'backlog', 'CLAUDE.md'), '# backlog/\n');
  g(work, 'add', '-A');
  g(work, 'commit', '-q', '-m', 'init');
  g(work, 'remote', 'add', 'origin', origin);
  g(work, 'push', '-q', '-u', 'origin', 'master');
  const gateLog = path.join(tmp, 'gate.log');
  const env = { WORKFLOW_ROOT: work, WORKFLOW_GATE_CMD: GATE_OK, GATE_LOG: gateLog };
  const run = (script, args, extraEnv = {}) =>
    sh(work, process.execPath, [path.join(WF, `${script}.mjs`), ...args], { ...env, ...extraEnv });
  const gateSteps = () => (existsSync(gateLog) ? readFileSync(gateLog, 'utf-8').trim().split('\n').filter(Boolean) : []);
  const originHead = (ref = 'master') => g(origin, 'rev-parse', ref);
  const count = () => Number(g(work, 'rev-list', '--count', 'HEAD'));
  const write = (rel, text) => {
    mkdirSync(path.dirname(path.join(work, rel)), { recursive: true });
    writeFileSync(path.join(work, rel), text);
  };
  const commitPush = (msg) => {
    g(work, 'add', '-A');
    g(work, 'commit', '-q', '-m', msg);
    g(work, 'push', '-q', 'origin', 'master');
  };
  const plan = (slug) => {
    write(`backlog/${slug}.md`, `# ${slug}\nType: chore\nTarget: master\nBaseline: ${g(work, 'rev-parse', 'HEAD')}\n\n## Goal\nx\n`);
    commitPush(`backlog: plan ${slug}`);
  };
  const cleanup = () => rmSync(tmp, { recursive: true, force: true });
  return { work, origin, run, gateSteps, originHead, count, write, commitPush, plan, cleanup };
}

test('commit-push megáll idegen stage-elt fájl mellett, és nem nyúl hozzá', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('app/src/foreign.txt', 'idegen\n');
  g(r.work, 'add', 'app/src/foreign.txt');
  r.write('backlog/idea/x.md', '# x\nType: chore\n\nx\n');
  const before = r.count();
  const res = r.run('commit-push', ['-m', 'backlog: +x', '--', 'backlog/idea/x.md']);
  assert.equal(res.status, 1, res.err);
  assert.match(res.err, /körön kívül/);
  assert.equal(r.count(), before);
  assert.equal(g(r.work, 'diff', '--cached', '--name-only'), 'app/src/foreign.txt');
});

test('commit-push boldog út: csak a megadott path, commit fent az originen', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('backlog/idea/x.md', '# x\nType: chore\n\nx\n');
  r.write('app/src/untouched.txt', 'marad untracked\n');
  const res = r.run('commit-push', ['-m', 'backlog: +x', '--', 'backlog/idea/x.md']);
  assert.equal(res.status, 0, res.err);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
  assert.equal(g(r.work, 'log', '-1', '--format=%s'), 'backlog: +x');
  assert.equal(g(r.work, 'ls-files', 'app/src/untouched.txt'), '');
  assert.deepEqual(r.gateSteps(), ['docs-check']);
});

test('close megáll módosított tervfájlnál, és megőrzi a módosítást', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.write('backlog/x.md', readFileSync(path.join(r.work, 'backlog/x.md'), 'utf-8').replace('## Goal\nx', '## Goal\ny'));
  const before = r.count();
  const res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 1, res.err);
  assert.match(res.err, /commit-push/);
  assert.equal(r.count(), before);
  assert.equal(g(r.work, 'diff', '--name-only'), 'backlog/x.md');
  assert.equal(existsSync(path.join(r.work, 'backlog/x.md')), true);
});

test('sync push-olatlan commitnál a teljes kaput futtatja a push előtt', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('app/src/a.txt', 'b\n');
  g(r.work, 'commit', '-q', '-am', 'helyi');
  const res = r.run('sync', []);
  assert.equal(res.status, 0, res.err);
  assert.deepEqual(r.gateSteps(), ['build', 'lint', 'test', 'docs-check']);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
});

test('sync piros kapunál nem pushol', (t) => {
  const r = repo();
  t.after(r.cleanup);
  const originBefore = r.originHead();
  r.write('app/src/a.txt', 'b\n');
  g(r.work, 'commit', '-q', '-am', 'helyi');
  const res = r.run('sync', [], { WORKFLOW_GATE_CMD: GATE_FAIL });
  assert.equal(res.status, 1);
  assert.match(res.err, /piros/);
  assert.equal(r.originHead(), originBefore);
});

test('close boldog út masteren: tervfájl törölve, egy commit, fent az originen', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.write('app/src/a.txt', 'b\n');
  r.write('app/src/new.txt', 'új\n');
  const before = r.count();
  const res = r.run('close', ['x', '--title', 'cím', '--trailer', 'Co-Authored-By: T <t@t>']);
  assert.equal(res.status, 0, res.err);
  assert.equal(r.count(), before + 1);
  assert.equal(g(r.work, 'log', '-1', '--format=%s'), 'x: cím');
  assert.match(g(r.work, 'log', '-1', '--format=%b'), /Co-Authored-By: T <t@t>/);
  assert.equal(existsSync(path.join(r.work, 'backlog/x.md')), false);
  assert.equal(g(r.work, 'ls-files', 'app/src/new.txt'), 'app/src/new.txt');
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
  assert.deepEqual(r.gateSteps(), ['build', 'lint', 'test', 'docs-check']);
});

test('close megáll, ha untracked fájl van a megengedett körön kívül', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.write('notes.txt', 'jegyzet\n');
  const before = r.count();
  const res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 1, res.err);
  assert.match(res.err, /notes\.txt/);
  assert.equal(r.count(), before);
  assert.deepEqual(r.gateSteps(), []);
});

test('close folytatás-mód: létező lezáró commitnál nem commitol újra, kapuzik és pushol', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  g(r.work, 'rm', '-q', 'backlog/x.md');
  r.write('app/src/a.txt', 'b\n');
  g(r.work, 'add', '-A');
  g(r.work, 'commit', '-q', '-m', 'x: cím');
  const before = r.count();
  const originBefore = r.originHead();
  const res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 0, res.err);
  assert.match(res.out, /folytatás/);
  assert.equal(r.count(), before);
  assert.notEqual(r.originHead(), originBefore);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
  assert.deepEqual(r.gateSteps(), ['build', 'lint', 'test', 'docs-check']);
});

test('close piros kapu után a commit nem jön létre, és a lezárás megismételhető', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.write('app/src/a.txt', 'b\n');
  const before = r.count();
  let res = r.run('close', ['x', '--title', 'cím'], { WORKFLOW_GATE_CMD: GATE_FAIL });
  assert.equal(res.status, 1);
  assert.equal(r.count(), before);
  assert.equal(existsSync(path.join(r.work, 'backlog/x.md')), true);
  res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 0, res.err);
  assert.equal(r.count(), before + 1);
});

test('close branchen: rebase az előrelépett origin/master-re, kapu újra, branch push', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  g(r.work, 'checkout', '-q', '-b', 'x');
  r.write('app/src/feature.txt', 'f\n');
  // Az origin/master időközben előrelép (más session), a branch mögötte marad.
  g(r.work, 'stash', '-q', '-u');
  g(r.work, 'checkout', '-q', 'master');
  r.write('app/src/other.txt', 'o\n');
  r.commitPush('más session');
  g(r.work, 'checkout', '-q', 'x');
  g(r.work, 'stash', 'pop', '-q');
  const res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 0, res.err);
  assert.equal(g(r.work, 'log', '-1', '--format=%s'), 'x: cím');
  assert.equal(g(r.work, 'merge-base', 'HEAD', 'origin/master'), r.originHead('master'));
  assert.equal(r.originHead('x'), g(r.work, 'rev-parse', 'HEAD'));
  assert.equal(r.gateSteps().filter((s) => s === 'build').length, 2);
  assert.match(res.out, /PR/);
});
