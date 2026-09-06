// A helyi master és az origin/master összehozása: fetch, ff-merge, és ha van push-olatlan
// commit (az új modellben csak megbukott vagy félbeszakadt futás maradványa lehet), a TELJES
// kapu, majd push. Push-olatlan commitra nincs bizonyíték, hogy ellenőrzött -- ezért a kapu
// nem opcionális. Kiírja a HEAD-et (a /plan Baseline-ja).
import {
  run, parseArgs, requireNoRebase, requireMaster, fetchOrigin, ffPull, unpushed, gate, pushMaster, head,
  isClean, git, WorkflowError,
} from './lib.mjs';

const HELP = `node scripts/workflow/sync.mjs [--require-clean]
  git fetch origin; ha nem master: hiba; ff-merge az origin/master-re;
  ha origin/master..HEAD nem üres: build+lint+test+docs-check, majd git push (nem-ff: rebase, kapu újra, push).
  Kimenet: a HEAD SHA (a /plan Baseline-ja). Exit 0 = HEAD == origin/master.
  --require-clean: megáll, ha a munkafa nem tiszta (követett módosítás vagy untracked fájl) --
                   a batch-utak (/plan-batch, /implement-batch) és az /implement preflightja
                   ezzel indul, hogy egy ittfelejtett fájl ne csússzon be egy tétel-commitba.`;

run(() => {
  const a = parseArgs(process.argv.slice(2), { flags: ['require-clean'] });
  if (a.help) return console.log(HELP);
  requireNoRebase();
  requireMaster();
  if (a['require-clean'] && !isClean()) {
    const lines = git(['status', '--porcelain', '--untracked-files=all']).out;
    throw new WorkflowError(
      `a munkafa nem tiszta -- ez a lépés csak tiszta fáról indul:\n  ${lines.split('\n').join('\n  ')}\n` +
        'Commitold (commit-push.mjs), töröld, vagy .gitignore, aztán újra.',
    );
  }
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
