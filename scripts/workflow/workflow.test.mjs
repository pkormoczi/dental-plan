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
const FULL = ['build', 'lint', 'test', 'docs-check'];
const RUN_FILE = '.workflow/run.json';

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
  mkdirSync(path.join(work, 'docs'), { recursive: true });
  mkdirSync(path.join(work, 'scripts', 'workflow'), { recursive: true });
  writeFileSync(path.join(work, 'app', 'src', 'a.txt'), 'a\n');
  writeFileSync(path.join(work, 'backlog', 'CLAUDE.md'), '# backlog/\n');
  writeFileSync(path.join(work, 'docs', 'foreign.md'), 'idegen\n');
  writeFileSync(path.join(work, 'scripts', 'workflow', 's.mjs'), '// s\n');
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
  // later: true -> backlog/later/<slug>.md, Prio: later (a mappa a Prio tükre).
  const plan = (slug, { later = false } = {}) => {
    const dir = later ? 'backlog/later' : 'backlog';
    const prio = later ? 'Prio: later\n' : '';
    write(`${dir}/${slug}.md`, `# ${slug}\nType: chore\n${prio}Target: master\nBaseline: ${g(work, 'rev-parse', 'HEAD')}\n\n## Goal\nx\n`);
    commitPush(`backlog: plan ${slug}`);
  };
  const idea = (slug, { later = false } = {}) => {
    const dir = later ? 'backlog/idea/later' : 'backlog/idea';
    write(`${dir}/${slug}.md`, `# ${slug}\nType: chore\n${later ? 'Prio: later\n' : ''}\nx\n`);
    commitPush(`backlog: +${slug}`);
  };
  const start = (...slugs) => {
    const res = run('run', ['start', ...slugs]);
    assert.equal(res.status, 0, res.err);
    return res;
  };
  const hasRun = () => existsSync(path.join(work, RUN_FILE));
  const cleanup = () => rmSync(tmp, { recursive: true, force: true });
  return { work, origin, run, gateSteps, originHead, count, write, commitPush, plan, idea, start, hasRun, cleanup };
}

// ---- run.mjs + close.mjs: a futás kerete ---------------------------------------------------

test('run start → két close → run finish: tételenként commit, egy push, a kapu egyszer fut', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('a');
  r.plan('b', { later: true });
  const originBefore = r.originHead();
  const before = r.count();
  r.start('a', 'b');
  assert.equal(r.hasRun(), true);
  r.write('app/src/a.txt', 'a2\n');
  let res = r.run('close', ['a', '--title', 'A kész', '--trailer', 'Co-Authored-By: T <t@t>']);
  assert.equal(res.status, 0, res.err);
  assert.match(res.out, /push nélkül/);
  assert.equal(g(r.work, 'log', '-1', '--format=%s'), 'a: A kész');
  assert.match(g(r.work, 'log', '-1', '--format=%b'), /Co-Authored-By: T <t@t>/);
  assert.equal(existsSync(path.join(r.work, 'backlog/a.md')), false);
  r.write('app/src/new.txt', 'új\n');
  res = r.run('close', ['b', '--title', 'B kész']);
  assert.equal(res.status, 0, res.err);
  assert.equal(existsSync(path.join(r.work, 'backlog/later/b.md')), false);
  assert.equal(g(r.work, 'ls-files', 'app/src/new.txt'), 'app/src/new.txt');
  assert.equal(r.count(), before + 2);
  assert.equal(r.originHead(), originBefore);
  assert.deepEqual(r.gateSteps(), []);
  res = r.run('run', ['finish']);
  assert.equal(res.status, 0, res.err);
  assert.deepEqual(r.gateSteps(), FULL);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
  assert.equal(r.hasRun(), false);
  assert.equal(g(r.work, 'status', '--porcelain'), '');
});

test('run start közben a sync és a commit-push nem pushol, a jelző marad', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('app/src/a.txt', 'b\n');
  assert.equal(r.run('close', ['x', '--title', 'cím']).status, 0);
  const originBefore = r.originHead();
  let res = r.run('sync', []);
  assert.equal(res.status, 1);
  assert.match(res.err, /futás van folyamatban/);
  r.write('backlog/idea/y.md', '# y\nType: chore\n\ny\n');
  res = r.run('commit-push', ['-m', 'backlog: +y', '--', 'backlog/idea/y.md']);
  assert.equal(res.status, 0, res.err);
  assert.match(res.out, /push nélkül/);
  assert.equal(g(r.work, 'log', '-1', '--format=%s'), 'backlog: +y');
  assert.equal(r.originHead(), originBefore);
  assert.equal(r.hasRun(), true);
  assert.deepEqual(r.gateSteps(), ['docs-check']);
});

