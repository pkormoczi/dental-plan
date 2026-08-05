// Előnézet és véglegesítés -- portolva ui/PrintPreview.jsx-ből, valódi
// @react-pdf/renderer kimenetre kötve (nem HTML előnézet). Lásd
// docs/03-funkcionalis-spec.md "4. Előnézet és véglegesítés".

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePDF } from '@react-pdf/renderer';
import { t } from '../design/tokens';
import { btn } from '../design/ui';
import { computeOsszesitok } from '../domain/totals';
import type { PlanRef } from '../domain/types';
import { TervDocument } from '../pdf/TervDocument';
import { useAppState } from '../state/AppState';
import { useStorage } from '../storage/StorageContext';

export default function PreviewPage() {
  const { plan, setPlan, settings, resetPlanDraft } = useAppState();
  const { storage, loadLatestTemplateByBase } = useStorage();
  const navigate = useNavigate();

  const [offerOnly, setOfferOnly] = useState(false);
  const [nyilatkozatMd, setNyilatkozatMd] = useState('');
  const [fizetesiFeltetelekMd, setFizetesiFeltetelekMd] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedRef, setSavedRef] = useState<PlanRef | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [nyil, fiz] = await Promise.all([
        storage.loadTemplate(`${plan.sablonVerzio}.md`),
        loadLatestTemplateByBase('fizetesi-feltetelek-hu'),
      ]);
      if (!cancelled) {
        setNyilatkozatMd(nyil);
        setFizetesiFeltetelekMd(fiz);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan.sablonVerzio, storage, loadLatestTemplateByBase]);

  const [pdfInstance] = usePDF({
    document: (
      <TervDocument
        plan={plan}
        settings={settings}
        offerOnly={offerOnly}
        nyilatkozatMd={nyilatkozatMd}
        fizetesiFeltetelekMd={fizetesiFeltetelekMd}
      />
    ),
  });

  const nameMissing = !plan.paciens.nev.trim();
  const otherFieldsMissing =
    !plan.paciens.szuletesiIdo ||
    !plan.paciens.lakcim ||
    !plan.paciens.telefon ||
    !plan.paciens.email ||
    !plan.paciens.taj;

  async function finalize() {
    // Csak a név kötelező (a mappanévhez), a többi hiánya csak figyelmeztet,
    // nem blokkol -- docs/03-funkcionalis-spec.md "2. Páciens adatlap".
    if (nameMissing) {
      alert('A páciens neve kötelező a véglegesítéshez.');
      return;
    }
    if (otherFieldsMissing) {
      const proceed = confirm(
        'Néhány páciensadat hiányzik (nem kötelező, de a nyomtatványon üresen marad). Folytatod a véglegesítést?',
      );
      if (!proceed) return;
    }
    if (!pdfInstance.blob) return;

    setSaving(true);
    try {
      const finalPlan = {
        ...plan,
        statusz: 'VEGLEGES' as const,
        osszesitok: computeOsszesitok(plan.fazisok),
      };
      const bytes = new Uint8Array(await pdfInstance.blob.arrayBuffer());
      const ref = await storage.savePlan(finalPlan, bytes);
      const persisted = await storage.loadPlan(ref); // tervId/verzio a storage tölti ki (D4)
      setPlan(persisted);
      setSavedRef(ref);
    } finally {
      setSaving(false);
    }
  }

  function startNewPlan() {
    resetPlanDraft();
    navigate('/paciens');
  }

  if (savedRef) {
    return (
      <div style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: t.ok, marginBottom: 8 }}>A terv elmentve ✓</div>
        <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 20, fontFamily: t.mono }}>
          {savedRef.patientDir} / {savedRef.versionDir}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button style={btn(true)} onClick={startNewPlan}>
            Új terv indítása
          </button>
          <button style={btn()} onClick={() => navigate('/tervek')}>
            Korábbi tervek
          </button>
        </div>
      </div>
    );
  }

  const busy = saving || pdfInstance.loading;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={offerOnly}
            onChange={(e) => setOfferOnly(e.target.checked)}
          />
          Csak ajánlat — a nyilatkozat és aláírás oldal nélkül
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {pdfInstance.url && (
            <a
              href={pdfInstance.url}
              download={`kezelesi-terv-${plan.tervId || 'uj'}.pdf`}
              style={{ textDecoration: 'none' }}
            >
              <button style={btn()}>Letöltés</button>
            </a>
          )}
          <button
            style={{ ...btn(true), opacity: busy ? 0.6 : 1 }}
            onClick={finalize}
            disabled={busy}
          >
            {saving ? 'Mentés…' : 'Véglegesítés és mentés'}
          </button>
        </div>
      </div>

      {pdfInstance.url ? (
        <iframe
          title="Kezelési terv előnézet"
          src={pdfInstance.url}
          style={{
            width: '100%',
            height: '80vh',
            border: `1px solid ${t.line}`,
            borderRadius: t.radiusLg,
          }}
        />
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>
          PDF előállítása…
        </div>
      )}
    </div>
  );
}
