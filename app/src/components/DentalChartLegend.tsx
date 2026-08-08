// A fogtérkép jelmagyarázata -- kizárólag a design/treatmentVisuals.ts
// központi szín/felirat-konfigurációjából olvas, sehol máshol nincs második
// színdefiníció. Csak a tervben ténylegesen előforduló kategóriákat mutatja
// (lásd domain/toothVisual.ts `buildToothVisualStates` -> `jelmagyarazat`).

import { Flex, Text } from '@radix-ui/themes';
import { resolveNev } from '../domain/nev';
import type { Nyelv } from '../domain/types';
import { KEZELES_VIZUALOK, type KezelesVizual } from '../design/treatmentVisuals';

export interface DentalChartLegendProps {
  kategoriak: KezelesVizual[];
  /** Alapból magyar -- a kezelőfelület mindig magyar (CLAUDE.md), a PDF-oldal a plan.nyelv-et adja át. */
  nyelv?: Nyelv;
}

export default function DentalChartLegend({ kategoriak, nyelv = 'hu' }: DentalChartLegendProps) {
  if (kategoriak.length === 0) return null;
  return (
    <Flex gap="3" wrap="wrap" mt="2">
      {kategoriak.map((kategoria) => {
        const { szin, cimke } = KEZELES_VIZUALOK[kategoria];
        return (
          <Flex key={kategoria} align="center" gap="2">
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: szin,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <Text size="1" color="gray">
              {resolveNev(cimke, nyelv).szoveg}
            </Text>
          </Flex>
        );
      })}
    </Flex>
  );
}
