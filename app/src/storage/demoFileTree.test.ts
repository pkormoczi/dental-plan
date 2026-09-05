import { describe, expect, it } from 'vitest';
import { buildDemoFileTree, PDF_DISPLAY_NAME, type DemoNode } from './demoFileTree';

const PREFIX = 'dp:';

const SAMPLE_KEYS = [
  `${PREFIX}arlista.json`,
  `${PREFIX}beallitasok.json`,
  `${PREFIX}sablonok/nyilatkozat-hu-v1.md`,
  `${PREFIX}sablonok/garancia-hu-v1.md`,
  `${PREFIX}paciensek/Kovacs-Janos_k9m2r4/paciens.json`,
  `${PREFIX}paciensek/Kovacs-Janos_k9m2r4/Fogpotlas_a3f9c1/terv-cimke.json`,
  `${PREFIX}paciensek/Kovacs-Janos_k9m2r4/Fogpotlas_a3f9c1/2026-08-05_v1/terv.json`,
  `${PREFIX}paciensek/Kovacs-Janos_k9m2r4/Fogpotlas_a3f9c1/2026-08-05_v1/pdf`,
  `${PREFIX}paciensek/Kovacs-Janos_k9m2r4/Fogpotlas_a3f9c1/2026-08-19_v2/terv.json`,
  `${PREFIX}paciensek/Kovacs-Janos_k9m2r4/Fogpotlas_a3f9c1/2026-08-19_v2/pdf`,
];

/** Az összes node name/path/storageKey mezőjét belapítja, mélységi bejárással. */
function flatten(nodes: DemoNode[]): DemoNode[] {
  return nodes.flatMap((n) => (n.type === 'dir' ? [n, ...flatten(n.children)] : [n]));
}

