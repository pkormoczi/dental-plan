// Mentéskor kiderült, hogy a nyomtatványra került sorszámot közben egy másik mentés (jellemzően a
// másik gépé) elvitte (migrációs terv §5, kemény blokk). A felülírás tilos; a doki a következő
// sorszámra mentheti ugyanazt a tartalmat, vagy elállhat a mentéstől. A meglévő verzió adatai a
// döntés tárgya: ebből látja, hogy valóban ugyanaz a terv készült-e el a másik gépen.

import { AlertDialog, Button, Flex, Text } from '@radix-ui/themes';
import { formatShortDate } from '../domain/date';
import { formatMoney } from '../domain/money';
import { parseVersionDirName, type VersionConflictError } from '../storage/paths';

export default function VerzioUtkozesDialog({
  utkozes,
  kovetkezoVerzio,
  onMentes,
  onMegsem,
}: {
  /** `null`: a dialógus zárva. */
  utkozes: VersionConflictError | null;
  kovetkezoVerzio: number;
  onMentes: () => void;
  onMegsem: () => void;
}) {
  const verzio = utkozes ? parseVersionDirName(utkozes.dirName)?.verzio : undefined;
  const sorszam = verzio ? `v${verzio}` : (utkozes?.dirName ?? '');
  const letezo = utkozes?.letezo ?? null;

  return (
    <AlertDialog.Root
      open={utkozes !== null}
      onOpenChange={(nyitva) => {
        if (!nyitva) onMegsem();
      }}
    >
      <AlertDialog.Content maxWidth="480px">
        <AlertDialog.Title>Ez a terv időközben a másik gépen mentődött</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {letezo ? (
            <>
              <Text as="span" style={{ display: 'block' }}>
                {sorszam} · {formatShortDate(letezo.datum, 'hu')} · {letezo.orvos}
              </Text>
              <Text as="span" style={{ display: 'block', marginTop: 'var(--space-1)' }}>
                Végösszeg: {formatMoney(letezo.vegosszeg, letezo.penznem, 'hu')}
              </Text>
            </>
          ) : (
            <Text as="span" style={{ display: 'block' }}>
              {sorszam} — ez a verzió még nem érkezett meg teljesen erre a gépre.
            </Text>
          )}
          <Text as="span" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
            Mented a következő sorszámra, vagy mégsem?
          </Text>
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end" wrap="wrap">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Mégsem
            </Button>
          </AlertDialog.Cancel>
          <Button onClick={onMentes}>Mentés v{kovetkezoVerzio}-ként</Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
