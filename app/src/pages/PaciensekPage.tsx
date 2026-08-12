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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  Checkbox,
  Flex,
  Grid,
  Heading,
  Separator,
  Skeleton,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon, CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { Field } from '../components/Field';
import { t } from '../design/tokens';
import { latestVersionAcrossPlans } from '../domain/planFolders';
import { megjelenitettTorzsadat, uresTorzsadat } from '../domain/paciensAdatok';
import { norm } from '../domain/search';
import type { Paciens, PatientFolder, PatientMasterData, Plan, PlanVersion } from '../domain/types';
import UjPaciensDialog from './paciensek/UjPaciensDialog';
import { useStorage } from '../storage/StorageContext';

export default function PaciensekPage() {
  const { storage } = useStorage();
  const navigate = useNavigate();
  const location = useLocation();

  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const [masterByPatient, setMasterByPatient] = useState<Record<string, PatientMasterData | null>>({});
  const [masterErrorByPatient, setMasterErrorByPatient] = useState<Record<string, string>>({});

  const [openDir, setOpenDir] = useState<string | null>(null);
  const [dirtyOpen, setDirtyOpen] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<{ target: string | null } | null>(null);

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
    if (openDir && dirtyOpen) {
      setPendingSwitch({ target });
      return;
    }
    applySwitch(target);
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

  // A Korábbi tervekről érkező kereszt-link (backlog-28) kinyitja és
  // görgeti a célsort, EGYSZER, amint a lista betöltött -- ugyanaz a minta,
  // mint a PlanHistoryPage.tsx fordított irányú linkjénél.
  const incomingPatientDir = (location.state as { patientDir?: string } | null)?.patientDir ?? null;
  const appliedIncomingRef = useRef(false);
  useEffect(() => {
    if (appliedIncomingRef.current || loading || !incomingPatientDir) return;
    if (!patients.some((p) => p.dirName === incomingPatientDir)) return;
    appliedIncomingRef.current = true;
    applySwitch(incomingPatientDir);
    for (const el of document.querySelectorAll<HTMLElement>('[data-patient]')) {
      if (el.dataset.patient === incomingPatientDir) {
        el.scrollIntoView({ block: 'center' });
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, patients, incomingPatientDir]);

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
                  <PatientEditor
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
                      navigate('/tervek', { state: { patientDir: p.dirName } })
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

      <AlertDialog.Root
        open={pendingSwitch !== null}
        onOpenChange={(open) => !open && setPendingSwitch(null)}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Nem mentett módosítás</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Ennél a páciensnél van nem mentett módosításod. Ha másik sorra váltasz, ez elvész —
            csak a Mentés gomb rögzíti a törzsadatban. Biztosan folytatod?
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
                  if (pendingSwitch) applySwitch(pendingSwitch.target);
                  setPendingSwitch(null);
                }}
              >
                Váltás, módosítás elvetésével
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
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

/**
 * Kinyitott sor -- a `PatientPage.tsx` "Személyes adatok" mezőelrendezését
 * követi (közös `components/Field`-del), de Card doboz nélkül
 * (docs/07-felulet-rendszer.md: "Nincs card doboz adat körül") és explicit
 * Mentés/Mégse gombpárral, mert itt -- ellentétben a terv-piszkozattal,
 * ami folyamatosan autosave-el -- egy zárt fájl jön létre az első
 * mentéskor (4. döntés, backlog-28).
 */
function PatientEditor({
  patient,
  adatok,
  fallbackPlan,
  fallbackLoading,
  fallbackError,
  onDirtyChange,
  onSaved,
  onNavigateToHistory,
}: {
  patient: PatientFolder;
  adatok: PatientMasterData | null;
  /** `undefined` = még nem próbáltuk betölteni (lásd `fallbackLoading`); `null` = nincs olvasható terve. */
  fallbackPlan: Plan | null | undefined;
  fallbackLoading: boolean;
  fallbackError: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (saved: PatientMasterData) => void;
  onNavigateToHistory: () => void;
}) {
  const { storage } = useStorage();
  const isLocked = adatok != null;
  const displayed = useMemo(
    () => megjelenitettTorzsadat(adatok, fallbackPlan ?? null, patient),
    [adatok, fallbackPlan, patient],
  );

  const [draft, setDraft] = useState<PatientMasterData>(displayed);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Amíg a fallback tölt, a `displayed` még a névre szűkített üres
  // rekord -- a piszkozatot csak AKKOR inicializáljuk ebből, ha a doki még
  // nem kezdett gépelni, és csak egyszer (ne írja felül menet közben).
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || fallbackLoading) return;
    setDraft(displayed);
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed, fallbackLoading]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(displayed);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function patch(fields: Partial<Paciens>) {
    setDraft((prev) => ({ ...prev, ...fields }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const toSave: PatientMasterData = { ...draft, schemaVersion: 1, paciensId: patient.paciensId };
      await storage.savePatientData(patient.dirName, toSave);
      onSaved(toSave);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(displayed);
  }

  if (fallbackLoading) {
    return (
      <Text size="2" color="gray">
        Betöltés…
      </Text>
    );
  }

  if (fallbackError) {
    return (
      <Callout.Root color="red" size="1">
        <Callout.Icon>
          <CrossCircledIcon />
        </Callout.Icon>
        <Callout.Text>A legutóbbi terv betöltése nem sikerült: {fallbackError}</Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Box py="2">
      {!isLocked && (
        <Text as="p" size="1" color="gray" mb="3">
          Ez az adat a páciens legutóbbi mentett tervéből látszik — mentéssel önálló, terv-
          mentéstől független törzsadattá válik.
        </Text>
      )}

      <Field label="Név *">
        <TextField.Root value={draft.nev} onChange={(e) => patch({ nev: e.target.value })} />
      </Field>
      {!draft.nev.trim() && (
        <Text as="div" size="1" mt="1" mb="1" style={{ color: t.warn }}>
          A név nélkül a mappanév sem képezhető, de menthető.
        </Text>
      )}

      <Grid columns="2" gap="3" mt="3">
        <Field label="Született">
          <TextField.Root
            type="date"
            value={draft.szuletesiIdo}
            onChange={(e) => patch({ szuletesiIdo: e.target.value })}
          />
        </Field>
        <Field label="TAJ">
          <TextField.Root
            value={draft.taj}
            onChange={(e) => patch({ taj: e.target.value })}
            placeholder="123 456 789"
          />
        </Field>
      </Grid>

      <Box mt="3">
        <Field label="Lakcím">
          <TextField.Root
            value={draft.lakcim}
            onChange={(e) => patch({ lakcim: e.target.value })}
            placeholder="1113 Budapest, Bartók Béla út 42. 2/5"
          />
        </Field>
      </Box>

      <Grid columns="2" gap="3" mt="3">
        <Field label="Telefon">
          <TextField.Root
            value={draft.telefon}
            onChange={(e) => patch({ telefon: e.target.value })}
            placeholder="+36 30 123 4567"
          />
        </Field>
        <Field label="E-mail">
          <TextField.Root
            type="email"
            value={draft.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="kovacs.janos@example.hu"
          />
        </Field>
      </Grid>

      <Text as="label" size="2" mt="3" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Checkbox
          checked={draft.kiskoru}
          onCheckedChange={(checked) => patch({ kiskoru: checked === true })}
        />
        Kiskorú
      </Text>

      {draft.kiskoru && (
        <Box mt="3">
          <Field label="Törvényes képviselő (név, elérhetőség)">
            <TextField.Root
              value={draft.torvenyesKepviselo ?? ''}
              onChange={(e) => patch({ torvenyesKepviselo: e.target.value || null })}
              placeholder="Kovács Ildikó (édesanya) — +36 30 111 2222"
            />
          </Field>
        </Box>
      )}

      {saveError && (
        <Callout.Root color="red" size="1" mt="3">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{saveError}</Callout.Text>
        </Callout.Root>
      )}

      <Flex justify="between" align="center" mt="4">
        <Button size="1" variant="ghost" color="gray" onClick={onNavigateToHistory}>
          Korábbi tervek
        </Button>
        <Flex gap="2">
          <Button
            type="button"
            size="1"
            variant="soft"
            color="gray"
            disabled={!dirty || saving}
            onClick={handleCancel}
          >
            Mégse
          </Button>
          <Button size="1" disabled={!dirty || saving} onClick={() => void handleSave()}>
            Mentés
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
