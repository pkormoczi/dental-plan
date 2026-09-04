// Terv részletei -- egy VÉGLEGESÍTETT verzió read-only nézete
// (`/paciensek/:patientDir/tervek/:planDir/:versionDir`). Lásd
// `docs/03-funkcionalis-spec.md` § 11. "Terv részletei (véglegesített
// verzió)". A `PatientPlanChains.tsx` verziósorának "Megnézés" akciója
// ide navigál a nyers PDF új lapon való megnyitása helyett -- az utóbbi a
// lap saját "Megnyitás külön" akciójává vált.

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge, Box, Button, Callout, Flex, Grid, Skeleton, Table, Text } from '@radix-ui/themes';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrossCircledIcon,
} from '@radix-ui/react-icons';
import Section from '../components/Section';
import { ReadOnlyField } from '../components/Field';
import PlanVersionActionDialog, {
  nincsMentettPdfHiba,
  usePlanVersionActions,
  VerzioAkcioUzenet,
} from '../components/PlanVersionActionDialog';
import FazisokBlokk from './tervReszletei/FazisokBlokk';
import MentettPdfPanel from './tervReszletei/MentettPdfPanel';
import PenzugyiOsszesites from './tervReszletei/PenzugyiOsszesites';
import { t } from '../design/tokens';
import { formatLongDate, formatShortDate } from '../domain/date';
import { MASTER_DIFF_MEZOK, masterSnapshotDiff, mezoErtekSzoveg } from '../domain/masterSnapshotDiff';
import { megjelenitettTorzsadat, paciensTorzsadatbol } from '../domain/paciensAdatok';
import { legfrissebbVerzio, verziokFrissessegSzerint } from '../domain/planFolders';
import { tervReszleteiUtvonal } from '../domain/planVersionActions';
import { megjelenitettTervCim } from '../domain/tervCim';
import type {
  Nyelv,
  Paciens,
  PatientFolder,
  PatientMasterData,
  Penznem,
  Plan,
  PlanFolder,
  PlanVersion,
} from '../domain/types';
import { useAppState } from '../state/AppState';
import { buildDownloadFileName } from '../storage/paths';
import { useStorage } from '../storage/StorageContext';
import { usePlanPdfObjectUrl } from '../storage/usePlanPdfObjectUrl';

const NYELV_LABEL: Record<Nyelv, string> = { hu: 'Magyar', de: 'Deutsch' };
const PENZNEM_LABEL: Record<Penznem, string> = { HUF: 'HUF — forint', EUR: 'EUR — euró' };

interface Reszletek {
  patient: PatientFolder;
  planFolder: PlanFolder;
  versions: PlanVersion[];
  plan: Plan;
  master: PatientMasterData | null;
  masterHiba: string | null;
}

type Allapot =
  | { fajta: 'toltes' }
  | { fajta: 'hiba'; uzenet: string }
  | { fajta: 'nincs'; mit: 'paciens' | 'terv' | 'verzio' }
  | { fajta: 'nem-vegleges' }
  | { fajta: 'kesz'; adat: Reszletek };

const NINCS_UZENET: Record<'paciens' | 'terv' | 'verzio', string> = {
  paciens: 'Nincs ilyen páciens — lehet, hogy elgépelt vagy elavult a link.',
  terv: 'Nincs ilyen terv-lánc — lehet, hogy elgépelt vagy elavult a link.',
  verzio: 'Nincs ilyen verzió — lehet, hogy elgépelt vagy elavult a link.',
};

