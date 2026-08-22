import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  countMarkers,
  findMarkerGrowth,
  readDecisionTableState,
  REPO_ROOT,
  type MarkerCounts,
} from './dokumentacioGuard';

// Ez a két teszt a D-szám-termelés leállításának gépi őre. A háttér:
// `CLAUDE.md` "Komment-szabályzat" + "Backlog-tétel lezárása" mostantól
// kimondja, hogy a `docs/01` döntéstáblája lezárt, és sem új D-szám nem
// születhet, sem meglévő D-szám nem kerülhet új helyre. E nélkül a két
// teszt nélkül ez csak utasítás maradna, amit egy jövőbeli session
// észrevétlenül visszaépíthetne.

interface Baseline {
  decisionTable: { rowCount: number; maxNumber: number };
  markerCounts: MarkerCounts;
}

function readBaseline(): Baseline {
  const filePath = path.join(REPO_ROOT, 'app', 'src', 'dokumentacioGuard.baseline.json');
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Baseline;
}

describe('dokumentacioGuard', () => {
  it('a docs/01 D-táblája nem bővül — a "pénzverde" zárva marad', () => {
    const baseline = readBaseline();
    const current = readDecisionTableState();

    expect(
      current.rowCount,
      'A docs/01-attekintes-es-dontesek.md D-táblája lezárt, történeti napló ' +
        '(lásd a tábla feletti megjegyzést). Új döntést PRÓZAKÉNT vezess át a ' +
        'megfelelő docs/02–07 szakaszba, szükség esetén a CLAUDE.md ' +
        '"Sérthetetlen szabályok" táblájába — ne a D-táblába.',
    ).toBe(baseline.decisionTable.rowCount);

    expect(current.maxNumber).toBe(baseline.decisionTable.maxNumber);
  });

  it('meglévő D-szám nem kerül új helyre — a referenciák száma fájlonként nem nőhet', () => {
    const baseline = readBaseline();
    const current = countMarkers();
    const growth = findMarkerGrowth(baseline.markerCounts, current);

    if (growth.length > 0) {
      const details = growth
        .map(
          (g) =>
            `  ${g.relativePath}: ${g.baselineCount} -> ${g.currentCount}`,
        )
        .join('\n');

      expect(
        growth,
        `Az alábbi fájl(ok)ban nőtt a D<szám>/DP-<szám> hivatkozások száma ` +
          `a lezárt baseline-hoz képest:\n${details}\n\n` +
          'A CLAUDE.md szerint a komment vagy a lokális WHY-t írja le ' +
          'közvetlenül, vagy egy néven megnevezett docs/0X szakaszt nevez meg ' +
          '— D-számra sem itt, sem máshol nem hivatkozunk új helyen. Ha a ' +
          'növekedés szándékos takarítás (pl. egy meglévő címke törlése ' +
          'máshol csökkentette, itt nőtt), frissítsd a ' +
          'dokumentacioGuard.baseline.json-t az új, ellenőrzött értékekre.',
      ).toEqual([]);
    }
  });
});
