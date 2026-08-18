// EGY páciens terv-lánc -> verzió fája (D29), a hozzá tartozó akciókkal
// (Új verzió / Másolás új tervbe / Megnézés / Letöltés / Új terv /
// terv-címke szerkesztés). Eredetileg a PlanHistoryPage.tsx soronkénti
// (`.map(patients...)`) JSX-e volt -- backlog-30 (Páciens detail shell)
// emelte ide, páciens-paraméteresre alakítva, mert mostantól KÉT hívó
// használja: a PlanHistoryPage.tsx lista (patiensenként egy példány) ÉS a
// PatientDetailPage.tsx "Kezelési tervek" tabja (egy példány).
//
// A korábban OLDAL-szintű, csak EGY aktív interakciót engedő state
// (címke-szerkesztés, megerősítő dialógus, akció-hiba, összecsukás)
// idekerült, saját `useState`-ekként -- minden példány függetlenül kezeli
// a saját interakcióját. A `patient`-en kívüli adatokat (plans/
// versionsByPlan/plansByVersion/totalsByVersion) a hívó tölti be és adja
// át, hogy a betöltési STRATÉGIA (a PlanHistoryPage egyszerre, minden
// páciensre; a PatientDetailPage egyetlen páciensre, lásd
// domain/planChainData.ts) hívónként eltérhessen, a renderelés viszont
// egy helyen éljen.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  DropdownMenu,
  Flex,
  IconButton,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CrossCircledIcon,
  Cross2Icon,
  DotsHorizontalIcon,
  Pencil1Icon,
} from '@radix-ui/react-icons';
import { t } from '../design/tokens';
import { todayIso } from '../domain/date';
import { formatMoney } from '../domain/money';
import { latestVersionAcrossPlans } from '../domain/planFolders';
import { planMasolatKent } from '../domain/planCopy';
import { versionDataKey, type VersionTotal } from '../domain/planChainData';
import { ALAPERTELMEZETT_TERV_CIM, megjelenitettTervCim } from '../domain/tervCim';
import type { PatientFolder, Plan, PlanFolder, PlanVersion } from '../domain/types';
import { useAppState } from '../state/AppState';
import { ujTervForrasPaciensbol } from '../state/planIndulas';
import { buildDownloadFileName } from '../storage/paths';
import { useStorage } from '../storage/StorageContext';

interface VersionRef {
  planDir: string;
  versionDir: string;
}

type PendingKind = 'open' | 'copy' | 'ujTerv';
type PendingAction = Partial<VersionRef> & { kind: PendingKind };

export interface PatientPlanChainsProps {
  patient: PatientFolder;
  plans: PlanFolder[];
  versionsByPlan: Record<string, PlanVersion[]>;
  plansByVersion: Record<string, Plan>;
  totalsByVersion: Record<string, VersionTotal>;
  /** Legalább egy terv-lánc vagy verzió listázása/betöltése hibázott (P1-2). */
  unreadable: boolean;
  /** Kereszt-link a páciens törzsadatára -- lásd a fájl fejlécét, hívónként eltérő céllal. */
  onNavigateToPatientData: () => void;
  /**
   * Sikeres címke-mentés után -- a `plans` prop a HÍVÓ állapota, ezt a
   * komponens maga nem írhatja át közvetlenül. A hívó felelőssége a saját
   * `plans`-listájában a megfelelő elem `tervCim`-jét frissíteni, hogy a
   * következő render már a mentett címkét mutassa (nem élő javaslatra
   * visszaesve).
   */
  onLabelSaved: (planDir: string, tervCim: string | null) => void;
}

