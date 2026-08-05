// Páciens adatlap -- docs/03-funkcionalis-spec.md "2. Páciens adatlap".
//
// Csak a név kötelező (ebből képződik a mappanév). A többi hiánya
// véglegesítéskor figyelmeztetést ad, de nem blokkol -- itt sincs
// kényszerített kitöltés, csak a "Tovább" gomb jelzi, ha a név üres.

import { useNavigate } from 'react-router-dom';
import { t } from '../design/tokens';
import { btn, card, input } from '../design/ui';
import { useAppState } from '../state/AppState';

export default function PatientPage() {
  const { plan, setPlan } = useAppState();
  const navigate = useNavigate();
  const paciens = plan.paciens;

  function patch(fields: Partial<typeof paciens>) {
    setPlan((prev) => ({ ...prev, paciens: { ...prev.paciens, ...fields } }));
  }

  const nameMissing = !paciens.nev.trim();

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, color: t.navy, marginBottom: 16 }}>Páciens adatlap</h1>

      <div style={card}>
        <Field label="Név *">
          <input
            autoFocus
            value={paciens.nev}
            onChange={(e) => patch({ nev: e.target.value })}
            placeholder="Kovács János"
            style={input}
          />
        </Field>

        <Row>
          <Field label="Született">
            <input
              type="date"
              value={paciens.szuletesiIdo}
              onChange={(e) => patch({ szuletesiIdo: e.target.value })}
              style={input}
            />
          </Field>
          <Field label="TAJ">
            <input
              value={paciens.taj}
              onChange={(e) => patch({ taj: e.target.value })}
              placeholder="123 456 789"
              style={input}
            />
          </Field>
        </Row>

        <Field label="Lakcím">
          <input
            value={paciens.lakcim}
            onChange={(e) => patch({ lakcim: e.target.value })}
            placeholder="1113 Budapest, Bartók Béla út 42. 2/5"
            style={input}
          />
        </Field>

        <Row>
          <Field label="Telefon">
            <input
              value={paciens.telefon}
              onChange={(e) => patch({ telefon: e.target.value })}
              placeholder="+36 30 123 4567"
              style={input}
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              value={paciens.email}
              onChange={(e) => patch({ email: e.target.value })}
              placeholder="kovacs.janos@example.hu"
              style={input}
            />
          </Field>
        </Row>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 10 }}>
          <input
            type="checkbox"
            checked={paciens.kiskoru}
            onChange={(e) => patch({ kiskoru: e.target.checked })}
          />
          Kiskorú
        </label>

        {paciens.kiskoru && (
          <div style={{ marginTop: 10 }}>
            <Field label="Törvényes képviselő (név, elérhetőség)">
              <input
                value={paciens.torvenyesKepviselo ?? ''}
                onChange={(e) => patch({ torvenyesKepviselo: e.target.value || null })}
                placeholder="Kovács Ildikó (édesanya) — +36 30 111 2222"
                style={input}
              />
            </Field>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <span style={{ fontSize: 12, color: nameMissing ? t.warn : t.textFaint }}>
          {nameMissing ? 'A név nélkül a mappanév sem képezhető, de tovább léphetsz.' : ' '}
        </span>
        <button style={btn(true)} onClick={() => navigate('/terv')}>
          Tovább a terv szerkesztőhöz
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{label}</div>
      {children}
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}
