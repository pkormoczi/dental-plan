// Köztes kereső/választó lépés a Home "Új terv indítása" gombja után (D29,
// docs/03-funkcionalis-spec.md § Új terv indítása). A Korábbi tervek oldal
// saját "Új terv"/"Másolás új tervbe" gombjai NEM ide navigálnak -- azoknál
// a célpáciens már adott a forrás tervből, nincs kétértelműség.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { t } from '../design/tokens';
import { norm } from '../domain/search';
import type { PatientFolder } from '../domain/types';
import { useAppState } from '../state/AppState';
import { ujTervForrasPaciensbol } from '../state/planIndulas';
import { useStorage } from '../storage/StorageContext';

type PendingAction = { kind: 'existing'; patient: PatientFolder } | { kind: 'new' };

export default function NewPlanPage() {
  const { storage } = useStorage();
  const { settings, priceList, resetPlanDraft, copyPlanIntoDraft, vanMentetlenPiszkozat } =
    useAppState();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [selectingDir, setSelectingDir] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setListError(null);
      try {
        const list = await storage.listPatients();
        if (!cancelled) setPatients(list);
      } catch (err) {
        if (!cancelled) {
          setListError(
            err instanceof Error ? err.message : 'A páciensek listázása váratlanul meghiúsult.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const filtered = patients
    .filter((p) => !q.trim() || norm(p.nev).includes(norm(q)))
    .sort((a, b) => a.nev.localeCompare(b.nev));

  // A páciens ELÉRHETŐ legjobb adataiból tölti elő a Páciens adatlapot: a
  // lezárt törzsadatból (paciens-adatok.json, D33), ha van, egyébként a
  // LEGUTÓBB MÓDOSÍTOTT terv-lánc legfrissebb verziójából -- ugyanaz a
  // közös kiválasztás, mint a PlanHistoryPage páciensszintű "Új terv"
  // gombjáé (state/planIndulas.ts).
  async function selectExistingPatient(patient: PatientFolder) {
    setSelectError(null);
    setSelectingDir(patient.dirName);
    try {
      const next = await ujTervForrasPaciensbol(storage, settings, priceList, patient.dirName);
      copyPlanIntoDraft(next, patient.dirName);
      navigate('/paciens');
    } catch (err) {
      setSelectError(
        err instanceof Error
          ? `A páciens adatainak átvétele nem sikerült: ${err.message}`
          : 'A páciens adatainak átvétele váratlanul meghiúsult.',
      );
    } finally {
      setSelectingDir(null);
    }
  }

  function startBrandNewPatient() {
    resetPlanDraft();
    navigate('/paciens');
  }

  function runOrConfirm(action: PendingAction) {
    if (vanMentetlenPiszkozat) {
      setPending(action);
      return;
    }
    dispatchPending(action);
  }

  function dispatchPending(action: PendingAction) {
    if (action.kind === 'existing') {
      void selectExistingPatient(action.patient);
    } else {
      startBrandNewPatient();
    }
  }

  const pendingSpecs: Record<PendingAction['kind'], { description: string; actionLabel: string }> = {
    existing: {
      description:
        'Van mentetlen piszkozatod. Ha ennek a páciensnek az adataival új tervet indítasz, a ' +
        'jelenlegi piszkozat elvész -- nem került fájlba, csak ebben a böngészőben volt meg. ' +
        'Biztosan folytatod?',
      actionLabel: 'Folytatás, piszkozat elvetésével',
    },
    new: {
      description:
        'Van mentetlen piszkozatod. Ha új tervet indítasz, ez elvész -- nem került fájlba, ' +
        'csak ebben a böngészőben volt meg. Biztosan új tervvel kezded?',
      actionLabel: 'Elvetés és új terv',
    },
  };

  return (
    <Box style={{ maxWidth: 640, margin: '0 auto' }}>
      <Heading size="5" mb="1" style={{ color: t.brand }}>
        Új terv indítása
      </Heading>
      <Text as="p" size="2" color="gray" mb="4">
        Visszatérő páciensnél kereséssel átveheted a mentett adatait, hogy ne kelljen
        újragépelni — vagy indíts egy teljesen vadonatúj tervet.
      </Text>

      {selectError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{selectError}</Callout.Text>
        </Callout.Root>
      )}

      <Card size="2" mb="4">
        <Text as="p" size="2" weight="bold" mb="2">
          Meglévő páciens keresése…
        </Text>
        <TextField.Root
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Páciens neve…"
          aria-label="Meglévő páciens keresése"
          mb="3"
        />
        {listError && (
          <Callout.Root color="red" mb="3">
            <Callout.Icon>
              <CrossCircledIcon />
            </Callout.Icon>
            <Callout.Text>A lista betöltése nem sikerült: {listError}</Callout.Text>
          </Callout.Root>
        )}
        {loading && (
          <Text as="p" size="2" color="gray">
            Betöltés…
          </Text>
        )}
        {!loading && !listError && patients.length === 0 && (
          <Text as="p" size="2" color="gray">
            Még nincs mentett terv, akihez visszatérhetnél.
          </Text>
        )}
        {!loading && !listError && patients.length > 0 && filtered.length === 0 && (
          <Text as="p" size="2" color="gray">
            Nincs találat erre: „{q}”.
          </Text>
        )}
        {!loading && !listError && filtered.length > 0 && (
          <Flex direction="column" gap="1">
            {filtered.map((p) => (
              <Button
                key={p.dirName}
                type="button"
                variant="soft"
                color="gray"
                disabled={selectingDir === p.dirName}
                onClick={() => runOrConfirm({ kind: 'existing', patient: p })}
                style={{ justifyContent: 'flex-start' }}
              >
                {p.nev}
              </Button>
            ))}
          </Flex>
        )}
      </Card>

      <Button size="3" variant="soft" color="gray" onClick={() => runOrConfirm({ kind: 'new' })}>
        Vadonatúj páciens
      </Button>

      <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Piszkozat felülírása</AlertDialog.Title>
          <AlertDialog.Description size="2">
            {pending && pendingSpecs[pending.kind].description}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                color="red"
                onClick={() => {
                  if (pending) dispatchPending(pending);
                  setPending(null);
                }}
              >
                {pending && pendingSpecs[pending.kind].actionLabel}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
