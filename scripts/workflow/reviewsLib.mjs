// A review-jelentések megállapítás-állapotának EGY forrása: a jelentés `Döntés:` sora, a
// backlog élő tételeinek `Source: review:…` sora és a törölt tételek git-historyja. Nincs külön
// index: minden nézet (reviews.mjs lista, --json, --check) innen számolódik. A megállapítás
// azonosítója mappa-független (`review:<basename>#<id>`), hogy az archive/ alá mozgatás egy
// git mv legyen, hivatkozás-javítás nélkül.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, WorkflowError, git } from './lib.mjs';
import { listItems } from './backlogPath.mjs';

export const REVIEWS_DIR = 'docs/reviews';
export const ARCHIVE_DIR = 'docs/reviews/archive';

// `### 3. cím` (doctor-review, manual-checks), `### ARCH-001 — cím` (arch-react), `### K1 — cím`
// (browser-validation). A docs-check ugyanezt importálja a review: anchor feloldásához.
export const FINDING_HEADING = /^###\s+([A-Z]+-\d+|[A-Z]\d+|\d+)[.:]?(?:\s+[—–-])?\s*(.*?)\s*$/;
export const REVIEW_REF = /review:([A-Za-z0-9._-]+)#([A-Za-z0-9-]+)/g;

export const SEVERITIES = ['Blokkoló', 'Súlyos', 'Közepes', 'Kis'];
// A három review-típus saját skálája egy közös négyfokúra; ismeretlen szó → null (küszöb felett
// marad, hogy döntést kényszerítsen, ne csendben tűnjön el).
const SEVERITY_ALIAS = {
  blokkoló: 'Blokkoló', kritikus: 'Blokkoló', critical: 'Blokkoló',
  súlyos: 'Súlyos', magas: 'Súlyos', major: 'Súlyos', high: 'Súlyos',
  közepes: 'Közepes', minor: 'Közepes', medium: 'Közepes',
  kis: 'Kis', apró: 'Kis', alacsony: 'Kis', low: 'Kis', observation: 'Kis', nit: 'Kis', info: 'Kis', trivial: 'Kis',
  'n/a': 'Kis',
};

export const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function normalizeSeverity(text) {
  if (!text) return null;
  const word = text.replace(/\*/g, '').trim().split(/[\s(—–:-]/)[0].toLowerCase();
  return SEVERITY_ALIAS[word] ?? null;
}

export function refsIn(text) {
  return [...(text ?? '').matchAll(REVIEW_REF)].map((m) => `${m[1]}#${m[2]}`);
}

export function listReports() {
  const out = [];
  for (const dir of [REVIEWS_DIR, ARCHIVE_DIR]) {
    const abs = path.join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (!f.endsWith('.md')) continue;
      out.push({ basename: f.slice(0, -3), path: `${dir}/${f}`, archived: dir === ARCHIVE_DIR });
    }
  }
  return out.sort((a, b) => a.basename.localeCompare(b.basename));
}

export function reportPath(basename) {
  return listReports().find((r) => r.basename === basename)?.path ?? null;
}

