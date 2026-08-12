// Új páciens felvitele terv nélkül (backlog-28, 6. döntés) --
// `priceListAdmin/UjTetelDialog.tsx` mintája: csak a kötelező névre kérdez,
// a többi mező a mentés UTÁN, a listában kinyíló sorban szerkeszthető, hogy
// ne duplikálódjon ott a mezőkezelés. Explicit Mentés/Mégse -- semmi nem
// kerül a törzsadatba a Mentés gomb megnyomása előtt.

import { useEffect, useState } from 'react';
import { Box, Button, Dialog, Flex, Text, TextField } from '@radix-ui/themes';
import { Field } from '../../components/Field';
import { t } from '../../design/tokens';
import { norm } from '../../domain/search';
import type { PatientFolder } from '../../domain/types';

export interface UjPaciensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A duplikátum-figyelmeztetéshez. */
  patients: PatientFolder[];
  onSave: (nev: string) => void;
  /**
   * A mentés (storage-írás) hibája -- a dialógus NEM zárja saját magát a
   * Mentés gombra (lásd a `form onSubmit`-et), a hívó dönti el sikeres
   * mentéskor, hogy `open`-t `false`-ra állítja-e. Sikertelen mentésnél a
   * dialógus nyitva marad, a begépelt név nem vész el.
   */
  submitError?: string | null;
}

export default function UjPaciensDialog({
  open,
  onOpenChange,
  patients,
  onSave,
  submitError,
}: UjPaciensDialogProps) {
  const [nev, setNev] = useState('');
  const [megprobaltMenteni, setMegprobaltMenteni] = useState(false);

  // Minden megnyitáskor tiszta lappal indul -- ugyanaz a döntés, mint az
  // UjTetelDialog-nál: egy 1 mezős űrlapnál a piszkozat-visszaírás nem éri
  // meg a plusz kattintást.
  useEffect(() => {
    if (open) {
      setNev('');
      setMegprobaltMenteni(false);
    }
  }, [open]);

  const nevHiba = megprobaltMenteni && !nev.trim() ? 'A név nem lehet üres.' : null;
  const nevTrim = nev.trim();
  const duplikatum = nevTrim ? patients.find((p) => norm(p.nev) === norm(nevTrim)) : undefined;

  function handleSubmit() {
    setMegprobaltMenteni(true);
    if (!nev.trim()) return;
    onSave(nev.trim());
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="440px" onCloseAutoFocus={(e) => e.preventDefault()}>
        <Dialog.Title>Új páciens</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          A többi adat (elérhetőség, TAJ, kiskorú stb.) a mentés után, a listában kinyíló sorban
          adható meg.
        </Dialog.Description>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Box mt="4" mb="3">
            <Field label="Név *">
              <TextField.Root
                autoFocus
                value={nev}
                onChange={(e) => setNev(e.target.value)}
                placeholder="Kovács János"
                aria-invalid={nevHiba ? true : undefined}
                style={nevHiba ? { boxShadow: `inset 0 0 0 1px ${t.danger}` } : undefined}
              />
            </Field>
            {nevHiba && (
              <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
                {nevHiba}
              </Text>
            )}
            {!nevHiba && duplikatum && (
              <Text as="div" size="1" mt="1" style={{ color: t.warn }}>
                Már van ilyen nevű páciens — lehet, hogy inkább őt kellene megkeresni, nem újra
                felvinni.
              </Text>
            )}
          </Box>

          {submitError && (
            <Text as="div" size="1" mb="2" style={{ color: t.danger }}>
              A mentés nem sikerült: {submitError}
            </Text>
          )}

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                Mégse
              </Button>
            </Dialog.Close>
            <Button type="submit">Mentés</Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
