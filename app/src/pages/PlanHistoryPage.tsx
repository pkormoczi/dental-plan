// Korábbi tervek -- docs/03-funkcionalis-spec.md "5. Korábbi tervek".
//
// Ez a legerősebb indoka a fájlrendszer-hozzáférésnek: egy visszatérő
// pácienshez ne kelljen újragépelni a tételeket. A megnyitott verzió a
// szerkesztő piszkozatába töltődik; egy újabb véglegesítés a meglévő
// tervId mellé ÚJ verziót ír (D4) -- ezt a storage.savePlan már tudja,
// itt nincs külön logika hozzá.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Callout, Flex, Heading, Separator, Skeleton, Text, TextField } from '@radix-ui/themes';
import { CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { t } from '../design/tokens';
import { norm } from '../domain/search';
import type { PatientFolder, PlanVersion } from '../domain/types';
import { useAppState } from '../state/AppState';
import { useStorage } from '../storage/StorageContext';

interface ActionError {
  patientDir: string;
  versionDir: string;
  message: string;
}

export default function PlanHistoryPage() {
  const { storage, loadPlanPdf } = useStorage();
  const { loadPlanIntoDraft } = useAppState();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [versionsByPatient, setVersionsByPatient] = useState<Record<string, PlanVersion[]>>({});
  const [namesByPatient, setNamesByPatient] = useState<Record<string, string>>({});
  // P1-2: eddig egyetlen sérült/inkompatibilis terv (`Promise.all`,
  // all-or-nothing) az EGÉSZ listát megbénította -- egy páciens sem
  // jelent meg, csak az örök "Betöltés…". `Promise.allSettled`-del a
  // hibás páciens sora "⚠ nem olvasható" jelöléssel jelenik meg, a többi
  // rendben betölt.
  const [unreadable, setUnreadable] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  // P1-2: a megnyitás/letöltés hibája korábban `alert()`-tel jelent meg --
  // egy adott verzió-sorhoz kötött hiba, ezért annak a sornak a szövegeként
  // jelenik meg (Design.md: "Nem toast, ha a hiba egy mezőhöz tartozik").
  const [actionError, setActionError] = useState<ActionError | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setListError(null);
      try {
        const list = await storage.listPatients();
        const failed = new Set<string>();

        const versionResults = await Promise.allSettled(
          list.map((p) => storage.listVersions(p.dirName)),
        );
        const versionsMap: Record<string, PlanVersion[]> = {};
        versionResults.forEach((res, i) => {
          const dirName = list[i].dirName;
          if (res.status === 'fulfilled') {
            versionsMap[dirName] = res.value;
          } else {
            failed.add(dirName);
          }
        });

        // A megjelenített név a terv.json paciens.nev mezőjéből jön -- a
        // mappanév-visszafejtés (parsePatientDirName) csak best-effort.
        const nameResults = await Promise.allSettled(
          list.map(async (p) => {
            const versions = versionsMap[p.dirName] ?? [];
            const latest = versions[versions.length - 1];
            if (!latest) return `${p.vezeteknev} ${p.keresztnev}`.trim();
            const plan = await storage.loadPlan({ patientDir: p.dirName, versionDir: latest.dirName });
            return plan.paciens.nev;
          }),
        );
        const namesMap: Record<string, string> = {};
        nameResults.forEach((res, i) => {
          const p = list[i];
          if (res.status === 'fulfilled') {
            namesMap[p.dirName] = res.value;
          } else {
            failed.add(p.dirName);
            namesMap[p.dirName] = `${p.vezeteknev} ${p.keresztnev}`.trim() || p.dirName;
          }
        });

        if (cancelled) return;
        setPatients(list);
        setVersionsByPatient(versionsMap);
        setNamesByPatient(namesMap);
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
    .filter((p) => !q.trim() || norm(namesByPatient[p.dirName] ?? '').includes(norm(q)))
    .sort((a, b) => (namesByPatient[a.dirName] ?? '').localeCompare(namesByPatient[b.dirName] ?? ''));

  async function openVersion(patientDir: string, versionDir: string) {
    setActionError(null);
    try {
      const plan = await storage.loadPlan({ patientDir, versionDir });
      loadPlanIntoDraft(plan);
      navigate('/terv');
    } catch (err) {
      // P1-2: korábban nem volt catch -- hibázó betöltésre a gomb némán
      // nem csinált semmit, a doki nem tudta, próbálkozzon-e újra.
      setActionError({
        patientDir,
        versionDir,
        message:
          err instanceof Error
            ? `A terv megnyitása nem sikerült: ${err.message}`
            : 'A terv megnyitása váratlanul meghiúsult.',
      });
    }
  }

  async function downloadVersion(patientDir: string, versionDir: string, tervId: string) {
    setActionError(null);
    try {
      const bytes = await loadPlanPdf({ patientDir, versionDir });
      if (!bytes) {
        setActionError({ patientDir, versionDir, message: 'Ehhez a verzióhoz nincs mentett PDF.' });
        return;
      }
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kezelesi-terv-${tervId}-${versionDir}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError({
        patientDir,
        versionDir,
        message:
          err instanceof Error
            ? `A letöltés nem sikerült: ${err.message}`
            : 'A letöltés váratlanul meghiúsult.',
      });
    }
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

      {filtered.map((p, pi) => (
        <Box key={p.dirName} mb="5">
          <Text as="div" size="3" weight="bold" mb="2" style={{ color: t.brand }}>
            {namesByPatient[p.dirName] ?? p.dirName}
            {unreadable.has(p.dirName) && (
              <Text size="1" weight="regular" ml="2" style={{ color: t.warn }}>
                ⚠ néhány verziója nem olvasható
              </Text>
            )}
          </Text>

          {(versionsByPatient[p.dirName] ?? [])
            .slice()
            .reverse()
            .map((v, vi) => (
              <Box key={v.dirName}>
                {vi > 0 && <Separator size="4" />}
                <Flex justify="between" align="center" py="2">
                  <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    v{v.verzio} · {v.isoDate}
                  </Text>
                  <Flex gap="2">
                    <Button
                      size="1"
                      variant="soft"
                      color="gray"
                      onClick={() => downloadVersion(p.dirName, v.dirName, p.patientId)}
                    >
                      Letöltés
                    </Button>
                    <Button size="1" onClick={() => openVersion(p.dirName, v.dirName)}>
                      Megnyitás szerkesztésre
                    </Button>
                  </Flex>
                </Flex>
                {actionError?.patientDir === p.dirName && actionError.versionDir === v.dirName && (
                  <Callout.Root color="red" size="1" mb="2">
                    <Callout.Icon>
                      <CrossCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>{actionError.message}</Callout.Text>
                  </Callout.Root>
                )}
              </Box>
            ))}

          {pi < filtered.length - 1 && <Separator size="4" mt="3" color="gray" />}
        </Box>
      ))}
    </Box>
  );
}

/** Design.md: skeleton a végleges elrendezés alakjában, ne pörgő spinner. */
function HistorySkeleton() {
  return (
    <>
      {[0, 1].map((i) => (
        <Box key={i} mb="5">
          <Skeleton>
            <Box height="20px" width="160px" />
          </Skeleton>
          <Flex justify="between" align="center" py="2" mt="2">
            <Skeleton>
              <Box height="16px" width="120px" />
            </Skeleton>
            <Flex gap="2">
              <Skeleton>
                <Box height="28px" width="72px" />
              </Skeleton>
              <Skeleton>
                <Box height="28px" width="160px" />
              </Skeleton>
            </Flex>
          </Flex>
        </Box>
      ))}
    </>
  );
}
