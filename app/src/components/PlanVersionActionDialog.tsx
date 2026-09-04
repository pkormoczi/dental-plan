// A verzió-linkelt akciók (Új verzió / Másolás új tervbe / Új terv / Új
// páciens) React-rétege -- a tiszta döntési logikát
// (`domain/planVersionActions.ts`) storage/AppState/navigáció-kontextusra
// kötve, ÉS a hozzá tartozó piszkozat-felülírás-őr `AlertDialog`-ot EGY
// fájlban adja, a `DiscardChangesDialog.tsx` hook+komponens mintáján. Négy
// hívója van: a `PatientPlanChains.tsx` verziósora, a
// `pages/TervReszleteiPage.tsx`, a `pages/NewPlanPage.tsx` köztes választója
// és a `pages/PatientDetailPage.tsx` üres állapota -- mind ugyanazt a
// szöveget/feltételt kapja, nincs második, függetlenül karbantartott
// másolat.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, Button, Callout, Flex } from '@radix-ui/themes';
import { CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
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
  /** Alapértelmezett `'hiba'` (piros) -- a demó-eredetű "nincs mentett PDF" eset
   *  `'info'`-ként (semleges) kap jelzést, hogy ne mosódjon össze egy tényleges
   *  hibával (103. tétel). */
  sulyossag?: 'hiba' | 'info';
}

/**
 * A "nincs mentett PDF" eset megosztott üzenete -- demó-eredetű verziónál
 * (`storage/seed/plans.ts` `seedVerzio()`) információs hangnem, mert ez a
 * demó-készlet elvárt korlátja, nem adathiba (103. tétel).
 */
export function nincsMentettPdfHiba(ref: VersionRef, demoEredetu: boolean): VerzioAkcioHiba {
  return {
    ...ref,
    message: demoEredetu
      ? 'Ehhez a verzióhoz nincs mentett PDF, mert a beépített demó-adatkészletből származik.'
      : 'Ehhez a verzióhoz nincs mentett PDF.',
    sulyossag: demoEredetu ? 'info' : 'hiba',
  };
}

/** A `VerzioAkcioHiba` renderelése súlyosság szerint -- lásd a hívók fejléckommentjét. */
export function VerzioAkcioUzenet({ hiba }: { hiba: VerzioAkcioHiba }) {
  const info = hiba.sulyossag === 'info';
  return (
    <Callout.Root color={info ? 'gray' : 'red'} size="1" mb="2">
      <Callout.Icon>{info ? <InfoCircledIcon /> : <CrossCircledIcon />}</Callout.Icon>
      <Callout.Text>{hiba.message}</Callout.Text>
    </Callout.Root>
  );
}

export interface UsePlanVersionActionsOptions {
  /** Hook-szintű alapértelmezett célpáciens -- egy konkrét páciens oldalán élő
   * hívóknak (PatientPlanChains, TervReszleteiPage, PatientDetailPage) ez elég,
   * nem kell minden `inditas()`-hívásban megismételni. */
  patientDir?: string;
  /** A `'ujPaciens'` kind egyetlen hatása: a hívóhoz tartozó quick-create
   * dialógus megnyitása -- az a felület (`NewPlanPage.tsx`) SAJÁT, nem
   * megosztható állapota, ezért ide callbackként jön be, nem a hook kezeli. */
  onUjPaciens?: (nev?: string) => void;
}

export interface PlanVersionActions {
  hiba: VerzioAkcioHiba | null;
  /** A hívó SAJÁT (nem megosztott) akciói -- pl. `downloadVersion` -- ugyanide írnak. */
  jelezHiba: (hiba: VerzioAkcioHiba | null) => void;
  /** Megerősítést kér, ha kell -- egyébként azonnal fut. */
  inditas: (action: PendingAction) => void;
  /**
   * Azonnal dispatch-el, a `kellMegerosites()` megkerülésével -- KIZÁRÓLAG
   * olyan útra, ahol a megerősítés MÁR lefutott (a quick-create dialógus
   * sikeres mentése, vagy annak "Ezt a pácienst választom" ága). Nem a
   * védelem megkerülésének általános eszköze.
   */
  futtat: (action: PendingAction) => void;
  /** Az ÉPP FUTÓ akció, vagy `null` -- a `NewPlanPage` ebből tudja, MELYIK
   * sor van letiltva (`fut?.patientDir === p.dirName`), a többi hívónak elég
   * a `fut !== null`. */
  fut: PendingAction | null;
  pending: PendingAction | null;
  zar: () => void;
  megerosit: () => void;
}

