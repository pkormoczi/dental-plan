// Új páciens felvitele terv nélkül (backlog-28, 6. döntés; backlog-36,
// D14/D15 -- mindkét belépési pontot ez a közös dialógus szolgálja:
// `PaciensekPage.tsx` "+ Új páciens" ÉS a `NewPlanPage.tsx` "Vadonatúj
// páciens"/no-match ága). `priceListAdmin/UjTetelDialog.tsx` mintája: csak
// a kötelező névre kérdez kötelezően, a többi (elérhetőség, TAJ, kiskorú
// stb.) a mentés UTÁN, a listában kinyíló sorban szerkeszthető -- a
// szuletesiIdo/telefon (D15) kivétel, mert azok "látható, de opcionális"
// mezőként a redesign explicit kéri már itt. Explicit Mentés/Mégse -- semmi
// nem kerül a törzsadatba a Mentés gomb megnyomása előtt.

import { useEffect, useState } from 'react';
import { Box, Button, Dialog, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import { Field } from '../../components/Field';
import { t } from '../../design/tokens';
import { norm } from '../../domain/search';
import type { PatientFolder } from '../../domain/types';

export interface UjPaciensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A duplikátum-figyelmeztetéshez. */
  patients: PatientFolder[];
  /** A kezdőnév -- a no-match "Új páciens: „…"" pszeudó-opció előtölti (NewPlanPage.tsx). */
  initialNev?: string;
  onSave: (nev: string, kezdoAdatok: { szuletesiIdo: string; telefon: string }) => void;
  /**
   * D203/D204: névegyezésnél a doki a talált páciensre folytathatja a
   * flow-t ahelyett, hogy újat venne fel -- a begépelt adatok ilyenkor
   * eldobódnak, a hívó dönti el, mi történik (pl. a listasor megnyitása
   * vagy a terv-flow folytatása a meglévő páciensen).
   */
  onUseExisting?: (patient: PatientFolder) => void;
  /**
   * A mentés (storage-írás) hibája -- a dialógus NEM zárja saját magát a
   * Mentés gombra (lásd a `form onSubmit`-et), a hívó dönti el sikeres
   * mentéskor, hogy `open`-t `false`-ra állítja-e. Sikertelen mentésnél a
   * dialógus nyitva marad, a begépelt adatok nem vesznek el.
   */
  submitError?: string | null;
}

export default function UjPaciensDialog({
  open,
  onOpenChange,
  patients,
  initialNev,
  onSave,
  onUseExisting,
  submitError,
}: UjPaciensDialogProps) {
  const [nev, setNev] = useState('');
  const [szuletesiIdo, setSzuletesiIdo] = useState('');
  const [telefon, setTelefon] = useState('');
  const [megprobaltMenteni, setMegprobaltMenteni] = useState(false);

  // Minden megnyitáskor tiszta lappal indul -- ugyanaz a döntés, mint az
  // UjTetelDialog-nál: egy pár mezős űrlapnál a piszkozat-visszaírás nem
  // éri meg a plusz kattintást. Az `initialNev` (no-match ág) ettől
  // eltérően előtöltve indul.
  useEffect(() => {
    if (open) {
      setNev(initialNev ?? '');
      setSzuletesiIdo('');
      setTelefon('');
      setMegprobaltMenteni(false);
    }
  }, [open, initialNev]);

  const nevHiba = megprobaltMenteni && !nev.trim() ? 'A név nem lehet üres.' : null;
  const nevTrim = nev.trim();
  const duplikatum = nevTrim ? patients.find((p) => norm(p.nev) === norm(nevTrim)) : undefined;

  function handleSubmit() {
    setMegprobaltMenteni(true);
    if (!nev.trim()) return;
    onSave(nev.trim(), { szuletesiIdo, telefon });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="440px" onCloseAutoFocus={(e) => e.preventDefault()}>
        <Dialog.Title>Új páciens</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          A születési dátum és a telefon opcionális -- ezek és a többi adat (lakcím, TAJ, kiskorú
          stb.) a mentés után is szerkeszthetők maradnak.
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
              <Box mt="1">
                <Text as="div" size="1" style={{ color: t.warn }}>
                  Már van ilyen nevű páciens — lehet, hogy inkább őt kellene megkeresni, nem újra
                  felvinni.
                </Text>
                {onUseExisting && (
                  <Button
                    type="button"
                    variant="soft"
                    size="1"
                    mt="1"
                    onClick={() => onUseExisting(duplikatum)}
                  >
                    Ezt a pácienst választom
                  </Button>
                )}
              </Box>
            )}
          </Box>

          <Grid columns="2" gap="3" mb="3">
            <Field label="Született">
              <TextField.Root
                type="date"
                value={szuletesiIdo}
                onChange={(e) => setSzuletesiIdo(e.target.value)}
              />
            </Field>
            <Field label="Telefon">
              <TextField.Root
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="+36 30 123 4567"
              />
            </Field>
          </Grid>

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
