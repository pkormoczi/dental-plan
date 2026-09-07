// A terv szerkesztő fejléce -- kiemelve a PlanEditorPage.tsx-ből.

import { Box, Button, Flex, Heading, IconButton, Text } from '@radix-ui/themes';
import { TrashIcon } from '@radix-ui/react-icons';
import { t } from '../../design/tokens';
import { formatPiszkozatIdo } from '../../domain/date';
import type { Plan } from '../../domain/types';

export interface PlanEditorHeaderProps {
  patientName: string;
  statusz: Plan['statusz'];
  onPreview: () => void;
  piszkozatMentve: string | null;
  piszkozatHiba: string | null;
  /** Feloldatlan írási ütközés: a piszkozat NEM mentett, akármit mond a `piszkozatMentve`. */
  piszkozatKonfliktus: boolean;
  onDiscard: () => void;
}

export default function PlanEditorHeader({
  patientName,
  statusz,
  onPreview,
  piszkozatMentve,
  piszkozatHiba,
  piszkozatKonfliktus,
  onDiscard,
}: PlanEditorHeaderProps) {
  return (
    <Flex justify="between" align="center" mb="4">
      <Box>
        <Heading size="5" style={{ color: t.brand }}>
          Kezelési terv
        </Heading>
        <Text as="div" size="2" color="gray">
          {patientName || 'Új páciens'} · {statusz === 'VEGLEGES' ? 'véglegesítve' : 'piszkozat'}
        </Text>
        {/* A meglévő piros Callout (hiba esetén) alatta marad, kikapcsolhatatlanul --
            ez csak a SIKERES mentés pozitív visszajelzése, hiba mellett nem
            látszik, hogy ne mondjon ellent egymásnak a két jelzés. */}
        {piszkozatKonfliktus ? (
          // Feloldatlan ütközésnél a mentés NEM történt meg -- a "Piszkozat
          // mentve" felirat itt hazudna, a doki döntésére vár a dialógus.
          <Text as="div" size="1" color="amber" mt="1">
            Piszkozat nincs mentve — egy másik ablak változtatása feloldásra vár
          </Text>
        ) : (
          piszkozatMentve &&
          !piszkozatHiba && (
            <Text as="div" size="1" color="gray" mt="1">
              Piszkozat mentve {formatPiszkozatIdo(piszkozatMentve)}
            </Text>
          )
        )}
      </Box>
      <Flex gap="3" align="center">
        <IconButton
          type="button"
          aria-label="Piszkozat eldobása"
          variant="ghost"
          color="gray"
          size="2"
          onClick={onDiscard}
        >
          <TrashIcon />
        </IconButton>
        <Button onClick={onPreview}>Előnézet</Button>
      </Flex>
    </Flex>
  );
}
