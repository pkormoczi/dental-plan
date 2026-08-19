// Páciens részletei -- backlog-30 (Páciens detail shell), redesign DP-002.
// URL-lel címezhető (`/paciensek/:patientDir`), két tabbal: `Páciens
// adatai` (a törzsadat-szerkesztő, `components/PatientEditorPanel.tsx`) és
// `Kezelési tervek` (a terv-lánc/verzió fa, `components/PatientPlanChains.tsx`).
// Ez váltja fel a korábbi, `location.state`-alapú kereszt-linkeket a
// Páciensek és a Korábbi tervek listái között -- a cél mostantól ez az
// oldal, a megfelelő tabbal előválasztva (`location.state.tab`), a páciens
// azonosítója pedig magában az URL-ben van, tehát frissítés-biztos.
//
// A `PatientPage.tsx`/`/paciens` (aktív draft nyelve/pénzneme/pillanatkép)
// EZ NEM AZ -- az explicit KÍVÜL, nem ennek a tabnak a felelőssége.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  DropdownMenu,
  Flex,
  IconButton,
  Skeleton,
  Tabs,
  Text,
} from '@radix-ui/themes';
import { ArrowLeftIcon, CrossCircledIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import DiscardChangesDialog, { useDiscardGuard } from '../components/DiscardChangesDialog';
import { useNavGuard } from '../components/NavGuardContext';
import PatientDetailHeader from '../components/PatientDetailHeader';
import PatientEditorPanel from '../components/PatientEditorPanel';
import PatientPlanChains from '../components/PatientPlanChains';
import { loadPlanChainData, versionDataKey, type PlanChainData } from '../domain/planChainData';
import { latestVersionAcrossPlans } from '../domain/planFolders';
import { megjelenitettTorzsadat } from '../domain/paciensAdatok';
import { paciensTorlesAkadaly, type TorlesAkadaly } from '../domain/paciensTorles';
import { feloldPatientDir } from '../domain/torzsadatBetoltes';
import type { PatientFolder, PatientMasterData } from '../domain/types';
import { useAppState } from '../state/AppState';
import { ujTervForrasPaciensbol } from '../state/planIndulas';
import { useStorage } from '../storage/StorageContext';

type DetailTab = 'adatai' | 'tervek';
type EditorMod = 'nezet' | 'szerkesztes';

// A DropdownMenu.Label szövege a törlés akadályára (backlog-41, D50) --
// prezentáció, ezért itt él, nem a domain `paciensTorlesAkadaly()` mellett.
const AKADALY_SZOVEG: Record<TorlesAkadaly, string> = {
  'veglegesitett-terv': 'Véglegesített terve van',
  'aktiv-piszkozat': 'Aktív piszkozat tartozik hozzá',
  'nem-olvashato': 'Néhány terve nem olvasható',
};

export default function PatientDetailPage() {
  const { patientDir: rawPatientDir } = useParams<{ patientDir: string }>();
  const patientDir = rawPatientDir ?? '';
  const { storage } = useStorage();
  const { settings, priceList, plan, vanMentetlenPiszkozat, piszkozatPatientDir, copyPlanIntoDraft } =
    useAppState();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientFolder | null>(null);
  const [adatok, setAdatok] = useState<PatientMasterData | null>(null);
  const [chainData, setChainData] = useState<PlanChainData | null>(null);

  // A hívó (Páciensek/Korábbi tervek kereszt-linkje) jelzi, melyik tabon
  // nyisson (4. döntés, backlog-30) -- csak a kezdőértékhez olvassuk, a
  // további tab-váltás innentől kizárólag a `tab` state-en át fut.
  const [tab, setTab] = useState<DetailTab>(
    (location.state as { tab?: DetailTab } | null)?.tab === 'adatai' ? 'adatai' : 'tervek',
  );

  // Quick-create után a hívó szerkesztés módban jelzi a "Páciens adatai" tab
  // nyitását (D45) -- csak a kezdőértékhez olvassuk, ugyanúgy, mint a
  // `tab`-ot.
  const [editorMod, setEditorMod] = useState<EditorMod>(
    (location.state as { mod?: EditorMod } | null)?.mod === 'szerkesztes' ? 'szerkesztes' : 'nezet',
  );

  // A Radix `Tabs` unmountolja a nem aktív tab tartalmát -- a "Páciens
  // adatai" tabon félbehagyott szerkesztés máskülönben némán elveszne
  // egy tab-váltásnál, ugyanaz a közös primitív (D38), mint amit a
  // SettingsPage.tsx "Nyomtatvány szövegei" szekciója Mégse gombjánál hív.
  const [dirtyAdatai, setDirtyAdatai] = useState(false);
  const guard = useDiscardGuard(dirtyAdatai);
  // D46: ugyanez a dirty jelző a NavBar-navigációt is védi, a
  // NavGuardContext-en keresztül -- a NavBar a MEGLÉVŐ guard-primitívvel
  // fogja el a kattintást, ez a hook csak regisztrál.
  useNavGuard(dirtyAdatai);

  function requestTab(next: DetailTab) {
    guard.request(() => {
      setDirtyAdatai(false);
      // A panel unmountol egy tab-váltásnál -- egy oda-vissza váltás nélküle
      // újra szerkesztés módban nyitná meg a "Páciens adatai" tabot.
      setEditorMod('nezet');
      setTab(next);
    });
  }

  const [startingPlan, setStartingPlan] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [list, master, chain] = await Promise.all([
          storage.listPatients(),
          storage.loadPatientData(patientDir),
          loadPlanChainData(storage, patientDir),
        ]);
        if (cancelled) return;
        setPatient(list.find((p) => p.dirName === patientDir) ?? null);
        setAdatok(master);
        setChainData(chain);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'A páciens betöltése váratlanul meghiúsult.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage, patientDir]);

  // Melyik páciensmappához tartozik a doki JELENLEGI, mentetlen piszkozata
  // (backlog-41, D50 2. döntés) -- a MEGLÉVŐ `feloldPatientDir()` (D48)
  // resolverét hívja, nem új heurisztikát: `piszkozatPatientDir` (D37)
  // elsőbbséggel, `plan.paciensId` tartalékkal, sosem dob.
  const [draftPatientDir, setDraftPatientDir] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dir = await feloldPatientDir(storage, piszkozatPatientDir, plan.paciensId);
      if (!cancelled) setDraftPatientDir(dir);
    })();
    return () => {
      cancelled = true;
    };
  }, [storage, piszkozatPatientDir, plan.paciensId]);

  const sajatAktivPiszkozat = vanMentetlenPiszkozat && draftPatientDir === patientDir;
  const torlesAkadaly = paciensTorlesAkadaly(chainData, sajatAktivPiszkozat);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fire-and-forget, mint az AdatkezelesSection.tsx demó-törlő gombjai: a
  // dialógus a kattintásra azonnal zárul, a hiba a lapon, a header alatt
  // jelenik meg -- nincs toast (docs/07). Szándékosan NEM megy át a D38/D46
  // discard guardon (3. döntés): a "Páciens adatai" tabon félbehagyott
  // szerkesztés tárgytalanná válik, ha magát a pácienst töröljük.
  async function performDelete() {
    setDeleteError(null);
    try {
      await storage.deletePatient(patientDir);
      navigate('/paciensek', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'A páciens törlése váratlanul meghiúsult.');
    }
  }

  const latestOverall = chainData
    ? latestVersionAcrossPlans(chainData.plans, (planDir) => chainData.versionsByPlan[planDir] ?? [])
    : null;
  const fallbackPlan =
    latestOverall && chainData
      ? (chainData.plansByVersion[versionDataKey(latestOverall.planDir, latestOverall.version.dirName)] ??
        null)
      : null;

  async function startFirstPlan() {
    if (!patient) return;
    setStartingPlan(true);
    setStartError(null);
    try {
      const next = await ujTervForrasPaciensbol(storage, settings, priceList, patient.dirName);
      copyPlanIntoDraft(next, patient.dirName);
      navigate('/paciens');
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Az új terv indítása váratlanul meghiúsult.');
    } finally {
      setStartingPlan(false);
    }
  }

  // App-chrome, nem tartalom -- ezért mind a 4 return-ágban megjelenik
  // (betöltés/hiba/nem található/normál), és a MEGLÉVŐ dirty-guardon (D46
  // mintája, `requestTab` analógiájára) megy át: `navigate(-1)` csendben
  // eldobná a "Páciens adatai" tabon félbehagyott szerkesztést, ha nem a
  // guardon keresztül navigálna. "Vissza" a felirat, nem "Páciensek" --
  // ide a Kezdőlapról, a Pácienslistáról, a "Korábbi tervek"
  // kereszt-linkjéről és az "Új terv indítása" keresőjéből is be lehet
  // lépni, egy "← Páciensek" felirat ezek felében hazudna.
  const backLink = (
    <Button
      type="button"
      size="1"
      variant="ghost"
      color="gray"
      mb="3"
      onClick={() => guard.request(() => navigate(-1))}
    >
      <ArrowLeftIcon />
      Vissza
    </Button>
  );

  if (loading) {
    return (
      <Box style={{ maxWidth: 900, margin: '0 auto' }}>
        {backLink}
        <Skeleton>
          <Box height="52px" mb="4" />
        </Skeleton>
        <Skeleton>
          <Box height="240px" />
        </Skeleton>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box style={{ maxWidth: 900, margin: '0 auto' }}>
        {backLink}
        <Callout.Root color="red">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>A páciens betöltése nem sikerült: {loadError}</Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box style={{ maxWidth: 900, margin: '0 auto' }}>
        {backLink}
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>Nincs ilyen páciens -- lehet, hogy elgépelt vagy elavult a link.</Callout.Text>
        </Callout.Root>
        {/* A "Vissza a páciensekhez" a "← Vissza" mellett is marad: a két cél
            eltér -- elavult/elgépelt URL esetén a navigate(-1) visszavihet
            ugyanarra a rossz helyre, ez a fix lista a használható
            kimenekülő. */}
        <Button variant="soft" color="gray" onClick={() => navigate('/paciensek')}>
          Vissza a páciensekhez
        </Button>
      </Box>
    );
  }

  const displayedAdatok = megjelenitettTorzsadat(adatok, fallbackPlan, patient);

  return (
    <Box style={{ maxWidth: 900, margin: '0 auto' }}>
      {backLink}
      <PatientDetailHeader
        adatok={displayedAdatok}
        actions={
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {/* SZÁNDÉKOSAN "páciens műveletek", NEM "további műveletek" --
                  az utóbbi (docs/07 sorbeli-akció konvenciója,
                  PatientPlanChains.tsx) a `verzioMenupont()` teszt-helperben
                  `document.body`-szinten, /további műveletek$/-mintával
                  keres rá; ha ez a header-gomb is arra végződne, ütközne
                  vele (két találat egy oldalon, App.test.tsx). Ez itt nem is
                  sorbeli akció -- egyetlen példány van az oldalon
                  (a lapon megjelenő EGY páciensre), nem listasorra. */}
              <IconButton
                size="1"
                variant="soft"
                color="gray"
                aria-label={`${displayedAdatok.nev} — páciens műveletek`}
              >
                <DotsHorizontalIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            {/* onCloseAutoFocus: a menü záráskor visszavenné a fókuszt a
                triggerre, és ezzel elhalászná azt a megerősítő AlertDialog
                elől, ami ugyanabban a tickben nyílik (PatientPlanChains.tsx
                mintája). */}
            <DropdownMenu.Content size="1" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenu.Item
                color="red"
                disabled={torlesAkadaly !== null}
                onSelect={() => setDeleteOpen(true)}
              >
                Páciens törlése
              </DropdownMenu.Item>
              {torlesAkadaly && (
                <>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Label>{AKADALY_SZOVEG[torlesAkadaly]}</DropdownMenu.Label>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        }
      />

      {deleteError && (
        <Callout.Root color="red" size="1" mb="4">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{deleteError}</Callout.Text>
        </Callout.Root>
      )}

      <Tabs.Root value={tab} onValueChange={(v) => requestTab(v === 'adatai' ? 'adatai' : 'tervek')}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="adatai">Páciens adatai</Tabs.Trigger>
          <Tabs.Trigger value="tervek">Kezelési tervek</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="adatai">
          <PatientEditorPanel
            patient={patient}
            adatok={adatok}
            fallbackPlan={fallbackPlan}
            fallbackLoading={false}
            fallbackError={null}
            kezdoMod={editorMod}
            onDirtyChange={setDirtyAdatai}
            onSaved={setAdatok}
          />
        </Tabs.Content>

        <Tabs.Content value="tervek">
          {latestOverall === null ? (
            <Box>
              <Text as="p" size="2" color="gray" mb="3">
                Ennek a páciensnek még nincs kezelési terve.
              </Text>
              {startError && (
                <Callout.Root color="red" size="1" mb="3">
                  <Callout.Icon>
                    <CrossCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>{startError}</Callout.Text>
                </Callout.Root>
              )}
              <Button onClick={() => void startFirstPlan()} disabled={startingPlan}>
                + Új terv
              </Button>
            </Box>
          ) : (
            <PatientPlanChains
              patient={patient}
              plans={chainData?.plans ?? []}
              versionsByPlan={chainData?.versionsByPlan ?? {}}
              plansByVersion={chainData?.plansByVersion ?? {}}
              totalsByVersion={chainData?.totalsByVersion ?? {}}
              unreadable={chainData?.unreadable ?? false}
              header="embedded"
              onLabelSaved={(planDir, tervCim) =>
                setChainData((prev) =>
                  prev
                    ? {
                        ...prev,
                        plans: prev.plans.map((p) =>
                          p.dirName === planDir ? { ...p, tervCim } : p,
                        ),
                      }
                    : prev,
                )
              }
            />
          )}
        </Tabs.Content>
      </Tabs.Root>

      <DiscardChangesDialog
        open={guard.pending}
        onOpenChange={(open) => !open && guard.cancel()}
        onConfirm={guard.confirm}
        title="Nem mentett módosítás"
        description="A Páciens adatai lapon van nem mentett módosításod. Ha lapot váltasz, ez elvész — csak a Mentés gomb rögzíti a törzsadatban. Biztosan folytatod?"
        confirmLabel="Váltás, módosítás elvetésével"
      />

      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Páciens törlése</AlertDialog.Title>
          <AlertDialog.Description size="2">
            „{displayedAdatok.nev}” végleges törlése — a törzsadata és az összes hozzá tartozó fájl
            elvész. A művelet nem vonható vissza.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={() => void performDelete()}>
                Törlés
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
