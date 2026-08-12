// Korábbi tervek -- docs/03-funkcionalis-spec.md "5. Korábbi tervek".
//
// Ez a legerősebb indoka a fájlrendszer-hozzáférésnek: egy visszatérő
// pácienshez ne kelljen újragépelni a tételeket. Háromszintű fa (páciens →
// terv → verzió, D29) -- egy páciensnek több terv-lánca is lehet. A
// megnyitott verzió a szerkesztő piszkozatába töltődik; egy újabb
// véglegesítés a meglévő tervId mellé ÚJ verziót ír (D4) -- ezt a
// storage.savePlan már tudja, itt nincs külön logika hozzá.

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  DropdownMenu,
  Flex,
  Heading,
  IconButton,
  Separator,
  Skeleton,
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
  InfoCircledIcon,
  Pencil1Icon,
} from '@radix-ui/react-icons';
import { t } from '../design/tokens';
import { todayIso } from '../domain/date';
import { formatMoney } from '../domain/money';
import { latestVersionAcrossPlans } from '../domain/planFolders';
import { planMasolatKent } from '../domain/planCopy';
import { norm } from '../domain/search';
import { ALAPERTELMEZETT_TERV_CIM, megjelenitettTervCim } from '../domain/tervCim';
import type { PatientFolder, Penznem, Plan, PlanFolder, PlanVersion } from '../domain/types';
import { useAppState } from '../state/AppState';
import { ujTervForrasPaciensbol } from '../state/planIndulas';
import { buildDownloadFileName } from '../storage/paths';
import { useStorage } from '../storage/StorageContext';

interface VersionRef {
  patientDir: string;
  planDir: string;
  versionDir: string;
}

interface ActionError {
  patientDir: string;
  // `null` = páciensszintű hiba (a névfejléc melletti "Új terv"), nem egy
  // konkrét terv/verzió-sorhoz kötött.
  planDir: string | null;
  versionDir: string | null;
  message: string;
}

// A piszkozat-felülírás-őr (backlog-17) mindhárom terv-létrehozó belépési
// pontot fedi ("Új verzió", "Másolás új tervbe", "Új terv"): ugyanaz az
// AlertDialog, csak eltérő szöveggel és célfüggvénnyel -- a Home.tsx
// `confirmSpecs` lookup-táblájának mintája.
//
// A gombfeliratok rendszere (docs/03-funkcionalis-spec.md § Korábbi tervek):
// minden ÚJ tervláncot indító akció felirata tartalmazza az "új terv"
// kifejezést ("Új terv", "Másolás új tervbe"), és egyedül a meglévő láncot
// folytató akció feliratában szerepel a "verzió" szó ("Új verzió") -- ez a
// képernyő egyetlen olyan különbsége, amit a dokinak kattintás előtt látnia
// kell (D4/D26).
//
// A verziósoron egyetlen látható gomb sincs, minden művelet a "⋯" menüben
// van; a páciensszintű "Új terv" viszont látható marad, a névfejléc mellett,
// mert az nem egy konkrét verzióhoz tartozik.
type PendingKind = 'open' | 'copy' | 'ujTerv';
type PendingAction = VersionRef & { kind: PendingKind };

// Egy verzió végösszege a saját terv.json-jából. A pénznem verziónként jön
// (D21: `penznem` plan-szintű mező), nem globális beállításból -- két
// verzió eltérő pénznemű is lehet ugyanannál a páciensnél.
interface VersionTotal {
  fizetendo: number;
  penznem: Penznem;
}

function planKey(patientDir: string, planDir: string): string {
  return `${patientDir}/${planDir}`;
}

function versionKey({ patientDir, planDir, versionDir }: VersionRef): string {
  return `${patientDir}/${planDir}/${versionDir}`;
}