test('run finish piros kapunál nem pushol és a jelző megmarad; javító commit után ugyanaz a hívás pushol', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('app/src/a.txt', 'b\n');
  assert.equal(r.run('close', ['x', '--title', 'cím']).status, 0);
  const originBefore = r.originHead();
  let res = r.run('run', ['finish'], { WORKFLOW_GATE_CMD: GATE_FAIL });
  assert.equal(res.status, 1);
  assert.match(res.err, /piros/);
  assert.equal(r.originHead(), originBefore);
  assert.equal(r.hasRun(), true);
  r.write('app/src/a.txt', 'c\n');
  g(r.work, 'commit', '-q', '-am', 'x: cím — javítás');
  res = r.run('run', ['finish']);
  assert.equal(res.status, 0, res.err);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
  assert.equal(r.hasRun(), false);
});

test('run finish megáll, ha a helyi commit és a munkafa eltér, kapu nélkül', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('app/src/a.txt', 'broken\n');
  assert.equal(r.run('close', ['x', '--title', 'cím']).status, 0);
  r.write('app/src/a.txt', 'fixed\n');
  const originBefore = r.originHead();
  const res = r.run('run', ['finish']);
  assert.equal(res.status, 1);
  assert.match(res.err, /követett módosítás.*\n.*app\/src\/a\.txt/);
  assert.equal(r.originHead(), originBefore);
  assert.deepEqual(r.gateSteps(), []);
  assert.equal(readFileSync(path.join(r.work, 'app/src/a.txt'), 'utf-8'), 'fixed\n');
});

test('run start megáll idea/ alatti tételnél, már futó futásnál és nem tiszta fán', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.idea('i', { later: true });
  let res = r.run('run', ['start', 'i']);
  assert.equal(res.status, 1);
  assert.match(res.err, /idea\/ alatt/);
  assert.equal(r.hasRun(), false);
  r.plan('x');
  r.write('app/src/a.txt', 'b\n');
  res = r.run('run', ['start', 'x']);
  assert.equal(res.status, 1);
  assert.match(res.err, /követett módosítás/);
  g(r.work, 'checkout', '--', 'app/src/a.txt');
  r.start('x');
  res = r.run('run', ['start', 'x']);
  assert.equal(res.status, 1);
  assert.match(res.err, /már fut/);
});

test('run start kallódó push-olatlan commitot kapu után felvisz, csak utána indul', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.write('app/src/a.txt', 'b\n');
  g(r.work, 'commit', '-q', '-am', 'kallódó');
  const res = r.run('run', ['start', 'x']);
  assert.equal(res.status, 0, res.err);
  assert.deepEqual(r.gateSteps(), FULL);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
  assert.match(res.out, new RegExp(`HEAD ${g(r.work, 'rev-parse', 'HEAD')}`));
  assert.equal(r.hasRun(), true);
});

test('run abort push-olatlan committal megáll, üres futásnál törli a jelzőt; a kimaradt tétel futása push nélkül zárul', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('app/src/a.txt', 'b\n');
  assert.equal(r.run('close', ['x', '--title', 'cím']).status, 0);
  let res = r.run('run', ['abort']);
  assert.equal(res.status, 1);
  assert.match(res.err, /git reset --hard/);
  assert.equal(r.hasRun(), true);
  g(r.work, 'reset', '-q', '--hard', 'origin/master');
  res = r.run('run', ['abort']);
  assert.equal(res.status, 0, res.err);
  assert.equal(r.hasRun(), false);
  r.start('x');
  const originBefore = r.originHead();
  res = r.run('run', ['finish']);
  assert.equal(res.status, 0, res.err);
  assert.match(res.out, /nem hagyott commitot/);
  assert.equal(r.originHead(), originBefore);
  assert.equal(r.hasRun(), false);
  assert.deepEqual(r.gateSteps(), []);
});

test('run status a futás slugjait és commitjait írja ki', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  assert.match(r.run('run', ['status']).out, /nincs futás/);
  r.start('x');
  r.write('app/src/a.txt', 'b\n');
  assert.equal(r.run('close', ['x', '--title', 'cím']).status, 0);
  const res = r.run('run', ['status']);
  assert.equal(res.status, 0, res.err);
  assert.match(res.out, /futás: x/);
  assert.match(res.out, /kész: x/);
  assert.match(res.out, /x: cím/);
});

test('close jelző nélkül megáll, és a futáson kívüli slugra is', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.plan('y');
  r.write('app/src/a.txt', 'b\n');
  let res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 1);
  assert.match(res.err, /nincs futás/);
  g(r.work, 'checkout', '--', 'app/src/a.txt');
  r.start('x');
  r.write('app/src/a.txt', 'b\n');
  res = r.run('close', ['y', '--title', 'cím']);
  assert.equal(res.status, 1);
  assert.match(res.err, /nem része a futásnak/);
  assert.equal(existsSync(path.join(r.work, 'backlog/y.md')), true);
});

