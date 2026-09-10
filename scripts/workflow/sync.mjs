// A helyi master és az origin/master összehozása: fetch, ff-merge, és ha van push-olatlan
// commit (csak megbukott vagy félbeszakadt futás maradványa lehet), a diff hatása szerinti
// kapu, majd push. Push-olatlan commitra nincs bizonyíték, hogy ellenőrzött -- ezért a kapu nem
// opcionális. Futó /implement mellett nem publikál. Kiírja a HEAD-et (a /plan Baseline-ja).
import {
  run, parseArgs, WorkflowError, RUN_FILE, readRun, requireNoRebase, requireMaster, fetchOrigin, ffPull, unpushed,
  gate, gateFor, changedFiles, pushMaster, requirePublishable, head,
} from './lib.mjs';

const HELP = `node scripts/workflow/sync.mjs
  git fetch origin; ha nem master: hiba; ff-merge az origin/master-re;
  ha origin/master..HEAD nem üres: a diff szerinti kapu (app-kód: build+lint+test+docs-check; workflow:
  +test:workflow; csak docs/backlog: docs-check), majd git push (nem-ff: rebase, kapu újra, push).
  Publikálás csak követett módosítás nélküli fáról. Futásjelző (${RUN_FILE}) mellett megáll.
  Kimenet: a HEAD SHA (a /plan Baseline-ja). Exit 0 = HEAD == origin/master.`;

run(() => {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) return console.log(HELP);
  requireNoRebase();
  requireMaster();
  const r = readRun();
  if (r) {
    throw new WorkflowError(
      `futás van folyamatban (${r.slugs.join(', ')}) -- a sync nem mozdítja a baseline-t és nem publikál.\n` +
        'Fejezd be: node scripts/workflow/run.mjs finish (vagy status / abort).',
    );
  }
  fetchOrigin();
  ffPull();
  const pending = unpushed();
  if (pending) {
    const steps = gateFor(changedFiles('origin/master..HEAD'));
    // Olcsó előellenőrzés a drága kapu előtt: eltérő munkafával a kapu mást igazolna.
    requirePublishable({ steps });
    console.log(`push-olatlan commit a helyi masteren -- kapu (${steps.join(' → ')}), aztán push:\n${pending}`);
    gate(steps);
    const { rebased } = pushMaster({ regate: () => gate(steps), steps });
    console.log(rebased ? 'rebase után push kész' : 'push kész');
  }
  console.log(`HEAD ${head()}`);
});
