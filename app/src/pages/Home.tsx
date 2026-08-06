import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '../design/tokens';
import { card } from '../design/ui';
import { useAppState } from '../state/AppState';
import { useStorage } from '../storage/StorageContext';

export default function Home() {
  const { resetDemoData, clearAll } = useStorage();
  const { resetPlanDraft, reloadFromStorage } = useAppState();
  const navigate = useNavigate();
  const [justReset, setJustReset] = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!confirm('Biztosan visszaállítod a demó adatot? Minden saját szerkesztésed elvész.')) {
      return;
    }
    setError(null);
    try {
      resetDemoData();
      // P0-6: korábban itt állt meg a reset -- a localStorage frissült, de
      // az AppState memóriabeli settings/priceList/plan state-je nem, így a
      // következő mentés csendben visszaírta a régi állapotot a friss seed
      // fölé. A "Visszaállítva ✓" csak akkor jelenik meg, ha ez is lefutott.
      await reloadFromStorage();
      setJustReset(true);
      setTimeout(() => setJustReset(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A visszaállítás váratlanul meghiúsult.');
    }
  }

  async function handleClearAll() {
    if (
      !confirm(
        'Biztosan törlöd ÖSSZES adatot (árlista, beállítások, minden mentett terv)? Ez nem ' +
          'demó-visszaállítás, hanem teljes törlés -- utána a Demó adat visszaállítása gombbal ' +
          'tudsz újra a seedből kiindulni.',
      )
    ) {
      return;
    }
    setError(null);
    try {
      clearAll();
      resetDemoData();
      await reloadFromStorage();
      setJustCleared(true);
      setTimeout(() => setJustCleared(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A törlés váratlanul meghiúsult.');
    }
  }

  function startNewPlan() {
    resetPlanDraft();
    navigate('/paciens');
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, color: t.brand, marginBottom: 4 }}>
        Kezelési terv és árajánlat
      </h1>
      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>
        Mándoki Dental — demó verzió a UX validálásához.
      </p>

      {error && (
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
          {error}
        </div>
      )}

      <div style={card}>
        <p style={{ fontSize: 13, marginTop: 0 }}>
          Ez a mockup a végleges alkalmazás vázán fut, demó adatokkal. A
          véglegesben ugyanez az alkalmazás egy, a doki gépén kijelölt
          mappába ír majd — itt egyelőre a böngésző tárolja az adatot.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button style={btnPrimary} onClick={startNewPlan}>
            Új terv indítása
          </button>
          <Link to="/tervek" style={{ textDecoration: 'none' }}>
            <button style={btnSecondary}>Korábbi tervek</button>
          </Link>
          <button style={btnSecondary} onClick={handleReset}>
            {justReset ? 'Visszaállítva ✓' : 'Demó adat visszaállítása'}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.danger, marginBottom: 6 }}>
          Adatvédelem
        </div>
        <p style={{ fontSize: 12.5, color: t.textMuted, marginTop: 0 }}>
          Ez a demó a böngésző <span style={{ fontFamily: t.mono }}>localStorage</span>-ában,
          titkosítatlanul tárol mindent, amit beírsz -- ide valódi páciensadat nem való (lásd a
          fenti DEMÓ sávot). Ha véletlenül mégis valódit vittél be, ez a gomb ténylegesen kiüríti a
          tárolót (nem csak visszaseedeli a demó adatot).
        </p>
        <button style={btnDanger} onClick={handleClearAll}>
          {justCleared ? 'Törölve ✓' : 'Minden adat törlése'}
        </button>
      </div>
    </div>
  );
}

const btnPrimary = {
  height: 34,
  fontSize: 13,
  padding: '0 14px',
  borderRadius: t.radius,
  cursor: 'pointer',
  fontFamily: 'inherit',
  border: `1px solid ${t.ink}`,
  background: t.ink,
  color: t.onBrand,
} as const;

const btnSecondary = {
  ...btnPrimary,
  background: t.surface,
  color: t.text,
  border: `1px solid ${t.lineStrong}`,
} as const;

const btnDanger = {
  ...btnPrimary,
  background: t.surface,
  color: t.danger,
  border: `1px solid ${t.dangerBorder}`,
} as const;
