// A páciens-törzsadat (paciens-adatok.json, D33) és a terv-piszkozat
// paciens-blokkja közötti mezőszintű összevető/szinkronizáló dialógus --
// backlog-40 (redesign DP-016). Radix Themes `Dialog`, NEM `AlertDialog`
// (docs/07-felulet-rendszer.md "Mezős felugró ablak"): a checkbox-táblázat
// tényleges mezőválasztás, nem puszta megerősítés.
//
// HÁROM hívási móddal fut ugyanaz a komponens:
//  - master→draft (a "Frissítés a törzsadatból" kártya-gomb, szinkron,
//    `onApplyToDraft` -- nem hibázhat, a `setPlan` sosem dob)
//  - draft→master, kézi (a "Törzsadat frissítése a tervből" kártya-gomb,
//    async, `onApplyToMaster`, `onSkip` nélkül)
//  - draft→master, lépés-elhagyási AJÁNLAT (`components/LepesGuardContext.tsx`
//    -- `onApplyToMaster` ÉS `onSkip` is adott): a dialógus bezárása
//    (Escape/X/a "Kihagyás" gomb) NEM puszta bezárás, hanem a workflow
//    továbblépését is jelenti -- innen az `onSkip`, ami a `onOpenChange`-
//    en és a "Mégse" gombon is átveszi a vezérlést, lásd lent.
//
// Íráshiba (5. döntés, D214) csak a draft→master irányban fordulhat elő
// (master→draft egy szinkron `setPlan`, sosem dob) -- a dialógus NYITVA
// marad, "Újra" újrapróbálja UGYANAZT az írást, a másik gomb (skip módban
// "Folytatás írás nélkül", egyébként "Mégse") a draftot érintetlenül hagyva
// zár/lép tovább.

import { useEffect, useState } from 'react';
import { Box, Button, Callout, Checkbox, Dialog, Flex, Table, Text } from '@radix-ui/themes';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { alkalmazMezoket, mezoErtekSzoveg, type MezoElteres } from '../domain/masterSnapshotDiff';
import { t } from '../design/tokens';
import type { Paciens } from '../domain/types';

export type TorzsadatDiffIrany = 'master-to-draft' | 'draft-to-master';

export interface TorzsadatDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  irany: TorzsadatDiffIrany;
  elteresek: MezoElteres[];
  master: Paciens;
  draft: Paciens;
  /** `irany === 'master-to-draft'`-nál kötelező -- a kijelölt mezőkkel frissített `Paciens`-t adja a hívónak, `setPlan`-hez. */
  onApplyToDraft?: (next: Paciens) => void;
  /** `irany === 'draft-to-master'`-nél kötelező -- a storage-írás, hibázhat. */
  onApplyToMaster?: (next: Paciens) => Promise<void>;
  /** Csak a lépés-elhagyási AJÁNLAT módban adott -- lásd a fájl fejlécét. */
  onSkip?: () => void;
}

