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
import { javasoltTervCim, URESEN_MENTVE_SUGO } from '../../domain/tervCim';
import { useMentesJelzo } from '../../components/useMentesJelzo';
import { useAppState } from '../../state/AppState';
import { useStorage } from '../../storage/StorageContext';
import { fokuszra } from './enterFokusz';

/** A lánc következő tagja a Terv adatai lapon (PatientPage.tsx "Név *"). */
const KOVETKEZO_MEZO_ID = 'paciens-nev';

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const jelzo = useMentesJelzo();

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

  /** `true`, ha a címke ténylegesen kiíródott -- az Enter csak ekkor lép tovább. */
  async function handleSave(): Promise<boolean> {
    if (!ref) return false;
    setSaveError(null);
    try {
      await jelzo.futtat(async () => {
        await storage.savePlanLabel(ref.patientDir, ref.planDir, value);
        const trimmed = value.trim();
        setMentettLabel(trimmed || null);
        jelezTervCim(trimmed);
      });
      return true;
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? `A címke mentése nem sikerült: ${err.message}`
          : 'A címke mentése váratlanul meghiúsult.',
      );
      return false;
    }
  }

  // Sikertelen mentésnél a fókusz a mezőben marad -- a hibaüzenet közvetlenül
  // alatta jelenik meg, az elugró fókusz elvágná az összefüggést.
  function handleEnter() {
    if (jelzo.saving) return;
    if (!dirty) {
      fokuszra(KOVETKEZO_MEZO_ID);
      return;
    }
    void handleSave().then((sikerult) => {
      if (sikerult) fokuszra(KOVETKEZO_MEZO_ID);
    });
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
            if (e.key !== 'Enter') return;
            e.preventDefault();
            handleEnter();
          }}
          placeholder={placeholder}
          style={{ minWidth: 260, flex: '1 1 260px' }}
        />
        {dirty && (
          <Button
            type="button"
            variant="soft"
            disabled={jelzo.saving}
            onClick={() => void handleSave()}
          >
            {jelzo.saving ? 'Mentés…' : 'Mentés'}
          </Button>
        )}
        {jelzo.saved && (
          <Text size="1" color="gray" style={{ alignSelf: 'center' }}>
            Mentve ✓
          </Text>
        )}
      </Flex>
      <Text as="div" size="1" color="gray" mt="1">
        {isNewChain
          ? 'Üresen a legnagyobb összegű kategória neve lesz a cím (pl. »Korona és hídpótlások«) — a véglegesítéskor rögzül.'
          : URESEN_MENTVE_SUGO}
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
