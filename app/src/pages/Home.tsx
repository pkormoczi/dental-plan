import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../design/tokens';
import { card } from '../design/ui';
import { useStorage } from '../storage/StorageContext';

export default function Home() {
  const { resetDemoData } = useStorage();
  const [justReset, setJustReset] = useState(false);

  function handleReset() {
    if (!confirm('Biztosan visszaállítod a demó adatot? Minden saját szerkesztésed elvész.')) {
      return;
    }
    resetDemoData();
    setJustReset(true);
    setTimeout(() => setJustReset(false), 2500);
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, color: t.navy, marginBottom: 4 }}>
        Kezelési terv és árajánlat
      </h1>
      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>
        Mándoki Dental — demó verzió a UX validálásához.
      </p>

      <div style={card}>
        <p style={{ fontSize: 13, marginTop: 0 }}>
          Ez a mockup a végleges alkalmazás vázán fut, demó adatokkal. A
          véglegesben ugyanez az alkalmazás egy, a doki gépén kijelölt
          mappába ír majd — itt egyelőre a böngésző tárolja az adatot.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <Link to="/terv" style={{ textDecoration: 'none' }}>
            <button style={btnPrimary}>Új terv indítása</button>
          </Link>
          <Link to="/tervek" style={{ textDecoration: 'none' }}>
            <button style={btnSecondary}>Korábbi tervek</button>
          </Link>
          <button style={btnSecondary} onClick={handleReset}>
            {justReset ? 'Visszaállítva ✓' : 'Demó adat visszaállítása'}
          </button>
        </div>
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
  border: `1px solid ${t.navy}`,
  background: t.navy,
  color: '#fff',
} as const;

const btnSecondary = {
  ...btnPrimary,
  background: t.surface,
  color: t.text,
  border: `1px solid ${t.lineStrong}`,
} as const;
