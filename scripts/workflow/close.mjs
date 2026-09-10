// Egy tétel lezáró commitja egy futáson belül: a tételfájl törlése és a tétel változásai egy
// "<slug>: <cím>" commitban. Kapu és push itt nincs -- azt a futás vége (`run.mjs finish`)
// adja, egyszer, az egész futásra.
//
// Őrök: (1) csak futásjelző mellett fut, és csak a futás slugjára; (2) untracked fájl csak app/
// alól kerül a commitba magától (az egyetlen szerkesztett könyvtár), más csak `--add <path>`-del
// névre szólóan, a többi megállít; (3) követett módosítás csak az ismert körből mehet be --
// idegen követett fájl (pl. egy félig szerkesztett docs) megállít, nem söprődik a tételbe;
// (4) módosított tervfájl megállít: a terv változása külön commitot érdemel; (5) ha a tételhez
// már van lezáró commit a futásban, nem commitol újra.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  run, parseArgs, WorkflowError, ROOT, RUN_FILE, git, commit, requireNoRebase, requireMaster, readRun, writeRun,
  untrackedFiles, trackedChanges, underPaths, closingCommit,
} from './lib.mjs';
import { findItem } from './backlogPath.mjs';
import { setDontes, refsIn, today } from './reviewsLib.mjs';

const HELP = `node scripts/workflow/close.mjs <slug> --title "<cím>" [--body "<1-2 mondat>"] [--trailer "<K: v>"]... [--add <path>]... [--fix]
  Futásjelző (${RUN_FILE}) mellett, masteren. Ha a tételnek már van "<slug>: …" commitja a futásban: továbblép.
  Megáll: módosított tervfájl; untracked fájl az app/-on kívül, ami nincs --add-dal megnevezve; követett
  módosítás az ismert körön kívül (app/ data/ assets/ scripts/ .claude/ .github/, docs/reviews/, CHANGELOG,
  FEATURES, PRODUCT.md, CLAUDE.md-k, AGENTS.md, a tételfájl, --add pathok).
  A tétel Source: review:<jelentés>#<id> hivatkozásaira "Döntés: javítva <slug> (<dátum>)" a jelentésbe;
  git rm backlog[/later]/<slug>.md; commit "<slug>: <cím>". Nincs kapu, nincs push (run.mjs finish).
  --add:  ismételhető; egy app/-en kívüli untracked path név szerinti engedélyezése a commitba.
  --fix:  /fix-nek: nincs tételfájl (létező slugnál megáll), a --body kötelező (a Goal a commit törzsében).`;

const SWEEP_UNTRACKED = ['app'];
const ALLOWED_TRACKED = [
  'app', 'data', 'assets', 'scripts', '.claude', '.github', 'docs/reviews',
  'docs/CHANGELOG.md', 'docs/FEATURES.md', 'docs/PRODUCT.md', 'AGENTS.md',
];
const isContextFile = (f) => /(^|\/)CLAUDE\.md$/.test(f);

