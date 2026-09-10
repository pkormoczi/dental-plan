// Egy /implement vagy /fix futás kerete. A `start` friss origin/master-ről indít és leteszi a
// futásjelzőt; a tételek `close.mjs`-sel commitolnak kapu nélkül; a `finish` a teljes futás
// diffje szerinti kaput futtatja EGYSZER, és csak zöld után pushol. Így N tételre egy kapukör
// jut, és félbeszakadt futásból sosem publikálódik ellenőrizetlen commit.
import {
  run, parseArgs, WorkflowError, RUN_FILE, readRun, writeRun, clearRun, git, gate, gateFor, changedFiles,
  head, unpushed, requireNoRebase, requireMaster, requirePublishable, fetchOrigin, ffPull, pushMaster,
} from './lib.mjs';
import { findItem } from './backlogPath.mjs';

const HELP = `node scripts/workflow/run.mjs start <slug>... | start --fix <slug> | finish | status | abort
  start:  masteren, tiszta fáról: fetch + ff; kallódó push-olatlan commitot kapu után felvisz; minden slug
          tervezett tétel legyen (--fix: NE legyen tétel); leteszi a ${RUN_FILE} jelzőt; kiírja a HEAD-et.
          Ha már van jelző: kiírja az állapotot és megáll (folytatás: close/finish; feladás: abort).
  finish: jelző kötelező; a futás diffje szerinti kapu (app-kód: build+lint+test+docs-check; workflow:
          +test:workflow; csak docs: docs-check), majd EGY push (nem-ff: rebase, kapu újra, push); a jelző
          csak sikeres push után törlődik -- piros kapunál ugyanez a hívás a folytatás.
  status: a jelző és a futás commitjai.
  abort:  törli a jelzőt, ha nincs push-olatlan commit; különben megáll és kiírja a teendőt (nem resetel).`;

const status = (r) => {
  const log = git(['log', '--oneline', `${r.startHead}..HEAD`]).out;
  return `futás: ${r.slugs.join(', ')}${r.fix ? ' (fix)' : ''}, indult ${r.startedAt} a ${r.startHead.slice(0, 7)}-ről\n` +
    `kész: ${r.done.length ? r.done.join(', ') : '-'}\ncommitok:\n${log || '  (még nincs)'}`;
};

function start(a) {
  requireNoRebase();
  requireMaster();
  const existing = readRun();
  if (existing) throw new WorkflowError(`már fut egy futás:\n${status(existing)}\nFolytasd (close/finish) vagy add fel (abort).`);
  const fix = a.fix;
  const slugs = fix ? [fix] : a._.slice(1);
  if (!slugs.length) throw new WorkflowError('hiányzik a <slug> (vagy --fix <slug>)');
  for (const slug of slugs) {
    const item = findItem(slug);
    if (fix && item) throw new WorkflowError(`${item.path}: létező tétel -- /fix helyett /plan és /implement ${slug}`);
    if (!fix && !item) throw new WorkflowError(`nincs backlog[/later]/${slug}.md -- idea/ alatt sincs? előbb /plan ${slug}`);
    if (!fix && item.status !== 'planned') throw new WorkflowError(`${item.path}: még idea/ alatt van -- előbb /plan ${slug}`);
  }
  requirePublishable();
  fetchOrigin();
  ffPull();
  const pending = unpushed();
  if (pending) {
    console.log(`kallódó push-olatlan commit -- kapu, aztán push, csak utána indul a futás:\n${pending}`);
    const steps = gateFor(changedFiles('origin/master..HEAD'));
    gate(steps);
    pushMaster({ regate: () => gate(steps), steps });
  }
  writeRun({ startHead: head(), slugs, fix: Boolean(fix), done: [], startedAt: new Date().toISOString() });
  console.log(`futás indult: ${slugs.join(', ')}\nHEAD ${head()}`);
}

function finish() {
  requireNoRebase();
  requireMaster();
  const r = readRun();
  if (!r) throw new WorkflowError(`nincs futás (${RUN_FILE}) -- nincs mit lezárni`);
  if (!unpushed()) {
    clearRun();
    console.log('a futás nem hagyott commitot -- jelző törölve, nincs push');
    return;
  }
  const steps = gateFor(changedFiles(`${r.startHead}..HEAD`));
  requirePublishable({ allowRun: true, steps });
  console.log(`${status(r)}\n\nkapu: ${steps.join(' → ')}`);
  gate(steps);
  const { rebased } = pushMaster({ regate: () => gate(steps), steps, allowRun: true });
  clearRun();
  console.log(`\n${git(['log', '--oneline', `${r.startHead}..HEAD`]).out}\nfent az origin/master-en${rebased ? ' (rebase után)' : ''} -- a Pages deploy indul`);
}

function abort() {
  const r = readRun();
  if (!r) throw new WorkflowError(`nincs futás (${RUN_FILE})`);
  const pending = unpushed();
  if (pending) {
    throw new WorkflowError(
      `a futásnak push-olatlan commitja van, a jelző marad:\n${pending}\n` +
        `Javítsd és \`run.mjs finish\`, vagy dobd el kézzel: git reset --hard ${r.startHead} (ezt a script nem teszi meg), aztán abort újra.`,
    );
  }
  clearRun();
  console.log('jelző törölve');
}

run(() => {
  const a = parseArgs(process.argv.slice(2), { valued: ['fix'] });
  if (a.help) return console.log(HELP);
  const cmd = a._[0];
  if (cmd === 'start') return start(a);
  if (cmd === 'finish') return finish();
  if (cmd === 'abort') return abort();
  if (cmd === 'status') {
    const r = readRun();
    console.log(r ? status(r) : 'nincs futás');
    return;
  }
  throw new WorkflowError(`ismeretlen parancs: ${cmd ?? '(üres)'}\n${HELP}`);
});