test('close megáll módosított tervfájlnál, és megőrzi a módosítást', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('backlog/x.md', readFileSync(path.join(r.work, 'backlog/x.md'), 'utf-8').replace('## Goal\nx', '## Goal\ny'));
  const before = r.count();
  const res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 1, res.err);
  assert.match(res.err, /commit-push/);
  assert.equal(r.count(), before);
  assert.equal(g(r.work, 'diff', '--name-only'), 'backlog/x.md');
  assert.equal(existsSync(path.join(r.work, 'backlog/x.md')), true);
});

test('close megáll idegen követett docs-fájl módosításánál és megőrzi azt', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('app/src/a.txt', 'b\n');
  r.write('docs/foreign.md', 'módosított idegen\n');
  const before = r.count();
  const res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 1, res.err);
  assert.match(res.err, /docs\/foreign\.md/);
  assert.equal(r.count(), before);
  assert.equal(readFileSync(path.join(r.work, 'docs/foreign.md'), 'utf-8'), 'módosított idegen\n');
  assert.equal(existsSync(path.join(r.work, 'backlog/x.md')), true);
  assert.equal(g(r.work, 'diff', '--cached', '--name-only'), '');
});

test('close a követett körből (docs/CHANGELOG.md, nested CLAUDE.md, scripts/) viszi a módosítást', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('docs/CHANGELOG.md', '# Változásnapló\n');
  r.write('app/src/CLAUDE.md', '# app/src\n');
  r.commitPush('docs');
  r.plan('x');
  r.start('x');
  r.write('app/src/a.txt', 'b\n');
  r.write('docs/CHANGELOG.md', '# Változásnapló\n\n## 2026. szeptember 10.\n- x\n');
  r.write('app/src/CLAUDE.md', '# app/src\n- discovery\n');
  r.write('scripts/workflow/s.mjs', '// s2\n');
  const res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 0, res.err);
  const shown = g(r.work, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort();
  assert.deepEqual(shown, ['app/src/CLAUDE.md', 'app/src/a.txt', 'backlog/x.md', 'docs/CHANGELOG.md', 'scripts/workflow/s.mjs']);
  assert.equal(g(r.work, 'status', '--porcelain', '--untracked-files=no'), '');
});

test('close megáll, ha untracked fájl van a megengedett körön kívül', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('notes.txt', 'jegyzet\n');
  const before = r.count();
  const res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 1, res.err);
  assert.match(res.err, /notes\.txt/);
  assert.equal(r.count(), before);
});

test('close nem söpri be az ittfelejtett docs/ untracked fájlt magától', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('docs/reviews/2026-09-05-review.md', 'jelentés\n');
  const before = r.count();
  const res = r.run('close', ['x', '--title', 'cím']);
  assert.equal(res.status, 1, res.err);
  assert.match(res.err, /docs\/reviews\/2026-09-05-review\.md/);
  assert.equal(r.count(), before);
});

test('close --add a megnevezett untracked fájlt beviszi, egy másikat nem', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('docs/reviews/named.md', 'jelentés\n');
  r.write('docs/reviews/other.md', 'másik\n');
  const res = r.run('close', ['x', '--title', 'cím', '--add', 'docs/reviews/named.md']);
  assert.equal(res.status, 1, res.err);
  assert.match(res.err, /docs\/reviews\/other\.md/);
  assert.doesNotMatch(res.err, /named\.md/);
});

test('close --add boldog út: a megnevezett fájl a commitba kerül', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('docs/reviews/named.md', 'jelentés\n');
  const res = r.run('close', ['x', '--title', 'cím', '--add', 'docs/reviews/named.md']);
  assert.equal(res.status, 0, res.err);
  assert.equal(g(r.work, 'ls-files', 'docs/reviews/named.md'), 'docs/reviews/named.md');
  assert.equal(r.run('run', ['finish']).status, 0);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
});

test('close --add nem létező vagy már követett path-ra hibázik', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  let res = r.run('close', ['x', '--title', 'cím', '--add', 'docs/reviews/hiányzik.md']);
  assert.equal(res.status, 1);
  assert.match(res.err, /nem létező path/);
  res = r.run('close', ['x', '--title', 'cím', '--add', 'backlog/x.md']);
  assert.equal(res.status, 1);
  assert.match(res.err, /már követett/);
});

test('close másodszori hívása lezárt tételre ugyanazzal a --add-dal nem hibázik és nem commitol újra', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('x');
  r.start('x');
  r.write('docs/reviews/named.md', 'jelentés\n');
  assert.equal(r.run('close', ['x', '--title', 'cím', '--add', 'docs/reviews/named.md']).status, 0);
  const after = r.count();
  const res = r.run('close', ['x', '--title', 'cím', '--add', 'docs/reviews/named.md']);
  assert.equal(res.status, 0, res.err);
  assert.match(res.out, /már lezárva/);
  assert.equal(r.count(), after);
});

