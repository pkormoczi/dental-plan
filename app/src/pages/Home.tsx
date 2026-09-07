import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Separator,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import { CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import PatientListRow from '../components/PatientListRow';
import { t } from '../design/tokens';
import { formatPiszkozatIdo } from '../domain/date';
import {
  RECENT_PACIENS_LIMIT,
  aktivitasSzoveg,
  imentVeglegesitve,
  legutobbAktivPaciensek,
} from '../domain/paciensAktivitas';
import { latestVersionAcrossPlans } from '../domain/planFolders';
import { piszkozatCelRoute } from '../domain/piszkozat';
import { loadMegjelenitettTorzsadat, type BetoltottTorzsadat } from '../domain/torzsadatBetoltes';
import type { PatientFolder, PlanRef, PlanVersion } from '../domain/types';
import { nincsMentettPdfHiba } from '../components/PlanVersionActionDialog';
import { useAppState } from '../state/AppState';
import { openPlanPdfInNewTab } from '../storage/openPlanPdfInNewTab';
import { buildDownloadFileName } from '../storage/paths';
import { useStorage } from '../storage/StorageContext';
import { usePlanPdfObjectUrl } from '../storage/usePlanPdfObjectUrl';

export default function Home() {
  const { storage, loadPlanPdf, isSeedVersion } = useStorage();
  const {
    plan,
    vanMentetlenPiszkozat,
    piszkozatMentve,
    piszkozatHiba,
    piszkozatLastRoute,
    discardPersistedDraft,
    resetPlanDraft,
  } = useAppState();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const [recents, setRecents] = useState<BetoltottTorzsadat[] | null>(null);
  const [recentsError, setRecentsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRecents(null);
      setRecentsError(null);
      try {
        const list = await storage.listPatients();
        if (cancelled) return;
        const top = legutobbAktivPaciensek(list, RECENT_PACIENS_LIMIT);
        const loaded = await Promise.all(top.map((p) => loadMegjelenitettTorzsadat(storage, p)));
        if (cancelled) return;
        setRecents(loaded);
      } catch (err) {
        if (!cancelled) {
          setRecentsError(
            err instanceof Error ? err.message : 'A legutóbbi páciensek betöltése váratlanul meghiúsult.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  // Az "imént véglegesített terv" kártya célverziója. A recency-ablakon belüli,
  // `terv-veglegesitve` aktivitású LEGFRISSEBB páciens legfrissebb verziója --
  // ez a visszaesési út annak, aki a véglegesítés közbeni frissítéssel elvesztette
  // a sikerképernyőt. Több egyidejű lánc esetén elfogadottan pontatlan (a doki
  // döntése), ezért nem tárolt mutató, hanem `latestVersionAcrossPlans`.
  const [imentiRef, setImentiRef] = useState<{
    patient: PatientFolder;
    ref: PlanRef;
    tervId: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await storage.listPatients();
        if (cancelled) return;
        const jelolt = legutobbAktivPaciensek(list, RECENT_PACIENS_LIMIT).find((p) =>
          imentVeglegesitve(p.utolsoAktivitas, new Date()),
        );
        if (!jelolt) {
          setImentiRef(null);
          return;
        }
        const plans = await storage.listPlans(jelolt.dirName);
        const versionsByPlanDir: Record<string, PlanVersion[]> = {};
        await Promise.all(
          plans.map(async (lanc) => {
            versionsByPlanDir[lanc.dirName] = await storage.listVersions(jelolt.dirName, lanc.dirName);
          }),
        );
        if (cancelled) return;
        const latest = latestVersionAcrossPlans(plans, (planDir) => versionsByPlanDir[planDir] ?? []);
        const lanc = latest ? plans.find((p) => p.dirName === latest.planDir) : undefined;
        setImentiRef(
          latest && lanc
            ? {
                patient: jelolt,
                ref: {
                  patientDir: jelolt.dirName,
                  planDir: latest.planDir,
                  versionDir: latest.version.dirName,
                },
                tervId: lanc.tervId,
              }
            : null,
        );
      } catch {
        // Best-effort visszaesési út: egy sikertelen listázás csak a kártyát
        // némítja el, a Kezdőlap többi része a saját hibaútján jelez.
        if (!cancelled) setImentiRef(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  async function handleDiscardDraft() {
    setError(null);
    try {
      await discardPersistedDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A piszkozat elvetése váratlanul meghiúsult.');
    }
  }

  // Az egészséges "Piszkozat folytatása" kártya eldobása -- ellentétben a
  // fenti `handleDiscardDraft`-tal (sérült draft, `discardPersistedDraft`),
  // itt VAN memóriabeli terv, amit el kell tüntetni: a `resetPlanDraft()`
  // ezt is elvégzi (a `dp:piszkozat` kulcsot is törli), a
  // `discardPersistedDraft` önmagában NEM nullázná a `plan`/`mentettPlan`
  // state-et, tehát a kártya nem tűnne el.
  function performDiscardDraft() {
    setDiscardOpen(false);
    resetPlanDraft();
  }

  const most = new Date();

  return (
    <Box style={{ maxWidth: 640, margin: '0 auto' }}>
      <Heading size="6" mb="1" style={{ color: t.brand }}>
        Kezelési terv és árajánlat
      </Heading>
      <Text as="p" size="2" color="gray" mb="5">
        Mándoki Dental — demó verzió a UX validálásához.
      </Text>

      {error && (
        <Callout.Root color="red" mb="4">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {piszkozatHiba && (
        <Card size="2" mb="4">
          <Callout.Root color="red" mb="3">
            <Callout.Text>
              A mentett piszkozatot nem sikerült visszaállítani: {piszkozatHiba}
            </Callout.Text>
          </Callout.Root>
          <Text as="p" size="2" color="gray" mt="0" mb="3">
            A piszkozat nem tűnt el, csak nem olvasható — ha nem tudod/akarod
            helyreállítani, itt elvetheted. Ha inkább új munkát kezdesz, az automatikusan
            felülírja.
          </Text>
          <Button variant="soft" color="gray" onClick={handleDiscardDraft}>
            Piszkozat elvetése
          </Button>
        </Card>
      )}

      {vanMentetlenPiszkozat && (
        <Card size="2" mb="4">
          <Text as="p" size="2" weight="bold" mb="1" style={{ color: t.brand }}>
            Piszkozat folytatása
          </Text>
          <Text as="p" size="2" mt="0" mb="1">
            {plan.paciens.nev.trim() || 'Névtelen piszkozat'}
          </Text>
          {piszkozatMentve && (
            <Text as="p" size="1" color="gray" mt="0" mb="3">
              Utolsó módosítás: {formatPiszkozatIdo(piszkozatMentve)}
            </Text>
          )}
          <Flex gap="3">
            <Button onClick={() => navigate(piszkozatCelRoute(piszkozatLastRoute, plan))}>
              Megnyitás
            </Button>
            <Button variant="soft" color="gray" onClick={() => setDiscardOpen(true)}>
              Piszkozat elvetése
            </Button>
          </Flex>
        </Card>
      )}

      {imentiRef && (
        <ImentVeglegesitveKartya
          patient={imentiRef.patient}
          planRef={imentiRef.ref}
          tervId={imentiRef.tervId}
          loadPlanPdf={loadPlanPdf}
          demoEredetu={isSeedVersion(imentiRef.ref)}
        />
      )}

      <Box mb="5">
        {/* A piszkozat-felülírás-őr innentől az /uj-terv köztes
            páciens-választón fut le (csak ott dől el ténylegesen, hogy a
            doki egy meglévő pácienshez vagy egy vadonatújhoz indul-e) --
            ez a gomb feltétel nélkül odanavigál. */}
        <Button onClick={() => navigate('/uj-terv')}>+ Új kezelési terv</Button>
      </Box>

      <Text as="p" size="2" weight="bold" mb="2">
        Legutóbbi páciensek
      </Text>

      {recentsError && (
        <Callout.Root color="red" mb="3">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            A legutóbbi páciensek betöltése nem sikerült: {recentsError} Próbáld a{' '}
            <Link to="/paciensek">Páciensek</Link> oldalt.
          </Callout.Text>
        </Callout.Root>
      )}

      {recents == null && !recentsError && <RecentsSkeleton />}

      {recents != null && recents.length === 0 && (
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Még nincs mentett munkád. Indíts egy kezelési tervet a fenti gombbal, vagy vidd fel az
            első pácienst a Páciensek oldalon.
          </Callout.Text>
        </Callout.Root>
      )}

      {recents != null &&
        recents.map((item, i) => (
          <Fragment key={item.patient.dirName}>
            <RecentRow item={item} most={most} />
            {i < recents.length - 1 && <Separator size="4" color="gray" />}
          </Fragment>
        ))}

      <AlertDialog.Root open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Piszkozat eldobása</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Biztosan eldobod a folyamatban lévő piszkozatot? Ez nem vonható vissza.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={performDiscardDraft}>
                Elvetés
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}

/**
 * "Az imént véglegesített terv" -- a sikerképernyő két PDF-műveletének
 * visszaesési útja a Kezdőlapon (a véglegesítés közbeni frissítés esete).
 * A "Piszkozat folytatása" kártya mintáján.
 */
function ImentVeglegesitveKartya({
  patient,
  planRef,
  tervId,
  loadPlanPdf,
  demoEredetu,
}: {
  patient: PatientFolder;
  planRef: PlanRef;
  tervId: string;
  loadPlanPdf: (ref: PlanRef) => Promise<Uint8Array | null>;
  demoEredetu: boolean;
}) {
  const pdf = usePlanPdfObjectUrl(planRef);
  const [hiba, setHiba] = useState<string | null>(null);

  async function megnyitasKulon() {
    setHiba(null);
    const eredmeny = await openPlanPdfInNewTab(planRef, loadPlanPdf);
    if (eredmeny.fajta === 'nincs-pdf') {
      setHiba(nincsMentettPdfHiba(planRef, demoEredetu).message);
      return;
    }
    if (eredmeny.fajta === 'hiba') setHiba(eredmeny.message);
  }

  return (
    <Card size="2" mb="4">
      <Text as="p" size="2" weight="bold" mb="1" style={{ color: t.brand }}>
        Az imént véglegesített terv
      </Text>
      <Text as="p" size="2" mt="0" mb="3">
        {patient.nev}
      </Text>
      {hiba && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>{hiba}</Callout.Text>
        </Callout.Root>
      )}
      <Flex gap="3" wrap="wrap">
        <Button
          variant="soft"
          color="gray"
          disabled={pdf.hianyzik}
          onClick={() => void megnyitasKulon()}
        >
          Megnyitás külön
        </Button>
        {pdf.url ? (
          <Button asChild variant="soft" color="gray">
            <a
              href={pdf.url}
              download={buildDownloadFileName(patient.nev, {
                tervId,
                isDraft: false,
                suffix: planRef.versionDir,
              })}
            >
              Letöltés
            </a>
          </Button>
        ) : (
          <Button variant="soft" color="gray" disabled>
            Letöltés
          </Button>
        )}
      </Flex>
    </Card>
  );
}

function RecentRow({ item, most }: { item: BetoltottTorzsadat; most: Date }) {
  return (
    <PatientListRow item={item}>
      {item.patient.utolsoAktivitas && (
        <Text as="p" size="1" color="gray" mt="1" mb="0">
          {aktivitasSzoveg(item.patient.utolsoAktivitas, most)}
        </Text>
      )}
    </PatientListRow>
  );
}

/** Skeleton a végleges elrendezés alakjában, ne pörgő spinner -- a layout ne ugorjon betöltés után. */
function RecentsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Box key={i} py="2">
          <Skeleton>
            <Box height="18px" width="220px" />
          </Skeleton>
          <Box mt="1">
            <Skeleton>
              <Box height="14px" width="150px" />
            </Skeleton>
          </Box>
        </Box>
      ))}
    </>
  );
}