export function usePlanVersionActions(opts?: UsePlanVersionActionsOptions): PlanVersionActions {
  const { storage } = useStorage();
  const { settings, priceList, loadPlanIntoDraft, copyPlanIntoDraft, vanMentetlenPiszkozat } =
    useAppState();
  const navigate = useNavigate();

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [fut, setFut] = useState<PendingAction | null>(null);
  const [hiba, setHiba] = useState<VerzioAkcioHiba | null>(null);

  function resolvePatientDir(action: PendingAction): string | null {
    return action.patientDir ?? opts?.patientDir ?? null;
  }

  async function openVersion(action: PendingAction) {
    const patientDir = resolvePatientDir(action);
    const ref = action as VersionRef;
    setHiba(null);
    if (!patientDir) return;
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

  async function copyVersion(action: PendingAction) {
    const patientDir = resolvePatientDir(action);
    const ref = action as VersionRef;
    setHiba(null);
    if (!patientDir) return;
    try {
      // A paciens blokkot az ÉLŐ törzsadatból frissítjük, nem a forrás
      // verzió pillanatképéből -- olvashatatlan (sérült/magasabb-verziójú)
      // törzsadatnál a loadPatientData dob, a másolás nem fut le, a catch
      // ág jelzi (nincs néma visszaesés régi adatra).
      const [plan, master] = await Promise.all([
        storage.loadPlan({ patientDir, planDir: ref.planDir, versionDir: ref.versionDir }),
        storage.loadPatientData(patientDir),
      ]);
      copyPlanIntoDraft(
        planMasolatKent(plan, settings, todayIso(), master, priceList),
        'mentetlen-munka',
        patientDir,
      );
      navigate('/paciens');
    } catch (err) {
      setHiba({
        ...ref,
        message:
          err instanceof Error ? `A másolás nem sikerült: ${err.message}` : 'A másolás váratlanul meghiúsult.',
      });
    }
  }

  async function ujTervPaciensAdataival(action: PendingAction) {
    const patientDir = resolvePatientDir(action);
    setHiba(null);
    if (!patientDir) return;
    try {
      const next = await ujTervForrasPaciensbol(storage, settings, priceList, patientDir);
      // Puszta törzsadat-előtöltés, nem szerkesztés -- a doki egy gombnyomással
      // bármikor újraelőállítja, tehát elvesztése nem valódi adatvesztés
      // (docs/03-funkcionalis-spec.md § Autosave). Ezért 'alapallapot': a
      // "Piszkozat folytatása" kártya csak TÉNYLEGES szerkesztés után jelenik meg.
      copyPlanIntoDraft(next, 'alapallapot', patientDir);
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

  async function dispatchPending(action: PendingAction): Promise<void> {
    switch (action.kind) {
      case 'open':
        return openVersion(action);
      case 'copy':
        return copyVersion(action);
      case 'ujTerv':
        return ujTervPaciensAdataival(action);
      case 'ujPaciens':
        opts?.onUjPaciens?.(action.nev);
        return;
    }
  }

  async function runTracked(action: PendingAction) {
    // A 'ujPaciens' ág szinkron (csak egy dialógust nyit) -- nem állítjuk a
    // `fut`-ot, különben egy render-tick erejéig hamis "busy" villanna.
    if (action.kind === 'ujPaciens') {
      await dispatchPending(action);
      return;
    }
    setFut(action);
    try {
      await dispatchPending(action);
    } finally {
      setFut(null);
    }
  }

  function inditas(action: PendingAction) {
    if (kellMegerosites(action, vanMentetlenPiszkozat)) {
      setPending(action);
      return;
    }
    void runTracked(action);
  }

  return {
    hiba,
    jelezHiba: setHiba,
    inditas,
    futtat: (action: PendingAction) => void runTracked(action),
    fut,
    pending,
    zar: () => setPending(null),
    megerosit: () => {
      if (pending) void runTracked(pending);
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
