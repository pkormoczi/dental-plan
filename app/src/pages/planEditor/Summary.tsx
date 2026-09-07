// A terv szerkesztő "Mindösszesen" összesítő sora -- kiemelve a
// PlanEditorPage.tsx-ből.

import { Box, Flex, Text } from '@radix-ui/themes';
import { t } from '../../design/tokens';
import { formatMoney } from '../../domain/money';
import type { Nyelv, Penznem } from '../../domain/types';

export interface SummaryProps {
  grand: number;
  /** `domain/totals.ts` `elteresBontas` -- bruttó, nem nettózott. */
  kedvezmeny: number;
  felar: number;
  currency: Penznem;
  nyelv: Nyelv;
}

export default function Summary({ grand, kedvezmeny, felar, currency, nyelv }: SummaryProps) {
  // A két ág EGYSZERRE is állhat: a doki külön látja, mennyit engedett el és
  // mennyi felárat kért. A felár azonos vizuális súlyt kap, mint a kedvezmény:
  // semleges ténymegállapítás, nem hibajelzés -- a doki dolgozhat felárral.
  return (
    <Flex justify="between" align="baseline" gap="4">
      <Text size="3" color="gray">
        Mindösszesen
      </Text>
      <Box style={{ textAlign: 'right' }}>
        <Text
          as="div"
          size="6"
          weight="bold"
          style={{ color: t.brand, fontVariantNumeric: 'tabular-nums' }}
        >
          {formatMoney(grand, currency, nyelv)}
        </Text>
        {kedvezmeny > 0 && (
          // Csak a szerkesztőben látszik, a nyomtatványon NEM -- a kedvezmény sosem kerül a
          // szerződéses dokumentumra (PRODUCT.md § A nyomtatvány szerződéses dokumentum).
          <Text as="div" size="2" style={{ color: t.ok }}>
            Kedvezmény: {formatMoney(kedvezmeny, currency, nyelv)}
          </Text>
        )}
        {felar > 0 && (
          <Text as="div" size="2" style={{ color: t.ok }}>
            Felár: {formatMoney(felar, currency, nyelv)}
          </Text>
        )}
      </Box>
    </Flex>
  );
}
