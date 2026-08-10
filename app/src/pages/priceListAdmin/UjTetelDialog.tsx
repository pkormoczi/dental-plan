// Új tétel felvitele -- korábban a "+ Új tétel" gomb AZONNAL írt a
// törzsadatba egy "Új tétel" placeholder-névvel, az első kategóriába, fókusz
// és validáció nélkül (a doki nem tudta, hová kell gépelnie, mert a lista
// tetején, láthatatlanul jött létre a sor). Ez a dialógus a mentés elé egy
// explicit Mentés/Mégse lépést told: semmi nem kerül a listába, amíg a doki
// meg nem nyomja a Mentés gombot -- Mégse/Escape esetén a piszkozat nyomtalanul
// eldobódik, tétel-id sem foglalódik (az a hívó `mentUjTetel`-jében,
// Mentéskor számít, lásd PriceListAdminPage.tsx).
//
// Csak a névre és a kategóriára kérdez -- a többi mező (ártípus, HUF/EUR ár,
// gyakori, aktív) a mentés UTÁN a listában kinyíló sor-szerkesztőben
// (`ItemEditor`, PriceListAdminPage.tsx) marad, hogy ne duplikálódjon ott a
// NumberField / FIX↔SÁVOS logika.
//
// Ez az app első `Dialog`-használata -- a meglévő 4 modális hely mind
// `AlertDialog` (megerősítés, nincs benne mező), lásd
// docs/07-felulet-rendszer.md "Komponensek".

import { useEffect, useState } from 'react';
import { Box, Button, Dialog, Flex, Select, Text, TextField } from '@radix-ui/themes';
import { Field } from '../../components/Field';
import { t } from '../../design/tokens';
import { ALAP_KATEGORIA_SZIN } from '../../design/treatmentVisuals';
import { norm } from '../../domain/search';
import type { Kategoria, Tetel } from '../../domain/types';

export interface UjTetelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Már `sorrend` szerint rendezve -- lásd `sortedKategoriak`. */
  kategoriak: Kategoria[];
  /** A duplikátum-figyelmeztetéshez -- aktív ÉS inaktív tételekkel is összevet. */
  tetelek: Tetel[];
  onSave: (nevHu: string, nevDe: string | null, kategoriaId: string) => void;
}

export default function UjTetelDialog({
  open,
  onOpenChange,
  kategoriak,
  tetelek,
  onSave,
}: UjTetelDialogProps) {
  const [huNev, setHuNev] = useState('');
  const [deNev, setDeNev] = useState('');
  const [kategoriaId, setKategoriaId] = useState('');
  const [megprobaltMenteni, setMegprobaltMenteni] = useState(false);

  // Minden megnyitáskor tiszta lappal indul -- Mégse/Escape után a korábban
  // beírt piszkozat NEM éled újra egy következő megnyitáskor, ahogy azt a
  // felugró ablak tervezésekor eldöntöttük (nincs megerősítés-kérés zárás
  // előtt, egy 2 mezős űrlapnál a visszaírás nem éri meg a plusz kattintást).
  useEffect(() => {
    if (open) {
      setHuNev('');
      setDeNev('');
      setKategoriaId('');
      setMegprobaltMenteni(false);
    }
  }, [open]);

  const huNevHiba = megprobaltMenteni && !huNev.trim() ? 'A megnevezés nem lehet üres.' : null;
  const kategoriaHiba = megprobaltMenteni && !kategoriaId ? 'Válassz kategóriát.' : null;

  // Ékezetfüggetlen, PONTOS egyezés -- nem blokkol, csak jelez. Aktív ÉS
  // inaktív tételt is számít: egy inaktív tétel bármikor visszakapcsolható
  // (D17), ezért hasznosabb üzenet, hogy talán azt kellene visszakapcsolni,
  // nem újra felvinni ugyanazt a nevet.
  const nevTrim = huNev.trim();
  const duplikatum = nevTrim ? tetelek.find((x) => norm(x.nev.hu) === norm(nevTrim)) : undefined;

  function handleSubmit() {
    setMegprobaltMenteni(true);
    if (!huNev.trim() || !kategoriaId) return;
    onSave(huNev.trim(), deNev.trim() || null, kategoriaId);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Új tétel</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          A további adatok (ár, ártípus, EUR ár, gyakori, aktív) a mentés után a
          listában kinyíló sorban szerkeszthetők.
        </Dialog.Description>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Box mt="4" mb="3">
            <Field label="Megnevezés (magyar) *">
              <TextField.Root
                autoFocus
                value={huNev}
                onChange={(e) => setHuNev(e.target.value)}
                aria-invalid={huNevHiba ? true : undefined}
                style={huNevHiba ? { boxShadow: `inset 0 0 0 1px ${t.danger}` } : undefined}
              />
            </Field>
            {huNevHiba && (
              <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
                {huNevHiba}
              </Text>
            )}
            {!huNevHiba && duplikatum && (
              <Text as="div" size="1" mt="1" style={{ color: t.warn }}>
                {duplikatum.aktiv
                  ? 'Már van ilyen nevű tétel a listában.'
                  : 'Már van ilyen nevű, inaktív tétel a listában -- lehet, hogy inkább azt kellene visszakapcsolni.'}
              </Text>
            )}
          </Box>

          <Box mb="3">
            <Field label="Bezeichnung (német)">
              <TextField.Root
                value={deNev}
                placeholder="még nincs megadva"
                onChange={(e) => setDeNev(e.target.value)}
              />
            </Field>
          </Box>

          <Box>
            <Field label="Kategória *">
              <Select.Root value={kategoriaId || undefined} onValueChange={setKategoriaId}>
                <Select.Trigger
                  placeholder="Válassz kategóriát…"
                  style={{
                    width: '100%',
                    ...(kategoriaHiba ? { boxShadow: `inset 0 0 0 1px ${t.danger}` } : {}),
                  }}
                />
                <Select.Content>
                  {kategoriak.map((k) => (
                    <Select.Item key={k.id} value={k.id}>
                      <Flex as="span" align="center" gap="2">
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: k.szin ?? ALAP_KATEGORIA_SZIN,
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        {k.nev.hu}
                      </Flex>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
            {kategoriaHiba && (
              <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
                {kategoriaHiba}
              </Text>
            )}
          </Box>

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