run(() => {
  const a = parseArgs(process.argv.slice(2), { valued: ['title', 'body'], flags: ['fix'], repeated: ['add'] });
  if (a.help) return console.log(HELP);
  const slug = a._[0];
  if (!slug) throw new WorkflowError('hiányzik a <slug>');
  if (!a.title) throw new WorkflowError('hiányzik a --title "<cím>" (a Goal rövid alakja)');
  if (a.fix && !a.body) throw new WorkflowError('--fix: a --body kötelező -- tervfájl híján a Goal a commit törzsében él');
  requireNoRebase();
  requireMaster();
  const runState = readRun();
  if (!runState) throw new WorkflowError(`nincs futás (${RUN_FILE}) -- előbb: node scripts/workflow/run.mjs start ${slug}`);
  if (!runState.slugs.includes(slug)) {
    throw new WorkflowError(`"${slug}" nem része a futásnak (${runState.slugs.join(', ')}) -- fejezd be a futást, és indíts újat`);
  }

  const existing = closingCommit(slug);
  if (existing) {
    console.log(`már lezárva ebben a futásban: ${existing.slice(0, 7)} -- commit nélkül továbblép`);
    return;
  }
  for (const p of a.add) {
    if (!existsSync(path.join(ROOT, p))) throw new WorkflowError(`--add ${p}: nem létező path`);
    if (git(['ls-files', '--error-unmatch', '--', p], { allowFail: true }).status === 0) {
      throw new WorkflowError(`--add ${p}: már követett fájl, nem kell megnevezni`);
    }
  }

  const found = findItem(slug);
  let item = null;
  if (a.fix) {
    if (found) throw new WorkflowError(`${found.path}: létező tétel -- --fix helyett /plan és /implement ${slug}`);
  } else {
    if (!found) throw new WorkflowError(`nincs backlog[/later]/${slug}.md, és nincs "${slug}: …" commit a futásban`);
    if (found.status === 'idea') throw new WorkflowError(`${found.path}: még idea/ alatt van -- előbb /plan ${slug}`);
    item = found.path;
    if (git(['ls-files', '--error-unmatch', '--', item], { allowFail: true }).status !== 0) {
      throw new WorkflowError(`${item} nem követett -- a /plan commitolja; előbb commit-push.mjs`);
    }
    if (git(['status', '--porcelain', '--', item]).out) {
      throw new WorkflowError(
        `${item} módosítva -- a terv változása nem tűnhet el a lezáró commitban.\n` +
          `Ha a módosítás kell: node scripts/workflow/commit-push.mjs -m "backlog: plan ${slug} frissítve" -- ${item}\n` +
          `Ha nem: git checkout -- ${item}. Aztán újra.`,
      );
    }
  }

  const foreignUntracked = untrackedFiles().filter((f) => !underPaths(f, SWEEP_UNTRACKED) && !a.add.includes(f));
  if (foreignUntracked.length) {
    throw new WorkflowError(
      `követetlen fájl a megengedett körön kívül (${SWEEP_UNTRACKED.join('/ ')}/, vagy --add-del névre szólóan):\n  ${foreignUntracked.join('\n  ')}\n` +
        'Töröld, ignore-old, --add-del nevezd meg, vagy commitold külön (commit-push.mjs), aztán újra.',
    );
  }
  const allowed = (f) => underPaths(f, ALLOWED_TRACKED) || isContextFile(f) || f === item || a.add.includes(f);
  const foreignTracked = trackedChanges().filter((f) => !allowed(f));
  if (foreignTracked.length) {
    throw new WorkflowError(
      `követett módosítás a tétel körén kívül, nem söpröm a lezáró commitba:\n  ${foreignTracked.join('\n  ')}\n` +
        'Ha a tételé: --add <path>. Ha nem: tedd félre (git stash push -- <path>) vagy commitold külön, aztán újra.',
    );
  }

  if (item) {
    // A lezárás könyvelése a forrás-jelentésbe, ugyanabba a commitba. A lezáró SHA még nem
    // létezik, ezért a slug a hivatkozás; idempotens, egy újrafutás ugyanazt a sort írja.
    const src = /^Source:\s*(.+)$/m.exec(readFileSync(path.join(ROOT, item), 'utf-8'));
    for (const id of refsIn(src?.[1])) {
      const [basename, localId] = id.split('#');
      console.log(`Döntés: javítva ${slug} → ${setDontes(basename, localId, `javítva ${slug} (${today()})`)}`);
    }
  }
  // A követett lista a `git rm` ELŐTT készül: a törölt tervfájl pathspec-ként már semmire nem illene.
  const tracked = trackedChanges();
  if (item) git(['rm', '-q', '--', item]);
  if (tracked.length) git(['add', '-A', '--', ...tracked]);
  const sweep = untrackedFiles().filter((f) => underPaths(f, SWEEP_UNTRACKED) || a.add.includes(f));
  if (sweep.length) git(['add', '--', ...sweep]);
  const staged = git(['diff', '--cached', '--name-status']).out;
  if (!staged) throw new WorkflowError('nincs stage-elhető változás -- a tételnek nincs diffje');
  console.log(`\nstage-elve:\n${staged}`);
  const sha = commit({ subject: `${slug}: ${a.title}`, body: a.body, trailers: a.trailer });
  writeRun({ ...runState, done: [...runState.done, slug] });
  console.log(`\ncommit ${sha.slice(0, 7)} helyben, push nélkül -- a futás végén a run.mjs finish kapuz és pushol`);
});
