// Írási ütközés a piszkozaton: a doki két ablakban szerkeszti ugyanazt, és a
// másik ablak írása óta ez a példány először írna. NEM a
// `DiscardChangesDialog` bővítése -- ott mindkét gomb akció és van biztonságos
// alapeset ("Mégse"), itt viszont a doki két VALÓS változat között választ, és
// nincs harmadik, veszteségmentes út.
//
// Két időbélyeg között a doki nem tud dönteni, két összeg között igen -- ezért
// mindkét változatról a sorszám és a végösszeg látszik, nem a mentés ideje.

import { AlertDialog, Button, Flex, Text } from '@radix-ui/themes';
import { formatMoney } from '../domain/money';
import { tervVegosszeg } from '../domain/totals';
import type { Plan } from '../domain/types';

function osszefoglalo(plan: Plan): string {
  const sorok = plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);
  const vegosszeg = formatMoney(
    tervVegosszeg(plan.fazisok, plan.kedvezmenyOsszeg),
    plan.penznem,
    plan.nyelv,
  );
  return `${sorok} sor · ${vegosszeg}`;
}

export default function PiszkozatKonfliktusDialog({
  open,
  sajat,
  masik,
  onMegtartomSajat,
  onBetoltomMasikat,
  onOpenChange,
}: {
  open: boolean;
  sajat: Plan;
  masik: Plan;
  onMegtartomSajat: () => void;
  onBetoltomMasikat: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content maxWidth="480px">
        <AlertDialog.Title>A piszkozat két helyen változott</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Egy másik ablakban is szerkesztetted ezt a piszkozatot. Melyik változat maradjon?
        </AlertDialog.Description>
        <Flex direction="column" gap="1" mt="3">
          <Text as="p" size="2" my="0">
            <strong>Ebben az ablakban:</strong> {osszefoglalo(sajat)}
          </Text>
          <Text as="p" size="2" my="0">
            <strong>A másik ablakban:</strong> {osszefoglalo(masik)}
          </Text>
        </Flex>
        <Flex gap="3" mt="4" justify="end" wrap="wrap">
          <Button variant="soft" color="gray" onClick={onBetoltomMasikat}>
            A másik ablak változatát töltöm be
          </Button>
          <Button onClick={onMegtartomSajat}>A saját változatomat mentem</Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
