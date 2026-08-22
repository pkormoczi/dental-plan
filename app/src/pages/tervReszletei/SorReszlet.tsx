// Egy kezelési sor read-only megjelenítése a Terv részletei nézeten -- lásd
// docs/03-funkcionalis-spec.md § 11. A `PlanEditorPage.tsx` `LineRow`-jának
// vizuális mintáját követi, de NEM importálja: ott minden mező szerkeszthető
// (`onPatch`, `NumberField`), itt egy lezárt dokumentum pillanatképét
// mutatjuk, mezőnkénti beviteli vezérlők nélkül.

import { Badge, Box, Button, Flex, Table, Text } from '@radix-ui/themes';
import { t } from '../../design/tokens';
import { formatMoney } from '../../domain/money';
import { sorOsszeg } from '../../domain/totals';
import type { Nyelv, Penznem, Sor } from '../../domain/types';

/**
 * A sor gyökér `Table.Row`-jának stabil DOM id-je -- a szerkesztő
 * `fog-<pi>-<li>` mintájának read-only, külön névterű megfelelője (nem
 * ütközhet a szerkesztő id-ivel). Egy másik felület (pl. a fogtérkép
 * kattintás-navigációja) erre épülhet majd a scroll-navigációjához.
 */
export function sorElemId(fazisIndex: number, sorIndex: number): string {
  return `sor-${fazisIndex}-${sorIndex}`;
}

export default function SorReszlet({
  sor,
  fazisIndex,
  sorIndex,
  currency,
  nyelv,
  leirasNyitva,
  onToggleLeiras,
}: {
  sor: Sor;
  fazisIndex: number;
  sorIndex: number;
  currency: Penznem;
  nyelv: Nyelv;
  // A leírás-nyitottság a FazisokBlokk-ban él, NEM itt -- a fázis-törzs
  // összecsukása ezt a komponenst unmountolja, egy itteni useState tehát
  // elveszne csukás/nyitás között (lásd FazisokBlokk.tsx fejléckommentje).
  leirasNyitva: boolean;
  onToggleLeiras: () => void;
}) {
  const leirasTartalom = (sor.leirasSnapshot ?? '').trim();
  const arElter = sor.listaEgysegar !== sor.tenylegesEgysegar;
  const leirasId = `sor-leiras-${fazisIndex}-${sorIndex}`;

  return (
    <>
      <Table.Row id={sorElemId(fazisIndex, sorIndex)}>
        <Table.Cell>
          <Flex align="start" gap="1" wrap="wrap">
            <Text as="span">{sor.nevSnapshot}</Text>
            {sor.savos && (
              <Badge color="amber" variant="soft" size="1">
                Becsült ár
              </Badge>
            )}
            {leirasTartalom && (
              <Button
                type="button"
                size="1"
                variant="ghost"
                color="gray"
                aria-expanded={leirasNyitva}
                aria-controls={leirasId}
                onClick={onToggleLeiras}
              >
                Leírás
              </Button>
            )}
          </Flex>
        </Table.Cell>
        <Table.Cell>{sor.fogak.trim() || '—'}</Table.Cell>
        <Table.Cell justify="center" style={{ fontVariantNumeric: 'tabular-nums' }}>
          ×{sor.mennyiseg}
        </Table.Cell>
        <Table.Cell justify="end">
          <Flex direction="column" align="end" gap="0">
            <Text style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatMoney(sor.tenylegesEgysegar, currency, nyelv)}
            </Text>
            {arElter && (
              <Text
                size="1"
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  color: t.uiTextFaint,
                }}
              >
                {formatMoney(sor.listaEgysegar, currency, nyelv)}
              </Text>
            )}
          </Flex>
        </Table.Cell>
        <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {formatMoney(sorOsszeg(sor), currency, nyelv)}
        </Table.Cell>
      </Table.Row>
      {leirasNyitva && leirasTartalom && (
        <Table.Row>
          <Table.Cell colSpan={5}>
            <Box id={leirasId}>
              <Text as="p" size="2" style={{ whiteSpace: 'pre-wrap' }}>
                {leirasTartalom}
              </Text>
            </Box>
          </Table.Cell>
        </Table.Row>
      )}
    </>
  );
}
