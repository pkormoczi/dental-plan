// Interaktív/olvasható fogtérkép -- a dental-chart-fdi-32.svg anatómiai
// rajzát színezi kezelési kategóriánként (design/toothChartSvg.ts). Ugyanez
// a markup-builder szolgáltatja a nyomtatvány fogtérképét is (canvas->PNG
// adapter, lásd pdf/toothChartImage.ts), így nincs két külön "melyik fog
// milyen színű" logika a két felületen.
//
// docs/07-felulet-rendszer.md kifejezett kivétele a Radix-only szabály alól:
// "a fogtérkép (funkcionális SVG adatvizualizáció) és a nyomtatvány".

import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import type { FogterkepAllapot } from '../domain/toothVisual';
import { buildToothChartSvg, CHART_ARIA_LABEL } from '../design/toothChartSvg';

export interface DentalChartProps {
  allapot: FogterkepAllapot;
  /** Fejlesztői/debug mód: fogszám minden fog közepén. Alapból kikapcsolva. */
  showToothNumbers?: boolean;
  /** Ha nincs megadva, a fogtérkép teljesen olvasható-only (nincs kattintás). */
  onToothClick?: (toothNumber: string) => void;
}

export default function DentalChart({
  allapot,
  showToothNumbers = false,
  onToothClick,
}: DentalChartProps) {
  const markup = useMemo(
    () => buildToothChartSvg(allapot, { sizing: 'responsive', showToothNumbers }),
    [allapot, showToothNumbers],
  );

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (!onToothClick) return;
    // React szintetikus esemény, nincs document.querySelector/useRef-es
    // utólagos DOM-túrás -- a kattintott elemtől a legközelebbi fog-
    // csoportig megyünk fel a data-tooth attribútum alapján.
    const toothEl = (e.target as Element).closest('[data-tooth]');
    const tooth = toothEl?.getAttribute('data-tooth');
    if (tooth) onToothClick(tooth);
  }

  return (
    <div
      role="img"
      aria-label={CHART_ARIA_LABEL}
      onClick={onToothClick ? handleClick : undefined}
      style={{ cursor: onToothClick ? 'pointer' : 'default' }}
      // A markup zárt forrásból (buildToothChartSvg) jön -- lásd annak
      // fejléckommentjét a biztonsági indoklásért.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
