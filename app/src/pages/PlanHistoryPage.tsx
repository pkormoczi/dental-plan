// Korábbi tervek -- docs/03-funkcionalis-spec.md "5. Korábbi tervek".
//
// Ez a legerősebb indoka a fájlrendszer-hozzáférésnek: egy visszatérő
// pácienshez ne kelljen újragépelni a tételeket. A megnyitott verzió a
// szerkesztő piszkozatába töltődik; egy újabb véglegesítés a meglévő
// tervId mellé ÚJ verziót ír (D4) -- ezt a storage.savePlan már tudja,
// itt nincs külön logika hozzá.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../design/tokens';
import { btn, card, input } from '../design/ui';
import { norm } from '../domain/search';
import type { PatientFolder, PlanVersion } from '../domain/types';
import { useAppState } from '../state/AppState';
import { useStorage } from '../storage/StorageContext';

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
    try {
      const plan = await storage.loadPlan({ patientDir, versionDir });
      loadPlanIntoDraft(plan);
      navigate('/terv');
    } catch (err) {
      // P1-2: korábban nem volt catch -- hibázó betöltésre a gomb némán
      // nem csinált semmit, a doki nem tudta, próbálkozzon-e újra.
      alert(
        err instanceof Error
          ? `A terv megnyitása nem sikerült: ${err.message}`
          : 'A terv megnyitása váratlanul meghiúsult.',
      );
    }
  }

  async function downloadVersion(patientDir: string, versionDir: string, tervId: string) {
    try {
      const bytes = await loadPlanPdf({ patientDir, versionDir });
      if (!bytes) {
        alert('Ehhez a verzióhoz nincs mentett PDF.');
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
      alert(
        err instanceof Error
          ? `A letöltés nem sikerült: ${err.message}`
          : 'A letöltés váratlanul meghiúsult.',
      );
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, color: t.brand, marginBottom: 16 }}>Korábbi tervek</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Keresés páciensnévre…"
        style={{ ...input, height: 36, marginBottom: 14 }}
      />

      {listError && (
        <div
          style={{
            background: t.dangerBg,
            color: t.danger,
            fontSize: 12.5,
            padding: '8px 14px',
            borderRadius: t.radiusLg,
            marginBottom: 14,
          }}
        >
          A lista betöltése nem sikerült: {listError}
        </div>
      )}

      {loading && <div style={{ color: t.textMuted, fontSize: 13 }}>Betöltés…</div>}
      {!loading && filtered.length === 0 && !listError && (
        <div style={{ color: t.textMuted, fontSize: 13 }}>Nincs találat.</div>
      )}

      {filtered.map((p) => (
        <div key={p.dirName} style={card}>
          <div style={{ fontWeight: 600, color: t.brand, marginBottom: 6, fontSize: 14 }}>
            {namesByPatient[p.dirName] ?? p.dirName}
            {unreadable.has(p.dirName) && (
              <span style={{ fontSize: 11, fontWeight: 400, color: t.warn, marginLeft: 8 }}>
                ⚠ néhány verziója nem olvasható
              </span>
            )}
          </div>
          {(versionsByPatient[p.dirName] ?? [])
            .slice()
            .reverse()
            .map((v) => (
              <div
                key={v.dirName}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderTop: `1px solid ${t.line}`,
                }}
              >
                <span style={{ fontSize: 13 }}>
                  v{v.verzio} · {v.isoDate}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btn()} onClick={() => downloadVersion(p.dirName, v.dirName, p.patientId)}>
                    Letöltés
                  </button>
                  <button style={btn(true)} onClick={() => openVersion(p.dirName, v.dirName)}>
                    Megnyitás szerkesztésre
                  </button>
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
