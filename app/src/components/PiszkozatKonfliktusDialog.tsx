// Írási ütközés a piszkozaton: a doki két ablakban szerkeszti ugyanazt, és a
// másik ablak írása óta ez a példány először írna. NEM a
// `DiscardChangesDialog` bővítése -- ott mindkét gomb akció és van biztonságos
// alapeset ("Mégse"), itt viszont a doki két VALÓS változat között választ, és
// nincs harmadik, veszteségmentes út.
//
// Két időbélyeg között a doki nem tud dönteni, két összeg között igen -- ezért
// mindkét változatról a sorszám és a végösszeg látszik, nem a mentés ideje.

import { useRef } from 'react';
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
  // A Radix beépített `onOpenAutoFocus`-a egy `AlertDialog.Cancel`-re fókuszálna;
  // ilyen itt nincs, így nyitáskor semmi nem kapna fókuszt. A fókusz a tartalom
  // TÖRZSÉRE kerül, nem gombra: egyik döntés sem biztonságos alapeset, az ablak
  // pedig hívatlanul, Enter-központú munkamenet közben ugrik fel
  // (`PRODUCT.md § Napi flow`) -- egy reflexes Enter így nem dob el munkát. A
  // `preventDefault` a FocusScope automatikus fókuszálását is lekapcsolja, ezért
  // adjuk kézzel; `tabIndex={-1}` nélkül a törzs nem fókuszálható (a Radix nem
  // teszi rá).
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content
        ref={contentRef}
        tabIndex={-1}
        maxWidth="480px"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }}
      >
        <AlertDialog.Title>A piszkozat két helyen változott</AlertDialog.Title>
        {/* A két összefoglaló a BEJELENTETT leírás része: törzs-fókusznál a
            felolvasó a leírást mondja be, és a sorszám/végösszeg maga a döntés
            tárgya. `Text as="span"` blokként -- a Description egy <p>, abba <p>
            nem kerülhet; a látható elrendezés nem változik. */}
        <AlertDialog.Description size="2">
          Egy másik ablakban is szerkesztetted ezt a piszkozatot. Melyik változat maradjon?
          <Text as="span" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
            <strong>Ebben az ablakban:</strong> {osszefoglalo(sajat)}
          </Text>
          <Text as="span" style={{ display: 'block', marginTop: 'var(--space-1)' }}>
            <strong>A másik ablakban:</strong> {osszefoglalo(masik)}
          </Text>
        </AlertDialog.Description>
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