export default function PatientPlanChains({
  patient,
  plans,
  versionsByPlan,
  plansByVersion,
  totalsByVersion,
  unreadable,
  onNavigateToPatientData,
  onLabelSaved,
}: PatientPlanChainsProps) {
  const { storage, loadPlanPdf } = useStorage();
  const { settings, priceList, loadPlanIntoDraft, copyPlanIntoDraft, vanMentetlenPiszkozat } =
    useAppState();
  const navigate = useNavigate();

  // 1 (vagy 0) terv-lánc: nincs plusz kattintás, mindig kibontva (a
  // tipikus eset). 2+ lánc: alapból csukva, kattintásra nyílik.
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);
  const expanded = plans.length > 1 ? (expandedOverride ?? false) : true;

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<{
    planDir: string | null;
    versionDir: string | null;
    message: string;
  } | null>(null);

  const [editingLabel, setEditingLabel] = useState<{ planDir: string } | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [labelError, setLabelError] = useState<{ planDir: string; message: string } | null>(null);

  const latestOverall = latestVersionAcrossPlans(plans, (planDir) => versionsByPlan[planDir] ?? []);
  const latestOverallTotal = latestOverall
    ? totalsByVersion[versionDataKey(latestOverall.planDir, latestOverall.version.dirName)]
    : undefined;

  async function openVersion(ref: VersionRef) {
    setActionError(null);
    try {
      const plan = await storage.loadPlan({
        patientDir: patient.dirName,
        planDir: ref.planDir,
        versionDir: ref.versionDir,
      });
      loadPlanIntoDraft(plan);
      navigate('/terv');
    } catch (err) {
      setActionError({
        ...ref,
        message:
          err instanceof Error
            ? `A terv megnyitása nem sikerült: ${err.message}`
            : 'A terv megnyitása váratlanul meghiúsult.',
      });
    }
  }

  async function copyVersion(ref: VersionRef) {
    setActionError(null);
    try {
      const plan = await storage.loadPlan({
        patientDir: patient.dirName,
        planDir: ref.planDir,
        versionDir: ref.versionDir,
      });
      copyPlanIntoDraft(planMasolatKent(plan, settings, todayIso()));
      navigate('/paciens');
    } catch (err) {
      setActionError({
        ...ref,
        message:
          err instanceof Error
            ? `A másolás nem sikerült: ${err.message}`
            : 'A másolás váratlanul meghiúsult.',
      });
    }
  }

  async function ujTervPaciensAdataival() {
    setActionError(null);
    try {
      const next = await ujTervForrasPaciensbol(storage, settings, priceList, patient.dirName);
      copyPlanIntoDraft(next);
      navigate('/paciens');
    } catch (err) {
      setActionError({
        planDir: null,
        versionDir: null,
        message:
          err instanceof Error
            ? `Az új terv indítása nem sikerült: ${err.message}`
            : 'Az új terv indítása váratlanul meghiúsult.',
      });
    }
  }

  function runOrConfirm(action: PendingAction) {
    if (vanMentetlenPiszkozat) {
      setPending(action);
      return;
    }
    void dispatchPending(action);
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

  const pendingSpecs: Record<PendingKind, { description: string; actionLabel: string }> = {
    open: {
      description:
        'Van mentetlen piszkozatod. Ha ebből a verzióból újat készítesz, a jelenlegi ' +
        'piszkozat elvész -- nem került fájlba, csak ebben a böngészőben volt meg. Biztosan ' +
        'folytatod?',
      actionLabel: 'Új verzió, piszkozat elvetésével',
    },
    copy: {
      description:
        'Van mentetlen piszkozatod. Ha ennek a verziónak a tartalmával új tervet indítasz, a ' +
        'jelenlegi piszkozat elvész -- nem került fájlba, csak ebben a böngészőben volt meg. ' +
        'Biztosan folytatod?',
      actionLabel: 'Másolás, piszkozat elvetésével',
    },
    ujTerv: {
      description:
        'Van mentetlen piszkozatod. Ha a páciens adataival új tervet indítasz, a jelenlegi ' +
        'piszkozat elvész -- nem került fájlba, csak ebben a böngészőben volt meg. Biztosan ' +
        'folytatod?',
      actionLabel: 'Új terv, piszkozat elvetésével',
    },
  };

  async function viewVersion(ref: VersionRef) {
    setActionError(null);
    const win = window.open('', '_blank');
    if (!win) {
      setActionError({
        ...ref,
        message:
          'A böngésző letiltotta az új lap megnyitását -- engedélyezd a felugró ablakokat ehhez ' +
          'az oldalhoz, vagy használd a Letöltést.',
      });
      return;
    }
    try {
      const bytes = await loadPlanPdf({
        patientDir: patient.dirName,
        planDir: ref.planDir,
        versionDir: ref.versionDir,
      });
      if (!bytes) {
        win.close();
        setActionError({ ...ref, message: 'Ehhez a verzióhoz nincs mentett PDF.' });
        return;
      }
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      win.location.href = URL.createObjectURL(blob);
    } catch (err) {
      win.close();
      setActionError({
        ...ref,
        message:
          err instanceof Error
            ? `A megnyitás nem sikerült: ${err.message}`
            : 'A megnyitás váratlanul meghiúsult.',
      });
    }
  }

  async function downloadVersion(ref: VersionRef, tervId: string) {
    setActionError(null);
    try {
      const bytes = await loadPlanPdf({
        patientDir: patient.dirName,
        planDir: ref.planDir,
        versionDir: ref.versionDir,
      });
      if (!bytes) {
        setActionError({ ...ref, message: 'Ehhez a verzióhoz nincs mentett PDF.' });
        return;
      }
      // A verzió saját, MÁR betöltött terv.json-ja adja a nevet/statuszt --
      // olvashatatlan verziónál (nincs a plansByVersion-ben, csak a PDF
      // tölthető be külön) a páciens-szintű névre és `isDraft: false`-ra
      // esünk vissza, hogy a letöltés emiatt ne váljon szigorúbbá, mint ma.
      const versionPlan = plansByVersion[versionDataKey(ref.planDir, ref.versionDir)];
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildDownloadFileName(versionPlan?.paciens.nev || patient.nev, {
        tervId,
        isDraft: versionPlan ? versionPlan.statusz !== 'VEGLEGES' : false,
        suffix: ref.versionDir,
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError({
        ...ref,
        message:
          err instanceof Error
            ? `A letöltés nem sikerült: ${err.message}`
            : 'A letöltés váratlanul meghiúsult.',
      });
    }
  }

  function startEditLabel(planDir: string, current: string) {
    setLabelError(null);
    setEditingLabel({ planDir });
    setLabelDraft(current);
  }

  function cancelEditLabel() {
    setEditingLabel(null);
  }

  async function saveLabel(planDir: string, value: string) {
    setLabelError(null);
    try {
      await storage.savePlanLabel(patient.dirName, planDir, value);
      const trimmed = value.trim();
      onLabelSaved(planDir, trimmed || null);
      setEditingLabel(null);
    } catch (err) {
      setLabelError({
        planDir,
        message:
          err instanceof Error
            ? `A címke mentése nem sikerült: ${err.message}`
            : 'A címke mentése váratlanul meghiúsult.',
      });
    }
  }

  /** A ténylegesen megjelenített címke -- kézi vagy élő javaslat (D29). */
  function displayedLabel(plan: PlanFolder): string {
    const versions = versionsByPlan[plan.dirName] ?? [];
    const latest = versions[versions.length - 1];
    const latestPlan = latest ? plansByVersion[versionDataKey(plan.dirName, latest.dirName)] : undefined;
    return latestPlan
      ? megjelenitettTervCim(plan.tervCim, latestPlan, priceList)
      : (plan.tervCim ?? ALAPERTELMEZETT_TERV_CIM);
  }

  return (
    <Box>
      {/* Az akciógomb a névfejléc MELLETT van, nem benne: a páciensnév
          címke, a gomb akció -- egy Text-en belül a kettő összeolvad.
          Balra zárva, közvetlenül a név után: a rövid "Új terv" felirat
          nem mondja ki, hogy a páciensadatot átviszi -- ezt az
          elhelyezés hordozza. Accent (nem szürke), a páciensnév `t.brand`
          színével egy családban. */}
      <Flex align="baseline" gap="3" mb="2" wrap="wrap">
        <Text as="div" size="3" weight="bold" style={{ color: t.brand }}>
          {patient.nev}
          {unreadable && (
            <Text size="1" weight="regular" ml="2" style={{ color: t.warn }}>
              ⚠ néhány verziója nem olvasható
            </Text>
          )}
        </Text>
        {latestOverall && (
          <Button
            size="1"
            variant="soft"
            onClick={() =>
              runOrConfirm({
                kind: 'ujTerv',
                planDir: latestOverall.planDir,
                versionDir: latestOverall.version.dirName,
              })
            }
          >
            Új terv
          </Button>
        )}
        {/* Kereszt-link a páciens törzsadatára (backlog-28/backlog-30, D33) --
            gray/ghost, hogy a hangsúly az "Új terv" akción maradjon: ez csak
            navigáció, nem terv-létrehozó. */}
        <Button size="1" variant="ghost" color="gray" onClick={onNavigateToPatientData}>
          Páciens adatai
        </Button>
      </Flex>
      {actionError && actionError.planDir === null && actionError.versionDir === null && (
        <Callout.Root color="red" size="1" mb="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{actionError.message}</Callout.Text>
        </Callout.Root>
      )}

      {/* A "N terv" kapcsoló a névfejléc ALATTI sorba került (nem a
          fejléc mellé, mint korábban) -- csak ez a szó kattintható,
          a "· legutóbb: …" szöveg mellette sima, nem interaktív
          marad. Kinyitva a dátum/összeg elmarad, mert a lista alatta
          úgyis részletesen látszik. */}
      {plans.length > 1 && (
        <Flex align="center" gap="1" mb="2" wrap="wrap">
          <Button
            type="button"
            size="1"
            variant="ghost"
            aria-expanded={expanded}
            aria-controls={`patient-plans-${patient.dirName}`}
            onClick={() => setExpandedOverride(!expanded)}
          >
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            {plans.length} terv
          </Button>
          {!expanded && (
            <Text size="2" color="gray">
              · legutóbb:{' '}
              {latestOverall
                ? `${latestOverall.version.isoDate} · ${formatMoney(
                    latestOverallTotal?.fizetendo ?? null,
                    latestOverallTotal?.penznem ?? 'HUF',
                  )}`
                : '—'}
            </Text>
          )}
        </Flex>
      )}

      {expanded && (
        <Box id={`patient-plans-${patient.dirName}`}>
          {plans.map((plan, planIdx) => {
            const versions = versionsByPlan[plan.dirName] ?? [];
            const isEditing = editingLabel?.planDir === plan.dirName;
            const label = displayedLabel(plan);
            return (
              <Box key={plan.dirName} mb="3" data-plan={plan.dirName}>
                <Flex align="center" gap="1" mb="1">
                  {isEditing ? (
                    <>
                      <TextField.Root
                        size="1"
                        autoFocus
                        value={labelDraft}
                        onChange={(e) => setLabelDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            void saveLabel(plan.dirName, labelDraft);
                          } else if (e.key === 'Escape') {
                            cancelEditLabel();
                          }
                        }}
                        placeholder="Terv címe"
                        aria-label="Terv címe"
                        style={{ maxWidth: 260 }}
                      />
                      <IconButton
                        size="1"
                        variant="soft"
                        aria-label="Címke mentése"
                        onClick={() => void saveLabel(plan.dirName, labelDraft)}
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton
                        size="1"
                        variant="soft"
                        color="gray"
                        aria-label="Címke szerkesztésének elvetése"
                        onClick={cancelEditLabel}
                      >
                        <Cross2Icon />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <Text size="2" weight="medium">
                        {label} · {versions[0]?.isoDate ?? '—'}
                      </Text>
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="gray"
                        aria-label="Terv címének szerkesztése"
                        onClick={() => startEditLabel(plan.dirName, label)}
                      >
                        <Pencil1Icon />
                      </IconButton>
                    </>
                  )}
                </Flex>
                {isEditing && (
                  <Text as="p" size="1" color="gray" mt="0" mb="2">
                    Üresen mentve visszaáll az automatikus javaslatra.
                  </Text>
                )}
                {labelError?.planDir === plan.dirName && (
                  <Callout.Root color="red" size="1" mb="2">
                    <Callout.Icon>
                      <CrossCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>{labelError.message}</Callout.Text>
                  </Callout.Root>
                )}

                {versions
                  .slice()
                  .reverse()
                  .map((v, vi) => {
                    const ref: VersionRef = { planDir: plan.dirName, versionDir: v.dirName };
                    const total = totalsByVersion[versionDataKey(plan.dirName, v.dirName)];
                    return (
                      <Box key={v.dirName}>
                        {vi > 0 && <Separator size="4" />}
                        <Flex justify="between" align="center" py="2">
                          <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            v{v.verzio} · {v.isoDate}
                          </Text>
                          <Flex align="center" gap="4">
                            {/* A verzió végösszege (osszesitok.fizetendo) a saját
                                terv.json-jából, a saját pénznemében -- külön, jobbra
                                igazított elem, nem a bal oldali szöveghez fűzve
                                (docs/07-felulet-rendszer.md: pénzérték jobbra,
                                tabular-nums). Olvashatatlan verziónál "—". */}
                            <Text
                              size="2"
                              weight="medium"
                              style={{
                                fontVariantNumeric: 'tabular-nums',
                                textAlign: 'right',
                                minWidth: '7rem',
                              }}
                            >
                              {formatMoney(total?.fizetendo ?? null, total?.penznem ?? 'HUF')}
                            </Text>
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger>
                                {/* Az aria-label a terv-címkével ÉS a verziószámmal
                                    képzett: csupasz "v1 — további műveletek" két
                                    különböző terv-lánc esetén (mindkettő saját v1-gyel
                                    indul, D29) ütközne -- a képernyőolvasó (és a teszt)
                                    nem tudná megkülönböztetni őket. */}
                                <IconButton
                                  size="1"
                                  variant="soft"
                                  color="gray"
                                  aria-label={`${label} — v${v.verzio} — további műveletek`}
                                >
                                  <DotsHorizontalIcon />
                                </IconButton>
                              </DropdownMenu.Trigger>
                              {/* onCloseAutoFocus: a menü záráskor visszavenné a
                                  fókuszt a triggerre, és ezzel elhalászná azt a
                                  piszkozat-őr AlertDialog-ja elől, ami ugyanabban a
                                  tickben nyílik (runOrConfirm). Ne cseréld
                                  setTimeout-os késleltetésre. */}
                              <DropdownMenu.Content size="1" onCloseAutoFocus={(e) => e.preventDefault()}>
                                {/* Az elválasztó a csak-olvasó műveleteket választja el a
                                    terv-létrehozóktól; a kettő közül a Megnézés áll elöl
                                    (backlog-22), mert nem hagy fájlt a Letöltések mappában,
                                    utána a gyakoribb terv-létrehozó (Új verzió). */}
                                <DropdownMenu.Item onSelect={() => void viewVersion(ref)}>
                                  Megnézés
                                </DropdownMenu.Item>
                                <DropdownMenu.Item onSelect={() => downloadVersion(ref, plan.tervId)}>
                                  Letöltés
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Item onSelect={() => runOrConfirm({ kind: 'open', ...ref })}>
                                  Új verzió
                                </DropdownMenu.Item>
                                <DropdownMenu.Item onSelect={() => runOrConfirm({ kind: 'copy', ...ref })}>
                                  Másolás új tervbe
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Root>
                          </Flex>
                        </Flex>
                        {actionError?.planDir === plan.dirName && actionError.versionDir === v.dirName && (
                          <Callout.Root color="red" size="1" mb="2">
                            <Callout.Icon>
                              <CrossCircledIcon />
                            </Callout.Icon>
                            <Callout.Text>{actionError.message}</Callout.Text>
                          </Callout.Root>
                        )}
                      </Box>
                    );
                  })}
                {planIdx < plans.length - 1 && <Separator size="4" mt="2" mb="1" />}
              </Box>
            );
          })}
        </Box>
      )}

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
                  if (pending) void dispatchPending(pending);
                  setPending(null);
                }}
              >
                {/* Szándékosan NEM ugyanaz a felirat, mint a sorbeli
                    triggereké -- amíg a dialógus nyitva van, minden sor
                    trigger-gombja is a DOM-ban marad, azonos accessible
                    name-mel megkülönböztethetetlenek lennének (lásd
                    PlanHistoryPage.test.tsx). */}
                {pending && pendingSpecs[pending.kind].actionLabel}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
