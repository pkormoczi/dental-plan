// Mentéskori ütközés egy felülírt fájlon: a másik gép a betöltés óta ugyanezt módosította
// (migrációs terv §4.6). A `PiszkozatKonfliktusDialog` mintája: a doki két valós változat között
// választ. Az Escape itt a döntés elhalasztása -- semmi nem íródik, és újramentéskor a kérdés
// visszajön --, így se csapda, se reflexből eldobott munka.

import { useRef } from 'react';
import { AlertDialog, Button, Flex, Text } from '@radix-ui/themes';
import type { FelulirasUtkozesDialogusProps } from './useFelulirasUtkozes';

export default function FelulirasUtkozesDialog({ open, cim, onValasz }: FelulirasUtkozesDialogusProps) {
  // Hívatlanul ugrik fel egy mentés közben: a fókusz a törzsre kerül, nem egy gombra, hogy egy
  // reflexes Enter ne döntsön (lásd `PiszkozatKonfliktusDialog`).
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nyitva) => {
        if (!nyitva) onValasz('megsem');
      }}
    >
      <AlertDialog.Content
        ref={contentRef}
        tabIndex={-1}
        maxWidth="520px"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }}
      >
        <AlertDialog.Title>{cim}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Melyik változat maradjon?
          <Text as="span" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
            <strong>A másik gép változatának betöltése:</strong> a most mentett módosításod elvész.
          </Text>
          <Text as="span" style={{ display: 'block', marginTop: 'var(--space-1)' }}>
            <strong>Az én változatom mentése:</strong> a másik gép változata az adatmappa „_utkozesek”
            mappájába kerül, onnan visszahozható.
          </Text>
          <Text as="span" color="gray" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
            Escape: most nem döntök, semmi nem mentődik.
          </Text>
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end" wrap="wrap">
          <Button variant="soft" color="gray" onClick={() => onValasz('betoltes')}>
            A másik gép változatának betöltése
          </Button>
          <Button onClick={() => onValasz('sajat')}>Az én változatom mentése</Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
