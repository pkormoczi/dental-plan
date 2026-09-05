// A helyi master és az origin/master összehozása: fetch, ff-only pull, és ha van
// push-olatlan commit (az új modellben csak megbukott push lehet), sima push. Kiírja a HEAD-et.
// --gate: push előtt a teljes kapu -- kézzel lezárt rebase után kötelező, a base változott.
import {
  run, parseArgs, requireNoRebase, requireMaster, fetchOrigin, ffPull, unpushed, gate, pushMaster, head,
} from './lib.mjs';

const HELP = `node scripts/workflow/sync.mjs [--gate]
  git fetch origin; ha nem master: hiba; ff-merge az origin/master-re (divergencia: hiba);
  ha origin/master..HEAD nem üres: [--gate esetén build+lint+test+docs-check, majd] git push.
  Kimenet: a HEAD SHA (a /plan Baseline-ja). Exit 0 = HEAD == origin/master.`;

run(() => {
  const a = parseArgs(process.argv.slice(2), { flags: ['gate'] });
  if (a.help) return console.log(HELP);
  requireNoRebase();
  requireMaster();
  fetchOrigin();
  ffPull();
  const pending = unpushed();
  if (pending) {
    console.log(`push-olatlan commit a helyi masteren (megbukott push?):\n${pending}`);
    if (a.gate) gate();
    const { rebased } = pushMaster({ regate: gate });
    console.log(rebased ? 'rebase után push kész' : 'push kész');
  }
  console.log(`HEAD ${head()}`);
});