test('close --fix: tervfájl nélkül commitol a --body-val, létező slugnál megáll', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('letezo');
  let res = r.run('run', ['start', '--fix', 'letezo']);
  assert.equal(res.status, 1);
  assert.match(res.err, /létező tétel/);
  res = r.run('run', ['start', '--fix', 'gyors']);
  assert.equal(res.status, 0, res.err);
  r.write('app/src/a.txt', 'b\n');
  res = r.run('close', ['gyors', '--fix', '--title', 'cím']);
  assert.equal(res.status, 1);
  assert.match(res.err, /--body kötelező/);
  res = r.run('close', ['gyors', '--fix', '--title', 'cím', '--body', 'Goal: a gomb működik']);
  assert.equal(res.status, 0, res.err);
  assert.equal(g(r.work, 'log', '-1', '--format=%s'), 'gyors: cím');
  assert.match(g(r.work, 'log', '-1', '--format=%b'), /Goal: a gomb működik/);
  assert.equal(existsSync(path.join(r.work, 'backlog/letezo.md')), true);
  res = r.run('run', ['finish']);
  assert.equal(res.status, 0, res.err);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
});

// ---- sync.mjs / commit-push.mjs: publikálás futáson kívül ------------------------------------

test('sync push-olatlan app-commitnál a teljes kaput futtatja a push előtt', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('app/src/a.txt', 'b\n');
  g(r.work, 'commit', '-q', '-am', 'helyi');
  const res = r.run('sync', []);
  assert.equal(res.status, 0, res.err);
  assert.deepEqual(r.gateSteps(), FULL);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
});

test('sync docs-only push-olatlan commitnál csak docs-check-et futtat', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('backlog/idea/x.md', '# x\nType: chore\n\nx\n');
  g(r.work, 'add', '-A');
  g(r.work, 'commit', '-q', '-m', 'backlog: +x');
  const res = r.run('sync', []);
  assert.equal(res.status, 0, res.err);
  assert.deepEqual(r.gateSteps(), ['docs-check']);
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

test('sync megáll, ha a helyi commit és a munkafa eltér, kapu nélkül', (t) => {
  const r = repo();
  t.after(r.cleanup);
  const originBefore = r.originHead();
  r.write('app/src/a.txt', 'broken\n');
  g(r.work, 'commit', '-q', '-am', 'helyi');
  r.write('app/src/a.txt', 'fixed\n');
  const res = r.run('sync', []);
  assert.equal(res.status, 1);
  assert.match(res.err, /app\/src\/a\.txt/);
  assert.match(res.err, /commitold/i);
  assert.equal(r.originHead(), originBefore);
  assert.deepEqual(r.gateSteps(), []);
});

test('sync tiszta fán, push-olatlan commit nélkül csak a HEAD-et írja ki', (t) => {
  const r = repo();
  t.after(r.cleanup);
  const res = r.run('sync', []);
  assert.equal(res.status, 0, res.err);
  assert.match(res.out, /HEAD [0-9a-f]{40}/);
  assert.deepEqual(r.gateSteps(), []);
});

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

test('commit-push boldog út: csak a megadott path, docs-check, commit fent az originen', (t) => {
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

test('commit-push app-pathon megáll', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('app/src/a.txt', 'b\n');
  const before = r.count();
  const res = r.run('commit-push', ['-m', 'app', '--', 'app/src/a.txt']);
  assert.equal(res.status, 1);
  assert.match(res.err, /app-kód/);
  assert.equal(r.count(), before);
  assert.deepEqual(r.gateSteps(), []);
});

test('commit-push scripts-pathon a test:workflow is fut a push előtt; a gyökér-fájl nem kér app-kaput', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('scripts/workflow/s.mjs', '// s2\n');
  r.write('.gitignore', '.workflow/\n');
  const res = r.run('commit-push', ['-m', 'workflow: s', '--', 'scripts/workflow/s.mjs', '.gitignore']);
  assert.equal(res.status, 0, res.err);
  assert.deepEqual(r.gateSteps(), ['docs-check', 'test:workflow']);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
});

test('commit-push megáll a körön kívüli követett módosításnál, commit előtt', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('app/src/a.txt', 'b\n');
  r.write('backlog/idea/x.md', '# x\nType: chore\n\nx\n');
  const before = r.count();
  const res = r.run('commit-push', ['-m', 'backlog: +x', '--', 'backlog/idea/x.md']);
  assert.equal(res.status, 1);
  assert.match(res.err, /app\/src\/a\.txt/);
  assert.equal(r.count(), before);
  assert.equal(g(r.work, 'diff', '--cached', '--name-only'), '');
});

test('commit-push --no-push: commitol, de nem pushol', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.write('backlog/idea/x.md', '# x\nType: chore\n\nx\n');
  const originBefore = r.originHead();
  const res = r.run('commit-push', ['-m', 'backlog: +x', '--no-push', '--', 'backlog/idea/x.md']);
  assert.equal(res.status, 0, res.err);
  assert.match(res.out, /push nélkül/);
  assert.equal(g(r.work, 'log', '-1', '--format=%s'), 'backlog: +x');
  assert.equal(r.originHead(), originBefore);
  assert.deepEqual(r.gateSteps(), ['docs-check']);
});

