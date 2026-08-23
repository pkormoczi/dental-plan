// Egy kezelési sor read-only megjelenítése a Terv részletei nézeten -- lásd
// docs/03-funkcionalis-spec.md § 11. A `PlanEditorPage.tsx` `LineRow`-jának
// vizuális mintáját követi, de NEM importálja: ott minden mező szerkeszthető
// (`onPatch`, `NumberField`), itt egy lezárt dokumentum pillanatképét
// mutatjuk, mezőnkénti beviteli vezérlők nélkül.

import type { CSSProperties } from 'react';
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
  kiemelve,
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
  // Igaz, ha a fogtérkép-panelen kijelölt fogak érintik ezt a sort --
  // additív kiemelés, a nem érintett sorok nincsenek elhalványítva.
  kiemelve: boolean;
}) {
  const leirasTartalom = (sor.leirasSnapshot ?? '').trim();
  const arElter = sor.listaEgysegar !== sor.tenylegesEgysegar;
  const leirasId = `sor-leiras-${fazisIndex}-${sorIndex}`;

  const leirasNyitottBorderNelkul = leirasNyitva && leirasTartalom.length > 0;
  const rowStyle: CSSProperties | undefined =
    leirasNyitottBorderNelkul || kiemelve
      ? ({
          ...(leirasNyitottBorderNelkul ? { '--table-row-box-shadow': 'none' } : {}),
          ...(kiemelve ? { background: t.accentWash } : {}),
        } as CSSProperties)
      : undefined;

  return (
    <>
      <Table.Row
        id={sorElemId(fazisIndex, sorIndex)}
        // Kinyitott leírásnál a sor ALSÓ hajszálvonala eltűnik -- a
        // következő (leírás-)sor felveszi ugyanezt a szerepet, így a két
        // sor vizuálisan EGY blokként jelenik meg, csak a blokk ALJÁN van
        // elválasztó a következő tétel felé. A `--table-row-box-shadow`
        // Radix-változó öröklődik a saját `Table.Cell`-jeire (table.css).
        style={rowStyle}
      >
        <Table.Cell>
          <Flex align="center" gap="1" wrap="wrap">
            <Text as="span">{sor.nevSnapshot}</Text>
            {sor.savos && (
              <Badge color="amber" variant="soft" size="1">
                Becsült ár
              </Badge>
            )}
            {leirasTartalom && (
              <>
                {/* Vizuális elválasztó a névtől/jelvénytől -- a Flex `gap`
                    önmagában túl kevés volt, a "Leírás" gomb összefolyt a
                    névvel. `aria-hidden`: a breadcrumb "›" elválasztójának
                    mintája (`TervReszleteiPage.tsx`) -- puszta díszítés,
                    nem hordoz tartalmat felolvasónak. */}
                <Text size="1" style={{ color: t.uiTextFaint }} aria-hidden="true">
                  ·
                </Text>
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
              </>
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
      {leirasNyitottBorderNelkul && (
        <Table.Row>
          {/* Halvány háttér + behúzás + kisebb, tompított szöveg -- ez
              jelzi, hogy ez a sor a FELETTE lévő tétel részlete, nem egy
              önálló, azzal egyenrangú sor (a `Beavatkozás`-cella
              szövegének kezdőpontjához igazított behúzással). */}
          <Table.Cell colSpan={5} style={{ background: t.surfaceAlt }}>
            <Box id={leirasId} pl="4">
              <Text
                as="p"
                size="2"
                style={{ whiteSpace: 'pre-wrap', color: t.uiTextMuted }}
              >
                {leirasTartalom}
              </Text>
            </Box>
          </Table.Cell>
        </Table.Row>
      )}
    </>
  );
}
