// A /reviews determinisztikus része: a review-jelentések feldolgozási állapota a fájlokból és
// a gitből számolva (reviewsLib.mjs). Nem dönt, nem commitol: a `dontes`/`feldolgozas` parancs
// csak fájlt ír, a commit a hívóé (idea, close.mjs, discard.mjs, review-skill).
import { run, parseArgs, WorkflowError } from './lib.mjs';
import { computeStates, setDontes, setFeldolgozas, legacyRefs, reportPath, parseReport, suggestSlug, REVIEW_REF } from './reviewsLib.mjs';

const HELP = `node scripts/workflow/reviews.mjs [--all] [--json] [--check] [--derive-legacy]
node scripts/workflow/reviews.mjs dontes review:<basename>#<id> "<szöveg>"
node scripts/workflow/reviews.mjs feldolgozas <basename> "felülírta review:<basename>"
  lista:     jelentésenként nyitott küszöb feletti (Blokkoló/Súlyos/ISMÉT/ismeretlen) és nyitott
             Közepes/Kis pont; alatta a nyitott küszöb feletti pontok kész /idea sorral; végén a
             figyelmeztetések. --all: a nyitott Közepes/Kis pontok is listázva.
  --json:    minden megállapítás állapottal (a review-skillek dedup-bemenete).
  --check:   figyelmeztetésnél exit 1 (ellentmondás, feloldhatatlan review: hivatkozás, nyitott
             küszöb feletti pont archive/ alatt, rossz Feldolgozás sor).
  --derive-legacy: a régi, szabad szövegű Source: sorok heurisztikus párosítása -- javaslat,
             nem ír. Az egyszeri rendezéshez.
  dontes:    a megállapítás Döntés sorát írja (egy sor, újraírás felülírja). Értékek:
             backlog <slug> | javítva <slug|commit>[, ellenőrizte review:<id>] | elvetve: <indok>
             | duplikátum → review:<id> | tudomásul véve. Dátumot a hívó tegyen a végére.
  feldolgozas: a jelentés fejlécének Feldolgozás: sorát írja.`;

const pad = (s, n) => String(s).padEnd(n);

function list({ all }) {
  const { reports, findings, warnings } = computeStates();
  const w = Math.max(10, ...reports.map((r) => r.basename.length));
  console.log(`${pad('jelentés', w)}  nyitott B/S/ISMÉT  nyitott K/Kis  összes  állapot`);
  for (const r of reports) {
    const st = r.processed ? (r.archived ? 'feldolgozott, archív' : 'feldolgozott') : 'TEENDŐ';
    const fel = r.feldolgozas ? ` (${r.feldolgozas})` : '';
    console.log(`${pad(r.basename, w)}  ${pad(r.openThreshold, 17)}  ${pad(r.openMinor, 13)}  ${pad(r.total, 6)}  ${st}${fel}`);
  }
  const open = findings.filter((f) => f.state === 'nyitott' && (all || f.threshold));
  if (open.length) {
    console.log(`\nnyitott pontok (${open.length}):`);
    for (const f of open) {
      const tag = `${f.severity ?? 'ismeretlen súlyosság'}${f.ismet ? ', ISMÉT' : ''}`;
      console.log(`  review:${f.id}  [${tag}]  ${f.title}`);
      console.log(`    /idea ${suggestSlug(f.title) || 'slug'} review:${f.id}`);
    }
  } else {
    console.log('\nnincs nyitott küszöb feletti pont');
  }
  const teendo = reports.filter((r) => !r.processed).length;
  console.log(`\n${reports.length} jelentés, ${findings.length} megállapítás, ${teendo} jelentés teendővel`);
  if (warnings.length) {
    console.log(`\nfigyelmeztetések (${warnings.length}):`);
    for (const x of warnings) console.log(`  ! ${x}`);
  }
  return warnings.length;
}

function deriveLegacy() {
  const { legacy } = computeStates();
  let n = 0;
  for (const l of legacy) {
    for (const id of legacyRefs(l.source)) {
      const [basename, localId] = id.split('#');
      const rel = reportPath(basename);
      const f = rel && parseReport(rel).findings.find((x) => x.localId === localId);
      if (!f) {
        console.log(`# nincs találat: ${l.slug} → ${id}  (${l.source})`);
        continue;
      }
      const text = l.state === 'backlog' ? `backlog ${l.slug}` : `${l.state} ${l.slug}`;
      if (f.dontes) {
        console.log(`# már van Döntés (${f.dontes.raw}): ${l.slug} → review:${id}`);
        continue;
      }
      console.log(`node scripts/workflow/reviews.mjs dontes review:${id} "${text}"   # ${l.commit ? `${l.commit} ${l.subject}` : l.source}`);
      n++;
    }
  }
  console.log(`\n# ${n} javasolt Döntés sor, ${legacy.length} szabad szövegű Source sor`);
}

run(() => {
  const a = parseArgs(process.argv.slice(2), { flags: ['all', 'json', 'check', 'derive-legacy'] });
  if (a.help) return console.log(HELP);
  const [cmd, target, text] = a._;
  if (cmd === 'dontes') {
    const m = new RegExp(`^(?:review:)?${REVIEW_REF.source.replace(/^review:/, '')}$`).exec(target ?? '');
    if (!m) throw new WorkflowError('dontes review:<basename>#<id> "<szöveg>"');
    if (!text) throw new WorkflowError('hiányzik a Döntés szövege');
    const rel = setDontes(m[1], m[2], text);
    return console.log(`${rel}: ${m[2]} → Döntés: ${text}`);
  }
  if (cmd === 'feldolgozas') {
    if (!target || !text) throw new WorkflowError('feldolgozas <basename> "<szöveg>"');
    const rel = setFeldolgozas(target.replace(/^review:/, '').replace(/\.md$/, ''), text);
    return console.log(`${rel}: Feldolgozás: ${text}`);
  }
  if (cmd) throw new WorkflowError(`ismeretlen parancs: ${cmd}\n${HELP}`);
  if (a['derive-legacy']) return deriveLegacy();
  if (a.json) {
    const { reports, findings, warnings } = computeStates();
    return console.log(JSON.stringify({ reports, findings, warnings }, null, 1));
  }
  const n = list({ all: a.all });
  if (a.check && n) throw new WorkflowError(`${n} figyelmeztetés -- lásd fent`);
});
