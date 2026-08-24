import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoDraftStorage } from './DemoDraftStorage';
import { DemoStorage } from './DemoStorage';
import type { Plan } from '../domain/types';

function makeBlankPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Teszt Elek',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
}

describe('DemoDraftStorage', () => {
  let drafts: DemoDraftStorage;

  beforeEach(() => {
    localStorage.clear();
    drafts = new DemoDraftStorage();
  });

  it('load() returns null when there is no persisted draft (normal starting state)', async () => {
    await expect(drafts.load()).resolves.toBeNull();
  });

  it('roundtrips a saved plan, stamping a "mentve" timestamp', async () => {
    const plan = makeBlankPlan();
    const rec = await drafts.save(plan);
    expect(rec.mentve).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const loaded = await drafts.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.plan).toEqual(plan);
    expect(loaded!.mentve).toBe(rec.mentve);
  });

  it('clear() removes the key so a later load() is null again', async () => {
    await drafts.save(makeBlankPlan());
    await drafts.clear();
    await expect(drafts.load()).resolves.toBeNull();
  });

  it('uses the dp: prefix so DemoStorage.clearAll() sweeps the draft away too (2. döntés)', async () => {
    await drafts.save(makeBlankPlan());
    expect(localStorage.getItem('dp:piszkozat')).not.toBeNull();

    const storage = new DemoStorage();
    storage.clearAll();

    await expect(drafts.load()).resolves.toBeNull();
  });

  it('surfaces a Hungarian, non-crashing error for corrupted (non-JSON) draft data', async () => {
    localStorage.setItem('dp:piszkozat', '{ not valid json');
    await expect(drafts.load()).rejects.toThrow(/nem érvényes JSON/);
  });

  it('rejects loading a draft with a newer-than-known schemaVersion on the record (D18)', async () => {
    await drafts.save(makeBlankPlan());
    const raw = JSON.parse(localStorage.getItem('dp:piszkozat')!);
    raw.schemaVersion = 2;
    localStorage.setItem('dp:piszkozat', JSON.stringify(raw));
    await expect(drafts.load()).rejects.toThrow(/újabb verziójával/);
  });

  it('rejects loading a draft whose embedded Plan has a newer-than-known schemaVersion (D18)', async () => {
    await drafts.save(makeBlankPlan());
    const raw = JSON.parse(localStorage.getItem('dp:piszkozat')!);
    raw.plan.schemaVersion = 2;
    localStorage.setItem('dp:piszkozat', JSON.stringify(raw));
    await expect(drafts.load()).rejects.toThrow(/újabb verziójával/);
  });

  it('rejects a structurally invalid (but syntactically valid) embedded Plan', async () => {
    await drafts.save(makeBlankPlan());
    const raw = JSON.parse(localStorage.getItem('dp:piszkozat')!);
    raw.plan.fazisok = [{ sorszam: 1, megnevezes: 'x', megjegyzes: '', sorok: [{ mennyiseg: 'sok' }] }];
    localStorage.setItem('dp:piszkozat', JSON.stringify(raw));
    await expect(drafts.load()).rejects.toThrow(/szerkezete nem érvényes/);
  });

  it('surfaces a Hungarian, non-crashing error when the write quota is exceeded', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    await expect(drafts.save(makeBlankPlan())).rejects.toThrow(/nem sikerült automatikusan elmenteni/);
    vi.restoreAllMocks();
  });

  // D37: patientDir/lastRoute -- UI-workflow metaadat, nem a Plan tartalma.
  describe('meta (patientDir/lastRoute, D37)', () => {
    it('roundtrips patientDir and lastRoute when save() is called with meta', async () => {
      const rec = await drafts.save(makeBlankPlan(), {
        patientDir: 'Teszt-Elek_abc123',
        lastRoute: '/elonezet',
      });
      expect(rec.patientDir).toBe('Teszt-Elek_abc123');
      expect(rec.lastRoute).toBe('/elonezet');

      const loaded = await drafts.load();
      expect(loaded!.patientDir).toBe('Teszt-Elek_abc123');
      expect(loaded!.lastRoute).toBe('/elonezet');
    });

    it('a régi (funkció előtti) rekordnál mindkét mező hiányzik, a load() nem dob', async () => {
      await drafts.save(makeBlankPlan());
      const raw = JSON.parse(localStorage.getItem('dp:piszkozat')!);
      expect(raw.patientDir).toBeUndefined();
      expect(raw.lastRoute).toBeUndefined();

      const loaded = await drafts.load();
      expect(loaded!.patientDir).toBeUndefined();
      expect(loaded!.lastRoute).toBeUndefined();
    });

    it('egy szemetes lastRoute némán elmarad, a plan és a mentve időbélyeg érintetlen marad', async () => {
      await drafts.save(makeBlankPlan());
      const raw = JSON.parse(localStorage.getItem('dp:piszkozat')!);
      raw.lastRoute = '/nincs-ilyen-route';
      raw.patientDir = 42; // szemetes típus is
      localStorage.setItem('dp:piszkozat', JSON.stringify(raw));

      const loaded = await drafts.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.lastRoute).toBeUndefined();
      expect(loaded!.patientDir).toBeUndefined();
      expect(loaded!.plan).toEqual(makeBlankPlan());
    });
  });

  // backlog-51 (D61): a "Terv adatai" cím mező beírt értéke -- ugyanaz a
  // puha, UI-workflow metaadat mintázat, mint a patientDir/lastRoute.
  describe('meta (tervCim, D61)', () => {
    it('roundtrips a non-empty tervCim', async () => {
      const rec = await drafts.save(makeBlankPlan(), { tervCim: 'Fogpótlás felső ívben' });
      expect(rec.tervCim).toBe('Fogpótlás felső ívben');

      const loaded = await drafts.load();
      expect(loaded!.tervCim).toBe('Fogpótlás felső ívben');
    });

    it('an empty string is a real value, not dropped (the doki cleared the field)', async () => {
      const rec = await drafts.save(makeBlankPlan(), { tervCim: '' });
      expect(rec.tervCim).toBe('');

      const loaded = await drafts.load();
      expect(loaded!.tervCim).toBe('');
    });

    it('missing tervCim (never touched) stays undefined, not coerced to empty string', async () => {
      const rec = await drafts.save(makeBlankPlan());
      expect(rec.tervCim).toBeUndefined();

      const loaded = await drafts.load();
      expect(loaded!.tervCim).toBeUndefined();
    });

    it('a garbage-typed tervCim silently drops, the rest of the draft still loads', async () => {
      await drafts.save(makeBlankPlan());
      const raw = JSON.parse(localStorage.getItem('dp:piszkozat')!);
      raw.tervCim = 42;
      localStorage.setItem('dp:piszkozat', JSON.stringify(raw));

      const loaded = await drafts.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.tervCim).toBeUndefined();
      expect(loaded!.plan).toEqual(makeBlankPlan());
    });
  });
});
