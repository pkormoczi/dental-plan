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
  /**
   * Fázisonkénti NYERS részösszeg (`domain/totals.ts` `fazisOsszeg`), a
   * fázisok sorrendjében. Egyetlen fázisnál a hívó üres tömböt ad: a lista
   * ott szó szerint a Mindösszesen ismétlése lenne.
   */
  fazisOsszegek: { nev: string; osszeg: number }[];
  currency: Penznem;
  nyelv: Nyelv;
}

export default function Summary({
  grand,
  kedvezmeny,
  felar,
  fazisOsszegek,
  currency,
  nyelv,
}: SummaryProps) {
  // A két ág EGYSZERRE is állhat: a doki külön látja, mennyit engedett el és
  // mennyi felárat kért. A felár azonos vizuális súlyt kap, mint a kedvezmény:
  // semleges ténymegállapítás, nem hibajelzés -- a doki dolgozhat felárral.
  return (
    <>
      {/* A fázis-részösszegek a NYERS `fazisOsszeg`-et mutatják, terv-szintű
          kedvezmény nélkül: nincs fázisra osztott kedvezmény-fogalom, a
          különbséget az alatta álló EgyediVegosszegBlokk írja ki. */}
      {fazisOsszegek.length > 0 && (
        <Box mb="2">
          {fazisOsszegek.map((f, i) => (
            <Flex key={i} justify="between" align="baseline" gap="4">
              <Text size="2" color="gray" style={{ minWidth: 0 }} truncate>
                {f.nev}
              </Text>
              <Text
                size="2"
                color="gray"
                style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
              >
                {formatMoney(f.osszeg, currency, nyelv)}
              </Text>
            </Flex>
          ))}
        </Box>
      )}
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
            // „Eltérés a listaártól", nem „Felár" -- a felár szó félreérthető,
            // a semleges megfogalmazás pontosabb.
            <Text as="div" size="2" style={{ color: t.ok }}>
              Eltérés a listaártól: +{formatMoney(felar, currency, nyelv)}
            </Text>
          )}
        </Box>
      </Flex>
    </>
  );
}