// ---- drift.mjs / prio.mjs -------------------------------------------------------------------

test('drift --all a gyökér és a later/ tervezett tételeit is listázza', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('a');
  r.plan('b', { later: true });
  const res = r.run('drift', ['--all']);
  assert.equal(res.status, 0, res.err);
  assert.deepEqual(res.out.split('\n').sort(), ['a\tok', 'b\tok']);
});

test('drift jelzi a scripts/ változást is app-kód nélkül; --all hibás baseline-nál exit 1', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.plan('w');
  r.write('scripts/workflow/s.mjs', '// s2\n');
  r.commitPush('workflow: s');
  let res = r.run('drift', ['w']);
  assert.equal(res.status, 2);
  assert.match(res.out, /workflow-forrás/);
  assert.doesNotMatch(res.out, /app-kód/);
  r.write('backlog/rossz.md', '# rossz\nType: chore\nTarget: master\nBaseline: 0000000000000000000000000000000000000000\n\n## Goal\nx\n');
  r.commitPush('backlog: plan rossz');
  res = r.run('drift', ['--all']);
  assert.equal(res.status, 1);
  assert.match(res.out, /rossz\thiba/);
  assert.match(res.out, /w\tdrift/);
});

test('prio: later a fejlécbe és later/ alá mozgat, none vissza -- egy-egy commit az originen', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.idea('x');
  const before = r.count();
  let res = r.run('prio', ['x', 'later', '--trailer', 'Co-Authored-By: T <t@t>']);
  assert.equal(res.status, 0, res.err);
  assert.equal(existsSync(path.join(r.work, 'backlog/idea/x.md')), false);
  assert.equal(readFileSync(path.join(r.work, 'backlog/idea/later/x.md'), 'utf-8'), '# x\nType: chore\nPrio: later\n\nx\n');
  assert.equal(g(r.work, 'log', '-1', '--format=%s'), 'backlog: prio x later');
  assert.match(g(r.work, 'log', '-1', '--format=%b'), /Co-Authored-By/);
  assert.equal(g(r.work, 'status', '--porcelain'), '');
  assert.equal(r.count(), before + 1);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
  res = r.run('prio', ['x', 'none']);
  assert.equal(res.status, 0, res.err);
  assert.equal(readFileSync(path.join(r.work, 'backlog/idea/x.md'), 'utf-8'), '# x\nType: chore\n\nx\n');
  assert.equal(existsSync(path.join(r.work, 'backlog/idea/later/x.md')), false);
  assert.equal(r.count(), before + 2);
  res = r.run('prio', ['x', 'next']);
  assert.equal(res.status, 0, res.err);
  assert.equal(readFileSync(path.join(r.work, 'backlog/idea/x.md'), 'utf-8'), '# x\nType: chore\nPrio: next\n\nx\n');
});

test('prio megáll két mappában élő slugnál és módosított tételnél', (t) => {
  const r = repo();
  t.after(r.cleanup);
  r.idea('x');
  r.idea('y');
  r.write('backlog/idea/later/x.md', '# x\nType: chore\nPrio: later\n\nx\n');
  r.commitPush('dupla');
  let res = r.run('prio', ['x', 'next']);
  assert.equal(res.status, 1);
  assert.match(res.err, /több helyen/);
  r.write('backlog/idea/y.md', '# y\nType: chore\n\ny módosítva\n');
  res = r.run('prio', ['y', 'next']);
  assert.equal(res.status, 1);
  assert.match(res.err, /módosított/);
  assert.equal(readFileSync(path.join(r.work, 'backlog/idea/y.md'), 'utf-8'), '# y\nType: chore\n\ny módosítva\n');
});

// ---- reviews.mjs / reviewsLib.mjs -------------------------------------------------------------

const doctorFinding = (n, sev, extra = '') =>
  `### ${n}. Cím ${n}\n\n- Súlyosság: **${sev}**\n- Gyakoriság: **ritka**${extra}\n\nSzöveg ${n}.\n\n`;

