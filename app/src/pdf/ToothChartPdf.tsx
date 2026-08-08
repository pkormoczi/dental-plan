// A nyomtatvány fogtérképe -- a webbel AZONOS forrásból (domain/toothVisual
// `buildToothVisualStates` + design/toothChartSvg `buildToothChartSvg`)
// számított raszterképet (pdf/toothChartImage.ts canvas-adaptere) ágyazza be
// react-pdf <Image>-ként, plusz egy vektoros jelmagyarázatot ugyanabból a
// kategória-konfigurációból (design/treatmentVisuals.ts) -- nincs második
// "melyik kategória milyen szín" leképezés a nyomtatványon.
//
// Ha a canvas-renderelés bármi miatt meghiúsul, TervDocument.tsx a teljes
// blokkot kihagyja (lásd ott a `toothChartPng != null` feltételt) -- ez a
// komponens mindig kap egy tényleges data URL-t.

import { Image, Text, View } from '@react-pdf/renderer';
import { t } from '../design/tokens';
import { KEZELES_VIZUALOK } from '../design/treatmentVisuals';
import { resolveNev } from '../domain/nev';
import type { FogterkepAllapot } from '../domain/toothVisual';
import type { Nyelv } from '../domain/types';
import type { PdfLabels } from './labels';

const s = {
  // Az asset viewBox aránya (1576:768 ~ 2.05:1) -- 240 szélességnél 117
  // magasság tartja meg az arányt torzítás nélkül.
  image: { width: 240, height: 117, objectFit: 'contain' as const },
  legend: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginTop: 6, gap: 8 },
  legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  legendLabel: { fontSize: 7.5, color: t.textMuted },
  tejfogSor: { fontSize: 7.5, color: t.textMuted, marginTop: 4 },
};

export function ToothChartPdf({
  pngDataUrl,
  allapot,
  nyelv,
  L,
}: {
  pngDataUrl: string;
  allapot: FogterkepAllapot;
  nyelv: Nyelv;
  L: PdfLabels;
}) {
  return (
    <View>
      <Image src={pngDataUrl} style={s.image} />
      {allapot.jelmagyarazat.length > 0 && (
        <View style={s.legend}>
          {allapot.jelmagyarazat.map((kategoria) => {
            const { szin, cimke } = KEZELES_VIZUALOK[kategoria];
            return (
              <View key={kategoria} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: szin }]} />
                <Text style={s.legendLabel}>{resolveNev(cimke, nyelv).szoveg}</Text>
              </View>
            );
          })}
        </View>
      )}
      {allapot.tejfogak.length > 0 && (
        <Text style={s.tejfogSor}>
          {L.tejfogakPrefix}
          {allapot.tejfogak.join(', ')}
        </Text>
      )}
    </View>
  );
}
