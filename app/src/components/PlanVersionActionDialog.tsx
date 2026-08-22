// A verzió-linkelt akciók (Új verzió / Másolás új tervbe / Új terv) React-
// rétege -- a tiszta döntési logikát (`domain/planVersionActions.ts`)
// storage/AppState/navigáció-kontextusra kötve, ÉS a hozzá tartozó
// piszkozat-felülírás-őr `AlertDialog`-ot EGY fájlban adja, a
// `DiscardChangesDialog.tsx` hook+komponens mintáján. Két hívója van: a
// `PatientPlanChains.tsx` verziósora és a `pages/TervReszleteiPage.tsx` —
// mindkettő ugyanazt a szöveget/feltételt kapja, nincs második,
// függetlenül karbantartott másolat.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, Button, Flex } from '@radix-ui/themes';
import {
  kellMegerosites,
  megerositesTartalom,
  type PendingAction,
  type VersionRef,
} from '../domain/planVersionActions';
import { planMasolatKent } from '../domain/planCopy';
import { todayIso } from '../domain/date';
import { useAppState } from '../state/AppState';
import { ujTervForrasPaciensbol } from '../state/planIndulas';
import { useStorage } from '../storage/StorageContext';

export interface VerzioAkcioHiba {
  /** `null`/`null` = nem sorhoz kötött hiba -- a hívó dönti el, hol jeleníti meg. */
  planDir: string | null;
  versionDir: string | null;
  message: string;
}

export interface PlanVersionActions {
  hiba: VerzioAkcioHiba | null;
  /** A hívó SAJÁT (nem megosztott) akciói -- pl. `downloadVersion` -- ugyanide írnak. */
  jelezHiba: (hiba: VerzioAkcioHiba | null) => void;
  /** Megerősítést kér, ha kell -- egyébként azonnal fut. */
  inditas: (action: PendingAction) => void;
  pending: PendingAction | null;
  zar: () => void;
  megerosit: () => void;
}

export function usePlanVersionActions(patientDir: string): PlanVersionActions {
  const { storage } = useStorage();
  const { settings, priceList, loadPlanIntoDraft, copyPlanIntoDraft, vanMentetlenPiszkozat } =
    useAppState();
  const navigate = useNavigate();

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [hiba, setHiba] = useState<VerzioAkcioHiba | null>(null);

  async function openVersion(ref: VersionRef) {
    setHiba(null);
    try {
      const plan = await storage.loadPlan({ patientDir, planDir: ref.planDir, versionDir: ref.versionDir });
      loadPlanIntoDraft(plan, patientDir);
      navigate('/terv');
    } catch (err) {
      setHiba({
        ...ref,
        message:
          err instanceof Error
            ? `A terv megnyitása nem sikerült: ${err.message}`
            : 'A terv megnyitása váratlanul meghiúsult.',
      });
    }
  }

  async function copyVersion(ref: VersionRef) {
    setHiba(null);
    try {
      // A paciens blokkot az ÉLŐ törzsadatból frissítjük, nem a forrás
      // verzió pillanatképéből -- olvashatatlan (sérült/magasabb-verziójú)
      // törzsadatnál a loadPatientData dob, a másolás nem fut le, a catch
      // ág jelzi (nincs néma visszaesés régi adatra).
      const [plan, master] = await Promise.all([
        storage.loadPlan({ patientDir, planDir: ref.planDir, versionDir: ref.versionDir }),
        storage.loadPatientData(patientDir),
      ]);
      copyPlanIntoDraft(planMasolatKent(plan, settings, todayIso(), master, priceList), patientDir);
      navigate('/paciens');
    } catch (err) {
      setHiba({
        ...ref,
        message:
          err instanceof Error ? `A másolás nem sikerült: ${err.message}` : 'A másolás váratlanul meghiúsult.',
      });
    }
  }

  async function ujTervPaciensAdataival() {
    setHiba(null);
    try {
      const next = await ujTervForrasPaciensbol(storage, settings, priceList, patientDir);
      copyPlanIntoDraft(next, patientDir);
      navigate('/paciens');
    } catch (err) {
      setHiba({
        planDir: null,
        versionDir: null,
        message:
          err instanceof Error
            ? `Az új terv indítása nem sikerült: ${err.message}`
            : 'Az új terv indítása váratlanul meghiúsult.',
      });
    }
  }

  function dispatchPending(action: PendingAction): Promise<void> {
    switch (action.kind) {
      case 'open':
        return openVersion(action as VersionRef);
      case 'copy':
        return copyVersion(action as VersionRef);
      case 'ujTerv':
        return ujTervPaciensAdataival();
    }
  }

  function inditas(action: PendingAction) {
    if (kellMegerosites(action, vanMentetlenPiszkozat)) {
      setPending(action);
      return;
    }
    void dispatchPending(action);
  }

  return {
    hiba,
    jelezHiba: setHiba,
    inditas,
    pending,
    zar: () => setPending(null),
    megerosit: () => {
      if (pending) void dispatchPending(pending);
      setPending(null);
    },
  };
}

export default function PlanVersionActionDialog({ akciok }: { akciok: PlanVersionActions }) {
  const { vanMentetlenPiszkozat } = useAppState();
  const { pending } = akciok;

  return (
    <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && akciok.zar()}>
      <AlertDialog.Content maxWidth="440px">
        <AlertDialog.Title>
          {pending ? megerositesTartalom(pending, vanMentetlenPiszkozat).title : 'Piszkozat felülírása'}
        </AlertDialog.Title>
        <AlertDialog.Description size="2">
          {pending && megerositesTartalom(pending, vanMentetlenPiszkozat).description}
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Mégse
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button
              // Piros csak piszkozat-vesztés kockázatánál -- egy tisztán
              // historical-másolási figyelmeztetésnél (nincs mentetlen
              // piszkozat) nincs adatvesztés-kockázat, a piros túlsúlyozná.
              color={vanMentetlenPiszkozat ? 'red' : undefined}
              onClick={() => akciok.megerosit()}
            >
              {/* Szándékosan NEM ugyanaz a felirat, mint a sorbeli
                  triggereké -- amíg a dialógus nyitva van, minden sor
                  trigger-gombja is a DOM-ban marad, azonos accessible
                  name-mel megkülönböztethetetlenek lennének (lásd
                  OsszesTervSection.test.tsx). */}
              {pending && megerositesTartalom(pending, vanMentetlenPiszkozat).actionLabel}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
