// Páciensek -- backlog-28. tétel: a `terv.json` `paciens` blokkja
// tervenkénti pillanatkép (D7), itt viszont a doki a páciens JELENLEG
// érvényes, terv-mentéstől független adatait tartja (paciens-adatok.json,
// D33). Funkcionálisan külön a Korábbi tervektől: az a kezelési előzmény/
// verziók képernyője, ez a törzsadaté -- a kettő kölcsönösen linkel
// egymásra ugyanahhoz a pácienshez.
//
// Amíg egy páciensnek nincs saját paciens-adatok.json-ja, a sor a
// legutóbb módosított terv-láncának legfrissebb `paciens` pillanatképéből
// mutat élő fallbacket (`megjelenitettTorzsadat`, domain/paciensAdatok.ts)
// -- ezt csak a sor KINYITÁSAKOR tölti be lustán, a lista maga csak azt
// tudja előre, van-e lezárt törzsadata (ehhez elég a paciens-adatok.json
// meglétét lekérdezni, nem kell minden terv-láncot bejárni).

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  Separator,
  Skeleton,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon, CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import DiscardChangesDialog, { useDiscardGuard } from '../components/DiscardChangesDialog';
import PatientEditorPanel from '../components/PatientEditorPanel';
import { t } from '../design/tokens';
import { latestVersionAcrossPlans } from '../domain/planFolders';
import { uresTorzsadat } from '../domain/paciensAdatok';
import { norm } from '../domain/search';
import type { PatientFolder, PatientMasterData, Plan, PlanVersion } from '../domain/types';
import UjPaciensDialog from './paciensek/UjPaciensDialog';
import { useStorage } from '../storage/StorageContext';

