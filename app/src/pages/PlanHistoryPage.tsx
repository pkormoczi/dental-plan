// Korábbi tervek -- docs/03-funkcionalis-spec.md "5. Korábbi tervek".
//
// Ez a legerősebb indoka a fájlrendszer-hozzáférésnek: egy visszatérő
// pácienshez ne kelljen újragépelni a tételeket. Háromszintű fa (páciens →
// terv → verzió, D29) -- egy páciensnek több terv-lánca is lehet. A
// páciensenkénti terv-lánc/verzió fa és a hozzá tartozó akciók
// (backlog-30 óta) a `components/PatientPlanChains.tsx`-ben élnek -- ez az
// oldal csak listáz, szűr és betölt, a renderelést/interakciót átadja neki.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Callout, Flex, Heading, Separator, Skeleton, Text, TextField } from '@radix-ui/themes';
import { CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import PatientPlanChains from '../components/PatientPlanChains';
import { t } from '../design/tokens';
import { type PlanChainData, loadPlanChainData } from '../domain/planChainData';
import { norm } from '../domain/search';
import type { PatientFolder } from '../domain/types';
import { useStorage } from '../storage/StorageContext';

const EMPTY_CHAIN_DATA: PlanChainData = {
  plans: [],
  versionsByPlan: {},
  plansByVersion: {},
  totalsByVersion: {},
  unreadable: false,
};

export default function PlanHistoryPage() {
  const { storage } = useStorage();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [chainDataByPatient, setChainDataByPatient] = useState<Record<string, PlanChainData>>({});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setListError(null);
      try {
        const list = await storage.listPatients();
        // P1-2: egyetlen sérült/inkompatibilis páciens ne bénítsa meg az
        // egész listát -- egy hibázó betöltés ⚠-jelöléssel, üres lánccal
        // jelenik meg, a többi rendben betölt.
        const results = await Promise.allSettled(list.map((p) => loadPlanChainData(storage, p.dirName)));
        if (cancelled) return;
        const dataByPatient: Record<string, PlanChainData> = {};
        results.forEach((res, i) => {
          dataByPatient[list[i].dirName] =
            res.status === 'fulfilled' ? res.value : { ...EMPTY_CHAIN_DATA, unreadable: true };
        });
        setPatients(list);
        setChainDataByPatient(dataByPatient);
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
    .filter((p) => {
      const data = chainDataByPatient[p.dirName];
      return (data?.plans.length ?? 0) > 0 || data?.unreadable === true;
    })
    .sort((a, b) => a.nev.localeCompare(b.nev));

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
        const data = chainDataByPatient[p.dirName] ?? EMPTY_CHAIN_DATA;
        return (
          // `data-patient` a páciensblokk stabil horgonya -- a névfejléc DOM-beli
          // mélysége az akciógomb kiemelése óta nem alkalmas erre (lásd
          // PlanHistoryPage.test.tsx).
          <Box key={p.dirName} mb="5" data-patient={p.dirName}>
            <PatientPlanChains
              patient={p}
              plans={data.plans}
              versionsByPlan={data.versionsByPlan}
              plansByVersion={data.plansByVersion}
              totalsByVersion={data.totalsByVersion}
              unreadable={data.unreadable}
              onNavigateToPatientData={() =>
                navigate(`/paciensek/${encodeURIComponent(p.dirName)}`, { state: { tab: 'adatai' } })
              }
              onLabelSaved={(planDir, tervCim) =>
                setChainDataByPatient((prev) => {
                  const current = prev[p.dirName];
                  if (!current) return prev;
                  return {
                    ...prev,
                    [p.dirName]: {
                      ...current,
                      plans: current.plans.map((plan) =>
                        plan.dirName === planDir ? { ...plan, tervCim } : plan,
                      ),
                    },
                  };
                })
              }
            />
            {pi < filtered.length - 1 && <Separator size="4" mt="3" color="gray" />}
          </Box>
        );
      })}
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