export default function TorzsadatDiffDialog({
  open,
  onOpenChange,
  irany,
  elteresek,
  master,
  draft,
  onApplyToDraft,
  onApplyToMaster,
  onSkip,
}: TorzsadatDiffDialogProps) {
  const [kijelolt, setKijelolt] = useState<Set<keyof Paciens>>(new Set());
  const [nincsKijelolveNotice, setNincsKijelolveNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Minden megnyitáskor tiszta lappal indul -- D10/D159: alapból SEMMI
  // nincs kijelölve.
  useEffect(() => {
    if (open) {
      setKijelolt(new Set());
      setNincsKijelolveNotice(false);
      setSaveError(null);
    }
  }, [open]);

  const cel = irany === 'master-to-draft' ? draft : master;
  const forras = irany === 'master-to-draft' ? master : draft;

  function toggleMezo(kulcs: keyof Paciens) {
    setKijelolt((prev) => {
      const next = new Set(prev);
      if (next.has(kulcs)) next.delete(kulcs);
      else next.add(kulcs);
      return next;
    });
  }

  async function alkalmaz() {
    if (kijelolt.size === 0) {
      setNincsKijelolveNotice(true);
      return;
    }
    setNincsKijelolveNotice(false);
    const next = alkalmazMezoket(cel, forras, [...kijelolt]);
    if (irany === 'master-to-draft') {
      onApplyToDraft?.(next);
      onOpenChange(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onApplyToMaster?.(next);
      // Lépés-elhagyási AJÁNLAT módban a sikeres írás UTÁN is a workflow
      // folytatása a cél, nem a puszta bezárás -- `onSkip` végzi mindkettőt.
      if (onSkip) onSkip();
      else onOpenChange(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
    } finally {
      setSaving(false);
    }
  }

  const cim =
    irany === 'master-to-draft'
      ? 'Frissítés a törzsadatból'
      : onSkip
        ? 'Mielőtt továbblépsz — törzsadat eltérés'
        : 'Törzsadat frissítése a tervből';
  const leiras =
    irany === 'master-to-draft'
      ? 'Jelöld ki, mely mezőket vegye át a piszkozat a páciens törzsadatából.'
      : 'Jelöld ki, mely mezőkkel frissüljön a páciens törzsadata a terv adataiból.';
  const primaryLabel =
    irany === 'master-to-draft' ? 'Frissítés a piszkozatban' : onSkip ? 'Frissítés és tovább' : 'Törzsadat mentése';
  const masodlagosGomb = onSkip
    ? { label: saveError ? 'Folytatás írás nélkül' : 'Kihagyás, tovább lépek', onClick: onSkip }
    : { label: 'Mégse', onClick: () => onOpenChange(false) };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        // Skip módban a bezárás (Escape/X) ugyanaz, mint a "Kihagyás" gomb --
        // a prompt csak azért nyílt, mert a doki navigálni próbált, egy
        // néma "close" nem hagyhatja a workflow-t se itt, se ott.
        if (!o && onSkip) {
          onSkip();
          return;
        }
        onOpenChange(o);
      }}
    >
      <Dialog.Content maxWidth="560px">
        <Dialog.Title>{cim}</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          {leiras}
        </Dialog.Description>

        <Flex justify="end" mt="3" mb="1">
          <Text as="label" size="1" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Checkbox
              checked={elteresek.length > 0 && kijelolt.size === elteresek.length}
              onCheckedChange={(checked) =>
                setKijelolt(checked === true ? new Set(elteresek.map((e) => e.kulcs)) : new Set())
              }
            />
            Összes kijelölése
          </Text>
        </Flex>

        <Box style={{ border: `1px solid ${t.uiLine}`, borderRadius: t.radius, overflow: 'hidden' }}>
          <Table.Root size="1">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell width="32px" />
                <Table.ColumnHeaderCell>Mező</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Törzsadat</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Terv adata</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {elteresek.map((e) => (
                <Table.Row key={e.kulcs}>
                  <Table.Cell>
                    <Checkbox
                      checked={kijelolt.has(e.kulcs)}
                      onCheckedChange={() => toggleMezo(e.kulcs)}
                      aria-label={e.cimke}
                    />
                  </Table.Cell>
                  <Table.Cell>{e.cimke}</Table.Cell>
                  <Table.Cell>{mezoErtekSzoveg(master, e.kulcs) || '—'}</Table.Cell>
                  <Table.Cell>{mezoErtekSzoveg(draft, e.kulcs) || '—'}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>

        {nincsKijelolveNotice && (
          <Text as="div" size="1" mt="2" style={{ color: t.warn }}>
            Jelölj ki legalább egy mezőt.
          </Text>
        )}

        {saveError && (
          <Callout.Root color="red" size="1" mt="3">
            <Callout.Icon>
              <CrossCircledIcon />
            </Callout.Icon>
            <Callout.Text>{saveError}</Callout.Text>
          </Callout.Root>
        )}

        <Flex gap="3" mt="4" justify="end">
          <Button
            type="button"
            variant="soft"
            color="gray"
            disabled={saving}
            onClick={masodlagosGomb.onClick}
          >
            {masodlagosGomb.label}
          </Button>
          <Button onClick={() => void alkalmaz()} disabled={saving}>
            {saveError ? 'Újra' : saving ? 'Mentés…' : primaryLabel}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
