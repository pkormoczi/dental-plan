// "Terv címe" mező -- backlog-51. Két írási útvonal a lánc állapotától
// függően:
//
// - MÁR MENTETT lánc (`plan.tervId !== ''`): a mező a `terv-cimke.json`
//   tartalmát mutatja (`feloldTervCimke`, domain/torzsadatBetoltes.ts), és
//   AZONNAL ír `storage.savePlanLabel`-lel, amint a beírt érték eltér a
//   tároltól -- ugyanaz a mechanizmus, mint a `PatientPlanChains.tsx`
//   ceruza-ikonja (`saveLabel`), csak egy második belépési ponttal.
// - VADONATÚJ lánc (`plan.tervId === ''`): nincs hova írni (`savePlanLabel`
//   patientDir+planDir-t igényel) -- a beírt érték a `DraftMeta.tervCim`-ben
//   (AppState `jelezTervCim`) él, túléli a navigációt, és a `PreviewPage.tsx`
//   `doFinalize()`-ja írja ki véglegesítéskor.
//
// A megjelenített érték `piszkozatTervCim ?? mentettLabel ?? ''` -- olvasási
// lánc, NEM egy induló `jelezTervCim(stored)` seed-írás. Ez szünteti meg a
// versenyt a doki épp begépelt (navigációt túlélt) értéke és a storage-ból
// frissen betöltött címke között.

import { useEffect, useState } from 'react';
import { Box, Button, Callout, Flex, Skeleton, Text, TextField } from '@radix-ui/themes';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { feloldTervCimke } from '../../domain/torzsadatBetoltes';
import { javasoltTervCim } from '../../domain/tervCim';
import { useAppState } from '../../state/AppState';
import { useStorage } from '../../storage/StorageContext';

interface SavedRef {
  patientDir: string;
  planDir: string;
}

export default function TervCimField() {
  const { plan, priceList, piszkozatPatientDir, piszkozatTervCim, jelezTervCim } = useAppState();
  const { storage } = useStorage();

  const isNewChain = plan.tervId === '';

  const [ref, setRef] = useState<SavedRef | null>(null);
  // `undefined` = még nem próbáltuk feloldani; `null` = feloldva, nincs
  // mentett cím (vagy a lánc/mappa nem oldható fel -- ugyanaz az ág, mint a
  // TorzsadatSyncCard `torzsadat === null` fallback-ja).
  const [mentettLabel, setMentettLabel] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isNewChain) {
      setRef(null);
      setMentettLabel(null);
      return;
    }
    let cancelled = false;
    setMentettLabel(undefined);
    (async () => {
      const cimke = await feloldTervCimke(storage, piszkozatPatientDir, plan.paciensId, plan.tervId);
      if (cancelled) return;
      if (!cimke) {
        setRef(null);
        setMentettLabel(null);
        return;
      }
      setRef({ patientDir: cimke.patientDir, planDir: cimke.planDir });
      setMentettLabel(cimke.tervCim);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, piszkozatPatientDir, plan.paciensId, plan.tervId, isNewChain]);

  const placeholder = javasoltTervCim(plan, priceList);
  const value = piszkozatTervCim ?? mentettLabel ?? '';
  const loading = !isNewChain && mentettLabel === undefined;
  const dirty = !isNewChain && mentettLabel !== undefined && value.trim() !== (mentettLabel ?? '').trim();

  async function handleSave() {
    if (!ref) return;
    setSaving(true);
    setSaveError(null);
    try {
      await storage.savePlanLabel(ref.patientDir, ref.planDir, value);
      const trimmed = value.trim();
      setMentettLabel(trimmed || null);
      jelezTervCim(trimmed);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? `A címke mentése nem sikerült: ${err.message}`
          : 'A címke mentése váratlanul meghiúsult.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Skeleton>
        <Box height="32px" style={{ maxWidth: 380 }} />
      </Skeleton>
    );
  }

  return (
    <Box>
      <Flex gap="2" align="start" wrap="wrap">
        <TextField.Root
          id="terv-cime"
          aria-label="Terv címe"
          value={value}
          onChange={(e) => jelezTervCim(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && dirty && !saving) void handleSave();
          }}
          placeholder={placeholder}
          style={{ minWidth: 260, flex: '1 1 260px' }}
        />
        {dirty && (
          <Button type="button" variant="soft" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Mentés…' : 'Mentés'}
          </Button>
        )}
      </Flex>
      <Text as="div" size="1" color="gray" mt="1">
        {isNewChain
          ? 'Üresen a domináns kategória neve lesz a cím — a véglegesítéskor rögzül.'
          : 'Üresen mentve visszaáll az automatikus javaslatra.'}
      </Text>
      {saveError && (
        <Callout.Root color="red" size="1" mt="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{saveError}</Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
}
