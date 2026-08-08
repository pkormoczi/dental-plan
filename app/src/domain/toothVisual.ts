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
// `tetelId`-je nincs a mai árlistában (pl. a demó tervek hibás id-jai,
// docs/08-backlog.md 14. tétel), a fog semleges "Egyéb" színt kap, és ezt a
// `hianyzoTetel` jelzi -- nem tűnhet el némán.

import { parseTeeth } from './teeth';
import type { Plan, PriceList, Sor } from './types';
import {
  KEZELES_VIZUAL_PRIORITAS,
  type KezelesVizual,
  vizualKategoriaFor,
} from '../design/treatmentVisuals';

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
  vizual: KezelesVizual;
}

/** MINDEN kezelés megmarad egy fogon, akkor is, ha csak egy szín látszik. */
export interface FogVizualisAllapot {
  fdi: string;
  vizual: KezelesVizual;
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
  /** Csak a tervben ténylegesen előforduló kategóriák, prioritási sorrendben. */
  jelmagyarazat: KezelesVizual[];
}

/**
 * Egy fogon több kezelés is lehet (pl. gyökérkezelés + korona ugyanazon a
 * fogon) -- a megjelenő szín a `KEZELES_VIZUAL_PRIORITAS` tábla szerinti
 * legmagasabb prioritású kategória. Ez az EGYETLEN hely, ahol ez a
 * precedencia eldől.
 */
export function resolveToothVisual(kezelesek: FogKezeles[]): KezelesVizual {
  for (const v of KEZELES_VIZUAL_PRIORITAS) {
    if (kezelesek.some((k) => k.vizual === v)) return v;
  }
  return 'EGYEB';
}

export function buildToothVisualStates(plan: Plan, priceList: PriceList): FogterkepAllapot {
  const tetelekById = new Map(priceList.tetelek.map((tetel) => [tetel.id, tetel]));
  const perFog = new Map<string, FogKezeles[]>();
  const tejfogSet = new Set<string>();
  const ismeretlenSet = new Set<string>();
  let hianyzoTetel = false;

  for (const fazis of plan.fazisok) {
    for (const sor of fazis.sorok) {
      // Mindent-vagy-semmit, mint mindenhol máshol -- ha a sor `fogak`
      // mezője akár egyetlen nem-FDI tokent tartalmaz, a teljes sor
      // szabadszövegnek számít, egy fog sem térképeződik ki belőle.
      const parsed = parseTeeth(sor.fogak);
      if (!parsed.valid) continue;

      const tetel = tetelekById.get(sor.tetelId);
      if (sor.tetelId && !tetel) hianyzoTetel = true;
      const vizual = vizualKategoriaFor(tetel?.kategoriaId);

      for (const fdi of parsed.teeth) {
        if (isMaradoFog(fdi)) {
          const list = perFog.get(fdi);
          if (list) list.push({ fdi, sor, vizual });
          else perFog.set(fdi, [{ fdi, sor, vizual }]);
        } else if (isTejfog(fdi)) {
          tejfogSet.add(fdi);
        } else {
          ismeretlenSet.add(fdi);
        }
      }
    }
  }

  const fogak = new Map<string, FogVizualisAllapot>();
  const jelmagyarazatSet = new Set<KezelesVizual>();
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
    jelmagyarazat: KEZELES_VIZUAL_PRIORITAS.filter((v) => jelmagyarazatSet.has(v)),
  };
}