export default function PaciensekPage() {
  const { storage } = useStorage();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const [masterByPatient, setMasterByPatient] = useState<Record<string, PatientMasterData | null>>({});
  const [masterErrorByPatient, setMasterErrorByPatient] = useState<Record<string, string>>({});

  const [openDir, setOpenDir] = useState<string | null>(null);
  const [dirtyOpen, setDirtyOpen] = useState(false);
  const guard = useDiscardGuard(dirtyOpen);

  // A fallback (legutóbbi terv `paciens` pillanatképe) csak kinyitáskor,
  // lustán töltődik -- lásd a fájl fejlécét.
  const [fallbackByPatient, setFallbackByPatient] = useState<Record<string, Plan | null>>({});
  const [fallbackAttempted, setFallbackAttempted] = useState<Set<string>>(new Set());
  const [fallbackLoadingSet, setFallbackLoadingSet] = useState<Set<string>>(new Set());
  const [fallbackErrorByPatient, setFallbackErrorByPatient] = useState<Record<string, string>>({});

  const [newOpen, setNewOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setListError(null);
      try {
        const list = await storage.listPatients();
        if (cancelled) return;
        // P1-2 mintája (PlanHistoryPage.tsx): egyetlen sérült
        // paciens-adatok.json ne bénítsa meg a teljes listát.
        const results = await Promise.allSettled(list.map((p) => storage.loadPatientData(p.dirName)));
        if (cancelled) return;
        const master: Record<string, PatientMasterData | null> = {};
        const masterErrors: Record<string, string> = {};
        results.forEach((res, i) => {
          const dirName = list[i].dirName;
          if (res.status === 'fulfilled') {
            master[dirName] = res.value;
          } else {
            masterErrors[dirName] =
              res.reason instanceof Error
                ? res.reason.message
                : 'A törzsadat betöltése váratlanul meghiúsult.';
          }
        });
        setPatients(list);
        setMasterByPatient(master);
        setMasterErrorByPatient(masterErrors);
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

  const ensureFallbackLoaded = useCallback(
    async (patientDir: string) => {
      setFallbackAttempted((prev) => new Set(prev).add(patientDir));
      setFallbackLoadingSet((prev) => new Set(prev).add(patientDir));
      try {
        const plans = await storage.listPlans(patientDir);
        const versionsByPlanDir: Record<string, PlanVersion[]> = {};
        await Promise.all(
          plans.map(async (plan) => {
            versionsByPlanDir[plan.dirName] = await storage.listVersions(patientDir, plan.dirName);
          }),
        );
        const latest = latestVersionAcrossPlans(plans, (planDir) => versionsByPlanDir[planDir] ?? []);
        if (!latest) {
          setFallbackByPatient((prev) => ({ ...prev, [patientDir]: null }));
          return;
        }
        const plan = await storage.loadPlan({
          patientDir,
          planDir: latest.planDir,
          versionDir: latest.version.dirName,
        });
        setFallbackByPatient((prev) => ({ ...prev, [patientDir]: plan }));
      } catch (err) {
        setFallbackErrorByPatient((prev) => ({
          ...prev,
          [patientDir]:
            err instanceof Error ? err.message : 'A legutóbbi terv betöltése váratlanul meghiúsult.',
        }));
      } finally {
        setFallbackLoadingSet((prev) => {
          const next = new Set(prev);
          next.delete(patientDir);
          return next;
        });
      }
    },
    [storage],
  );

  function applySwitch(target: string | null) {
    setOpenDir(target);
    setDirtyOpen(false);
    if (
      target &&
      masterByPatient[target] == null &&
      !masterErrorByPatient[target] &&
      !fallbackAttempted.has(target)
    ) {
      void ensureFallbackLoaded(target);
    }
  }

  // A mentetlen szerkesztés (nem a globális terv-piszkozat, csak ennek a
  // sornak a saját form-állapota) elvesztése elleni őr -- ugyanaz az elv,
  // mint a terv-piszkozatnál (`vanMentetlenPiszkozat`), csak lapon belüli
  // hatókörrel: sor váltásakor/csukásakor kérdez, kereszt-linknél nem (az
  // egy tudatos navigáció, nem véletlen kattintás egy másik sorra).
  function requestToggle(dirName: string) {
    const target = openDir === dirName ? null : dirName;
    guard.request(() => applySwitch(target));
  }

  const handleDirtyChange = useCallback((dirty: boolean) => setDirtyOpen(dirty), []);

  async function handleCreatePatient(nev: string) {
    setCreateError(null);
    try {
      const folder = await storage.createPatient(nev);
      setPatients((prev) => [...prev, folder]);
      // Ugyanaz a `uresTorzsadat` építi, amit a storage ténylegesen kiírt
      // (DemoStorage.createPatient) -- nem egy második, driftelhető
      // konstans, hogy ne kelljen egy extra loadPatientData-t várni.
      setMasterByPatient((prev) => ({ ...prev, [folder.dirName]: uresTorzsadat(nev, folder.paciensId) }));
      // NEM `applySwitch`-en át: az a MÉG renderelés előtti (ezért a fenti
      // setMasterByPatient-et még nem látó) `masterByPatient`-re nézne rá, és
      // tévesen fallback-betöltést indítana egy olyan pácienshez, akinek
      // szándékosan nincs egyetlen terve sem. Itt biztosan tudjuk, hogy
      // nincs mit betölteni -- `fallbackAttempted`-be tesszük egyenesen.
      setFallbackAttempted((prev) => new Set(prev).add(folder.dirName));
      setNewOpen(false);
      setOpenDir(folder.dirName);
      setDirtyOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Az új páciens felvitele váratlanul meghiúsult.',
      );
    }
  }

  return (
    <Box style={{ maxWidth: 760, margin: '0 auto' }}>
      <Flex justify="between" align="baseline" mb="4">
        <Heading size="5" style={{ color: t.brand }}>
          Páciensek
        </Heading>
        <Button
          onClick={() => {
            setCreateError(null);
            setNewOpen(true);
          }}
        >
          + Új páciens
        </Button>
      </Flex>

      <Text as="p" size="1" color="gray" mt="0" mb="4">
        A terv-mentéstől független, élő adatok — a kezelési előzményekért lásd a Korábbi terveket.
      </Text>

      <TextField.Root
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Keresés páciensnévre…"
        aria-label="Keresés páciensnévre"
        mb="4"
      />

      {listError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>A lista betöltése nem sikerült: {listError}</Callout.Text>
        </Callout.Root>
      )}

      {loading && <PatientsSkeleton />}

      {!loading && !listError && filtered.length === 0 && (
        <Callout.Root color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {patients.length === 0
              ? 'Még nincs felvitt páciens. Indíts egy tervet a Kezdőlapon, vagy vidd fel az elsőt a „+ Új páciens” gombbal.'
              : `Nincs találat erre: „${q}”. Próbálj más névre keresni.`}
          </Callout.Text>
        </Callout.Root>
      )}

      {filtered.map((p, i) => {
        const adatok = masterByPatient[p.dirName];
        const masterError = masterErrorByPatient[p.dirName];
        const isOpen = openDir === p.dirName;
        return (
          <Box key={p.dirName} mb="3" data-patient={p.dirName}>
            <Flex
              role="button"
              tabIndex={0}
              align="center"
              justify="between"
              gap="2"
              aria-expanded={isOpen}
              aria-controls={`paciens-szerkeszto-${p.dirName}`}
              onClick={() => requestToggle(p.dirName)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                requestToggle(p.dirName);
              }}
              style={{ cursor: 'pointer', padding: '6px 0' }}
            >
              <Flex align="center" gap="2">
                {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                <Text size="2" weight="medium">
                  {p.nev}
                </Text>
              </Flex>
              <Text size="1" style={{ color: masterError ? t.warn : t.uiTextMuted }}>
                {masterError
                  ? '⚠ törzsadat nem olvasható'
                  : adatok
                    ? 'Rögzített törzsadat'
                    : 'Élő adat a legutóbbi tervből'}
              </Text>
            </Flex>

            {isOpen && (
              <Box id={`paciens-szerkeszto-${p.dirName}`} pl="5" pt="2" pb="1">
                {masterError ? (
                  <Callout.Root color="red" size="1">
                    <Callout.Icon>
                      <CrossCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>A törzsadat betöltése nem sikerült: {masterError}</Callout.Text>
                  </Callout.Root>
                ) : (
                  <PatientEditorPanel
                    patient={p}
                    adatok={adatok ?? null}
                    fallbackPlan={fallbackByPatient[p.dirName]}
                    fallbackLoading={fallbackLoadingSet.has(p.dirName)}
                    fallbackError={fallbackErrorByPatient[p.dirName] ?? null}
                    onDirtyChange={handleDirtyChange}
                    onSaved={(saved) =>
                      setMasterByPatient((prev) => ({ ...prev, [p.dirName]: saved }))
                    }
                    onNavigateToHistory={() =>
                      navigate(`/paciensek/${encodeURIComponent(p.dirName)}`, {
                        state: { tab: 'tervek' },
                      })
                    }
                  />
                )}
              </Box>
            )}

            {i < filtered.length - 1 && <Separator size="4" mt="3" color="gray" />}
          </Box>
        );
      })}

      <UjPaciensDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        patients={patients}
        onSave={(nev) => void handleCreatePatient(nev)}
        submitError={createError}
      />

      <DiscardChangesDialog
        open={guard.pending}
        onOpenChange={(open) => !open && guard.cancel()}
        onConfirm={guard.confirm}
        title="Nem mentett módosítás"
        description="Ennél a páciensnél van nem mentett módosításod. Ha másik sorra váltasz, ez elvész — csak a Mentés gomb rögzíti a törzsadatban. Biztosan folytatod?"
        confirmLabel="Váltás, módosítás elvetésével"
      />
    </Box>
  );
}

/** docs/07-felulet-rendszer.md: skeleton a végleges elrendezés alakjában, ne pörgő spinner. */
function PatientsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Flex key={i} justify="between" align="center" py="2">
          <Skeleton>
            <Box height="20px" width="180px" />
          </Skeleton>
          <Skeleton>
            <Box height="16px" width="150px" />
          </Skeleton>
        </Flex>
      ))}
    </>
  );
}