export default function TervReszleteiPage() {
  const {
    patientDir: rawPatientDir,
    planDir: rawPlanDir,
    versionDir: rawVersionDir,
  } = useParams<{ patientDir: string; planDir: string; versionDir: string }>();
  const patientDir = rawPatientDir ?? '';
  const planDir = rawPlanDir ?? '';
  const versionDir = rawVersionDir ?? '';

  const { storage, loadPlanPdf, isSeedVersion } = useStorage();
  const { priceList } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const akciok = usePlanVersionActions({ patientDir });

  const [allapot, setAllapot] = useState<Allapot>({ fajta: 'toltes' });
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // A beágyazott viewer csak a TÉNYLEGESEN betöltött, véglegesített
  // verzióhoz kér PDF-et -- egy még betöltés alatti/hibás/nem létező
  // útvonalra ne induljon el egy fölösleges `loadPlanPdf` hívás. A hook
  // saját dep-listája (patientDir/planDir/versionDir) adja a verzióváltás-
  // reset + revoke-ot, a `key`-alapú remounttól függetlenül.
  const pdfState = usePlanPdfObjectUrl(
    allapot.fajta === 'kesz' ? { patientDir, planDir, versionDir } : null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAllapot({ fajta: 'toltes' });
      try {
        const [list, plans] = await Promise.all([storage.listPatients(), storage.listPlans(patientDir)]);
        if (cancelled) return;
        const patient = list.find((p) => p.dirName === patientDir);
        if (!patient) {
          setAllapot({ fajta: 'nincs', mit: 'paciens' });
          return;
        }
        const planFolder = plans.find((p) => p.dirName === planDir);
        if (!planFolder) {
          setAllapot({ fajta: 'nincs', mit: 'terv' });
          return;
        }
        const versions = await storage.listVersions(patientDir, planDir);
        if (cancelled) return;
        if (!versions.some((v) => v.dirName === versionDir)) {
          setAllapot({ fajta: 'nincs', mit: 'verzio' });
          return;
        }
        // `listPlans`/`listVersions` mappákat sorol fel, nem dob egy sérült
        // terv.json miatt -- ha a konkrét `loadPlan` mégis dob, az kizárólag
        // olvashatatlanságot jelenthet, sosem hiányzó mappát. A törzsadat
        // (`loadPatientData`) `allSettled`, mert egy sérült
        // paciens-adatok.json nem viheti el egy egyébként olvasható
        // véglegesített terv megjelenítését -- csak az opcionális
        // pillanatkép-diffhez kell.
        const [planRes, masterRes] = await Promise.allSettled([
          storage.loadPlan({ patientDir, planDir, versionDir }),
          storage.loadPatientData(patientDir),
        ]);
        if (cancelled) return;
        if (planRes.status === 'rejected') {
          setAllapot({
            fajta: 'hiba',
            uzenet:
              planRes.reason instanceof Error
                ? planRes.reason.message
                : 'A terv betöltése váratlanul meghiúsult.',
          });
          return;
        }
        const plan = planRes.value;
        // Védőháló egy jövőbeli mentett-PISZKOZAT állapotra -- a
        // `storage.savePlan()`-t ma kizárólag a véglegesítés hívja, tehát ez
        // az ág ma élő kódúton nem érhető el, de a route csak lezárt,
        // változtathatatlan dokumentumot mutathat, egy piszkozatot soha.
        if (plan.statusz !== 'VEGLEGES') {
          setAllapot({ fajta: 'nem-vegleges' });
          return;
        }
        setAllapot({
          fajta: 'kesz',
          adat: {
            patient,
            planFolder,
            versions,
            plan,
            master: masterRes.status === 'fulfilled' ? masterRes.value : null,
            masterHiba:
              masterRes.status === 'rejected'
                ? masterRes.reason instanceof Error
                  ? masterRes.reason.message
                  : 'A törzsadat betöltése váratlanul meghiúsult.'
                : null,
          },
        });
      } catch (err) {
        if (!cancelled) {
          setAllapot({
            fajta: 'hiba',
            uzenet: err instanceof Error ? err.message : 'A terv betöltése váratlanul meghiúsult.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage, patientDir, planDir, versionDir]);

  // A verzióváltás UI-ja `{ replace: true }`-vel navigál (lásd lent) -- a
  // láncon belüli lépegetés oldalirányú mozgás EGY nézeten belül, nem új
  // "hely" a history-ban. Enélkül egy v3->v2->v1 lépegetés után az "Összes
  // verzió" (navigate(-1)) visszavinné a köztes verzióra, nem a listára.
  function vissza() {
    if (location.key === 'default') {
      navigate(`/paciensek/${encodeURIComponent(patientDir)}`, { state: { tab: 'tervek' } });
    } else {
      navigate(-1);
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [planDir, versionDir]);

  // A sticky lap-fejléc magassága CSS változóként -- a fázisok blokk
  // `.fazis-tabla` sticky szabálya (index.css) ebből számolja a saját
  // offsetjét, hogy a két komponensnek ne kelljen ismernie egymás
  // méretét. `headerRef` csak a 'kesz' állapotban mountol (lásd lent) --
  // az `allapot.fajta` a függőséglistában, hogy az effekt UJRAFUSSON,
  // amint a sticky fejléc ténylegesen megjelenik a DOM-ban.
  useEffect(() => {
    const root = rootRef.current;
    const header = headerRef.current;
    if (!root || !header) return;
    const frissit = () => {
      root.style.setProperty('--tr-fejlec-magassag', `${header.getBoundingClientRect().height}px`);
    };
    frissit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(frissit);
    observer.observe(header);
    return () => observer.disconnect();
  }, [allapot.fajta]);

  async function megnyitasKulon() {
    akciok.jelezHiba(null);
    const win = window.open('', '_blank');
    if (!win) {
      akciok.jelezHiba({
        planDir,
        versionDir,
        message:
          'A böngésző letiltotta az új lap megnyitását — engedélyezd a felugró ablakokat ehhez ' +
          'az oldalhoz, vagy használd a Letöltést.',
      });
      return;
    }
    try {
      const bytes = await loadPlanPdf({ patientDir, planDir, versionDir });
      if (!bytes) {
        win.close();
        akciok.jelezHiba(
          nincsMentettPdfHiba({ planDir, versionDir }, isSeedVersion({ patientDir, planDir, versionDir })),
        );
        return;
      }
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      win.location.href = URL.createObjectURL(blob);
    } catch (err) {
      win.close();
      akciok.jelezHiba({
        planDir,
        versionDir,
        message:
          err instanceof Error ? `A megnyitás nem sikerült: ${err.message}` : 'A megnyitás váratlanul meghiúsult.',
      });
    }
  }

  const osszesVerzioGomb = (
    <Button type="button" size="1" variant="ghost" color="gray" mb="3" onClick={vissza}>
      Összes verzió
    </Button>
  );

  if (allapot.fajta === 'toltes') {
    return (
      <Box style={{ maxWidth: 900, margin: '0 auto' }}>
        {osszesVerzioGomb}
        <Skeleton>
          <Box height="52px" mb="4" />
        </Skeleton>
        <Skeleton>
          <Box height="240px" />
        </Skeleton>
      </Box>
    );
  }

  if (allapot.fajta === 'hiba') {
    return (
      <Box style={{ maxWidth: 900, margin: '0 auto' }}>
        {osszesVerzioGomb}
        <Callout.Root color="red">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>A terv betöltése nem sikerült: {allapot.uzenet}</Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  if (allapot.fajta === 'nincs') {
    return (
      <Box style={{ maxWidth: 900, margin: '0 auto' }}>
        {osszesVerzioGomb}
        <Callout.Root color="red">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{NINCS_UZENET[allapot.mit]}</Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  if (allapot.fajta === 'nem-vegleges') {
    return (
      <Box style={{ maxWidth: 900, margin: '0 auto' }}>
        {osszesVerzioGomb}
        <Callout.Root color="gray">
          <Callout.Text>
            Ez a verzió nem véglegesített — a Terv részletei nézet csak véglegesített verziót mutat.
          </Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  const { patient, planFolder, versions, plan, master, masterHiba } = allapot.adat;
  // Ha nincs (még) lezárt törzsadat, a `plan`-t adjuk át fallbackként --
  // ilyenkor a pillanatkép ÖNMAGÁHOZ képest nem mutat eltérést (üres diff),
  // nem kell külön "nincs törzsadat" ágat írni.
  const megjelenitett = megjelenitettTorzsadat(master, plan, patient);
  const masterPaciens = paciensTorzsadatbol(megjelenitett);
  const elteresek = masterSnapshotDiff(masterPaciens, plan.paciens);
  const tervCim = megjelenitettTervCim(planFolder.tervCim, plan, priceList);
  const sorrend = verziokFrissessegSzerint([planFolder], () => versions);
  const idx = sorrend.findIndex((l) => l.version.dirName === versionDir);
  const ujabb = idx > 0 ? sorrend[idx - 1] : null;
  const regebbi = idx >= 0 && idx < sorrend.length - 1 ? sorrend[idx + 1] : null;
  const legfrissebb = legfrissebbVerzio(versions);
  const isLegfrissebb = versionDir === legfrissebb?.dirName;
  const dob = megjelenitett.szuletesiIdo ? formatShortDate(megjelenitett.szuletesiIdo, 'hu') : null;

  return (
    <Box ref={rootRef} style={{ maxWidth: 900, margin: '0 auto' }}>
      <nav
        aria-label="Hol vagyok"
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}
      >
        <Link to="/paciensek" style={{ fontSize: 13, color: t.uiTextMuted, textDecoration: 'none' }}>
          Páciensek
        </Link>
        <Text size="1" color="gray" aria-hidden="true">
          ›
        </Text>
        <Link
          to={`/paciensek/${encodeURIComponent(patientDir)}`}
          state={{ tab: 'tervek' }}
          style={{ fontSize: 13, color: t.uiTextMuted, textDecoration: 'none' }}
        >
          {megjelenitett.nev || 'Névtelen páciens'}
        </Link>
        <Text size="1" color="gray" aria-hidden="true">
          ›
        </Text>
        <Text size="2" weight="medium">
          {tervCim} · v{plan.verzio}
        </Text>
      </nav>

      <Flex
        ref={headerRef}
        justify="between"
        align="start"
        py="3"
        mb="3"
        wrap="wrap"
        gap="3"
        data-testid="terv-reszletei-fejlec"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: t.page,
          borderBottom: `1px solid ${t.uiLine}`,
        }}
      >
        <Flex direction="column" gap="1">
          <Text size="4" weight="bold" style={{ color: t.brand }}>
            {megjelenitett.nev || 'Névtelen páciens'}
          </Text>
          {dob && (
            <Text size="2" style={{ color: t.uiTextMuted }}>
              {dob}
            </Text>
          )}
        </Flex>
        <Flex gap="2" align="center" wrap="wrap">
          {isLegfrissebb ? (
            <Button size="1" onClick={() => akciok.inditas({ kind: 'open', planDir, versionDir })}>
              Új verzió
            </Button>
          ) : (
            legfrissebb && (
              <Button
                size="1"
                variant="soft"
                color="gray"
                onClick={() =>
                  navigate(
                    tervReszleteiUtvonal(patientDir, { planDir, versionDir: legfrissebb.dirName }),
                    { replace: true },
                  )
                }
              >
                Ugrás a legfrissebbre
              </Button>
            )
          )}
          <Button
            size="1"
            variant="soft"
            color="gray"
            disabled={pdfState.hianyzik}
            onClick={() => void megnyitasKulon()}
          >
            Megnyitás külön
          </Button>
          {pdfState.url ? (
            <Button asChild size="1" variant="soft" color="gray">
              <a
                href={pdfState.url}
                download={buildDownloadFileName(plan.paciens.nev, {
                  tervId: planFolder.tervId,
                  isDraft: false,
                  suffix: versionDir,
                })}
              >
                Letöltés
              </a>
            </Button>
          ) : (
            <Button size="1" variant="soft" color="gray" disabled>
              Letöltés
            </Button>
          )}
          <Button
            size="1"
            variant="soft"
            onClick={() => akciok.inditas({ kind: 'copy', planDir, versionDir, historical: !isLegfrissebb })}
          >
            Másolás új tervbe
          </Button>
        </Flex>
      </Flex>

      {akciok.hiba && <VerzioAkcioUzenet hiba={akciok.hiba} />}

      <Flex gap="2" align="center" mb="4" wrap="wrap">
        {regebbi ? (
          <Button
            type="button"
            size="1"
            variant="soft"
            color="gray"
            onClick={() =>
              navigate(tervReszleteiUtvonal(patientDir, { planDir, versionDir: regebbi.version.dirName }), {
                replace: true,
              })
            }
          >
            <ChevronLeftIcon />v{regebbi.version.verzio} · {formatShortDate(regebbi.version.isoDate, 'hu')}
          </Button>
        ) : (
          <Box />
        )}
        <Button type="button" size="1" variant="ghost" color="gray" onClick={vissza}>
          Összes verzió
        </Button>
        {ujabb && (
          <Button
            type="button"
            size="1"
            variant="soft"
            color="gray"
            onClick={() =>
              navigate(tervReszleteiUtvonal(patientDir, { planDir, versionDir: ujabb.version.dirName }), {
                replace: true,
              })
            }
          >
            v{ujabb.version.verzio} · {formatShortDate(ujabb.version.isoDate, 'hu')}
            <ChevronRightIcon />
          </Button>
        )}
      </Flex>

      {/* A `key` verzióváltáskor a teljes alfát unmountolja/remountolja --
          ez az oldal ALAPMINTÁJA a lokális UI-state (nyitott blokkok,
          kijelölések, fogtérkép-navigáció) alapállapotba állítására, hogy a
          tartalom-blokknak ne kelljen külön reset-kódot írnia. */}
      <Box key={`${planDir}/${versionDir}`}>
        <PenzugyiOsszesites plan={plan} />
        <FazisokBlokk plan={plan} priceList={priceList} />

        <TervMetaadatok plan={plan} tervCim={tervCim} />
        <PaciensPillanatkep
          paciens={plan.paciens}
          masterPaciens={masterPaciens}
          elteresek={elteresek}
          masterHiba={masterHiba}
          patientDir={patientDir}
        />
        <MentettPdfPanel
          url={pdfState.url}
          toltes={pdfState.toltes}
          hianyzik={pdfState.hianyzik}
          hiba={pdfState.hiba}
          demoEredetu={isSeedVersion({ patientDir, planDir, versionDir })}
        />
      </Box>

      <PlanVersionActionDialog akciok={akciok} />
    </Box>
  );
}

function TervMetaadatok({ plan, tervCim }: { plan: Plan; tervCim: string }) {
  return (
    <Section title="A terv adatai">
      <Grid columns={{ initial: '1', sm: '2' }} gap="3">
        <ReadOnlyField label="Terv címe" value={tervCim} />
        <ReadOnlyField label="Verzió" value={`v${plan.verzio}`} />
        <ReadOnlyField label="Keltezés" value={formatLongDate(plan.keltezes, 'hu')} />
        <ReadOnlyField label="Érvényes eddig" value={formatLongDate(plan.ervenyesIg, 'hu')} />
        <ReadOnlyField label="Dokumentum nyelve" value={NYELV_LABEL[plan.nyelv]} />
        <ReadOnlyField label="Pénznem" value={PENZNEM_LABEL[plan.penznem]} />
        <ReadOnlyField label="Kezelőorvos" value={plan.orvos} />
      </Grid>
      <Flex gap="2" mt="3">
        <Badge color="gray" variant="soft" size="1">
          Véglegesített
        </Badge>
        {plan.csakAjanlat === true && (
          <Badge color="gray" variant="soft" size="1">
            Csak ajánlat
          </Badge>
        )}
      </Flex>
    </Section>
  );
}

function PaciensPillanatkep({
  paciens,
  masterPaciens,
  elteresek,
  masterHiba,
  patientDir,
}: {
  paciens: Paciens;
  masterPaciens: Paciens;
  elteresek: ReturnType<typeof masterSnapshotDiff>;
  masterHiba: string | null;
  patientDir: string;
}) {
  const [nyitva, setNyitva] = useState(false);

  return (
    <Section title="Páciens adatai a véglegesítéskor">
      <Button
        type="button"
        size="1"
        variant="ghost"
        aria-expanded={nyitva}
        aria-controls="paciens-pillanatkep"
        onClick={() => setNyitva((v) => !v)}
      >
        {nyitva ? <ChevronDownIcon /> : <ChevronRightIcon />}
        <Text size="2" weight="medium">
          Megjelenítés
        </Text>
        {elteresek.length > 0 && (
          <Badge color="amber" variant="soft" size="1" ml="1">
            {elteresek.length} mező azóta módosult
          </Badge>
        )}
      </Button>

      {nyitva && (
        <Box id="paciens-pillanatkep" mt="3">
          {masterHiba && (
            <Text as="p" size="1" color="gray" mb="3">
              A jelenlegi törzsadat nem olvasható, az összevetés kimarad.
            </Text>
          )}
          <Grid columns={{ initial: '1', sm: '2' }} gap="3">
            {MASTER_DIFF_MEZOK.map(({ kulcs, cimke }) => (
              <ReadOnlyField key={kulcs} label={cimke} value={mezoErtekSzoveg(paciens, kulcs)} />
            ))}
          </Grid>

          {elteresek.length > 0 && !masterHiba && (
            <>
              <Text as="p" size="2" color="gray" mt="3" mb="2">
                A páciens törzsadata azóta módosult — ez a blokk a véglegesítéskori pillanatképet
                mutatja, a véglegesített terv nem módosul.
              </Text>
              <Box style={{ border: `1px solid ${t.uiLine}`, borderRadius: t.radius, overflow: 'hidden' }}>
                <Table.Root size="1">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Mező</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Törzsadat</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>A terv adata</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {elteresek.map((e) => (
                      <Table.Row key={e.kulcs}>
                        <Table.Cell>{e.cimke}</Table.Cell>
                        <Table.Cell>{mezoErtekSzoveg(masterPaciens, e.kulcs) || '—'}</Table.Cell>
                        <Table.Cell>{mezoErtekSzoveg(paciens, e.kulcs) || '—'}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
              <Text as="p" size="1" mt="2">
                <Link
                  to={`/paciensek/${encodeURIComponent(patientDir)}`}
                  state={{ tab: 'adatai' }}
                  style={{ color: t.uiTextMuted }}
                >
                  Páciens jelenlegi adatai →
                </Link>
              </Text>
            </>
          )}
        </Box>
      )}
    </Section>
  );
}
