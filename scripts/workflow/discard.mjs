// Egy backlog-tétel elvetésének determinisztikus része: git rm, a tétel Source: review:<id>
// hivatkozásaira "Döntés: elvetve: <indok>" a jelentésbe, majd commit-push "backlog: -<slug>".
// A commit-tárgy konvenció a reviews.mjs levezetésének forrása: e nélkül a törölt tétel
// "konvenció nélkül" jelzést kap. Nem dönt: az indokot a hívó adja (a doki vagy a fejlesztő).
// Termékszintű elvetésnél a docs/PRODUCT.md Nem cél sora az /idea skill külön lépése.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, parseArgs, WorkflowError, ROOT, git } from './lib.mjs';
import { findItem } from './backlogPath.mjs';
import { setDontes, refsIn, today } from './reviewsLib.mjs';

const HELP = `node scripts/workflow/discard.mjs <slug> --reason "<indok>" [--trailer "<Kulcs: érték>"]...
  git rm backlog[/idea][/later]/<slug>.md (módosított vagy nem követett tételnél megáll); a tétel
  Source: review:<jelentés>#<id> hivatkozásaira "Döntés: elvetve: <indok> (<dátum>)" a jelentésbe;
  commit-push.mjs: "backlog: -<slug>", a törzsben az indok.`;

run(() => {
  const a = parseArgs(process.argv.slice(2), { valued: ['reason'] });
  if (a.help) return console.log(HELP);
  const slug = a._[0];
  if (!slug) throw new WorkflowError('hiányzik a <slug>');
  if (!a.reason) throw new WorkflowError('hiányzik a --reason "<indok>" -- elvetés indok nélkül nem könyvelhető');
  const item = findItem(slug);
  if (!item) throw new WorkflowError(`nincs "${slug}" tétel a backlog négy mappájában (backlog[/later]/, backlog/idea[/later]/)`);
  if (git(['ls-files', '--error-unmatch', '--', item.path], { allowFail: true }).status !== 0) {
    throw new WorkflowError(`${item.path} nem követett -- töröld kézzel, nincs mit könyvelni`);
  }
  if (git(['status', '--porcelain', '--', item.path]).out) {
    throw new WorkflowError(`${item.path} módosított -- előbb commitold (commit-push.mjs), vagy git checkout, aztán elvetés`);
  }
  const src = /^Source:\s*(.+)$/m.exec(readFileSync(path.join(ROOT, item.path), 'utf-8'));
  const touched = new Set();
  for (const id of refsIn(src?.[1])) {
    const [basename, localId] = id.split('#');
    touched.add(setDontes(basename, localId, `elvetve: ${a.reason} (${today()})`));
  }
  git(['rm', '-q', '--', item.path]);
  const args = [path.join(path.dirname(fileURLToPath(import.meta.url)), 'commit-push.mjs'), '-m', `backlog: -${slug}`, '--body', a.reason];
  for (const t of a.trailer) args.push('--trailer', t);
  args.push('--', item.path, ...touched);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (r.status !== 0) throw new WorkflowError('a commit-push megállt -- lásd fent', r.status ?? 1);
  if (touched.size) console.log(`Döntés: elvetve könyvelve: ${[...touched].join(', ')}`);
});
