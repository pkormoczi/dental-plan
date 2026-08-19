// "Páciens törzsadata" kártya -- backlog-40 (redesign DP-016), a Páciens
// adatlap Személyes adatok kártyája ALATT (docs/03-funkcionalis-spec.md §
// 2. Páciens adatlap). A D33 invariánsa (nincs automatikus szinkron)
// változatlan: ez a kártya KÉT külön, explicit irányú műveletet ad --
// "Frissítés a törzsadatból" (master -> draft) és "Törzsadat frissítése a
// tervből" (draft -> master), soha nem egy közös "Szinkronizálás" gomb
// (D160) -- plusz a lépés-elhagyáskor (a "Tovább" gomb, `PatientPage.tsx`)
// egyszer felkínált ajánlatot (D161, `components/LepesGuardContext.tsx`).
//
// Ha a `patientDir` nem oldható fel (`domain/torzsadatBetoltes.ts`
// `feloldPatientDir`), a kártya EGYÁLTALÁN NEM renderelődik -- nincs mihez
// hasonlítani a draftot.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertDialog, Box, Button, Callout, Card, Checkbox, Flex, Text } from '@radix-ui/themes';
import { CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import TorzsadatDiffDialog from '../../components/TorzsadatDiffDialog';
import { useLepesElhagyas, useLepesGuard } from '../../components/LepesGuardContext';
import { t } from '../../design/tokens';
import { diffAzonosito, masterSnapshotDiff, valodiUtkozesek } from '../../domain/masterSnapshotDiff';
import { paciensTorzsadatbol, torzsadatTervbol } from '../../domain/paciensAdatok';
import { feloldPatientDir } from '../../domain/torzsadatBetoltes';
import type { Paciens, PatientMasterData } from '../../domain/types';
import { useAppState } from '../../state/AppState';
import { useStorage } from '../../storage/StorageContext';

type ManualDialog = 'master-to-draft' | 'draft-to-master' | null;

export default function TorzsadatSyncCard() {
  const { plan, setPlan, piszkozatPatientDir } = useAppState();
  const { storage } = useStorage();
  const { elutasitottDiffId, setElutasitottDiffId } = useLepesGuard();

  const [patientDir, setPatientDir] = useState<string | null>(null);
  const [paciensId, setPaciensId] = useState<string | null>(null);
  // `undefined` = még nem próbáltuk betölteni; `null` = betöltve, nincs lezárt törzsadat (fallback).
  const [torzsadat, setTorzsadat] = useState<PatientMasterData | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [manualDialog, setManualDialog] = useState<ManualDialog>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [lepesPromptOpen, setLepesPromptOpen] = useState(false);
  const [letrehozasPromptOpen, setLetrehozasPromptOpen] = useState(false);
  const [letrehozzaMost, setLetrehozzaMost] = useState(false);
  const [letrehozasFolyamatban, setLetrehozasFolyamatban] = useState(false);
  const [letrehozasHiba, setLetrehozasHiba] = useState<string | null>(null);
  const proceedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dir = await feloldPatientDir(storage, piszkozatPatientDir, plan.paciensId);
      if (cancelled) return;
      setPatientDir(dir);
      if (!dir) return;
      try {
        const [data, patients] = await Promise.all([storage.loadPatientData(dir), storage.listPatients()]);
        if (cancelled) return;
        setTorzsadat(data);
        setPaciensId(plan.paciensId ?? patients.find((p) => p.dirName === dir)?.paciensId ?? null);
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'A törzsadat betöltése váratlanul meghiúsult.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // A `plan.paciens`-t (szerkesztés közben minden leütésre változó
    // mezőket) SZÁNDÉKOSAN nem tesszük dependency-vé -- csak az AZONOSÍTÓ
    // (patientDir/paciensId) változása indokol újratöltést.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, piszkozatPatientDir, plan.paciensId]);

  const master = torzsadat ? paciensTorzsadatbol(torzsadat) : null;
  const elteresek = master ? masterSnapshotDiff(master, plan.paciens) : [];
  const diffId = master ? diffAzonosito(elteresek, master, plan.paciens) : null;
  // A lépés-elhagyási prompt csak VALÓDI ütközésnél szól -- lásd
  // `valodiUtkozesek` doc-kommentjét (a kártya gombjai/dialógusa a TELJES
  // `elteresek`-kel dolgozik, ez csak a megszakítás-döntéshez szűkít).
  const utkozesek = master ? valodiUtkozesek(elteresek, master, plan.paciens) : [];

  function applyToDraft(next: Paciens) {
    setPlan((prev) => ({ ...prev, paciens: next }));
  }

  const writeMaster = useCallback(
    async (next: Paciens) => {
      if (!patientDir) throw new Error('Ismeretlen páciensmappa.');
      const toSave: PatientMasterData = {
        schemaVersion: 1,
        paciensId: torzsadat?.paciensId ?? paciensId ?? '',
        ...next,
      };
      await storage.savePatientData(patientDir, toSave);
      setTorzsadat(toSave);
    },
    [storage, patientDir, torzsadat, paciensId],
  );

  const createMasterFromDraft = useCallback(async () => {
    if (!patientDir) throw new Error('Ismeretlen páciensmappa.');
    if (!paciensId) throw new Error('Ismeretlen páciensazonosító.');
    const toSave = torzsadatTervbol(plan.paciens, paciensId);
    await storage.savePatientData(patientDir, toSave);
    setTorzsadat(toSave);
  }, [storage, patientDir, paciensId, plan.paciens]);

  async function handleManualCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      await createMasterFromDraft();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'A törzsadat létrehozása váratlanul meghiúsult.');
    } finally {
      setCreating(false);
    }
  }

  function runProceed() {
    const proceed = proceedRef.current;
    proceedRef.current = null;
    proceed?.();
  }

  function skipLepesPrompt() {
    setLepesPromptOpen(false);
    if (diffId !== null) setElutasitottDiffId(diffId);
    runProceed();
  }

  function skipLetrehozasPrompt() {
    setLetrehozasPromptOpen(false);
    setLetrehozzaMost(false);
    setLetrehozasHiba(null);
    runProceed();
  }

  async function confirmLetrehozasPrompt() {
    if (!letrehozzaMost) {
      skipLetrehozasPrompt();
      return;
    }
    setLetrehozasFolyamatban(true);
    setLetrehozasHiba(null);
    try {
      await createMasterFromDraft();
      skipLetrehozasPrompt();
    } catch (err) {
      setLetrehozasHiba(err instanceof Error ? err.message : 'A törzsadat létrehozása váratlanul meghiúsult.');
    } finally {
      setLetrehozasFolyamatban(false);
    }
  }

  // backlog-40 (3. döntés, D161): a "Terv adatai" lépés ELŐRE elhagyásakor
  // (csak amíg ez a kártya mountolva van, lásd LepesGuardContext.tsx fejlécét)
  // vagy a fallback-létrehozás ajánlatát, vagy a diff-promptot nyitja meg --
  // sosem mindkettőt egyszerre, a törzsadat léte dönti el, melyiket.
  const handleLepesElhagyas = useCallback(
    (proceed: () => void): boolean => {
      if (torzsadat === null && !loadError) {
        proceedRef.current = proceed;
        setLetrehozzaMost(false);
        setLetrehozasHiba(null);
        setLetrehozasPromptOpen(true);
        return true;
      }
      if (utkozesek.length === 0) return false;
      if (diffId === elutasitottDiffId) return false;
      proceedRef.current = proceed;
      setLepesPromptOpen(true);
      return true;
    },
    [torzsadat, loadError, utkozesek.length, diffId, elutasitottDiffId],
  );

  useLepesElhagyas(patientDir ? handleLepesElhagyas : null);

  if (!patientDir) return null;

  return (
    <Card size="2" mb="4">
      <Text as="p" size="2" weight="bold" mb="3" style={{ color: t.brand }}>
        Páciens törzsadata
      </Text>

      {loadError && (
        <Callout.Root color="gray" size="1">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>A törzsadat betöltése nem sikerült: {loadError}</Callout.Text>
        </Callout.Root>
      )}

      {!loadError && torzsadat === undefined && (
        <Text size="2" color="gray">
          Betöltés…
        </Text>
      )}

      {!loadError && torzsadat === null && (
        <Box>
          <Callout.Root color="gray" size="1" mb="3">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Ennek a páciensnek még nincs önálló törzsadata -- a mentés a legutóbb mentett terv
              adataiból hoz létre egyet, a most a lapon látott mezőkkel.
            </Callout.Text>
          </Callout.Root>
          {createError && (
            <Text as="div" size="1" mb="2" style={{ color: t.danger }}>
              {createError}
            </Text>
          )}
          <Button
            size="1"
            variant="soft"
            disabled={creating}
            onClick={() => void handleManualCreate()}
          >
            {creating ? 'Létrehozás…' : 'Törzsadat létrehozása a terv adataiból'}
          </Button>
        </Box>
      )}

      {!loadError && master && (
        <Box>
          {elteresek.length === 0 ? (
            <Text size="2" color="gray">
              A törzsadat és a terv adatai megegyeznek.
            </Text>
          ) : (
            <>
              <Text as="p" size="2" color="gray" mb="3">
                {elteresek.length} mező eltér a páciens törzsadatától.
              </Text>
              <Flex gap="2" wrap="wrap">
                <Button size="1" variant="soft" onClick={() => setManualDialog('master-to-draft')}>
                  Frissítés a törzsadatból
                </Button>
                <Button size="1" variant="soft" onClick={() => setManualDialog('draft-to-master')}>
                  Törzsadat frissítése a tervből
                </Button>
              </Flex>
            </>
          )}

          <TorzsadatDiffDialog
            open={manualDialog !== null}
            onOpenChange={(o) => !o && setManualDialog(null)}
            irany={manualDialog ?? 'draft-to-master'}
            elteresek={elteresek}
            master={master}
            draft={plan.paciens}
            onApplyToDraft={applyToDraft}
            onApplyToMaster={writeMaster}
          />

          <TorzsadatDiffDialog
            open={lepesPromptOpen}
            onOpenChange={(o) => !o && skipLepesPrompt()}
            irany="draft-to-master"
            elteresek={elteresek}
            master={master}
            draft={plan.paciens}
            onApplyToMaster={writeMaster}
            onSkip={skipLepesPrompt}
          />
        </Box>
      )}

      <AlertDialog.Root
        open={letrehozasPromptOpen}
        onOpenChange={(o) => !o && skipLetrehozasPrompt()}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Törzsadat létrehozása</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Ennek a páciensnek még nincs önálló törzsadata -- a mezők egyelőre a terv adataiból
            látszanak. Létrehozod most, a lapon jelenleg látott adatokból?
          </AlertDialog.Description>
          <Text as="label" size="2" mt="3" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Checkbox
              checked={letrehozzaMost}
              onCheckedChange={(checked) => setLetrehozzaMost(checked === true)}
            />
            Törzsadat létrehozása most
          </Text>
          {letrehozasHiba && (
            <Callout.Root color="red" size="1" mt="3">
              <Callout.Icon>
                <CrossCircledIcon />
              </Callout.Icon>
              <Callout.Text>{letrehozasHiba}</Callout.Text>
            </Callout.Root>
          )}
          <Flex gap="3" mt="4" justify="end">
            <Button
              type="button"
              variant="soft"
              color="gray"
              disabled={letrehozasFolyamatban}
              onClick={skipLetrehozasPrompt}
            >
              Kihagyás, tovább lépek
            </Button>
            <Button disabled={letrehozasFolyamatban} onClick={() => void confirmLetrehozasPrompt()}>
              {letrehozasFolyamatban ? 'Létrehozás…' : letrehozasHiba ? 'Újra' : 'Tovább'}
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Card>
  );
}