export default function PlanHistoryPage() {
  const { storage, loadPlanPdf } = useStorage();
  const { settings, priceList, loadPlanIntoDraft, copyPlanIntoDraft, vanMentetlenPiszkozat } =
    useAppState();
  const navigate = useNavigate();
  // docs/03-funkcionalis-spec.md § Autosave: ugyanaz a felülírás-kockázat,
  // mint a Home "Új terv indítása" gombjánál -- egyik gomb sem nyithat/
  // másolhat szó nélkül a folyamatban lévő, mentetlen piszkozat fölé.
  const [pending, setPending] = useState<PendingAction | null>(null);

  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [plansByPatient, setPlansByPatient] = useState<Record<string, PlanFolder[]>>({});
  const [versionsByPlan, setVersionsByPlan] = useState<Record<string, PlanVersion[]>>({});
  const [plansByVersion, setPlansByVersion] = useState<Record<string, Plan>>({});
  const [totalsByVersion, setTotalsByVersion] = useState<Record<string, VersionTotal>>({});
  // P1-2: eddig egyetlen sérült/inkompatibilis terv (`Promise.all`,
  // all-or-nothing) az EGÉSZ listát megbénította -- egy páciens sem
  // jelent meg, csak az örök "Betöltés…". `Promise.allSettled`-del a
  // hibás páciens sora "⚠ nem olvasható" jelöléssel jelenik meg, a többi
  // rendben betölt.
  const [unreadable, setUnreadable] = useState<Set<string>>(new Set());
  const [expandedOverride, setExpandedOverride] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  // P1-2: a megnyitás/letöltés hibája korábban `alert()`-tel jelent meg --
  // egy adott sorhoz kötött hiba, ezért annak a sornak a szövegeként
  // jelenik meg (docs/07-felulet-rendszer.md: "Nem toast, ha a hiba egy
  // mezőhöz tartozik").
  const [actionError, setActionError] = useState<ActionError | null>(null);

  const [editingLabel, setEditingLabel] = useState<{ patientDir: string; planDir: string } | null>(
    null,
  );
  const [labelDraft, setLabelDraft] = useState('');
  const [labelError, setLabelError] = useState<{
    patientDir: string;
    planDir: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setListError(null);
      try {
        const list = await storage.listPatients();
        const failed = new Set<string>();

        const plansResults = await Promise.allSettled(list.map((p) => storage.listPlans(p.dirName)));
        const plansMap: Record<string, PlanFolder[]> = {};
        plansResults.forEach((res, i) => {
          const dirName = list[i].dirName;
          if (res.status === 'fulfilled') plansMap[dirName] = res.value;
          else failed.add(dirName);
        });

        const planRefs = list.flatMap((p) =>
          (plansMap[p.dirName] ?? []).map((plan) => ({ patientDir: p.dirName, planDir: plan.dirName })),
        );
        const versionsResults = await Promise.allSettled(
          planRefs.map((ref) => storage.listVersions(ref.patientDir, ref.planDir)),
        );
        const versionsMap: Record<string, PlanVersion[]> = {};
        versionsResults.forEach((res, i) => {
          const ref = planRefs[i];
          if (res.status === 'fulfilled') versionsMap[planKey(ref.patientDir, ref.planDir)] = res.value;
          else failed.add(ref.patientDir);
        });

        // Minden verzió terv.json-ja kell -- a verzió-végösszeghez
        // (backlog-11) ÉS a terv-lánc élő címke-javaslatához (D29)
        // egyaránt, ugyanabban az egy körben.
        const versionRefs: VersionRef[] = planRefs.flatMap((ref) =>
          (versionsMap[planKey(ref.patientDir, ref.planDir)] ?? []).map((v) => ({
            patientDir: ref.patientDir,
            planDir: ref.planDir,
            versionDir: v.dirName,
          })),
        );
        const planResults = await Promise.allSettled(versionRefs.map((ref) => storage.loadPlan(ref)));

        const totalsMap: Record<string, VersionTotal> = {};
        const plansByVersionMap: Record<string, Plan> = {};
        planResults.forEach((res, i) => {
          const ref = versionRefs[i];
          if (res.status === 'fulfilled') {
            plansByVersionMap[versionKey(ref)] = res.value;
            // A mentett osszesitok az igazság, nincs újraszámolás -- az
            // eltérés-őr (osszesitokElter) ott fut, ahol ténylegesen
            // kockázatos: szerkesztőbe töltéskor (AppState.tsx).
            totalsMap[versionKey(ref)] = {
              fizetendo: res.value.osszesitok.fizetendo,
              penznem: res.value.penznem,
            };
          } else {
            // Az összeg helyén "—" jelenik meg (formatMoney(null)), és a
            // páciens megkapja a meglévő "⚠ néhány verziója nem olvasható"
            // jelzést -- nincs külön, verzió-szintű hibaüzenet.
            failed.add(ref.patientDir);
          }
        });

        if (cancelled) return;
        setPatients(list);
        setPlansByPatient(plansMap);
        setVersionsByPlan(versionsMap);
        setPlansByVersion(plansByVersionMap);
        setTotalsByVersion(totalsMap);
        setUnreadable(failed);
      } catch (err) {
        if (!cancelled) {
          setListError(
            err instanceof Error ? err.message : 'A korábbi tervek listázása váratlanul meghiúsult.',
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
    // backlog-28, 6. döntés: egy terv nélküli páciens (csak
    // paciens-adatok.json-nal, a Páciensek képernyőn felvéve) itt NEM
    // jelenik meg -- ez a képernyő a kezelési előzményekről szól, nem a
    // törzsadatról. Egy olvashatatlan tervű páciens változatlanul látszik,
    // a ⚠ jelzéssel -- neki VAN terve, csak épp nem tudjuk beolvasni.
    .filter((p) => (plansByPatient[p.dirName]?.length ?? 0) > 0 || unreadable.has(p.dirName))
    .sort((a, b) => a.nev.localeCompare(b.nev));

  // A Páciensek képernyőről érkező kereszt-link (backlog-28) a névfejléchez
  // görget és -- ha a lánc 2+ elemű -- kinyitja azt, EGYSZER, amint a lista
  // betöltött. A `location.state`-et csak a mountkor olvassuk (nincs
  // "history.replace" a mockupban), ezért egy `ref` védi a visszatérő
  // renderek elleni ismételt görgetést.
  const location = useLocation();
  const incomingPatientDir = (location.state as { patientDir?: string } | null)?.patientDir ?? null;
  const appliedIncomingRef = useRef(false);
  useEffect(() => {
    if (appliedIncomingRef.current || loading || !incomingPatientDir) return;
    if (!patients.some((p) => p.dirName === incomingPatientDir)) return;
    appliedIncomingRef.current = true;
    setExpandedOverride((prev) => ({ ...prev, [incomingPatientDir]: true }));
    for (const el of document.querySelectorAll<HTMLElement>('[data-patient]')) {
      if (el.dataset.patient === incomingPatientDir) {
        el.scrollIntoView({ block: 'center' });
        break;
      }
    }
  }, [loading, patients, incomingPatientDir]);

  async function openVersion(ref: VersionRef) {
    setActionError(null);
    try {
      const plan = await storage.loadPlan(ref);
      loadPlanIntoDraft(plan);
      navigate('/terv');
    } catch (err) {
      // P1-2: korábban nem volt catch -- hibázó betöltésre a gomb némán
      // nem csinált semmit, a doki nem tudta, próbálkozzon-e újra.
      setActionError({
        ...ref,
        message:
          err instanceof Error
            ? `A terv megnyitása nem sikerült: ${err.message}`
            : 'A terv megnyitása váratlanul meghiúsult.',
      });
    }
  }

  // backlog-17: "Másolás új tervbe" -- konkrétan a kattintott verzió
  // sorait viszi tovább, ezért a teljes Plan-t betölti (a lista csak az
  // összesítőt tartja készenlétben). D6: a Páciens adatlapra navigál, nem
  // egyenesen a szerkesztőbe -- ez maga is jelzi, hogy ez egy ÚJ terv, nem
  // egy meglévő verzió folytatása.
  async function copyVersion(ref: VersionRef) {
    setActionError(null);
    try {
      const plan = await storage.loadPlan(ref);
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

  // backlog-17/backlog-28: "Új terv" (páciensszintű) -- a páciens ELÉRHETŐ
  // legjobb adataiból (törzsadat, ha van, egyébként a legfrissebb verzió
  // `paciens` pillanatképéből -- state/planIndulas.ts), sorok nélkül. A
  // hiba a páciens-fejlécnél jelenik meg, nem egy konkrét sornál -- a `ref`
  // csak azt jelzi, MELYIK páciensről van szó, a tényleges forrást a közös
  // helper dönti el.
  async function ujTervPaciensAdataival(ref: VersionRef) {
    setActionError(null);
    try {
      const next = await ujTervForrasPaciensbol(storage, settings, priceList, ref.patientDir);
      copyPlanIntoDraft(next);
      navigate('/paciens');
    } catch (err) {
      setActionError({
        patientDir: ref.patientDir,
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
        return openVersion(action);
      case 'copy':
        return copyVersion(action);
      case 'ujTerv':
        return ujTervPaciensAdataival(action);
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

  // backlog-22: "Megnézés" -- a verzió mentett PDF-jét nyitja meg új lapon,
  // a piszkozatot egyáltalán nem érinti (nincs loadPlanIntoDraft, nincs
  // navigáció). A window.open() a KATTINTÁS pillanatában, szinkron fut,
  // még a loadPlanPdf await előtt -- ha ez az await után történne, a
  // legtöbb böngésző popup-blokkolóként elnyelné, mert megszakadna a
  // "valódi felhasználói gesztus" lánc, amit a blokkoló megkövetel.
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
      const bytes = await loadPlanPdf(ref);
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

  async function downloadVersion(ref: VersionRef, tervId: string, patientNev: string) {
    setActionError(null);
    try {
      const bytes = await loadPlanPdf(ref);
      if (!bytes) {
        setActionError({ ...ref, message: 'Ehhez a verzióhoz nincs mentett PDF.' });
        return;
      }
      // A verzió saját, MÁR betöltött terv.json-ja adja a nevet/statuszt --
      // olvashatatlan verziónál (nincs a plansByVersion-ben, csak a PDF
      // tölthető be külön) a páciens-szintű névre és `isDraft: false`-ra
      // esünk vissza, hogy a letöltés emiatt ne váljon szigorúbbá, mint ma.
      const versionPlan = plansByVersion[versionKey(ref)];
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildDownloadFileName(versionPlan?.paciens.nev || patientNev, {
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

  function startEditLabel(patientDir: string, planDir: string, current: string) {
    setLabelError(null);
    setEditingLabel({ patientDir, planDir });
    setLabelDraft(current);
  }

  function cancelEditLabel() {
    setEditingLabel(null);
  }

  async function saveLabel(patientDir: string, planDir: string, value: string) {
    setLabelError(null);
    try {
      await storage.savePlanLabel(patientDir, planDir, value);
      const trimmed = value.trim();
      setPlansByPatient((prev) => ({
        ...prev,
        [patientDir]: (prev[patientDir] ?? []).map((plan) =>
          plan.dirName === planDir ? { ...plan, tervCim: trimmed || null } : plan,
        ),
      }));
      setEditingLabel(null);
    } catch (err) {
      setLabelError({
        patientDir,
        planDir,
        message:
          err instanceof Error
            ? `A címke mentése nem sikerült: ${err.message}`
            : 'A címke mentése váratlanul meghiúsult.',
      });
    }
  }

  /** A ténylegesen megjelenített címke -- kézi vagy élő javaslat (D29). */
  function displayedLabel(patientDir: string, plan: PlanFolder): string {
    const versions = versionsByPlan[planKey(patientDir, plan.dirName)] ?? [];
    const latest = versions[versions.length - 1];
    const latestPlan = latest
      ? plansByVersion[versionKey({ patientDir, planDir: plan.dirName, versionDir: latest.dirName })]
      : undefined;
    return latestPlan
      ? megjelenitettTervCim(plan.tervCim, latestPlan, priceList)
      : (plan.tervCim ?? ALAPERTELMEZETT_TERV_CIM);
  }

  return (
    <Box style={{ maxWidth: 760, margin: '0 auto' }}>
      <Heading size="5" mb="4" style={{ color: t.brand }}>
        Korábbi tervek
      </Heading>

      <TextField.Root
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Keresés páciensnévre…"
        aria-label="Keresés páciensnévre"
        mb="4"
      />

      {/* A képernyő két, adatintegritásban gyökerező útja (új verzió a
          meglévő láncban vs. önálló új tervlánc, D4/D26) a gombfeliratokból
          önmagában nem következik -- ez a sor mondja ki egyszer, a lista
          fölött. Nem Callout: nem hiba és nem figyelmeztetés. */}
      {!loading && !listError && patients.length > 0 && (
        <Text as="p" size="1" color="gray" mt="0" mb="4">
          Az „Új verzió” ugyanahhoz a tervhez készül; az „Új terv” és a „Másolás új tervbe”
          önálló, új tervet indít.
        </Text>
      )}

      {listError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>A lista betöltése nem sikerült: {listError}</Callout.Text>
        </Callout.Root>
      )}

      {loading && <HistorySkeleton />}

      {!loading && !listError && filtered.length === 0 && (
        <Callout.Root color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {patients.length === 0
              ? 'Még nincs mentett terv. Indíts egyet a Kezdőlapon — a véglegesítés után itt jelenik meg.'
              : `Nincs találat erre: „${q}”. Próbálj más névre keresni.`}
          </Callout.Text>
        </Callout.Root>
      )}

      {filtered.map((p, pi) => {
        const plans = plansByPatient[p.dirName] ?? [];
        // 1 (vagy 0) terv-lánc: nincs plusz kattintás, mindig kibontva (a
        // tipikus eset). 2+ lánc: alapból csukva, kattintásra nyílik.
        const expanded = plans.length > 1 ? (expandedOverride[p.dirName] ?? false) : true;
        const latestOverall = latestVersionAcrossPlans(
          plans,
          (planDir) => versionsByPlan[planKey(p.dirName, planDir)] ?? [],
        );
        const latestOverallTotal = latestOverall
          ? totalsByVersion[
              versionKey({
                patientDir: p.dirName,
                planDir: latestOverall.planDir,
                versionDir: latestOverall.version.dirName,
              })
            ]
          : undefined;
        // `data-patient` a páciensblokk stabil horgonya -- a névfejléc DOM-beli
        // mélysége az akciógomb kiemelése óta nem alkalmas erre (lásd
        // PlanHistoryPage.test.tsx).
        return (
          <Box key={p.dirName} mb="5" data-patient={p.dirName}>
            {/* Az akciógomb a névfejléc MELLETT van, nem benne: a páciensnév
                címke, a gomb akció -- egy Text-en belül a kettő összeolvad.
                Balra zárva, közvetlenül a név után: a rövid "Új terv" felirat
                nem mondja ki, hogy a páciensadatot átviszi -- ezt az
                elhelyezés hordozza. Accent (nem szürke), a páciensnév
                `t.brand` színével egy családban. */}
            <Flex align="baseline" gap="3" mb="2" wrap="wrap">
              <Text as="div" size="3" weight="bold" style={{ color: t.brand }}>
                {p.nev}
                {unreadable.has(p.dirName) && (
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
                      patientDir: p.dirName,
                      planDir: latestOverall.planDir,
                      versionDir: latestOverall.version.dirName,
                    })
                  }
                >
                  Új terv
                </Button>
              )}
              {/* Kereszt-link a Páciensek képernyőre (backlog-28, D33) --
                  gray/ghost, hogy a hangsúly az "Új terv" akción maradjon:
                  ez csak navigáció, nem terv-létrehozó. */}
              <Button
                size="1"
                variant="ghost"
                color="gray"
                onClick={() => navigate('/paciensek', { state: { patientDir: p.dirName } })}
              >
                Páciens adatai
              </Button>
            </Flex>
            {actionError?.patientDir === p.dirName &&
              actionError.planDir === null &&
              actionError.versionDir === null && (
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
                  aria-controls={`patient-plans-${pi}`}
                  onClick={() =>
                    setExpandedOverride((prev) => ({ ...prev, [p.dirName]: !expanded }))
                  }
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
              <Box id={`patient-plans-${pi}`}>
                {plans.map((plan, planIdx) => {
                  const versions = versionsByPlan[planKey(p.dirName, plan.dirName)] ?? [];
                  const isEditing =
                    editingLabel?.patientDir === p.dirName && editingLabel.planDir === plan.dirName;
                  const label = displayedLabel(p.dirName, plan);
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
                                  void saveLabel(p.dirName, plan.dirName, labelDraft);
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
                              onClick={() => void saveLabel(p.dirName, plan.dirName, labelDraft)}
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
                              onClick={() => startEditLabel(p.dirName, plan.dirName, label)}
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
                      {labelError?.patientDir === p.dirName && labelError.planDir === plan.dirName && (
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
                          const ref: VersionRef = {
                            patientDir: p.dirName,
                            planDir: plan.dirName,
                            versionDir: v.dirName,
                          };
                          const total = totalsByVersion[versionKey(ref)];
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
                                    <DropdownMenu.Content
                                      size="1"
                                      onCloseAutoFocus={(e) => e.preventDefault()}
                                    >
                                      {/* Az elválasztó a csak-olvasó műveleteket választja el a
                                          terv-létrehozóktól; a kettő közül a Megnézés áll elöl
                                          (backlog-22), mert nem hagy fájlt a Letöltések mappában,
                                          utána a gyakoribb terv-létrehozó (Új verzió). */}
                                      <DropdownMenu.Item onSelect={() => void viewVersion(ref)}>
                                        Megnézés
                                      </DropdownMenu.Item>
                                      <DropdownMenu.Item
                                        onSelect={() => downloadVersion(ref, plan.tervId, p.nev)}
                                      >
                                        Letöltés
                                      </DropdownMenu.Item>
                                      <DropdownMenu.Separator />
                                      <DropdownMenu.Item
                                        onSelect={() => runOrConfirm({ kind: 'open', ...ref })}
                                      >
                                        Új verzió
                                      </DropdownMenu.Item>
                                      <DropdownMenu.Item
                                        onSelect={() => runOrConfirm({ kind: 'copy', ...ref })}
                                      >
                                        Másolás új tervbe
                                      </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                  </DropdownMenu.Root>
                                </Flex>
                              </Flex>
                              {actionError?.patientDir === p.dirName &&
                                actionError.planDir === plan.dirName &&
                                actionError.versionDir === v.dirName && (
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

            {pi < filtered.length - 1 && <Separator size="4" mt="3" color="gray" />}
          </Box>
        );
      })}

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

/** docs/07-felulet-rendszer.md: skeleton a végleges elrendezés alakjában, ne pörgő spinner. */
function HistorySkeleton() {
  return (
    <>
      {[0, 1].map((i) => (
        <Box key={i} mb="5">
          <Flex align="baseline" gap="3">
            <Skeleton>
              <Box height="20px" width="160px" />
            </Skeleton>
            <Skeleton>
              <Box height="28px" width="70px" />
            </Skeleton>
          </Flex>
          <Flex justify="between" align="center" py="2" mt="2">
            <Skeleton>
              <Box height="16px" width="120px" />
            </Skeleton>
            <Skeleton>
              <Box height="28px" width="28px" />
            </Skeleton>
          </Flex>
        </Box>
      ))}
    </>
  );
}