// Három review-típus egy repóban: doctor (bullet-mezők), arch (sima mezősorok, Status), manual
// (a súlyosság a ## szekcióból öröklődik).
function reviewRepo() {
  const r = repo();
  r.write(
    'docs/reviews/2026-01-01-doctor-review-x.md',
    `# Doctor-review — x\n\n\`\`\`\nDátum: 2026-01-01\n\`\`\`\n\n## 3. Hol akadt el\n\n` +
      doctorFinding(1, 'Súlyos') + doctorFinding(2, 'Kis') + doctorFinding(3, 'Blokkoló', '\n- Dedup: **ISMÉT** (régi)'),
  );
  r.write(
    'docs/reviews/2026-01-02-arch-react-review.md',
    '# Arch\n\n## Pass 1\n\n### ARCH-001 — Big file\n\nSeverity: Major\nStatus: NEW\nLocation: `app/src/pages/X.tsx`\n\nEvidence.\n\n' +
      '### ARCH-002 — Fixed thing\n\nSeverity: Minor\nStatus: **RESOLVED**\n\nok\n',
  );
  r.write(
    'docs/reviews/2026-01-03-manual-checks-pdf.md',
    '# Manual\n\n## Kritikus\n\n### 1. Font missing\n\nszöveg\n\n## Apró\n\n### 2. Small\n\nszöveg\n',
  );
  r.commitPush('review: x');
  const json = () => {
    const res = r.run('reviews', ['--json']);
    assert.equal(res.status, 0, res.err);
    return JSON.parse(res.out);
  };
  const state = (id) => json().findings.find((f) => f.id === id);
  return { ...r, json, state };
}

test('reviews --json: három jelentéstípus megállapításai, súlyosság és implicit állapot', (t) => {
  const r = reviewRepo();
  t.after(r.cleanup);
  const { reports, findings, warnings } = r.json();
  assert.deepEqual(warnings, []);
  assert.equal(findings.length, 7);
  const by = Object.fromEntries(findings.map((f) => [f.id, f]));
  assert.equal(by['2026-01-01-doctor-review-x#1'].state, 'nyitott');
  assert.equal(by['2026-01-01-doctor-review-x#1'].severity, 'Súlyos');
  assert.equal(by['2026-01-01-doctor-review-x#2'].state, 'tudomásul véve');
  assert.equal(by['2026-01-01-doctor-review-x#2'].implicit, true);
  assert.equal(by['2026-01-01-doctor-review-x#3'].ismet, true);
  assert.equal(by['2026-01-02-arch-react-review#ARCH-001'].severity, 'Súlyos');
  assert.deepEqual(by['2026-01-02-arch-react-review#ARCH-001'].files, ['app/src/pages/X.tsx']);
  assert.equal(by['2026-01-02-arch-react-review#ARCH-002'].state, 'javítva');
  assert.equal(by['2026-01-03-manual-checks-pdf#1'].severity, 'Blokkoló');
  assert.equal(by['2026-01-03-manual-checks-pdf#2'].severity, 'Kis');
  const x = reports.find((p) => p.basename === '2026-01-01-doctor-review-x');
  assert.equal(x.openThreshold, 2);
  assert.equal(x.openMinor, 0);
  assert.equal(x.processed, false);
});

