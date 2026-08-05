// 32 maradó fog két sorban, kvadránsonként elválasztva, SZÁMOZÁS NÉLKÜL --
// portolva ui/PrintPreview.jsx ToothChart-jából react-pdf Svg/Rect-re.
// Az érintett fogak a márka világoskékjét kapják, a többi halványszürkét.
//
// Tejfog sor csak akkor jelenik meg, ha a tervben van tejfog-szám (FDI
// 51-85) -- lásd docs/02-domain-modell.md "Fogszám kezelés". Ez egy
// leegyszerűsített, nem anatómiailag pontosan illesztett séma: a
// tejfogsor a maradó fogsor alatt kap egy önálló, kisebb sávot.

import { Rect, Svg, Text as PdfText } from '@react-pdf/renderer';
import { t } from '../design/tokens';

const PERMANENT_ROWS = [
  ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'],
  ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'],
];

const DECIDUOUS_ROWS = [
  ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'],
  ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'],
];

const BOX_W = 14;
const BOX_H = 20;
const GAP = 2;
const QUADRANT_GAP = 14;
const PERMANENT_ROW_WIDTH = 16 * (BOX_W + GAP) - GAP + QUADRANT_GAP;

function ToothRow({
  codes,
  activeCodes,
  y,
  boxW,
  boxH,
  offsetX = 0,
}: {
  codes: string[];
  activeCodes: Set<string>;
  y: number;
  boxW: number;
  boxH: number;
  offsetX?: number;
}) {
  return (
    <>
      {codes.map((code, i) => {
        const active = activeCodes.has(code);
        return (
          <Rect
            key={code}
            x={offsetX + i * (boxW + GAP) + (i >= codes.length / 2 ? QUADRANT_GAP - GAP : 0)}
            y={y}
            width={boxW}
            height={boxH}
            rx={3}
            fill={active ? t.sky : '#EDEFF3'}
            stroke={active ? t.navy : undefined}
            strokeWidth={active ? 0.6 : 0}
          />
        );
      })}
    </>
  );
}

export function ToothChartPdf({ teeth }: { teeth: string[] }) {
  const activeCodes = new Set(teeth);
  const hasDeciduous = teeth.some((code) => Number(code[0]) >= 5);

  const deciduousBoxW = 12;
  const deciduousBoxH = 17;
  const deciduousRowWidth = 10 * (deciduousBoxW + GAP) - GAP + QUADRANT_GAP;
  const deciduousOffsetX = (PERMANENT_ROW_WIDTH - deciduousRowWidth) / 2;

  const permanentHeight = 2 * BOX_H + GAP + 4;
  const deciduousLabelHeight = hasDeciduous ? 10 : 0;
  const deciduousHeight = hasDeciduous ? 2 * deciduousBoxH + GAP : 0;
  const totalHeight = permanentHeight + deciduousLabelHeight + deciduousHeight;

  return (
    <Svg
      width={PERMANENT_ROW_WIDTH}
      height={totalHeight}
      viewBox={`0 0 ${PERMANENT_ROW_WIDTH} ${totalHeight}`}
    >
      <ToothRow codes={PERMANENT_ROWS[0]} activeCodes={activeCodes} y={0} boxW={BOX_W} boxH={BOX_H} />
      <ToothRow
        codes={PERMANENT_ROWS[1]}
        activeCodes={activeCodes}
        y={BOX_H + GAP}
        boxW={BOX_W}
        boxH={BOX_H}
      />
      {hasDeciduous && (
        <>
          <PdfText
            x={0}
            y={permanentHeight + 6}
            style={{ fontSize: 6, fontFamily: 'NotoSans', fill: t.textFaint }}
          >
            tejfog
          </PdfText>
          <ToothRow
            codes={DECIDUOUS_ROWS[0]}
            activeCodes={activeCodes}
            y={permanentHeight + deciduousLabelHeight}
            boxW={deciduousBoxW}
            boxH={deciduousBoxH}
            offsetX={deciduousOffsetX}
          />
          <ToothRow
            codes={DECIDUOUS_ROWS[1]}
            activeCodes={activeCodes}
            y={permanentHeight + deciduousLabelHeight + deciduousBoxH + GAP}
            boxW={deciduousBoxW}
            boxH={deciduousBoxH}
            offsetX={deciduousOffsetX}
          />
        </>
      )}
    </Svg>
  );
}
