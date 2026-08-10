// A fogtérkép állapotszámítója -- React-mentes, tisztán a Plan/PriceList
// adatból építi fel, milyen színt kapjon melyik fog. Ez az EGYETLEN hely,
// ahol egy terv sorai (`Sor.fogak`, `Sor.tetelId`) fogankénti vizuális
// állapottá alakulnak -- a webes fogtérkép (components/DentalChart.tsx) és a
// nyomtatvány (pdf/ToothChartPdf.tsx) egyaránt ezt hívja, hogy ne legyen két
// külön "melyik fog milyen színű" logika.
//
// A `kategoriaId -> szín` leképezés render-időben, a JELENLEGI árlistából
// oldódik fel -- ez szándékosan feszíti a D7 pillanatkép-elvét (lásd
// CLAUDE.md), de csak a SZÍN kozmetikai szinten: a `nevSnapshot` és az árak
// továbbra is a felvétel pillanatát tükrözik, változatlanul. Ha egy sor
// `tetelId`-je nincs a mai árlistában, a fog semleges "Egyéb" színt kap, és
// ezt a `hianyzoTetel` jelzi -- nem tűnhet el némán.

import { parseTeeth } from './teeth';
import type { Plan, PriceList, Sor } from './types';
import { ISMERETLEN_KATEGORIA, kategoriaVizual, type KategoriaVizual } from '../design/treatmentVisuals';

/** A 32 maradó fog, az asset (dental-chart-fdi-32.svg) authored sorrendjében. */
export const FDI_MARADO: readonly string[] = [
  '18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28',
  '48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38',
];

const MARADO_RE = /^[1-4][1-8]$/;
const TEJFOG_RE = /^[5-8][1-5]$/;

export function isMaradoFog(kod: string): boolean {
  return MARADO_RE.test(kod);
}

export function isTejfog(kod: string): boolean {
  return TEJFOG_RE.test(kod);
}

export interface FogKezeles {
  fdi: string;
  sor: Sor;
  vizual: KategoriaVizual;
  /** A `Plan.fazisok`/`Fazis.sorok` beli pozíció -- a fogtérkép kattintás-
   *  kezelője (PlanEditorPage) ebből talál vissza a konkrét sorra, mert a
   *  `sor` maga a `structuredClone`-os `updatePlan` miatt renderelésenként
   *  új objektum, nem stabil azonosító. */
  fazisIndex: number;
  sorIndex: number;
}

/** MINDEN kezelés megmarad egy fogon, akkor is, ha csak egy szín látszik. */
export interface FogVizualisAllapot {
  fdi: string;
  vizual: KategoriaVizual;
  kezelesek: FogKezeles[];
}

export interface FogterkepAllapot {
  /** Csak érvényes MARADÓ fogszámok -- ezek jelennek meg a rajzon. */
  fogak: Map<string, FogVizualisAllapot>;
  /** 51-85 -- a rajzon (32 maradó fog) nem ábrázolható, szövegesen jelenik meg. */
  tejfogak: string[];
  /**
   * Védőháló: `parseTeeth` FDI regexe ma pontosan a maradó + tejfog
   * tartományt engedi át, tehát ide sosem kerülne token -- ha mégis (a
   * regex jövőbeli módosítása miatt), itt landol ahelyett, hogy csendben
   * egy másik fogra képződne le.
   */
  ismeretlen: string[];
  /** Volt legalább egy sor, aminek a `tetelId`-je nincs a mai árlistában. */
  hianyzoTetel: boolean;
  /** Csak a tervben ténylegesen előforduló kategóriák, `sorrend` szerint. */
  jelmagyarazat: KategoriaVizual[];
}

/**
 * Egy fogon több kezelés is lehet (pl. gyökérkezelés + korona ugyanazon a
 * fogon) -- a megjelenő szín a legkisebb `sorrend`-ű kategóriáé (a
 * kategória-lista sorrendje egyben fontossági sorrend is, D28
 * `docs/01-attekintes-es-dontesek.md`). Holtversenynél (két
 * kategória azonos `sorrend`-del -- rendes adaton nem fordulhat elő) az
 * `id` dönt, hogy az eredmény determinisztikus maradjon. Az
 * `ISMERETLEN_KATEGORIA` (`sorrend: Infinity`) így sosem nyerhet egy valódi
 * kategóriájú kezeléssel szemben. Ez az EGYETLEN hely, ahol ez a
 * precedencia eldől.
 */
export function resolveToothVisual(kezelesek: FogKezeles[]): KategoriaVizual {
  let best: KategoriaVizual = ISMERETLEN_KATEGORIA;
  for (const { vizual } of kezelesek) {
    if (vizual.sorrend < best.sorrend || (vizual.sorrend === best.sorrend && vizual.id < best.id)) {
      best = vizual;
    }
  }
  return best;
}

export function buildToothVisualStates(plan: Plan, priceList: PriceList): FogterkepAllapot {
  const tetelekById = new Map(priceList.tetelek.map((tetel) => [tetel.id, tetel]));
  // Egyszer épül fel, ciklus előtt -- a `kategoriaVizual()` minden hívása új
  // objektumot adna vissza, ami eltörné a lenti `jelmagyarazat`
  // dedupját (a `Set` referencia szerint hasonlít). Így ugyanaz a
  // `KategoriaVizual` példány jár egy adott kategóriaId-hoz a teljes hívás
  // alatt.
  const vizualById = new Map(priceList.kategoriak.map((k) => [k.id, kategoriaVizual(k)]));
  const vizualFor = (kategoriaId: string | undefined): KategoriaVizual =>
    (kategoriaId && vizualById.get(kategoriaId)) || ISMERETLEN_KATEGORIA;
  const perFog = new Map<string, FogKezeles[]>();
  const tejfogSet = new Set<string>();
  const ismeretlenSet = new Set<string>();
  let hianyzoTetel = false;

  plan.fazisok.forEach((fazis, fazisIndex) => {
    fazis.sorok.forEach((sor, sorIndex) => {
      // Mindent-vagy-semmit, mint mindenhol máshol -- ha a sor `fogak`
      // mezője akár egyetlen nem-FDI tokent tartalmaz, a teljes sor
      // szabadszövegnek számít, egy fog sem térképeződik ki belőle.
      const parsed = parseTeeth(sor.fogak);
      if (!parsed.valid) return;

      const tetel = tetelekById.get(sor.tetelId);
      if (sor.tetelId && !tetel) hianyzoTetel = true;
      const vizual = vizualFor(tetel?.kategoriaId);

      for (const fdi of parsed.teeth) {
        if (isMaradoFog(fdi)) {
          const kezeles: FogKezeles = { fdi, sor, vizual, fazisIndex, sorIndex };
          const list = perFog.get(fdi);
          if (list) list.push(kezeles);
          else perFog.set(fdi, [kezeles]);
        } else if (isTejfog(fdi)) {
          tejfogSet.add(fdi);
        } else {
          ismeretlenSet.add(fdi);
        }
      }
    });
  });

  const fogak = new Map<string, FogVizualisAllapot>();
  const jelmagyarazatSet = new Set<KategoriaVizual>();
  for (const [fdi, kezelesek] of perFog) {
    const vizual = resolveToothVisual(kezelesek);
    fogak.set(fdi, { fdi, vizual, kezelesek });
    jelmagyarazatSet.add(vizual);
  }

  return {
    fogak,
    tejfogak: [...tejfogSet].sort(),
    ismeretlen: [...ismeretlenSet],
    hianyzoTetel,
    jelmagyarazat: [...jelmagyarazatSet].sort((a, b) => a.sorrend - b.sorrend),
  };
}