test('reviews: az állapot az élő tétel Source sorából és a törlő commit tárgyából vezetődik le', (t) => {
  const r = reviewRepo();
  t.after(r.cleanup);
  r.write('backlog/idea/elo.md', '# elo\nType: bug\nSource: review:2026-01-01-doctor-review-x#1\n\nx\n');
  r.write('backlog/lezart.md', '# lezart\nType: bug\nSource: review:2026-01-01-doctor-review-x#3\nTarget: master\n\n## Goal\nx\n');
  r.write('backlog/idea/elvetett.md', '# elvetett\nType: bug\nSource: review:2026-01-02-arch-react-review#ARCH-001\n\nx\n');
  r.write('backlog/idea/konvencio-nelkul.md', '# konvencio-nelkul\nType: bug\nSource: review:2026-01-03-manual-checks-pdf#1\n\nx\n');
  r.commitPush('backlog: +elo, +lezart, +elvetett, +konvencio-nelkul');
  g(r.work, 'rm', '-q', 'backlog/lezart.md');
  g(r.work, 'commit', '-q', '-m', 'lezart: kész a javítás');
  g(r.work, 'rm', '-q', 'backlog/idea/elvetett.md');
  g(r.work, 'commit', '-q', '-m', 'backlog: -elvetett');
  g(r.work, 'rm', '-q', 'backlog/idea/konvencio-nelkul.md');
  g(r.work, 'commit', '-q', '-m', 'takarítás');
  const { findings, warnings } = r.json();
  const by = Object.fromEntries(findings.map((f) => [f.id, f]));
  assert.equal(by['2026-01-01-doctor-review-x#1'].state, 'backlog');
  assert.equal(by['2026-01-01-doctor-review-x#1'].evidence, 'elo');
  assert.equal(by['2026-01-01-doctor-review-x#3'].state, 'javítva');
  assert.equal(by['2026-01-01-doctor-review-x#3'].evidence, 'lezart');
  assert.equal(by['2026-01-02-arch-react-review#ARCH-001'].state, 'elvetve');
  assert.equal(by['2026-01-03-manual-checks-pdf#1'].state, 'elvetve');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /konvencio-nelkul.*konvenció nélkül/);
  // Elvetett tétel + "Döntés: javítva" nem ütközik (a tételt azért vetették el, mert a pont már
  // javítva volt); lezárt tétel + "Döntés: elvetve" viszont igen.
  r.run('reviews', ['dontes', 'review:2026-01-02-arch-react-review#ARCH-001', 'javítva abc1234, ellenőrizte review:2026-01-03-manual-checks-pdf (2026-01-09)']);
  r.run('reviews', ['dontes', 'review:2026-01-01-doctor-review-x#3', 'elvetve: mégsem (2026-01-09)']);
  const after = r.json();
  assert.equal(after.findings.find((f) => f.id === '2026-01-02-arch-react-review#ARCH-001').state, 'javítva');
  assert.equal(after.warnings.filter((w) => w.includes('ARCH-001')).length, 0);
  assert.equal(after.warnings.filter((w) => /x#3: a történet szerint javítva.*Döntés sor szerint elvetve/.test(w)).length, 1);
});

test('reviews dontes: egy sor a mezőblokk végére, újraírás felülírja; --check az ellentmondásra piros', (t) => {
  const r = reviewRepo();
  t.after(r.cleanup);
  const rep = 'docs/reviews/2026-01-01-doctor-review-x.md';
  let res = r.run('reviews', ['dontes', 'review:2026-01-01-doctor-review-x#1', 'elvetve: nem cél (2026-01-05)']);
  assert.equal(res.status, 0, res.err);
  res = r.run('reviews', ['dontes', '2026-01-01-doctor-review-x#1', 'tudomásul véve (2026-01-06)']);
  assert.equal(res.status, 0, res.err);
  const text = readFileSync(path.join(r.work, rep), 'utf-8');
  assert.equal((text.match(/^- Döntés:/gm) ?? []).length, 1);
  assert.match(text, /- Gyakoriság: \*\*ritka\*\*\n- Döntés: tudomásul véve \(2026-01-06\)\n\nSzöveg 1\./);
  assert.equal(r.state('2026-01-01-doctor-review-x#1').state, 'tudomásul véve');
  assert.equal(r.state('2026-01-01-doctor-review-x#1').implicit, false);
  res = r.run('reviews', ['dontes', 'review:2026-01-01-doctor-review-x#9', 'x']);
  assert.equal(res.status, 1);
  assert.match(res.err, /nincs "9" megállapítás/);
  // Élő tétel mellett a Döntés sor ellentmond -- a --check ezt pirosnak veszi, de nem dönt.
  r.write('backlog/idea/elo.md', '# elo\nType: bug\nSource: review:2026-01-01-doctor-review-x#1\n\nx\n');
  r.commitPush('backlog: +elo');
  res = r.run('reviews', ['--check']);
  assert.equal(res.status, 1);
  assert.match(res.out, /élő tétel \(elo\) mellett "Döntés: tudomásul véve/);
  assert.equal(r.state('2026-01-01-doctor-review-x#1').state, 'backlog');
});

test('reviews feldolgozas: a fejléc-blokkba ír, és a felülírt jelentés nyitott ponttal is feldolgozott', (t) => {
  const r = reviewRepo();
  t.after(r.cleanup);
  let res = r.run('reviews', ['feldolgozas', '2026-01-01-doctor-review-x', 'felülírta review:2026-01-02-arch-react-review']);
  assert.equal(res.status, 0, res.err);
  const text = readFileSync(path.join(r.work, 'docs/reviews/2026-01-01-doctor-review-x.md'), 'utf-8');
  assert.match(text, /Dátum: 2026-01-01\nFeldolgozás: felülírta review:2026-01-02-arch-react-review\n```/);
  const { reports, warnings } = r.json();
  assert.deepEqual(warnings, []);
  assert.equal(reports.find((p) => p.basename === '2026-01-01-doctor-review-x').processed, true);
  res = r.run('reviews', ['feldolgozas', '2026-01-01-doctor-review-x', 'felülírta review:nincs-ilyen']);
  assert.equal(res.status, 0, res.err);
  res = r.run('reviews', ['--check']);
  assert.equal(res.status, 1);
  assert.match(res.out, /nincs ilyen jelentés/);
});

test('reviews: archive/ alatti jelentés nyitott küszöb feletti ponttal figyelmeztetés', (t) => {
  const r = reviewRepo();
  t.after(r.cleanup);
  mkdirSync(path.join(r.work, 'docs/reviews/archive'), { recursive: true });
  g(r.work, 'mv', 'docs/reviews/2026-01-01-doctor-review-x.md', 'docs/reviews/archive/2026-01-01-doctor-review-x.md');
  const { reports, warnings } = r.json();
  assert.equal(reports.find((p) => p.basename === '2026-01-01-doctor-review-x').archived, true);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /archive\/ alatt, de 2 nyitott/);
  // Az azonosító mappa-független: a dontes az archívumban is megtalálja.
  const res = r.run('reviews', ['dontes', 'review:2026-01-01-doctor-review-x#1', 'tudomásul véve']);
  assert.equal(res.status, 0, res.err);
});

test('discard: git rm, "Döntés: elvetve" a forrás-jelentésbe, egy "backlog: -<slug>" commit az originen', (t) => {
  const r = reviewRepo();
  t.after(r.cleanup);
  r.write('backlog/idea/elvet.md', '# elvet\nType: bug\nSource: review:2026-01-01-doctor-review-x#1\n\nx\n');
  r.commitPush('backlog: +elvet');
  const before = r.count();
  let res = r.run('discard', ['elvet']);
  assert.equal(res.status, 1);
  assert.match(res.err, /--reason/);
  res = r.run('discard', ['elvet', '--reason', 'szándékos működés']);
  assert.equal(res.status, 0, res.err + res.out);
  assert.equal(existsSync(path.join(r.work, 'backlog/idea/elvet.md')), false);
  assert.equal(r.count(), before + 1);
  assert.equal(r.originHead(), g(r.work, 'rev-parse', 'HEAD'));
  assert.equal(g(r.work, 'log', '-1', '--format=%s'), 'backlog: -elvet');
  assert.match(g(r.work, 'show', '--name-only', '--format=', 'HEAD'), /docs\/reviews\/2026-01-01-doctor-review-x\.md/);
  const text = readFileSync(path.join(r.work, 'docs/reviews/2026-01-01-doctor-review-x.md'), 'utf-8');
  assert.match(text, /- Döntés: elvetve: szándékos működés \(\d{4}-\d{2}-\d{2}\)/);
  const { findings, warnings } = r.json();
  assert.deepEqual(warnings, []);
  assert.equal(findings.find((f) => f.id === '2026-01-01-doctor-review-x#1').state, 'elvetve');
  // Módosított tételnél megáll, és nem nyúl a jelentéshez.
  r.write('backlog/idea/masik.md', '# masik\nType: bug\nSource: review:2026-01-01-doctor-review-x#3\n\nx\n');
  r.commitPush('backlog: +masik');
  r.write('backlog/idea/masik.md', '# masik\nType: bug\nSource: review:2026-01-01-doctor-review-x#3\n\nmódosítva\n');
  res = r.run('discard', ['masik', '--reason', 'x']);
  assert.equal(res.status, 1);
  assert.match(res.err, /módosított/);
  assert.equal(g(r.work, 'status', '--porcelain', '--', 'docs/reviews'), '');
});

test('close: a tétel review: Source sorára "Döntés: javítva <slug>" kerül a jelentésbe és a lezáró commitba', (t) => {
  const r = reviewRepo();
  t.after(r.cleanup);
  const base = g(r.work, 'rev-parse', 'HEAD');
  r.write('backlog/lezar.md', `# lezar\nType: bug\nSource: review:2026-01-01-doctor-review-x#3; review:2026-01-02-arch-react-review#ARCH-001\nTarget: master\nBaseline: ${base}\n\n## Goal\nx\n`);
  r.write('backlog/szabad.md', `# szabad\nType: bug\nSource: doctor-review x (2026-01-01), 1. megállapítás\nTarget: master\nBaseline: ${base}\n\n## Goal\nx\n`);
  r.commitPush('backlog: plan lezar, szabad');
  r.start('lezar', 'szabad');
  let res = r.run('close', ['lezar', '--title', 'Kész']);
  assert.equal(res.status, 0, res.err + res.out);
  const shown = g(r.work, 'show', '--name-only', '--format=', 'HEAD');
  assert.match(shown, /docs\/reviews\/2026-01-01-doctor-review-x\.md/);
  assert.match(shown, /docs\/reviews\/2026-01-02-arch-react-review\.md/);
  const doctor = readFileSync(path.join(r.work, 'docs/reviews/2026-01-01-doctor-review-x.md'), 'utf-8');
  assert.match(doctor, /- Dedup: \*\*ISMÉT\*\* \(régi\)\n- Döntés: javítva lezar \(\d{4}-\d{2}-\d{2}\)\n\nSzöveg 3\./);
  const arch = readFileSync(path.join(r.work, 'docs/reviews/2026-01-02-arch-react-review.md'), 'utf-8');
  assert.match(arch, /Location: `app\/src\/pages\/X\.tsx`\n- Döntés: javítva lezar/);
  let { findings, warnings } = r.json();
  assert.deepEqual(warnings, []);
  assert.equal(findings.find((f) => f.id === '2026-01-01-doctor-review-x#3').state, 'javítva');
  assert.equal(findings.find((f) => f.id === '2026-01-01-doctor-review-x#3').evidence, 'lezar');
  // Szabad szövegű Source: nincs mit könyvelni, a jelentés érintetlen.
  res = r.run('close', ['szabad', '--title', 'Kész']);
  assert.equal(res.status, 0, res.err + res.out);
  assert.doesNotMatch(g(r.work, 'show', '--name-only', '--format=', 'HEAD'), /docs\/reviews/);
  ({ findings } = r.json());
  assert.equal(findings.find((f) => f.id === '2026-01-01-doctor-review-x#1').state, 'nyitott');
});