export function parseDontes(raw) {
  let m;
  if ((m = /^backlog\s+([a-z0-9-]+)/.exec(raw))) return { kind: 'backlog', slug: m[1] };
  if ((m = /^javítva\b\s*(.*)$/.exec(raw))) return { kind: 'javítva', evidence: m[1] };
  if ((m = /^elvetve\b[:\s]*(.*)$/.exec(raw))) return { kind: 'elvetve', reason: m[1] };
  if ((m = /^duplikátum\s*(?:→|->)?\s*review:([A-Za-z0-9._-]+#[A-Za-z0-9-]+)/.exec(raw))) return { kind: 'duplikátum', target: m[1] };
  if (/^tudomásul véve/.test(raw)) return { kind: 'tudomásul véve' };
  return { kind: 'ismeretlen', raw };
}

// `- Súlyosság: **X**` és `- **Súlyosság:** X` (a régi jelentések félkövér címkéje) egyaránt mező.
const fieldRe = (name) => new RegExp(`^\\s*-?\\s*\\*{0,2}(?:${name})\\*{0,2}:?\\*{0,2}:?\\s*(.+)$`);

export function parseReport(rel) {
  const lines = readFileSync(path.join(ROOT, rel), 'utf-8').split('\n');
  const basename = path.posix.basename(rel, '.md');
  const headLines = lines.slice(0, 25);
  const felIdx = headLines.findIndex((l) => /^Feldolgozás:/.test(l));
  const feldolgozas = felIdx >= 0 ? headLines[felIdx].replace(/^Feldolgozás:\s*/, '').trim() : null;
  const findings = [];
  let section = null;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) section = lines[i].replace(/^##\s+/, '');
    const m = FINDING_HEADING.exec(lines[i]);
    if (!m) continue;
    let end = i + 1;
    while (end < lines.length && !/^#{1,3}\s/.test(lines[end])) end++;
    const body = lines.slice(i + 1, end);
    const field = (name) => {
      const re = fieldRe(name);
      for (const l of body) {
        const f = re.exec(l);
        if (f) return f;
      }
      return null;
    };
    const sev = field('Súlyosság|Severity');
    // Az arch-react saját Status sora: RESOLVED/FIXED = a review maga igazolta a javítást.
    const status = field('Status')?.[1].replace(/\*/g, '').trim() ?? null;
    const dontesIdx = body.findIndex((l) => fieldRe('Döntés').test(l));
    // A Döntés sor helye: a heading utáni első tartalmi blokk vége (bullet-lista vagy mezősorok).
    let j = i + 1;
    while (j < end && lines[j].trim() === '') j++;
    while (j < end && lines[j].trim() !== '') j++;
    const files = [...new Set(body.join('\n').match(/\b(?:app\/src|scripts|docs)\/[\w./-]+/g) ?? [])];
    findings.push({
      basename,
      localId: m[1],
      id: `${basename}#${m[1]}`,
      title: m[2],
      line: i,
      insertAt: j,
      severity: normalizeSeverity(sev?.[1]) ?? normalizeSeverity(section),
      ismet: body.some((l) => /Dedup:.*ISMÉT/.test(l)) || /CARRIED|STILL/i.test(status ?? ''),
      resolvedByReport: /RESOLVED|FIXED/i.test(status ?? ''),
      folyamat: field('Érintett folyamat')?.[1] ?? null,
      files,
      dontes: dontesIdx >= 0
        ? { line: i + 1 + dontesIdx, raw: fieldRe('Döntés').exec(body[dontesIdx])[1].trim() }
        : null,
    });
    i = end - 1;
  }
  return { basename, path: rel, archived: rel.startsWith(`${ARCHIVE_DIR}/`), feldolgozas, lines, findings };
}

function requireFinding(basename, localId) {
  const rel = reportPath(basename);
  if (!rel) throw new WorkflowError(`nincs ${basename}.md a ${REVIEWS_DIR}/ vagy ${ARCHIVE_DIR}/ alatt`);
  const rep = parseReport(rel);
  const f = rep.findings.find((x) => x.localId === localId);
  if (!f) throw new WorkflowError(`nincs "${localId}" megállapítás a ${rel} jelentésben (### <id>. cím heading kell)`);
  return { rep, f };
}

// Idempotens: egy megállapításhoz egy Döntés sor, az újraírás felülírja. Csak fájlt ír, a
// commit a hívóé (idea/close/discard/review-skill).
export function setDontes(basename, localId, text) {
  const { rep, f } = requireFinding(basename, localId);
  const line = `- Döntés: ${text}`;
  if (f.dontes) rep.lines[f.dontes.line] = line;
  else rep.lines.splice(f.insertAt, 0, line);
  writeFileSync(path.join(ROOT, rep.path), rep.lines.join('\n'));
  return rep.path;
}

// A fejléc fenced blokkjának végére (vagy a cím után), egyszer.
export function setFeldolgozas(basename, text) {
  const rel = reportPath(basename);
  if (!rel) throw new WorkflowError(`nincs ${basename}.md a ${REVIEWS_DIR}/ vagy ${ARCHIVE_DIR}/ alatt`);
  const rep = parseReport(rel);
  const line = `Feldolgozás: ${text}`;
  const existing = rep.lines.slice(0, 25).findIndex((l) => /^Feldolgozás:/.test(l));
  if (existing >= 0) {
    rep.lines[existing] = line;
  } else {
    const open = rep.lines.findIndex((l, i) => i > 0 && i < 25 && /^```/.test(l));
    const close = open >= 0 ? rep.lines.findIndex((l, i) => i > open && /^```/.test(l)) : -1;
    if (close > 0) rep.lines.splice(close, 0, line);
    else rep.lines.splice(1, 0, '', line);
  }
  writeFileSync(path.join(ROOT, rep.path), rep.lines.join('\n'));
  return rep.path;
}

// Élő tételek: Source: review:<id> → backlog <slug>. Történet: a törölt tételfájl Source sora +
// a törlő commit tárgya -- "<slug>: …" a close.mjs lezárása (javítva), "backlog: -<slug>" a
// discard.mjs elvetése; más tárgy is elvetésnek számít, de jelezve (nincs konvenció).
export function derivedStates() {
  const items = listItems();
  const live = new Map();
  const legacy = [];
  for (const it of items) {
    const src = /^Source:\s*(.+)$/m.exec(readFileSync(path.join(ROOT, it.path), 'utf-8'));
    if (!src) continue;
    const refs = refsIn(src[1]);
    if (!refs.length) legacy.push({ slug: it.slug, source: src[1], state: 'backlog' });
    for (const id of refs) live.set(id, { state: 'backlog', slug: it.slug, evidence: it.path });
  }
  const liveSlugs = new Set(items.map((i) => i.slug));
  const hist = new Map();
  const log = git(['log', '-p', '--diff-filter=D', '--format=%x00%H%x09%s', '--', 'backlog'], { allowFail: true }).out;
  let sha = null;
  let subject = '';
  let file = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('\0')) {
      [sha, subject] = line.slice(1).split('\t');
      continue;
    }
    const d = /^diff --git a\/(\S+) b\//.exec(line);
    if (d) {
      file = d[1];
      continue;
    }
    const s = /^-Source:\s*(.+)$/.exec(line);
    if (!s || !file) continue;
    const slug = path.posix.basename(file, '.md');
    if (liveSlugs.has(slug)) continue;
    const closed = subject.startsWith(`${slug}: `);
    const state = closed ? 'javítva' : 'elvetve';
    const konvencio = closed || subject === `backlog: -${slug}`;
    const refs = refsIn(s[1]);
    if (!refs.length) legacy.push({ slug, source: s[1], state, commit: sha.slice(0, 7), subject });
    for (const id of refs) {
      if (!hist.has(id)) hist.set(id, { state, slug, evidence: `${sha.slice(0, 7)} "${subject}"`, konvencio });
    }
  }
  return { live, hist, legacy };
}

export const aboveThreshold = (f) => f.ismet || f.severity === null || f.severity === 'Blokkoló' || f.severity === 'Súlyos';

// Levezetési sorrend: élő tétel > Döntés sor > történet > implicit (Közepes/Kis) > nyitott.
// Ellentmondás nem dönt, csak figyelmeztet.
export function computeStates() {
  const { live, hist, legacy } = derivedStates();
  const warnings = [];
  const reports = listReports().map((r) => parseReport(r.path));
  const known = new Set(reports.flatMap((r) => r.findings.map((f) => f.id)));
  const findings = [];
  for (const rep of reports) {
    for (const f of rep.findings) {
      const d = f.dontes ? parseDontes(f.dontes.raw) : null;
      const l = live.get(f.id);
      const h = hist.get(f.id);
      let state;
      let evidence = null;
      let implicit = false;
      if (l) {
        state = 'backlog';
        evidence = l.slug;
        if (d && d.kind !== 'backlog') warnings.push(`${f.id}: élő tétel (${l.slug}) mellett "Döntés: ${f.dontes.raw}"`);
      } else if (d) {
        state = d.kind;
        evidence = d.slug ?? d.evidence ?? d.reason ?? d.target ?? d.raw ?? null;
        if (d.kind === 'ismeretlen') warnings.push(`${f.id}: értelmezhetetlen Döntés sor: "${d.raw}"`);
        if (d.kind === 'backlog' && !h) warnings.push(`${f.id}: "Döntés: backlog ${d.slug}", de nincs ilyen élő tétel és a történetben sem zárult`);
        if (d.kind === 'duplikátum' && !known.has(d.target)) warnings.push(`${f.id}: duplikátum-cél nem létezik: review:${d.target}`);
        if (h && h.state !== d.kind && !(d.kind === 'backlog' && h.state === 'javítva')) {
          warnings.push(`${f.id}: a történet szerint ${h.state} (${h.evidence}), a Döntés sor szerint ${d.kind}`);
        }
        if (d.kind === 'backlog' && h?.state === 'javítva') {
          state = 'javítva';
          evidence = h.slug;
        }
      } else if (h) {
        state = h.state;
        evidence = h.slug;
        if (!h.konvencio) warnings.push(`${f.id}: a(z) ${h.slug} tétel törölve konvenció nélkül (${h.evidence}) -- elvetésnek számít`);
      } else if (f.resolvedByReport) {
        state = 'javítva';
        evidence = 'a jelentés Status sora';
        implicit = true;
      } else if (!aboveThreshold(f)) {
        state = 'tudomásul véve';
        implicit = true;
      } else {
        state = 'nyitott';
      }
      for (const ref of refsIn(f.dontes?.raw)) {
        if (!known.has(ref)) warnings.push(`${f.id}: feloldhatatlan hivatkozás review:${ref}`);
      }
      findings.push({ ...f, lines: undefined, dontes: f.dontes?.raw ?? null, state, evidence, implicit, threshold: aboveThreshold(f), archived: rep.archived });
    }
    if (rep.feldolgozas) {
      const m = /^felülírta\s+review:([A-Za-z0-9._-]+)/.exec(rep.feldolgozas);
      if (!m) warnings.push(`${rep.basename}: értelmezhetetlen Feldolgozás sor: "${rep.feldolgozas}"`);
      else if (!reportPath(m[1])) warnings.push(`${rep.basename}: Feldolgozás: felülírta review:${m[1]} -- nincs ilyen jelentés`);
    }
  }
  // Duplikátum-lánc: a vége nem lehet duplikátum (kör vagy zsákutca).
  const byId = new Map(findings.map((f) => [f.id, f]));
  for (const f of findings.filter((x) => x.state === 'duplikátum')) {
    const seen = new Set([f.id]);
    let cur = byId.get(f.evidence);
    while (cur && cur.state === 'duplikátum' && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.evidence);
    }
    if (!cur || cur.state === 'duplikátum') warnings.push(`${f.id}: a duplikátum-lánc vége nem eldöntött pont (kör vagy hiányzó cél)`);
  }
  const summary = reports.map((rep) => {
    const fs = findings.filter((f) => f.basename === rep.basename);
    const open = fs.filter((f) => f.state === 'nyitott');
    const openThreshold = open.filter((f) => f.threshold).length;
    const processed = openThreshold === 0 || /^felülírta\s+review:/.test(rep.feldolgozas ?? '');
    if (rep.archived && !processed) warnings.push(`${rep.basename}: archive/ alatt, de ${openThreshold} nyitott küszöb feletti pont`);
    return {
      basename: rep.basename,
      path: rep.path,
      archived: rep.archived,
      feldolgozas: rep.feldolgozas,
      total: fs.length,
      openThreshold,
      openMinor: open.length - openThreshold,
      processed,
    };
  });
  return { reports: summary, findings, warnings, legacy };
}

// A régi, szabad szövegű Source: sorok ("doctor-review papirrol (2026-09-05), 9. megállapítás")
// heurisztikus párosítása -- csak az egyszeri rendezéshez, javaslatként, az ember hagyja jóvá.
export function legacyRefs(text) {
  const out = [];
  let type = null;
  for (const part of text.split(';')) {
    const re = /(?:(doctor-review|manual-checks|arch-react-review)\s+)?([a-z][a-z0-9-]*)(?:\s+szelet)?\s*\((\d{4}-\d{2}-\d{2})\)\D*?(\d+)\./g;
    let m;
    while ((m = re.exec(part))) {
      type = m[1] ?? type;
      if (!type) continue;
      out.push(`${m[3]}-${type}-${m[2]}#${m[4]}`);
    }
  }
  return out;
}

export function suggestSlug(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 1)
    .slice(0, 5)
    .join('-')
    .slice(0, 48)
    .replace(/-+$/, '');
}
