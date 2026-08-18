// A páciens-részletoldal (backlog-30, D235-D236) sticky, kompakt fejléce:
// név + születési dátum + telefon, görgetéskor a lap tetején marad. Az app
// ELSŐ `position: sticky` használata -- nincs mit reuse-olni, tiszta új
// réteg. Az adatforrás a `megjelenitettTorzsadat()` (domain/paciensAdatok.ts,
// D33) eredménye, változtatás nélkül -- a fejléc csak megjeleníti.

import { Flex, Text } from '@radix-ui/themes';
import { formatShortDate } from '../domain/date';
import type { PatientMasterData } from '../domain/types';
import { t } from '../design/tokens';

export default function PatientDetailHeader({ adatok }: { adatok: PatientMasterData }) {
  const dob = adatok.szuletesiIdo ? formatShortDate(adatok.szuletesiIdo, 'hu') : null;

  return (
    <Flex
      align="baseline"
      gap="3"
      wrap="wrap"
      py="3"
      mb="4"
      data-testid="patient-detail-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        background: t.surface,
        borderBottom: `1px solid ${t.uiLine}`,
      }}
    >
      <Text size="4" weight="bold" style={{ color: t.brand }}>
        {adatok.nev || 'Névtelen páciens'}
      </Text>
      {dob && (
        <Text size="2" color="gray">
          {dob}
        </Text>
      )}
      {adatok.telefon && (
        <Text size="2" color="gray">
          {adatok.telefon}
        </Text>
      )}
    </Flex>
  );
}
