// A terv szerkesztő "Mindösszesen" összesítő sora -- kiemelve a
// PlanEditorPage.tsx-ből.

import { Box, Flex, Text } from '@radix-ui/themes';
import { t } from '../../design/tokens';
import { formatMoney } from '../../domain/money';
import type { Nyelv, Penznem } from '../../domain/types';

export interface SummaryProps {
  grand: number;
  listTotal: number;
  currency: Penznem;
  nyelv: Nyelv;
}

export default function Summary({ grand, listTotal, currency, nyelv }: SummaryProps) {
  // A két ág kizárja egymást (`listTotal` és `grand` közül csak az egyik
  // lehet nagyobb). A felár azonos vizuális súlyt kap, mint a kedvezmény:
  // semleges ténymegállapítás, nem hibajelzés -- a doki dolgozhat felárral
  // (backlog-12, 4. döntés). A nyomtatvány mindkét irányú eltérésre
  // megmutatja a "Kezelések összege" referenciasort, ezért indokolatlan
  // lenne, ha a szerkesztő csak az egyik irányról adna visszajelzést.
  const discount = listTotal - grand;
  const surcharge = grand - listTotal;
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
        {discount > 0 && (
          // Csak a szerkesztőben látszik, a nyomtatványon NEM -- a kedvezmény sosem kerül a
          // szerződéses dokumentumra (PRODUCT.md § A nyomtatvány szerződéses dokumentum).
          <Text as="div" size="2" style={{ color: t.ok }}>
            Kedvezmény: {formatMoney(discount, currency, nyelv)}
          </Text>
        )}
        {surcharge > 0 && (
          <Text as="div" size="2" style={{ color: t.ok }}>
            Felár: {formatMoney(surcharge, currency, nyelv)}
          </Text>
        )}
      </Box>
    </Flex>
  );
}
