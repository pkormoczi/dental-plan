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
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await storage.listPatients();
      const versionEntries = await Promise.all(
        list.map(async (p) => [p.dirName, await storage.listVersions(p.dirName)] as const),
      );
      const versionsMap = Object.fromEntries(versionEntries);

      // A megjelenített név a terv.json paciens.nev mezőjéből jön -- a
      // mappanév-visszafejtés (parsePatientDirName) csak best-effort.
      const nameEntries = await Promise.all(
        list.map(async (p) => {
          const versions = versionsMap[p.dirName] ?? [];
          const latest = versions[versions.length - 1];
          if (!latest) return [p.dirName, `${p.vezeteknev} ${p.keresztnev}`.trim()] as const;
          const plan = await storage.loadPlan({ patientDir: p.dirName, versionDir: latest.dirName });
          return [p.dirName, plan.paciens.nev] as const;
        }),
      );

      if (cancelled) return;
      setPatients(list);
      setVersionsByPatient(versionsMap);
      setNamesByPatient(Object.fromEntries(nameEntries));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const filtered = patients
    .filter((p) => !q.trim() || norm(namesByPatient[p.dirName] ?? '').includes(norm(q)))
    .sort((a, b) => (namesByPatient[a.dirName] ?? '').localeCompare(namesByPatient[b.dirName] ?? ''));

  async function openVersion(patientDir: string, versionDir: string) {
    const plan = await storage.loadPlan({ patientDir, versionDir });
    loadPlanIntoDraft(plan);
    navigate('/terv');
  }

  async function downloadVersion(patientDir: string, versionDir: string, tervId: string) {
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

      {loading && <div style={{ color: t.textMuted, fontSize: 13 }}>Betöltés…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ color: t.textMuted, fontSize: 13 }}>Nincs találat.</div>
      )}

      {filtered.map((p) => (
        <div key={p.dirName} style={card}>
          <div style={{ fontWeight: 600, color: t.brand, marginBottom: 6, fontSize: 14 }}>
            {namesByPatient[p.dirName] ?? p.dirName}
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
