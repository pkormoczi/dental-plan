// A páciens-részletoldal (backlog-30, D235-D236) sticky, kompakt fejléce:
// név + születési dátum + telefon, görgetéskor a lap tetején marad. Az app
// ELSŐ `position: sticky` használata -- nincs mit reuse-olni, tiszta új
// réteg. Az adatforrás a `megjelenitettTorzsadat()` (domain/paciensAdatok.ts,
// D33) eredménye, változtatás nélkül -- a fejléc csak megjeleníti.

import type { ReactNode } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { formatShortDate } from '../domain/date';
import type { PatientMasterData } from '../domain/types';
import { t } from '../design/tokens';

export default function PatientDetailHeader({
  adatok,
  actions,
}: {
  adatok: PatientMasterData;
  /** Pl. a páciens-törlés `⋯` menüje (backlog-41) -- opcionális, hogy a komponens display-only maradjon a hívó nélkül. */
  actions?: ReactNode;
}) {
  const dob = adatok.szuletesiIdo ? formatShortDate(adatok.szuletesiIdo, 'hu') : null;
  const meta = [dob, adatok.telefon].filter(Boolean).join(' · ');

  return (
    <Flex
      justify="between"
      align="start"
      py="3"
      mb="4"
      data-testid="patient-detail-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        // t.page (nem t.surface): a sáv marad átlátszatlan -- kell, hogy a
        // görgő tartalom ne lásszon át alatta --, de lapszínű, hogy ne
        // üssön el "card"-ként a szürke oldalháttértől (docs/07: nincs card
        // doboz adat körül).
        background: t.page,
        borderBottom: `1px solid ${t.uiLine}`,
      }}
    >
      <Flex direction="column" gap="1">
        <Text size="4" weight="bold" style={{ color: t.brand }}>
          {adatok.nev || 'Névtelen páciens'}
        </Text>
        {meta && (
          <Text size="2" style={{ color: t.uiTextMuted }}>
            {meta}
          </Text>
        )}
      </Flex>
      {actions}
    </Flex>
  );
}