describe('buildDemoFileTree', () => {
  it('returns an empty tree for an empty key list', () => {
    expect(buildDemoFileTree([], PREFIX)).toEqual([]);
  });

  it('builds the expected nested shape from a representative key set', () => {
    const tree = buildDemoFileTree(SAMPLE_KEYS, PREFIX);

    // gyökér: fájlok előbb, aztán mappák -- lásd a rendezési teszteket lent
    expect(tree.map((n) => n.name)).toEqual(['arlista.json', 'beallitasok.json', 'paciensek', 'sablonok']);

    const paciensek = tree.find((n) => n.name === 'paciensek');
    expect(paciensek?.type).toBe('dir');
    if (paciensek?.type !== 'dir') throw new Error('unreachable');
    expect(paciensek.children.map((n) => n.name)).toEqual(['Kovacs-Janos_k9m2r4']);

    const patient = paciensek.children[0];
    if (patient.type !== 'dir') throw new Error('unreachable');
    expect(patient.path).toBe('paciensek/Kovacs-Janos_k9m2r4');
    expect(patient.children.map((n) => n.name)).toEqual(['paciens.json', 'Fogpotlas_a3f9c1']);

    const plan = patient.children.find((n) => n.name === 'Fogpotlas_a3f9c1');
    if (plan?.type !== 'dir') throw new Error('unreachable');
    expect(plan.children.map((n) => n.name)).toEqual([
      'terv-cimke.json',
      '2026-08-05_v1',
      '2026-08-19_v2',
    ]);

    const v1 = plan.children.find((n) => n.name === '2026-08-05_v1');
    if (v1?.type !== 'dir') throw new Error('unreachable');
    // Mindkettő fájl -- a rendezés ábécésorrendbe esik ('k' < 't'), nem a docs/02 diagram sorrendjébe.
    expect(v1.children.map((n) => n.name)).toEqual([PDF_DISPLAY_NAME, 'terv.json']);
  });

  it('never surfaces dp:piszkozat or dp:sablon-piszkozat', () => {
    const keys = [...SAMPLE_KEYS, `${PREFIX}piszkozat`, `${PREFIX}sablon-piszkozat`];
    const flat = flatten(buildDemoFileTree(keys, PREFIX));

    expect(flat.some((n) => n.name === 'piszkozat')).toBe(false);
    expect(flat.some((n) => n.name === 'sablon-piszkozat')).toBe(false);
    expect(flat.some((n) => n.path.includes('piszkozat'))).toBe(false);
    expect(flat.some((n) => n.type === 'file' && n.storageKey.includes('piszkozat'))).toBe(false);
  });

  it('drops unrecognised key shapes silently', () => {
    const keys = [
      ...SAMPLE_KEYS,
      `${PREFIX}valami`,
      `${PREFIX}paciensek/x/rejtelyes.txt`,
      // Páciens-entitás előtti legacy 2-szintű alak (patientDir/versionDir/terv.json)
      `${PREFIX}paciensek/Legacy-Pati_zzzzzz/2026-01-01_v1/terv.json`,
      'nincs-dp-prefix.json',
    ];
    const flat = flatten(buildDemoFileTree(keys, PREFIX));

    expect(flat.some((n) => n.name === 'valami')).toBe(false);
    expect(flat.some((n) => n.name === 'rejtelyes.txt')).toBe(false);
    expect(flat.some((n) => n.name === 'Legacy-Pati_zzzzzz')).toBe(false);
    expect(flat.some((n) => n.name === 'nincs-dp-prefix.json')).toBe(false);
  });

  // backlog-28: a paciens-adatok.json a paciens.json mellett, a
  // páciens-mappa gyökerén él -- mindkettőnek látszania kell, egy terv-
  // mappával azonos mélységű, de attól eltérő nevű hasonló alak (pl. egy
  // páciens-mappa alatti, terv-cimke.json-hoz hasonló mélységű, de rossz
  // fájlnevű kulcs) viszont ne csússzon be tévedésből.
  it('surfaces paciens-adatok.json alongside paciens.json, at the same depth', () => {
    const keys = [
      ...SAMPLE_KEYS,
      `${PREFIX}paciensek/Kovacs-Janos_k9m2r4/paciens-adatok.json`,
    ];
    const tree = buildDemoFileTree(keys, PREFIX);
    const paciensek = tree.find((n) => n.name === 'paciensek');
    if (paciensek?.type !== 'dir') throw new Error('unreachable');
    const patient = paciensek.children[0];
    if (patient.type !== 'dir') throw new Error('unreachable');

    expect(patient.children.map((n) => n.name).sort()).toEqual([
      'Fogpotlas_a3f9c1',
      'paciens-adatok.json',
      'paciens.json',
    ]);
  });

  it('drops a mistyped root file at the wrong depth (rest.length mismatch)', () => {
    const keys = [`${PREFIX}paciensek/Kovacs-Janos_k9m2r4/almappa/paciens-adatok.json`];
    const flat = flatten(buildDemoFileTree(keys, PREFIX));
    expect(flat.some((n) => n.name === 'paciens-adatok.json')).toBe(false);
  });

  it('maps the pdf key segment to the display filename while keeping the raw storage key and a PlanRef', () => {
    const tree = buildDemoFileTree(SAMPLE_KEYS, PREFIX);
    const pdfNode = flatten(tree).find(
      (n): n is Extract<DemoNode, { format: 'pdf' }> => n.type === 'file' && n.format === 'pdf',
    );

    expect(pdfNode).toBeDefined();
    expect(pdfNode?.name).toBe(PDF_DISPLAY_NAME);
    expect(pdfNode?.storageKey).toBe(
      `${PREFIX}paciensek/Kovacs-Janos_k9m2r4/Fogpotlas_a3f9c1/2026-08-05_v1/pdf`,
    );
    expect(pdfNode?.ref).toEqual({
      patientDir: 'Kovacs-Janos_k9m2r4',
      planDir: 'Fogpotlas_a3f9c1',
      versionDir: '2026-08-05_v1',
    });
  });

  it('produces a deterministic order regardless of input key order', () => {
    const shuffled = [...SAMPLE_KEYS].reverse();
    expect(buildDemoFileTree(shuffled, PREFIX)).toEqual(buildDemoFileTree(SAMPLE_KEYS, PREFIX));
  });

  it('sorts version directories naturally, not lexicographically (…_v2 before …_v10)', () => {
    const keys = [
      `${PREFIX}paciensek/P_aaaaaa/Terv_bbbbbb/2026-01-01_v10/terv.json`,
      `${PREFIX}paciensek/P_aaaaaa/Terv_bbbbbb/2026-01-01_v2/terv.json`,
    ];
    const tree = buildDemoFileTree(keys, PREFIX);
    const paciensek = tree[0] as Extract<DemoNode, { type: 'dir' }>; // 'paciensek'
    const patient = paciensek.children[0] as Extract<DemoNode, { type: 'dir' }>; // 'P_aaaaaa'
    const plan = patient.children[0] as Extract<DemoNode, { type: 'dir' }>; // 'Terv_bbbbbb'
    expect(plan.children.map((n) => n.name)).toEqual(['2026-01-01_v2', '2026-01-01_v10']);
  });
});
