// A helyi master és az origin/master összehozása: fetch, ff-merge, és ha van push-olatlan
// commit (az új modellben csak megbukott vagy félbeszakadt futás maradványa lehet), a TELJES
// kapu, majd push. Push-olatlan commitra nincs bizonyíték, hogy ellenőrzött -- ezért a kapu
// nem opcionális. Kiírja a HEAD-et (a /plan Baseline-ja).
import {
  run, parseArgs, requireNoRebase, requireMaster, fetchOrigin, ffPull, unpushed, gate, pushMaster, head,
} from './lib.mjs';

const HELP = `node scripts/workflow/sync.mjs
  git fetch origin; ha nem master: hiba; ff-merge az origin/master-re;
  ha origin/master..HEAD nem üres: build+lint+test+docs-check, majd git push (nem-ff: rebase, kapu újra, push).
  Kimenet: a HEAD SHA (a /plan Baseline-ja). Exit 0 = HEAD == origin/master.`;

run(() => {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) return console.log(HELP);
  requireNoRebase();
  requireMaster();
  fetchOrigin();
  ffPull();
  const pending = unpushed();
  if (pending) {
    console.log(`push-olatlan commit a helyi masteren -- a kapu lefut, aztán push:\n${pending}`);
    gate();
    const { rebased } = pushMaster({ regate: gate });
    console.log(rebased ? 'rebase után push kész' : 'push kész');
  }
  console.log(`HEAD ${head()}`);
});
