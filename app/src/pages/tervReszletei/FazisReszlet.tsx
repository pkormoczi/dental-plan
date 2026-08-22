// Egy kezelési fázis read-only szekciója a Terv részletei nézeten -- lásd
// docs/03-funkcionalis-spec.md § 11. A `PlanEditorPage.tsx`
// `PhaseSection`-jének vizuális mintáját követi (fejléc + saját táblafejléc
// + lábléc-összeg), de szerkeszthető mezők (fázisnév input, sorrendező
// nyilak, törlés) nélkül.

import { Badge, Box, Flex, IconButton, Table, Text } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { t } from '../../design/tokens';
import { formatMoney } from '../../domain/money';
import { fazisOsszeg } from '../../domain/totals';
import type { Fazis, Nyelv, Penznem } from '../../domain/types';
import SorReszlet from './SorReszlet';

export default function FazisReszlet({
  fazis,
  fazisIndex,
  nyitva,
  onToggle,
  currency,
  nyelv,
  leirasNyitvaSorok,
  onToggleLeiras,
}: {
  fazis: Fazis;
  fazisIndex: number;
  nyitva: boolean;
  onToggle: () => void;
  currency: Penznem;
  nyelv: Nyelv;
  // Kulcs: `${fazisIndex}-${sorIndex}` -- a FazisokBlokk-ban él (lásd ott),
  // ide csak áthúzva jut el.
  leirasNyitvaSorok: Record<string, boolean>;
  onToggleLeiras: (sorIndex: number) => void;
}) {
  const penznemJel = currency === 'EUR' ? '€' : 'Ft';
  const total = fazisOsszeg(fazis);
  const panelId = `fazis-reszlet-${fazisIndex}`;
  const megjegyzes = fazis.megjegyzes.trim();

  return (
    <Box mb="5">
      <Flex align="center" gap="2" mb="2" wrap="wrap">
        <IconButton
          id={`fazis-reszlet-toggle-${fazisIndex}`}
          type="button"
          variant="ghost"
          color="gray"
          size="1"
          aria-expanded={nyitva}
          aria-controls={panelId}
          aria-label={nyitva ? 'Fázis összecsukása' : 'Fázis kinyitása'}
          onClick={onToggle}
        >
          {nyitva ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </IconButton>
        <Text weight="bold" style={{ color: t.brand }}>
          {fazis.megnevezes}
        </Text>
        <Text size="2" color="gray" style={{ whiteSpace: 'nowrap' }}>
          {fazis.sorok.length} tétel · {formatMoney(total, currency, nyelv)}
        </Text>
        {!nyitva && megjegyzes && (
          <Badge color="gray" variant="soft" size="1">
            Megjegyzés
          </Badge>
        )}
      </Flex>

      {nyitva && (
        <Box id={panelId}>
          {fazis.sorok.length === 0 ? (
            <Text as="p" size="2" color="gray">
              Nincs kezelési sor ebben a fázisban.
            </Text>
          ) : (
            <Table.Root size="1" variant="ghost" className="fazis-tabla" mb="3">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>
                    <Text weight="bold" style={{ color: t.brand }}>
                      Beavatkozás
                    </Text>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="132px">
                    <Text weight="bold" style={{ color: t.brand }}>
                      Fog
                    </Text>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="72px" justify="center">
                    <Text weight="bold" style={{ color: t.brand }}>
                      Db
                    </Text>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="140px" justify="end">
                    <Text weight="bold" style={{ color: t.brand }}>
                      Egységár ({penznemJel})
                    </Text>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="120px" justify="end">
                    <Text weight="bold" style={{ color: t.brand }}>
                      Összeg ({penznemJel})
                    </Text>
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {fazis.sorok.map((sor, li) => (
                  <SorReszlet
                    key={li}
                    sor={sor}
                    fazisIndex={fazisIndex}
                    sorIndex={li}
                    currency={currency}
                    nyelv={nyelv}
                    leirasNyitva={leirasNyitvaSorok[`${fazisIndex}-${li}`] ?? false}
                    onToggleLeiras={() => onToggleLeiras(li)}
                  />
                ))}
              </Table.Body>
            </Table.Root>
          )}

          <Flex justify="end" mt="3" pt="2" style={{ borderTop: `1px solid ${t.uiLine}` }}>
            <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Fázis összesen: <Text weight="bold">{formatMoney(total, currency, nyelv)}</Text>
            </Text>
          </Flex>

          {megjegyzes && (
            <Box mt="2">
              <Text size="2" color="gray">
                Megjegyzés: {megjegyzes}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
